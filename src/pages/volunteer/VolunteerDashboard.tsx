import React, { useState, useEffect } from 'react';
import { Heart, Trophy } from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface VolunteerStats {
  points_earned: number;
  leaderboard_rank: number;
}

export const VolunteerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch volunteer stats
      const { data: statsData } = await supabase
        .rpc('get_volunteer_stats', { volunteer_id: profile.id });

      if (statsData) {
        setStats(statsData);
      } else {
        // Set default stats if none found
        setStats({
          points_earned: 0,
          leaderboard_rank: 0
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default stats on error
      setStats({
        points_earned: 0,
        leaderboard_rank: 0
      });
    } finally {
      setLoading(false);
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
      subtitle={`Welcome back, ${profile?.first_name}! `}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Points Card */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Points Earned</p>
              <p className="text-3xl font-bold text-green-600">{stats?.points_earned || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Leaderboard Rank Card */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-l font-medium text-gray-600">Your Rank</p>
              <p className="text-3xl font-bold text-blue-600">#{stats?.leaderboard_rank || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Simple text div below the cards */}
      <div className="max-w-2xl mx-auto mt-8 text-center pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Volunteer Information</h3>
        <p className="text-gray-600">
          <br/>
          Thank you for your dedication and hard work! Your contributions make this event possible. 
          <br/> If anything comes up, refer to your team leader.
      
        </p>
      </div>
    </DashboardLayout>
  );
};