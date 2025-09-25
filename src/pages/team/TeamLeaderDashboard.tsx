import React, { useState, useEffect } from 'react';
import { Users, BarChart3, MessageSquare, Settings, Award, Clock, Target, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/shared/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TeamStats {
  total_team_members: number;
  active_volunteers: number;
  completed_tasks: number;
  pending_tasks: number;
  team_performance_score: number;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  last_active: string;
  tasks_completed: number;
  performance_score: number;
  status: 'active' | 'inactive' | 'break';
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_to_name: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  priority: 'info' | 'warning' | 'urgent';
}

export const TeamLeaderDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'tasks' | 'announcements'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch team stats
      const { data: statsData } = await supabase
        .rpc('get_team_leader_stats', { leader_id: profile?.id });

      if (statsData) {
        setStats(statsData);
      }

      // Fetch team members
      const { data: membersData } = await supabase
        .from('users_profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          email,
          last_active,
          tasks_completed,
          performance_score
        `)
        .in('role', ['volunteer', 'registration', 'building'])
        .order('performance_score', { ascending: false });

      if (membersData) {
        const membersWithStatus = membersData.map(member => ({
          ...member,
          status: getActivityStatus(member.last_active),
          tasks_completed: member.tasks_completed || 0,
          performance_score: member.performance_score || 0
        }));
        setTeamMembers(membersWithStatus);
      }

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          assigned_to,
          status,
          priority,
          due_date,
          created_at,
          users_profiles!tasks_assigned_to_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (tasksData) {
        const formattedTasks = tasksData.map(task => ({
          ...task,
          assigned_to_name: `${task.users_profiles?.first_name} ${task.users_profiles?.last_name}`
        }));
        setTasks(formattedTasks);
      }

      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (announcementsData) {
        setAnnouncements(announcementsData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityStatus = (lastActive: string): 'active' | 'inactive' | 'break' => {
    if (!lastActive) return 'inactive';
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 15) return 'active';
    if (diffMinutes < 60) return 'break';
    return 'inactive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'break':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const broadcastAnnouncement = async () => {
    const title = prompt('Announcement Title:');
    const message = prompt('Announcement Message:');
    
    if (title && message) {
      try {
        const { error } = await supabase
          .from('announcements')
          .insert({
            title,
            message,
            created_by: profile?.id,
            priority: 'info'
          });

        if (error) {
          alert(`Error creating announcement: ${error.message}`);
        } else {
          alert('Announcement sent successfully!');
          fetchDashboardData();
        }
      } catch (error) {
        alert('Failed to send announcement');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Team Leader Dashboard" subtitle="Manage your team and operations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Team Leader Dashboard" 
      subtitle="Manage your team, assign tasks, and monitor performance"
    >
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-3xl font-bold text-orange-600">{stats?.total_team_members || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Now</p>
                <p className="text-3xl font-bold text-green-600">{stats?.active_volunteers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.completed_tasks || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Performance</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.team_performance_score || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={broadcastAnnouncement}
              className="flex items-center justify-center p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Broadcast Message
            </button>
            <button className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Users className="h-5 w-5 mr-2" />
              Assign Task
            </button>
            <button className="flex items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <BarChart3 className="h-5 w-5 mr-2" />
              View Reports
            </button>
            <button className="flex items-center justify-center p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <Settings className="h-5 w-5 mr-2" />
              Team Settings
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-orange-100">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'team', label: 'Team Members', icon: Users },
                { id: 'tasks', label: 'Tasks', icon: Target },
                { id: 'announcements', label: 'Announcements', icon: MessageSquare }
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
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Performance Chart Placeholder */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Team Performance Trends</h3>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Performance chart would go here</p>
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                  <div className="space-y-3">
                    {teamMembers.slice(0, 5).map((member, index) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                            'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{member.performance_score}%</p>
                          <p className="text-sm text-gray-600">{member.tasks_completed} tasks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
                    Add Member
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Performance</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Tasks</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {member.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full"
                                  style={{ width: `${member.performance_score}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{member.performance_score}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{member.tasks_completed}</td>
                          <td className="py-3 px-4">
                            <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Task Management</h3>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
                    Create Task
                  </button>
                </div>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Assigned to: {task.assigned_to_name}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        <div className="space-x-2">
                          <button className="text-orange-600 hover:text-orange-700 font-medium">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-700 font-medium">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'announcements' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Announcements</h3>
                  <button
                    onClick={broadcastAnnouncement}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    New Announcement
                  </button>
                </div>
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          announcement.priority === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{announcement.message}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(announcement.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};