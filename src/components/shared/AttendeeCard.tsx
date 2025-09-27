import React, { useState, useEffect } from 'react';
import { X, User, UserCheck, UserX, Crown, Shield, Users, Phone, Mail, MapPin, Clock, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AttendeeCardProps {
  isOpen: boolean;
  onClose: () => void;
  attendee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    personal_id: string;
    role: string;
    university?: string;
    faculty?: string;
    building_entry?: boolean;
    event_entry?: boolean;
    current_status?: 'inside' | 'outside' | 'inside_event' | 'outside_event';
    building_status?: 'inside_building' | 'outside_building';
    last_scan?: string;
  } | null;
  onAction: (action: 'enter' | 'exit') => Promise<void>;
  loading?: boolean;
  mode?: 'building' | 'session'; // New prop to determine which mode we're in
  sessionTitle?: string; // Optional session title for session mode
}

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
    case 'sadmin':
      return <Crown className="h-8 w-8 text-yellow-500" />;
    case 'team_leader':
    case 'registration':
    case 'building':
    case 'info_desk':
      return <Shield className="h-8 w-8 text-blue-500" />;
    case 'volunteer':
      return <Users className="h-8 w-8 text-green-500" />;
    default:
      return <User className="h-8 w-8 text-gray-500" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
    case 'sadmin':
      return 'bg-yellow-100 text-yellow-800';
    case 'team_leader':
    case 'registration':
    case 'building':
    case 'info_desk':
      return 'bg-blue-100 text-blue-800';
    case 'volunteer':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatRole = (role: string) => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const AttendeeCard: React.FC<AttendeeCardProps> = ({
  isOpen,
  onClose,
  attendee,
  onAction,
  loading = false,
  mode = 'building',
  sessionTitle
}) => {
  const [actionLoading, setActionLoading] = useState<'enter' | 'exit' | null>(null);
  const [currentAttendee, setCurrentAttendee] = useState(attendee);

  // Real-time status subscription
  useEffect(() => {
    if (!currentAttendee?.id) return;

    console.log('Setting up real-time subscription for attendee:', currentAttendee.id);
    
    const subscription = supabase
      .channel(`attendee_${currentAttendee.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users_profiles',
          filter: `id=eq.${currentAttendee.id}`
        },
        (payload) => {
          console.log('Real-time status update:', payload);
          if (payload.new) {
            setCurrentAttendee(prev => prev ? {
              ...prev,
              building_entry: payload.new.building_entry,
              event_entry: payload.new.event_entry,
              building_status: payload.new.building_entry ? 'inside_building' : 'outside_building',
              current_status: payload.new.event_entry ? 'inside_event' : 'outside_event'
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [currentAttendee?.id]);

  // Update currentAttendee when prop changes
  useEffect(() => {
    setCurrentAttendee(attendee);
  }, [attendee]);

  if (!isOpen || !currentAttendee) return null;

  const handleAction = async (action: 'enter' | 'exit') => {
    setActionLoading(action);
    try {
      await onAction(action);
      // The real-time subscription will handle the status update
    } finally {
      setActionLoading(null);
    }
  };

  const formatLastScan = (lastScan?: string) => {
    if (!lastScan) return 'Never';
    const date = new Date(lastScan);
    return date.toLocaleString();
  };

  const getCardTitle = () => {
    if (mode === 'session') {
      return 'Add to Session';
    }
    return 'Attendee Details';
  };

  // Determine current status based on mode and boolean flags
  const getCurrentStatus = () => {
    if (mode === 'building') {
      return currentAttendee.building_entry ? 'inside' : 'outside';
    } else {
      return currentAttendee.event_entry ? 'inside' : 'outside';
    }
  };

  const getStatusDisplay = () => {
    if (mode === 'building') {
      return currentAttendee.building_entry ? '🟢 Inside Building' : '🔴 Outside Building';
    } else {
      return currentAttendee.event_entry ? '🟢 Inside Event' : '🔴 Outside Event';
    }
  };

  const getStatusColor = () => {
    const isInside = mode === 'building' ? currentAttendee.building_entry : currentAttendee.event_entry;
    return isInside ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getActionButtons = () => {
    if (mode === 'session') {
      // Session mode: only show "Add to Session" button
      return (
        <div className="pt-4">
          <button
            onClick={() => handleAction('enter')}
            disabled={loading || actionLoading !== null}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              actionLoading === 'enter' 
                ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {actionLoading === 'enter' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                <span>Add to Session</span>
              </>
            )}
          </button>
          {sessionTitle && (
            <p className="text-sm text-gray-600 text-center mt-2">
              Adding to: <span className="font-medium">{sessionTitle}</span>
            </p>
          )}
        </div>
      );
    }

    // Building mode: show both Enter and Exit buttons with conditional disabling
    const currentStatus = getCurrentStatus();
    const isInside = currentStatus === 'inside';
    const isEnterDisabled = isInside || loading || actionLoading !== null;
    const isExitDisabled = !isInside || loading || actionLoading !== null;

    return (
      <div className="flex space-x-3 pt-4">
        <button
          onClick={() => handleAction('enter')}
          disabled={isEnterDisabled}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            isEnterDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : actionLoading === 'enter' 
                ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {actionLoading === 'enter' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
          ) : (
            <>
              <UserCheck className="h-5 w-5" />
              <span>Enter</span>
            </>
          )}
        </button>

        <button
          onClick={() => handleAction('exit')}
          disabled={isExitDisabled}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            isExitDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : actionLoading === 'exit' 
                ? 'bg-red-100 text-red-700 cursor-not-allowed' 
                : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {actionLoading === 'exit' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
          ) : (
            <>
              <UserX className="h-5 w-5" />
              <span>Exit</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{getCardTitle()}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading || actionLoading !== null}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 p-3 bg-gray-50 rounded-full">
              {getRoleIcon(currentAttendee.role)}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900">
                {currentAttendee.first_name} {currentAttendee.last_name}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(currentAttendee.role)}`}>
                  {formatRole(currentAttendee.role)}
                </span>
                {/* Dynamic status badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                  {getStatusDisplay()}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-600">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{currentAttendee.email}</span>
            </div>
            
            {currentAttendee.phone && (
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{currentAttendee.phone}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 text-gray-600">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                ID: {currentAttendee.personal_id}
              </span>
            </div>

            {currentAttendee.university && (
              <div className="flex items-center space-x-3 text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <div>{currentAttendee.university}</div>
                  {currentAttendee.faculty && (
                    <div className="text-gray-500 text-xs">{currentAttendee.faculty}</div>
                  )}
                </div>
              </div>
            )}

            {currentAttendee.last_scan && mode === 'building' && (
              <div className="flex items-center space-x-3 text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <div>Last Scan: {formatLastScan(currentAttendee.last_scan)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {getActionButtons()}

          {/* Status Info */}
          {mode === 'building' && (
            <div className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded-lg">
              <p>
                <strong>Enter:</strong> Available when outside • <strong>Exit:</strong> Available when inside
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};