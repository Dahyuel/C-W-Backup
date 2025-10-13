import React, { useState, useEffect } from "react";
import { Trophy, Star, QrCode, Calendar, MapPin, Clock, Building, Users, X, CheckCircle, XCircle, Activity, BookOpen, Menu } from "lucide-react";
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
  day?: number; // Add day field
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
  partner_type: string;
  academic_faculties_seeking_for: string[]; // Add this
  vacancies_type: string[]; // Add this
  created_at: string;
}

// Add partner type order
const PARTNER_TYPES = [
  "Strategic Partner",
  "Main Partners", 
  "Regular Partners",
  "Tech Partners",
  "Educational Partners",
  "Community Partners"
];

// Faculty constants for Building Sessions
const DAY1_FACULTIES = [
  "Faculty of Engineering",
  "Faculty of Computer and Information Sciences",
  "Faculty of Archaeology"
];

const DAY2_FACULTIES = [
  "Faculty of Business Administration"
];

const DAY3_FACULTIES = [
  "Faculty of Alsun",
  "Faculty of Archaeology", 
  "Faculty of Law",
  "Faculty of Education",
  "Faculty of Arts"
];

// Open Recruitment Days faculties (keep existing)
const DAY4_FACULTIES = [
  "Faculty of Engineering",
  "Faculty of Computer and Information Sciences"
];

const DAY5_FACULTIES = [
  "Faculty of Commerce",
  "Faculty of Business Administration",
  "Faculty of Arts",
  "Faculty of Law",
  "Faculty of Applied Arts",
  "Faculty of Fine Arts",
  "Faculty of Languages",
  "Faculty of Physical Education",
  "Faculty of Education"
];

const AttendeeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [day1Sessions, setDay1Sessions] = useState<Session[]>([]);
  const [day2Sessions, setDay2Sessions] = useState<Session[]>([]);
  const [day3Sessions, setDay3Sessions] = useState<Session[]>([]);
  const [day4Sessions, setDay4Sessions] = useState<Session[]>([]);
  const [day5Sessions, setDay5Sessions] = useState<Session[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userBookings, setUserBookings] = useState<SessionBooking[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [activeBuildingDay, setActiveBuildingDay] = useState<number>(1);
  const [activeRecruitmentDay, setActiveRecruitmentDay] = useState<number>(4);
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

  // Check if user can book based on faculty for Building Sessions
  const canBookDay1 = profile?.faculty && DAY1_FACULTIES.includes(profile.faculty);
  const canBookDay2 = profile?.faculty && DAY2_FACULTIES.includes(profile.faculty);
  const canBookDay3 = profile?.faculty && DAY3_FACULTIES.includes(profile.faculty);
  
  // Check if user can book based on faculty for Open Recruitment
  const canBookDay4 = profile?.faculty && DAY4_FACULTIES.includes(profile.faculty);
  const canBookDay5 = profile?.faculty && DAY5_FACULTIES.includes(profile.faculty);
  
  const [isTabChanging, setIsTabChanging] = useState(false);
  const [previousTab, setPreviousTab] = useState("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);
  
  // Add periodic refresh as backup for realtime (every 30 seconds)
  useEffect(() => {
    if (activeTab === 'building-sessions' || activeTab === 'open-recruitment') {
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
    if (activeTab === 'stage-activities') {
      fetchEventsByDay(activeDay);
    }
  }, [activeTab, activeDay]);

  // Handle tab change with animation
  const handleTabChange = (tabKey: string) => {
    if (tabKey === activeTab) return;
    
    setIsTabChanging(true);
    setPreviousTab(activeTab);
    
    // Small delay to allow fade-out animation
    setTimeout(() => {
      setActiveTab(tabKey);
      setIsTabChanging(false);
    }, 200);
  };

  // Toggle mobile menu with animation
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Animation classes
  const getTabContentAnimation = () => {
    if (isTabChanging) {
      return "opacity-0 scale-95 transform transition-all duration-200 ease-in-out";
    }
    return "opacity-100 scale-100 transform transition-all duration-300 ease-out";
  };

  const getMobileMenuAnimation = () => {
    if (isMobileMenuOpen) {
      return "max-h-96 opacity-100 transform transition-all duration-300 ease-out";
    }
    return "max-h-0 opacity-0 transform transition-all duration-200 ease-in";
  };

  const getMenuButtonAnimation = () => {
    return isMobileMenuOpen 
      ? "bg-orange-600 transform transition-all duration-300 ease-out" 
      : "bg-orange-500 transform transition-all duration-300 ease-out";
  };

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
      // Use RPC function for attendee score and rank
      const { data, error } = await supabase.rpc('get_attendee_score_and_rank', {
        user_uuid: profile.id
      });
  
      if (error) {
        console.error('RPC function error:', error);
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users_profiles')
          .select('score')
          .eq('id', profile.id)
          .single();
  
        if (fallbackError) {
          console.error('Fallback query error:', fallbackError);
          setUserScore({
            score: profile.score || 0,
            rank: 0,
            total_users: 0
          });
        } else {
          setUserScore({
            score: fallbackData?.score || 0,
            rank: 0,
            total_users: 0
          });
        }
      } else if (data && data.length > 0) {
        // RPC function returns a table, so we get the first row
        const result = data[0];
        console.log('✅ RPC result:', result);
        setUserScore({
          score: result.score || 0,
          rank: result.user_rank || 0,
          total_users: result.total_users || 0
        });
      } else {
        console.log('❌ No data returned from RPC');
        setUserScore({
          score: profile.score || 0,
          rank: 0,
          total_users: 0
        });
      }
    } catch (error) {
      console.error('Error fetching user score:', error);
      setUserScore({
        score: profile.score || 0,
        rank: 0,
        total_users: 0
      });
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
    const eventStartDate = new Date('2025-10-19'); // Day 1 starts on Oct 19
    const diffTime = date.getTime() - eventStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
        // Add day information to sessions
        const sessionsWithDays = data.map(session => ({
          ...session,
          day: getDayFromDate(session.start_time)
        }));

        setSessions(sessionsWithDays);
        
        // Separate days 1-3 and days 4-5
        const day1 = sessionsWithDays.filter(session => session.day === 1);
        const day2 = sessionsWithDays.filter(session => session.day === 2);
        const day3 = sessionsWithDays.filter(session => session.day === 3);
        const day4 = sessionsWithDays.filter(session => session.day === 4);
        const day5 = sessionsWithDays.filter(session => session.day === 5);
        
        setDay1Sessions(day1);
        setDay2Sessions(day2);
        setDay3Sessions(day3);
        setDay4Sessions(day4);
        setDay5Sessions(day5);
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
              session_id: booking.session_id,
              booked_at: booking.scanned_at,
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
        .order("partner_type", { ascending: true })
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
    return !!session.max_attendees && session.current_bookings >= session.max_attendees;
  };

  // UPDATED: Check if user has overlapping booking based on start time only
  const hasOverlappingBooking = (session: Session): { hasOverlap: boolean; conflictingSession?: Session } => {
    const sessionStart = new Date(session.start_time);
    
    // Check all user's booked sessions for same start time
    for (const booking of userBookings) {
      if (booking.session) {
        const bookedSessionStart = new Date(booking.session.start_time);

        // Check if sessions have the same start time
        if (sessionStart.getTime() === bookedSessionStart.getTime()) {
          return { hasOverlap: true, conflictingSession: booking.session };
        }
      }
    }

    return { hasOverlap: false };
  };

  // Check if user can book session based on faculty restrictions for Building Sessions
  const canBookBuildingSession = (session: Session): { canBook: boolean; reason?: string } => {
    const sessionDay = session.day || getDayFromDate(session.start_time);
    
    if (sessionDay === 1 && !canBookDay1) {
      return { 
        canBook: false, 
        reason: "This session is only available for Faculty of Engineering, Faculty of Computer and Information Sciences, and Faculty of Archaeology students" 
      };
    }
    
    if (sessionDay === 2 && !canBookDay2) {
      return { 
        canBook: false, 
        reason: "This session is only available for Faculty of Business Administration students" 
      };
    }
    
    if (sessionDay === 3 && !canBookDay3) {
      return { 
        canBook: false, 
        reason: "This session is only available for Faculty of Alsun, Faculty of Archaeology, Faculty of Law, Faculty of Education, and Faculty of Arts students" 
      };
    }
    
    return { canBook: true };
  };

  // Check if user can book session based on faculty restrictions for Open Recruitment
  const canBookRecruitmentSession = (session: Session): { canBook: boolean; reason?: string } => {
    const sessionDay = session.day || getDayFromDate(session.start_time);
    
    if (sessionDay === 4 && !canBookDay4) {
      return { 
        canBook: false, 
        reason: "This session is only available for Faculty of Engineering and Faculty of Computer and Information Sciences students" 
      };
    }
    
    if (sessionDay === 5 && !canBookDay5) {
      return { 
        canBook: false, 
        reason: "This session is only available for Commerce, Business, Arts, Law, Applied Arts, Fine Arts, Languages, Physical Education, and Education students" 
      };
    }
    
    return { canBook: true };
  };

  const handleBookSession = async (sessionId: string) => {
    if (!profile?.id) return;
    
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    try {
      // Find the session
      const sessionToBook = day1Sessions.find(s => s.id === sessionId) || 
                           day2Sessions.find(s => s.id === sessionId) || 
                           day3Sessions.find(s => s.id === sessionId) ||
                           day4Sessions.find(s => s.id === sessionId) || 
                           day5Sessions.find(s => s.id === sessionId);
      
      if (sessionToBook) {
        // Check faculty restrictions based on session type
        let canBookResult;
        if (sessionToBook.day && sessionToBook.day <= 3) {
          canBookResult = canBookBuildingSession(sessionToBook);
        } else {
          canBookResult = canBookRecruitmentSession(sessionToBook);
        }
        
        if (!canBookResult.canBook) {
          setBookingError(canBookResult.reason || "You are not eligible to book this session");
          setBookingLoading(false);
          return;
        }

        // Check for overlapping sessions before booking
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

// Update tabItems to include "Career Portal"
const tabItems = [
  { key: "overview", label: "Overview" },
  { key: "stage-activities", label: "Stage Activities" },
  { key: "building-sessions", label: "Building Sessions" },
  { key: "open-recruitment", label: "Open Recruitment Days" },
  { key: "maps", label: "Maps" },
  { key: "companies", label: "Companies" },
  { key: "career-portal", label: "Career Portal" } // Add this line
];
  // Render session cards with faculty restrictions
  const renderSessionCards = (sessionsToRender: Session[], sessionType: 'building' | 'recruitment' = 'building') => {
    return sessionsToRender.map((session, index) => {
      const booked = isSessionBooked(session.id);
      const full = isSessionFull(session);
      const { hasOverlap } = hasOverlappingBooking(session);
      
      // Use appropriate validation function based on session type
      let canBookResult;
      if (sessionType === 'building') {
        canBookResult = canBookBuildingSession(session);
      } else {
        canBookResult = canBookRecruitmentSession(session);
      }
      
      return (
        <div
          key={session.id}
          onClick={() => handleSessionClick(session)}
          className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 cursor-pointer relative card-hover-enhanced dashboard-card transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            animationDelay: `${index * 100}ms`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          {/* Real-time update indicator */}
          {sessionsLoading && (
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            </div>
          )}
          
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 flex-1 pr-2">{session.title}</h3>
            {booked && (
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 animate-bounce" />
            )}
          </div>
          
          <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 transition-colors duration-300">{session.description}</p>
          
          {session.speaker && (
            <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2 line-clamp-1 animate-pulse">Speaker: {session.speaker}</p>
          )}
          
          <div className="space-y-1.5 sm:space-y-2 text-xs text-gray-500">
            <div className="flex items-center transform transition-transform duration-300 hover:translate-x-1">
              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate text-xs">
                {new Date(session.start_time).toLocaleDateString()} {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center transform transition-transform duration-300 hover:translate-x-1">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate text-xs">{session.location}</span>
            </div>
            <div className="flex items-center transform transition-transform duration-300 hover:translate-x-1">
              <Users className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className={`transition-colors text-xs ${sessionsLoading ? 'text-orange-500 animate-pulse' : ''}`}>
                {session.current_bookings || 0}/{session.max_attendees || 'Unlimited'} booked
              </span>
            </div>
          </div>
          
          <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100 transform transition-all duration-300">
            {!canBookResult.canBook ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 transform transition-all duration-300 hover:scale-105">
                <XCircle className="h-3 w-3 mr-1" />
                Not Eligible
              </span>
            ) : booked ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 transform transition-all duration-300 hover:scale-105">
                <CheckCircle className="h-3 w-3 mr-1 animate-pulse" />
                Booked
              </span>
            ) : hasOverlap ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 transform transition-all duration-300 hover:scale-105">
                <Clock className="h-3 w-3 mr-1" />
                Time Conflict
              </span>
            ) : full ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 transform transition-all duration-300 hover:scale-105">
                <XCircle className="h-3 w-3 mr-1" />
                Full
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 transform transition-all duration-300 hover:scale-105">
                Available
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <DashboardLayout title="Attendee Dashboard" subtitle={`Welcome back, ${profile?.first_name}!`}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .stagger-animation > * {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
      
      <div className="fade-in-up-blur">
        {/* Mobile Menu Button with Animation */}
        <div className="lg:hidden flex justify-between items-center mb-4 transform transition-all duration-300">
          <button
            onClick={toggleMobileMenu}
            className={`p-2 rounded-lg text-white ${getMenuButtonAnimation()} transform transition-all duration-300 hover:scale-110`}
          >
            <Menu className="h-5 w-5 transform transition-transform duration-300" />
          </button>
          <span className="text-sm font-medium text-gray-600 capitalize animate-pulse">
            {activeTab.replace('-', ' ')}
          </span>
        </div>

        {/* Tabs - Responsive with Animations */}
        <div 
          className={`${getMobileMenuAnimation()} lg:flex lg:max-h-none lg:opacity-100 space-x-1 sm:space-x-4 border-b mb-6 overflow-x-auto scrollbar-hide fade-in-left flex-col lg:flex-row overflow-hidden`}
        >
          {tabItems.map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`py-3 px-4 lg:py-2 lg:px-4 font-semibold text-sm lg:text-base whitespace-nowrap transition-all duration-300 text-left lg:text-center border-b lg:border-b-2 border-transparent transform hover:scale-105 ${
                activeTab === tab.key
                  ? "bg-orange-50 lg:bg-transparent border-orange-500 text-orange-600 lg:border-orange-500 scale-105 shadow-lg"
                  : "text-gray-500 hover:text-orange-600 hover:bg-gray-50 lg:hover:bg-transparent"
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'slideDown 0.5s ease-out forwards'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content with Smooth Transitions */}
        <div className={getTabContentAnimation()}>
          {/* Overview - Responsive */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 grid-stagger-blur stagger-animation">
              {/* Score */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 card-hover-enhanced dashboard-card transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
                style={{ animationDelay: '0ms' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Your Score</p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600 animate-pulse">
                      {userScore?.score || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center transform transition-all duration-500 hover:rotate-12">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Rank */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 card-hover-enhanced dashboard-card transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
                style={{ animationDelay: '100ms' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Your Rank</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 animate-bounce">#{userScore?.rank || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">of {userScore?.total_users || 0} attendees</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center transform transition-all duration-500 hover:rotate-12">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* QR */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 card-hover-enhanced dashboard-card transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
                style={{ animationDelay: '200ms' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Your QR Code</p>
                    <button
                      onClick={handleShowQR}
                      className="mt-2 bg-orange-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      Show QR
                    </button>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center transform transition-all duration-500 hover:rotate-12">
                    <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 card-hover-enhanced dashboard-card transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
                style={{ animationDelay: '300ms' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">Recent Activities</p>
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 animate-pulse" />
                </div>
                
                {recentActivities.length > 0 ? (
                  <div className="space-y-3 max-h-32 sm:max-h-40 overflow-y-auto transform transition-all duration-500">
                    {recentActivities.map((activity, index) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center justify-between transform transition-all duration-300 hover:scale-105 hover:bg-gray-50 p-2 rounded-lg"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
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
                        <span className="text-xs font-semibold text-green-600 ml-2 transform transition-all duration-300 hover:scale-125">
                          +{activity.points}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 transform transition-all duration-500">
                    <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-gray-500">No recent activities</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage Activities - Responsive */}
          {activeTab === "stage-activities" && (
            <div className="tab-content-animate stagger-animation">
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between mb-6 transform transition-all duration-500">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center animate-pulse">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600 transform transition-all duration-500 hover:rotate-180" /> 
                  <span className="text-sm sm:text-lg">5-Day Stage Activities</span>
                </h2>
                
                {/* Day Selector - Responsive */}
                <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 sm:pb-0 transform transition-all duration-500">
                  {[1, 2, 3, 4, 5].map((day, index) => (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 flex-shrink-0 transform hover:scale-105 min-w-10 ${
                        activeDay === day 
                          ? "bg-orange-500 text-white shadow-lg scale-110" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {eventsLoading ? (
                <div className="flex items-center justify-center h-32 transform transition-all duration-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : schedule.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur stagger-animation">
                  {schedule.map((item, index) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleEventClick(item)}
                      className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 cursor-pointer h-full flex flex-col card-hover-enhanced dashboard-card transform transition-all duration-500 hover:scale-105 hover:shadow-xl"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 flex-1 transform transition-all duration-300 hover:text-orange-600">{item.title}</h3>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-3 flex-1 transform transition-all duration-300">{item.description}</p>
                      
                      <div className="space-y-1.5 sm:space-y-2 text-xs text-gray-500 mt-auto">
                        <div className="flex items-center transform transition-all duration-300 hover:translate-x-2">
                          <Clock className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span className="truncate text-xs">
                            {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
                            {new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center transform transition-all duration-300 hover:translate-x-2">
                          <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span className="truncate text-xs">{item.location}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100 transform transition-all duration-500">
                        {item.item_type ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 transform transition-all duration-300 hover:scale-105">
                            {item.item_type}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 transform transition-all duration-300 hover:scale-105">
                            Event
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200 transform transition-all duration-500">
                  <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4 animate-pulse" />
                  <p className="text-gray-500 text-sm sm:text-base">No events scheduled for Day {activeDay}</p>
                </div>
              )}
            </div>
          )}

          {/* Career Portal - Responsive */}
{activeTab === "career-portal" && (
  <div className="tab-content-animate">
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 sm:p-8 text-center max-w-2xl mx-auto fade-in-up-blur">
      {/* Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
        <Building className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
      </div>
      
      {/* Title */}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
        Career Portal
      </h2>
      
      {/* Description */}
      <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
        Looking for job opportunities and career growth? Explore our exclusive career portal 
        to discover vacancies, internships, and job offers from top companies. 
        Click below to access the portal and take the next step in your career journey.
      </p>
      
      {/* Action Button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => window.open("https://asustudent.qualiphi.ai/", "_blank")}
          className="bg-orange-500 text-white px-8 py-3 sm:px-10 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Go To Portal
        </button>
        
        <button
          onClick={() => setActiveTab("companies")}
          className="border border-orange-500 text-orange-500 px-8 py-3 sm:px-10 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-orange-50 transition-all duration-300 transform hover:scale-105"
        >
          View Companies First
        </button>
      </div>
      
      {/* Additional Info */}
      <div className="mt-6 sm:mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-700 text-sm sm:text-base">
          💡 <strong>Tip:</strong> Check out the Companies tab first to learn about participating employers, 
          then visit the portal to apply for positions that match your skills and interests.
        </p>
      </div>
    </div>
  </div>
)}

          {/* Building Sessions - Responsive */}
          {activeTab === "building-sessions" && (
            <div className="tab-content-animate">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center mb-2 sm:mb-0">
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" /> 
                  <span className="text-sm sm:text-lg">Building Sessions (Days 1-3)</span>
                </h2>
                {sessionsLoading && (
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-orange-500 mr-2"></div>
                    Updating...
                  </div>
                )}
              </div>
              
              {/* Day Selector for Building Sessions */}
              <div className="flex space-x-1 sm:space-x-2 mb-6 overflow-x-auto pb-2">
                {[1, 2, 3].map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveBuildingDay(day)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                      activeBuildingDay === day 
                        ? "bg-orange-500 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>

              {/* Faculty Eligibility Notice - Responsive */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-blue-800 font-medium text-sm sm:text-base mb-1">Faculty-Based Eligibility</h3>
                    <p className="text-blue-700 text-xs sm:text-sm">
                      {activeBuildingDay === 1 ? (
                        <>Day 1 sessions are only available for <strong>Faculty of Engineering, Faculty of Computer and Information Sciences, and Faculty of Archaeology</strong> students.</>
                      ) : activeBuildingDay === 2 ? (
                        <>Day 2 sessions are only available for <strong>Faculty of Business Administration</strong> students.</>
                      ) : (
                        <>Day 3 sessions are only available for <strong>Faculty of Alsun, Faculty of Archaeology, Faculty of Law, Faculty of Education, and Faculty of Arts</strong> students.</>
                      )}
                    </p>
                    {profile?.faculty && (
                      <p className="text-blue-600 text-xs sm:text-sm mt-1">
                        Your faculty: <strong>{profile.faculty}</strong> - {
                          (activeBuildingDay === 1 && canBookDay1) || 
                          (activeBuildingDay === 2 && canBookDay2) || 
                          (activeBuildingDay === 3 && canBookDay3) 
                            ? "You are eligible to book sessions" 
                            : "You are not eligible to book sessions for this day"
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : activeBuildingDay === 1 && day1Sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur">
                  {renderSessionCards(day1Sessions, 'building')}
                </div>
              ) : activeBuildingDay === 2 && day2Sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur">
                  {renderSessionCards(day2Sessions, 'building')}
                </div>
              ) : activeBuildingDay === 3 && day3Sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur">
                  {renderSessionCards(day3Sessions, 'building')}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200">
                  <Building className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 text-sm sm:text-base">No sessions available for Day {activeBuildingDay}</p>
                </div>
              )}
            </div>
          )}

          {/* Open Recruitment Days - Responsive */}
          {activeTab === "open-recruitment" && (
            <div className="tab-content-animate">
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" /> 
                  <span className="text-sm sm:text-lg">Open Recruitment Days</span>
                </h2>
                
                {/* Day Selector - Responsive */}
                <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 sm:pb-0">
                  {[4, 5].map((day) => (
                    <button
                      key={day}
                      onClick={() => setActiveRecruitmentDay(day)}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                        activeRecruitmentDay === day 
                          ? "bg-orange-500 text-white" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Day {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faculty Eligibility Notice - Responsive */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-blue-800 font-medium text-sm sm:text-base mb-1">Faculty-Based Eligibility</h3>
                    <p className="text-blue-700 text-xs sm:text-sm">
                      {activeRecruitmentDay === 4 ? (
                        <>Day 4 sessions are only available for <strong>Faculty of Engineering</strong> and <strong>Faculty of Computer and Information Sciences</strong> students.</>
                      ) : (
                        <>Day 5 sessions are only available for <strong>Commerce, Business, Arts, Law, Applied Arts, Fine Arts, Languages, Physical Education, and Education</strong> students.</>
                      )}
                    </p>
                    {profile?.faculty && (
                      <p className="text-blue-600 text-xs sm:text-sm mt-1">
                        Your faculty: <strong>{profile.faculty}</strong> - {
                          (activeRecruitmentDay === 4 && canBookDay4) || (activeRecruitmentDay === 5 && canBookDay5) 
                            ? "You are eligible to book sessions" 
                            : "You are not eligible to book sessions for this day"
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : activeRecruitmentDay === 4 && day4Sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur">
                  {renderSessionCards(day4Sessions, 'recruitment')}
                </div>
              ) : activeRecruitmentDay === 5 && day5Sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur">
                  {renderSessionCards(day5Sessions, 'recruitment')}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200">
                  <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 text-sm sm:text-base">No sessions available for Day {activeRecruitmentDay}</p>
                </div>
              )}
            </div>
          )}

          {/* Maps - Responsive */}
          {activeTab === "maps" && (
            <div className="tab-content-animate">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Event Maps</h2>
              <div className="flex space-x-1 sm:space-x-2 mb-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm flex-shrink-0 ${
                      activeDay === day ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 flex justify-center">
                <img
                  src={mapImages[activeDay - 1]}
                  alt={`Day ${activeDay} Map`}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            </div>
          )}
{/* Companies - Responsive */}
{activeTab === "companies" && (
  <div className="tab-content-animate">
    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
      <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" /> 
      <span className="text-sm sm:text-lg">Participating Companies</span>
    </h2>
    
    <div className="space-y-8">
      {PARTNER_TYPES.map((partnerType) => {
        const partnerCompanies = companies.filter(company => 
          company.partner_type === partnerType
        );
        
        if (partnerCompanies.length === 0) return null;
        
        return (
          <div key={partnerType} className="fade-in-up-blur">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              {partnerType}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 grid-stagger-blur">
              {partnerCompanies.map((company, index) => (
                <div
                  key={company.id}
                  onClick={() => handleCompanyClick(company)}
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 sm:p-6 cursor-pointer card-hover-enhanced dashboard-card transform transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-center">
                    <img 
                      src={company.logo_url} 
                      alt={`${company.name} logo`} 
                      className="h-12 sm:h-16 w-auto mx-auto mb-3 sm:mb-4 object-contain" 
                    />
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">{company.name}</h3>
                    
                    {/* Faculty Information - Show ALL faculties */}
                    {company.academic_faculties_seeking_for && company.academic_faculties_seeking_for.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Seeking Faculties:</p>
                        <div className="flex flex-col gap-1.5">
                          {company.academic_faculties_seeking_for.map((faculty, idx) => (
                            <div 
                              key={idx}
                              className="w-full bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5"
                            >
                              <span className="text-xs text-blue-800 font-medium line-clamp-1">
                                {faculty.replace('Faculty of ', '')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Vacancies Type */}
                    {company.vacancies_type && company.vacancies_type.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Vacancies:</p>
                        <div className="flex flex-wrap justify-center gap-1">
                          {company.vacancies_type.map((vacancy, idx) => (
                            <span 
                              key={idx}
                              className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200"
                            >
                              {vacancy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {company.booth_number && (
                      <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                        <MapPin className="h-3 w-3 mr-1" />
                        Booth {company.booth_number}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      {/* Fallback if no companies found */}
      {companies.length === 0 && (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200">
          <Building className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">No companies available</p>
        </div>
      )}
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

                  {/* Faculty Eligibility Warning */}
                  {(() => {
                    let canBookResult;
                    if (selectedSession.day && selectedSession.day <= 3) {
                      canBookResult = canBookBuildingSession(selectedSession);
                    } else {
                      canBookResult = canBookRecruitmentSession(selectedSession);
                    }
                    
                    if (!canBookResult.canBook) {
                      return (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg fade-in-blur">
                          <div className="flex items-start">
                            <BookOpen className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-gray-800 font-medium text-sm">Not Eligible</p>
                              <p className="text-gray-700 text-xs mt-1">{canBookResult.reason}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
                    ) : (() => {
                      let canBookResult;
                      if (selectedSession.day && selectedSession.day <= 3) {
                        canBookResult = canBookBuildingSession(selectedSession);
                      } else {
                        canBookResult = canBookRecruitmentSession(selectedSession);
                      }
                      return !canBookResult.canBook ? (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <BookOpen className="h-5 w-5 text-gray-500 mr-2" />
                          <span className="text-gray-800 font-medium">Not eligible for this session</span>
                        </div>
                      ) : (
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <Users className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="text-blue-800 font-medium">Available for booking</span>
                        </div>
                      );
                    })()}
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
                        disabled={bookingLoading || isSessionFull(selectedSession) || hasOverlappingBooking(selectedSession).hasOverlap || (() => {
                          let canBookResult;
                          if (selectedSession.day && selectedSession.day <= 3) {
                            canBookResult = canBookBuildingSession(selectedSession);
                          } else {
                            canBookResult = canBookRecruitmentSession(selectedSession);
                          }
                          return !canBookResult.canBook;
                        })()}
                        className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingLoading ? 'Booking...' : 
                         isSessionFull(selectedSession) ? 'Session Full' : 
                         hasOverlappingBooking(selectedSession).hasOverlap ? 'Time Conflict' : 
                         (() => {
                           let canBookResult;
                           if (selectedSession.day && selectedSession.day <= 3) {
                             canBookResult = canBookBuildingSession(selectedSession);
                           } else {
                             canBookResult = canBookRecruitmentSession(selectedSession);
                           }
                           return !canBookResult.canBook ? 'Not Eligible' : 'Book Now';
                         })()}
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
            
            {/* Partner Type Badge */}
            {selectedCompany.partner_type && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mt-2">
                {selectedCompany.partner_type}
              </div>
            )}
            
            {selectedCompany.booth_number && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 mt-2 ml-2">
                <MapPin className="h-4 w-4 mr-1" />
                Booth {selectedCompany.booth_number}
              </div>
            )}
          </div>

          {/* Faculty Information */}
          {selectedCompany.academic_faculties_seeking_for && selectedCompany.academic_faculties_seeking_for.length > 0 && (
            <div className="fade-in-blur">
              <label className="block text-sm font-medium text-gray-700 mb-2">Faculties Seeking</label>
              <div className="flex flex-wrap gap-2">
                {selectedCompany.academic_faculties_seeking_for.map((faculty, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {faculty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vacancies Type */}
          {selectedCompany.vacancies_type && selectedCompany.vacancies_type.length > 0 && (
            <div className="fade-in-blur">
              <label className="block text-sm font-medium text-gray-700 mb-2">Vacancies Type</label>
              <div className="flex flex-wrap gap-2">
                {selectedCompany.vacancies_type.map((vacancy, idx) => (
                  <span 
                    key={idx}
                    className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                  >
                    {vacancy}
                  </span>
                ))}
              </div>
            </div>
          )}

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
              </div>
    </DashboardLayout>
  );
};

export default AttendeeDashboard;