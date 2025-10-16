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
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { QRScanner } from "../../components/shared/QRScanner";
// import { AttendeeCard } from "../../components/shared/AttendeeCard";
// import { useAuth } from "../../contexts/AuthContext";
import { 
  processBuildingAttendance,
  getAttendeeByPersonalId,
  getAttendeeByUUID,
  getAllSessions,
  searchAttendeesByPersonalId,
  // Add these new imports:
  addBuildingEntryScoreForVolunteer,
  addSessionEntryScoreForVolunteer,
  addBuildingEntryBonusForAttendee,
  addSessionEntryBonusForAttendee
} from "../../lib/supabase";
import { supabase } from "../../lib/supabase";
import { createPortal } from 'react-dom';

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
  building_entry?: boolean;
  event_entry?: boolean; // Add this
  last_scan?: string;
}
//

const castToAttendee = (data: any): Attendee => {
  return {
    ...data,
    current_status: data.building_entry ? 'inside' : 'outside',
    building_entry: data.building_entry,
    event_entry: data.event_entry // Add this
  } as Attendee;
};
export const BuildTeamDashboard: React.FC = () => {

  // Tab state
  const [activeTab, setActiveTab] = useState<"building" | "session">("building");

  // Building tab state
  const [buildingSearchMode, setBuildingSearchMode] = useState<"qr" | "manual" | null>(null);
  const [buildingSearchTerm, setBuildingSearchTerm] = useState("");
  const [buildingSearchLoading, setBuildingSearchLoading] = useState(false);
  const [buildingSearchResults, setBuildingSearchResults] = useState<Attendee[]>([]);
  const [showBuildingSearchResults, setShowBuildingSearchResults] = useState(false);
  const [buildingSearchTimeout, setBuildingSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Session tab state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionMode, setSessionMode] = useState<"session_entry" | null>(null);
  const [sessionSearchMode, setSessionSearchMode] = useState<"qr" | "manual" | null>(null);
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [sessionSearchLoading, setSessionSearchLoading] = useState(false);
  const [sessionSearchResults, setSessionSearchResults] = useState<Attendee[]>([]);
  const [showSessionSearchResults, setShowSessionSearchResults] = useState(false);
  const [sessionSearchTimeout, setSessionSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Shared attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Session booking and attendance state
  const [hasSessionBooking, setHasSessionBooking] = useState<boolean>(false);
  const [hasSessionAttendance, setHasSessionAttendance] = useState<boolean>(false);
  const [bookingCheckLoading, setBookingCheckLoading] = useState<boolean>(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load sessions when session tab is active
  useEffect(() => {
    if (activeTab === "session") {
      fetchSessions();
    }
  }, [activeTab]);

  // Building tab dynamic search effect
  useEffect(() => {
    if (buildingSearchTimeout) {
      clearTimeout(buildingSearchTimeout);
    }

    if (activeTab === "building" && buildingSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performBuildingDynamicSearch(buildingSearchTerm.trim());
      }, 300);
      setBuildingSearchTimeout(timeout);
    } else {
      setBuildingSearchResults([]);
      setShowBuildingSearchResults(false);
    }

    return () => {
      if (buildingSearchTimeout) {
        clearTimeout(buildingSearchTimeout);
      }
    };
  }, [buildingSearchTerm, activeTab]);

  // Session tab dynamic search effect
  useEffect(() => {
    if (sessionSearchTimeout) {
      clearTimeout(sessionSearchTimeout);
    }

    if (activeTab === "session" && sessionSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performSessionDynamicSearch(sessionSearchTerm.trim());
      }, 300);
      setSessionSearchTimeout(timeout);
    } else {
      setSessionSearchResults([]);
      setShowSessionSearchResults(false);
    }

    return () => {
      if (sessionSearchTimeout) {
        clearTimeout(sessionSearchTimeout);
      }
    };
  }, [sessionSearchTerm, activeTab]);

  // Check if attendee has booked the selected session
  const checkSessionBooking = async (attendeeId: string, sessionId: string): Promise<boolean> => {
    if (!attendeeId || !sessionId) return false;
    
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', attendeeId)
        .eq('session_id', sessionId)
        .eq('scan_type', 'booking')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking session booking:', error);
        return false;
      }

      return !!data; // Returns true if booking exists, false otherwise
    } catch (error) {
      console.error('Error checking session booking:', error);
      return false;
    }
  };

  // Check if attendee has already attended the session
  const checkSessionAttendance = async (attendeeId: string, sessionId: string): Promise<boolean> => {
    if (!attendeeId || !sessionId) return false;
    
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', attendeeId)
        .eq('session_id', sessionId)
        .eq('scan_type', 'session_entry')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking session attendance:', error);
        return false;
      }

      return !!data; // Returns true if session attendance exists, false otherwise
    } catch (error) {
      console.error('Error checking session attendance:', error);
      return false;
    }
  };

  // Check both booking and attendance status
  const checkSessionBookingAndAttendance = async (attendeeId: string, sessionId: string) => {
    if (!attendeeId || !sessionId) {
      setHasSessionBooking(false);
      setHasSessionAttendance(false);
      return;
    }
    
    setBookingCheckLoading(true);
    try {
      // Check both booking and attendance in parallel
      const [bookingResult, attendanceResult] = await Promise.all([
        checkSessionBooking(attendeeId, sessionId),
        checkSessionAttendance(attendeeId, sessionId)
      ]);

      setHasSessionBooking(bookingResult);
      setHasSessionAttendance(attendanceResult);
    } catch (error) {
      console.error('Error checking session status:', error);
      setHasSessionBooking(false);
      setHasSessionAttendance(false);
    } finally {
      setBookingCheckLoading(false);
    }
  };

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

  const performBuildingDynamicSearch = async (query: string) => {
    try {
      setBuildingSearchLoading(true);
      const { data, error } = await searchAttendeesByPersonalId(query);
      
      if (error) {
        console.error("Building search error:", error);
        setBuildingSearchResults([]);
      } else {
        const attendees = (data || []).map(item => castToAttendee(item));
        setBuildingSearchResults(attendees);
        setShowBuildingSearchResults(true);
      }
    } catch (error) {
      console.error("Building search exception:", error);
      setBuildingSearchResults([]);
    } finally {
      setBuildingSearchLoading(false);
    }
  };

  const performSessionDynamicSearch = async (query: string) => {
    try {
      setSessionSearchLoading(true);
      const { data, error } = await searchAttendeesByPersonalId(query);
      
      if (error) {
        console.error("Session search error:", error);
        setSessionSearchResults([]);
      } else {
        const attendees = (data || []).map(item => castToAttendee(item));
        setSessionSearchResults(attendees);
        setShowSessionSearchResults(true);
      }
    } catch (error) {
      console.error("Session search exception:", error);
      setSessionSearchResults([]);
    } finally {
      setSessionSearchLoading(false);
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

  const handleBuildingSearchByPersonalId = async () => {
    if (!buildingSearchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }

    try {
      setBuildingSearchLoading(true);
      const { data, error } = await getAttendeeByPersonalId(buildingSearchTerm.trim());

      if (error || !data) {
        showFeedback('error', 'Personal ID not found');
      } else if (data.role !== 'attendee') {
        showFeedback('error', 'Only attendees can be processed through this system');
      } else {
        setSelectedAttendee(castToAttendee(data));
        setShowAttendeeCard(true);
        setBuildingSearchTerm("");
        setShowBuildingSearchResults(false);
        setBuildingSearchMode(null);
      }
    } catch (error) {
      console.error("Building search exception:", error);
      showFeedback('error', 'Search failed. Please try again.');
    } finally {
      setBuildingSearchLoading(false);
    }
  };

  const handleSessionSearchByPersonalId = async () => {
    if (!sessionSearchTerm.trim()) {
      showFeedback('error', 'Please enter a Personal ID');
      return;
    }

    try {
      setSessionSearchLoading(true);
      const { data, error } = await getAttendeeByPersonalId(sessionSearchTerm.trim());

      if (error || !data) {
        showFeedback('error', 'Personal ID not found');
      } else if (data.role !== 'attendee') {
        showFeedback('error', 'Only attendees can be processed through this system');
      } else {
        const attendee = castToAttendee(data);
        setSelectedAttendee(attendee);
        
        // Check if this attendee has booked AND attended the selected session
        if (selectedSession) {
          await checkSessionBookingAndAttendance(attendee.id, selectedSession.id);
        }
        
        setShowAttendeeCard(true);
        setSessionSearchTerm("");
        setShowSessionSearchResults(false);
        setSessionSearchMode(null);
      }
    } catch (error) {
      console.error("Session search exception:", error);
      showFeedback('error', 'Search failed. Please try again.');
    } finally {
      setSessionSearchLoading(false);
    }
  };

  const handleBuildingSelectSearchResult = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setShowAttendeeCard(true);
    setBuildingSearchTerm("");
    setShowBuildingSearchResults(false);
    setBuildingSearchResults([]);
    setBuildingSearchMode(null);
  };

  const handleSessionSelectSearchResult = async (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    
    // Check if this attendee has booked AND attended the selected session
    if (selectedSession) {
      await checkSessionBookingAndAttendance(attendee.id, selectedSession.id);
    }
    
    setShowAttendeeCard(true);
    setSessionSearchTerm("");
    setShowSessionSearchResults(false);
    setSessionSearchResults([]);
    setSessionSearchMode(null);
  };

  const handleBuildingQRScan = async (qrData: string) => {
    try {
      console.log('Processing Building QR data:', qrData);
      
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
      setBuildingSearchMode(null);
    } catch (error) {
      console.error("Building QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };

  const handleSessionQRScan = async (qrData: string) => {
    try {
      console.log('Processing Session QR data:', qrData);
      
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

      // Check if this attendee has booked AND attended the selected session
      if (selectedSession) {
        await checkSessionBookingAndAttendance(attendeeData.id, selectedSession.id);
      }

      setSelectedAttendee(attendeeData);
      setShowAttendeeCard(true);
      setSessionSearchMode(null);
    } catch (error) {
      console.error("Session QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };
// Update the handleBuildingAttendanceAction function
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

    // Add score for volunteer for successful building entry/exit
    if (action === 'enter') {
      // Get current user (volunteer) ID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await addBuildingEntryScoreForVolunteer(
          user.id, 
          `${selectedAttendee.first_name} ${selectedAttendee.last_name}`
        );
      }

      // Add building entry bonus for attendee (once per day)
      await addBuildingEntryBonusForAttendee(selectedAttendee.id);
    }

    showFeedback('success', data.message || `Building ${action.toUpperCase()} successful!`);
    
    // Update attendee status
    const newStatus = action === 'enter' ? 'inside' : 'outside';
    setSelectedAttendee(prev => prev ? {
      ...prev,
      current_status: newStatus,
      building_entry: action === 'enter', // Update building_entry boolean
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
// Update the handleSessionAttendanceAction function
const handleSessionAttendanceAction = async () => {
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

    // Add score for volunteer for successful session entry
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await addSessionEntryScoreForVolunteer(
        user.id,
        `${selectedAttendee.first_name} ${selectedAttendee.last_name}`,
        selectedSession.title
      );
    }

    // Add session entry bonus for attendee
    await addSessionEntryBonusForAttendee(selectedAttendee.id, selectedSession.title);

    showFeedback('success', data.message || 'Successfully added to session!');
    
    // Refresh sessions to update current_attendees count
    fetchSessions();

    // Close attendee card after successful action
    setTimeout(() => {
      setShowAttendeeCard(false);
      setSelectedAttendee(null);
      setSessionMode(null);
      setHasSessionBooking(false);
      setHasSessionAttendance(false);
    }, 2000);

  } catch (error) {
    console.error("Session attendance action error:", error);
    showFeedback('error', 'Failed to add to session');
  } finally {
    setActionLoading(false);
  }
};
  const clearBuildingSearch = () => {
    setBuildingSearchTerm("");
    setBuildingSearchResults([]);
    setShowBuildingSearchResults(false);
  };

  const clearSessionSearch = () => {
    setSessionSearchTerm("");
    setSessionSearchResults([]);
    setShowSessionSearchResults(false);
  };

  const resetBuildingTab = () => {
    setBuildingSearchMode(null);
    setSelectedAttendee(null);
    setShowAttendeeCard(false);
    clearBuildingSearch();
  };

  const resetSessionTab = () => {
    setSessionMode(null);
    setSessionSearchMode(null);
    setSelectedSession(null);
    setSelectedAttendee(null);
    setShowAttendeeCard(false);
    setHasSessionBooking(false);
    setHasSessionAttendance(false);
    clearSessionSearch();
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

  // Reset booking and attendance check when session changes
  useEffect(() => {
    if (selectedSession && selectedAttendee) {
      checkSessionBookingAndAttendance(selectedAttendee.id, selectedSession.id);
    }
  }, [selectedSession, selectedAttendee]);

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
            resetSessionTab();
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
            resetBuildingTab();
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
            {/* Building Main View */}
            {!buildingSearchMode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-8 space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 text-center flex items-center justify-center gap-2">
                  <Building2 className="h-6 w-6 text-orange-500" />
                  Building Attendance Management
                </h2>
                <p className="text-gray-600 text-center">
                  Manage entry and exit for attendees using QR code scanning or manual search
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <button
                    onClick={() => setBuildingSearchMode("qr")}
                    className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code Scanner
                  </button>
                  <button
                    onClick={() => setBuildingSearchMode("manual")}
                    className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search by Personal ID
                  </button>
                </div>
              </div>
            )}

            {/* Building Manual Search */}
            {buildingSearchMode === "manual" && (
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
                          value={buildingSearchTerm}
                          onChange={(e) => setBuildingSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleBuildingSearchByPersonalId()}
                          onBlur={() => {
                            setTimeout(() => setShowBuildingSearchResults(false), 200);
                          }}
                          onFocus={() => buildingSearchResults.length > 0 && setShowBuildingSearchResults(true)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                        />
                        {buildingSearchTerm && (
                          <button
                            onClick={clearBuildingSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}

                        {/* Dynamic Search Results Dropdown */}
                        {showBuildingSearchResults && buildingSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            {buildingSearchResults.map((attendee) => (
                              <button
                                key={attendee.id}
                                onClick={() => handleBuildingSelectSearchResult(attendee)}
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
                        {showBuildingSearchResults && buildingSearchResults.length === 0 && buildingSearchTerm.trim().length >= 2 && !buildingSearchLoading && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                            <p className="text-gray-600 text-sm">No attendees found matching "{buildingSearchTerm}"</p>
                          </div>
                        )}

                        {/* Loading State */}
                        {buildingSearchLoading && buildingSearchTerm.trim().length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                              <p className="text-gray-600 text-sm">Searching attendees...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleBuildingSearchByPersonalId}
                        disabled={buildingSearchLoading || !buildingSearchTerm.trim()}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        {buildingSearchLoading ? (
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

                  <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium mb-1">Search Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Start typing to see dynamic suggestions (minimum 2 characters)</li>
                      <li>Only attendees will appear in search results</li>
                      <li>Click on a suggestion to select that attendee</li>
                      <li>Use QR Scanner for faster lookup</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setBuildingSearchMode(null)}
                    className="text-sm text-gray-500 underline"
                  >
                    ← Back to options
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
                              {(typeof session.capacity === 'number' && session.capacity > 0) && `/${session.capacity}`} attendees
                            </span>
                            {(typeof session.capacity === 'number' && session.capacity > 0) && (session.current_attendees >= session.capacity) && (
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
            {selectedSession && !sessionMode && (
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
                    onClick={() => setSessionMode("session_entry")}
                    disabled={(typeof selectedSession.capacity === 'number' && selectedSession.capacity > 0) && (selectedSession.current_attendees >= selectedSession.capacity)}
                    className="w-full flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add Attendee to Session
                    {(typeof selectedSession.capacity === 'number' && selectedSession.capacity > 0) && (selectedSession.current_attendees >= selectedSession.capacity) && (
                      <span className="ml-2 text-xs">(Session Full)</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Session Action Selection */}
            {sessionMode === "session_entry" && !sessionSearchMode && (
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Attendee to: {selectedSession?.title}
                </h2>
                <p className="text-gray-600">
                  Choose how you want to identify the attendee
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSessionSearchMode("qr")}
                    className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Code Scanner
                  </button>
                  <button
                    onClick={() => setSessionSearchMode("manual")}
                    className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search by Personal ID
                  </button>
                </div>
                <button
                  onClick={() => setSessionMode(null)}
                  className="text-sm text-gray-500 underline"
                >
                  ← Back to session details
                </button>
              </div>
            )}

            {/* Session Manual Search */}
            {sessionSearchMode === "manual" && (
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
                          value={sessionSearchTerm}
                          onChange={(e) => setSessionSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSessionSearchByPersonalId()}
                          onBlur={() => {
                            setTimeout(() => setShowSessionSearchResults(false), 200);
                          }}
                          onFocus={() => sessionSearchResults.length > 0 && setShowSessionSearchResults(true)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                        />
                        {sessionSearchTerm && (
                          <button
                            onClick={clearSessionSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}

                        {/* Dynamic Search Results Dropdown */}
                        {showSessionSearchResults && sessionSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            {sessionSearchResults.map((attendee) => (
                              <button
                                key={attendee.id}
                                onClick={() => handleSessionSelectSearchResult(attendee)}
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
                        {showSessionSearchResults && sessionSearchResults.length === 0 && sessionSearchTerm.trim().length >= 2 && !sessionSearchLoading && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                            <p className="text-gray-600 text-sm">No attendees found matching "{sessionSearchTerm}"</p>
                          </div>
                        )}

                        {/* Loading State */}
                        {sessionSearchLoading && sessionSearchTerm.trim().length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                              <p className="text-gray-600 text-sm">Searching attendees...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleSessionSearchByPersonalId}
                        disabled={sessionSearchLoading || !sessionSearchTerm.trim()}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                      >
                        {sessionSearchLoading ? (
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

                  <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                    <p className="font-medium mb-1">Search Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Start typing to see dynamic suggestions (minimum 2 characters)</li>
                      <li>Only attendees will appear in search results</li>
                      <li>Click on a suggestion to select that attendee</li>
                      <li>Use QR Scanner for faster lookup</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => setSessionSearchMode(null)}
                    className="text-sm text-gray-500 underline"
                  >
                    ← Back to options
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* QR Scanner for Building */}
        {activeTab === "building" && buildingSearchMode === "qr" && (
          <QRScanner
            isOpen={true}
            onClose={() => setBuildingSearchMode(null)}
            onScan={handleBuildingQRScan}
            title="Building Entry Scanner"
            description="Point your camera at the attendee's QR code"
          />
        )}

        {/* QR Scanner for Session */}
        {activeTab === "session" && sessionSearchMode === "qr" && (
          <QRScanner
            isOpen={true}
            onClose={() => setSessionSearchMode(null)}
            onScan={handleSessionQRScan}
            title="Session Entry Scanner"
            description="Point your camera at the attendee's QR code"
          />
        )}

      {/* Attendee Card Modal with Portal and Animations */}
{showAttendeeCard && selectedAttendee && createPortal(
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
    onClick={() => {
      setShowAttendeeCard(false);
      setSelectedAttendee(null);
      setHasSessionBooking(false);
      setHasSessionAttendance(false);
    }}
  >
    <div 
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 stagger-children">
        <div className="flex items-center justify-between mb-6 fade-in-blur">
          <h2 className="text-xl font-bold text-gray-900">
            {activeTab === "session" && sessionMode === "session_entry" 
              ? `Add to Session: ${selectedSession?.title}` 
              : "Attendee Information"}
          </h2>
          <button
            onClick={() => {
              setShowAttendeeCard(false);
              setSelectedAttendee(null);
              setHasSessionBooking(false);
              setHasSessionAttendance(false);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Attendee Information */}
          <div className="grid grid-cols-2 gap-4 fade-in-blur">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <p className="text-gray-900">{selectedAttendee.first_name} {selectedAttendee.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal ID</label>
              <p className="text-gray-900">{selectedAttendee.personal_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{selectedAttendee.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                selectedAttendee.current_status === 'inside'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedAttendee.current_status === 'inside' ? 'Inside' : 'Outside'}
              </span>
            </div>
          </div>

          {/* BUILDING TAB VALIDATIONS */}
          {activeTab === "building" && (
            <div className="fade-in-blur">
              {!selectedAttendee.event_entry ? (
                <div className="flex items-center p-3 bg-red-50 rounded-lg mb-4">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <span className="text-red-800 font-medium block">Attendee not inside event</span>
                    <span className="text-red-700 text-sm block mt-1">
                      This attendee must enter the event first before building access
                    </span>
                  </div>
                </div>
              ) : selectedAttendee.current_status === 'inside' ? (
                <div className="flex items-center p-3 bg-blue-50 rounded-lg mb-4">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-blue-800 font-medium">Attendee is inside building</span>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-green-50 rounded-lg mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-800 font-medium">Ready for building entry</span>
                </div>
              )}
            </div>
          )}

          {/* SESSION TAB VALIDATIONS */}
          {activeTab === "session" && sessionMode === "session_entry" && (
            <div className="fade-in-blur">
              {bookingCheckLoading ? (
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <span className="text-blue-800 text-sm">Checking session status...</span>
                </div>
              ) : !selectedAttendee.building_entry ? (
                <div className="flex items-center p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <span className="text-red-800 font-medium block">Attendee not inside building</span>
                    <span className="text-red-700 text-sm block mt-1">
                      This attendee must enter the building first
                    </span>
                  </div>
                </div>
              ) : hasSessionAttendance ? (
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <span className="text-yellow-800 font-medium block">Already attended this session</span>
                    <span className="text-yellow-700 text-sm block mt-1">
                      This attendee has already been added to the session
                    </span>
                  </div>
                </div>
              ) : !hasSessionBooking ? (
                <div className="flex items-center p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <span className="text-red-800 font-medium block">Attendee hasn't booked this session</span>
                    <span className="text-red-700 text-sm block mt-1">
                      Please book the session first or head to info desk
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-800 font-medium">Ready to add to session</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 fade-in-blur">
            {activeTab === "session" && sessionMode === "session_entry" ? (
              <button
                onClick={() => handleSessionAttendanceAction()}
                disabled={
                  actionLoading || 
                  !selectedAttendee.building_entry || 
                  !hasSessionBooking || 
                  hasSessionAttendance || 
                  Boolean(bookingCheckLoading)
                }
                className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {actionLoading ? 'Adding to Session...' : 
                 !selectedAttendee.building_entry ? 'Cannot Add - Not in Building' :
                 hasSessionAttendance ? 'Already Attended' :
                 !hasSessionBooking ? 'Cannot Add - No Booking' : 'Add to Session'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleBuildingAttendanceAction('enter')}
                  disabled={
                    actionLoading || 
                    !selectedAttendee.event_entry || 
                    selectedAttendee.current_status === 'inside'
                  }
                  className="bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {actionLoading ? 'Processing...' : 
                   !selectedAttendee.event_entry ? 'Not in Event' :
                   selectedAttendee.current_status === 'inside' ? 'Already Inside' : 'Enter Building'}
                </button>
                <button
                  onClick={() => handleBuildingAttendanceAction('exit')}
                  disabled={
                    actionLoading || 
                    !selectedAttendee.event_entry || 
                    selectedAttendee.current_status === 'outside'
                  }
                  className="bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {actionLoading ? 'Processing...' : 
                   !selectedAttendee.event_entry ? 'Not in Event' :
                   selectedAttendee.current_status === 'outside' ? 'Already Outside' : 'Exit Building'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
)}
      </div>
    </DashboardLayout>
  );
};