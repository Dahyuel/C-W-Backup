import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, User, Heart, Shield, Users, Building, UserCheck, Camera, Megaphone, Stethoscope, Briefcase, Utensils, MessageSquare, Radio, ChevronDown, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  score: number;
  rank: number;
  tl_team?: string;
  personal_id?: string;
  volunteer_id?: string;
}

interface LeaderboardProps {
  userRole?: string;
  currentUserId?: string;
  userTeam?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ userRole, currentUserId, userTeam }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'attendees' | 'volunteers' | 'team'>('attendees');
  const [selectedTeam, setSelectedTeam] = useState<string>(userTeam || '');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardEntry | null>(null);
  
  // Admin search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Check if user is admin or team_leader
  const isAdminOrTeamLeader = ['admin', 'team_leader'].includes(userRole || '');

  useEffect(() => {
    fetchAvailableTeams();
  }, [userRole]);

  useEffect(() => {
    fetchLeaderboard();
  }, [userRole, activeTab, selectedTeam, currentUserId]);

  const fetchAvailableTeams = async () => {
    if (userRole === 'admin') {
      try {
        const { data, error } = await supabase
          .from('users_profiles')
          .select('tl_team')
          .not('tl_team', 'is', null)
          .neq('tl_team', '');

        if (!error && data) {
          const uniqueTeams = [...new Set(data.map(item => item.tl_team).filter(Boolean))] as string[];
          setAvailableTeams(uniqueTeams);
          if (uniqueTeams.length > 0 && !selectedTeam) {
            setSelectedTeam(uniqueTeams[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      let data;
      let error;

      if (activeTab === 'team' && selectedTeam) {
        const result = await supabase.rpc('get_team_leaderboard', {
          p_team_name: selectedTeam,
          p_limit_param: 100
        });
        
        if (result.error) {
          console.error('RPC Error:', result.error);
          throw result.error;
        }
        
        data = result.data;
        
        if (data) {
          data = data.map((item: any) => ({
            id: item.user_id,
            first_name: item.first_name,
            last_name: item.last_name,
            role: item.user_role,
            score: item.score,
            tl_team: item.team_name,
            rank: item.user_rank
          }));
        }
      } else {
        let query = supabase
          .from('users_profiles')
          .select('id, first_name, last_name, role, score, tl_team, personal_id, volunteer_id')
          .order('score', { ascending: false });

        // For admin - show all roles with tabs
        if (userRole === 'admin') {
          if (activeTab === 'attendees') {
            query = query.eq('role', 'attendee');
          } else if (activeTab === 'volunteers') {
            query = query.in('role', [
              'volunteer', 'registration', 'building', 'info_desk',
              'ushers', 'marketing', 'media', 'ER', 'BD', 'catering', 'feedback', 'stage'
            ]);
          }
        } 
        // For team_leader - show their team only
        else if (userRole === 'team_leader') {
          if (userTeam) {
            query = query.eq('tl_team', userTeam);
          }
        }
        // For all other roles - show only their specific role
        else if (userRole) {
          query = query.eq('role', userRole);
        }

        if (!data) {
          const result = await query;
          data = result.data;
          error = result.error;
        }
      }

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to load leaderboard');
        return;
      }

      let rankedData: LeaderboardEntry[] = (data || []).map((user, index) => ({
        ...user,
        rank: user.rank || index + 1
      }));

      // Show top 15 for all users (except admin who sees more)
      const limitCount = userRole === 'admin' ? 100 : 15;
      
      if (currentUserId && rankedData.length > limitCount) {
        const currentUserIndex = rankedData.findIndex(user => user.id === currentUserId);

        if (currentUserIndex > limitCount - 1) {
          const topEntries = rankedData.slice(0, limitCount);
          rankedData = [...topEntries];
        } else {
          rankedData = rankedData.slice(0, limitCount);
        }
      } else if (!currentUserId && rankedData.length > limitCount) {
        rankedData = rankedData.slice(0, limitCount);
      }

      setLeaderboardData(rankedData);
      
      // Set current user data for all users
      const userData = rankedData.find(user => user.id === currentUserId);
      if (userData) {
        setCurrentUserData(userData);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('An error occurred while loading the leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Admin search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Search by personal ID or volunteer ID
      const { data, error } = await supabase
        .from('users_profiles')
        .select('id, first_name, last_name, role, score, personal_id, volunteer_id, tl_team')
        .or(`personal_id.ilike.%${query}%,volunteer_id.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUserSelect = async (user: LeaderboardEntry) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);

    // Fetch additional user details if needed
    try {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserDetails(data);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setUserDetails(null);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</div>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'attendee':
        return <User className="h-4 w-4" />;
      case 'volunteer':
        return <Heart className="h-4 w-4" />;
      case 'registration':
        return <UserCheck className="h-4 w-4" />;
      case 'building':
        return <Building className="h-4 w-4" />;
      case 'team_leader':
        return <Users className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'info_desk':
        return <User className="h-4 w-4" />;
      case 'ushers':
        return <Users className="h-4 w-4" />;
      case 'marketing':
        return <Megaphone className="h-4 w-4" />;
      case 'media':
        return <Camera className="h-4 w-4" />;
      case 'ER':
        return <Stethoscope className="h-4 w-4" />;
      case 'BD':
        return <Briefcase className="h-4 w-4" />;
      case 'catering':
        return <Utensils className="h-4 w-4" />;
      case 'feedback':
        return <MessageSquare className="h-4 w-4" />;
      case 'stage':
        return <Radio className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'attendee':
        return 'bg-blue-100 text-blue-800';
      case 'volunteer':
        return 'bg-pink-100 text-pink-800';
      case 'registration':
        return 'bg-green-100 text-green-800';
      case 'building':
        return 'bg-purple-100 text-purple-800';
      case 'team_leader':
        return 'bg-indigo-100 text-indigo-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'info_desk':
        return 'bg-orange-100 text-orange-800';
      case 'ushers':
        return 'bg-teal-100 text-teal-800';
      case 'marketing':
        return 'bg-cyan-100 text-cyan-800';
      case 'media':
        return 'bg-violet-100 text-violet-800';
      case 'ER':
        return 'bg-rose-100 text-rose-800';
      case 'BD':
        return 'bg-amber-100 text-amber-800';
      case 'catering':
        return 'bg-lime-100 text-lime-800';
      case 'feedback':
        return 'bg-emerald-100 text-emerald-800';
      case 'stage':
        return 'bg-fuchsia-100 text-fuchsia-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankBackgroundColor = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-orange-50 border-orange-200';
    }
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getTabTitle = () => {
    if (userRole === 'admin') {
      if (activeTab === 'attendees') return 'Top Attendees';
      if (activeTab === 'volunteers') return 'Top Volunteers';
      if (activeTab === 'team') return `Team: ${selectedTeam}`;
    } else if (userRole === 'team_leader') {
      return `My Team: ${userTeam}`;
    } else if (userRole) {
      // For all other roles, show their specific role leaderboard
      return `Top ${userRole.replace('_', ' ')}s`;
    }
    return 'Leaderboard';
  };

  const getLeaderboardDescription = () => {
    if (userRole === 'admin') {
      return 'View rankings across all roles and teams';
    } else if (userRole === 'team_leader') {
      return `Leaderboard for ${userTeam} team`;
    } else if (userRole) {
      return `Leaderboard for ${userRole.replace('_', ' ')}s only`;
    }
    return 'Leaderboard';
  };

  const TeamSelector = () => (
    <div className="relative">
      <button
        onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
        className="flex items-center justify-between w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center">
          <Users className="h-4 w-4 mr-2 text-gray-500" />
          <span className="capitalize">{(selectedTeam || 'Select Team').replace('_', ' ')}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${teamDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {teamDropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setTeamDropdownOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {availableTeams.map((team) => (
              <button
                key={team}
                onClick={() => {
                  setSelectedTeam(team);
                  setTeamDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                  selectedTeam === team ? 'bg-orange-50 text-orange-700' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{team.replace('_', ' ')}</span>
                  {selectedTeam === team && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 fade-in-blur">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 error-animate">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchLeaderboard}
          className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all duration-300 btn-animate"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full fade-in-up-blur">
      {/* Admin Search Bar */}
      {userRole === 'admin' && (
        <div className="mb-6 fade-in-down">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Personal ID or Volunteer ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {user.personal_id && (
                          <span className="text-sm text-gray-600">
                            Personal ID: {user.personal_id}
                          </span>
                        )}
                        {user.volunteer_id && (
                          <span className="text-sm text-gray-600">
                            Volunteer ID: {user.volunteer_id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">{user.score}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header with description */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-orange-600" />
            {getTabTitle()}
          </h2>
          <p className="text-sm text-gray-500">Top {Math.min(leaderboardData.length, userRole === 'admin' ? 100 : 15)}</p>
        </div>
        <p className="text-gray-600 text-sm">{getLeaderboardDescription()}</p>
      </div>

      {/* Tab Controls - Only show for admin and team_leader */}
      {isAdminOrTeamLeader && (
        <div className="flex flex-col space-y-4 mb-6 border-b pb-4 fade-in-left">
          <div className="flex space-x-4">
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('attendees')}
                  className={`py-2 px-4 font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'attendees'
                      ? "border-b-2 border-orange-500 text-orange-600"
                      : "text-gray-500 hover:text-orange-600"
                  }`}
                >
                  Attendees
                </button>
                <button
                  onClick={() => setActiveTab('volunteers')}
                  className={`py-2 px-4 font-semibold text-sm transition-all duration-300 ${
                    activeTab === 'volunteers'
                      ? "border-b-2 border-orange-500 text-orange-600"
                      : "text-gray-500 hover:text-orange-600"
                  }`}
                >
                  Volunteers
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('team')}
              className={`py-2 px-4 font-semibold text-sm transition-all duration-300 ${
                activeTab === 'team'
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-gray-500 hover:text-orange-600"
              }`}
            >
              Teams
            </button>
          </div>

          {/* Team Selector for Admin only */}
          {activeTab === 'team' && availableTeams.length > 0 && userRole === 'admin' && (
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Select Team:
              </label>
              <TeamSelector />
            </div>
          )}
        </div>
      )}

      {/* Current User Highlight - Show for all users */}
      {currentUserData && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg fade-in-blur card-hover">
          <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Your Position
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getRankIcon(currentUserData.rank)}
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {currentUserData.first_name?.charAt(0)}{currentUserData.last_name?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {currentUserData.first_name} {currentUserData.last_name}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(currentUserData.role)}`}>
                  {getRoleIcon(currentUserData.role)}
                  <span className="ml-1 capitalize">{currentUserData.role.replace('_', ' ')}</span>
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">{currentUserData.score}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboardData.length === 0 ? (
          <div className="text-center py-8 fade-in-scale">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available</p>
            <p className="text-gray-400 text-sm mt-2">
              {userRole ? `No ${userRole.replace('_', ' ')}s found` : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {leaderboardData.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 smooth-hover ${getRankBackgroundColor(user.rank, isCurrentUser)} ${
                    isCurrentUser ? 'ring-2 ring-orange-300' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {getRankIcon(user.rank)}
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className={`font-medium ${isCurrentUser ? 'text-orange-900' : 'text-gray-900'}`}>
                          {user.first_name} {user.last_name}
                          {isCurrentUser && <span className="text-orange-600 text-sm ml-2">(You)</span>}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1 capitalize">{user.role.replace('_', ' ')}</span>
                        </span>
                        {user.tl_team && activeTab === 'team' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Team: {user.tl_team}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${isCurrentUser ? 'text-orange-600' : user.rank <= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                      {user.score}
                    </p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-in-blur">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button
                onClick={closeUserModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getRoleColor(selectedUser.role)}`}>
                    {getRoleIcon(selectedUser.role)}
                    <span className="ml-1 capitalize">{selectedUser.role.replace('_', ' ')}</span>
                  </span>
                </div>
              </div>

              {/* IDs */}
              <div className="grid grid-cols-1 gap-3">
                {selectedUser.personal_id && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Personal ID</p>
                    <p className="text-lg font-mono text-gray-900">{selectedUser.personal_id}</p>
                  </div>
                )}
                {selectedUser.volunteer_id && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Volunteer ID</p>
                    <p className="text-lg font-mono text-gray-900">{selectedUser.volunteer_id}</p>
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800 mb-1">Total Score</p>
                <p className="text-3xl font-bold text-orange-600">{selectedUser.score}</p>
                <p className="text-xs text-orange-600">points</p>
              </div>

              {/* Additional Details from userDetails */}
              {userDetails && (
                <div className="space-y-3">
                  {userDetails.email && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{userDetails.email}</p>
                    </div>
                  )}
                  {userDetails.phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-gray-900">{userDetails.phone}</p>
                    </div>
                  )}
                  {userDetails.tl_team && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Team</p>
                      <p className="text-gray-900 capitalize">{userDetails.tl_team.replace('_', ' ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeUserModal}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;