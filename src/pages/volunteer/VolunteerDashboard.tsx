import React, { useState, useEffect } from 'react';
import { QrCode, Heart, Users, Clock, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { QRScanner } from '../../components/shared/QRScanner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface VolunteerStats {
  scans_today: number;
  total_scans: number;
  points_earned: number;
  hours_volunteered: number;
}

interface RecentScan {
  id: string;
  attendee_name: string;
  scan_type: string;
  scanned_at: string;
  location: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_at: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export const VolunteerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
      }

      // Fetch recent scans
      const { data: scansData } = await supabase
        .from('attendances')
        .select(`
          id,
          scan_type,
          scanned_at,
          location,
          users_profiles!attendances_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('scanned_by', profile.id)
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (scansData) {
        const formattedScans = scansData.map(scan => ({
          id: scan.id,
          attendee_name: `${scan.users_profiles?.first_name} ${scan.users_profiles?.last_name}`,
          scan_type: scan.scan_type,
          scanned_at: scan.scanned_at,
          location: scan.location || 'Unknown'
        }));
        setRecentScans(formattedScans);
      }

      // Fetch assigned tasks (mock data for now)
      setTasks([
        {
          id: '1',
          title: 'Registration Desk Support',
          description: 'Help attendees with check-in process',
          assigned_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 86400000).toISOString(),
          status: 'in_progress',
          priority: 'high'
        },
        {
          id: '2',
          title: 'Session Room Setup',
          description: 'Prepare Room A for afternoon sessions',
          assigned_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 43200000).toISOString(),
          status: 'pending',
          priority: 'medium'
        }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      // Process the QR scan
      const { data, error } = await supabase
        .rpc('process_volunteer_scan', {
          volunteer_id: profile?.id,
          qr_data: qrData,
          scan_type: 'entry',
          location: 'Main Entrance'
        });

      if (error) {
        setScanResult({ type: 'error', message: error.message });
      } else {
        setScanResult({ type: 'success', message: 'Scan successful!' });
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      setScanResult({ type: 'error', message: 'Failed to process scan' });
    }

    // Clear result after 3 seconds
    setTimeout(() => setScanResult(null), 3000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      subtitle={`Welcome back, ${profile?.first_name}! Thank you for volunteering.`}
    >
      <div className="space-y-8">
        {/* Scan Result Alert */}
        {scanResult && (
          <div className={`p-4 rounded-lg border ${
            scanResult.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {scanResult.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {scanResult.message}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scans Today</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.scans_today || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <QrCode className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Scans</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.total_scans || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

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

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hours Volunteered</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.hours_volunteered || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Scan className="h-5 w-5 mr-2" />
              Scan QR Code
            </button>
            <button className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Users className="h-5 w-5 mr-2" />
              View Attendees
            </button>
            <button className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <CheckCircle className="h-5 w-5 mr-2" />
              Mark Task Complete
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Scans */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Scans</h2>
            <div className="space-y-4">
              {recentScans.length > 0 ? (
                recentScans.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{scan.attendee_name}</p>
                      <p className="text-sm text-gray-600">{scan.location}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(scan.scanned_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      scan.scan_type === 'entry' ? 'bg-green-100 text-green-800' :
                      scan.scan_type === 'exit' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {scan.scan_type}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No scans yet today</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Assigned Tasks</h2>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    {task.status !== 'completed' && (
                      <button className="text-orange-600 hover:text-orange-700 font-medium">
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title="Scan Attendee QR Code"
        description="Position the attendee's QR code within the frame"
      />
    </DashboardLayout>
  );
};