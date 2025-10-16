import React, { useState, useEffect, useRef } from "react";
import {
  UserCheck,
  Users,
  Search,
  QrCode,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from '../../components/shared/DashboardLayout';
import { QRScanner } from "../../components/shared/QRScanner";
import { AttendeeCard } from "../../components/shared/AttendeeCard";
import { useAuth } from "../../contexts/AuthContext";
import { 
  processAttendance, 
  getAttendeeByPersonalId,
  getAttendeeByUUID,
  searchAttendeesByPersonalId
} from "../../lib/supabase";

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
  event_entry?: boolean;
  profile_complete?: boolean;
  authorized?: boolean; // Add this line
}

const castToAttendee = (data: any): Attendee => {
  console.log('Casting attendee data:', data);
  console.log('Authorization field from DB:', data.authorized, 'Type:', typeof data.authorized);
  
  return {
    ...data,
    current_status: data.event_entry ? 'inside' : 'outside',
    event_entry: data.event_entry || false,
    profile_complete: data.profile_complete !== undefined ? data.profile_complete : true,
    authorized: data.authorized !== undefined ? data.authorized : true // Changed from true to false
  } as Attendee;
};

export const RegTeamDashboard: React.FC = () => {
  const { profile } = useAuth();

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [searchMode, setSearchMode] = useState<"qr" | "manual">("manual");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // Dynamic search state
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Attendee card state
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [showAttendeeCard, setShowAttendeeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  const performDynamicSearch = async (query: string) => {
    try {
      setSearchLoading(true);
      const { data, error } = await searchAttendeesByPersonalId(query);
      
      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else {
        console.log('Search results:', data);
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

const validateAttendee = (attendee: any): { isValid: boolean; error?: string } => {
  console.log('Validating attendee:', attendee);
  console.log('Authorization value:', attendee.authorized, 'Type:', typeof attendee.authorized);
  
  // Check if role is attendee
  if (attendee.role !== 'attendee') {
    return {
      isValid: false,
      error: 'Only attendees can be processed through this system'
    };
  }

  // Check if profile is complete
  const profileComplete = attendee.profile_complete === true;
  console.log('Profile complete status:', attendee.profile_complete, 'parsed as:', profileComplete);
  
  if (!profileComplete) {
    return {
      isValid: false,
      error: 'This attendee has not completed their profile and cannot enter the event'
    };
  }

  // Check if attendee is authorized - strict boolean check
  const isAuthorized = attendee.authorized === true;
  console.log('Authorization status:', attendee.authorized, 'parsed as:', isAuthorized);
  
  if (!isAuthorized) {
    return {
      isValid: false,
      error: 'This attendee is not authorized to enter the event'
    };
  }

  return { isValid: true };
};
  // Check if a string is a UUID format
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
      setValidationError(null);
      
      const { data, error } = await getAttendeeByPersonalId(searchTerm.trim());

      if (error || !data) {
        showFeedback('error', 'Personal ID not found');
        return;
      }

      console.log('Found attendee data:', data);

      // Validate attendee
      const validation = validateAttendee(data);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Validation failed');
        showFeedback('error', validation.error || 'Validation failed');
        return;
      }

      setSelectedAttendee(castToAttendee(data));
      setShowAttendeeCard(true);
      setSearchTerm("");
      setShowSearchResults(false);
      
    } catch (error) {
      console.error("Search exception:", error);
      showFeedback('error', 'Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (attendee: Attendee) => {
    console.log('Selected attendee from search:', attendee);
    
    // Validate attendee before selection
    const validation = validateAttendee(attendee);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Validation failed');
      showFeedback('error', validation.error || 'Validation failed');
      return;
    }

    setSelectedAttendee(attendee);
    setShowAttendeeCard(true);
    setSearchTerm("");
    setShowSearchResults(false);
    setSearchResults([]);
    setValidationError(null);
  };

  const handleQRScan = async (qrData: string) => {
    try {
      console.log('Processing QR data:', qrData);
      setValidationError(null);
      
      let attendeeData: Attendee | null = null;
      let error;

      // Check if QR data is UUID or Personal ID
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

      console.log('Found attendee from QR scan:', attendeeData);

      // Validate attendee
      const validation = validateAttendee(attendeeData);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Validation failed');
        showFeedback('error', validation.error || 'Validation failed');
        return;
      }

      setSelectedAttendee(attendeeData);
      setShowAttendeeCard(true);
      setValidationError(null);
      
    } catch (error) {
      console.error("QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };

  // Handle scanner close
  const handleScannerClose = () => {
    console.log('Scanner closing from parent...');
    setShowScanner(false);
  };

const handleAttendanceAction = async (action: 'enter' | 'exit') => {
  if (!selectedAttendee) return;

  try {
    setActionLoading(true);
    
    // Double-check validation before processing
    const validation = validateAttendee(selectedAttendee);
    if (!validation.isValid) {
      showFeedback('error', validation.error || 'Cannot process action: validation failed');
      return;
    }

    // Additional authorization check
    const isAuthorized = selectedAttendee.authorized === true || selectedAttendee.authorized === 'true';
    if (!isAuthorized) {
      showFeedback('error', 'This attendee is not authorized to enter the event');
      return;
    }

    const { data, error } = await processAttendance(selectedAttendee.personal_id, action);

    if (error) {
      showFeedback('error', error.message || `Failed to process ${action}`);
      return;
    }

    showFeedback('success', data.message || `${action.toUpperCase()} scan successful!`);
    
    // Update attendee status
    const newStatus = action === 'enter' ? 'inside' : 'outside';
    const newEventEntry = action === 'enter';
    
    setSelectedAttendee(prev => prev ? {
      ...prev,
      current_status: newStatus,
      event_entry: newEventEntry,
      last_scan: new Date().toISOString()
    } : null);

    // Close attendee card after successful action
    setTimeout(() => {
      setShowAttendeeCard(false);
      setSelectedAttendee(null);
      setValidationError(null);
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
    setShowSearchResults(false);
    setValidationError(null);
  };

  // Close search results when clicking outside
  const handleSearchInputBlur = () => {
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  return (
    <DashboardLayout
      title="Registration Team Dashboard"
      subtitle="Manage attendee registrations and check-ins"
    >
      {/* Feedback Toast */}
     {feedback && (
  <div className={`fixed top-4 right-4 z-[100] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
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

      {/* Validation Error Alert */}
      {validationError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 font-medium">{validationError}</span>
          </div>
        </div>
      )}

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
            Search by Personal ID
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

        {/* Manual Search - Personal ID Only */}
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
                      onBlur={handleSearchInputBlur}
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
                                {/* Show profile completion status */}
                                {!attendee.profile_complete && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                    <span className="text-xs text-yellow-600">Profile Incomplete</span>
                                  </div>
                                )}
                                {/* Show authorization status */}
                                {!attendee.authorized && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                    <span className="text-xs text-red-600">Not Authorized</span>
                                  </div>
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
              Scan the attendee's QR code to instantly load their information and process entry/exit
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

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={handleScannerClose}
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
    setValidationError(null);
  }}
  attendee={selectedAttendee}
  onAction={handleAttendanceAction}
  loading={actionLoading}
  mode="registration"
  // Pass validation info to the card
  validationInfo={{
    profileComplete: selectedAttendee?.profile_complete || false,
    eventEntry: selectedAttendee?.event_entry || false,
    authorized: selectedAttendee?.authorized || false // Add this line
  }}
/>
    </DashboardLayout>
  );
};