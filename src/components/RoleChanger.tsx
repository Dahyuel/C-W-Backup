import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, X, Users, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ErrorPopup: React.FC<{
  message: string;
  onClose: () => void;
  type?: 'error' | 'success';
}> = ({ message, onClose, type = 'error' }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`rounded-lg shadow-lg border p-4 max-w-sm ${
        type === 'error'
          ? 'bg-red-50 border-red-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${
            type === 'error' ? 'text-red-600' : 'text-green-600'
          }`}>
            {type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              type === 'error' ? 'text-red-800' : 'text-green-800'
            }`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`flex-shrink-0 hover:opacity-70 transition-opacity ${
              type === 'error' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const RoleChanger: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, getRoleBasedRedirect } = useAuth();

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const roleOptions = [
    { value: 'registration', label: 'Registration Desk' },
    { value: 'building', label: 'Building Assistance' },
    { value: 'info_desk', label: 'Info Desk' },
    { value: 'ushers', label: 'Ushers' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'media', label: 'Media' },
    { value: 'ER', label: 'ER Team' },
    { value: 'BD team', label: 'BD Team' },
    { value: 'catering', label: 'Catering' },
    { value: 'feedback', label: 'Feedback Team' },
    { value: 'stage', label: 'Stage Team' },
    { value: 'team_leader', label: 'Team Leader' }
  ];

  const teamOptions = [
    { value: 'registration', label: 'Registration Team' },
    { value: 'building', label: 'Building Team' },
    { value: 'info_desk', label: 'Info Desk Team' },
    { value: 'ushers', label: 'Ushers Team' },
    { value: 'marketing', label: 'Marketing Team' },
    { value: 'media', label: 'Media Team' },
    { value: 'ER', label: 'ER Team' },
    { value: 'BD team', label: 'BD Team' },
    { value: 'catering', label: 'Catering Team' },
    { value: 'feedback', label: 'Feedback Team' },
    { value: 'stage', label: 'Stage Team' }
  ];

  useEffect(() => {
    if (profile) {
      setSelectedRole(profile.role || '');
      setSelectedTeam(profile.tl_team || '');
    }
  }, [profile]);

  useEffect(() => {
    if (selectedRole !== 'team_leader') {
      setSelectedTeam('');
    }
  }, [selectedRole]);

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
    setErrorPopup({ message, type });
  };

  const closeNotification = () => {
    setErrorPopup(null);
  };

  const handleConfirm = async () => {
    if (!selectedRole) {
      showNotification('Please select a role', 'error');
      return;
    }

    if (selectedRole === 'team_leader' && !selectedTeam) {
      showNotification('Please select a team to lead', 'error');
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        role: selectedRole,
        updated_at: new Date().toISOString()
      };

      if (selectedRole === 'team_leader') {
        updateData.tl_team = selectedTeam;
      } else {
        updateData.tl_team = null;
      }

      const { error: updateError } = await supabase
        .from('users_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) {
        console.error('Role update error:', updateError);
        showNotification('Failed to update role. Please try again.', 'error');
        setLoading(false);
        return;
      }

      await refreshProfile();

      showNotification('Role updated successfully!', 'success');

      setTimeout(() => {
        const redirectPath = getRoleBasedRedirect();
        navigate(redirectPath, { replace: true });
      }, 1500);

    } catch (error: any) {
      console.error('Role change error:', error);
      showNotification('An unexpected error occurred. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      {errorPopup && (
        <ErrorPopup
          message={errorPopup.message}
          type={errorPopup.type}
          onClose={closeNotification}
        />
      )}

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-orange-100 fade-in-scale">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <RefreshCw className="h-12 w-12 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Your Role</h1>
          <p className="text-gray-600">Select a new role and confirm to update your dashboard</p>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-orange-600 mr-2" />
              <h3 className="text-lg font-semibold text-orange-900">Select New Role</h3>
            </div>
            <p className="text-orange-800 text-sm mb-4">
              Choose the volunteer role you want to switch to. This will update your dashboard and permissions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roleOptions.map((option) => (
                <div
                  key={option.value}
                  className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all duration-300 ${
                    selectedRole === option.value
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRole(option.value)}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selectedRole === option.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                    <div className={`flex-shrink-0 transition-colors duration-300 ${
                      selectedRole === option.value ? 'text-orange-600' : 'text-gray-300'
                    }`}>
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedRole === 'team_leader' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 fade-in-scale">
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Team Leadership</h3>
              </div>
              <p className="text-blue-800 text-sm mb-4">
                As a Team Leader, select which team you will be leading.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Team to Lead *
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              >
                <option value="">Select team</option>
                {teamOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !selectedRole || (selectedRole === 'team_leader' && !selectedTeam)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Change
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
