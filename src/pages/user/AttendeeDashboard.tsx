import React, { useState, useEffect } from "react";
import { Trophy, Star, QrCode, Calendar, MapPin, Clock, Building, Users, X, CheckCircle, XCircle, Activity } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { supabase, getUserRankingAndScore, getRecentActivities } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import QRCodeLib from 'qrcode';
import { createPortal } from 'react-dom';

// Types
interface UserScore {
  score: number;
  rank: number;
  total_users: number;
}

interface RecentActivity {
  id: string;
  points: number;
  activity_type: string;
  activity_description: string;
  awarded_at: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  item_type: string;
  created_at: string;
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
  session?: Session; // Add session details to booking
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
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userBookings, setUserBookings] = useState<SessionBooking[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
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

  // Event modal states
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Load dashboard data
  useEffect(() => {
    fetchDashboardData();
    
    // Set up realtime subscriptions for sessions
    const sessionsChannel = supabase
      .channel('sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        (payload) => {
          console.log('Session change detected:', payload);
          fetchSessions(); // Refresh sessions data
        }
      )
      .subscribe();

    // Set up realtime subscription for attendances (for booking changes)
    const attendancesChannel = supabase
      .channel('attendances_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: 'scan_type=eq.booking'
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          fetchSessions(); // Refresh sessions to update booking counts
          if (profile?.id) {
            fetchUserBookings(); // Refresh user's bookings
          }
        }
      )
      .subscribe();

    // Set up realtime subscription for user_scores (for recent activities)
    const scoresChannel = supabase
      .channel('user_scores_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_scores',
          filter: `user_id=eq.${profile?.id}`
        },
        (payload) => {
          console.log('User score change detected:', payload);
          fetchUserScore(); // Refresh user score and ranking
          fetchRecentActivities(); // Refresh recent activities
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(attendancesChannel);
      supabase.removeChannel(scoresChannel);
    };
  }, [profile?.id]);

  // Add periodic refresh as backup for realtime (every 30 seconds)
  useEffect(() => {
    if (activeTab === 'sessions') {
      const interval = setInterval(() => {
        fetchSessions();
        if (profile?.id) {
          fetchUserBookings();
        }
      }, 30000); // Refresh every 30 seconds when on sessions tab

      return () => clearInterval(interval);
    }
  }, [activeTab, profile?.id]);

  // Fetch events when day changes
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEventsByDay(activeDay);
    }
  }, [activeTab, activeDay]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    try {
      // Score and ranking
      await fetchUserScore();

      // Recent activities
      await fetchRecentActivities();

      // Initial events for day 1
      await fetchEventsByDay(1);

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

  const fetchUserScore = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await getUserRankingAndScore(profile.id);
      if (error) {
        console.error('Error fetching user score:', error);
      } else if (data) {
        setUserScore(data);
      }
    } catch (error) {
      console.error('Error fetching user score:', error);
    }
  };

  const fetchRecentActivities = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await getRecentActivities(profile.id, 5);
      if (error) {
        console.error('Error fetching recent activities:', error);
      } else {
        setRecentActivities(data);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchEventsByDay = async (day: number) => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from("schedule_items")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching events:", error);
      } else if (data) {
        // Filter by day - assuming events are spread across 5 days
        // You might need to adjust this logic based on your actual date structure
        const filteredData = data.filter((item) => {
          const itemDay = getDayFromDate(item.start_time);
          return itemDay === day;
        });
        setSchedule(filteredData);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setEventsLoading(false);
    }
  };

  // Helper function to get day number from date (1-5)
  const getDayFromDate = (dateString: string): number => {
    const date = new Date(dateString);
    // Adjust this based on your event start date
    const eventStartDate = new Date('2024-03-18');
    const diffTime = date.getTime() - eventStartDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(5, diffDays + 1)); // Ensure day is between 1-5
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
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
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchUserBookings = async () => {
    if (!profile?.id) return;
    
    try {
      // First get the booking records
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("attendances")
        .select("session_id, scanned_at")
        .eq("user_id", profile.id)
        .eq("scan_type", "booking");

      if (bookingsError) {
        console.error("Error fetching user bookings:", bookingsError);
        return;
      }

      if (bookingsData) {
        // Then get the session details for each booking
        const bookingsWithSessions: SessionBooking[] = [];
        
        for (const booking of bookingsData) {
          const { data: sessionData, error: sessionError } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", booking.session_id)
            .single();

          if (!sessionError && sessionData) {
            bookingsWithSessions.push({
              ...booking,
              session: sessionData
            });
          }
        }

        setUserBookings(bookingsWithSessions);
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

  const handleEventClick = (event: ScheduleItem) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const isSessionBooked = (sessionId: string): boolean => {
    return userBookings.some(booking => booking.session_id === sessionId);
  };

  const isSessionFull = (session: Session): boolean => {
    return session.max_attendees && session.current_bookings >= session.max_attendees;
  };

  // New function to check if user has overlapping booking
  const hasOverlappingBooking = (session: Session): { hasOverlap: boolean; conflictingSession?: Session } => {
    const sessionStart = new Date(session.start_time);
    const sessionEnd = new Date(session.end_time);

    // Check all user's booked sessions for time overlap
    for (const booking of userBookings) {
      if (booking.session) {
        const bookedSessionStart = new Date(booking.session.start_time);
        const bookedSessionEnd = new Date(booking.session.end_time);

        // Check if sessions overlap in time
        if (
          (sessionStart >= bookedSessionStart && sessionStart < bookedSessionEnd) ||
          (sessionEnd > bookedSessionStart && sessionEnd <= bookedSessionEnd) ||
          (sessionStart <= bookedSessionStart && sessionEnd >= bookedSessionEnd)
        ) {
          return { hasOverlap: true, conflictingSession: booking.session };
        }
      }
    }

    return { hasOverlap: false };
  };

  const handleBookSession = async (sessionId: string) => {
    if (!profile?.id) return;
    
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      // Check for overlapping sessions before booking
      const sessionToBook = sessions.find(s => s.id === sessionId);
      if (sessionToBook) {
        const { hasOverlap, conflictingSession } = hasOverlappingBooking(sessionToBook);
        
        if (hasOverlap && conflictingSession) {
          setBookingError(`You already have a booking for "${conflictingSession.title}" at the same time. Please cancel that booking first.`);
          setBookingLoading(false);
          return;
        }
      }

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

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'attendance':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'session':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'bonus':
        return <Star className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
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
      <div className="fade-in-up-blur">
      {/* Tabs - Mobile optimized */}
      <div className="flex space-x-1 sm:space-x-4 border-b mb-6 overflow-x-auto scrollbar-hide fade-in-left">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-2 sm:px-4 font-semibold text-sm sm:text-base whitespace-nowrap transition-all duration-300 ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 grid-stagger-blur">
          {/* Score */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
            <p className="text-sm font-medium text-gray-600">Your Score</p>
            <p className="text-3xl font-bold text-orange-600">{userScore?.score || 0}</p>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mt-2">
              <Trophy className="h-6 w-6 text-orange-600" />
            </div>
          </div>

          {/* Rank */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
            <p className="text-sm font-medium text-gray-600">Your Rank</p>
            <p className="text-3xl font-bold text-blue-600">#{userScore?.rank || 0}</p>
            <p className="text-xs text-gray-500">of {userScore?.total_users || 0} attendees</p>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mt-2">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          {/* QR */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
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

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">Recent Activities</p>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            
            {recentActivities.length > 0 ? (
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getActivityIcon(activity.activity_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 truncate">
                          {activity.activity_description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.awarded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-green-600 ml-2">
                      +{activity.points}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No recent activities</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Days */}
      {activeTab === "events" && (
        <div className="tab-content-animate">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0">
              <Calendar className="h-5 w-5 mr-2 text-orange-600" /> 5-Day Stage Activities
            </h2>
            
            {/* Day Selector */}
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeDay === day 
                      ? "bg-orange-500 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : schedule.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-stagger-blur">
              {schedule.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleEventClick(item)}
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 cursor-pointer h-full flex flex-col card-hover-enhanced dashboard-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">{item.title}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">{item.description}</p>
                  
                  <div className="space-y-2 text-xs text-gray-500 mt-auto">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
                        {new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    {item.item_type ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.item_type}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Event
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No events scheduled for Day {activeDay}</p>
            </div>
          )}
        </div>
      )}

      {/* Sessions */}
      {activeTab === "sessions" && (
        <div className="tab-content-animate">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-orange-600" /> Available Sessions
            </h2>
            {sessionsLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                Updating...
              </div>
            )}
          </div>
          
          {sessions.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No sessions available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-stagger-blur">
              {sessions.map((session) => {
                const booked = isSessionBooked(session.id);
                const full = isSessionFull(session);
                const { hasOverlap } = hasOverlappingBooking(session);
                
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 cursor-pointer relative card-hover-enhanced dashboard-card"
                  >
                    {/* Real-time update indicator */}
                    {sessionsLoading && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                    
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
                        <span className={`transition-colors ${sessionsLoading ? 'text-orange-500' : ''}`}>
                          {session.current_bookings || 0}/{session.max_attendees || 'Unlimited'} booked
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      {booked ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Booked
                        </span>
                      ) : hasOverlap ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Time Conflict
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
          )}
        </div>
      )}

      {/* Maps */}
      {activeTab === "maps" && (
        <div className="tab-content-animate">
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
        <div className="tab-content-animate">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Building className="h-5 w-5 mr-2 text-orange-600" /> Participating Companies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-stagger-blur">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company)}
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 cursor-pointer card-hover-enhanced dashboard-card"
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

      {/* All Modals using React Portal with Animations */}

      {/* QR Code Modal */}
      {showQR && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
          onClick={() => {
            setShowQR(false);
            setQrCodeUrl('');
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center modal-content-blur fade-in-up-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 fade-in-blur">
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
            
            <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center fade-in-blur">
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
            
            <p className="text-sm text-gray-600 mb-4 fade-in-blur">Show this QR code for check-ins</p>
            {profile?.id && (
              <p className="text-xs text-gray-400 mt-1 font-mono break-all fade-in-blur">
                {profile.id}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
          onClick={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 stagger-children">
              <div className="flex items-center justify-between mb-6 fade-in-blur">
                <h2 className="text-xl font-bold text-gray-900">Event Details</h2>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setSelectedEvent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="fade-in-blur">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedEvent.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedEvent.description}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 fade-in-blur">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                    <p className="text-gray-900">
                      {new Date(selectedEvent.start_time).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
                      {new Date(selectedEvent.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="fade-in-blur">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedEvent.location}
                    </p>
                  </div>

                  {selectedEvent.item_type && (
                    <div className="fade-in-blur">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {selectedEvent.item_type}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 fade-in-blur">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Session Details Modal */}
      {showSessionModal && selectedSession && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
          onClick={() => {
            setShowSessionModal(false);
            setSelectedSession(null);
            setBookingError(null);
            setBookingSuccess(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 stagger-children">
              <div className="flex items-center justify-between mb-6 fade-in-blur">
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
                <div className="fade-in-blur">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSession.title}</h3>
                  <p className="text-gray-600 mt-2">{selectedSession.description}</p>
                </div>

                {selectedSession.speaker && (
                  <div className="fade-in-blur">
                    <label className="block text-sm font-medium text-gray-700">Speaker</label>
                    <p className="text-gray-900">{selectedSession.speaker}</p>
                  </div>
                )}

                <div className="fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="text-gray-900">
                    {new Date(selectedSession.start_time).toLocaleDateString()} at{' '}
                    {new Date(selectedSession.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-gray-900">{selectedSession.location}</p>
                </div>

                <div className="fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700">Capacity</label>
                  <p className="text-gray-900">
                    {selectedSession.current_bookings || 0} / {selectedSession.max_attendees || 'Unlimited'} booked
                  </p>
                </div>

                {/* Time Conflict Warning */}
                {!isSessionBooked(selectedSession.id) && hasOverlappingBooking(selectedSession).hasOverlap && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg fade-in-blur">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-800 font-medium text-sm">Time Conflict</p>
                        <p className="text-yellow-700 text-xs mt-1">
                          You already have a booking at this time. Please cancel your existing booking first.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Status */}
                <div className="pt-4 border-t border-gray-200 fade-in-blur">
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
                  ) : hasOverlappingBooking(selectedSession).hasOverlap ? (
                    <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-yellow-800 font-medium">You have a conflicting booking</span>
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
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg fade-in-blur">
                    <p className="text-red-700 text-sm">{bookingError}</p>
                  </div>
                )}
                {bookingSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg fade-in-blur">
                    <p className="text-green-700 text-sm">{bookingSuccess}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 space-y-3 fade-in-blur">
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
                      disabled={bookingLoading || isSessionFull(selectedSession) || hasOverlappingBooking(selectedSession).hasOverlap}
                      className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingLoading ? 'Booking...' : 
                       isSessionFull(selectedSession) ? 'Session Full' : 
                       hasOverlappingBooking(selectedSession).hasOverlap ? 'Time Conflict' : 
                       'Book Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Company Details Modal */}
      {showCompanyModal && selectedCompany && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
          onClick={() => {
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 stagger-children">
              <div className="flex items-center justify-between mb-6 fade-in-blur">
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
                <div className="text-center fade-in-blur">
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
                <div className="fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700 mb-2">About Company</label>
                  <p className="text-gray-700 leading-relaxed">{selectedCompany.description}</p>
                </div>

                {/* Website */}
                <div className="fade-in-blur">
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
                <div className="pt-4 space-y-3 fade-in-blur">
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
        </div>,
        document.body
      )}
      </div>
    </DashboardLayout>
  );
};

export default AttendeeDashboard;