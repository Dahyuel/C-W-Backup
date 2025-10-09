// src/components/shared/ProtectedRoute.tsx - SIMPLIFIED VERSION
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Lock } from 'lucide-react';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
  allowIncompleteVolunteer?: boolean;
}

// FIXED ProtectedRoute with better state management
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
  allowIncompleteVolunteer?: boolean;
}> = ({ children, requiredRole, requireCompleteProfile = true, allowIncompleteVolunteer = false }) => {
  const { 
    isAuthenticated, 
    profile, 
    loading, 
    sessionLoaded, 
    hasRole, 
    getRoleBasedRedirect
  } = useAuth();
  
  const [authState, setAuthState] = useState<'checking' | 'redirecting' | 'ready'>('checking');

  useEffect(() => {
    // If we're still loading auth state, wait
    if (loading || !sessionLoaded) {
      setAuthState('checking');
      return;
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      setAuthState('redirecting');
      return;
    }

    // If we have profile data, make decisions
    if (profile) {
      // Handle incomplete profiles
      if (!profile.profile_complete) {
        if (allowIncompleteVolunteer && profile.role === 'volunteer') {
          setAuthState('ready');
          return;
        }
        
        if (!requireCompleteProfile) {
          setAuthState('ready');
          return;
        }
        
        setAuthState('redirecting');
        return;
      }

      // Check role permissions
      if (requiredRole) {
        const hasRequiredRole = Array.isArray(requiredRole) 
          ? hasRole(requiredRole) 
          : hasRole(requiredRole);
          
        if (!hasRequiredRole) {
          setAuthState('redirecting');
          return;
        }
      }

      setAuthState('ready');
    } else {
      // No profile but authenticated - might need registration
      setAuthState('redirecting');
    }
  }, [isAuthenticated, profile, loading, sessionLoaded, requiredRole, requireCompleteProfile, allowIncompleteVolunteer, hasRole]);

  // Show loading only when checking auth state
  if (authState === 'checking') {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Handle redirects
  if (authState === 'redirecting') {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (profile && !profile.profile_complete) {
      const redirectPath = getRoleBasedRedirect(profile.role, profile.profile_complete);
      return <Navigate to={redirectPath} replace />;
    }

    if (requiredRole && profile && !hasRole(requiredRole)) {
      const redirectPath = getRoleBasedRedirect();
      return <Navigate to={redirectPath} replace />;
    }

    // Default redirect for authenticated users without complete profile
    const redirectPath = getRoleBasedRedirect(profile?.role, profile?.profile_complete);
    return <Navigate to={redirectPath} replace />;
  }

  // Render children when ready
  return <>{children}</>;
};

export default ProtectedRoute;