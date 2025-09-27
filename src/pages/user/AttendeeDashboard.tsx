import React, { useState, useEffect } from "react";
import { Trophy, Star, QrCode, Calendar, MapPin, Clock, Building, Users, X, CheckCircle, XCircle } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import QRCodeLib from 'qrcode';

// Types
interface UserScore {
  score: number;
  rank: number;
  total_users: number;
}

interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  type: string;
}

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
  max_attendees: number;
  current_bookings: number;
  session_type: string;
  created_at: string;
}

interface SessionBooking {
  session_id: string;
  booked_at: string;
}

interface Company {
  id: string;
  name: string;
  logo_url: string;
  description: string;
  website: string;
  booth_number: string;
  created_at: string;
}

const AttendeeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userBookings, setUserBookings] = useState<SessionBooking[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  
  // Session modal states
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Company modal states
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    try {
      // Score
      const { data: scoreData } = await supabase
        .from("user_scores")
        .select("score")
        .eq("user_id", profile.id)
        .single();

      if (scoreData) {
        const { data: rankData } = await supabase.rpc("get_user_ranking", {
          user_id: profile.id,
        });

        setUserScore({
          score: scoreData.score || 0,
          rank: rankData?.rank || 0,
          total_users: rankData?.total_users || 0,
        });
      }

      // Schedule
      const today = new Date().toISOString().split("T")[0];
      const { data: scheduleData } = await supabase
        .from("schedule_items")
        .select("*")
        .gte("start_time", `${today}T00:00:00`)
        .lt("start_time", `${today}T23:59:59`)
        .order("start_time", { ascending: true });

      if (scheduleData) setSchedule(scheduleData);

      // Sessions
      await fetchSessions();
      await fetchUserBookings();
      
      // Companies
      await fetchCompanies();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching sessions:", error);
      } else if (data) {
        setSessions(data);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const fetchUserBookings = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("attendances")
        .select("session_id, scanned_at")
        .eq("user_id", profile.id)
        .eq("scan_type", "booking");

      if (error) {
        console.error("Error fetching user bookings:", error);
      } else if (data) {
        setUserBookings(data.map(booking => ({
          session_id: booking.session_id,
          booked_at: booking.scanned_at
        })));
      }
    } catch (error) {
      console.error("Error fetching user bookings:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching companies:", error);
      } else if (data) {
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const generateQRCode = async () => {
    if (!profile?.id) return;
    
    setQrCodeLoading(true);
    try {
      const qrCodeDataUrl = await QRCodeLib.toDataURL(profile.id, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrCodeUrl('');
    } finally {
      setQrCodeLoading(false);
    }
  };

  const handleShowQR = () => {
    setShowQR(true);
    generateQRCode();
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
    setBookingError(null);
    setBookingSuccess(null);
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setShowCompanyModal(true);
  };

  const isSessionBooked = (sessionId: string): boolean => {
    return userBookings.some(booking => booking.session_id === sessionId);
  };

  const isSessionFull = (session: Session): boolean => {
    return session.max_attendees && session.current_bookings >= session.max_attendees;
  };

  const handleBookSession = async (sessionId: string) => {
    if (!profile?.id) return;
    
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      const { data, error } = await supabase.rpc('book_session', {
        p_user_id: profile.id,
        p_session_id: sessionId,
        p_scanned_by: profile.id
      });

      if (error) {
        setBookingError(error.message || 'Failed to book session');
      } else if (data?.success) {
        setBookingSuccess('Session booked successfully!');
        // Refresh data
        await fetchSessions();
        await fetchUserBookings();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowSessionModal(false);
          setSelectedSession(null);
        }, 2000);
      } else {
        setBookingError(data?.message || 'Failed to book session');
      }
    } catch (error: any) {
      setBookingError('An error occurred while booking the session');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (sessionId: string) => {
    if (!profile?.id) return;
    
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      const { data, error } = await supabase.rpc('cancel_booking', {
        p_user_id: profile.id,
        p_session_id: sessionId
      });

      if (error) {
        setBookingError(error.message || 'Failed to cancel booking');
      } else if (data?.success) {
        setBookingSuccess('Booking cancelled successfully!');
        // Refresh data
        await fetchSessions();
        await fetchUserBookings();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowSessionModal(false);
          setSelectedSession(null);
        }, 2000);
      } else {
        setBookingError(data?.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      setBookingError('An error occurred while cancelling the booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome back to Career Week">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Day maps path
  const mapImages = [
    "/src/Assets/day1.png",
    "/src/Assets/day2.png",
    "/src/Assets/day3.png",
    "/src/Assets/day4.png",
    "/src/Assets/day5.png",
  ];

  const handleEmployerWebsiteClick = (url: string) => {
    window.open(url, "_blank");
  };

  const tabItems = [
    { key: "overview", label: "Overview" },
    { key: "events", label: "Events" },
    { key: "sessions", label: "Sessions" },
    { key: "maps", label: "Maps" },
    { key: "employers", label: "Employers" }
  ];

  return (
    <DashboardLayout title="Attendee Dashboard" subtitle={`Welcome back, ${profile?.first_name}!`}>
      {/* Tabs - Mobile optimized */}
      <div className="flex space-x-1 sm:space-x-4 border-b mb-6 overflow-x-auto scrollbar-hide">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-2 sm:px-4 font-semibold text-sm sm:text-base whitespace-nowrap ${
              activeTab === tab.key
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-500 hover:text-orange-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <p className="text-sm font-medium text-gray-600">Your Score</p>
            <p className="text-3xl font-bold text-orange-600">{userScore?.score || 0}</p>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mt-2">
              <Trophy className="h-6 w-6 text-orange-600" />
            </div>
          </div>

          {/* Rank */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <p className="text-sm font-medium text-gray-600">Your Rank</p>
            <p className="text-3xl font-bold text-blue-600">#{userScore?.rank || 0}</p>
            <p className="text-xs text-gray-500">of {userScore?.total_users || 0} attendees</p>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mt-2">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          {/* QR */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <p className="text-sm font-medium text-gray-600">Your QR Code</p>
            <button
              onClick={handleShowQR}
              className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors"
            >
              Show QR
            </button>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mt-2">
              <QrCode className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Event Days */}
      {activeTab === "events" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-orange-600" /> 5-Day Event Schedule
          </h2>
          <div className="space-y-4">
            {schedule.length > 0 ? (
              schedule.map((item) => (
                <div key={item.id} className="border-l-4 border-orange-500 pl-4 py-2 bg-white rounded-lg shadow-sm">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {item.location}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No schedule available</p>
            )}
          </div>
        </div>
      )}

      {/* Sessions */}
      {activeTab === "sessions" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-orange-600" /> Available Sessions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const booked = isSessionBooked(session.id);
              const full = isSessionFull(session);
              
              return (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{session.title}</h3>
                    {booked && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{session.description}</p>
                  
                  {session.speaker && (
                    <p className="text-sm font-medium text-gray-900 mb-2">Speaker: {session.speaker}</p>
                  )}
                  
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(session.start_time).toLocaleDateString()} {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {session.location}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {session.current_bookings || 0}/{session.max_attendees || 'Unlimited'} booked
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    {booked ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Booked
                      </span>
                    ) : full ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Full
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Maps */}
      {activeTab === "maps" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Event Maps</h2>
          <div className="flex space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2 rounded-lg text-sm ${activeDay === day ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                Day {day}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-center">
            <img
              src={mapImages[activeDay - 1]}
              alt={`Day ${activeDay} Map`}
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Employers */}
      {activeTab === "employers" && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Building className="h-5 w-5 mr-2 text-orange-600" /> Participating Companies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company)}
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="text-center">
                  <img 
                    src={company.logo_url} 
                    alt={`${company.name} logo`} 
                    className="h-16 w-auto mx-auto mb-4 object-contain" 
                  />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{company.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{company.description}</p>
                  
                  {company.booth_number && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-2">
                      Booth {company.booth_number}
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-4">
                    <Building className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Your QR Code</h3>
              <button
                onClick={() => {
                  setShowQR(false);
                  setQrCodeUrl('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              {qrCodeLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">Generating...</p>
                </div>
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">QR Code</p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">Show this QR code for check-ins</p>
            {profile?.id && (
              <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                {profile.id}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                <button
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedSession(null);
                    setBookingError(null);
                    setBookingSuccess(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSession.title}</h3>
                  <p className="text-gray-600 mt-2">{selectedSession.description}</p>
                </div>

                {selectedSession.speaker && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Speaker</label>
                    <p className="text-gray-900">{selectedSession.speaker}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="text-gray-900">
                    {new Date(selectedSession.start_time).toLocaleDateString()} at{' '}
                    {new Date(selectedSession.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-gray-900">{selectedSession.location}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity</label>
                  <p className="text-gray-900">
                    {selectedSession.current_bookings || 0} / {selectedSession.max_attendees || 'Unlimited'} booked
                  </p>
                </div>

                {/* Booking Status */}
                <div className="pt-4 border-t border-gray-200">
                  {isSessionBooked(selectedSession.id) ? (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-green-800 font-medium">You have booked this session</span>
                    </div>
                  ) : isSessionFull(selectedSession) ? (
                    <div className="flex items-center p-3 bg-red-50 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-red-800 font-medium">This session is fully booked</span>
                    </div>
                  ) : (
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-blue-800 font-medium">Available for booking</span>
                    </div>
                  )}
                </div>

                {/* Error/Success Messages */}
                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{bookingError}</p>
                  </div>
                )}
                {bookingSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm">{bookingSuccess}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  {isSessionBooked(selectedSession.id) ? (
                    <button
                      onClick={() => handleCancelBooking(selectedSession.id)}
                      disabled={bookingLoading}
                      className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingLoading ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBookSession(selectedSession.id)}
                      disabled={bookingLoading || isSessionFull(selectedSession)}
                      className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingLoading ? 'Booking...' : isSessionFull(selectedSession) ? 'Session Full' : 'Book Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Company Details Modal */}
      {showCompanyModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
                <button
                  onClick={() => {
                    setShowCompanyModal(false);
                    setSelectedCompany(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Company Logo and Name */}
                <div className="text-center">
                  <img 
                    src={selectedCompany.logo_url} 
                    alt={`${selectedCompany.name} logo`} 
                    className="h-24 w-auto mx-auto mb-4 object-contain" 
                  />
                  <h3 className="text-2xl font-bold text-gray-900">{selectedCompany.name}</h3>
                  {selectedCompany.booth_number && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 mt-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      Booth {selectedCompany.booth_number}
                    </div>
                  )}
                </div>

                {/* Company Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">About Company</label>
                  <p className="text-gray-700 leading-relaxed">{selectedCompany.description}</p>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <a 
                    href={selectedCompany.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 break-all"
                  >
                    {selectedCompany.website}
                  </a>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => handleEmployerWebsiteClick(selectedCompany.website)}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    Visit Career Page
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowCompanyModal(false);
                      setSelectedCompany(null);
                    }}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AttendeeDashboard;