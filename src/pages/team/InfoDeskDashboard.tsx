// src/pages/infodesk/InfoDeskDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  QrCode,
  Search,
  Edit,
  Clock,
  User,
  MapPin,
  UserPlus,
  UserX,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { QRScanner } from "../../components/shared/QRScanner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase, getAllSessions, getAttendeeByPersonalId, getAttendeeByUUID, searchAttendeesByPersonalId } from "../../lib/supabase";

interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string;
  start_time: string;
  end_time: string;
  location: string;
  current_attendees: number;
  max_attendees: number;
  current_bookings: number;
  session_type: string;
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
  building_entry?: boolean;
  event_entry?: boolean;
  building_status?: string;
  current_status?: string;
}

interface SessionBookingInfo {
  isBooked: boolean;
  bookingId?: string;
  bookedAt?: string;
}

export const InfoDeskDashboard: React.FC = () => {
  const { profile } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showBookingManager, setShowBookingManager] = useState(false);
  const [searchMode, setSearchMode] = useState<"qr" | "manual" | null>(null);
  const [searchId, setSearchId] = useState("");
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [sessionBookingInfo, setSessionBookingInfo] = useState<SessionBookingInfo>({ isBooked: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load sessions from database
  useEffect(() => {
    loadSessions();
  }, []);

  // Dynamic search effect - similar to RegTeam
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchId.trim().length >= 2) {
      const timeout = setTimeout(() => {
        performDynamicSearch(searchId.trim());
      }, 300); // 300ms debounce

      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchId]);

  const performDynamicSearch = async (query: string) => {
    try {
      setActionLoading(true);
      const { data, error } = await searchAttendeesByPersonalId(query);
      
      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error("Search exception:", error);
      setSearchResults([]);
    } finally {
      setActionLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await getAllSessions();
      
      if (error) {
        setError("Failed to load sessions");
        console.error("Error loading sessions:", error);
        return;
      }

      setSessions(data);
    } catch (err) {
      setError("Failed to load sessions");
      console.error("Exception loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date for display
  const formatDate = (timeString: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Check if attendee has booked the session
  const checkSessionBooking = async (userId: string, sessionId: string): Promise<SessionBookingInfo> => {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('id, scanned_at')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('scan_type', 'booking')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking session booking:', error);
        return { isBooked: false };
      }

      if (data) {
        return {
          isBooked: true,
          bookingId: data.id,
          bookedAt: data.scanned_at
        };
      }

      return { isBooked: false };
    } catch (err) {
      console.error('Exception checking session booking:', err);
      return { isBooked: false };
    }
  };

  // Check if a string is a UUID format
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Handle QR code scan - similar to RegTeam implementation
  const handleQRScan = async (qrData: string) => {
    try {
      setActionLoading(true);
      setError(null);

      console.log('Processing QR data:', qrData);

      let attendeeData: Attendee | null = null;
      let apiError;

      // Check if QR data is UUID or Personal ID
      if (isUUID(qrData)) {
        console.log('Detected UUID format, searching by UUID...');
        const result = await getAttendeeByUUID(qrData);
        attendeeData = result.data;
        apiError = result.error;
      } else {
        console.log('Detected Personal ID format, searching by Personal ID...');
        const result = await getAttendeeByPersonalId(qrData);
        attendeeData = result.data;
        apiError = result.error;
      }

      if (apiError || !attendeeData) {
        const errorMsg = isUUID(qrData) 
          ? 'Invalid QR code: UUID not found in system'
          : 'Invalid QR code: Personal ID not found';
        setError(errorMsg);
        return;
      }

      // Check if the person is an attendee
      if (attendeeData.role !== 'attendee') {
        setError('Only attendees can be processed through this system');
        return;
      }

      // Check session booking status
      const bookingInfo = await checkSessionBooking(attendeeData.id, selectedSession!.id);
      
      setSelectedAttendee(attendeeData);
      setSessionBookingInfo(bookingInfo);
      setSearchMode(null);
      setShowQRScanner(false);
      
    } catch (err) {
      console.error('QR scan error:', err);
      setError("Failed to process QR scan");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle manual search
  const handleManualSearch = async () => {
    if (!searchId.trim()) {
      setError("Please enter a Personal ID");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const { data, error } = await getAttendeeByPersonalId(searchId.trim());

      if (error || !data) {
        setError("Attendee not found with this Personal ID");
        return;
      }

      // Check session booking status
      const bookingInfo = await checkSessionBooking(data.id, selectedSession!.id);
      
      setSelectedAttendee(data);
      setSessionBookingInfo(bookingInfo);
      setSearchMode(null);
      setSearchId("");
      
    } catch (err) {
      console.error('Manual search error:', err);
      setError("Failed to search for attendee");
    } finally {
      setActionLoading(false);
    }
  };

  // Add attendee to session
  const addToSession = async () => {
    if (!selectedAttendee || !selectedSession) return;

    try {
      setActionLoading(true);
      setError(null);

      // Check capacity first
      if (selectedSession.max_attendees && selectedSession.current_bookings >= selectedSession.max_attendees) {
        setError("Session is at full capacity");
        return;
      }

      // Create session attendance record
      const { data, error } = await supabase
        .from('attendances')
        .insert({
          user_id: selectedAttendee.id,
          session_id: selectedSession.id,
          scan_type: 'booking',
          scanned_by: profile?.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setError("Attendee is already registered for this session");
        } else {
          setError("Failed to add attendee to session");
        }
        return;
      }

      // Update local booking info
      setSessionBookingInfo({
        isBooked: true,
        bookingId: data.id,
        bookedAt: data.scanned_at
      });

      // Refresh session data to update booking count
      loadSessions();
      
    } catch (err) {
      console.error('Add to session error:', err);
      setError("Failed to add attendee to session");
    } finally {
      setActionLoading(false);
    }
  };

  // Remove attendee from session
  const removeFromSession = async () => {
    if (!selectedAttendee || !selectedSession || !sessionBookingInfo.bookingId) return;

    try {
      setActionLoading(true);
      setError(null);

      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('id', sessionBookingInfo.bookingId);

      if (error) {
        setError("Failed to remove attendee from session");
        return;
      }

      // Update local booking info
      setSessionBookingInfo({ isBooked: false });

      // Refresh session data to update booking count
      loadSessions();
      
    } catch (err) {
      console.error('Remove from session error:', err);
      setError("Failed to remove attendee from session");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset states when going back
  const resetStates = () => {
    setSelectedAttendee(null);
    setSessionBookingInfo({ isBooked: false });
    setSearchMode(null);
    setSearchId("");
    setError(null);
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Info Desk Dashboard"
        subtitle="Loading sessions..."
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Info Desk Dashboard"
      subtitle="Manage session attendance and bookings"
    >
      <div className="space-y-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Session List */}
        {!selectedSession && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Found</h3>
                <p className="text-gray-500">There are no sessions available at the moment.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {session.title}
                    </h3>
                    <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {session.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {session.speaker && (
                      <p className="text-sm text-gray-700">
                        <User className="inline-block h-4 w-4 mr-1" />
                        {session.speaker}
                      </p>
                    )}
                    
                    <p className="text-sm text-gray-700">
                      <Clock className="inline-block h-4 w-4 mr-1" />
                      {formatDate(session.start_time)} • {formatTime(session.start_time)} - {formatTime(session.end_time)}
                    </p>
                    
                    {session.location && (
                      <p className="text-sm text-gray-700">
                        <MapPin className="inline-block h-4 w-4 mr-1" />
                        {session.location}
                      </p>
                    )}
                    
                    <p className="text-sm font-medium text-gray-700">
                      <Users className="inline-block h-4 w-4 mr-1" />
                      {session.current_bookings || 0}
                      {session.max_attendees ? `/${session.max_attendees}` : ''} bookings
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSession(session);
                      setShowBookingManager(true);
                    }}
                    className="w-full flex items-center justify-center p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Manage Bookings
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Session Selected - Booking Manager */}
        {selectedSession && showBookingManager && !selectedAttendee && (
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedSession.title}
                </h2>
                <p className="text-gray-600 mt-1">{selectedSession.description}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setShowBookingManager(false);
                  resetStates();
                }}
                className="text-gray-500 hover:text-gray-700 underline text-sm"
              >
                Back to Sessions
              </button>
            </div>

            {/* Mode Switch */}
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setSearchMode("manual");
                  setSearchId("");
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  searchMode === "manual"
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Search className="h-4 w-4 inline mr-2" />
                Search by Personal ID
              </button>
              <button
                onClick={() => {
                  setSearchMode("qr");
                  setSearchId("");
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

            {/* Manual Search with Dynamic Results */}
            {searchMode === "manual" && (
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
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                        onBlur={() => {
                          // Delay hiding to allow clicks on search results
                          setTimeout(() => {
                            setSearchResults([]);
                          }, 200);
                        }}
                        onFocus={() => searchResults.length > 0 && setSearchResults(searchResults)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                      />
                      {searchId && (
                        <button
                          onClick={() => {
                            setSearchId("");
                            setSearchResults([]);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}

                      {/* Dynamic Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          {searchResults.map((attendee) => (
                            <button
                              key={attendee.id}
                              onClick={() => {
                                setSelectedAttendee(attendee);
                                checkSessionBooking(attendee.id, selectedSession.id).then(setSessionBookingInfo);
                                setSearchId("");
                                setSearchResults([]);
                                setSearchMode(null);
                              }}
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
                                  <div className="space-y-1">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      attendee.event_entry
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {attendee.event_entry ? 'Inside Event' : 'Outside Event'}
                                    </span>
                                    <br />
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      attendee.building_entry
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {attendee.building_entry ? 'Inside Building' : 'Outside Building'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* No Results Message */}
                      {searchResults.length === 0 && searchId.trim().length >= 2 && !actionLoading && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                          <p className="text-gray-600 text-sm">No attendees found matching "{searchId}"</p>
                        </div>
                      )}

                      {/* Loading State */}
                      {actionLoading && searchId.trim().length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                            <p className="text-gray-600 text-sm">Searching attendees...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleManualSearch}
                      disabled={actionLoading || !searchId.trim()}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {actionLoading ? (
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
              </div>
            )}

            {/* QR Scanner */}
            {searchMode === "qr" && (
              <div className="text-center">
                <QrCode className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  QR Code Scanner
                </h3>
                <p className="text-gray-600 mb-6">
                  Scan the attendee's QR code to manage their session booking
                </p>
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="px-8 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center space-x-2 mx-auto"
                >
                  <QrCode className="h-5 w-5" />
                  <span>Open QR Scanner</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Attendee Details with Session Booking Actions */}
        {selectedSession && selectedAttendee && (
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Attendee Details</h2>
              <button
                onClick={resetStates}
                className="text-gray-500 hover:text-gray-700 underline text-sm"
              >
                Search Another
              </button>
            </div>

            {/* Attendee Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedAttendee.first_name} {selectedAttendee.last_name}
                </h3>
                <p className="text-sm text-gray-600">
                  <User className="inline-block h-4 w-4 mr-1" />
                  ID: {selectedAttendee.personal_id}
                </p>
                <p className="text-sm text-gray-600">
                  Email: {selectedAttendee.email}
                </p>
                {selectedAttendee.university && (
                  <p className="text-sm text-gray-600">
                    <MapPin className="inline-block h-4 w-4 mr-1" />
                    {selectedAttendee.university}
                    {selectedAttendee.faculty && ` - ${selectedAttendee.faculty}`}
                  </p>
                )}
              </div>

              {/* Status Display */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-900">Current Status</h4>
                
                {/* Event Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${selectedAttendee.event_entry ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    {selectedAttendee.event_entry ? 'Inside Event' : 'Outside Event'}
                  </span>
                </div>

                {/* Building Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${selectedAttendee.building_entry ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    {selectedAttendee.building_entry ? 'Inside Building' : 'Outside Building'}
                  </span>
                </div>

                {/* Session Booking Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${sessionBookingInfo.isBooked ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm">
                    {sessionBookingInfo.isBooked ? 'Session Booked' : 'Not Booked'}
                  </span>
                </div>

                {sessionBookingInfo.isBooked && sessionBookingInfo.bookedAt && (
                  <p className="text-xs text-gray-500">
                    Booked: {new Date(sessionBookingInfo.bookedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-2">Session Details</h4>
              <p className="text-sm text-gray-700">{selectedSession.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(selectedSession.start_time)} • {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
              </p>
              <p className="text-xs text-gray-500">
                Bookings: {selectedSession.current_bookings || 0}
                {selectedSession.max_attendees ? `/${selectedSession.max_attendees}` : ''}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Prerequisites Check */}
              {!selectedAttendee.event_entry && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-yellow-800 text-sm">
                      Attendee must be inside the event to book sessions
                    </span>
                  </div>
                </div>
              )}

              {/* Capacity Check */}
              {selectedSession.max_attendees && selectedSession.current_bookings >= selectedSession.max_attendees && !sessionBookingInfo.isBooked && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-800 text-sm">
                      Session is at full capacity
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                {sessionBookingInfo.isBooked ? (
                  <button
                    onClick={removeFromSession}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserX className="h-5 w-5 mr-2" />
                        Remove from Session
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={addToSession}
                    disabled={
                      actionLoading || 
                      !selectedAttendee.event_entry || 
                      (selectedSession.max_attendees && selectedSession.current_bookings >= selectedSession.max_attendees)
                    }
                    className="flex-1 flex items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5 mr-2" />
                        Add to Session
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        title="Scan Attendee QR Code"
        description="Point your camera at the attendee's QR code to manage their session booking"
      />
    </DashboardLayout>
  );
};