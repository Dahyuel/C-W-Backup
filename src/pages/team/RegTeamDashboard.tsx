import React, { useState, useEffect } from 'react';
import { UserCheck, Users, Search, Filter, QrCode, Download, Eye } from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { QRScanner } from '../../components/shared/QRScanner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface RegistrationStats {
  total_registered: number;
  checked_in_today: number;
  pending_verification: number;
  total_attendees: number;
}

interface Attendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  university: string;
  faculty: string;
  role: string;
  created_at: string;
  last_check_in: string | null;
  verification_status: 'verified' | 'pending' | 'rejected';
}

export const RegTeamDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchTerm, filterRole, filterStatus]);

  const fetchDashboardData = async () => {
    try {
      // Fetch registration stats
      const { data: statsData } = await supabase
        .rpc('get_registration_stats');

      if (statsData) {
        setStats(statsData);
      }

      // Fetch all attendees
      const { data: attendeesData } = await supabase
        .from('users_profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          university,
          faculty,
          role,
          created_at,
          verification_status
        `)
        .order('created_at', { ascending: false });

      if (attendeesData) {
        // Get last check-in for each attendee
        const attendeesWithCheckIn = await Promise.all(
          attendeesData.map(async (attendee) => {
            const { data: checkInData } = await supabase
              .from('attendances')
              .select('scanned_at')
              .eq('user_id', attendee.id)
              .order('scanned_at', { ascending: false })
              .limit(1);

            return {
              ...attendee,
              last_check_in: checkInData?.[0]?.scanned_at || null,
              verification_status: attendee.verification_status || 'pending'
            };
          })
        );

        setAttendees(attendeesWithCheckIn);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = attendees;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(attendee =>
        `${attendee.first_name} ${attendee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.university.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(attendee => attendee.role === filterRole);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(attendee => attendee.verification_status === filterStatus);
    }

    setFilteredAttendees(filtered);
  };

  const handleScan = async (qrData: string) => {
    try {
      // Process registration scan
      const { data, error } = await supabase
        .rpc('process_registration_scan', {
          scanner_id: profile?.id,
          qr_data: qrData,
          scan_type: 'registration_check_in'
        });

      if (error) {
        alert(`Scan error: ${error.message}`);
      } else {
        alert('Registration scan successful!');
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      alert('Failed to process scan');
    }
  };

  const updateVerificationStatus = async (attendeeId: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('users_profiles')
        .update({ verification_status: status })
        .eq('id', attendeeId);

      if (error) {
        alert(`Error updating status: ${error.message}`);
      } else {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      alert('Failed to update verification status');
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Name', 'Email', 'University', 'Faculty', 'Role', 'Registration Date', 'Last Check-in', 'Status'],
      ...filteredAttendees.map(attendee => [
        `${attendee.first_name} ${attendee.last_name}`,
        attendee.email,
        attendee.university,
        attendee.faculty,
        attendee.role,
        new Date(attendee.created_at).toLocaleDateString(),
        attendee.last_check_in ? new Date(attendee.last_check_in).toLocaleDateString() : 'Never',
        attendee.verification_status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendees_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout title="Registration Team Dashboard" subtitle="Manage attendee registrations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Registration Team Dashboard" 
      subtitle="Manage attendee registrations and check-ins"
    >
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Registered</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.total_registered || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Checked In Today</p>
                <p className="text-3xl font-bold text-green-600">{stats?.checked_in_today || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                <p className="text-3xl font-bold text-yellow-600">{stats?.pending_verification || 0}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Eye className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attendees</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.total_attendees || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
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
              <QrCode className="h-5 w-5 mr-2" />
              Scan Check-in
            </button>
            <button
              onClick={exportData}
              className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Data
            </button>
            <button className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <UserCheck className="h-5 w-5 mr-2" />
              Bulk Verify
            </button>
          </div>
        </div>

        {/* Attendees Management */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Attendee Management</h2>
            <div className="text-sm text-gray-600">
              Showing {filteredAttendees.length} of {attendees.length} attendees
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search attendees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Roles</option>
              <option value="attendee">Attendees</option>
              <option value="volunteer">Volunteers</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <button className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>

          {/* Attendees Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">University</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Check-in</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee) => (
                  <tr key={attendee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {attendee.first_name} {attendee.last_name}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{attendee.email}</td>
                    <td className="py-3 px-4 text-gray-600">{attendee.university}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendee.role === 'attendee' ? 'bg-blue-100 text-blue-800' :
                        attendee.role === 'volunteer' ? 'bg-pink-100 text-pink-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {attendee.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        attendee.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                        attendee.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {attendee.verification_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {attendee.last_check_in 
                        ? new Date(attendee.last_check_in).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        {attendee.verification_status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateVerificationStatus(attendee.id, 'verified')}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => updateVerificationStatus(attendee.id, 'rejected')}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAttendees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No attendees found matching your criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title="Registration Check-in"
        description="Scan attendee QR code for check-in"
      />
    </DashboardLayout>
  );
};