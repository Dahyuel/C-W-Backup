// src/pages/team/BuildTeamDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  QrCode,
  Search,
  PlusCircle,
  Clock,
  User,
  Building2,
  X,
  AlertCircle,
  CheckCircle,
  UserPlus,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { QRScanner } from "../../components/shared/QRScanner";
import { AttendeeCard } from "../../components/shared/AttendeeCard";
import { useAuth } from "../../contexts/AuthContext";
import { 
  processBuildingAttendance,
  getAttendeeByPersonalId,
  getAttendeeByUUID,
  getAllSessions,
  searchAttendeesByPersonalId,
  getBuildingStats
} from "../../lib/supabase";

interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  current_attendees: number;
  session_type: string;
  created_at: string;
}

interface BuildingStats {
  total_attendees: number;
  inside_building: number;
  today_entries: number;
  session_attendances: number;
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

const castToAttendee = (data: any): Attendee => {
  return {
    ...data,
    current_status: data.current_status === 'inside' ? 'inside' : 'outside'
  } as Attendee;
};

export const BuildTeamDashboard: React.FC = () => {
  const { profile } = useAuth();

  // Tab and mode state
  const [activeTab, setActiveTab] = useState<"building" | "session">("building");
  const [mode, setMode] = useState<"building_entry" | "session_entry" | null>("building_entry");
  const [searchMode, setSearchMode] = useState<"qr" | "manual" | null>(null);

  // Session state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Dynamic search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performDynamicSearch(searchTerm.trim());
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const { data, error } = await getAllSessions();
      
      if (error) {
        console.error("Error fetching sessions:", error);
        showFeedback('error', 'Failed to load sessions');
      } else {
        setSessions(data || []);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      showFeedback('error', 'An unexpected error occurred');
    } finally {
      setSessionsLoading(false);
    }
  };

  const performDynamicSearch = async (query: string) => {
    try {
      setSearchLoading(true);
      const { data, error } = await searchAttendeesByPersonalId(query);
      
      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else {
        const attendees = (data || []).map(item => castToAttendee(item));
        setSearchResults(attendees);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Search exception:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const handleSearchByPersonalId = async () => {
    if (!searchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }

    try {
      setSearchLoading(true);
      const { data, error } = await getAttendeeByPersonalId(searchTerm.trim());

      if (error || !data) {
        showFeedback('error', 'Personal ID not found');
      } else if (data.role !== 'attendee') {
        showFeedback('error', 'Only attendees can be processed through this system');
      } else {
        setSelectedAttendee(castToAttendee(data));
        setShowAttendeeCard(true);
        setSearchTerm("");
        setShowSearchResults(false);
        setSearchMode(null);
      }
    } catch (error) {
      console.error("Search exception:", error);
      showFeedback('error', 'Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setShowAttendeeCard(true);
    setSearchTerm("");
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchMode(null);
  };

  const handleQRScan = async (qrData: string) => {
    try {
      console.log('Processing QR data:', qrData);
      
      let attendeeData: Attendee | null = null;
      let error;

      if (isUUID(qrData)) {
        console.log('Detected UUID format, searching by UUID...');
        const result = await getAttendeeByUUID(qrData);
        attendeeData = result.data ? castToAttendee(result.data) : null;
        error = result.error;
      } else {
        console.log('Detected Personal ID format, searching by Personal ID...');
        const result = await getAttendeeByPersonalId(qrData);
        attendeeData = result.data ? castToAttendee(result.data) : null;
        error = result.error;
      }
      
      if (error || !attendeeData) {
        const errorMsg = isUUID(qrData) 
          ? 'Invalid QR code: UUID not found in system'
          : 'Invalid QR code: Personal ID not found';
        showFeedback('error', errorMsg);
        return;
      }

      if (attendeeData.role !== 'attendee') {
        showFeedback('error', 'Only attendees can be processed through this system');
        return;
      }

      setSelectedAttendee(attendeeData);
      setShowAttendeeCard(true);
      setShowScanner(false);
      setSearchMode(null);
    } catch (error) {
      console.error("QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };

  const handleBuildingAttendanceAction = async (action: 'enter' | 'exit') => {
    if (!selectedAttendee) return;

    try {
      setActionLoading(true);
      
      const buildingAction = action === 'enter' ? 'building_entry' : 'building_exit';
      const { data, error } = await processBuildingAttendance(selectedAttendee.personal_id, buildingAction);

      if (error) {
        showFeedback('error', error.message || `Failed to process ${action}`);
        return;
      }

      showFeedback('success', data.message || `Building ${action.toUpperCase()} successful!`);
      
      // Update attendee status
      const newStatus = action === 'enter' ? 'inside' : 'outside';
      setSelectedAttendee(prev => prev ? {
        ...prev,
        current_status: newStatus,
        last_scan: new Date().toISOString()
      } : null);

      // Close attendee card after successful action
      setTimeout(() => {
        setShowAttendeeCard(false);
        setSelectedAttendee(null);
      }, 2000);

    } catch (error) {
      console.error("Building attendance action error:", error);
      showFeedback('error', `Failed to process ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSessionAttendanceAction = async (action: 'enter' | 'exit') => {
    if (!selectedAttendee || !selectedSession) return;

    try {
      setActionLoading(true);
      
      const { data, error } = await processBuildingAttendance(
        selectedAttendee.personal_id, 
        'session_entry',
        selectedSession.id
      );

      if (error) {
        showFeedback('error', error.message || 'Failed to add to session');
        return;
      }

      showFeedback('success', data.message || 'Successfully added to session!');
      
      // Refresh sessions to update current_attendees count
      fetchSessions();

      // Close attendee card after successful action
      setTimeout(() => {
        setShowAttendeeCard(false);
        setSelectedAttendee(null);
        setMode(null);
      }, 2000);

    } catch (error) {
      console.error("Session attendance action error:", error);
      showFeedback('error', 'Failed to add to session');
    } finally {
      setActionLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const resetToMainView = () => {
    setMode(activeTab === "building" ? "building_entry" : null);
    setSearchMode(null);
    setSelectedSession(null);
    setSelectedAttendee(null);
    setShowAttendeeCard(false);
    setShowScanner(false);
    clearSearch();
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout
      title="Build Team Dashboard"
      subtitle="Manage building and session attendance"
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
      <div className="flex space-x-6 mb-8 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("building");
            resetToMainView();
          }}
          className={`pb-2 px-2 text-sm font-medium ${
            activeTab === "building"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Building
        </button>
        <button
          onClick={() => {
            setActiveTab("session");
            resetToMainView();
          }}
          className={`pb-2 px-2 text-sm font-medium ${
            activeTab === "session"
              ? "text-orange-600 border-b-2 border-orange-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sessions
        </button>
      </div>

      <div className="space-y-8">
        {/* BUILDING TAB */}
        {activeTab === "building" && (
          <>
            {/* Building Action Selection - Default View */}
            {mode === "building_entry" && !searchMode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Building Entry
                </h2>
                <p className="text-gray-600">
                  Choose how you want to identify the attendee
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSearchMode("qr")}
                    className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code Scanner
                  </button>
                  <button
                    onClick={() => setSearchMode("manual")}
                    className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search by Personal ID
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* SESSION TAB */}
        {activeTab === "session" && (
          <>
            {/* Session List */}
            {!selectedSession && (
              <>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    <span className="ml-3 text-gray-600">Loading sessions...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Available</h3>
                    <p className="text-gray-600">There are currently no sessions scheduled.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 cursor-pointer hover:shadow-md transition"
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {session.title}
                          </h3>
                          <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        </div>
                        {session.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {session.description}
                          </p>
                        )}
                        <div className="space-y-2">
                          {session.start_time && (
                            <p className="text-sm text-gray-500 flex items-center">
                              <Clock className="inline-block h-4 w-4 mr-1" />
                              {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </p>
                          )}
                          {session.speaker && (
                            <p className="text-sm text-gray-500 flex items-center">
                              <User className="inline-block h-4 w-4 mr-1" />
                              {session.speaker}
                            </p>
                          )}
                          {session.location && (
                            <p className="text-sm text-gray-500">📍 {session.location}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm font-medium text-gray-700 flex items-center">
                              <Users className="inline-block h-4 w-4 mr-1" />
                              {session.current_attendees}
                              {session.capacity && `/${session.capacity}`} attendees
                            </span>
                            {session.capacity && session.current_attendees >= session.capacity && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Full
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Session Selected */}
            {selectedSession && !mode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedSession.title}
                  </h2>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {selectedSession.description && (
                  <p className="text-gray-600">{selectedSession.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSession.start_time && (
                    <div className="flex items-center text-gray-700">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        {formatDate(selectedSession.start_time)} • {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                      </span>
                    </div>
                  )}
                  {selectedSession.speaker && (
                    <div className="flex items-center text-gray-700">
                      <User className="h-4 w-4 mr-2" />
                      <span className="text-sm">Speaker: {selectedSession.speaker}</span>
                    </div>
                  )}
                  {selectedSession.location && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📍</span>
                      <span className="text-sm">{selectedSession.location}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {selectedSession.current_attendees}
                      {selectedSession.capacity && `/${selectedSession.capacity}`} attendees
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setMode("session_entry")}
                    disabled={selectedSession.capacity && selectedSession.current_attendees >= selectedSession.capacity}
                    className="w-full flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add Attendee to Session
                    {selectedSession.capacity && selectedSession.current_attendees >= selectedSession.capacity && (
                      <span className="ml-2 text-xs">(Session Full)</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Session Action Selection */}
            {mode === "session_entry" && !searchMode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Attendee to: {selectedSession?.title}
                </h2>
                <p className="text-gray-600">
                  Choose how you want to identify the attendee
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSearchMode("qr")}
                    className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code Scanner
                  </button>
                  <button
                    onClick={() => setSearchMode("manual")}
                    className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search by Personal ID
                  </button>
                </div>
                <button
                  onClick={() => setMode(null)}
                  className="text-sm text-gray-500 underline"
                >
                  ← Back to session details
                </button>
              </div>
            )}
          </>
        )}

        {/* Manual Search (shared between building and session modes) */}
        {searchMode === "manual" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Attendees by Personal ID
                </label>
                <div className="flex items-center space-x-3 relative">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Start typing Personal ID (e.g., 123456...)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchByPersonalId()}
                      onBlur={() => {
                        setTimeout(() => setShowSearchResults(false), 200);
                      }}
                      onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
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

                    {/* Dynamic Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        {searchResults.map((attendee) => (
                          <button
                            key={attendee.id}
                            onClick={() => handleSelectSearchResult(attendee)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-orange-50 focus:outline-none"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {attendee.first_name} {attendee.last_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  ID: {attendee.personal_id}
                                </p>
                                {attendee.university && (
                                  <p className="text-xs text-gray-500">
                                    {attendee.university}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  attendee.current_status === 'inside'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {attendee.current_status === 'inside' ? 'Inside' : 'Outside'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No Results Message */}
                    {showSearchResults && searchResults.length === 0 && searchTerm.trim().length >= 2 && !searchLoading && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                        <p className="text-gray-600 text-sm">No attendees found matching "{searchTerm}"</p>
                      </div>
                    )}

                    {/* Loading State */}
                    {searchLoading && searchTerm.trim().length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                          <p className="text-gray-600 text-sm">Searching attendees...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSearchByPersonalId}
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

              <button
                onClick={() => setSearchMode(null)}
                className="text-sm text-gray-500 underline"
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {/* QR Scanner triggers for different modes */}
        {searchMode === "qr" && (
          <QRScanner
            isOpen={true}
            onClose={() => setSearchMode(null)}
            onScan={handleQRScan}
            title={
              mode === "building_entry" ? "Building Entry Scanner" :
              mode === "session_entry" ? "Session Entry Scanner" :
              "Scan Attendee QR Code"
            }
            description="Point your camera at the attendee's QR code"
/>
        )}

        {/* Attendee Card Modal with dynamic action handlers */}
        <AttendeeCard
          isOpen={showAttendeeCard}
          onClose={() => {
            setShowAttendeeCard(false);
            setSelectedAttendee(null);
          }}
          attendee={selectedAttendee}
          onAction={
            mode === "session_entry" 
              ? handleSessionAttendanceAction 
              : handleBuildingAttendanceAction
          }
          loading={actionLoading}
          mode={mode === "session_entry" ? "session" : "building"}
          sessionTitle={mode === "session_entry" ? selectedSession?.title : undefined}
        />
      </div>
    </DashboardLayout>
  );
};