import { useState, useEffect } from "react";
import {
  Users,
  Activity,
  Building,
  Calendar,
  Megaphone,
  XCircle,
  CheckCircle2,
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
  BarChart3
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { supabase, uploadFile, getDynamicBuildingStats, deleteCompany } from "../../lib/supabase";

export function AdminPanel() {
  const [deleteCompanyModal, setDeleteCompanyModal] = useState(false);
  const [selectedCompanyDelete, setSelectedCompanyDelete] = useState(null);
  const [stats, setStats] = useState({ total_users: 0, total_sessions: 0 });
  const [buildingStats, setBuildingStats] = useState({
    inside_building: 0,
    inside_event: 0,
    total_attendees: 0
  });
  const [deleteSessionModal, setDeleteSessionModal] = useState(false);
  const [deleteEventModal, setDeleteEventModal] = useState(false);
  const [selectedSessionDelete, setSelectedSessionDelete] = useState(null);
  const [selectedEventDelete, setSelectedEventDelete] = useState(null);
  const [editSessionModal, setEditSessionModal] = useState(false);
  const [editEventModal, setEditEventModal] = useState(false);
  const [selectedSessionEdit, setSelectedSessionEdit] = useState(null);
  const [selectedEventEdit, setSelectedEventEdit] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [activeDay, setActiveDay] = useState(1);
  const [mapImages, setMapImages] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [companyModal, setCompanyModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const [mapModal, setMapModal] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [sessionDetailModal, setSessionDetailModal] = useState(false);
  const [companyDetailModal, setCompanyDetailModal] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementRole, setAnnouncementRole] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editCompanyModal, setEditCompanyModal] = useState(false);
  const [selectedCompanyEdit, setSelectedCompanyEdit] = useState(null);
  const [eventDetailModal, setEventDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  
  const announcementRoleOptions = [
    { value: "", label: "Select Target" },
    { value: "all", label: "All Users" },
    { value: "volunteer", label: "Volunteers" },
    { value: "team_leader", label: "Team Leaders" },
    { value: "admin", label: "Admins" },
    { value: "attendee", label: "Attendees" },
    { value: "custom", label: "Custom Selection" }
  ];
  
  const [editCompany, setEditCompany] = useState({
    id: "",
    name: "",
    logo: null,
    logoUrl: "",
    logoType: "link",
    description: "",
    website: "",
    boothNumber: "",
  });

  const [editSession, setEditSession] = useState({
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

  const [editEvent, setEditEvent] = useState({
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
  
  const [newCompany, setNewCompany] = useState({
    name: "",
    logo: null,
    logoUrl: "",
    logoType: "link",
    description: "",
    website: "",
    boothNumber: "",
  });

  const [newSession, setNewSession] = useState({
    title: "",
    date: "",
    speaker: "",
    capacity: "",
    type: "session",
    hour: "",
    location: "",
    description: "",
  });

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "general",
  });

  const [mapForm, setMapForm] = useState({
    day: 1,
    image: null
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [announcement, setAnnouncement] = useState({
    message: "",
    type: null,
  });

  // Enhanced statistics state
  const [enhancedStats, setEnhancedStats] = useState({
    eventGenderRatio: { male: 0, female: 0 },
    eventFaculties: [],
    eventUniversities: [],
    eventDegreeLevel: { student: 0, graduate: 0 },
    eventStudentGraduateRatio: { student: 0, graduate: 0 }
  });

  const showNotification = (message, type) => {
    setAnnouncement({ message, type });
    setTimeout(() => {
      setAnnouncement({ message: "", type: null });
    }, 4000);
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

    // Get count of attendees
    const { count: totalAttendees } = await supabase
      .from("users_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "attendee");

    // Get count of volunteers (all roles except admin and attendee)
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
  // NEW: Fetch enhanced statistics for inside event
  const fetchEnhancedStatistics = async () => {
    try {
      // Get users currently inside the event
      const { data: eventUsers, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('event_entry', true)
        .eq('role', 'attendee');

      if (error) throw error;

      if (eventUsers && eventUsers.length > 0) {
        // Calculate gender ratio
        const genderStats = { male: 0, female: 0 };
        const facultiesCount = {};
        const universitiesCount = {};
        const degreeLevelStats = { student: 0, graduate: 0 };
        const studentGraduateStats = { student: 0, graduate: 0 };

        eventUsers.forEach(user => {
          // Gender stats
          if (user.gender === 'male') genderStats.male++;
          else if (user.gender === 'female') genderStats.female++;

          // Faculty stats
          if (user.faculty) {
            facultiesCount[user.faculty] = (facultiesCount[user.faculty] || 0) + 1;
          }

          // University stats
          if (user.university) {
            universitiesCount[user.university] = (universitiesCount[user.university] || 0) + 1;
          }

          // Degree level stats
          if (user.degree_level === 'student') {
            degreeLevelStats.student++;
            studentGraduateStats.student++;
          } else if (user.degree_level === 'graduate') {
            degreeLevelStats.graduate++;
            studentGraduateStats.graduate++;
          }
        });

        // Convert to arrays and sort
        const topFaculties = Object.entries(facultiesCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const topUniversities = Object.entries(universitiesCount)
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

  const handleEditSession = (session) => {
    setSelectedSessionEdit(session);
    const startTime = new Date(session.start_time);
    setEditSession({
      id: session.id,
      title: session.title || "",
      description: session.description || "",
      speaker: session.speaker || "",
      capacity: session.max_attendees || "",
      type: session.session_type || "session",
      date: startTime.toISOString().split('T')[0],
      hour: startTime.toTimeString().slice(0, 5),
      location: session.location || "",
    });
    setEditSessionModal(true);
  };

  const handleEditEvent = (event) => {
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

  const handleEventClick = (event) => {
    setSelectedEventDetail(event);
    setEventDetailModal(true);
  };

  const handleSessionUpdate = async () => {
    if (!editSession.title || !editSession.date || !editSession.speaker) {
      showNotification("Please fill all required fields!", "error");
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${editSession.date}T${editSession.hour}`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      const capacityValue = parseInt(editSession.capacity) || null;

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
        showNotification("Failed to update session", "error");
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
        showNotification("Session updated successfully!", "success");
        await fetchSessions();
      }
    } catch (err) {
      showNotification("Failed to update session", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = async () => {
    if (!editEvent.title || !editEvent.startDate || !editEvent.startTime) {
      showNotification("Please fill all required fields!", "error");
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
        showNotification("Failed to update event", "error");
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
        showNotification("Event updated successfully!", "success");
        await fetchEventsByDay(activeDay);
      }
    } catch (err) {
      showNotification("Failed to update event", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = (company) => {
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
    });
    setEditCompanyModal(true);
  };

  // Reusable Stat Card Component
  const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
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
  const GenderChart = ({ data, title = "Gender Distribution" }) => {
    const total = data.male + data.female;
    const malePercentage = total > 0 ? (data.male / total) * 100 : 0;
    const femalePercentage = total > 0 ? (data.female / total) * 100 : 0;

    return (
      <div className="space-y-2">
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
  const RoleChart = ({ data }) => {
    const roles = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = roles.reduce((sum, [_, count]) => sum + count, 0);

    return (
      <div className="space-y-3">
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
  const BarChart = ({ data, color, title }) => {
    const maxCount = Math.max(...data.map(item => item.count), 1);
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };

    return (
      <div className="space-y-3">
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
  const MarketingChart = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
      <div className="space-y-3">
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
  const DegreeChart = ({ data, title = "Degree Level" }) => {
    const total = data.student + data.graduate;
    const studentPercentage = total > 0 ? (data.student / total) * 100 : 0;
    const graduatePercentage = total > 0 ? (data.graduate / total) * 100 : 0;

    return (
      <div className="space-y-4">
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
      showNotification("Please fill all required fields!", "error");
      return;
    }

    if (editCompany.logoType === "link" && !editCompany.logoUrl) {
      showNotification("Please provide a logo URL!", "error");
      return;
    }

    if (editCompany.logoType === "upload" && !editCompany.logo) {
      showNotification("Please select a logo file to upload!", "error");
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
          showNotification("Failed to upload logo", "error");
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
      }).eq('id', editCompany.id);

      if (error) {
        showNotification("Failed to update company", "error");
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
        });
        showNotification("Company updated successfully!", "success");
        await fetchCompanies();
      }
    } catch (err) {
      showNotification("Failed to update company", "error");
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
        showNotification("Failed to delete session", "error");
      } else {
        setDeleteSessionModal(false);
        setSelectedSessionDelete(null);
        showNotification("Session deleted successfully!", "success");
        await fetchSessions();
      }
    } catch (err) {
      showNotification("Failed to delete session", "error");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced StatisticsTab Component with Inside Event Stats
  const StatisticsTab = () => {
    const [statsData, setStatsData] = useState({
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

    const fetchRegistrationStats = async () => {
      let dateFilter = {};
      if (timeRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateFilter = { created_at: `gte.${today.toISOString()}` };
      } else if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { created_at: `gte.${weekAgo.toISOString()}` };
      }

      let query = supabase
        .from('users_profiles')
        .select('*');

      if (dateFilter.created_at) {
        query = query.gte('created_at', dateFilter.created_at.replace('gte.', ''));
      }

      const { data: users, error } = await query;

      if (error) throw error;

      const stats = processUserStatistics(users || []);
      setStatsData(stats);
    };

    const fetchEventStats = async () => {
      try {
        // Calculate date range for the selected day (today is day 1)
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch attendance data for the selected day
        const { data: attendances, error } = await supabase
          .from('attendances')
          .select('*')
          .gte('scanned_at', startOfDay.toISOString())
          .lte('scanned_at', endOfDay.toISOString());

        if (error) throw error;

        // Process event statistics
        const dayStats = processEventStatistics(attendances || []);
        
        // Update statsData with the new event stats
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

    const processUserStatistics = (users) => {
      const stats = {
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

      const universityCount = {};
      const facultyCount = {};
      const roleCount = {};
      const marketingCount = {};
      const classYearCount = {};

      users.forEach(user => {
        if (user.degree_level === 'graduate') {
          stats.graduates++;
        } else if (user.degree_level === 'student') {
          stats.students++;
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

      stats.universities = Object.entries(universityCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      stats.faculties = Object.entries(facultyCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      stats.roleStats = roleCount;
      stats.marketingSources = Object.entries(marketingCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      stats.classYearStats = classYearCount;

      return stats;
    };

    const processEventStatistics = (attendances) => {
      const dayStats = {
        entries: attendances.filter(a => a.scan_type === 'entry').length,
        exits: attendances.filter(a => a.scan_type === 'exit').length,
        building_entries: attendances.filter(a => a.scan_type === 'building_entry').length,
        building_exits: attendances.filter(a => a.scan_type === 'building_exit').length,
        session_entries: attendances.filter(a => a.scan_type === 'session_entry').length,
        registrations: 0
      };

      return dayStats;
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Stats Type and Time Range Filter */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatsType('registration')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statsType === 'registration' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Registration
            </button>
            <button
              onClick={() => setStatsType('event')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'all' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${statsType === 'event' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              All Time
            </button>
          </div>

          {statsType === 'event' && (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Inside Event Statistics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inside Event Statistics</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <GenderChart 
                data={enhancedStats.eventGenderRatio} 
                title="Gender Ratio Inside Event"
              />
            </div>
            <div>
              <DegreeChart 
                data={enhancedStats.eventStudentGraduateRatio}
                title="Student/Graduate Ratio Inside Event"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <BarChart 
                data={enhancedStats.eventFaculties} 
                color="blue"
                title="Top Faculties Inside Event"
              />
            </div>
            <div>
              <BarChart 
                data={enhancedStats.eventUniversities} 
                color="green"
                title="Top Universities Inside Event"
              />
            </div>
          </div>
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
const RegistrationStatsView = ({ statsData }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
        <GenderChart data={statsData.genderStats} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
        <RoleChart data={statsData.roleStats} />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Universities</h3>
        <BarChart data={statsData.universities} color="blue" title="" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Faculties</h3>
        <BarChart data={statsData.faculties} color="green" title="" />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Marketing Sources</h3>
        <MarketingChart data={statsData.marketingSources} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Degree Level</h3>
        <DegreeChart data={statsData.degreeLevelStats} />
      </div>
    </div>
  </div>
);

  // Event Stats View Component
// Event Stats View Component
const EventStatsView = ({ statsData, selectedDay }) => {
  const dayStats = statsData?.eventStats?.[`day${selectedDay}`] || {
    entries: 0,
    exits: 0,
    building_entries: 0,
    building_exits: 0,
    session_entries: 0,
    registrations: 0
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={`Day ${selectedDay} Entries`}
          value={dayStats.entries}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title={`Day ${selectedDay} Exits`}
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

      {/* Inside Event Statistics for Event Tab */}
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inside Event Statistics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <GenderChart 
              data={enhancedStats.eventGenderRatio} 
              title="Gender Ratio Inside Event"
            />
          </div>
          <div>
            <DegreeChart 
              data={enhancedStats.eventStudentGraduateRatio}
              title="Student/Graduate Ratio Inside Event"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div>
            <BarChart 
              data={enhancedStats.eventFaculties} 
              color="blue"
              title="Top Faculties Inside Event"
            />
          </div>
          <div>
            <BarChart 
              data={enhancedStats.eventUniversities} 
              color="green"
              title="Top Universities Inside Event"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
          <DailyActivityChart selectedDay={selectedDay} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Flow</h3>
          <AttendanceFlowChart dayStats={dayStats} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Popularity</h3>
        <SessionPopularityChart selectedDay={selectedDay} />
      </div>
    </div>
  );
};
  // Current State Widget
  const CurrentStateWidget = ({ statsData }) => (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
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
                <td className="px-4 py-3 text-red-600">500</td>
                <td className="px-4 py-3">{statsData.currentInBuilding}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    statsData.currentInBuilding < 400 
                      ? 'bg-green-100 text-green-800' 
                      : statsData.currentInBuilding < 450 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {statsData.currentInBuilding > 0 ? Math.round((statsData.currentInBuilding / 500) * 100) : 0}%
                  </span>
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-3">Event</td>
                <td className="px-4 py-3 text-red-600">4000</td>
                <td className="px-4 py-3">{statsData.currentInEvent}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    statsData.currentInEvent < 3000 
                      ? 'bg-green-100 text-green-800' 
                      : statsData.currentInEvent < 3500 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {statsData.currentInEvent > 0 ? Math.round((statsData.currentInEvent / 4000) * 100) : 0}%
                  </span>
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-3">Total Capacity</td>
                <td className="px-4 py-3 text-red-600">4500</td>
                <td className="px-4 py-3">{statsData.currentInBuilding + statsData.currentInEvent}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    (statsData.currentInBuilding + statsData.currentInEvent) < 3500 
                      ? 'bg-green-100 text-green-800' 
                      : (statsData.currentInBuilding + statsData.currentInEvent) < 4000 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(statsData.currentInBuilding + statsData.currentInEvent) > 0 ? Math.round(((statsData.currentInBuilding + statsData.currentInEvent) / 4500) * 100) : 0}%
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
  const DailyActivityChart = ({ selectedDay }) => {
    // Real data fetch for daily activity
    const [dailyData, setDailyData] = useState([]);

    useEffect(() => {
      fetchDailyActivity(selectedDay);
    }, [selectedDay]);

    const fetchDailyActivity = async (day) => {
      try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: attendances, error } = await supabase
          .from('attendances')
          .select('*')
          .gte('scanned_at', startOfDay.toISOString())
          .lte('scanned_at', endOfDay.toISOString())
          .order('scanned_at', { ascending: true });

        if (error) throw error;

        // Process data by hour
        const hourlyData = {};
        attendances.forEach(attendance => {
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

        const processedData = Object.entries(hourlyData)
          .map(([hour, data]) => ({
            hour,
            entries: data.entries,
            exits: data.exits
          }))
          .sort((a, b) => a.hour.localeCompare(b.hour));

        setDailyData(processedData);
      } catch (error) {
        console.error('Error fetching daily activity:', error);
        setDailyData([]);
      }
    };

    const maxValue = Math.max(...dailyData.flatMap(d => [d.entries, d.exits]), 1);

    return (
      <div className="space-y-4">
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

  const AttendanceFlowChart = ({ dayStats }) => {
    const flowData = [
      { label: 'Total Entries', value: dayStats.entries, color: 'bg-green-500' },
      { label: 'Total Exits', value: dayStats.exits, color: 'bg-red-500' },
      { label: 'Building Entries', value: dayStats.building_entries, color: 'bg-blue-500' },
      { label: 'Session Entries', value: dayStats.session_entries, color: 'bg-purple-500' },
    ];

    const maxValue = Math.max(...flowData.map(d => d.value), 1);

    return (
      <div className="space-y-3">
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

  const SessionPopularityChart = ({ selectedDay }) => {
    const [sessionData, setSessionData] = useState([]);

    useEffect(() => {
      fetchSessionPopularity(selectedDay);
    }, [selectedDay]);

    const fetchSessionPopularity = async (day) => {
      try {
        // Get sessions for the selected day
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('id, title, max_attendees, current_bookings')
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
      <div className="space-y-3">
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
        showNotification("Failed to delete event", "error");
      } else {
        setDeleteEventModal(false);
        setSelectedEventDelete(null);
        showNotification("Event deleted successfully!", "success");
        await fetchEventsByDay(activeDay);
      }
    } catch (err) {
      showNotification("Failed to delete event", "error");
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

  const fetchEventsByDay = async (day) => {
    try {
      const { data, error } = await supabase
        .from("schedule_items")
        .select("*")
        .order("start_time", { ascending: true });

      if (!error && data) {
        const filteredData = data.filter((item) => {
          const itemDay = getDayFromDate(item.start_time);
          return itemDay === day;
        });
        setEvents(filteredData);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const getDayFromDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(5, diffDays + 1));
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
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
      showNotification("Please fill all required fields!", "error");
      return;
    }

    if (newCompany.logoType === "link" && !newCompany.logoUrl) {
      showNotification("Please provide a logo URL!", "error");
      return;
    }

    if (newCompany.logoType === "upload" && !newCompany.logo) {
      showNotification("Please select a logo file to upload!", "error");
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
          showNotification("Failed to upload logo", "error");
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
      });

      if (error) {
        showNotification("Failed to add company", "error");
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
        });
        showNotification("Company added successfully!", "success");
        await fetchCompanies();
      }
    } catch (err) {
      showNotification("Failed to add company", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Session Submit
  const handleSessionSubmit = async () => {
    if (!newSession.title || !newSession.date || !newSession.speaker) {
      showNotification("Please fill all required fields!", "error");
      return;
    }

    setLoading(true);
    try {
      const startDateTime = new Date(`${newSession.date}T${newSession.hour}`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
      const capacityValue = parseInt(newSession.capacity) || null;

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
        showNotification("Failed to add session", "error");
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
        showNotification("Session added successfully!", "success");
        await fetchSessions();
      }
    } catch (err) {
      showNotification("Failed to add session", "error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteCompanyModal = (company) => {
    setSelectedCompanyDelete(company);
    setDeleteCompanyModal(true);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyDelete) return;
    
    setLoading(true);
    try {
      const { error } = await deleteCompany(selectedCompanyDelete.id);
      
      if (error) {
        showNotification("Failed to delete company", "error");
      } else {
        setDeleteCompanyModal(false);
        setSelectedCompanyDelete(null);
        showNotification("Company deleted successfully!", "success");
        await fetchCompanies();
      }
    } catch (err) {
      showNotification("Failed to delete company", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Event Submit
  const handleEventSubmit = async () => {
    if (!newEvent.title || !newEvent.startDate || !newEvent.startTime) {
      showNotification("Please fill all required fields!", "error");
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
        showNotification("Failed to add event", "error");
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
        showNotification("Event added successfully!", "success");
        await fetchEventsByDay(activeDay);
      }
    } catch (err) {
      showNotification("Failed to add event", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (session) => {
    setSelectedSessionDelete(session);
    setDeleteSessionModal(true);
  };

  const handleDeleteEvent = async (event) => {
    setSelectedEventDelete(event);
    setDeleteEventModal(true);
  };

  // Handle Announcement Submit
  const handleAnnouncementSubmit = async () => {
    if (!announcementTitle || !announcementDescription || !announcementRole) {
      showNotification("Please fill all required fields!", "error");
      return;
    }

    if (announcementRole === "custom" && selectedUsers.length === 0) {
      showNotification("Please select at least one user for custom notifications!", "error");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        showNotification("User not authenticated", "error");
        setLoading(false);
        return;
      }

      let notificationData = {
        title: announcementTitle,
        message: announcementDescription,
        created_by: session.user.id
      };

      if (announcementRole === "all") {
        notificationData.target_type = 'all';
        notificationData.target_role = null;
        notificationData.target_user_ids = null;
      } 
      else if (announcementRole === "custom") {
        notificationData.target_type = 'specific_users';
        notificationData.target_role = null;
        notificationData.target_user_ids = selectedUsers.map(user => user.id);
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
        showNotification("Failed to send announcement", "error");
      } else {
        showNotification("Announcement sent successfully!", "success");
        setAnnouncementTitle("");
        setAnnouncementDescription("");
        setAnnouncementRole("");
        clearUserSelection();
        setAnnouncementModal(false);
      }
    } catch (err) {
      console.error('Send announcement error:', err);
      showNotification("Failed to send announcement", "error");
    } finally {
      setLoading(false);
    }
  };

  const searchUsersByPersonalId = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('id, first_name, last_name, personal_id, role, email')
        .ilike('personal_id', `%${searchTerm.trim()}%`)
        .order('personal_id')
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } else {
        const filteredResults = (data || []).filter(user => 
          !selectedUsers.some(selected => selected.id === user.id)
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

  const addUserToSelection = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchResults(prev => prev.filter(result => result.id !== user.id));
    setUserSearch("");
  };

  const removeUserFromSelection = (userId) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const clearUserSelection = () => {
    setSelectedUsers([]);
    setUserSearch("");
    setSearchResults([]);
  };

  const handleSessionClick = (session) => {
    setSelectedSessionDetail(session);
    setSessionDetailModal(true);
  };

  const handleCompanyClick = (company) => {
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
      showNotification("Please select an image!", "error");
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
        showNotification("Failed to upload map image", "error");
      } else {
        showNotification(`Day ${mapForm.day} map updated successfully!`, "success");
        initializeMapImages();
        setMapModal(false);
        setMapForm({ day: 1, image: null });
      }
    } catch (err) {
      console.error("Map upload exception:", err);
      showNotification("Failed to update map", "error");
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
    { key: "employers", label: "Employers" },
  ];

  if (loadingData) {
    return (
      <DashboardLayout title="Admin Panel" subtitle="System administration, user management, and analytics">
        <div className="flex items-center justify-center h-64">
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
      <div className="space-y-8">
        {/* Notification */}
        {announcement.type && (
          <div
            className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 p-4 rounded-lg shadow-lg text-white ${
              announcement.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {announcement.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span>{announcement.message}</span>
          </div>
        )}

        {/* Tabs */}
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

       {/* Dashboard Tab */}
{activeTab === "dashboard" && (
  <div className="space-y-8">
    {/* Quick Actions - Moved to Top */}
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 text-center">
      <h1 className="text-3xl font-bold text-black-800 flex items-center justify-center gap-2 mb-6">
        <Sparkles className="h-7 w-7 text-orange-500" />
        Quick Actions
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setCompanyModal(true)}
          className="flex flex-col items-center justify-center py-6 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
        >
          <Building className="h-8 w-8 mb-2" />
          <span className="text-base font-medium">Add Company</span>
        </button>

        <button
          onClick={() => setSessionModal(true)}
          className="flex flex-col items-center justify-center py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Calendar className="h-8 w-8 mb-2" />
          <span className="text-base font-medium">Add Session</span>
        </button>

        <button
          onClick={() => setAnnouncementModal(true)}
          className="flex flex-col items-center justify-center py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <Megaphone className="h-8 w-8 mb-2" />
          <span className="text-base font-medium">Send Announcement</span>
        </button>
      </div>
    </div>

    {/* Stats Cards - Moved to Bottom */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
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

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Attendees</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.total_attendees || 0}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Volunteers</p>
            <p className="text-3xl font-bold text-green-600">
              {stats?.total_volunteers || 0}
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
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0">
                <Calendar className="h-5 w-5 mr-2 text-orange-600" /> Sessions Management
              </h2>
              <button
                onClick={() => setSessionModal(true)}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-all duration-200"
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
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Eye className="h-3 w-3 mr-1 inline" />
                      View
                    </button>
                    <button
                      onClick={() => handleEditSession(session)}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session)}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
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
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4">
                <Calendar className="h-5 w-5 mr-2 text-orange-600" /> Events Management
              </h2>
              
              <div className="flex space-x-2 mb-4">
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
              
              <button
                onClick={() => setEventModal(true)}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
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
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Eye className="h-3 w-3 mr-1 inline" />
                      View
                    </button>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event)}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
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
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Event Maps</h2>
              
              <div className="flex space-x-2 mb-4">
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
            
            <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-center items-center min-h-[400px]">
              {mapLoading && (
                <div className="flex flex-col items-center justify-center">
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
                  e.target.src = "/src/Assets/placeholder-map.png";
                }}
              />
            </div>
          </div>
        )}

        {/* Employers Tab */}
        {activeTab === "employers" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0">
                <Building className="h-5 w-5 mr-2 text-orange-600" /> Employers Management
              </h2>
              <button
                onClick={() => setCompanyModal(true)}
                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div 
                  key={company.id} 
                  className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="text-center">
                    <img 
                      src={company.logo_url} 
                      alt={`${company.name} logo`} 
                      className="h-16 w-auto mx-auto mb-4 object-contain"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/64x64/orange/white?text=Logo";
                      }}
                    />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{company.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{company.description}</p>
                    
                    {company.booth_number && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-4">
                        Booth {company.booth_number}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleCompanyClick(company)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        <Eye className="h-3 w-3 mr-1 inline" />
                        View
                      </button>
                      <button
                        onClick={() => handleEditCompany(company)}
                        className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteCompanyModal(company)}
                        className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
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
        )}

        {/* All Modals remain the same as in your original code */}
        {/* Company Modal */}
        {companyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Add New Company</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Company Name *"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo *</label>
                  <div className="flex space-x-4 mb-3">
                    <button
                      type="button"
                      onClick={() => setNewCompany({ ...newCompany, logoType: "link" })}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                        newCompany.logoType === "link" 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCompany({ ...newCompany, logoType: "upload" })}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                        newCompany.logoType === "upload" 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-700"
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
                      className="w-full border rounded-lg p-2"
                      placeholder="Logo URL *"
                    />
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewCompany({ ...newCompany, logo: e.target.files?.[0] || null })}
                      className="w-full border rounded-lg p-2"
                    />
                  )}
                </div>
                
                <textarea
                  value={newCompany.description}
                  onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Description"
                  rows={3}
                />
                <input
                  type="url"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Website *"
                />
                <input
                  type="text"
                  value={newCompany.boothNumber}
                  onChange={(e) => setNewCompany({ ...newCompany, boothNumber: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Booth Number *"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCompanyModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompanySubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Company'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Modal */}
        {sessionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Add Session</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Session Title *"
                />
                
                <textarea
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Session Description"
                  rows={3}
                />

                <select
                  value={newSession.type}
                  onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="session">Session</option>
                  <option value="mentorship">Mentorship</option>
                </select>

                <input
                  type="time"
                  value={newSession.hour}
                  onChange={(e) => setNewSession({ ...newSession, hour: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />

                <input
                  type="date"
                  value={newSession.date}
                  onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />

                <input
                  type="text"
                  value={newSession.speaker}
                  onChange={(e) => setNewSession({ ...newSession, speaker: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Speaker *"
                />

                <input
                  type="number"
                  value={newSession.capacity}
                  onChange={(e) => setNewSession({ ...newSession, capacity: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Capacity"
                />

                <input
                  type="text"
                  value={newSession.location}
                  onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Session Location *"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSessionModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSessionSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Session'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Modal */}
        {eventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Add Event</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Event Title *"
                />
                
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Event Description"
                  rows={3}
                />

                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="general">General</option>
                  <option value="workshop">Workshop</option>
                  <option value="networking">Networking</option>
                  <option value="keynote">Keynote</option>
                  <option value="panel">Panel</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="Start Date *"
                  />
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="End Date (Optional)"
                  />
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Event Location"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEventModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEventSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Upload Modal */}
        {mapModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-2xl font-bold mb-4">Modify Map</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                  <select
                    value={mapForm.day}
                    onChange={(e) => setMapForm({ ...mapForm, day: parseInt(e.target.value) })}
                    className="w-full border rounded-lg p-2"
                  >
                    {[1, 2, 3, 4, 5].map(day => (
                      <option key={day} value={day}>Day {day}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Map Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setMapForm({ ...mapForm, image: e.target.files?.[0] || null })}
                    className="w-full border rounded-lg p-2"
                  />
                  
                  {mapForm.image && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
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

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setMapModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMapUpload}
                  disabled={loading || !mapForm.image}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Update Map'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcement Modal */}
        {announcementModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => {
                  setAnnouncementModal(false);
                  clearUserSelection();
                }}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>

              <h2 className="text-lg font-semibold text-black mb-4 text-center">
                Send Announcement
              </h2>

              <div className="space-y-4">
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Message Title"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />

                <textarea
                  value={announcementDescription}
                  onChange={(e) => setAnnouncementDescription(e.target.value)}
                  placeholder="Message Description"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                />

                <select
                  value={announcementRole}
                  onChange={(e) => {
                    setAnnouncementRole(e.target.value);
                    if (e.target.value !== "custom") {
                      clearUserSelection();
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select Target</option>
                  <option value="all">All Users</option>
                  <option value="volunteer">Volunteers</option>
                  <option value="team_leader">Team Leaders</option>
                  <option value="admin">Admins</option>
                  <option value="attendee">Attendees</option>
                  <option value="custom">Custom Selection</option>
                </select>

                {announcementRole === "custom" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          searchUsersByPersonalId(e.target.value);
                        }}
                        placeholder="Search by Personal ID..."
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => addUserToSelection(user)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ID: {user.personal_id} | {user.role}
                                </p>
                              </div>
                              <Plus className="h-4 w-4 text-blue-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedUsers.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Selected Users ({selectedUsers.length})
                          </label>
                          <button
                            onClick={clearUserSelection}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="max-h-32 overflow-y-auto border rounded-lg bg-gray-50">
                          {selectedUsers.map((user) => (
                            <div
                              key={user.id}
                              className="p-2 flex justify-between items-center border-b last:border-b-0"
                            >
                              <div>
                                <p className="text-sm text-gray-900">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ID: {user.personal_id}
                                </p>
                              </div>
                              <button
                                onClick={() => removeUserFromSelection(user.id)}
                                className="text-red-500 hover:text-red-700"
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

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setAnnouncementModal(false);
                    clearUserSelection();
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAnnouncementSubmit}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Detail Modal */}
        {sessionDetailModal && selectedSessionDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
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

                <div className="space-y-6">
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

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSessionDetailModal(false)}
                      className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Company Detail Modal */}
        {companyDetailModal && selectedCompanyDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
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

                <div className="space-y-6">
                  <div className="text-center">
                    <img 
                      src={selectedCompanyDetail.logo_url} 
                      alt={`${selectedCompanyDetail.name} logo`} 
                      className="h-24 w-auto mx-auto mb-4 object-contain"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/96x96/orange/white?text=Logo";
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
                      className="text-orange-600 hover:text-orange-700 break-all"
                    >
                      {selectedCompanyDetail.website}
                    </a>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={() => window.open(selectedCompanyDetail.website, "_blank")}
                      className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                    >
                      Visit Career Page
                    </button>
                    
                    <button
                      onClick={() => {
                        setCompanyDetailModal(false);
                        setSelectedCompanyDetail(null);
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

        {/* Edit Session Modal */}
        {editSessionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Edit Session</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={editSession.title}
                  onChange={(e) => setEditSession({ ...editSession, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Session Title *"
                />
                
                <textarea
                  value={editSession.description}
                  onChange={(e) => setEditSession({ ...editSession, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Session Description"
                  rows={3}
                />

                <select
                  value={editSession.type}
                  onChange={(e) => setEditSession({ ...editSession, type: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="session">Session</option>
                  <option value="mentorship">Mentorship</option>
                </select>

                <input
                  type="time"
                  value={editSession.hour}
                  onChange={(e) => setEditSession({ ...editSession, hour: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />

                <input
                  type="date"
                  value={editSession.date}
                  onChange={(e) => setEditSession({ ...editSession, date: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />

                <input
                  type="text"
                  value={editSession.speaker}
                  onChange={(e) => setEditSession({ ...editSession, speaker: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Speaker *"
                />

                <input
                  type="number"
                  value={editSession.capacity}
                  onChange={(e) => setEditSession({ ...editSession, capacity: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Capacity"
                />

                <input
                  type="text"
                  value={editSession.location}
                  onChange={(e) => setEditSession({ ...editSession, location: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Session Location *"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditSessionModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSessionUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Session'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {editEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Edit Event</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Event Title *"
                />
                
                <textarea
                  value={editEvent.description}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Event Description"
                  rows={3}
                />

                <select
                  value={editEvent.type}
                  onChange={(e) => setEditEvent({ ...editEvent, type: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="general">General</option>
                  <option value="workshop">Workshop</option>
                  <option value="networking">Networking</option>
                  <option value="keynote">Keynote</option>
                  <option value="panel">Panel</option>
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={editEvent.startDate}
                    onChange={(e) => setEditEvent({ ...editEvent, startDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="Start Date *"
                  />
                  <input
                    type="time"
                    value={editEvent.startTime}
                    onChange={(e) => setEditEvent({ ...editEvent, startTime: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={editEvent.endDate}
                    onChange={(e) => setEditEvent({ ...editEvent, endDate: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    placeholder="End Date (Optional)"
                  />
                  <input
                    type="time"
                    value={editEvent.endTime}
                    onChange={(e) => setEditEvent({ ...editEvent, endTime: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>

                <input
                  type="text"
                  value={editEvent.location}
                  onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Event Location"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditEventModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEventUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {editCompanyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Edit Company</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={editCompany.name}
                  onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Company Name *"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo *</label>
                  <div className="flex space-x-4 mb-3">
                    <button
                      type="button"
                      onClick={() => setEditCompany({ ...editCompany, logoType: "link" })}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                        editCompany.logoType === "link" 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCompany({ ...editCompany, logoType: "upload" })}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                        editCompany.logoType === "upload" 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-700"
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
                      className="w-full border rounded-lg p-2"
                      placeholder="Logo URL *"
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditCompany({ ...editCompany, logo: e.target.files?.[0] || null })}
                        className="w-full border rounded-lg p-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to keep current logo
                      </p>
                    </div>
                  )}
                  
                  {editCompany.logoUrl && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Current Logo:</p>
                      <img 
                        src={editCompany.logoUrl} 
                        alt="Current logo" 
                        className="h-16 w-auto object-contain"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/64x64/orange/white?text=Logo";
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <textarea
                  value={editCompany.description}
                  onChange={(e) => setEditCompany({ ...editCompany, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Description"
                  rows={3}
                />
                <input
                  type="url"
                  value={editCompany.website}
                  onChange={(e) => setEditCompany({ ...editCompany, website: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Website *"
                />
                <input
                  type="text"
                  value={editCompany.boothNumber}
                  onChange={(e) => setEditCompany({ ...editCompany, boothNumber: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  placeholder="Booth Number *"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditCompanyModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompanyUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Company'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Detail Modal */}
        {eventDetailModal && selectedEventDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
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

                <div className="space-y-6">
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

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setEventDetailModal(false)}
                      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Company Confirmation Modal */}
        {deleteCompanyModal && selectedCompanyDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-red-600">Delete Company</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{selectedCompanyDelete.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteCompanyModal(false);
                    setSelectedCompanyDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCompany}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Company'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Session Confirmation Modal */}
        {deleteSessionModal && selectedSessionDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-red-600">Delete Session</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete the session <strong>"{selectedSessionDelete.title}"</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteSessionModal(false);
                    setSelectedSessionDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSession}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Session'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal */}
        {deleteEventModal && selectedEventDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-red-600">Delete Event</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete the event <strong>"{selectedEventDelete.title}"</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteEventModal(false);
                    setSelectedEventDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEvent}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminPanel;