import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, User, Heart, Shield, Users, Building, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  score: number;
  rank: number;
}

interface LeaderboardProps {
  userRole?: string;
  currentUserId?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ userRole, currentUserId }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'volunteers' | 'attendees'>('attendees');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [userRole, activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('users_profiles')
        .select('id, first_name, last_name, role, score')
        .order('score', { ascending: false });

      // Determine which data to fetch based on user role and active tab
      if (userRole === 'admin') {
        // Admin can see both tabs
        if (activeTab === 'attendees') {
          // Show only attendees
          query = query.eq('role', 'attendee');
        } else {
          // Show volunteers tab: all roles except admin, attendee, and team_leader
          query = query.in('role', ['volunteer', 'registration', 'building', 'info_desk']);
        }
      } else if (userRole === 'attendee') {
        // Attendees only see other attendees
        query = query.eq('role', 'attendee');
      } else if (userRole === 'team_leader') {
        // Team leaders see only other team leaders
        query = query.eq('role', 'team_leader');
      } else {
        // Other roles (volunteer, registration, building, info_desk) see all non-attendees and non-admins, but exclude team_leader
        query = query.in('role', ['volunteer', 'registration', 'building', 'info_desk']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to load leaderboard');
        return;
      }

      // Add ranking to the data
      const rankedData: LeaderboardEntry[] = (data || []).map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      setLeaderboardData(rankedData);
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
      return activeTab === 'attendees' ? 'Top Attendees' : 'Top Volunteers';
    } else if (userRole === 'attendee') {
      return 'Top Attendees';
    } else if (userRole === 'team_leader') {
      return 'Top Team Leaders';
    } else {
      return 'Top Performers';
    }
  };

  const currentUserData = leaderboardData.find(user => user.id === currentUserId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchLeaderboard}
          className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Admin Tab Controls */}
      {userRole === 'admin' && (
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('attendees')}
            className={`py-2 px-4 font-semibold text-sm ${
              activeTab === 'attendees'
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-500 hover:text-orange-600"
            }`}
          >
            Attendees
          </button>
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`py-2 px-4 font-semibold text-sm ${
              activeTab === 'volunteers'
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-500 hover:text-orange-600"
            }`}
          >
            Volunteers
          </button>
        </div>
      )}

      {/* Current User Highlight */}
      {currentUserData && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
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
          <p className="text-sm text-gray-500">{leaderboardData.length} participants</p>
        </div>

        {leaderboardData.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboardData.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${getRankBackgroundColor(user.rank, isCurrentUser)} ${
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">{user.role.replace('_', ' ')}</span>
                      </span>
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