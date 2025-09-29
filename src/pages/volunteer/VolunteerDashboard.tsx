import React, { useState, useEffect } from 'react';
import { Heart, Trophy, Activity, Clock } from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRankingAndScore, getRecentActivities } from '../../lib/supabase';

interface VolunteerStats {
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

export const VolunteerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch user ranking and score using the existing function
      const { data: statsData, error: statsError } = await getUserRankingAndScore(profile.id);
      
      if (statsError) {
        console.error('Error fetching volunteer stats:', statsError);
        // Set default stats on error
        setStats({
          score: profile.score || 0,
          rank: 0,
          total_users: 0
        });
      } else if (statsData) {
        setStats(statsData);
      }

      // Fetch recent activities
      const { data: activitiesData, error: activitiesError } = await getRecentActivities(profile.id, 5);
      
      if (activitiesError) {
        console.error('Error fetching recent activities:', activitiesError);
        setRecentActivities([]);
      } else {
        setRecentActivities(activitiesData || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default stats on error
      setStats({
        score: profile.score || 0,
        rank: 0,
        total_users: 0
      });
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityType = (activityType: string) => {
    return activityType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Volunteer Dashboard" subtitle="Welcome to your volunteer portal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Volunteer Dashboard" 
      subtitle={`Welcome back, ${profile?.first_name}!`}
    >
      <div className="fade-in-up-blur">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto grid-stagger-blur">
        {/* Points Card */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Points Earned</p>
              <p className="text-3xl font-bold text-green-600">{stats?.score || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Leaderboard Rank Card */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Your Rank</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.rank ? `#${stats.rank}` : 'N/A'}
              </p>
              {stats?.total_users && (
                <p className="text-xs text-gray-500">of {stats.total_users}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Recent Activities Card */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 card-hover-enhanced dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="text-2xl font-bold text-purple-600">
                {recentActivities.length > 0 ? `+${recentActivities[0]?.points || 0}` : '0'}
              </p>
              {recentActivities.length > 0 && (
                <p className="text-xs text-gray-500">Latest points</p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities List */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 fade-in-blur card-hover dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          </div>
          
          {recentActivities.length > 0 ? (
            <div className="space-y-3 stagger-children">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg smooth-hover"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {formatActivityType(activity.activity_type)}
                    </p>
                    {activity.activity_description && (
                      <p className="text-sm text-gray-600">
                        {activity.activity_description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.awarded_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.points > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {activity.points > 0 ? '+' : ''}{activity.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 fade-in-scale">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No recent activities</p>
              <p className="text-sm text-gray-400">
                Start participating to earn points and see your activities here!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Volunteer Information */}
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 fade-in-blur card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Volunteer Information</h3>
          <p className="text-gray-700 leading-relaxed">
            Thank you for your dedication and hard work! Your contributions make this event possible.
            <br />
            If anything comes up, refer to your team leader.
          </p>
          {profile?.volunteer_id && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-200 text-orange-800">
              ID: {profile.volunteer_id}
            </div>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
};