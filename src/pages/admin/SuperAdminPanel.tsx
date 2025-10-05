import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Database, 
  Server, 
  Lock, 
  Key, 
  AlertTriangle,
  Settings,
  Monitor,
  HardDrive,
  Cpu,
  Network
} from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  active_connections: number;
  database_size: number;
}

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string;
  permissions: string[];
}

interface SecurityLog {
  id: string;
  event_type: string;
  user_name: string;
  ip_address: string;
  timestamp: string;
  details: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export const SuperAdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system' | 'admins' | 'security' | 'database' | 'config'>('system');

  useEffect(() => {
    fetchSuperAdminData();
    // Set up real-time monitoring
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSuperAdminData = async () => {
    try {
      await Promise.all([
        fetchSystemMetrics(),
        fetchAdminUsers()
      ]);
    } catch (error) {
      console.error('Error fetching super admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const { data } = await supabase
        .rpc('get_system_metrics');

      if (data) {
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const { data } = await supabase
        .from('users_profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          created_at,
          last_login,
          permissions
        `)
        .in('role', ['admin', 'team_leader'])
        .order('created_at', { ascending: false });

      if (data) {
        setAdminUsers(data);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };


  const createAdminUser = async () => {
    const email = prompt('Enter admin email:');
    const role = prompt('Enter role (admin/team_leader):');
    
    if (email && role && ['admin', 'team_leader'].includes(role)) {
      try {
        const { error } = await supabase
          .rpc('create_admin_user', {
            admin_email: email,
            admin_role: role,
            created_by: profile?.id
          });

        if (error) {
          alert(`Error creating admin: ${error.message}`);
        } else {
          alert('Admin user created successfully!');
          fetchAdminUsers();
        }
      } catch (error) {
        alert('Failed to create admin user');
      }
    }
  };

  const revokeAdminAccess = async (userId: string) => {
    if (confirm('Are you sure you want to revoke admin access? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('users_profiles')
          .update({ role: 'attendee' })
          .eq('id', userId);

        if (error) {
          alert(`Error revoking access: ${error.message}`);
        } else {
          alert('Admin access revoked successfully!');
          fetchAdminUsers();
        }
      } catch (error) {
        alert('Failed to revoke admin access');
      }
    }
  };

  const performDatabaseMaintenance = async () => {
    if (confirm('This will perform database maintenance operations. Continue?')) {
      try {
        const { error } = await supabase
          .rpc('perform_database_maintenance');

        if (error) {
          alert(`Maintenance error: ${error.message}`);
        } else {
          alert('Database maintenance completed successfully!');
        }
      } catch (error) {
        alert('Failed to perform database maintenance');
      }
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 animate-pulse';
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

  const getMetricColor = (value: number, thresholds: { warning: number, critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <DashboardLayout title="Super Admin Panel" subtitle="Advanced system administration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Super Admin Panel" 
      subtitle="Advanced system administration and security management"
    >
      <div className="space-y-8">
        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                <p className={`text-3xl font-bold ${getMetricColor(metrics?.cpu_usage || 0, { warning: 70, critical: 90 })}`}>
                  {metrics?.cpu_usage || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Cpu className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className={`text-3xl font-bold ${getMetricColor(metrics?.memory_usage || 0, { warning: 80, critical: 95 })}`}>
                  {metrics?.memory_usage || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Monitor className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                <p className={`text-3xl font-bold ${getMetricColor(metrics?.disk_usage || 0, { warning: 85, critical: 95 })}`}>
                  {metrics?.disk_usage || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-3xl font-bold text-purple-600">{metrics?.active_connections || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Network className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Critical Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-xl font-bold text-red-900">Critical System Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={performDatabaseMaintenance}
              className="flex items-center justify-center p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Database className="h-5 w-5 mr-2" />
              DB Maintenance
            </button>
            <button className="flex items-center justify-center p-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
              <Server className="h-5 w-5 mr-2" />
              Restart Services
            </button>
            <button className="flex items-center justify-center p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <Lock className="h-5 w-5 mr-2" />
              Emergency Lock
            </button>
            <button className="flex items-center justify-center p-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              <Settings className="h-5 w-5 mr-2" />
              System Config
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'system', label: 'System Monitor', icon: Monitor },
                { id: 'admins', label: 'Admin Management', icon: Users },
                { id: 'security', label: 'Security Logs', icon: Shield },
                { id: 'database', label: 'Database', icon: Database },
                { id: 'config', label: 'Configuration', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Real-time System Monitoring</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Resource Usage</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'CPU Usage', value: metrics?.cpu_usage || 0, max: 100, color: 'orange' },
                        { label: 'Memory Usage', value: metrics?.memory_usage || 0, max: 100, color: 'blue' },
                        { label: 'Disk Usage', value: metrics?.disk_usage || 0, max: 100, color: 'green' },
                        { label: 'Network I/O', value: metrics?.network_io || 0, max: 1000, color: 'purple' }
                      ].map((metric) => (
                        <div key={metric.label} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                            <span className="text-sm text-gray-600">
                              {metric.value}{metric.max === 100 ? '%' : ' MB/s'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-${metric.color}-500`}
                              style={{ width: `${(metric.value / metric.max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">System Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Database Size</span>
                        <span className="font-medium">{metrics?.database_size || 0} MB</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Active Sessions</span>
                        <span className="font-medium">{metrics?.active_connections || 0}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Uptime</span>
                        <span className="font-medium">7d 14h 32m</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Last Backup</span>
                        <span className="font-medium">2 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admins' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Administrator Management</h3>
                  <button
                    onClick={createAdminUser}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Create Admin
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Administrator</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Login</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((admin) => (
                        <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {admin.first_name} {admin.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{admin.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              admin.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {admin.last_login 
                              ? new Date(admin.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                                Edit
                              </button>
                              <button
                                onClick={() => revokeAdminAccess(admin.id)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Revoke
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Security Event Logs</h3>
                <div className="space-y-3">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{log.event_type}</h4>
                          <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>User: {log.user_name}</span>
                            <span>IP: {log.ip_address}</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(log.risk_level)}`}>
                          {log.risk_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Database Administration</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Database Status</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Connection Status</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Connected</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Database Size</span>
                        <span className="font-medium">{metrics?.database_size || 0} MB</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Active Queries</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Last Backup</span>
                        <span className="font-medium">2 hours ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Database Operations</h4>
                    <div className="space-y-3">
                      <button
                        onClick={performDatabaseMaintenance}
                        className="w-full flex items-center justify-center p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Run Maintenance
                      </button>
                      <button className="w-full flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <HardDrive className="h-4 w-4 mr-2" />
                        Create Backup
                      </button>
                      <button className="w-full flex items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                        <Monitor className="h-4 w-4 mr-2" />
                        Query Monitor
                      </button>
                      <button className="w-full flex items-center justify-center p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Emergency Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Security Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          defaultValue="30"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Login Attempts
                        </label>
                        <input
                          type="number"
                          defaultValue="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password Policy
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                          <option value="standard">Standard</option>
                          <option value="strict">Strict</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">System Limits</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Concurrent Users
                        </label>
                        <input
                          type="number"
                          defaultValue="10000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Rate Limit (req/min)
                        </label>
                        <input
                          type="number"
                          defaultValue="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Upload Limit (MB)
                        </label>
                        <input
                          type="number"
                          defaultValue="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors">
                      Save Configuration
                    </button>
                    <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                      Reset to Defaults
                    </button>
                    <button className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors">
                      Emergency Shutdown
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};