import React, { useState, useEffect } from 'react';
import { Building, Users, MapPin, AlertTriangle, QrCode, Activity, Clock, Shield } from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { QRScanner } from '../../components/shared/QRScanner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface BuildingStats {
  current_occupancy: number;
  max_capacity: number;
  entries_today: number;
  exits_today: number;
  emergency_alerts: number;
}

interface LocationData {
  id: string;
  name: string;
  current_count: number;
  max_capacity: number;
  status: 'normal' | 'crowded' | 'full' | 'emergency';
  last_updated: string;
}

interface RecentActivity {
  id: string;
  user_name: string;
  action: 'entry' | 'exit';
  location: string;
  timestamp: string;
  scanner_name: string;
}

export const BuildTeamDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<BuildingStats | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Main Entrance');
  const [scanType, setScanType] = useState<'entry' | 'exit'>('entry');

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch building stats
      const { data: statsData } = await supabase
        .rpc('get_building_stats');

      if (statsData) {
        setStats(statsData);
      }

      // Fetch location data
      const { data: locationsData } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (locationsData) {
        const locationsWithStatus = locationsData.map(location => ({
          ...location,
          status: getLocationStatus(location.current_count, location.max_capacity)
        }));
        setLocations(locationsWithStatus);
      }

      // Fetch recent activity
      const { data: activityData } = await supabase
        .from('attendances')
        .select(`
          id,
          scan_type,
          location,
          scanned_at,
          users_profiles!attendances_user_id_fkey (
            first_name,
            last_name
          ),
          scanner:users_profiles!attendances_scanned_by_fkey (
            first_name,
            last_name
          )
        `)
        .in('scan_type', ['building_entry', 'building_exit'])
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (activityData) {
        const formattedActivity = activityData.map(activity => ({
          id: activity.id,
          user_name: `${activity.users_profiles?.first_name} ${activity.users_profiles?.last_name}`,
          action: activity.scan_type === 'building_entry' ? 'entry' : 'exit' as 'entry' | 'exit',
          location: activity.location || 'Unknown',
          timestamp: activity.scanned_at,
          scanner_name: `${activity.scanner?.first_name} ${activity.scanner?.last_name}`
        }));
        setRecentActivity(formattedActivity);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationStatus = (current: number, max: number): 'normal' | 'crowded' | 'full' | 'emergency' => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'full';
    if (percentage >= 80) return 'crowded';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'crowded':
        return 'bg-yellow-100 text-yellow-800';
      case 'full':
        return 'bg-red-100 text-red-800';
      case 'emergency':
        return 'bg-red-100 text-red-800 animate-pulse';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      // Process building entry/exit scan
      const { data, error } = await supabase
        .rpc('process_building_scan', {
          scanner_id: profile?.id,
          qr_data: qrData,
          scan_type: scanType === 'entry' ? 'building_entry' : 'building_exit',
          location: selectedLocation
        });

      if (error) {
        alert(`Scan error: ${error.message}`);
      } else {
        alert(`${scanType === 'entry' ? 'Entry' : 'Exit'} scan successful!`);
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      alert('Failed to process scan');
    }
  };

  const triggerEmergencyAlert = async () => {
    if (confirm('Are you sure you want to trigger an emergency alert? This will notify all relevant personnel.')) {
      try {
        const { error } = await supabase
          .rpc('trigger_emergency_alert', {
            triggered_by: profile?.id,
            location: selectedLocation,
            alert_type: 'evacuation'
          });

        if (error) {
          alert(`Error triggering alert: ${error.message}`);
        } else {
          alert('Emergency alert triggered successfully!');
        }
      } catch (error) {
        alert('Failed to trigger emergency alert');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Building Team Dashboard" subtitle="Monitor building access and capacity">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Building Team Dashboard" 
      subtitle="Monitor building access, capacity, and security"
    >
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Occupancy</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats?.current_occupancy || 0}
                </p>
                <p className="text-xs text-gray-500">
                  of {stats?.max_capacity || 0} capacity
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
                <p className="text-sm font-medium text-gray-600">Entries Today</p>
                <p className="text-3xl font-bold text-green-600">{stats?.entries_today || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Exits Today</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.exits_today || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emergency Alerts</p>
                <p className="text-3xl font-bold text-red-600">{stats?.emergency_alerts || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex space-x-2">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="Main Entrance">Main Entrance</option>
                <option value="Side Entrance">Side Entrance</option>
                <option value="Emergency Exit">Emergency Exit</option>
                <option value="Conference Hall">Conference Hall</option>
                <option value="Exhibition Area">Exhibition Area</option>
              </select>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as 'entry' | 'exit')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <QrCode className="h-5 w-5 mr-2" />
              Scan {scanType === 'entry' ? 'Entry' : 'Exit'}
            </button>
            <button className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <MapPin className="h-5 w-5 mr-2" />
              View Floor Plan
            </button>
            <button className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <Shield className="h-5 w-5 mr-2" />
              Security Check
            </button>
            <button
              onClick={triggerEmergencyAlert}
              className="flex items-center justify-center p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Alert
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Status */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Location Status</h2>
            <div className="space-y-4">
              {locations.map((location) => (
                <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(location.status)}`}>
                      {location.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {location.current_count} / {location.max_capacity} people
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round((location.current_count / location.max_capacity) * 100)}% full
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        location.status === 'full' ? 'bg-red-500' :
                        location.status === 'crowded' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((location.current_count / location.max_capacity) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(location.last_updated).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.action === 'entry' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Activity className={`h-4 w-4 ${
                          activity.action === 'entry' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.user_name}</p>
                        <p className="text-sm text-gray-600">
                          {activity.action === 'entry' ? 'Entered' : 'Exited'} {activity.location}
                        </p>
                        <p className="text-xs text-gray-500">
                          Scanned by {activity.scanner_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.action === 'entry' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.action}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title={`Building ${scanType === 'entry' ? 'Entry' : 'Exit'} Scan`}
        description={`Scan attendee QR code for ${scanType} at ${selectedLocation}`}
      />
    </DashboardLayout>
  );
};