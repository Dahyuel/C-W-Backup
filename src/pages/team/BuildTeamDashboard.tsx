// src/pages/team/BuildTeamDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  QrCode,
  Search,
  PlusCircle,
  MinusCircle,
  Clock,
  User,
  Building2,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface Session {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  current_attendees: number;
  max_attendees: number;
  instructor: string;
}

export const BuildTeamDashboard: React.FC = () => {
  const { profile } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"add" | "remove" | null>(null);
  const [searchMode, setSearchMode] = useState<"qr" | "manual" | null>(null);
  const [searchId, setSearchId] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "building">("session");

  useEffect(() => {
    // Mock sessions for testing
    const mock: Session[] = [
      {
        id: "1",
        title: "AI & Machine Learning",
        description: "Exploring AI trends in 2025",
        start_time: "10:00",
        end_time: "11:30",
        current_attendees: 30,
        max_attendees: 60,
        instructor: "Dr. Sarah Johnson",
      },
      {
        id: "2",
        title: "Cybersecurity Workshop",
        description: "Hands-on with modern attacks",
        start_time: "12:00",
        end_time: "13:30",
        current_attendees: 45,
        max_attendees: 80,
        instructor: "Eng. Ahmed Hassan",
      },
      {
        id: "3",
        title: "Web Development in 2025",
        description: "Modern frameworks & tools",
        start_time: "14:00",
        end_time: "15:30",
        current_attendees: 25,
        max_attendees: 50,
        instructor: "Prof. Emily Davis",
      },
    ];
    setSessions(mock);
  }, []);

  const handleQRScan = async (qrData: string) => {
    try {
      const { error } = await supabase.rpc("process_session_attendance", {
        session_id: selectedSession?.id,
        user_id: qrData,
        action_type: mode,
      });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert(`${mode === "add" ? "Added" : "Removed"} successfully!`);
      }
    } catch {
      alert("Failed to process scan");
    }
  };

  const handleManualSearch = async () => {
    if (!searchId) return;
    try {
      const { error } = await supabase.rpc("process_session_attendance", {
        session_id: selectedSession?.id,
        user_id: searchId,
        action_type: mode,
      });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert(`${mode === "add" ? "Added" : "Removed"} successfully!`);
      }
    } catch {
      alert("Failed to process manual action");
    }
  };

  return (
    <DashboardLayout
      title="Build Team Dashboard"
      subtitle="Manage session and building attendance"
    >
      {/* Tabs */}
      <div className="flex space-x-6 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("session")}
          className={`pb-2 px-2 text-sm font-medium ${
            activeTab === "session"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab("building")}
          className={`pb-2 px-2 text-sm font-medium ${
            activeTab === "building"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Building
        </button>
      </div>

      <div className="space-y-8">
        {/* SESSION TAB */}
        {activeTab === "session" && (
          <>
            {/* Session List */}
            {!selectedSession && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 cursor-pointer hover:shadow-md transition"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {session.title}
                      </h3>
                      <Calendar className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {session.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      <Clock className="inline-block h-4 w-4 mr-1" />
                      {session.start_time} - {session.end_time}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      <User className="inline-block h-4 w-4 mr-1" />
                      Instructor: {session.instructor}
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      <Users className="inline-block h-4 w-4 mr-1" />
                      {session.current_attendees}/{session.max_attendees} attendees
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Session Selected */}
            {selectedSession && !mode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSession.title}
                </h2>
                <p className="text-gray-600">{selectedSession.description}</p>
                <p className="text-gray-700">
                  <Clock className="inline-block h-4 w-4 mr-1" />
                  {selectedSession.start_time} - {selectedSession.end_time}
                </p>
                <p className="text-gray-700">
                  <User className="inline-block h-4 w-4 mr-1" />
                  Instructor: {selectedSession.instructor}
                </p>
                <p className="text-gray-700">
                  <Users className="inline-block h-4 w-4 mr-1" />
                  {selectedSession.current_attendees}/
                  {selectedSession.max_attendees} attendees
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={() => setMode("add")}
                    className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add Attendee
                  </button>
                  <button
                    onClick={() => setMode("remove")}
                    className="flex items-center justify-center p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <MinusCircle className="h-5 w-5 mr-2" />
                    Remove Attendee
                  </button>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-sm text-gray-500 underline"
                >
                  Back to sessions
                </button>
              </div>
            )}

            {/* Add/Remove Options */}
            {selectedSession && mode && !searchMode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === "add" ? "Add" : "Remove"} Attendee
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSearchMode("qr")}
                    className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code
                  </button>
                  <button
                    onClick={() => setSearchMode("manual")}
                    className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search by ID
                  </button>
                </div>
                <button
                  onClick={() => setMode(null)}
                  className="text-sm text-gray-500 underline"
                >
                  Back
                </button>
              </div>
            )}

            {/* QR Scanner */}
            {selectedSession && mode && searchMode === "qr" && (
              <QRScanner
                isOpen={true}
                onClose={() => setSearchMode(null)}
                onScan={handleQRScan}
                title={`${mode === "add" ? "Add" : "Remove"} Attendee`}
                description={`Scan attendee QR code to ${mode} them from this session`}
              />
            )}

            {/* Manual Search */}
            {selectedSession && mode && searchMode === "manual" && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === "add" ? "Add" : "Remove"} Attendee (Manual)
                </h2>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Enter personal ID..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="px-4 py-2 border rounded-lg flex-1"
                  />
                  <button
                    onClick={handleManualSearch}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg"
                  >
                    Confirm
                  </button>
                </div>
                <button
                  onClick={() => setSearchMode(null)}
                  className="text-sm text-gray-500 underline"
                >
                  Back
                </button>
              </div>
            )}
          </>
        )}

        {/* BUILDING TAB */}
        {activeTab === "building" && (
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-orange-500" />
              Building Attendance
            </h2>
            <p className="text-gray-600 text-center">
              Manage entry and exit for attendees using QR code scanning
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Scan In Button */}
              <button
                onClick={() => {
                  setMode("add");
                  setSearchMode("qr");
                }}
                className="flex flex-col items-center justify-center p-8 rounded-2xl shadow-md bg-green-500 text-white hover:bg-green-600 transition"
              >
                <QrCode className="h-12 w-12 mb-3" />
                <span className="text-lg font-semibold">Scan In</span>
                <span className="text-sm opacity-80 mt-1">
                  For people entering
                </span>
              </button>

              {/* Scan Out Button */}
              <button
                onClick={() => {
                  setMode("remove");
                  setSearchMode("qr");
                }}
                className="flex flex-col items-center justify-center p-8 rounded-2xl shadow-md bg-red-500 text-white hover:bg-red-600 transition"
              >
                <QrCode className="h-12 w-12 mb-3" />
                <span className="text-lg font-semibold">Scan Out</span>
                <span className="text-sm opacity-80 mt-1">
                  For people leaving
                </span>
              </button>
            </div>
          </div>
        )}

        {/* BUILDING QR Scanner */}
        {activeTab === "building" && searchMode === "qr" && (
          <QRScanner
            isOpen={true}
            onClose={() => setSearchMode(null)}
            onScan={handleQRScan}
            title={mode === "add" ? "Scan In" : "Scan Out"}
            description={`Scan attendee QR code to mark ${
              mode === "add" ? "entry" : "exit"
            } from the building`}
          />
        )}
      </div>
    </DashboardLayout>
  );
};