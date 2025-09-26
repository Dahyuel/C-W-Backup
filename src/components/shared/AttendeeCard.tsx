import React, { useState } from 'react';
import { X, User, UserCheck, UserX, Crown, Shield, Users, Phone, Mail, MapPin, Clock } from 'lucide-react';

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
    last_scan?: string;
  } | null;
  onAction: (action: 'enter' | 'exit') => Promise<void>;
  loading?: boolean;
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
  loading = false
}) => {
  const [actionLoading, setActionLoading] = useState<'enter' | 'exit' | null>(null);

  if (!isOpen || !attendee) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Attendee Details</h3>
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
                {attendee.current_status && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    attendee.current_status === 'inside' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attendee.current_status === 'inside' ? '🟢 Inside' : '🔴 Outside'}
                  </span>
                )}
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
          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => handleAction('enter')}
              disabled={loading || actionLoading !== null}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                actionLoading === 'enter' 
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
              disabled={loading || actionLoading !== null}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                actionLoading === 'exit' 
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
        </div>
      </div>
    </div>
  );
};