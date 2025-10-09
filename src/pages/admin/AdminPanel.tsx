import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import {
  Users,
  Activity,
  Building,
  Calendar,
  Megaphone,
  Sparkles,
  Plus,
  Clock,
  MapPin,
  X,
  Upload,
  Link,
  Eye,
  Trash2,
  TrendingUp,
  BarChart3,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { supabase, getDynamicBuildingStats, deleteCompany } from "../../lib/supabase";

// Types
interface StatsSummary {
  total_users: number;
  total_sessions: number;
  total_attendees: number;
  total_volunteers: number;
}

interface CompanyItem {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  website?: string;
  booth_number?: string;
  partner_type?: string;
  created_at?: string;
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

interface SessionItem {
  id: string;
  title: string;
  description?: string;
  speaker?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  capacity?: number;
  current_bookings?: number;
  session_type?: string;
  max_attendees?: number;
}

interface EventItem {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  item_type?: string;
}

interface UserProfileItem {
  id: string;
  first_name: string;
  last_name: string;
  personal_id: string;
  role: string;
  email: string;
  volunteer_id?: string;
  event_entry?: boolean;
  building_entry?: boolean;
  faculty?: string;
  university?: string;
  gender?: string;
  created_at?: string;
  degree_level?: 'student' | 'graduate' | string;
  how_did_hear_about_event?: string;
  class?: string;
}

type DayKey = `day${1|2|3|4|5}`;

interface DayStats {
  entries: number;
  exits: number;
  building_entries: number;
  building_exits: number;
  session_entries: number;
  registrations: number;
}

interface StatsData {
  totalRegistrations: number;
  graduates: number;
  students: number;
  currentInEvent: number;
  currentInBuilding: number;
  universities: Array<{ name: string; count: number }>;
  faculties: Array<{ name: string; count: number }>;
  genderStats: { male: number; female: number };
  roleStats: Record<string, number>;
  marketingSources: Array<{ name: string; count: number }>;
  degreeLevelStats: { student: number; graduate: number };
  classYearStats: Record<string, number>;
  currentGenderStats: { male: number; female: number };
  eventStats: Record<DayKey, DayStats>;
}

export function AdminPanel() {
  const [deleteCompanyModal, setDeleteCompanyModal] = useState(false);
  const [selectedCompanyDelete, setSelectedCompanyDelete] = useState<CompanyItem | null>(null);
  const [stats, setStats] = useState<StatsSummary>({ total_users: 0, total_sessions: 0, total_attendees: 0, total_volunteers: 0 });
  const [buildingStats, setBuildingStats] = useState({
    inside_building: 0,
    inside_event: 0,
    total_attendees: 0
  });
  const [deleteSessionModal, setDeleteSessionModal] = useState(false);
  const [deleteEventModal, setDeleteEventModal] = useState(false);
  const [selectedSessionDelete, setSelectedSessionDelete] = useState<SessionItem | null>(null);
  const [selectedEventDelete, setSelectedEventDelete] = useState<EventItem | null>(null);
  const [editSessionModal, setEditSessionModal] = useState(false);
  const [editEventModal, setEditEventModal] = useState(false);
  const [selectedSessionEdit, setSelectedSessionEdit] = useState<SessionItem | null>(null);
  const [selectedEventEdit, setSelectedEventEdit] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [mapImages, setMapImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [companyModal, setCompanyModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [sessionDetailModal, setSessionDetailModal] = useState(false);
  const [companyDetailModal, setCompanyDetailModal] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<SessionItem | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<CompanyItem | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementRole, setAnnouncementRole] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfileItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editCompanyModal, setEditCompanyModal] = useState(false);
  const [selectedCompanyEdit, setSelectedCompanyEdit] = useState<CompanyItem | null>(null);
  const [eventDetailModal, setEventDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventItem | null>(null);
  
  const announcementRoleOptions = [
    { value: "", label: "Select Target" },
    { value: "all", label: "All Users" },
    { value: "volunteer", label: "Volunteers (All except Admin/Team Leader/Attendee)" },
    { value: "team_leader", label: "Team Leaders" },
    { value: "admin", label: "Admins" },
    { value: "attendee", label: "Attendees" },
    { value: "registration", label: "Registration Team" },
    { value: "building", label: "Building Team" },
    { value: "info_desk", label: "Info Desk" },
    { value: "ushers", label: "Ushers" },
    { value: "marketing", label: "Marketing" },
    { value: "media", label: "Media" },
    { value: "ER", label: "ER Team" },
    { value: "BD", label: "Business Development" },
    { value: "catering", label: "Catering" },
    { value: "feedback", label: "Feedback Team" },
    { value: "stage", label: "Stage Team" },
    { value: "custom", label: "Custom Selection" }
  ];
  
  const [editCompany, setEditCompany] = useState<{ 
    id: string; 
    name: string; 
    logo: File | null; 
    logoUrl: string; 
    logoType: 'link' | 'upload'; 
    description: string; 
    website: string; 
    boothNumber: string;
    partnerType: string;
  }>({
    id: "",
    name: "",
    logo: null,
    logoUrl: "",
    logoType: "link",
    description: "",
    website: "",
    boothNumber: "",
    partnerType: "",
  });

  const [editSession, setEditSession] = useState<{ id: string; title: string; date: string; speaker: string; capacity: string | number; type: 'session' | string; hour: string; location: string; description: string;}>({
    id: "",
    title: "",
    date: "",
    speaker: "",
    capacity: "",
    type: "session",
    hour: "",
    location: "",
    description: "",
  });

  const [editEvent, setEditEvent] = useState<{ id: string; title: string; description: string; startDate: string; endDate: string; startTime: string; endTime: string; location: string; type: 'general' | string;}>({
    id: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "general",
  });
  const [newCompany, setNewCompany] = useState<{ 
    name: string; 
    logo: File | null; 
    logoUrl: string; 
    logoType: 'link' | 'upload'; 
    description: string; 
    website: string; 
    boothNumber: string;
    partnerType: string;
  }>({
    name: "",
    logo: null,
    logoUrl: "",
    logoType: "link",
    description: "",
    website: "",
    boothNumber: "",
    partnerType: "",
  });

  const [newSession, setNewSession] = useState<{ title: string; date: string; speaker: string; capacity: string | number; type: 'session' | string; hour: string; location: string; description: string;}>({
    title: "",
    date: "",
    speaker: "",
    capacity: "",
    type: "session",
    hour: "",
    location: "",
    description: "",
  });

  const [newEvent, setNewEvent] = useState<{ title: string; description: string; startDate: string; endDate: string; startTime: string; endTime: string; location: string; type: 'general' | string;}>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "general",
  });

  const [mapForm, setMapForm] = useState<{ day: number; image: File | null;}>({
    day: 1,
    image: null
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Enhanced statistics state
  const [enhancedStats, setEnhancedStats] = useState<{
    eventGenderRatio: { male: number; female: number };
    eventFaculties: Array<{ name: string; count: number }>;
    eventUniversities: Array<{ name: string; count: number }>;
    eventDegreeLevel: { student: number; graduate: number };
    eventStudentGraduateRatio: { student: number; graduate: number };
  }>({
    eventGenderRatio: { male: 0, female: 0 },
    eventFaculties: [],
    eventUniversities: [],
    eventDegreeLevel: { student: 0, graduate: 0 },
    eventStudentGraduateRatio: { student: 0, graduate: 0 }
  });

  // Add team leader selection state
  const [teamLeaderOfRole, setTeamLeaderOfRole] = useState("");

  // Add feedback state for notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Helper function to get date for a specific day
  const getDateForDay = (day: number): string => {
    const eventStartDate = new Date('2025-10-19');
    const targetDate = new Date(eventStartDate);
    targetDate.setDate(eventStartDate.getDate() + (day - 1));
    return targetDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Helper function to get day from date (Day 1 = Oct 19, 2025)
  const getDayFromDate = (dateString: string): number => {
    const date = new Date(dateString);
    const eventStartDate = new Date('2025-10-19');
    const diffTime = date.getTime() - eventStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(5, diffDays + 1));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === "events") {
      fetchEventsByDay(activeDay);
    }
  }, [activeTab, activeDay]);

  useEffect(() => {
    if (activeTab === "statistics") {
      fetchEnhancedStatistics();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const { count: totalUsers } = await supabase
        .from("users_profiles")
        .select("*", { count: "exact", head: true });
      
      const { count: totalSessions } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true });

      const { count: totalAttendees } = await supabase
        .from("users_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "attendee");

      const { count: totalVolunteers } = await supabase
        .from("users_profiles")
        .select("*", { count: "exact", head: true })
        .not("role", "in", "('admin','attendee')");

      setStats({
        total_users: totalUsers || 0,
        total_sessions: totalSessions || 0,
        total_attendees: totalAttendees || 0,
        total_volunteers: totalVolunteers || 0,
      });

      await fetchBuildingStats();
      await fetchSessions();
      await fetchCompanies();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchEnhancedStatistics = async () => {
    try {
      const { data: eventUsers, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('event_entry', true)
        .eq('role', 'attendee');

      if (error) throw error;

      if (eventUsers && eventUsers.length > 0) {
        const genderStats: { male: number; female: number } = { male: 0, female: 0 };
        const facultiesCount: Record<string, number> = {};
        const universitiesCount: Record<string, number> = {};
        const degreeLevelStats: { student: number; graduate: number } = { student: 0, graduate: 0 };
        const studentGraduateStats: { student: number; graduate: number } = { student: 0, graduate: 0 };

        (eventUsers as UserProfileItem[]).forEach((user) => {
          if (user.gender === 'male') genderStats.male++;
          else if (user.gender === 'female') genderStats.female++;

          if (user.faculty) {
            facultiesCount[user.faculty] = (facultiesCount[user.faculty] || 0) + 1;
          }

          if (user.university) {
            universitiesCount[user.university] = (universitiesCount[user.university] || 0) + 1;
          }

          if (user.degree_level === 'student') {
            degreeLevelStats.student++;
            studentGraduateStats.student++;
          } else if (user.degree_level === 'graduate') {
            degreeLevelStats.graduate++;
            studentGraduateStats.graduate++;
          }
        });

        const topFaculties = (Object.entries(facultiesCount) as Array<[string, number]>)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const topUniversities = (Object.entries(universitiesCount) as Array<[string, number]>)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setEnhancedStats({
          eventGenderRatio: genderStats,
          eventFaculties: topFaculties,
          eventUniversities: topUniversities,
          eventDegreeLevel: degreeLevelStats,
          eventStudentGraduateRatio: studentGraduateStats
        });
      }
    } catch (error) {
      console.error("Error fetching enhanced statistics:", error);
    }
  };

  const handleEditSession = (session: SessionItem) => {
    setSelectedSessionEdit(session);
    const startTime = new Date(session.start_time);
    setEditSession({
      id: session.id,
      title: session.title || "",
      description: session.description || "",
      speaker: session.speaker || "",
      capacity: (session.current_bookings ?? "") as any,
      type: session.session_type || "session",
      date: startTime.toISOString().split('T')[0],
      hour: startTime.toTimeString().slice(0, 5),
      location: session.location || "",
    });
    setEditSessionModal(true);
  };

  const handleEditEvent = (event: EventItem) => {
    setSelectedEventEdit(event);
    const startTime = new Date(event.start_time);
    const endTime = event.end_time ? new Date(event.end_time) : null;
    
    setEditEvent({
      id: event.id,
      title: event.title || "",
      description: event.description || "",
      startDate: startTime.toISOString().split('T')[0],
      startTime: startTime.toTimeString().slice(0, 5),
      endDate: endTime ? endTime.toISOString().split('T')[0] : "",
      endTime: endTime ? endTime.toTimeString().slice(0, 5) : "",
      location: event.location || "",
      type: event.item_type || "general",
    });
    setEditEventModal(true);
  };

  const handleEventClick = (event: EventItem) => {
    setSelectedEventDetail(event);
    setEventDetailModal(true);
  };

  const handleSessionUpdate = async () => {
    if (!editSession.title || !editSession.date || !editSession.speaker) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${editSession.date}T${editSession.hour}`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      let capacityValue: number | null = null;
      if (typeof editSession.capacity === 'number') {
        capacityValue = editSession.capacity;
      } else if (typeof editSession.capacity === 'string') {
        const parsed = parseInt(editSession.capacity, 10);
        capacityValue = isNaN(parsed) ? null : parsed;
      }

      const { error } = await supabase.from("sessions").update({
        title: editSession.title,
        description: editSession.description,
        speaker: editSession.speaker,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: editSession.location,
        capacity: capacityValue,
        max_attendees: capacityValue,
        session_type: editSession.type,
      }).eq('id', editSession.id);

      if (error) {
        showFeedback("Failed to update session", "error");
      } else {
        setEditSessionModal(false);
        setEditSession({
          id: "",
          title: "",
          date: "",
          speaker: "",
          capacity: "",
          type: "session",
          hour: "",
          location: "",
          description: "",
        });
        showFeedback("Session updated successfully!", "success");
        await fetchSessions();
      }
    } catch (err) {
      showFeedback("Failed to update session", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = async () => {
    if (!editEvent.title || !editEvent.startDate || !editEvent.startTime) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${editEvent.startDate}T${editEvent.startTime}`);
      const endDateTime = editEvent.endDate && editEvent.endTime 
        ? new Date(`${editEvent.endDate}T${editEvent.endTime}`)
        : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

      const { error } = await supabase.from("schedule_items").update({
        title: editEvent.title,
        description: editEvent.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: editEvent.location,
        item_type: editEvent.type,
      }).eq('id', editEvent.id);

      if (error) {
        showFeedback("Failed to update event", "error");
      } else {
        setEditEventModal(false);
        setEditEvent({
          id: "",
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          location: "",
          type: "general",
        });
        showFeedback("Event updated successfully!", "success");
        await fetchEventsByDay(activeDay);
      }
    } catch (err) {
      showFeedback("Failed to update event", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = (company: CompanyItem) => {
    setSelectedCompanyEdit(company);
    setEditCompany({
      id: company.id,
      name: company.name || "",
      logo: null,
      logoUrl: company.logo_url || "",
      logoType: "link",
      description: company.description || "",
      website: company.website || "",
      boothNumber: company.booth_number || "",
      partnerType: company.partner_type || "",
    });
    setEditCompanyModal(true);
  };

  // Enhanced Stat Card Component with animations
  const StatCard: React.FC<{ title: string; value: number | string | JSX.Element; icon: JSX.Element; color: 'blue' | 'green' | 'purple' | 'orange' | 'red'; }> = ({ title, value, icon, color }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-12 h-12 ${colorClasses[color]} bg-opacity-10 rounded-lg flex items-center justify-center`}>
            <div className={colorClasses[color].replace('bg-', 'text-')}>
              {icon}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Gender Chart Component
  const GenderChart: React.FC<{ data: { male: number; female: number }; title?: string }> = ({ data, title = "Gender Distribution" }) => {
    const total = data.male + data.female;
    const malePercentage = total > 0 ? (data.male / total) * 100 : 0;
    const femalePercentage = total > 0 ? (data.female / total) * 100 : 0;

    return (
      <div className="space-y-2 fade-in-blur">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className="flex justify-between text-sm">
          <span className="text-blue-600 font-medium">Male: {data.male} ({malePercentage.toFixed(1)}%)</span>
          <span className="text-pink-600 font-medium">Female: {data.female} ({femalePercentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full"
            style={{ width: `${malePercentage}%` }}
          ></div>
          <div
            className="bg-pink-600 h-3 rounded-full -mt-3"
            style={{ width: `${femalePercentage}%`, marginLeft: `${malePercentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Role Chart Component
  const RoleChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
    const roles = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = roles.reduce((sum, [_, count]) => sum + count, 0);

    return (
      <div className="space-y-3 fade-in-blur">
        {roles.map(([role, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={role} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700 capitalize">{role.replace('_', ' ')}</span>
                <span className="text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Bar Chart Component
  const BarChart: React.FC<{ data: Array<{ name: string; count: number }>; color: 'blue' | 'green' | 'purple' | 'orange'; title: string }> = ({ data, color, title }) => {
    const maxCount = Math.max(...data.map(item => item.count), 1);
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };

    return (
      <div className="space-y-3 fade-in-blur">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        {data.slice(0, 8).map((item, index) => {
          const percentage = (item.count / maxCount) * 100;
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700 truncate flex-1 mr-2">{item.name}</span>
                <span className="text-gray-500 whitespace-nowrap">{item.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${colorClasses[color]} h-3 rounded-full`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Marketing Chart Component
  const MarketingChart: React.FC<{ data: Array<{ name: string; count: number }> }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
      <div className="space-y-3 fade-in-blur">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          const formattedName = item.name.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');

          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{formattedName}</span>
                <span className="text-gray-500">{item.count} ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Degree Chart Component
  const DegreeChart: React.FC<{ data: { student: number; graduate: number }; title?: string }> = ({ data, title = "Degree Level" }) => {
    const total = data.student + data.graduate;
    const studentPercentage = total > 0 ? (data.student / total) * 100 : 0;
    const graduatePercentage = total > 0 ? (data.graduate / total) * 100 : 0;

    return (
      <div className="space-y-4 fade-in-blur">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className="flex justify-between text-sm">
          <span className="text-green-600 font-medium">Students: {data.student} ({studentPercentage.toFixed(1)}%)</span>
          <span className="text-blue-600 font-medium">Graduates: {data.graduate} ({graduatePercentage.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full"
            style={{ width: `${studentPercentage}%` }}
          ></div>
          <div
            className="bg-blue-500 h-4 rounded-full -mt-4"
            style={{ width: `${graduatePercentage}%`, marginLeft: `${studentPercentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const handleCompanyUpdate = async () => {
    if (!editCompany.name || !editCompany.website || !editCompany.boothNumber) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    if (editCompany.logoType === "link" && !editCompany.logoUrl) {
      showFeedback("Please provide a logo URL!", "error");
      return;
    }

    if (editCompany.logoType === "upload" && !editCompany.logo) {
      showFeedback("Please select a logo file to upload!", "error");
      return;
    }

    setLoading(true);
    try {
      let logoUrl = editCompany.logoUrl;

      if (editCompany.logoType === "upload" && editCompany.logo) {
        const fileExt = editCompany.logo.name.split('.').pop();
        const fileName = `${Date.now()}-${editCompany.name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
        const filePath = `company-logos/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Assets")
          .upload(filePath, editCompany.logo);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          showFeedback("Failed to upload logo", "error");
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("Assets")
          .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("companies").update({
        name: editCompany.name,
        logo_url: logoUrl,
        description: editCompany.description,
        website: editCompany.website,
        booth_number: editCompany.boothNumber,
        partner_type: editCompany.partnerType,
      }).eq('id', editCompany.id);

      if (error) {
        showFeedback("Failed to update company", "error");
      } else {
        setEditCompanyModal(false);
        setEditCompany({
          id: "",
          name: "",
          logo: null,
          logoUrl: "",
          logoType: "link",
          description: "",
          website: "",
          boothNumber: "",
          partnerType: "",
        });
        showFeedback("Company updated successfully!", "success");
        await fetchCompanies();
      }
    } catch (err) {
      showFeedback("Failed to update company", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildingStats = async () => {
    try {
      const { data: dynamicStats, error } = await getDynamicBuildingStats();
      
      if (error) {
        console.error("Error fetching dynamic building stats:", error);
        const { count: totalAttendees } = await supabase
          .from("users_profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "attendee");

        setBuildingStats({
          inside_building: 0,
          inside_event: 0,
          total_attendees: totalAttendees || 0
        });
      } else if (dynamicStats) {
        setBuildingStats({
          inside_building: dynamicStats.inside_building,
          inside_event: dynamicStats.inside_event,
          total_attendees: dynamicStats.total_attendees
        });
      }
    } catch (error) {
      console.error("Error fetching building stats:", error);
      setBuildingStats({
        inside_building: 0,
        inside_event: 0,
        total_attendees: 0
      });
    }
  };

  const confirmDeleteSession = async () => {
    if (!selectedSessionDelete) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq('id', selectedSessionDelete.id);

      if (error) {
        showFeedback("Failed to delete session", "error");
      } else {
        setDeleteSessionModal(false);
        setSelectedSessionDelete(null);
        showFeedback("Session deleted successfully!", "success");
        await fetchSessions();
      }
    } catch (err) {
      showFeedback("Failed to delete session", "error");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced StatisticsTab Component with Inside Event Stats
  const StatisticsTab = () => {
    const [statsData, setStatsData] = useState<StatsData>({
      totalRegistrations: 0,
      graduates: 0,
      students: 0,
      currentInEvent: 0,
      currentInBuilding: 0,
      universities: [],
      faculties: [],
      genderStats: { male: 0, female: 0 },
      roleStats: {},
      marketingSources: [],
      degreeLevelStats: { student: 0, graduate: 0 },
      classYearStats: {},
      currentGenderStats: { male: 0, female: 0 },
      eventStats: {
        day1: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
        day2: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
        day3: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
        day4: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
        day5: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 }
      }
    });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all');
    const [statsType, setStatsType] = useState('registration');
    const [selectedDay, setSelectedDay] = useState(1);

    useEffect(() => {
      fetchStatistics();
    }, [timeRange, statsType, selectedDay]);

    const fetchStatistics = async () => {
      setLoading(true);
      try {
        if (statsType === 'registration') {
          await fetchRegistrationStats();
        } else {
          await fetchEventStats();
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setStatsData(prev => ({
          ...prev,
          eventStats: {
            day1: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
            day2: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
            day3: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
            day4: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 },
            day5: { entries: 0, exits: 0, building_entries: 0, building_exits: 0, session_entries: 0, registrations: 0 }
          }
        }));
      } finally {
        setLoading(false);
      }
    };

    const fetchEventStats = async () => {
      try {
        // Calculate the date for the selected day (Day 1 = Oct 19, 2025)
        const eventStartDate = new Date('2025-10-19');
        const targetDate = new Date(eventStartDate);
        targetDate.setDate(eventStartDate.getDate() + (selectedDay - 1));
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: attendances, error } = await supabase
          .from('attendances')
          .select('*')
          .gte('scanned_at', startOfDay.toISOString())
          .lte('scanned_at', endOfDay.toISOString());

        if (error) throw error;

        const dayStats = processEventStatistics(attendances || []);
        
        setStatsData(prev => ({
          ...prev,
          eventStats: {
            ...prev.eventStats,
            [`day${selectedDay}`]: dayStats
          }
        }));
      } catch (error) {
        console.error('Error fetching event stats:', error);
        throw error;
      }
    };

    const fetchRegistrationStats = async () => {
      try {
        let query = supabase
          .from('users_profiles')
          .select('*', { count: 'exact' });
    
        // Apply date filters if needed
        if (timeRange === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayStart = today.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00');
          const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00');
          
          query = query.gte('created_at', todayStart)
                      .lt('created_at', todayEnd);
        } else if (timeRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          
          const weekAgoStart = weekAgo.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00');
          
          query = query.gte('created_at', weekAgoStart);
        }
    
        const { data: users, error, count } = await query;
    
        if (error) {
          console.error('Query error:', error);
          throw error;
        }
    
        let allUsers = users || [];
        
        if (timeRange === 'all' && count && count > 1000) {
          const pageSize = 1000;
          const totalPages = Math.ceil(count / pageSize);
          allUsers = [];
          
          for (let page = 0; page < totalPages; page++) {
            const { data: pageUsers, error: pageError } = await supabase
              .from('users_profiles')
              .select('*')
              .range(page * pageSize, (page + 1) * pageSize - 1);
              
            if (pageError) throw pageError;
            if (pageUsers) allUsers = [...allUsers, ...pageUsers];
          }
        }
    
        const stats = processUserStatistics(allUsers as UserProfileItem[]);
        setStatsData(prev => ({ ...prev, ...stats } as StatsData));
      } catch (error) {
        console.error('Error fetching registration stats:', error);
        try {
          let countQuery = supabase
            .from('users_profiles')
            .select('*', { count: 'exact', head: true });
    
          if (timeRange === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00');
            const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00');
            
            countQuery = countQuery.gte('created_at', todayStart)
                                  .lt('created_at', todayEnd);
          } else if (timeRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);
            const weekAgoStart = weekAgo.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '+00');
            
            countQuery = countQuery.gte('created_at', weekAgoStart);
          }
    
          const { count, error: countError } = await countQuery;
          
          if (!countError && count !== null) {
            setStatsData(prev => ({
              ...prev,
              totalRegistrations: count,
              students: 0,
              graduates: 0,
              currentInEvent: 0,
              currentInBuilding: 0,
              universities: [],
              faculties: [],
              genderStats: { male: 0, female: 0 },
              roleStats: {},
              marketingSources: [],
              degreeLevelStats: { student: 0, graduate: 0 },
              classYearStats: {},
              currentGenderStats: { male: 0, female: 0 }
            }));
          }
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }
    };

    const processUserStatistics = (users: UserProfileItem[]) => {
      const stats: Omit<StatsData, 'eventStats'> = {
        totalRegistrations: users.length,
        graduates: 0,
        students: 0,
        currentInEvent: 0,
        currentInBuilding: 0,
        universities: [],
        faculties: [],
        genderStats: { male: 0, female: 0 },
        roleStats: {},
        marketingSources: [],
        degreeLevelStats: { student: 0, graduate: 0 },
        classYearStats: {},
        currentGenderStats: { male: 0, female: 0 }
      };
    
      const universityCount: Record<string, number> = {};
      const facultyCount: Record<string, number> = {};
      const roleCount: Record<string, number> = {};
      const marketingCount: Record<string, number> = {};
      const classYearCount: Record<string, number> = {};
    
      users.forEach(user => {
        if (user.degree_level) {
          const degreeLevel = user.degree_level.toString().toLowerCase();
          if (degreeLevel === 'graduate') {
            stats.graduates++;
            stats.degreeLevelStats.graduate++;
          } else if (degreeLevel === 'student') {
            stats.students++;
            stats.degreeLevelStats.student++;
          }
        }
    
        if (user.event_entry) stats.currentInEvent++;
        if (user.building_entry) stats.currentInBuilding++;
    
        if (user.gender === 'male') {
          stats.genderStats.male++;
          if (user.event_entry) stats.currentGenderStats.male++;
        } else if (user.gender === 'female') {
          stats.genderStats.female++;
          if (user.event_entry) stats.currentGenderStats.female++;
        }
    
        if (user.university) {
          universityCount[user.university] = (universityCount[user.university] || 0) + 1;
        }
    
        if (user.faculty) {
          facultyCount[user.faculty] = (facultyCount[user.faculty] || 0) + 1;
        }
    
        if (user.role) {
          roleCount[user.role] = (roleCount[user.role] || 0) + 1;
        }
    
        if (user.how_did_hear_about_event) {
          marketingCount[user.how_did_hear_about_event] = (marketingCount[user.how_did_hear_about_event] || 0) + 1;
        }
    
        if (user.class) {
          classYearCount[user.class] = (classYearCount[user.class] || 0) + 1;
        }
      });
    
      stats.universities = (Object.entries(universityCount) as Array<[string, number]>)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
      stats.faculties = (Object.entries(facultyCount) as Array<[string, number]>)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
      stats.roleStats = roleCount;
      stats.marketingSources = (Object.entries(marketingCount) as Array<[string, number]>)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
      stats.classYearStats = classYearCount;
    
      return stats;
    };

    const processEventStatistics = (attendances: Array<{ scan_type: string }>): DayStats => {
      return {
        entries: attendances.filter(a => a.scan_type === 'entry').length,
        exits: attendances.filter(a => a.scan_type === 'exit').length,
        building_entries: attendances.filter(a => a.scan_type === 'building_entry').length,
        building_exits: attendances.filter(a => a.scan_type === 'building_exit').length,
        session_entries: attendances.filter(a => a.scan_type === 'session_entry').length,
        registrations: 0
      };
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 fade-in-blur">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8 fade-in-blur">
        {/* Stats Type and Time Range Filter */}
        <div className="space-y-4 fade-in-blur">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatsType('registration')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                statsType === 'registration' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Registration
            </button>
            <button
              onClick={() => setStatsType('event')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                statsType === 'event' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Event
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimeRange('today')}
              disabled={statsType === 'event'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                timeRange === 'today' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${statsType === 'event' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('week')}
              disabled={statsType === 'event'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                timeRange === 'week' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${statsType === 'event' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('all')}
              disabled={statsType === 'event'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                timeRange === 'all' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${statsType === 'event' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              All Time
            </button>
          </div>

          {statsType === 'event' && (
            <div className="flex flex-wrap gap-2 fade-in-blur">
              {[1, 2, 3, 4, 5].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                    selectedDay === day 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conditional Content based on Stats Type */}
        {statsType === 'registration' ? (
          <RegistrationStatsView statsData={statsData} />
        ) : (
          <EventStatsView statsData={statsData} selectedDay={selectedDay} />
        )}

        {/* Current State Widget */}
        <CurrentStateWidget statsData={statsData} />
      </div>
    );
  };

  // Registration Stats View Component
  const RegistrationStatsView: React.FC<{ statsData: StatsData }> = ({ statsData }) => (
    <div className="space-y-8 fade-in-blur">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        <StatCard
          title="Total Registrations"
          value={statsData.totalRegistrations}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Students"
          value={statsData.students}
          icon={<Users className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Graduates"
          value={statsData.graduates}
          icon={<Users className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Currently in Event"
          value={statsData.currentInEvent}
          icon={<Activity className="h-6 w-6" />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
          <GenderChart data={statsData.genderStats} title="Total Registrations" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
          <RoleChart data={statsData.roleStats} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Universities</h3>
          <BarChart data={statsData.universities} color="blue" title="" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Faculties</h3>
          <BarChart data={statsData.faculties} color="green" title="" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Sources</h3>
          <MarketingChart data={statsData.marketingSources} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Degree Level</h3>
          <DegreeChart data={statsData.degreeLevelStats} />
        </div>
      </div>
    </div>
  );

  // Event Stats View Component
  const EventStatsView: React.FC<{ statsData: StatsData; selectedDay: number }> = ({ statsData, selectedDay }) => {
    const [eventAnalytics, setEventAnalytics] = useState<{
      faculties: Array<{ name: string; count: number }>;
      universities: Array<{ name: string; count: number }>;
      genderStats: { male: number; female: number };
      degreeStats: { student: number; graduate: number };
    }>({
      faculties: [],
      universities: [],
      genderStats: { male: 0, female: 0 },
      degreeStats: { student: 0, graduate: 0 }
    });

    useEffect(() => {
      fetchEventAnalytics();
    }, [selectedDay]);

    const fetchEventAnalytics = async () => {
      try {
        const { data: eventUsers, error } = await supabase
          .from('users_profiles')
          .select('*')
          .eq('event_entry', true)
          .eq('role', 'attendee');

        if (error) throw error;

        if (eventUsers && eventUsers.length > 0) {
          const facultiesCount: Record<string, number> = {};
          const universitiesCount: Record<string, number> = {};
          const genderStats: { male: number; female: number } = { male: 0, female: 0 };
          const degreeStats: { student: number; graduate: number } = { student: 0, graduate: 0 };

          eventUsers.forEach(user => {
            if (user.faculty) {
              facultiesCount[user.faculty] = (facultiesCount[user.faculty] || 0) + 1;
            }
            if (user.university) {
              universitiesCount[user.university] = (universitiesCount[user.university] || 0) + 1;
            }
            if (user.gender === 'male') genderStats.male++;
            else if (user.gender === 'female') genderStats.female++;
            
            if (user.degree_level === 'student') degreeStats.student++;
            else if (user.degree_level === 'graduate') degreeStats.graduate++;
          });

          const topFaculties = (Object.entries(facultiesCount) as Array<[string, number]>)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          const topUniversities = (Object.entries(universitiesCount) as Array<[string, number]>)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          setEventAnalytics({
            faculties: topFaculties,
            universities: topUniversities,
            genderStats,
            degreeStats
          });
        }
      } catch (error) {
        console.error('Error fetching event analytics:', error);
      }
    };

    const dayKey = (`day${selectedDay}` as DayKey);
    const dayStats = statsData?.eventStats?.[dayKey] || {
      entries: 0,
      exits: 0,
      building_entries: 0,
      building_exits: 0,
      session_entries: 0,
      registrations: 0
    };

    return (
      <div className="space-y-8 fade-in-blur">
        {/* Day Stats Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Day {selectedDay} - {getDateForDay(selectedDay)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            <StatCard
              title="Entries"
              value={dayStats.entries}
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Exits"
              value={dayStats.exits}
              icon={<TrendingUp className="h-6 w-6" />}
              color="red"
            />
            <StatCard
              title="Building Entries"
              value={dayStats.building_entries}
              icon={<Building className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Session Entries"
              value={dayStats.session_entries}
              icon={<Calendar className="h-6 w-6" />}
              color="purple"
            />
          </div>
        </div>

        {/* Inside Event Analytics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inside Event Analytics</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <GenderChart 
                data={eventAnalytics.genderStats} 
                title="Gender Distribution Inside Event"
              />
            </div>
            <div>
              <DegreeChart 
                data={eventAnalytics.degreeStats}
                title="Student/Graduate Ratio Inside Event"
              />
            </div>
          </div>
        </div>

        {/* Faculty and University Analysis Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Top Faculties Inside Event
            </h3>
            <BarChart 
              data={eventAnalytics.faculties} 
              color="blue"
              title=""
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Top Universities Inside Event
            </h3>
            <BarChart 
              data={eventAnalytics.universities} 
              color="green"
              title=""
            />
          </div>
        </div>

        {/* Activity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
            <DailyActivityChart selectedDay={selectedDay} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Flow</h3>
            <AttendanceFlowChart dayStats={dayStats} />
          </div>
        </div>

        {/* Session Popularity */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Popularity</h3>
          <SessionPopularityChart selectedDay={selectedDay} />
        </div>
      </div>
    );
  };
  
  // Current State Widget
  const CurrentStateWidget: React.FC<{ statsData: StatsData }> = ({ statsData }) => (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden fade-in-blur card-hover dashboard-card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-3xl font-bold text-black-800 flex items-center gap-2 mx-auto">
          <Activity className="h-7 w-7 text-orange-500" />
          Current State
        </h2>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-lg font-bold text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-800 text-xl font-extrabold">
              <tr>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Maximum Capacity</th>
                <th className="px-4 py-3">Current Capacity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-3">Building</td>
                <td className="px-4 py-3 text-red-600">350</td>
                <td className="px-4 py-3">{statsData.currentInBuilding}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    statsData.currentInBuilding < 280 
                      ? 'bg-green-100 text-green-800' 
                      : statsData.currentInBuilding < 315 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {statsData.currentInBuilding > 0 ? Math.round((statsData.currentInBuilding / 350) * 100) : 0}%
                  </span>
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-3">Event</td>
                <td className="px-4 py-3 text-red-600">1500</td>
                <td className="px-4 py-3">{statsData.currentInEvent}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    statsData.currentInEvent < 1200 
                      ? 'bg-green-100 text-green-800' 
                      : statsData.currentInEvent < 1350 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {statsData.currentInEvent > 0 ? Math.round((statsData.currentInEvent / 1500) * 100) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Chart Components
  const DailyActivityChart: React.FC<{ selectedDay: number }> = ({ selectedDay }) => {
    const [dailyData, setDailyData] = useState<Array<{ hour: string; entries: number; exits: number }>>([]);

    useEffect(() => {
      fetchDailyActivity(selectedDay);
    }, [selectedDay]);

    const fetchDailyActivity = async (day: number) => {
      try {
        // Calculate the date for the selected day (Day 1 = Oct 19, 2025)
        const eventStartDate = new Date('2025-10-19');
        const targetDate = new Date(eventStartDate);
        targetDate.setDate(eventStartDate.getDate() + (day - 1));
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: attendances, error } = await supabase
          .from('attendances')
          .select('*')
          .gte('scanned_at', startOfDay.toISOString())
          .lte('scanned_at', endOfDay.toISOString())
          .order('scanned_at', { ascending: true });

        if (error) throw error;

        const hourlyData: Record<string, { entries: number; exits: number }> = {};
        (attendances || []).forEach((attendance: { scanned_at: string; scan_type: string }) => {
          const hour = new Date(attendance.scanned_at).getHours();
          const hourKey = `${hour}:00`;
          
          if (!hourlyData[hourKey]) {
            hourlyData[hourKey] = { entries: 0, exits: 0 };
          }
          
          if (attendance.scan_type === 'entry') {
            hourlyData[hourKey].entries++;
          } else if (attendance.scan_type === 'exit') {
            hourlyData[hourKey].exits++;
          }
        });

        const processedData = (Object.entries(hourlyData) as Array<[string, { entries: number; exits: number }]>)
          .map(([hour, data]) => ({ hour, entries: data.entries, exits: data.exits }))
          .sort((a, b) => a.hour.localeCompare(b.hour));

        setDailyData(processedData);
      } catch (error) {
        console.error('Error fetching daily activity:', error);
        setDailyData([]);
      }
    };

    const maxValue = Math.max(...dailyData.flatMap(d => [d.entries, d.exits]), 1);

    return (
      <div className="space-y-4 fade-in-blur">
        {dailyData.map((data, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{data.hour}</span>
              <div className="flex gap-4">
                <span className="text-green-600">Entries: {data.entries}</span>
                <span className="text-red-600">Exits: {data.exits}</span>
              </div>
            </div>
            <div className="flex gap-1 h-4">
              <div
                className="bg-green-500 rounded-l"
                style={{ width: `${(data.entries / maxValue) * 100}%` }}
              ></div>
              <div
                className="bg-red-500 rounded-r"
                style={{ width: `${(data.exits / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
        {dailyData.length === 0 && (
          <p className="text-gray-500 text-center">No activity data for today</p>
        )}
      </div>
    );
  };

  const AttendanceFlowChart: React.FC<{ dayStats: DayStats }> = ({ dayStats }) => {
    const flowData = [
      { label: 'Total Entries', value: dayStats.entries, color: 'bg-green-500' },
      { label: 'Total Exits', value: dayStats.exits, color: 'bg-red-500' },
      { label: 'Building Entries', value: dayStats.building_entries, color: 'bg-blue-500' },
      { label: 'Session Entries', value: dayStats.session_entries, color: 'bg-purple-500' },
    ];

    const maxValue = Math.max(...flowData.map(d => d.value), 1);

    return (
      <div className="space-y-3 fade-in-blur">
        {flowData.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="text-gray-500">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`${item.color} h-3 rounded-full`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SessionPopularityChart: React.FC<{ selectedDay: number }> = ({ selectedDay }) => {
    const [sessionData, setSessionData] = useState<Array<{ name: string; attendees: number; capacity: number; popularity: number }>>([]);

    useEffect(() => {
      fetchSessionPopularity(selectedDay);
    }, [selectedDay]);

    const fetchSessionPopularity = async (day: number) => {
      try {
        // Calculate the date for the selected day (Day 1 = Oct 19, 2025)
        const eventStartDate = new Date('2025-10-19');
        const targetDate = new Date(eventStartDate);
        targetDate.setDate(eventStartDate.getDate() + (day - 1));
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id, title, max_attendees, current_bookings, start_time')
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('current_bookings', { ascending: false });

        if (error) throw error;

        const sessionPopularity = sessions.map(session => ({
          name: session.title,
          attendees: session.current_bookings || 0,
          capacity: session.max_attendees || 0,
          popularity: session.max_attendees ? ((session.current_bookings || 0) / session.max_attendees) * 100 : 0
        }));

        setSessionData(sessionPopularity);
      } catch (error) {
        console.error('Error fetching session popularity:', error);
        setSessionData([]);
      }
    };

    const maxAttendees = Math.max(...sessionData.map(s => s.attendees), 1);

    return (
      <div className="space-y-3 fade-in-blur">
        {sessionData.map((session, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700 truncate flex-1 mr-2">{session.name}</span>
              <span className="text-gray-500 whitespace-nowrap">
                {session.attendees}/{session.capacity || '∞'} ({Math.round(session.popularity)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-orange-500 h-3 rounded-full"
                style={{ width: `${(session.attendees / maxAttendees) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
        {sessionData.length === 0 && (
          <p className="text-gray-500 text-center">No session data available</p>
        )}
      </div>
    );
  };

  const confirmDeleteEvent = async () => {
    if (!selectedEventDelete) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("schedule_items")
        .delete()
        .eq('id', selectedEventDelete.id);

      if (error) {
        showFeedback("Failed to delete event", "error");
      } else {
        setDeleteEventModal(false);
        setSelectedEventDelete(null);
        showFeedback("Event deleted successfully!", "success");
        await fetchEventsByDay(activeDay);
      }
    } catch (err) {
      showFeedback("Failed to delete event", "error");
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

      if (!error && data) {
        setSessions(data);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const fetchEventsByDay = async (day: number) => {
    try {
      // Calculate the date for the selected day (Day 1 = Oct 19, 2025)
      const eventStartDate = new Date('2025-10-19');
      const targetDate = new Date(eventStartDate);
      targetDate.setDate(eventStartDate.getDate() + (day - 1));
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("schedule_items")
        .select("*")
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order("start_time", { ascending: true });

      if (!error && data) {
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("partner_type", { ascending: true })
        .order("name", { ascending: true });

      if (!error && data) {
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  // Handle Company Submit
  const handleCompanySubmit = async () => {
    if (!newCompany.name || !newCompany.website || !newCompany.boothNumber) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    if (newCompany.logoType === "link" && !newCompany.logoUrl) {
      showFeedback("Please provide a logo URL!", "error");
      return;
    }

    if (newCompany.logoType === "upload" && !newCompany.logo) {
      showFeedback("Please select a logo file to upload!", "error");
      return;
    }

    setLoading(true);
    try {
      let logoUrl = newCompany.logoUrl;

      if (newCompany.logoType === "upload" && newCompany.logo) {
        const fileExt = newCompany.logo.name.split('.').pop();
        const fileName = `${Date.now()}-${newCompany.name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
        const filePath = `company-logos/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("Assets")
          .upload(filePath, newCompany.logo);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          showFeedback("Failed to upload logo", "error");
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("Assets")
          .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("companies").insert({
        name: newCompany.name,
        logo_url: logoUrl,
        description: newCompany.description,
        website: newCompany.website,
        booth_number: newCompany.boothNumber,
        partner_type: newCompany.partnerType,
      });

      if (error) {
        showFeedback("Failed to add company", "error");
      } else {
        setCompanyModal(false);
        setNewCompany({
          name: "",
          logo: null,
          logoUrl: "",
          logoType: "link",
          description: "",
          website: "",
          boothNumber: "",
          partnerType: "",
        });
        showFeedback("Company added successfully!", "success");
        await fetchCompanies();
      }
    } catch (err) {
      showFeedback("Failed to add company", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Session Submit
  const handleSessionSubmit = async () => {
    if (!newSession.title || !newSession.date || !newSession.speaker) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${newSession.date}T${newSession.hour}`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      let capacityValue: number | null = null;
      if (typeof newSession.capacity === 'number') {
        capacityValue = newSession.capacity;
      } else if (typeof newSession.capacity === 'string') {
        const parsed = parseInt(newSession.capacity, 10);
        capacityValue = isNaN(parsed) ? null : parsed;
      }

      const { error } = await supabase.from("sessions").insert({
        title: newSession.title,
        description: newSession.description,
        speaker: newSession.speaker,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: newSession.location,
        capacity: capacityValue,
        max_attendees: capacityValue,
        session_type: newSession.type,
      });

      if (error) {
        showFeedback("Failed to add session", "error");
      } else {
        setSessionModal(false);
        setNewSession({
          title: "",
          date: "",
          speaker: "",
          capacity: "",
          type: "session",
          hour: "",
          location: "",
          description: "",
        });
        showFeedback("Session added successfully!", "success");
        await fetchSessions();
      }
    } catch (err) {
      showFeedback("Failed to add session", "error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteCompanyModal = (company: CompanyItem) => {
    setSelectedCompanyDelete(company);
    setDeleteCompanyModal(true);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyDelete) return;
    
    setLoading(true);
    try {
      const { error } = await deleteCompany(selectedCompanyDelete.id);
      
      if (error) {
        showFeedback("Failed to delete company", "error");
      } else {
        setDeleteCompanyModal(false);
        setSelectedCompanyDelete(null);
        showFeedback("Company deleted successfully!", "success");
        await fetchCompanies();
      }
    } catch (err) {
      showFeedback("Failed to delete company", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Event Submit
  const handleEventSubmit = async () => {
    if (!newEvent.title || !newEvent.startDate || !newEvent.startTime) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}`);
      const endDateTime = newEvent.endDate && newEvent.endTime 
        ? new Date(`${newEvent.endDate}T${newEvent.endTime}`)
        : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

      const { error } = await supabase.from("schedule_items").insert({
        title: newEvent.title,
        description: newEvent.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: newEvent.location,
        item_type: newEvent.type,
      });

      if (error) {
        showFeedback("Failed to add event", "error");
      } else {
        setEventModal(false);
        setNewEvent({
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          location: "",
          type: "general",
        });
        showFeedback("Event added successfully!", "success");
        await fetchEventsByDay(activeDay);
      }
    } catch (err) {
      showFeedback("Failed to add event", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (session: SessionItem) => {
    setSelectedSessionDelete(session);
    setDeleteSessionModal(true);
  };

  const handleDeleteEvent = async (event: EventItem) => {
    setSelectedEventDelete(event);
    setDeleteEventModal(true);
  };

  // Get role options for Admin
  const getAdminRoleOptions = (): Array<{ value: string; label: string }> => {
    return [
      { value: "", label: "Select Target" },
      { value: "all", label: "All Users" },
      { value: "volunteer", label: "Volunteers (All except Admin/Team Leader/Attendee)" },
      { value: "team_leader", label: "Team Leaders" },
      { value: "admin", label: "Admins" },
      { value: "attendee", label: "Attendees" },
      { value: "registration", label: "Registration Team" },
      { value: "building", label: "Building Team" },
      { value: "info_desk", label: "Info Desk" },
      { value: "ushers", label: "Ushers" },
      { value: "marketing", label: "Marketing" },
      { value: "media", label: "Media" },
      { value: "ER", label: "ER Team" },
      { value: "BD", label: "Business Development" },
      { value: "catering", label: "Catering" },
      { value: "feedback", label: "Feedback Team" },
      { value: "stage", label: "Stage Team" },
      { value: "custom", label: "Custom Selection" }
    ];
  };

  // Get team leader sub-options
  const getTeamLeaderOfOptions = (): Array<{ value: string; label: string }> => {
    return [
      { value: "all", label: "All Team Leaders" },
      { value: "registration", label: "Registration Team Leaders" },
      { value: "building", label: "Building Team Leaders" },
      { value: "info_desk", label: "Info Desk Team Leaders" },
      { value: "ushers", label: "Ushers Team Leaders" },
      { value: "marketing", label: "Marketing Team Leaders" },
      { value: "media", label: "Media Team Leaders" },
      { value: "ER", label: "ER Team Leaders" },
      { value: "BD", label: "Business Development Team Leaders" },
      { value: "catering", label: "Catering Team Leaders" },
      { value: "feedback", label: "Feedback Team Leaders" },
      { value: "stage", label: "Stage Team Leaders" }
    ];
  };

  // User search function for Admin
  const searchUsersByPersonalId = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('id, first_name, last_name, personal_id, role, email, volunteer_id')
        .or(`personal_id.ilike.%${searchTerm.trim()}%,volunteer_id.ilike.%${searchTerm.trim()}%`)
        .order('personal_id')
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } else {
        const filteredResults = (data || []).filter((user: UserProfileItem) => 
          !selectedUsers.some((selectedId: string) => selectedId === user.id)
        );
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Search exception:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addUserToSelection = (user: UserProfileItem) => {
    setSelectedUsers(prev => [...prev, user.id]);
    setSearchResults(prev => prev.filter(result => result.id !== user.id));
    setUserSearch("");
  };

  const removeUserFromSelection = (userId: string) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
  };

  const clearUserSelection = () => {
    setSelectedUsers([]);
    setUserSearch("");
    setSearchResults([]);
  };

  // Handle Announcement Submit
  const handleAnnouncementSubmit = async () => {
    if (!announcementTitle || !announcementDescription || !announcementRole) {
      showFeedback("Please fill all required fields!", "error");
      return;
    }

    if (announcementRole === "team_leader" && !teamLeaderOfRole) {
      showFeedback("Please select which team leaders to target!", "error");
      return;
    }

    if (announcementRole === "custom" && selectedUsers.length === 0) {
      showFeedback("Please select at least one user for custom notifications!", "error");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        showFeedback("User not authenticated", "error");
        setLoading(false);
        return;
      }

      const notificationData: {
        title: string;
        message: string;
        created_by: string;
        target_type?: 'all' | 'volunteers' | 'specific_users' | 'role';
        target_role?: string | null;
        target_user_ids?: string[] | null;
      } = {
        title: announcementTitle,
        message: announcementDescription,
        created_by: session.user.id
      };

      // Handle different target types
      if (announcementRole === "all") {
        notificationData.target_type = 'all';
        notificationData.target_role = null;
        notificationData.target_user_ids = null;
      } 
      else if (announcementRole === "volunteer") {
        notificationData.target_type = 'volunteers';
        notificationData.target_role = null;
        notificationData.target_user_ids = null;
      }
      else if (announcementRole === "team_leader") {
        if (teamLeaderOfRole === "all") {
          const { data: allTeamLeaders, error } = await supabase
            .from('users_profiles')
            .select('id')
            .eq('role', 'team_leader');

          if (error) throw error;

          notificationData.target_type = 'specific_users';
          notificationData.target_role = null;
          notificationData.target_user_ids = allTeamLeaders?.map(tl => tl.id) || [];
        } else {
          const { data: teamLeaders, error } = await supabase
            .from('users_profiles')
            .select('id')
            .eq('role', 'team_leader')
            .eq('tl_team', teamLeaderOfRole);

          if (error) throw error;

          notificationData.target_type = 'specific_users';
          notificationData.target_role = null;
          notificationData.target_user_ids = teamLeaders?.map(tl => tl.id) || [];
        }
      }
      else if (announcementRole === "custom") {
        notificationData.target_type = 'specific_users';
        notificationData.target_role = null;
        notificationData.target_user_ids = selectedUsers;
      }
      else {
        notificationData.target_type = 'role';
        notificationData.target_role = announcementRole;
        notificationData.target_user_ids = null;
      }

      const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (error) {
        console.error('Notification error:', error);
        showFeedback("Failed to send announcement", "error");
      } else {
        showFeedback("Announcement sent successfully!", "success");
        setAnnouncementTitle("");
        setAnnouncementDescription("");
        setAnnouncementRole("");
        setTeamLeaderOfRole("");
        clearUserSelection();
        setAnnouncementModal(false);
      }
    } catch (err) {
      console.error('Send announcement error:', err);
      showFeedback("Failed to send announcement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (session: SessionItem) => {
    setSelectedSessionDetail(session);
    setSessionDetailModal(true);
  };

  const handleCompanyClick = (company: CompanyItem) => {
    setSelectedCompanyDetail(company);
    setCompanyDetailModal(true);
  };

  const handleMapLoad = () => {
    setMapLoading(false);
  };

  const handleMapError = () => {
    setMapLoading(false);
  };

  useEffect(() => {
    setMapLoading(true);
  }, [activeDay]);

  const initializeMapImages = () => {
    const mapUrls = [];
    for (let day = 1; day <= 5; day++) {
      const { data: urlData } = supabase.storage
        .from("Assets")
        .getPublicUrl(`Maps/day${day}.png`);
      mapUrls.push(urlData.publicUrl);
    }
    setMapImages(mapUrls);
  };

  useEffect(() => {
    initializeMapImages();
  }, []);

  const handleMapUpload = async () => {
    if (!mapForm.image) {
      showFeedback("Please select an image!", "error");
      return;
    }

    setLoading(true);
    try {
      const filePath = `Maps/day${mapForm.day}.png`;
      
      const { data, error } = await supabase.storage
        .from("Assets")
        .upload(filePath, mapForm.image, {
          upsert: true
        });

      if (error) {
        console.error("Map upload error:", error);
        showFeedback("Failed to upload map image", "error");
      } else {
        showFeedback(`Day ${mapForm.day} map updated successfully!`, "success");
        initializeMapImages();
        setMapModal(false);
        setMapForm({ day: 1, image: null });
      }
    } catch (err) {
      console.error("Map upload exception:", err);
      showFeedback("Failed to update map", "error");
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "statistics", label: "Statistics" },
    { key: "sessions", label: "Sessions" },
    { key: "events", label: "Events" },
    { key: "maps", label: "Maps" },
    { key: "companies", label: "Companies" }
  ];

  if (loadingData) {
    return (
      <DashboardLayout title="Admin Panel" subtitle="System administration, user management, and analytics">
        <div className="flex items-center justify-center h-64 fade-in-blur">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Admin Panel"
      subtitle="System administration, user management, and analytics"
    >
      <div className="space-y-8 fade-in-up-blur">
        {/* Feedback Toast */}
        {feedback && createPortal(
          <div className={`fixed top-4 right-4 z-[200] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg fade-in-blur ${
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
              className="ml-2 hover:bg-black hover:bg-opacity-20 rounded p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>,
          document.body
        )}

        {/* Tabs */}
        <div className="flex space-x-1 sm:space-x-4 border-b mb-6 overflow-x-auto scrollbar-hide fade-in-blur">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-2 sm:px-4 font-semibold text-sm sm:text-base whitespace-nowrap transition-all duration-300 smooth-hover ${
                activeTab === tab.key
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-orange-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 fade-in-blur">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 text-center fade-in-blur card-hover dashboard-card">
              <h1 className="text-3xl font-bold text-black-800 flex items-center justify-center gap-2 mb-6">
                <Sparkles className="h-7 w-7 text-orange-500" />
                Quick Actions
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
                <button
                  onClick={() => setCompanyModal(true)}
                  className="flex flex-col items-center justify-center py-6 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 smooth-hover"
                >
                  <Building className="h-8 w-8 mb-2" />
                  <span className="text-base font-medium">Add Company</span>
                </button>

                <button
                  onClick={() => setSessionModal(true)}
                  className="flex flex-col items-center justify-center py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 smooth-hover"
                >
                  <Calendar className="h-8 w-8 mb-2" />
                  <span className="text-base font-medium">Add Session</span>
                </button>

                <button
                  onClick={() => setAnnouncementModal(true)}
                  className="flex flex-col items-center justify-center py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-700 transition-all duration-300 smooth-hover"
                >
                  <Megaphone className="h-8 w-8 mb-2" />
                  <span className="text-base font-medium">Send Announcement</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {stats?.total_users || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Attendees</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {buildingStats?.total_attendees || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Volunteers</p>
                    <p className="text-3xl font-bold text-green-600">
                      {(stats?.total_users || 0) - (buildingStats?.total_attendees || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "statistics" && (
          <StatisticsTab />
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="fade-in-blur">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0 fade-in-blur">
                <Calendar className="h-5 w-5 mr-2 text-orange-600" /> Sessions Management
              </h2>
              <button
                onClick={() => setSessionModal(true)}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 smooth-hover fade-in-blur"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-all duration-300 smooth-hover card-hover fade-in-blur"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{session.description}</p>
                  {session.speaker && (
                    <p className="text-sm font-medium text-gray-900 mb-2">Speaker: {session.speaker}</p>
                  )}
                  <div className="space-y-1 text-xs text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(session.start_time).toLocaleDateString()} {new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {session.location}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {session.session_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.current_bookings || 0}/{session.capacity || 'Unlimited'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleSessionClick(session)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-all duration-300 smooth-hover text-sm font-medium"
                    >
                      <Eye className="h-3 w-3 mr-1 inline" />
                      View
                    </button>
                    <button
                      onClick={() => handleEditSession(session)}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-all duration-300 smooth-hover text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session)}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-all duration-300 smooth-hover text-sm font-medium"
                    >
                      <Trash2 className="h-3 w-3 mr-1 inline" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="fade-in-blur">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 fade-in-blur">
                <Calendar className="h-5 w-5 mr-2 text-orange-600" /> Events Management
              </h2>

              <div className="flex space-x-1 mb-4 fade-in-blur">
                {[1, 2, 3, 4, 5].map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover min-w-20 ${
                      activeDay === day 
                        ? "bg-orange-500 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Day {day}<br />
                    <span className="text-xs">{getDateForDay(day).split(',')[0]}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setEventModal(true)}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 smooth-hover fade-in-blur"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover smooth-hover">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                  <div className="space-y-1 text-xs text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(event.start_time).toLocaleDateString()} {new Date(event.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                      {event.item_type}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEventClick(event)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-all duration-300 smooth-hover text-sm font-medium"
                    >
                      <Eye className="h-3 w-3 mr-1 inline" />
                      View
                    </button>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-all duration-300 smooth-hover text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-all duration-300 smooth-hover text-sm font-medium"
                    >
                      <Trash2 className="h-3 w-3 mr-1 inline" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maps Tab */}
        {activeTab === "maps" && (
          <div className="fade-in-blur">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 fade-in-blur">Event Maps</h2>
              
              <div className="flex space-x-2 mb-4 fade-in-blur">
                {[1, 2, 3, 4, 5].map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
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
            
            <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-center items-center min-h-[400px] fade-in-blur card-hover">
              {mapLoading && (
                <div className="flex flex-col items-center justify-center fade-in-blur">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading map...</p>
                </div>
              )}
              <img
                src={mapImages[activeDay - 1]}
                alt={`Day ${activeDay} Map`}
                className={`max-w-full h-auto rounded-lg transition-opacity duration-200 ${mapLoading ? 'opacity-0 absolute' : 'opacity-100'}`}
                onLoad={handleMapLoad}
                onError={(e) => {
                  handleMapError();
                  (e.currentTarget as HTMLImageElement).src = "/src/Assets/placeholder-map.png";
                }}
              />
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <div className="fade-in-blur">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0 fade-in-blur">
                <Building className="h-5 w-5 mr-2 text-orange-600" /> Companies Management
              </h2>
              <button
                onClick={() => setCompanyModal(true)}
                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-300 smooth-hover fade-in-blur"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </button>
            </div>

            <div className="space-y-8">
              {PARTNER_TYPES.map((partnerType) => {
                const partnerCompanies = companies.filter(company => 
                  company.partner_type === partnerType
                );
                
                if (partnerCompanies.length === 0) return null;
                
                return (
                  <div key={partnerType} className="fade-in-blur">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      {partnerType}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                      {partnerCompanies.map((company) => (
                        <div 
                          key={company.id} 
                          className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-all duration-300 smooth-hover card-hover fade-in-blur"
                        >
                          <div className="text-center">
                            <img 
                              src={company.logo_url} 
                              alt={`${company.name} logo`} 
                              className="h-16 w-auto mx-auto mb-4 object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/64x64/orange/white?text=Logo";
                              }}
                            />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{company.name}</h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{company.description}</p>
                            
                            {/* Partner Type Badge */}
                            {company.partner_type && (
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-2">
                                {company.partner_type}
                              </div>
                            )}
                            
                            {company.booth_number && (
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-4">
                                Booth {company.booth_number}
                              </div>
                            )}
                            
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => handleCompanyClick(company)}
                                className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-all duration-300 smooth-hover text-sm font-medium"
                              >
                                <Eye className="h-3 w-3 mr-1 inline" />
                                View
                              </button>
                              <button
                                onClick={() => handleEditCompany(company)}
                                className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg hover:bg-orange-600 transition-all duration-300 smooth-hover text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteCompanyModal(company)}
                                className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-all duration-300 smooth-hover text-sm font-medium"
                              >
                                <Trash2 className="h-3 w-3 mr-1 inline" />
                                Delete
                              </button>
                            </div>
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


        {/* All Modals with createPortal and animations */}

{/* Company Detail Modal */}
{companyDetailModal && selectedCompanyDetail && createPortal(
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
      <div className="p-6 stagger-children">
        <div className="flex items-center justify-between mb-6 fade-in-blur">
          <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
          <button
            onClick={() => {
              setCompanyDetailModal(false);
              setSelectedCompanyDetail(null);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6 fade-in-blur">
          {/* Company Logo and Name */}
          <div className="text-center">
            <img 
              src={selectedCompanyDetail.logo_url} 
              alt={`${selectedCompanyDetail.name} logo`} 
              className="h-24 w-auto mx-auto mb-4 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/96x96/orange/white?text=Logo";
              }}
            />
            <h3 className="text-2xl font-bold text-gray-900">{selectedCompanyDetail.name}</h3>
            
            {/* Partner Type Badge */}
            {selectedCompanyDetail.partner_type && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mt-2">
                {selectedCompanyDetail.partner_type}
              </div>
            )}
            
            {selectedCompanyDetail.booth_number && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 mt-2 ml-2">
                <MapPin className="h-4 w-4 mr-1" />
                Booth {selectedCompanyDetail.booth_number}
              </div>
            )}
          </div>

          {selectedCompanyDetail.partner_type && (
  <div className="fade-in-blur">
    <label className="block text-sm font-medium text-gray-700 mb-2">Partner Type</label>
    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
      {selectedCompanyDetail.partner_type}
    </div>
  </div>
)}

          {/* Company Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">About Company</label>
            <p className="text-gray-700 leading-relaxed">
              {selectedCompanyDetail.description || "No description available."}
            </p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            {selectedCompanyDetail.website ? (
              <a 
                href={selectedCompanyDetail.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 break-all transition-colors"
              >
                {selectedCompanyDetail.website}
              </a>
            ) : (
              <p className="text-gray-500">No website provided</p>
            )}
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-2 gap-4">
            {/* Created Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Added On</label>
              <p className="text-gray-900 text-sm">
                {selectedCompanyDetail.created_at 
                  ? new Date(selectedCompanyDetail.created_at).toLocaleDateString()
                  : 'Unknown'
                }
              </p>
            </div>

            {/* Company ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
              <p className="text-gray-900 text-sm font-mono truncate">
                {selectedCompanyDetail.id}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3 fade-in-blur">
            {selectedCompanyDetail.website && (
              <button
                onClick={() => window.open(selectedCompanyDetail.website, "_blank")}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-all duration-300 smooth-hover font-medium flex items-center justify-center"
              >
                <Link className="h-4 w-4 mr-2" />
                Visit Career Page
              </button>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  handleEditCompany(selectedCompanyDetail);
                  setCompanyDetailModal(false);
                }}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 smooth-hover font-medium"
              >
                Edit Company
              </button>
              
              <button
                onClick={() => {
                  setCompanyDetailModal(false);
                  openDeleteCompanyModal(selectedCompanyDetail);
                }}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-300 smooth-hover font-medium"
              >
                Delete Company
              </button>
            </div>
            
            <button
              onClick={() => {
                setCompanyDetailModal(false);
                setSelectedCompanyDetail(null);
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-300 smooth-hover font-medium"
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

        {/* Session Modal */}
        {sessionModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <h3 className="text-2xl font-bold mb-4 fade-in-blur">Add Session</h3>
              <div className="space-y-4 stagger-children">
                <input
                  type="text"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Session Title *"
                />
                
                <textarea
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Session Description"
                  rows={3}
                />

                <select
                  value={newSession.type}
                  onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                >
                  <option value="session">Session</option>
                  <option value="mentorship">Mentorship</option>
                </select>

                <input
                  type="time"
                  value={newSession.hour}
                  onChange={(e) => setNewSession({ ...newSession, hour: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />

                <input
                  type="date"
                  value={newSession.date}
                  onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />

                <input
                  type="text"
                  value={newSession.speaker}
                  onChange={(e) => setNewSession({ ...newSession, speaker: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Speaker *"
                />

                <input
                  type="number"
                  value={newSession.capacity}
                  onChange={(e) => setNewSession({ ...newSession, capacity: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Capacity"
                />

                <input
                  type="text"
                  value={newSession.location}
                  onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Session Location *"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
                <button
                  onClick={() => setSessionModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSessionSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Adding...' : 'Save Session'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Event Modal */}
        {eventModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <h3 className="text-2xl font-bold mb-4 fade-in-blur">Add Event</h3>
              <div className="space-y-4 stagger-children">
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder="Event Title *"
                />
                
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder="Event Description"
                  rows={3}
                />

                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                >
                  <option value="general">General</option>
                  <option value="workshop">Workshop</option>
                  <option value="networking">Networking</option>
                  <option value="keynote">Keynote</option>
                  <option value="panel">Panel</option>
                </select>

                <div className="grid grid-cols-2 gap-3 fade-in-blur">
                  <input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="Start Date *"
                  />
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 fade-in-blur">
                  <input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="End Date (Optional)"
                  />
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder="Event Location"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
                <button
                  onClick={() => setEventModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEventSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Adding...' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Map Upload Modal */}
        {mapModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md modal-content-blur fade-in-up-blur">
              <h3 className="text-2xl font-bold mb-4 fade-in-blur">Modify Map</h3>
              <div className="space-y-4 stagger-children">
                <div className="fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                  <select
                    value={mapForm.day}
                    onChange={(e) => setMapForm({ ...mapForm, day: parseInt(e.target.value) })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                  >
                    {[1, 2, 3, 4, 5].map(day => (
                      <option key={day} value={day}>Day {day}</option>
                    ))}
                  </select>
                </div>
                
                <div className="fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Map Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setMapForm({ ...mapForm, image: e.target.files?.[0] || null })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                  />
                  
                  {mapForm.image && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg fade-in-blur">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <img 
                        src={URL.createObjectURL(mapForm.image)} 
                        alt="Map preview" 
                        className="max-w-full h-32 object-contain mx-auto rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {mapForm.image.name} ({Math.round(mapForm.image.size / 1024)}KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
                <button
                  onClick={() => setMapModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMapUpload}
                  disabled={loading || !mapForm.image}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Uploading...' : 'Update Map'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Announcement Modal */}
        {announcementModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <div className="flex items-center justify-between mb-6 fade-in-blur">
                <h3 className="text-2xl font-bold text-gray-900">Send Announcement</h3>
                <button
                  onClick={() => {
                    setAnnouncementModal(false);
                    clearUserSelection();
                    setTeamLeaderOfRole("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 stagger-children">
                <div className="fade-in-blur">
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    placeholder="Message Title *"
                  />
                </div>

                <div className="fade-in-blur">
                  <textarea
                    value={announcementDescription}
                    onChange={(e) => setAnnouncementDescription(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    placeholder="Message Description *"
                    rows={3}
                  />
                </div>

                <div className="fade-in-blur">
                  <select
                    value={announcementRole}
                    onChange={(e) => {
                      setAnnouncementRole(e.target.value);
                      setTeamLeaderOfRole("");
                      if (e.target.value !== "custom") {
                        clearUserSelection();
                      }
                    }}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  >
                    {getAdminRoleOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team Leader Of Selection */}
                {announcementRole === "team_leader" && (
                  <div className="space-y-2 fade-in-blur">
                    <label className="block text-sm font-medium text-gray-700">
                      Team Leader Of
                    </label>
                    <select
                      value={teamLeaderOfRole}
                      onChange={(e) => setTeamLeaderOfRole(e.target.value)}
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    >
                      <option value="">Select which team leaders...</option>
                      {getTeamLeaderOfOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      {teamLeaderOfRole === "all" 
                        ? "Will send to all team leaders regardless of their assigned team"
                        : `Will send only to team leaders of ${teamLeaderOfRole} team`}
                    </p>
                  </div>
                )}

                {/* Custom Selection UI */}
                {announcementRole === "custom" && (
                  <div className="space-y-3 fade-in-blur">
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          searchUsersByPersonalId(e.target.value);
                        }}
                        placeholder="Search by Personal ID or Volunteer ID..."
                        className="w-full border rounded-lg p-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg fade-in-blur">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => addUserToSelection(user)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-all duration-300 smooth-hover"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.volunteer_id ? `Vol ID: ${user.volunteer_id} | ` : ''}
                                  Personal ID: {user.personal_id}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {user.role?.replace('_', ' ') || 'No role'}
                                </p>
                              </div>
                              <Plus className="h-4 w-4 text-blue-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedUsers.length > 0 && (
                      <div className="fade-in-blur">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Selected Users ({selectedUsers.length})
                          </label>
                          <button
                            onClick={clearUserSelection}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto border rounded-lg bg-gray-50">
                          {(searchResults as UserProfileItem[]).filter(u => selectedUsers.includes(u.id)).map((user) => (
                            <div
                              key={user.id}
                              className="p-2 flex justify-between items-center border-b last:border-b-0"
                            >
                              <div>
                                <p className="text-sm text-gray-900">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ID: {user.personal_id} | {user.role}
                                </p>
                              </div>
                              <button
                                onClick={() => removeUserFromSelection(user.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
                <button
                  onClick={() => {
                    setAnnouncementModal(false);
                    clearUserSelection();
                    setTeamLeaderOfRole("");
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAnnouncementSubmit}
                  disabled={loading || (announcementRole === "team_leader" && !teamLeaderOfRole)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Sending...' : 'Send Announcement'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Session Detail Modal */}
        {sessionDetailModal && selectedSessionDetail && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                  <button
                    onClick={() => {
                      setSessionDetailModal(false);
                      setSelectedSessionDetail(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6 fade-in-blur">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedSessionDetail.title}</h3>
                    <p className="text-gray-600 mt-2">{selectedSessionDetail.description}</p>
                  </div>

                  {selectedSessionDetail.speaker && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Speaker</label>
                      <p className="text-gray-900">{selectedSessionDetail.speaker}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                    <p className="text-gray-900">
                      {new Date(selectedSessionDetail.start_time).toLocaleDateString()} at{' '}
                      {new Date(selectedSessionDetail.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {selectedSessionDetail.end_time && (
                      <p className="text-gray-500 text-sm">
                        Ends at {new Date(selectedSessionDetail.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="text-gray-900">{selectedSessionDetail.location}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedSessionDetail.session_type}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <p className="text-gray-900">
                      {selectedSessionDetail.current_bookings || 0} / {selectedSessionDetail.capacity || 'Unlimited'} booked
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200 fade-in-blur">
                    <button
                      onClick={() => setSessionDetailModal(false)}
                      className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-all duration-300 smooth-hover font-medium"
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

        {/* Company Detail Modal */}
        {companyDetailModal && selectedCompanyDetail && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
                  <button
                    onClick={() => {
                      setCompanyDetailModal(false);
                      setSelectedCompanyDetail(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6 fade-in-blur">
                  <div className="text-center">
                    <img 
                      src={selectedCompanyDetail.logo_url} 
                      alt={`${selectedCompanyDetail.name} logo`} 
                      className="h-24 w-auto mx-auto mb-4 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/96x96/orange/white?text=Logo";
                      }}
                    />
                    <h3 className="text-2xl font-bold text-gray-900">{selectedCompanyDetail.name}</h3>
                    {selectedCompanyDetail.booth_number && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 mt-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        Booth {selectedCompanyDetail.booth_number}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">About Company</label>
                    <p className="text-gray-700 leading-relaxed">{selectedCompanyDetail.description}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <a 
                      href={selectedCompanyDetail.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 break-all transition-colors"
                    >
                      {selectedCompanyDetail.website}
                    </a>
                  </div>

                  <div className="pt-4 space-y-3 fade-in-blur">
                    <button
                      onClick={() => window.open(selectedCompanyDetail.website, "_blank")}
                      className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-all duration-300 smooth-hover font-medium"
                    >
                      Visit Career Page
                    </button>
                    
                    <button
                      onClick={() => {
                        setCompanyDetailModal(false);
                        setSelectedCompanyDetail(null);
                      }}
                      className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-300 smooth-hover font-medium"
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

        {/* Edit Session Modal */}
        {editSessionModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <h3 className="text-2xl font-bold mb-4 fade-in-blur">Edit Session</h3>
              <div className="space-y-4 stagger-children">
                <input
                  type="text"
                  value={editSession.title}
                  onChange={(e) => setEditSession({ ...editSession, title: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Session Title *"
                />
                
                <textarea
                  value={editSession.description}
                  onChange={(e) => setEditSession({ ...editSession, description: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Session Description"
                  rows={3}
                />

                <select
                  value={editSession.type}
                  onChange={(e) => setEditSession({ ...editSession, type: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                >
                  <option value="session">Session</option>
                  <option value="mentorship">Mentorship</option>
                </select>

                <input
                  type="time"
                  value={editSession.hour}
                  onChange={(e) => setEditSession({ ...editSession, hour: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />

                <input
                  type="date"
                  value={editSession.date}
                  onChange={(e) => setEditSession({ ...editSession, date: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />

                <input
                  type="text"
                  value={editSession.speaker}
                  onChange={(e) => setEditSession({ ...editSession, speaker: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Speaker *"
                />

                <input
                  type="number"
                  value={editSession.capacity}
                  onChange={(e) => setEditSession({ ...editSession, capacity: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Capacity"
                />

                <input
                  type="text"
                  value={editSession.location}
                  onChange={(e) => setEditSession({ ...editSession, location: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="Session Location *"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
                <button
                  onClick={() => setEditSessionModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSessionUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Updating...' : 'Update Session'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Edit Event Modal */}
        {editEventModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <h3 className="text-2xl font-bold mb-4 fade-in-blur">Edit Event</h3>
              <div className="space-y-4 stagger-children">
                <input
                  type="text"
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder="Event Title *"
                />
                
                <textarea
                  value={editEvent.description}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder="Event Description"
                  rows={3}
                />

                <select
                  value={editEvent.type}
                  onChange={(e) => setEditEvent({ ...editEvent, type: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                >
                  <option value="general">General</option>
                  <option value="workshop">Workshop</option>
                  <option value="networking">Networking</option>
                  <option value="keynote">Keynote</option>
                  <option value="panel">Panel</option>
                </select>

                <div className="grid grid-cols-2 gap-3 fade-in-blur">
                  <input
                    type="date"
                    value={editEvent.startDate}
                    onChange={(e) => setEditEvent({ ...editEvent, startDate: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="Start Date *"
                  />
                  <input
                    type="time"
                    value={editEvent.startTime}
                    onChange={(e) => setEditEvent({ ...editEvent, startTime: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 fade-in-blur">
                  <input
                    type="date"
                    value={editEvent.endDate}
                    onChange={(e) => setEditEvent({ ...editEvent, endDate: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="End Date (Optional)"
                  />
                  <input
                    type="time"
                    value={editEvent.endTime}
                    onChange={(e) => setEditEvent({ ...editEvent, endTime: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <input
                  type="text"
                  value={editEvent.location}
                  onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  placeholder="Event Location"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
                <button
                  onClick={() => setEditEventModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEventUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

       {/* Edit Company Modal */}
{editCompanyModal && createPortal(
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
      <div className="flex items-center justify-between mb-6 fade-in-blur">
        <h3 className="text-2xl font-bold text-gray-900">Edit Company</h3>
        <button
          onClick={() => setEditCompanyModal(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="space-y-4 stagger-children">
        {/* Company Name */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={editCompany.name}
            onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="Enter company name"
          />
        </div>

        {/* Partner Type */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Partner Type *
          </label>
          <select
            value={editCompany.partnerType}
            onChange={(e) => setEditCompany({ ...editCompany, partnerType: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
          >
            <option value="">Select Partner Type</option>
            {PARTNER_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Logo Section */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Logo
          </label>
          <div className="flex space-x-4 mb-3">
            <button
              type="button"
              onClick={() => setEditCompany({ ...editCompany, logoType: "link" })}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                editCompany.logoType === "link" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Link className="h-4 w-4 mr-2" />
              URL
            </button>
            <button
              type="button"
              onClick={() => setEditCompany({ ...editCompany, logoType: "upload" })}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                editCompany.logoType === "upload" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New
            </button>
          </div>
          
          {editCompany.logoType === "link" ? (
            <input
              type="url"
              value={editCompany.logoUrl}
              onChange={(e) => setEditCompany({ ...editCompany, logoUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
              placeholder="https://example.com/logo.png"
            />
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditCompany({ ...editCompany, logo: e.target.files?.[0] || null })}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep current logo
              </p>
            </div>
          )}
          
          {editCompany.logoUrl && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg fade-in-blur">
              <p className="text-sm text-gray-600 mb-2">Current Logo:</p>
              <img 
                src={editCompany.logoUrl} 
                alt="Current logo" 
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/64x64/orange/white?text=Logo";
                }}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={editCompany.description}
            onChange={(e) => setEditCompany({ ...editCompany, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="Brief description about the company..."
            rows={3}
          />
        </div>

        {/* Website */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website *
          </label>
          <input
            type="url"
            value={editCompany.website}
            onChange={(e) => setEditCompany({ ...editCompany, website: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="https://company-website.com"
          />
        </div>

        {/* Booth Number */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Booth Number *
          </label>
          <input
            type="text"
            value={editCompany.boothNumber}
            onChange={(e) => setEditCompany({ ...editCompany, boothNumber: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="e.g., A-12, B-05"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
        <button
          onClick={() => setEditCompanyModal(false)}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleCompanyUpdate}
          disabled={loading}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all duration-300 smooth-hover font-medium"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating...
            </div>
          ) : (
            'Update Company'
          )}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}

{/* Add Company Modal */}
{companyModal && createPortal(
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
      <div className="flex items-center justify-between mb-6 fade-in-blur">
        <h3 className="text-2xl font-bold text-gray-900">Add New Company</h3>
        <button
          onClick={() => setCompanyModal(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="space-y-4 stagger-children">
        {/* Company Name */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            value={newCompany.name}
            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="Enter company name"
          />
        </div>

        {/* Partner Type */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Partner Type *
          </label>
          <select
            value={newCompany.partnerType}
            onChange={(e) => setNewCompany({ ...newCompany, partnerType: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
          >
            <option value="">Select Partner Type</option>
            {PARTNER_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Logo Section */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Logo *
          </label>
          <div className="flex space-x-4 mb-3">
            <button
              type="button"
              onClick={() => setNewCompany({ ...newCompany, logoType: "link" })}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                newCompany.logoType === "link" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Link className="h-4 w-4 mr-2" />
              URL
            </button>
            <button
              type="button"
              onClick={() => setNewCompany({ ...newCompany, logoType: "upload" })}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
                newCompany.logoType === "upload" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </button>
          </div>
          
          {newCompany.logoType === "link" ? (
            <input
              type="url"
              value={newCompany.logoUrl}
              onChange={(e) => setNewCompany({ ...newCompany, logoUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
              placeholder="https://example.com/logo.png"
            />
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewCompany({ ...newCompany, logo: e.target.files?.[0] || null })}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PNG, JPG, SVG. Max size: 5MB
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={newCompany.description}
            onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="Brief description about the company..."
            rows={3}
          />
        </div>

        {/* Website */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website *
          </label>
          <input
            type="url"
            value={newCompany.website}
            onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="https://company-website.com"
          />
        </div>

        {/* Booth Number */}
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Booth Number *
          </label>
          <input
            type="text"
            value={newCompany.boothNumber}
            onChange={(e) => setNewCompany({ ...newCompany, boothNumber: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            placeholder="e.g., A-12, B-05"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
        <button
          onClick={() => setCompanyModal(false)}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleCompanySubmit}
          disabled={loading}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all duration-300 smooth-hover font-medium"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Adding...
            </div>
          ) : (
            'Add Company'
          )}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}

        {/* Event Detail Modal */}
        {eventDetailModal && selectedEventDetail && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h2 className="text-xl font-bold text-gray-900">Event Details</h2>
                  <button
                    onClick={() => {
                      setEventDetailModal(false);
                      setSelectedEventDetail(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6 fade-in-blur">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedEventDetail.title}</h3>
                    <p className="text-gray-600 mt-2">{selectedEventDetail.description}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                    <p className="text-gray-900">
                      {new Date(selectedEventDetail.start_time).toLocaleDateString()} at{' '}
                      {new Date(selectedEventDetail.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {selectedEventDetail.end_time && (
                      <p className="text-gray-500 text-sm">
                        Ends at {new Date(selectedEventDetail.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="text-gray-900">{selectedEventDetail.location || 'Not specified'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {selectedEventDetail.item_type}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-200 fade-in-blur">
                    <button
                      onClick={() => setEventDetailModal(false)}
                      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-300 smooth-hover font-medium"
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

        {/* Delete Company Confirmation Modal */}
        {deleteCompanyModal && selectedCompanyDelete && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md modal-content-blur fade-in-up-blur">
              <h3 className="text-xl font-bold mb-4 text-red-600 fade-in-blur">Delete Company</h3>
              <p className="text-gray-700 mb-6 fade-in-blur">
                Are you sure you want to delete <strong>{selectedCompanyDelete.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3 fade-in-blur">
                <button
                  onClick={() => {
                    setDeleteCompanyModal(false);
                    setSelectedCompanyDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCompany}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Deleting...' : 'Delete Company'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Delete Session Confirmation Modal */}
        {deleteSessionModal && selectedSessionDelete && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md modal-content-blur fade-in-up-blur">
              <h3 className="text-xl font-bold mb-4 text-red-600 fade-in-blur">Delete Session</h3>
              <p className="text-gray-700 mb-6 fade-in-blur">
                Are you sure you want to delete the session <strong>"{selectedSessionDelete.title}"</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3 fade-in-blur">
                <button
                  onClick={() => {
                    setDeleteSessionModal(false);
                    setSelectedSessionDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSession}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Deleting...' : 'Delete Session'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Delete Event Confirmation Modal */}
        {deleteEventModal && selectedEventDelete && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md modal-content-blur fade-in-up-blur">
              <h3 className="text-xl font-bold mb-4 text-red-600 fade-in-blur">Delete Event</h3>
              <p className="text-gray-700 mb-6 fade-in-blur">
                Are you sure you want to delete the event <strong>"{selectedEventDelete.title}"</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3 fade-in-blur">
                <button
                  onClick={() => {
                    setDeleteEventModal(false);
                    setSelectedEventDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
                >
                  {loading ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      <style>{`
        .fade-in-blur {
          animation: fadeInBlur 0.5s ease-out forwards;
        }

        .fade-in-up-blur {
          animation: fadeInUpBlur 0.5s ease-out forwards;
        }

        .modal-backdrop-blur {
          backdrop-filter: blur(8px);
        }

        .modal-content-blur {
          backdrop-filter: blur(20px);
        }

        .card-hover {
          transition: all 0.3s ease;
        }

        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .smooth-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dashboard-card {
          border: 1px solid rgba(255, 165, 0, 0.1);
        }

        .stagger-children > * {
          animation: fadeInUpBlur 0.5s ease-out forwards;
        }

        .stagger-children > *:nth-child(1) { animation-delay: 0.1s; }
        .stagger-children > *:nth-child(2) { animation-delay: 0.2s; }
        .stagger-children > *:nth-child(3) { animation-delay: 0.3s; }
        .stagger-children > *:nth-child(4) { animation-delay: 0.4s; }
        .stagger-children > *:nth-child(5) { animation-delay: 0.5s; }

        @keyframes fadeInBlur {
          0% {
            opacity: 0;
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes fadeInUpBlur {
          0% {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

export default AdminPanel;
