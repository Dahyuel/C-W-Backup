import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LogOut, 
  User, 
  Bell, 
  Settings, 
  Home,
  QrCode,
  Users,
  Building,
  Shield,
  Heart,
  BarChart3,
  UserCheck,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Trophy,
  Crown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import QRCode from 'qrcode';
import Leaderboard from './Leaderboard';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  sender: string;
  created_at: string;
  is_read: boolean;
}

interface PasswordChangeData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const { profile, signOut } = useAuth();
  
  // State management
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  // QR Code state
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  
  // Data state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userScore, setUserScore] = useState<number>(0);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Refs for click outside detection
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const profileModalRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and user score on component mount
  useEffect(() => {
    fetchNotifications();
    fetchUserScore();
  }, [profile?.id]);

  // Click outside handlers for dropdowns and modals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close profile dropdown if clicked outside
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      
      // Close notification dropdown if clicked outside
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
      
      // Close profile modal if clicked outside
      if (showProfileModal && profileModalRef.current && !profileModalRef.current.contains(event.target as Node)) {
        setShowProfileModal(false);
        setQrCodeUrl('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileModal]);

  // Generate QR Code when profile modal opens
  useEffect(() => {
    if (showProfileModal && profile?.id) {
      generateQRCode();
    }
  }, [showProfileModal, profile?.id]);

  const fetchNotifications = async () => {
    if (!profile?.id) return;

    try {
      // First get user_notifications for this user
      const { data: userNotifications, error } = await supabase
        .from('user_notifications')
        .select(`
          notification_id,
          is_read,
          read_at
        `)
        .eq('user_id', profile.id)
        .order('read_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching user notifications:', error);
        return;
      }

      if (!userNotifications || userNotifications.length === 0) {
        setNotifications([]);
        return;
      }

      // Get the actual notification details
      const notificationIds = userNotifications.map(un => un.notification_id);
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          created_by,
          created_at,
          users_profiles!notifications_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .in('id', notificationIds)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Error fetching notification details:', notificationsError);
        return;
      }

      // Combine the data
      const transformedNotifications: Notification[] = notificationsData.map(notification => {
        const userNotification = userNotifications.find(un => un.notification_id === notification.id);
        return {
          id: notification.id,
          title: notification.title || '',
          message: notification.message || '',
          sender: notification.users_profiles 
            ? `${notification.users_profiles.first_name} ${notification.users_profiles.last_name}`
            : 'System',
          created_at: notification.created_at || '',
          is_read: userNotification?.is_read || false
        };
      });

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUserScore = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('users_profiles')
        .select('score')
        .eq('id', profile.id)
        .single();

      if (error) {
        console.error('Error fetching user score:', error);
      } else if (data) {
        setUserScore(data.score || 0);
      }
    } catch (error) {
      console.error('Error fetching user score:', error);
    }
  };

  const generateQRCode = async () => {
    if (!profile?.id) return;
    
    setQrCodeLoading(true);
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(profile.id, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setQrCodeUrl('');
    } finally {
      setQrCodeLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    setShowProfileDropdown(false);
    
    try {
      console.log('🔄 Initiating logout...');
      await signOut();
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
      window.location.href = '/login';
    } finally {
      setLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setShowProfileDropdown(false);
  };

  const handleLeaderboardClick = () => {
    setShowLeaderboard(true);
    setShowProfileDropdown(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);
    setShowNotificationDropdown(false);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('notification_id', notificationId)
        .eq('user_id', profile?.id);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setShowNotificationModal(false);
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
      } else {
        setSuccess('Password updated successfully!');
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setSuccess(null);
        }, 2000);
      }
    } catch (error: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (profile?.role) {
      case 'attendee':
        return <User className="h-5 w-5" />;
      case 'volunteer':
        return <Heart className="h-5 w-5" />;
      case 'registration':
        return <UserCheck className="h-5 w-5" />;
      case 'building':
        return <Building className="h-5 w-5" />;
      case 'team_leader':
        return <Users className="h-5 w-5" />;
      case 'admin':
        return <Shield className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleColor = () => {
    switch (profile?.role) {
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamLabel = (team: string) => {
    const teamLabels: { [key: string]: string } = {
      'volunteer': 'Volunteers',
      'registration': 'Registration Team',
      'building': 'Building Team',
      'info_desk': 'Info Desk Team',
      'team_leader': 'Team Leaders',
      'ushers': 'Ushers',
      'marketing': 'Marketing Team',
      'media': 'Media Team',
      'ER': 'ER Team',
      'BD': 'BD Team',
      'catering': 'Catering Team',
      'feedback': 'Feedback Team',
      'stage': 'Stage Team'
    };
    
    return teamLabels[team] || team.charAt(0).toUpperCase() + team.slice(1);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100 relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="https://ypiwfedtvgmazqcwolac.supabase.co/storage/v1/object/public/Assets/logo.png" 
                  alt="Career Week Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold text-gray-900">ASU Career Week</span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" ref={notificationDropdownRef}>
                <button 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="relative p-2 text-gray-400 hover:text-orange-600 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
{/* Notification Dropdown - Fixed mobile positioning */}
{showNotificationDropdown && (
  <div className="fixed sm:absolute right-0 left-0 sm:left-auto mt-2 mx-4 sm:mx-0 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto fade-in-up-blur modal-content-blur">
    <div className="p-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
    </div>
    <div className="max-h-64 overflow-y-auto stagger-children">
      {notifications.length > 0 ? (
        notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-all duration-300 smooth-hover ${
              !notification.is_read ? 'bg-orange-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(notification.created_at).toLocaleDateString()}
                </p>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-orange-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
              )}
            </div>
          </button>
        ))
      ) : (
        <div className="p-8 text-center text-gray-500 fade-in-scale">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No notifications yet</p>
        </div>
      )}
    </div>
  </div>
)}
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  aria-label="Profile menu"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

               {showProfileDropdown && (
  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 fade-in-up-blur modal-content-blur">
    <div className="p-2 stagger-children">
      <button
        onClick={handleProfileClick}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-300 smooth-hover"
      >
        <User className="h-4 w-4 mr-3" />
        Profile
      </button>
      <button
        onClick={handleLeaderboardClick}
        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-300 smooth-hover"
      >
        <Trophy className="h-4 w-4 mr-3" />
        Leaderboard
      </button>
      <button
        onClick={handleSignOut}
        disabled={loggingOut}
        className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-all duration-300 smooth-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="h-4 w-4 mr-3" />
        {loggingOut ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  </div>
)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-gray-600">{subtitle}</p>
          )}
        </div>
        {children}
      </main>

     {/* Footer */}
      <footer className="bg-white border-t border-orange-100">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
         <div className="text-center">
           <p className="text-sm text-gray-600">
             Powered By{' '}
             <button
               onClick={() => window.open('https://www.nilebyte.info', '_blank')}
               className="text-orange-600 hover:text-orange-700 font-medium transition-colors underline"
             >
               @Nilebyte
             </button>
           </p>
         </div>
       </div>
     </footer>

      {/* Profile Modal */}
{showProfileModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop-blur">
    <div 
      ref={profileModalRef}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto modal-content-blur fade-in-up-blur"
    >
      <div className="p-6 stagger-children">
        <div className="flex items-center justify-between mb-6 fade-in-blur">
          <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
          <button
            onClick={() => {
              setShowProfileModal(false);
              setQrCodeUrl('');
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* QR Code Section */}
        <div className="text-center mb-6 fade-in-blur card-hover">
          <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center overflow-hidden smooth-hover">
            {qrCodeLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">Generating QR Code...</p>
              </div>
            ) : qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="Profile QR Code" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center">
                <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500">QR Code unavailable</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">Show this QR code for check-ins</p>
          {profile?.id && (
            <p className="text-xs text-gray-400 mt-1 font-mono break-all px-4">
              ID: {profile.id}
            </p>
          )}
        </div>

        {/* Score Display */}
        <div className="bg-orange-50 rounded-lg p-4 mb-6 text-center fade-in-blur card-hover">
          <div className="flex items-center justify-center mb-2">
            <Trophy className="h-6 w-6 text-orange-600 mr-2" />
            <span className="text-lg font-semibold text-orange-900">Your Score</span>
          </div>
          <div className="text-3xl font-bold text-orange-600">{userScore}</div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4 fade-in-blur">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.first_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.last_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900 break-all">{profile?.email || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.phone || 'Not provided'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Personal ID</label>
            <p className="mt-1 text-sm text-gray-900">{profile?.personal_id || 'Not provided'}</p>
          </div>
          
          {/* Volunteer ID - Show only for non-admin and non-attendee roles */}
          {profile?.role && !['admin', 'attendee'].includes(profile.role) && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Volunteer ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {profile?.volunteer_id || 'Not assigned'}
              </p>
              {!profile?.volunteer_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Your volunteer ID will be assigned by the event organizers
                </p>
              )}
            </div>
          )}
          
          {/* Team Leader Section */}
          {profile?.tl_team && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 fade-in-blur card-hover">
              <div className="flex items-center justify-center mb-2">
                <Crown className="h-5 w-5 text-indigo-600 mr-2" />
                <span className="text-md font-semibold text-indigo-900">Leader Of Team</span>
              </div>
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                  {getTeamLabel(profile.tl_team)}
                </span>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <div className="mt-1 flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor()}`}>
                {getRoleIcon()}
                <span className="ml-1 capitalize">{profile?.role?.replace('_', ' ')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 fade-in-blur">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Change Password
          </button>
          
          {qrCodeUrl && (
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.download = `qr-code-${profile?.first_name}-${profile?.last_name}.png`;
                link.href = qrCodeUrl;
                link.click();
              }}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Download QR Code
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}
     
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowPasswordModal(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setError(null);
            setSuccess(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 animate-fade-in">
                <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center animate-fade-in">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center animate-fade-in">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-green-700 text-sm">{success}</p>
                  </div>
                )}

                <div className="animate-fade-in" style={{animationDelay: '0.1s'}}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 animate-fade-in" style={{animationDelay: '0.3s'}}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                      setError(null);
                      setSuccess(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    {/* Notification Modal */}
{showNotificationModal && selectedNotification && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop-blur"
    onClick={() => {
      setShowNotificationModal(false);
      setSelectedNotification(null);
    }}
  >
    <div 
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6 stagger-children">
        <div className="flex items-center justify-between mb-6 fade-in-blur">
          <h2 className="text-xl font-bold text-gray-900">Notification</h2>
          <button
            onClick={() => {
              setShowNotificationModal(false);
              setSelectedNotification(null);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 fade-in-blur">
          <div>
            <h3 className="font-semibold text-gray-900">{selectedNotification.title}</h3>
          </div>
          <div>
            <p className="text-gray-700">{selectedNotification.message}</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>From: {selectedNotification.sender}</p>
            <p>Date: {new Date(selectedNotification.created_at).toLocaleString()}</p>
          </div>
        </div>

        {!selectedNotification.is_read && (
          <div className="mt-6 pt-6 border-t border-gray-200 fade-in-blur">
            <button
              onClick={() => markNotificationAsRead(selectedNotification.id)}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Mark as Read
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
)}
      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLeaderboard(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Trophy className="h-6 w-6 mr-3 text-orange-600" />
                  Leaderboard
                </h2>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                <Leaderboard 
                  userRole={profile?.role} 
                  currentUserId={profile?.id}
                  userTeam={profile?.tl_team}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;