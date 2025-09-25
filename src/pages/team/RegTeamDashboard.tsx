// src/pages/regteam/RegTeamDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Users,
  Search,
  QrCode,
  Eye,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface RegistrationStats {
  total_registered: number;
  checked_in_today: number;
  inside_event: number;
  total_attendees: number;
}

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  university: string;
  faculty: string;
  role: string;
  personal_id: string;
  created_at: string;
  last_check_in: string | null;
  verification_status: "verified" | "pending" | "rejected";
}

export const RegTeamDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"scanner" | "dashboard">("scanner");

  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [searchMode, setSearchMode] = useState<"qr" | "manual">("manual");
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const { data: statsData } = await supabase.rpc("get_registration_stats");
      if (statsData) setStats(statsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchId) return;
    setAttendee(null);

    try {
      const { data, error } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("personal_id", searchId)
        .single();

      if (error) {
        alert("Attendee not found");
      } else {
        setAttendee(data);
      }
    } catch (error) {
      alert("Search failed");
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      const { data, error } = await supabase.rpc("process_registration_scan", {
        scanner_id: profile?.id,
        qr_data: qrData,
        scan_type: "registration_check_in",
      });

      if (error) {
        alert(`Scan error: ${error.message}`);
      } else {
        alert("Registration scan successful!");
        fetchDashboardData();
      }
    } catch {
      alert("Failed to process scan");
    }
  };

  return (
    <DashboardLayout
      title="Registration Team Dashboard"
      subtitle="Manage attendee registrations and check-ins"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "scanner"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("scanner")}
        >
          Scanner
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "dashboard"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          Live Dashboard
        </button>
      </div>

      {/* Scanner Tab */}
      {activeTab === "scanner" && (
        <div className="space-y-6">
          {/* Mode Switch */}
          <div className="flex space-x-4">
            <button
              onClick={() => setSearchMode("manual")}
              className={`px-4 py-2 rounded-lg ${
                searchMode === "manual"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Search by ID
            </button>
            <button
              onClick={() => setSearchMode("qr")}
              className={`px-4 py-2 rounded-lg ${
                searchMode === "qr"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              QR Scan
            </button>
          </div>

          {/* Manual Search */}
          {searchMode === "manual" && (
            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter personal ID..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="px-4 py-2 border rounded-lg flex-1"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg"
                >
                  Search
                </button>
              </div>

              {attendee && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <p className="font-bold">
                    {attendee.first_name} {attendee.last_name}
                  </p>
                  <p>{attendee.email}</p>
                  <p>{attendee.university}</p>
                  <p>Role: {attendee.role}</p>
                  <p>Status: {attendee.verification_status}</p>
                </div>
              )}
            </div>
          )}

          {/* QR Scanner */}
          {searchMode === "qr" && (
            <div>
              <button
                onClick={() => setShowScanner(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg flex items-center"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Open QR Scanner
              </button>

              <QRScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
                title="Registration Check-in"
                description="Scan attendee QR code for check-in"
              />
            </div>
          )}
        </div>
      )}

      {/* Live Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600">Total Registered</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.total_registered || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600">Checked In Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.checked_in_today || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600">Inside Event</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.inside_event || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-600">Total Attendees</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats?.total_attendees || 0}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
