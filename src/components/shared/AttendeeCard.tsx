import React, { useState, useEffect } from 'react';
import { X, User, UserCheck, UserX, Crown, Shield, Users, Phone, Mail, MapPin, Clock, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createPortal } from 'react-dom';

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
  mode?: 'building' | 'session' | 'registration';
  sessionTitle?: string;
  disableAction?: boolean;
  disableReason?: string;
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
    } else if (mode === 'registration') {
      return currentAttendee.event_entry ? 'inside' : 'outside';
    } else {
      // For session mode, we don't need status checking for button disabling
      return 'outside';
    }
  };

  const getStatusDisplay = () => {
    if (mode === 'building') {
      return currentAttendee.building_entry ? 'Inside Building' : 'Outside Building';
    } else if (mode === 'registration') {
      return currentAttendee.event_entry ? 'Inside Event' : 'Outside Event';
    } else {
      // For session mode, show event status as context
      return currentAttendee.event_entry ? 'Inside Event' : 'Outside Event';
    }
  };

  const getStatusColor = () => {
    let isInside = false;
    
    if (mode === 'building') {
      isInside = currentAttendee.building_entry || false;
    } else if (mode === 'registration') {
      isInside = currentAttendee.event_entry || false;
    } else {
      // For session mode, show event status
      isInside = currentAttendee.event_entry || false;
    }
    
    return isInside ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getActionButtons = () => {
    if (mode === 'session') {
      // Session mode: check building_entry status
      const canEnterSession = currentAttendee.building_entry;
      
      return (
        <div className="pt-4 fade-in-blur">
          {/* Warning for attendees outside building */}
          {!canEnterSession && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 fade-in-blur">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-800 font-medium">
                  Attendee must be inside the building to join a session
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => handleAction('enter')}
            disabled={loading || actionLoading !== null || !canEnterSession}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
              !canEnterSession
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
                <UserPlus className="h-5 w-5" />
                <span>{canEnterSession ? 'Add to Session' : 'Cannot Add to Session'}</span>
              </>
            )}
          </button>
          
          {sessionTitle && (
            <p className="text-sm text-gray-600 text-center mt-2">
              {canEnterSession ? (
                <>Adding to: <span className="font-medium">{sessionTitle}</span></>
              ) : (
                <span className="text-red-600">Session: {sessionTitle}</span>
              )}
            </p>
          )}
          
          {/* Show building status for context */}
          <div className="mt-3 text-center fade-in-blur">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              currentAttendee.building_entry ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                currentAttendee.building_entry ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              {currentAttendee.building_entry ? 'Inside Building' : 'Outside Building'}
            </span>
          </div>
        </div>
      );
    }

    // Building/Registration mode: show both Enter and Exit buttons with conditional disabling
    const currentStatus = getCurrentStatus();
    const isInside = currentStatus === 'inside';
    
    // Building mode specific logic: must be inside event to enter building
    let isEnterDisabled = isInside || loading || actionLoading !== null;
    let enterDisabledReason = '';
    
    if (mode === 'building') {
      // Additional check for building mode: must be inside event first
      if (!currentAttendee.event_entry) {
        isEnterDisabled = true;
        enterDisabledReason = 'Must be inside event first';
      }
    }
    
    const isExitDisabled = !isInside || loading || actionLoading !== null;

    return (
      <div className="space-y-3 fade-in-blur">
        {/* Prerequisites warning for building mode */}
        {mode === 'building' && !currentAttendee.event_entry && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 fade-in-blur">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-amber-800 font-medium">
                Attendee must be inside event before entering building
              </p>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={() => handleAction('enter')}
            disabled={isEnterDisabled}
            title={enterDisabledReason}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
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
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
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
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur">
        <div className="p-6 stagger-children">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 fade-in-blur">
            <h3 className="text-xl font-bold text-gray-900">{getCardTitle()}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading || actionLoading !== null}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="flex items-center space-x-4 fade-in-blur">
              <div className="flex-shrink-0 p-3 bg-gray-50 rounded-full">
                {getRoleIcon(currentAttendee.role)}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900">
                  {currentAttendee.first_name} {currentAttendee.last_name}
                </h4>
                <div className="flex items-center space-x-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(currentAttendee.role)}`}>
                    {formatRole(currentAttendee.role)}
                  </span>
                  
                  {/* Show both event and building status for building mode */}
                  {mode === 'building' && (
                    <>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        currentAttendee.event_entry ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          currentAttendee.event_entry ? 'bg-blue-500' : 'bg-gray-500'
                        }`}></span>
                        {currentAttendee.event_entry ? 'Inside Event' : 'Outside Event'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          currentAttendee.building_entry ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        {getStatusDisplay()}
                      </span>
                    </>
                  )}
                  
                  {/* Show only relevant status for other modes */}
                  {mode !== 'building' && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        (() => {
                          if (mode === 'registration') {
                            return currentAttendee.event_entry ? 'bg-green-500' : 'bg-red-500';
                          } else {
                            // Session mode - show building status (more relevant for sessions)
                            return currentAttendee.building_entry ? 'bg-green-500' : 'bg-red-500';
                          }
                        })()
                      }`}></span>
                      {mode === 'session' ? 
                        (currentAttendee.building_entry ? 'Inside Building' : 'Outside Building') : 
                        getStatusDisplay()
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 fade-in-blur">
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
            {(mode === 'building' || mode === 'registration') && (
              <div className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded-lg fade-in-blur">
                {mode === 'building' ? (
                  <p>
                    <strong>Building Entry Requirements:</strong><br/>
                    1. Must be inside event first<br/>
                    2. Must be outside building<br/>
                    <strong>Exit:</strong> Available when inside building
                  </p>
                ) : (
                  <p>
                    <strong>Enter:</strong> Available when outside event • 
                    <strong>Exit:</strong> Available when inside event
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};