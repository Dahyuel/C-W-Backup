import React, { useState } from 'react';
import { X, User, UserCheck, UserX, Crown, Shield, Users, Phone, Mail, MapPin, Clock, UserPlus } from 'lucide-react';

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
    current_status?: 'inside' | 'outside';
    building_entry?: boolean;
    event_entry?: boolean;
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

  if (!isOpen || !attendee) return null;

  // Determine current status based on mode and attendee data
  const getCurrentStatus = () => {
    if (mode === 'session') {
      // For session mode, check if attendee is already in the event
      return attendee.event_entry ? 'inside_event' : 'outside_event';
    } else {
      // For building mode, check if attendee is inside the building
      return attendee.building_entry ? 'inside_building' : 'outside_building';
    }
  };

  const currentStatus = getCurrentStatus();

  const handleAction = async (action: 'enter' | 'exit') => {
    setActionLoading(action);
    try {
      await onAction(action);
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

  const getStatusDisplay = () => {
    if (mode === 'session') {
      return currentStatus === 'inside_event' 
        ? { text: 'Inside Event', color: 'bg-green-100 text-green-800', icon: '🟢' }
        : { text: 'Outside Event', color: 'bg-red-100 text-red-800', icon: '🔴' };
    } else {
      return currentStatus === 'inside_building'
        ? { text: 'Inside Building', color: 'bg-green-100 text-green-800', icon: '🟢' }
        : { text: 'Outside Building', color: 'bg-red-100 text-red-800', icon: '🔴' };
    }
  };

  const statusDisplay = getStatusDisplay();

  const getActionButtons = () => {
    if (mode === 'session') {
      // Session mode: only show "Add to Session" button, disabled if already in event
      const isAlreadyInEvent = currentStatus === 'inside_event';
      
      return (
        <div className="pt-4">
          <button
            onClick={() => handleAction('enter')}
            disabled={loading || actionLoading !== null || isAlreadyInEvent}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              actionLoading === 'enter' 
                ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                : isAlreadyInEvent
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {actionLoading === 'enter' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                <span>{isAlreadyInEvent ? 'Already in Event' : 'Add to Session'}</span>
              </>
            )}
          </button>
          {sessionTitle && (
            <p className="text-sm text-gray-600 text-center mt-2">
              {isAlreadyInEvent ? 'Already registered for sessions' : `Adding to: ${sessionTitle}`}
            </p>
          )}
        </div>
      );
    }

    // Building mode: show both Enter and Exit buttons with proper disabling
    const isInsideBuilding = currentStatus === 'inside_building';
    const isOutsideBuilding = currentStatus === 'outside_building';

    return (
      <div className="flex space-x-3 pt-4">
        <button
          onClick={() => handleAction('enter')}
          disabled={loading || actionLoading !== null || isInsideBuilding}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            actionLoading === 'enter' 
              ? 'bg-green-100 text-green-700 cursor-not-allowed' 
              : isInsideBuilding
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {actionLoading === 'enter' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
          ) : (
            <>
              <UserCheck className="h-5 w-5" />
              <span>{isInsideBuilding ? 'Already Inside' : 'Enter'}</span>
            </>
          )}
        </button>

        <button
          onClick={() => handleAction('exit')}
          disabled={loading || actionLoading !== null || isOutsideBuilding}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            actionLoading === 'exit' 
              ? 'bg-red-100 text-red-700 cursor-not-allowed' 
              : isOutsideBuilding
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {actionLoading === 'exit' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
          ) : (
            <>
              <UserX className="h-5 w-5" />
              <span>{isOutsideBuilding ? 'Already Outside' : 'Exit'}</span>
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
              {getRoleIcon(attendee.role)}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900">
                {attendee.first_name} {attendee.last_name}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(attendee.role)}`}>
                  {formatRole(attendee.role)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                  {statusDisplay.icon} {statusDisplay.text}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-gray-600">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{attendee.email}</span>
            </div>
            
            {attendee.phone && (
              <div className="flex items-center space-x-3 text-gray-600">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{attendee.phone}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 text-gray-600">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                ID: {attendee.personal_id}
              </span>
            </div>

            {attendee.university && (
              <div className="flex items-center space-x-3 text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <div>{attendee.university}</div>
                  {attendee.faculty && (
                    <div className="text-gray-500 text-xs">{attendee.faculty}</div>
                  )}
                </div>
              </div>
            )}

            {attendee.last_scan && (
              <div className="flex items-center space-x-3 text-gray-600">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <div>Last Scan: {formatLastScan(attendee.last_scan)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
};