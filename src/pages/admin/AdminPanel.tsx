import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
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
  BarChart3,
  Search,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { supabase, uploadFile, getDynamicBuildingStats, deleteCompany } from "../../lib/supabase";

export function AdminPanel() {
  const [deleteCompanyModal, setDeleteCompanyModal] = useState(false);
  const [selectedCompanyDelete, setSelectedCompanyDelete] = useState(null);
  const [stats, setStats] = useState({ 
    total_users: 0, 
    total_sessions: 0,
    total_attendees: 0,
    total_volunteers: 0
  });
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
  
  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Team leader selection state
  const [teamLeaderOfRole, setTeamLeaderOfRole] = useState("");

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

  // Form states
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

  // Enhanced statistics state
  const [enhancedStats, setEnhancedStats] = useState({
    eventGenderRatio: { male: 0, female: 0 },
    eventFaculties: [],
    eventUniversities: [],
    eventDegreeLevel: { student: 0, graduate: 0 },
    eventStudentGraduateRatio: { student: 0, graduate: 0 }
  });

  // Animation styles
  const animationStyles = `
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
    @keyframes fadeInBlur {
      from {
        opacity: 0;
        filter: blur(10px);
      }
      to {
        opacity: 1;
        filter: blur(0);
      }
    }
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .fade-in-up {
      animation: fadeInUp 0.5s ease-out;
    }
    .fade-in-up-blur {
      animation: fadeInUp 0.5s ease-out, fadeInBlur 0.4s ease-out;
    }
    .fade-in-blur {
      animation: fadeInBlur 0.4s ease-out;
    }
    .scale-in {
      animation: scaleIn 0.3s ease-out;
    }
    .slide-in-right {
      animation: slideInRight 0.4s ease-out;
    }
    .modal-backdrop-blur {
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .modal-content-blur {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.95);
    }
    .card-hover {
      transition: all 0.3s ease;
    }
    .card-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    .smooth-hover {
      transition: all 0.2s ease-in-out;
    }
    .stagger-children > * {
      opacity: 0;
      animation: fadeInUp 0.5s ease-out forwards;
    }
    .stagger-children > *:nth-child(1) { animation-delay: 0.1s; }
    .stagger-children > *:nth-child(2) { animation-delay: 0.2s; }
    .stagger-children > *:nth-child(3) { animation-delay: 0.3s; }
    .stagger-children > *:nth-child(4) { animation-delay: 0.4s; }
    .stagger-children > *:nth-child(5) { animation-delay: 0.5s; }
    .stagger-children > *:nth-child(6) { animation-delay: 0.6s; }
    .fade-in-scale {
      animation: fadeInUp 0.5s ease-out, scaleIn 0.3s ease-out;
    }
  `;

  // Enhanced notification function with portal
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
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
      showNotification("Failed to fetch dashboard data", "error");
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
        const genderStats = { male: 0, female: 0 };
        const facultiesCount = {};
        const universitiesCount = {};
        const degreeLevelStats = { student: 0, graduate: 0 };
        const studentGraduateStats = { student: 0, graduate: 0 };

        eventUsers.forEach(user => {
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

  const searchUsersByPersonalId = async (searchTerm) => {
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

  // Enhanced Stat Card Component
  const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-12 h-12 ${colorClasses[color]} bg-opacity-10 rounded-lg flex items-center justify-center fade-in-blur`}>
            <div className={colorClasses[color].replace('bg-', 'text-')}>
              {icon}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal Wrapper Component
  const ModalWrapper = ({ children, isOpen, onClose, className = "", size = "md" }) => {
    if (!isOpen) return null;

    const sizeClasses = {
      sm: "max-w-md",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl"
    };

    return createPortal(
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
        onClick={onClose}
      >
        <div 
          className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  };

  // Notification Toast Component
  const NotificationToast = () => {
    if (!notification) return null;

    return createPortal(
      <div className={`fixed top-20 right-4 z-[9999] flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg fade-in-up ${
        notification.type === "success" 
          ? "bg-green-500 text-white" 
          : "bg-red-500 text-white"
      }`}>
        {notification.type === "success" ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
        <span className="font-medium">{notification.message}</span>
        <button
          onClick={() => setNotification(null)}
          className="ml-2 hover:bg-black hover:bg-opacity-20 rounded p-1 transition-colors smooth-hover"
        >
          <X className="h-4 w-4" />
        </button>
      </div>,
      document.body
    );
  };

  // Tab Components
  const DashboardTab = () => (
    <div className="space-y-8 fade-in-up">
      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-2 mb-6 fade-in-blur">
          <Sparkles className="h-7 w-7 text-orange-500" />
          Quick Actions
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          <button
            onClick={() => setCompanyModal(true)}
            className="flex flex-col items-center justify-center py-6 px-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 smooth-hover card-hover"
          >
            <Building className="h-8 w-8 mb-2" />
            <span className="text-base font-medium">Add Company</span>
          </button>

          <button
            onClick={() => setSessionModal(true)}
            className="flex flex-col items-center justify-center py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 smooth-hover card-hover"
          >
            <Calendar className="h-8 w-8 mb-2" />
            <span className="text-base font-medium">Add Session</span>
          </button>

          <button
            onClick={() => setAnnouncementModal(true)}
            className="flex flex-col items-center justify-center py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-700 transition-all duration-300 smooth-hover card-hover"
          >
            <Megaphone className="h-8 w-8 mb-2" />
            <span className="text-base font-medium">Send Announcement</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          icon={<Users className="h-6 w-6" />}
          color="orange"
        />
        <StatCard
          title="Total Attendees"
          value={buildingStats?.total_attendees || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Total Volunteers"
          value={(stats?.total_users || 0) - (buildingStats?.total_attendees || 0)}
          icon={<Users className="h-6 w-6" />}
          color="green"
        />
      </div>
    </div>
  );

  const SessionsTab = () => (
    <div className="fade-in-up">
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
            className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-all duration-200 card-hover fade-in-up"
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
  );

  const EventsTab = () => (
    <div className="fade-in-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 fade-in-blur">
          <Calendar className="h-5 w-5 mr-2 text-orange-600" /> Events Management
        </h2>
        
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
          <div key={event.id} className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover fade-in-up">
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
  );

  const EmployersTab = () => (
    <div className="fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4 sm:mb-0 fade-in-blur">
          <Building className="h-5 w-5 mr-2 text-orange-600" /> Employers Management
        </h2>
        <button
          onClick={() => setCompanyModal(true)}
          className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-300 smooth-hover fade-in-blur"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        {companies.map((company) => (
          <div 
            key={company.id} 
            className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-all duration-200 card-hover fade-in-up"
          >
            <div className="text-center">
              <img 
                src={company.logo_url} 
                alt={`${company.name} logo`} 
                className="h-16 w-auto mx-auto mb-4 object-contain fade-in-blur"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/64x64/orange/white?text=Logo";
                }}
              />
              <h3 className="text-lg font-bold text-gray-900 mb-2">{company.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{company.description}</p>
              
              {company.booth_number && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-4 fade-in-blur">
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

  const MapsTab = () => (
    <div className="fade-in-up">
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
      
      <div className="bg-white rounded-xl shadow-sm border p-4 flex justify-center items-center min-h-[400px] card-hover fade-in-blur">
        {mapLoading && (
          <div className="flex flex-col items-center justify-center fade-in-blur">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        )}
        <img
          src={mapImages[activeDay - 1]}
          alt={`Day ${activeDay} Map`}
          className={`max-w-full h-auto rounded-lg transition-opacity duration-200 ${mapLoading ? 'opacity-0 absolute' : 'opacity-100 fade-in-blur'}`}
          onLoad={handleMapLoad}
          onError={(e) => {
            handleMapError();
            e.target.src = "/src/Assets/placeholder-map.png";
          }}
        />
      </div>
    </div>
  );

  const StatisticsTab = () => (
    <div className="fade-in-up">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics</h2>
        <p className="text-gray-600">Statistics content will be implemented here...</p>
      </div>
    </div>
  );

  // Tab Navigation
  const TabNavigation = () => (
    <div className="flex space-x-1 sm:space-x-4 border-b mb-6 overflow-x-auto scrollbar-hide fade-in-up">
      {[
        { key: "dashboard", label: "Dashboard" },
        { key: "statistics", label: "Statistics" },
        { key: "sessions", label: "Sessions" },
        { key: "events", label: "Events" },
        { key: "maps", label: "Maps" },
        { key: "employers", label: "Employers" },
      ].map((tab) => (
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
  );

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
      <style>{animationStyles}</style>
      
      <div className="space-y-8 fade-in-up">
        {/* Notification Toast */}
        <NotificationToast />

        {/* Tab Navigation */}
        <TabNavigation />

        {/* Main Content */}
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "statistics" && <StatisticsTab />}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "events" && <EventsTab />}
        {activeTab === "maps" && <MapsTab />}
        {activeTab === "employers" && <EmployersTab />}

        {/* Modals */}
        <ModalWrapper isOpen={companyModal} onClose={() => setCompanyModal(false)} size="lg">
          <div className="p-6 stagger-children">
            <div className="flex items-center justify-between mb-6 fade-in-blur">
              <h3 className="text-2xl font-bold text-gray-900">Add New Company</h3>
              <button
                onClick={() => setCompanyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors smooth-hover"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 fade-in-blur"
                placeholder="Company Name *"
              />
              
              <div className="fade-in-blur">
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo *</label>
                <div className="flex space-x-4 mb-3">
                  <button
                    type="button"
                    onClick={() => setNewCompany({ ...newCompany, logoType: "link" })}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
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
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 smooth-hover ${
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
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                    placeholder="Logo URL *"
                  />
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewCompany({ ...newCompany, logo: e.target.files?.[0] || null })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
                  />
                )}
              </div>

              <textarea
                value={newCompany.description}
                onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 fade-in-blur"
                placeholder="Description"
                rows={3}
              />
              <input
                type="url"
                value={newCompany.website}
                onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 fade-in-blur"
                placeholder="Website *"
              />
              <input
                type="text"
                value={newCompany.boothNumber}
                onChange={(e) => setNewCompany({ ...newCompany, boothNumber: e.target.value })}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 fade-in-blur"
                placeholder="Booth Number *"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6 fade-in-blur">
              <button
                onClick={() => setCompanyModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-300 smooth-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCompanySubmit}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all duration-300 smooth-hover"
              >
                {loading ? 'Adding...' : 'Save Company'}
              </button>
            </div>
          </div>
        </ModalWrapper>

        {/* Add other modals similarly... */}
      </div>
    </DashboardLayout>
  );
}

export default AdminPanel;