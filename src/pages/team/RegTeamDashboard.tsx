import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Users,
  Search,
  QrCode,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import DashboardLayout from '../../components/shared/DashboardLayout';
import { QRScanner } from "../../components/shared/QRScanner";
import { AttendeeCard } from "../../components/shared/AttendeeCard";
import { useAuth } from "../../contexts/AuthContext";
import { 
  processAttendance, 
  searchAttendees, 
  getAttendeeByPersonalId, 
  getRegistrationStats 
} from "../../lib/supabase";

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
  phone?: string;
  personal_id: string;
  role: string;
  university?: string;
  faculty?: string;
  current_status?: 'inside' | 'outside';
  last_scan?: string;
}

export const RegTeamDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"scanner" | "dashboard">("scanner");

  // Dashboard state
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [searchMode, setSearchMode] = useState<"qr" | "manual">("manual");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await getRegistrationStats();
      
      if (error) {
        console.error("Error fetching stats:", error);
        showFeedback('error', 'Failed to load dashboard statistics');
      } else if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      showFeedback('error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const { data, error } = await searchAttendees(searchTerm);

      if (error) {
        console.error("Search error:", error);
        showFeedback('error', 'Search failed. Please try again.');
        setSearchResults([]);
      } else {
        setSearchResults(data);
        if (data.length === 0) {
          showFeedback('error', 'No attendees found matching your search');
        }
      }
    } catch (error) {
      console.error("Search exception:", error);
      showFeedback('error', 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAttendeeSelect = async (attendee: Attendee) => {
    try {
      // Fetch full attendee details including current status
      const { data, error } = await getAttendeeByPersonalId(attendee.personal_id);
      
      if (error || !data) {
        showFeedback('error', 'Failed to load attendee details');
        return;
      }

      setSelectedAttendee(data);
      setShowAttendeeCard(true);
      setSearchResults([]);
      setSearchTerm("");
    } catch (error) {
      console.error("Error selecting attendee:", error);
      showFeedback('error', 'Failed to load attendee details');
    }
  };

  const handleQRScan = async (qrData: string) => {
    try {
      const { data, error } = await getAttendeeByPersonalId(qrData);
      
      if (error || !data) {
        showFeedback('error', 'Invalid QR code or attendee not found');
        return;
      }

      setSelectedAttendee(data);
      setShowAttendeeCard(true);
      setShowScanner(false);
    } catch (error) {
      console.error("QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };

  const handleAttendanceAction = async (action: 'enter' | 'exit') => {
    if (!selectedAttendee) return;

    try {
      setActionLoading(true);
      const { data, error } = await processAttendance(selectedAttendee.personal_id, action);

      if (error) {
        showFeedback('error', error.message || `Failed to process ${action}`);
        return;
      }

      showFeedback('success', data.message || `${action.toUpperCase()} scan successful!`);
      
      // Update attendee status
      const newStatus = action === 'enter' ? 'inside' : 'outside';
      setSelectedAttendee(prev => prev ? {
        ...prev,
        current_status: newStatus,
        last_scan: new Date().toISOString()
      } : null);

      // Refresh dashboard stats if on dashboard tab
      if (activeTab === "dashboard") {
        fetchDashboardData();
      }

      // Close attendee card after successful action
      setTimeout(() => {
        setShowAttendeeCard(false);
        setSelectedAttendee(null);
      }, 2000);

    } catch (error) {
      console.error("Attendance action error:", error);
      showFeedback('error', `Failed to process ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
  };

  return (
    <DashboardLayout
      title="Registration Team Dashboard"
      subtitle="Manage attendee registrations and check-ins"
    >
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
          feedback.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="font-medium">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 hover:bg-black hover:bg-opacity-20 rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "scanner"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("scanner")}
        >
          Scanner & Search
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "dashboard"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500 hover:text-gray-700"
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
              onClick={() => {
                setSearchMode("manual");
                clearSearch();
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                searchMode === "manual"
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Search className="h-4 w-4 inline mr-2" />
              Search by ID/Name
            </button>
            <button
              onClick={() => {
                setSearchMode("qr");
                clearSearch();
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                searchMode === "qr"
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <QrCode className="h-4 w-4 inline mr-2" />
              QR Scanner
            </button>
          </div>

          {/* Manual Search */}
          {searchMode === "manual" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Attendees
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Enter Personal ID, name, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                      />
                      {searchTerm && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={searchLoading || !searchTerm.trim()}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {searchLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          <span>Search</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Search Results</h4>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {searchResults.map((attendee) => (
                        <button
                          key={attendee.id}
                          onClick={() => handleAttendeeSelect(attendee)}
                          className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {attendee.first_name} {attendee.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{attendee.email}</p>
                              <p className="text-xs text-gray-500">ID: {attendee.personal_id}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                attendee.role === 'attendee' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {attendee.role.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR Scanner */}
          {searchMode === "qr" && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <QrCode className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                QR Code Scanner
              </h3>
              <p className="text-gray-600 mb-6">
                Click the button below to open the QR scanner and scan an attendee's QR code
              </p>
              <button
                onClick={() => setShowScanner(true)}
                className="px-8 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2 mx-auto"
              >
                <QrCode className="h-5 w-5" />
                <span>Open QR Scanner</span>
              </button>
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
              <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Registered</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {stats?.total_registered || 0}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Checked In Today</p>
                      <p className="text-3xl font-bold text-green-600">
                        {stats?.checked_in_today || 0}
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Currently Inside</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {stats?.inside_event || 0}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">🏢</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Attendees</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {stats?.total_attendees || 0}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-bold">👥</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-end">
                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <div className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}>🔄</div>
                  <span>Refresh</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
        title="Scan Attendee QR Code"
        description="Point your camera at the attendee's QR code"
      />

      {/* Attendee Card Modal */}
      <AttendeeCard
        isOpen={showAttendeeCard}
        onClose={() => {
          setShowAttendeeCard(false);
          setSelectedAttendee(null);
        }}
        attendee={selectedAttendee}
        onAction={handleAttendanceAction}
        loading={actionLoading}
      />
    </DashboardLayout>
  );
};
