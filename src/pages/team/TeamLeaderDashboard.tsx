// TeamLeaderDashboard.tsx
import React, { useState, useEffect } from "react";
import { 
  Users, QrCode, Gift, Building, Megaphone, Search, 
  X, CheckCircle, AlertCircle, Sliders, Plus 
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { useAuth } from "../../contexts/AuthContext";
import { QRScanner } from "../../components/shared/QRScanner";
import { supabase, sendAnnouncement, getDynamicBuildingStats } from "../../lib/supabase";

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
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  scanned_at: string;
  scan_type: string;
}

export const TeamLeaderDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

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
    return profile?.tl_team || null;
  };

  // Get allowed roles - for team leader, it's just their tl_team value
  const getAllowedRoles = (): string[] => {
    const team = getTeamLeaderTeam();
    return team ? [team] : [];
  };

  // Fetch building stats
  const fetchBuildingStats = async () => {
    try {
      const { data: dynamicStats, error } = await getDynamicBuildingStats();
      if (!error && dynamicStats) {
        setBuildingStats({
          inside_building: dynamicStats.inside_building,
          inside_event: dynamicStats.inside_event,
          total_attendees: dynamicStats.total_attendees
        });
      }
    } catch (error) {
      console.error("Error fetching building stats:", error);
    }
  };

  useEffect(() => {
    fetchBuildingStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchBuildingStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
        .or(`personal_id.ilike.%${searchTerm}%,volunteer_id.ilike.%${searchTerm}%`)
        .eq('role', teamLeaderTeam) // Only users with same role as team leader's tl_team
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
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
      .or(`personal_id.ilike.%${searchTerm.trim()}%,volunteer_id.ilike.%${searchTerm.trim()}%`)
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

  if (announcementRole === "custom" && selectedUsers.length === 0) {
    showFeedback('error', 'Please select at least one user for custom announcements!');
    return;
  }

  setLoading(true);
  try {
    let notificationData: any = {
      title: announcementTitle,
      message: announcementDescription,
      created_by: profile?.id
    };

    // Determine target type and role based on selection
    if (announcementRole === "custom") {
      // Send to custom selected users
      notificationData.target_type = 'specific_users'; // Use enum value
      notificationData.target_user_ids = selectedUsers.map(user => user.id);
      // Don't set target_role for specific_users
    } else {
      // For team announcements
      const teamLeaderTeam = getTeamLeaderTeam();
      if (!teamLeaderTeam) {
        showFeedback('error', 'No team assigned');
        return;
      }

      notificationData.target_type = 'role'; // Use enum value 'role'
      notificationData.target_role = teamLeaderTeam; // This can be 'volunteers', 'ushers', etc.
    }

    console.log('Sending notification:', notificationData);

    const { error } = await supabase
      .from('notifications')
      .insert([notificationData]);

    if (error) {
      console.error('Notification error:', error);
      showFeedback('error', 'Failed to send announcement: ' + error.message);
    } else {
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
        .or(`personal_id.ilike.%${searchTerm}%,volunteer_id.ilike.%${searchTerm}%`)
        .eq('role', teamLeaderTeam) // Only users with same role as team leader's tl_team
        .limit(10);

      if (!error && data) {
        // Filter out current user from search results
        const filteredResults = data.filter(user => user.id !== profile?.id);
        setBonusSearchResults(filteredResults);
        setShowBonusSearchResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setBonusSearchResults([]);
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
        // Remove awarded_by - column doesn't exist
      }]);

    if (error) {
      showFeedback('error', 'Failed to assign bonus');
    } else {
      // Update user's total score
      const { data: userProfile } = await supabase
        .from('users_profiles')
        .select('score')
        .eq('id', selectedUser.id)
        .single();

      if (userProfile) {
        await supabase
          .from('users_profiles')
          .update({ score: (userProfile.score || 0) + bonusAmount })
          .eq('id', selectedUser.id);
      }

      showFeedback('success', `Bonus of ${bonusAmount} points assigned successfully!`);
      setBonusModal(false);
      setSelectedUser(null);
      setBonusSearchTerm("");
      setBonusAmount(5);
      setShowBonusConfirmCard(false);
    }
  } catch (err) {
    showFeedback('error', 'Failed to assign bonus');
  } finally {
    setLoading(false);
  }
};
  // Add this with other Bonus State
const [showBonusConfirmCard, setShowBonusConfirmCard] = useState(false);
const [bonusMethod, setBonusMethod] = useState<'scan' | 'search'>('scan');
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
  

  return (
    <DashboardLayout
      title="Team Leader Dashboard"
      subtitle="Manage your team, track attendance, and assign bonuses"
    >
      <div className="fade-in-up-blur relative">
        <div className="space-y-8">
          {/* Feedback Toast */}
          {feedback && (
            <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg fade-in-blur ${
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
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-in-blur card-hover dashboard-card">
            <div className="flex justify-center">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2 mb-8">
                <Users className="h-8 w-8 text-orange-500" />
                Manage Your Team
              </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-center stagger-children">
              {/* Attendance */}
              <button
                onClick={() => setAttendanceModal(true)}
                className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 smooth-hover"
              >
                <QrCode className="h-8 w-8 mb-2" />
                <span className="text-base font-medium">Mark Attendance</span>
              </button>

              {/* Bonus */}
              <button
                onClick={() => setBonusModal(true)}
                className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300 smooth-hover"
              >
                <Gift className="h-8 w-8 mb-2" />
                <span className="text-base font-medium">Assign Bonus</span>
              </button>

              {/* Announcements */}
              <button
                onClick={() => setAnnouncementModal(true)}
                className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all duration-300 smooth-hover"
              >
                <Megaphone className="h-8 w-8 mb-2" />
                <span className="text-base font-medium">Send Announcement</span>
              </button>
            </div>
          </div>

          {/* Flow Dashboard Widget */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden fade-in-blur card-hover dashboard-card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2 mx-auto">
                <Building className="h-7 w-7 text-orange-500" />
                Flow Dashboard
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-4 px-6 py-6 text-center stagger-children">
              <div className="bg-green-100 p-4 rounded-lg shadow-sm card-hover smooth-hover">
                <p className="text-2xl font-bold text-green-900">{buildingStats.inside_building}</p>
                <p className="text-lg font-bold text-gray-700">Inside Building</p>
              </div>
              <div className="bg-teal-100 p-4 rounded-lg shadow-sm card-hover smooth-hover">
                <p className="text-2xl font-bold text-teal-900">{buildingStats.inside_event}</p>
                <p className="text-lg font-bold text-gray-700">Inside Event</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg shadow-sm card-hover smooth-hover">
                <p className="text-2xl font-bold text-blue-900">{buildingStats.total_attendees}</p>
                <p className="text-lg font-bold text-gray-700">Total Attendees</p>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full text-lg font-bold text-left border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100 text-gray-800 text-xl font-extrabold">
                    <tr>
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Maximum Capacity</th>
                      <th className="px-4 py-3">Current Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-3">Building</td>
                      <td className="px-4 py-3 text-red-600">500</td>
                      <td className="px-4 py-3">
                        {buildingStats.inside_building > 0 ? 
                          Math.round((buildingStats.inside_building / 500) * 100) : 0}%
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3">Event</td>
                      <td className="px-4 py-3 text-red-600">4000</td>
                      <td className="px-4 py-3">
                        {buildingStats.inside_event > 0 ? 
                          Math.round((buildingStats.inside_event / 4000) * 100) : 0}%
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-red-600">4500</td>
                      <td className="px-4 py-3">
                        {(buildingStats.inside_building + buildingStats.inside_event) > 0 ? 
                          Math.round(((buildingStats.inside_building + buildingStats.inside_event) / 4500) * 100) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* All Modals - Placed outside the main content to overlay everything */}

        {/* Attendance Modal */}
        {attendanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
              <button
                onClick={() => {
                  setAttendanceModal(false);
                  setScannedVolunteer(null);
                  setAttendanceChecked(false);
                  setSearchTerm("");
                  setSearchResults([]);
                }}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              <h2 className="text-lg font-semibold text-black mb-4 text-center">
                Mark Attendance
              </h2>

              <div className="flex gap-2 mb-4">
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
                <div className="space-y-4">
<button
  onClick={() => {
    setScanPurpose('attendance'); // Set purpose to attendance
    setScannerOpen(true);
  }}
  className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 font-medium"
>
  Open QR Scanner
</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        handleAttendanceSearch(e.target.value);
                      }}
                      onFocus={() => setShowSearchResults(true)}
                      placeholder="Search by Personal ID or Volunteer ID"
                      className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    />
                    <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-60 overflow-y-auto">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setScannedVolunteer(user);
                              setSearchTerm(`${user.first_name} ${user.last_name} (${user.volunteer_id})`);
                              setShowSearchResults(false);
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
        )}

        {/* QR Scanner Modal */}
        {scannerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]">
            <QRScanner
              isOpen={scannerOpen}
              onClose={() => setScannerOpen(false)}
              onScan={handleScan}
              title="Scan Volunteer QR Code"
              description="Point your camera at the volunteer's QR code"
            />
          </div>
        )}

        {/* Volunteer Card Modal */}
        {showVolunteerCard && scannedVolunteer && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Volunteer Information</h3>
                <button
                  onClick={() => {
                    setShowVolunteerCard(false);
                    setScannedVolunteer(null);
                    setAttendanceChecked(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-3">
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
              </div>

              <div className="mt-6">
                {alreadyAttended ? (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
                    <p className="font-medium">This volunteer has already attended today.</p>
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
        )}

        {/* Announcement Modal */}
        {announcementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => {
                  setAnnouncementModal(false);
                  clearUserSelection();
                }}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition-colors"
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
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                />

                <textarea
                  value={announcementDescription}
                  onChange={(e) => setAnnouncementDescription(e.target.value)}
                  placeholder="Message Description"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
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
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                >
                  <option value="">Select Target</option>
                  {getRoleOptions().map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                {/* Custom Selection UI */}
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
  placeholder="Search by Personal ID or Volunteer ID..."
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
  <div className="max-h-40 overflow-y-auto border rounded-lg">
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
                      <div>
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

              <div className="flex justify-end gap-3 mt-6">
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
        )}

{/* Bonus Assignment Modal */}
{bonusModal && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]"
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
      className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          setBonusModal(false);
          setSelectedUser(null);
          setBonusSearchTerm("");
          setShowBonusSearchResults(false);
          setBonusAmount(5);
          setShowBonusConfirmCard(false);
        }}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-30 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      <h2 className="text-lg font-semibold text-black mb-4 text-center">
        Assign Bonus Points
      </h2>

      <div className="flex gap-2 mb-4">
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
        <div className="space-y-4">
<button
  onClick={() => {
    setScanPurpose('bonus'); // Set purpose to bonus
    setScannerOpen(true);
    setBonusModal(false); // Close bonus modal
  }}
  className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-all duration-300 font-medium"
>
  Open QR Scanner
</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={bonusSearchTerm}
              onChange={(e) => {
                setBonusSearchTerm(e.target.value);
                handleBonusUserSearch(e.target.value);
              }}
              onFocus={() => setShowBonusSearchResults(true)}
              placeholder="Search by Personal ID or Volunteer ID"
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
)}

{/* Bonus Confirmation Card */}
{showBonusConfirmCard && selectedUser && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]"
    onClick={() => {
      setShowBonusConfirmCard(false);
      setSelectedUser(null);
      setBonusSearchTerm("");
      setBonusAmount(5);
    }}
  >
    <div 
      className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Assign Bonus</h3>
        <button
          onClick={() => {
            setShowBonusConfirmCard(false);
            setSelectedUser(null);
            setBonusSearchTerm("");
            setBonusAmount(5);
          }}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
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

      <div className="mb-6">
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

      <button
        onClick={handleBonusAssignment}
        disabled={loading}
        className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all duration-300 font-medium"
      >
        {loading ? 'Assigning...' : 'Give Bonus'}
      </button>
    </div>
  </div>
)}
      </div>
    </DashboardLayout>
  );
};