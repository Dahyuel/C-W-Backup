// TeamLeaderDashboard.tsx
import React, { useState, useEffect } from "react";
import { 
  Users, QrCode, Gift, Building, Megaphone, Search, 
  X, CheckCircle, AlertCircle, Sliders, Plus, Calendar
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { useAuth } from "../../contexts/AuthContext";
import { QRScanner } from "../../components/shared/QRScanner";
import { supabase, sendAnnouncement, getDynamicBuildingStats } from "../../lib/supabase";
import { createPortal } from 'react-dom';

interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_id: string;
  volunteer_id: string;
  role: string;
  faculty?: string;
  phone?: string;
  tl_team?: string;
  score?: number;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  scanned_at: string;
  scan_type: string;
  volunteer?: Volunteer;
}

export const TeamLeaderDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'attendance'>('dashboard');

  // Attendance State
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendanceMethod, setAttendanceMethod] = useState<'scan' | 'search'>('scan');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Volunteer[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [scannedVolunteer, setScannedVolunteer] = useState<Volunteer | null>(null);
  const [showVolunteerCard, setShowVolunteerCard] = useState(false);
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [alreadyAttended, setAlreadyAttended] = useState(false);
  const [scanPurpose, setScanPurpose] = useState<'attendance' | 'bonus'>('attendance');
  
  // Announcement State
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementRole, setAnnouncementRole] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Volunteer[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Volunteer[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Bonus State
  const [bonusModal, setBonusModal] = useState(false);
  const [bonusAmount, setBonusAmount] = useState<number>(5);
  const [bonusSearchTerm, setBonusSearchTerm] = useState("");
  const [bonusSearchResults, setBonusSearchResults] = useState<Volunteer[]>([]);
  const [selectedUser, setSelectedUser] = useState<Volunteer | null>(null);
  const [showBonusSearchResults, setShowBonusSearchResults] = useState(false);
  const [showBonusConfirmCard, setShowBonusConfirmCard] = useState(false);
  const [bonusMethod, setBonusMethod] = useState<'scan' | 'search'>('scan');

  // Team State
  const [teamMembers, setTeamMembers] = useState<Volunteer[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<Volunteer | null>(null);
  const [showTeamMemberCard, setShowTeamMemberCard] = useState(false);
  const [teamMemberAttendanceStatus, setTeamMemberAttendanceStatus] = useState<boolean>(false);

  // Attendance Tab State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Flow Dashboard State
  const [buildingStats, setBuildingStats] = useState({
    inside_building: 0,
    inside_event: 0,
    total_attendees: 0
  });

  // Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Get team leader's team from tl_team column
  const getTeamLeaderTeam = (): string | null => {
    return profile?.tl_team;
  };

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      const teamLeaderTeam = getTeamLeaderTeam();
      if (!teamLeaderTeam) return;

      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('role', teamLeaderTeam)
        .order('first_name');

      if (!error && data) {
        setTeamMembers(data);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  // Check attendance status for a team member
  const checkTeamMemberAttendance = async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: attendance, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', userId)
        .eq('scan_type', 'vol_attendance')
        .gte('scanned_at', today.toISOString())
        .limit(1);

      if (!error && attendance && attendance.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking attendance:", error);
      return false;
    }
  };

  // Handle opening team member card
  const handleOpenTeamMemberCard = async (member: Volunteer) => {
    setSelectedTeamMember(member);
    const hasAttended = await checkTeamMemberAttendance(member.id);
    setTeamMemberAttendanceStatus(hasAttended);
    setShowTeamMemberCard(true);
  };

  // Handle assign bonus for team member
  const handleTeamMemberBonus = (member: Volunteer) => {
    setSelectedUser(member);
    setBonusAmount(5);
    setShowBonusConfirmCard(true);
    setShowTeamMemberCard(false);
  };

  // Handle mark attendance for team member
  const handleTeamMemberAttendance = async (member: Volunteer) => {
    setScannedVolunteer(member);
    
    // Check today's attendance
    const hasAttended = await checkTeamMemberAttendance(member.id);
    setAlreadyAttended(hasAttended);
    setAttendanceChecked(true);
    setShowVolunteerCard(true);
    setShowTeamMemberCard(false);
  };

  // Fetch attendance records for the selected date
  const fetchAttendanceRecords = async () => {
    try {
      setAttendanceLoading(true);
      const teamLeaderTeam = getTeamLeaderTeam();
      if (!teamLeaderTeam) return;

      // Get the start and end of the selected date
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      // Fetch attendance records with volunteer information
      const { data: attendances, error } = await supabase
        .from('attendances')
        .select(`
          id,
          user_id,
          scanned_at,
          scan_type,
          users_profiles!attendances_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            personal_id,
            volunteer_id,
            role,
            faculty,
            phone,
            score
          )
        `)
        .eq('scan_type', 'vol_attendance')
        .gte('scanned_at', startDate.toISOString())
        .lte('scanned_at', endDate.toISOString())
        .order('scanned_at', { ascending: false });

      if (error) {
        console.error("Error fetching attendance records:", error);
        setAttendanceRecords([]);
        return;
      }

      // Filter records to only include volunteers from the team leader's team
      const filteredRecords = attendances?.filter(record => 
        record.users_profiles?.role === teamLeaderTeam
      ) || [];

      // Transform the data to match our interface
      const transformedRecords: AttendanceRecord[] = filteredRecords.map(record => ({
        id: record.id,
        user_id: record.user_id,
        scanned_at: record.scanned_at,
        scan_type: record.scan_type,
        volunteer: record.users_profiles ? {
          id: record.users_profiles.id,
          first_name: record.users_profiles.first_name,
          last_name: record.users_profiles.last_name,
          email: record.users_profiles.email,
          personal_id: record.users_profiles.personal_id,
          volunteer_id: record.users_profiles.volunteer_id,
          role: record.users_profiles.role,
          faculty: record.users_profiles.faculty,
          phone: record.users_profiles.phone,
          score: record.users_profiles.score
        } : undefined
      }));

      setAttendanceRecords(transformedRecords);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      setAttendanceRecords([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Update the fetchBuildingStats function to use the same capacity numbers as Admin Panel
  const fetchBuildingStats = async () => {
    try {
      const { data: dynamicStats, error } = await getDynamicBuildingStats();
      if (!error && dynamicStats) {
        setBuildingStats({
          inside_building: dynamicStats.inside_building,
          inside_event: dynamicStats.inside_event,
          total_attendees: dynamicStats.total_attendees
        });
      } else {
        // Fallback to basic counts if dynamic stats fail
        const { count: insideBuilding } = await supabase
          .from('users_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('building_entry', true);

        const { count: insideEvent } = await supabase
          .from('users_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('event_entry', true);

        const { count: totalAttendees } = await supabase
          .from('users_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'attendee');

        setBuildingStats({
          inside_building: insideBuilding || 0,
          inside_event: insideEvent || 0,
          total_attendees: totalAttendees || 0
        });
      }
    } catch (error) {
      console.error("Error fetching building stats:", error);
      // Set default values on error
      setBuildingStats({
        inside_building: 0,
        inside_event: 0,
        total_attendees: 0
      });
    }
  };

  useEffect(() => {
    fetchBuildingStats();
    fetchTeamMembers();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchBuildingStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch attendance records when tab or date changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceRecords();
    }
  }, [activeTab, selectedDate]);

  // Handle QR Scan for Attendance
  const handleScan = async (qrData: string) => {
    try {
      console.log('Processing QR data:', qrData);
      
      // Check if it's a UUID or volunteer ID
      let volunteerData: Volunteer | null = null;
      
      if (qrData.includes('-')) { // Likely UUID
        const { data, error } = await supabase
          .from('users_profiles')
          .select('*')
          .eq('id', qrData.trim())
          .single();
        
        if (!error && data) {
          volunteerData = data;
        }
      } else { // Likely volunteer ID
        const { data, error } = await supabase
          .from('users_profiles')
          .select('*')
          .eq('volunteer_id', qrData.trim())
          .single();
        
        if (!error && data) {
          volunteerData = data;
        }
      }

      if (!volunteerData) {
        showFeedback('error', 'Volunteer not found');
        return;
      }

      // Check if user is in team leader's team
      const teamLeaderTeam = getTeamLeaderTeam();
      if (volunteerData.role !== teamLeaderTeam) {
        showFeedback('error', 'Volunteer not in your team');
        return;
      }

      setScannerOpen(false);

      // Handle based on scan purpose
      if (scanPurpose === 'bonus') {
        // For bonus assignment
        setSelectedUser(volunteerData);
        setShowBonusConfirmCard(true);
      } else {
        // For attendance
        // Check today's attendance using vol_attendance scan_type
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: attendance, error } = await supabase
          .from('attendances')
          .select('*')
          .eq('user_id', volunteerData.id)
          .eq('scan_type', 'vol_attendance')
          .gte('scanned_at', today.toISOString())
          .limit(1);

        if (!error && attendance && attendance.length > 0) {
          setAlreadyAttended(true);
        } else {
          setAlreadyAttended(false);
        }

        setScannedVolunteer(volunteerData);
        setAttendanceChecked(true);
        setShowVolunteerCard(true);
      }
      
    } catch (error) {
      console.error("QR scan error:", error);
      showFeedback('error', 'Failed to process QR code');
    }
  };

  // Handle manual search for attendance
  const handleAttendanceSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const teamLeaderTeam = getTeamLeaderTeam();
      if (!teamLeaderTeam) {
        showFeedback('error', 'No team assigned');
        return;
      }

      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .or(`personal_id.ilike.%${searchTerm}%,volunteer_id.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .eq('role', teamLeaderTeam) // Only users with same role as team leader's tl_team
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleAttendanceAction = async () => {
    if (!scannedVolunteer) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('attendances')
        .insert([{
          user_id: scannedVolunteer.id,
          scan_type: 'vol_attendance',
          scanned_by: profile?.id
        }]);

      if (error) {
        showFeedback('error', 'Failed to record attendance');
        return;
      }

      showFeedback('success', 'Attendance recorded successfully!');
      setShowVolunteerCard(false);
      setScannedVolunteer(null);
      setAttendanceChecked(false);
      setAttendanceModal(false);
      
      // Refresh team members to update attendance status
      fetchTeamMembers();
      // Refresh attendance records if on attendance tab
      if (activeTab === 'attendance') {
        fetchAttendanceRecords();
      }
      
    } catch (error) {
      console.error("Attendance action error:", error);
      showFeedback('error', 'Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  // Handle User Search for Announcements
  const searchUsersByPersonalId = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    setUserSearchLoading(true);
    try {
      const teamLeaderTeam = getTeamLeaderTeam();
      if (!teamLeaderTeam) {
        setUserSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('users_profiles')
        .select('id, first_name, last_name, personal_id, role, email, volunteer_id, tl_team')
        .or(`personal_id.ilike.%${searchTerm.trim()}%,volunteer_id.ilike.%${searchTerm.trim()}%,first_name.ilike.%${searchTerm.trim()}%,last_name.ilike.%${searchTerm.trim()}%`)
        .eq('role', teamLeaderTeam)
        .order('volunteer_id')
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        setUserSearchResults([]);
      } else {
        // Filter out already selected users and exclude current user
        const filteredResults = (data || []).filter(user => 
          !selectedUsers.some(selected => selected.id === user.id) &&
          user.id !== profile?.id
        );
        setUserSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Search exception:', error);
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Add user to selected list for announcements
  const addUserToSelection = (user: Volunteer) => {
    setSelectedUsers(prev => [...prev, user]);
    setUserSearchResults(prev => prev.filter(result => result.id !== user.id));
    setUserSearch("");
  };

  // Remove user from selected list for announcements
  const removeUserFromSelection = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Clear all selections for announcements
  const clearUserSelection = () => {
    setSelectedUsers([]);
    setUserSearch("");
    setUserSearchResults([]);
  };

  const handleAnnouncementSubmit = async () => {
    if (!announcementTitle || !announcementDescription || !announcementRole) {
      showFeedback('error', 'Please fill all required fields!');
      return;
    }

    console.log('=== DEBUG ANNOUNCEMENT ===');
    console.log('announcementRole:', announcementRole);
    console.log('getTeamLeaderTeam():', getTeamLeaderTeam());
    console.log('selectedUsers count:', selectedUsers.length);
    console.log('======================');

    if (announcementRole === "custom" && selectedUsers.length === 0) {
      showFeedback('error', 'Please select at least one user for custom announcements!');
      return;
    }

    setLoading(true);
    try {
      let targetType: string;
      let targetRole: string | null = null;
      let targetUserIds: string[] | null = null;

      // Determine target type and parameters based on selection
      if (announcementRole === "custom") {
        // Send to custom selected users
        targetType = 'specific_users';
        targetUserIds = selectedUsers.map(user => user.id);
      } else {
        // For team announcements
        const teamLeaderTeam = getTeamLeaderTeam();
        if (!teamLeaderTeam) {
          showFeedback('error', 'No team assigned');
          return;
        }
        targetType = 'role';
        targetRole = teamLeaderTeam;
      }

      console.log('Calling send_notification RPC with:', {
        targetType,
        targetRole,
        targetUserIds
      });

      // Prepare parameters for RPC call
      const rpcParams: any = {
        title_param: announcementTitle,
        message_param: announcementDescription,
        target_type_param: targetType,
      };

      // Add optional parameters only if they exist
      if (targetRole) {
        rpcParams.target_role_param = targetRole;
      }
      
      if (targetUserIds && targetUserIds.length > 0) {
        // Convert string[] to UUID[] for the database
        rpcParams.target_user_ids_param = targetUserIds;
      }

      // Use the Supabase RPC function
      const { data, error } = await supabase.rpc('send_notification', rpcParams);

      if (error) {
        console.error('Notification RPC error:', error);
        showFeedback('error', 'Failed to send announcement: ' + error.message);
      } else {
        console.log('SUCCESS - Notification sent with ID:', data);
        showFeedback('success', 'Announcement sent successfully!');
        setAnnouncementModal(false);
        setAnnouncementTitle("");
        setAnnouncementDescription("");
        setAnnouncementRole("");
        clearUserSelection();
      }
    } catch (err) {
      console.error('Send announcement error:', err);
      showFeedback('error', 'Failed to send announcement');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle User Search for Bonus
  const handleBonusUserSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setBonusSearchResults([]);
      setShowBonusSearchResults(false);
      return;
    }

    try {
      const teamLeaderTeam = getTeamLeaderTeam();
      if (!teamLeaderTeam) {
        showFeedback('error', 'No team assigned');
        return;
      }

      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .or(`personal_id.ilike.%${searchTerm}%,volunteer_id.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
        .eq('role', teamLeaderTeam) // Only users with same role as team leader's tl_team
        .limit(10);

      if (!error && data) {
        // Filter out current user from search results
        const filteredResults = data.filter(user => user.id !== profile?.id);
        setBonusSearchResults(filteredResults);
        setShowBonusSearchResults(true);
      } else {
        setBonusSearchResults([]);
        setShowBonusSearchResults(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setBonusSearchResults([]);
      setShowBonusSearchResults(false);
    }
  };

  const handleBonusAssignment = async () => {
    if (!selectedUser || bonusAmount < 1 || bonusAmount > 30) {
      showFeedback('error', 'Please select a user and set bonus amount (1-30)');
      return;
    }
  
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_scores')
        .insert([{
          user_id: selectedUser.id,
          points: bonusAmount,
          activity_type: 'vol_bonus',
          activity_description: `Bonus points assigned by team leader`
        }]);
  
      if (error) {
        showFeedback('error', 'Failed to assign bonus');
      } else {
        showFeedback('success', `Bonus of ${bonusAmount} points assigned successfully!`);
        setBonusModal(false);
        setSelectedUser(null);
        setBonusSearchTerm("");
        setBonusAmount(5);
        setShowBonusConfirmCard(false);
        
        // Refresh team members to update scores (the trigger will have updated users_profiles)
        fetchTeamMembers();
      }
    } catch (err) {
      showFeedback('error', 'Failed to assign bonus');
    } finally {
      setLoading(false);
    }
  };

  // Get role options - for team leader, only show their team and custom
  const getRoleOptions = () => {
    const teamLeaderTeam = getTeamLeaderTeam();
    if (!teamLeaderTeam) return [];

    const roleLabels: { [key: string]: string } = {
      'volunteer': 'Volunteers',
      'registration': 'Registration Team', 
      'building': 'Building Team',
      'info_desk': 'Info Desk Team',
      'team_leader': 'Team Leaders',
      'ushers': 'Ushers',
      'marketing': 'Marketing Team',
      'media': 'Media Team',
      'ER': 'ER Team',
      'BD': 'BD Team',
      'catering': 'Catering Team',
      'feedback': 'Feedback Team',
      'stage': 'Stage Team'
    };

    return [
      { value: teamLeaderTeam, label: roleLabels[teamLeaderTeam] || teamLeaderTeam },
      { value: "custom", label: "Custom Selection" }
    ];
  };

  // Handle QR Scanner Open for Attendance
  const handleOpenAttendanceScanner = () => {
    setScanPurpose('attendance');
    setScannerOpen(true);
    setAttendanceModal(false);
  };

  // Handle QR Scanner Open for Bonus
  const handleOpenBonusScanner = () => {
    setScanPurpose('bonus');
    setScannerOpen(true);
    setBonusModal(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render Team Tab
  const renderTeamTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-in-blur card-hover dashboard-card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-8 w-8 text-orange-500" />
            Your Team ({teamMembers.length} members)
          </h2>
        </div>

        {teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No team members found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => handleOpenTeamMemberCard(member)}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 cursor-pointer smooth-hover card-hover"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-lg">
                      {member.first_name[0]}{member.last_name[0]}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-500">Score</span>
                    <p className="text-lg font-bold text-orange-600">{member.score || 0}</p>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {member.first_name} {member.last_name}
                </h3>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-1">
                    <span className="font-medium">ID:</span> {member.volunteer_id}
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="font-medium">Personal ID:</span> {member.personal_id}
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="font-medium">Email:</span> 
                    <span className="truncate">{member.email}</span>
                  </p>
                  {member.phone && (
                    <p className="flex items-center gap-1">
                      <span className="font-medium">Phone:</span> {member.phone}
                    </p>
                  )}
                  {member.faculty && (
                    <p className="flex items-center gap-1">
                      <span className="font-medium">Faculty:</span> {member.faculty}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

 // Render Attendance Tab
const renderAttendanceTab = () => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 fade-in-blur card-hover dashboard-card">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            Attendance Records
          </h2>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <label htmlFor="date-selector" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Select Date:
            </label>
            <input
              id="date-selector"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 md:p-4">
          <p className="text-base md:text-lg text-gray-600">
            Showing attendance for <span className="font-semibold text-orange-600">{formatDate(selectedDate)}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Total records: <span className="font-medium">{attendanceRecords.length}</span>
          </p>
        </div>
      </div>

      {attendanceLoading ? (
        <div className="text-center py-8 md:py-12">
          <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-orange-500 mx-auto mb-3 md:mb-4"></div>
          <p className="text-gray-500 text-base md:text-lg">Loading attendance records...</p>
        </div>
      ) : attendanceRecords.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <Calendar className="h-12 w-12 md:h-16 md:w-16 text-gray-400 mx-auto mb-3 md:mb-4" />
          <p className="text-gray-500 text-base md:text-lg">No attendance records found for this date.</p>
          <p className="text-gray-400 text-sm mt-2">Attendance will appear here once marked for your team members.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {attendanceRecords.map((record) => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold text-sm">
                        {record.volunteer?.first_name?.[0]}{record.volunteer?.last_name?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {record.volunteer?.first_name} {record.volunteer?.last_name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{record.volunteer?.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                    Present
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-500 text-xs">Volunteer ID:</span>
                    <p className="text-gray-900 font-mono text-xs truncate">{record.volunteer?.volunteer_id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 text-xs">Personal ID:</span>
                    <p className="text-gray-900 font-mono text-xs truncate">{record.volunteer?.personal_id}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-500 text-xs">Time Scanned:</span>
                    <p className="text-gray-900 text-sm font-medium">{formatTime(record.scanned_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volunteer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volunteer ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personal ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Scanned
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-orange-600 font-bold text-sm">
                            {record.volunteer?.first_name?.[0]}{record.volunteer?.last_name?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {record.volunteer?.first_name} {record.volunteer?.last_name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{record.volunteer?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {record.volunteer?.volunteer_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {record.volunteer?.personal_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.scanned_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary for Mobile */}
          <div className="block md:hidden bg-blue-50 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-800 text-center">
              Showing {attendanceRecords.length} attendance record{attendanceRecords.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
);
  // Render Dashboard Tab
const renderDashboardTab = () => (
  <div className="space-y-6">
    {/* Quick Actions */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 fade-in-blur card-hover dashboard-card">
      <div className="flex justify-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 mb-6 md:mb-8">
          <Users className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
          Manage Your Team
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center stagger-children">
        {/* Attendance */}
        <button
          onClick={() => setAttendanceModal(true)}
          className="flex flex-col items-center justify-center py-4 md:py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 smooth-hover flex-1 min-h-[100px] md:min-h-[120px]"
        >
          <QrCode className="h-6 w-6 md:h-8 md:w-8 mb-2" />
          <span className="text-sm md:text-base font-medium text-center">Mark Attendance</span>
        </button>

        {/* Bonus */}
        <button
          onClick={() => setBonusModal(true)}
          className="flex flex-col items-center justify-center py-4 md:py-6 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300 smooth-hover flex-1 min-h-[100px] md:min-h-[120px]"
        >
          <Gift className="h-6 w-6 md:h-8 md:w-8 mb-2" />
          <span className="text-sm md:text-base font-medium text-center">Assign Bonus</span>
        </button>

        {/* Announcements */}
        <button
          onClick={() => setAnnouncementModal(true)}
          className="flex flex-col items-center justify-center py-4 md:py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all duration-300 smooth-hover flex-1 min-h-[100px] md:min-h-[120px]"
        >
          <Megaphone className="h-6 w-6 md:h-8 md:w-8 mb-2" />
          <span className="text-sm md:text-base font-medium text-center">Send Announcement</span>
        </button>
      </div>
    </div>

    {/* Flow Dashboard Widget - Admin Panel Style */}
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden fade-in-blur card-hover dashboard-card">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 mx-auto">
          <Building className="h-5 w-5 md:h-7 md:w-7 text-orange-500" />
          Flow Dashboard
        </h2>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-6 text-center stagger-children">
        <div className="bg-green-100 p-3 md:p-4 rounded-lg shadow-sm card-hover smooth-hover">
          <p className="text-xl md:text-2xl font-bold text-green-900">{buildingStats.inside_building}</p>
          <p className="text-sm md:text-lg font-bold text-gray-700">Inside Building</p>
        </div>
        <div className="bg-teal-100 p-3 md:p-4 rounded-lg shadow-sm card-hover smooth-hover">
          <p className="text-xl md:text-2xl font-bold text-teal-900">{buildingStats.inside_event}</p>
          <p className="text-sm md:text-lg font-bold text-gray-700">Inside Event</p>
        </div>
      </div>

      {/* Current State Table - Admin Panel Style */}
      <div className="p-4 md:p-6">
        <div className="overflow-x-auto">
          {/* Mobile Cards View for Capacity */}
          <div className="block md:hidden space-y-3">
            {/* Building Capacity Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Building</h3>
                  <p className="text-sm text-gray-600">Maximum: 350</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  buildingStats.inside_building < 280 
                    ? 'bg-green-100 text-green-800' 
                    : buildingStats.inside_building < 315 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {buildingStats.inside_building > 0 ? Math.round((buildingStats.inside_building / 350) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{buildingStats.inside_building}</span>
                <span className="text-sm text-gray-500">Current</span>
              </div>
            </div>

            {/* Event Capacity Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Event</h3>
                  <p className="text-sm text-gray-600">Maximum: 1500</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  buildingStats.inside_event < 1200 
                    ? 'bg-green-100 text-green-800' 
                    : buildingStats.inside_event < 1350 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {buildingStats.inside_event > 0 ? Math.round((buildingStats.inside_event / 1500) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{buildingStats.inside_event}</span>
                <span className="text-sm text-gray-500">Current</span>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <table className="min-w-full text-base md:text-lg font-bold text-left border border-gray-200 rounded-lg overflow-hidden hidden md:table">
            <thead className="bg-gray-100 text-gray-800 text-lg md:text-xl font-extrabold">
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
                <td className="px-4 py-3">{buildingStats.inside_building}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    buildingStats.inside_building < 280 
                      ? 'bg-green-100 text-green-800' 
                      : buildingStats.inside_building < 315 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {buildingStats.inside_building > 0 ? Math.round((buildingStats.inside_building / 350) * 100) : 0}%
                  </span>
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-3">Event</td>
                <td className="px-4 py-3 text-red-600">1500</td>
                <td className="px-4 py-3">{buildingStats.inside_event}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    buildingStats.inside_event < 1200 
                      ? 'bg-green-100 text-green-800' 
                      : buildingStats.inside_event < 1350 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {buildingStats.inside_event > 0 ? Math.round((buildingStats.inside_event / 1500) * 100) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Stats Section */}
      <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
          <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm card-hover">
            <p className="text-xs md:text-sm font-medium text-gray-600">Building Capacity</p>
            <p className="text-base md:text-lg font-bold text-gray-900">
              {Math.round((buildingStats.inside_building / 350) * 100)}%
            </p>
          </div>
          <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm card-hover">
            <p className="text-xs md:text-sm font-medium text-gray-600">Event Capacity</p>
            <p className="text-base md:text-lg font-bold text-gray-900">
              {Math.round((buildingStats.inside_event / 1500) * 100)}%
            </p>
          </div>
        </div>
        
        {/* Mobile Summary */}
        <div className="block md:hidden mt-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-800 font-medium">
              Total Inside: {buildingStats.inside_building + buildingStats.inside_event}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Building: {buildingStats.inside_building} • Event: {buildingStats.inside_event}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

  return (
    <DashboardLayout
      title="Team Leader Dashboard"
      subtitle="Manage your team, track attendance, and assign bonuses"
    >
      <div className="fade-in-up-blur relative">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-xl w-fit mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'dashboard'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'team'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'attendance'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Attendance
          </button>
        </div>

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

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'attendance' && renderAttendanceTab()}

        {/* All Modals using React Portal with Animations */}

        {/* Team Member Card Modal */}
        {showTeamMemberCard && selectedTeamMember && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h3 className="text-xl font-bold text-gray-900">Team Member Details</h3>
                  <button
                    onClick={() => {
                      setShowTeamMemberCard(false);
                      setSelectedTeamMember(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4 fade-in-blur">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-xl">
                        {selectedTeamMember.first_name[0]}{selectedTeamMember.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {selectedTeamMember.first_name} {selectedTeamMember.last_name}
                      </h4>
                      <p className="text-gray-600">Volunteer ID: {selectedTeamMember.volunteer_id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Personal ID</span>
                      <p className="text-gray-900">{selectedTeamMember.personal_id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Score</span>
                      <p className="text-orange-600 font-bold">{selectedTeamMember.score || 0}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Email</span>
                      <p className="text-gray-900 truncate">{selectedTeamMember.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Attendance Today</span>
                      <p className={teamMemberAttendanceStatus ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {teamMemberAttendanceStatus ? "Present" : "Absent"}
                      </p>
                    </div>
                    {selectedTeamMember.phone && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Phone</span>
                        <p className="text-gray-900">{selectedTeamMember.phone}</p>
                      </div>
                    )}
                    {selectedTeamMember.faculty && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Faculty</span>
                        <p className="text-gray-900">{selectedTeamMember.faculty}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 fade-in-blur">
                    <button
                      onClick={() => handleTeamMemberBonus(selectedTeamMember)}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-all duration-300 font-medium"
                    >
                      Assign Bonus
                    </button>
                    <button
                      onClick={() => handleTeamMemberAttendance(selectedTeamMember)}
                      className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 font-medium"
                    >
                      Mark Attendance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Attendance Modal */}
        {attendanceModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h2 className="text-xl font-bold text-gray-900">Mark Attendance</h2>
                  <button
                    onClick={() => {
                      setAttendanceModal(false);
                      setScannedVolunteer(null);
                      setAttendanceChecked(false);
                      setSearchTerm("");
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex gap-2 mb-4 fade-in-blur">
                  <button
                    onClick={() => setAttendanceMethod('scan')}
                    className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                      attendanceMethod === 'scan' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    QR Scanner
                  </button>
                  <button
                    onClick={() => setAttendanceMethod('search')}
                    className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                      attendanceMethod === 'search' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Search
                  </button>
                </div>

                {attendanceMethod === 'scan' ? (
                  <div className="space-y-4 fade-in-blur">
                    <button
                      onClick={handleOpenAttendanceScanner}
                      className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 font-medium"
                    >
                      Open QR Scanner
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 fade-in-blur">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          handleAttendanceSearch(e.target.value);
                        }}
                        onFocus={() => {
                          if (searchResults.length > 0) {
                            setShowSearchResults(true);
                          }
                        }}
                        placeholder="Search by Personal ID, Volunteer ID, or Name"
                        className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      />
                      <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-60 overflow-y-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={async () => {
                                setScannedVolunteer(user);
                                setSearchTerm(`${user.first_name} ${user.last_name} (${user.volunteer_id})`);
                                setShowSearchResults(false);
                                
                                // Check attendance status for this user
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                
                                const { data: attendance, error } = await supabase
                                  .from('attendances')
                                  .select('*')
                                  .eq('user_id', user.id)
                                  .eq('scan_type', 'vol_attendance')
                                  .gte('scanned_at', today.toISOString())
                                  .limit(1);

                                if (!error && attendance && attendance.length > 0) {
                                  setAlreadyAttended(true);
                                } else {
                                  setAlreadyAttended(false);
                                }
                                
                                setShowVolunteerCard(true);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-all duration-300"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  ID: {user.volunteer_id} | Personal ID: {user.personal_id}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {user.role.replace('_', ' ')}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {showSearchResults && (
                      <div 
                        className="fixed inset-0 z-30"
                        onClick={() => setShowSearchResults(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* QR Scanner Modal - Using the working scanner from BuildTeamDashboard */}
        {scannerOpen && createPortal(
          <QRScanner
            isOpen={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={handleScan}
            title={scanPurpose === 'attendance' ? "Attendance Scanner" : "Bonus Assignment Scanner"}
            description="Point your camera at the volunteer's QR code"
          />,
          document.body
        )}

        {/* Volunteer Card Modal */}
        {showVolunteerCard && scannedVolunteer && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h3 className="text-xl font-bold text-gray-900">Volunteer Information</h3>
                  <button
                    onClick={() => {
                      setShowVolunteerCard(false);
                      setScannedVolunteer(null);
                      setAttendanceChecked(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-3 fade-in-blur">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{scannedVolunteer.first_name} {scannedVolunteer.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Volunteer ID:</span>
                    <span>{scannedVolunteer.volunteer_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{scannedVolunteer.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Personal ID:</span>
                    <span>{scannedVolunteer.personal_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Role:</span>
                    <span className="capitalize">{scannedVolunteer.role.replace('_', ' ')}</span>
                  </div>
                  
                  {/* Attendance Status Display */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Today's Attendance:</span>
                    {alreadyAttended ? (
                      <span className="text-red-600 font-semibold">Already Marked</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Not Marked</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 fade-in-blur">
                  {alreadyAttended ? (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
                      <p className="font-medium text-center">Attendance already taken today</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleAttendanceAction}
                      disabled={loading}
                      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-300 font-medium"
                    >
                      {loading ? 'Recording...' : 'Mark Attendance'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Announcement Modal */}
        {announcementModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur">
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h2 className="text-xl font-bold text-gray-900">Send Announcement</h2>
                  <button
                    onClick={() => {
                      setAnnouncementModal(false);
                      clearUserSelection();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="fade-in-blur">
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="Message Title"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    />
                  </div>

                  <div className="fade-in-blur">
                    <textarea
                      value={announcementDescription}
                      onChange={(e) => setAnnouncementDescription(e.target.value)}
                      placeholder="Message Description"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                      rows={3}
                    />
                  </div>

                  <div className="fade-in-blur">
                    <select
                      value={announcementRole}
                      onChange={(e) => {
                        setAnnouncementRole(e.target.value);
                        if (e.target.value !== "custom") {
                          clearUserSelection();
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    >
                      <option value="">Select Target</option>
                      {getRoleOptions().map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

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
                          placeholder="Search by Personal ID, Volunteer ID, or Name..."
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                        />
                        {userSearchLoading && (
                          <div className="absolute right-3 top-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                      </div>

                      {/* Search Results */}
                      {userSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded-lg fade-in-blur">
                          {userSearchResults.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => addUserToSelection(user)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-all duration-300"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Vol ID: {user.volunteer_id} | Personal ID: {user.personal_id}
                                  </p>
                                </div>
                                <Plus className="h-4 w-4 text-blue-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selected Users */}
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

                <div className="flex justify-end gap-3 mt-6 fade-in-blur">
                  <button
                    onClick={() => {
                      setAnnouncementModal(false);
                      clearUserSelection();
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnnouncementSubmit}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-all duration-300"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Bonus Assignment Modal */}
        {bonusModal && createPortal(
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
            onClick={() => {
              if (!showBonusConfirmCard) {
                setBonusModal(false);
                setSelectedUser(null);
                setBonusSearchTerm("");
                setShowBonusSearchResults(false);
                setBonusAmount(5);
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h2 className="text-xl font-bold text-gray-900">Assign Bonus Points</h2>
                  <button
                    onClick={() => {
                      setBonusModal(false);
                      setSelectedUser(null);
                      setBonusSearchTerm("");
                      setShowBonusSearchResults(false);
                      setBonusAmount(5);
                      setShowBonusConfirmCard(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex gap-2 mb-4 fade-in-blur">
                  <button
                    onClick={() => setBonusMethod('scan')}
                    className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                      bonusMethod === 'scan' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    QR Scanner
                  </button>
                  <button
                    onClick={() => setBonusMethod('search')}
                    className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                      bonusMethod === 'search' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Search
                  </button>
                </div>

                {bonusMethod === 'scan' ? (
                  <div className="space-y-4 fade-in-blur">
                    <button
                      onClick={handleOpenBonusScanner}
                      className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-300 font-medium"
                    >
                      Open QR Scanner
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 fade-in-blur">
                    <div className="relative">
                      <input
                        type="text"
                        value={bonusSearchTerm}
                        onChange={(e) => {
                          setBonusSearchTerm(e.target.value);
                          handleBonusUserSearch(e.target.value);
                        }}
                        onFocus={() => {
                          if (bonusSearchResults.length > 0) {
                            setShowBonusSearchResults(true);
                          }
                        }}
                        placeholder="Search by Personal ID, Volunteer ID, or Name"
                        className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                      />
                      <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      
                      {showBonusSearchResults && bonusSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-60 overflow-y-auto">
                          {bonusSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedUser(user);
                                setBonusSearchTerm(`${user.first_name} ${user.last_name} (${user.volunteer_id})`);
                                setShowBonusSearchResults(false);
                                setShowBonusConfirmCard(true);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-all duration-300"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  ID: {user.volunteer_id} | Personal ID: {user.personal_id}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {user.role.replace('_', ' ')}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {showBonusSearchResults && (
                      <div 
                        className="fixed inset-0 z-30"
                        onClick={() => setShowBonusSearchResults(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Bonus Confirmation Card */}
        {showBonusConfirmCard && selectedUser && createPortal(
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur"
            onClick={() => {
              setShowBonusConfirmCard(false);
              setSelectedUser(null);
              setBonusSearchTerm("");
              setBonusAmount(5);
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 stagger-children">
                <div className="flex items-center justify-between mb-6 fade-in-blur">
                  <h3 className="text-xl font-bold text-gray-900">Assign Bonus</h3>
                  <button
                    onClick={() => {
                      setShowBonusConfirmCard(false);
                      setSelectedUser(null);
                      setBonusSearchTerm("");
                      setBonusAmount(5);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-3 mb-4 fade-in-blur">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{selectedUser.first_name} {selectedUser.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Volunteer ID:</span>
                    <span>{selectedUser.volunteer_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Personal ID:</span>
                    <span>{selectedUser.personal_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Role:</span>
                    <span className="capitalize">{selectedUser.role.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="mb-6 fade-in-blur">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus Points (1-30)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <div className="fade-in-blur">
                  <button
                    onClick={handleBonusAssignment}
                    disabled={loading}
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-300 font-medium"
                  >
                    {loading ? 'Assigning...' : 'Give Bonus'}
                  </button>
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