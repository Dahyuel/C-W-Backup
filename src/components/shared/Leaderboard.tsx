import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, User, Heart, Shield, Users, Building, UserCheck, Camera, Megaphone, Stethoscope, Briefcase, Utensils, MessageSquare, Radio, ChevronDown, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  score: number;
  rank: number;
  tl_team?: string;
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

  // Blind mode is active for non-admin users
  const isBlindMode = userRole !== 'admin';

  useEffect(() => {
    fetchAvailableTeams();
  }, [userRole]);

  useEffect(() => {
    if (isBlindMode) {
      fetchCurrentUserData();
    } else {
      fetchLeaderboard();
    }
  }, [userRole, activeTab, selectedTeam, currentUserId]);

  const fetchCurrentUserData = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch current user's data
      const { data: userData, error: userError } = await supabase
        .from('users_profiles')
        .select('id, first_name, last_name, role, score, tl_team')
        .eq('id', currentUserId)
        .single();

      if (userError) throw userError;

      if (userData) {
        // Get user's rank by counting how many users have a higher score
        const { count, error: countError } = await supabase
          .from('users_profiles')
          .select('*', { count: 'exact', head: true })
          .gt('score', userData.score);

        if (countError) throw countError;

        const rank = (count || 0) + 1;

        setCurrentUserData({
          ...userData,
          rank
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load your score');
    } finally {
      setLoading(false);
    }
  };

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
          .select('id, first_name, last_name, role, score, tl_team')
          .order('score', { ascending: false });

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

      const limitCount = userRole === 'admin' ? 100 : 10;
      
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
      
      // Set current user data for admin view
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
    } else if (userRole === 'attendee') {
      return 'Top Attendees';
    } else if (userRole === 'team_leader') {
      return `My Team: ${userTeam}`;
    } else {
      return `Top ${userRole?.replace('_', ' ')}s`;
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
          onClick={isBlindMode ? fetchCurrentUserData : fetchLeaderboard}
          className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all duration-300 btn-animate"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Blind Mode View for Non-Admin Users
  if (isBlindMode) {
    return (
      <div className="w-full fade-in-up-blur">
        {/* Blind Mode Header */}
        <div className="mb-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <EyeOff className="h-6 w-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-800">Blind Mode</h2>
          </div>
          <p className="text-center text-gray-600 text-sm">
            Rankings are hidden. Focus on your own progress!
          </p>
        </div>

        {/* Current User Score Card */}
        {currentUserData ? (
          <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl shadow-lg fade-in-blur">
            <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center justify-center">
              <Star className="h-5 w-5 mr-2" />
              Your Score
            </h3>
            
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar */}
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {currentUserData.first_name?.charAt(0)}{currentUserData.last_name?.charAt(0)}
                </span>
              </div>

              {/* Name */}
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {currentUserData.first_name} {currentUserData.last_name}
                </p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getRoleColor(currentUserData.role)}`}>
                  {getRoleIcon(currentUserData.role)}
                  <span className="ml-1 capitalize">{currentUserData.role.replace('_', ' ')}</span>
                </span>
              </div>

              {/* Score */}
              <div className="text-center bg-white rounded-lg px-8 py-6 shadow-md">
                <p className="text-5xl font-bold text-orange-600 mb-2">{currentUserData.score}</p>
                <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Points</p>
              </div>

              {/* Rank */}
              <div className="text-center bg-white rounded-lg px-6 py-4 shadow-md">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  {getRankIcon(currentUserData.rank)}
                </div>
                <p className="text-lg font-semibold text-gray-700">Rank #{currentUserData.rank}</p>
              </div>

              {/* Motivational Message */}
              <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
                <p className="text-center text-gray-700 text-sm">
                  🎯 Keep collecting points and climbing the ranks!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 fade-in-scale">
            <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No score data available</p>
            <p className="text-gray-400 text-sm mt-2">Start participating to earn points!</p>
          </div>
        )}
      </div>
    );
  }

  // Admin Full Leaderboard View
  return (
    <div className="w-full fade-in-up-blur">
      {/* Tab Controls */}
      <div className="flex flex-col space-y-4 mb-6 border-b pb-4 fade-in-left">
        <div className="flex space-x-4">
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
        {activeTab === 'team' && availableTeams.length > 0 && (
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Select Team:
            </label>
            <TeamSelector />
          </div>
        )}
      </div>

      {/* Current User Highlight */}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-orange-600" />
            {getTabTitle()}
          </h3>
          <p className="text-sm text-gray-500">Top {Math.min(leaderboardData.length, 100)}</p>
        </div>

        {leaderboardData.length === 0 ? (
          <div className="text-center py-8 fade-in-scale">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available</p>
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
    </div>
  );
};

export default Leaderboard;