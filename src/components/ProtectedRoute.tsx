// src/components/shared/ProtectedRoute.tsx - SIMPLIFIED VERSION
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
  allowIncompleteVolunteer?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requireCompleteProfile = true,
  allowIncompleteVolunteer = false
}) => {
  const { 
    user, 
    profile, 
    loading, 
    sessionLoaded,
    isAuthenticated, 
    hasRole, 
    getRoleBasedRedirect,
    isProfileComplete 
  } = useAuth();
  const location = useLocation();

  // Show minimal loading only during initial load
  if (loading && !sessionLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Once session is loaded, make decisions immediately
  if (!isAuthenticated) {
    console.log('🔐 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated - check profile state
  const profileComplete = profile ? isProfileComplete(profile) : false;
  
  console.log('🔍 Protected Route Check:', {
    path: location.pathname,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    profileComplete,
    requireCompleteProfile,
    allowIncompleteVolunteer
  });

  // Handle profile completion logic
  if (!profileComplete && requireCompleteProfile) {
    // Allow access to registration forms even with incomplete profiles
    if (location.pathname === '/V0lunt33ringR3g' && allowIncompleteVolunteer) {
      console.log('✅ Allowing access to volunteer registration form');
      return <>{children}</>;
    }
    
    if (location.pathname === '/attendee-register') {
      console.log('✅ Allowing access to attendee registration form');
      return <>{children}</>;
    }
    
    // Redirect incomplete profiles to appropriate registration form
    const redirectPath = getRoleBasedRedirect(profile?.role, profileComplete);
    console.log('🔄 Redirecting incomplete profile to:', redirectPath);
    
    // Prevent redirect loop
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check role permissions
  if (requiredRole && profile) {
    const hasRequiredRole = hasRole(requiredRole);
    
    if (!hasRequiredRole) {
      console.log('❌ Access denied - insufficient permissions', {
        userRole: profile.role,
        requiredRole
      });
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-600 font-medium">Insufficient permissions</p>
            </div>
            <p className="text-gray-600 mb-6">
              You don't have the required permissions to access this page.
            </p>
            <div className="space-y-2 text-sm text-gray-500 mb-6">
              <p><span className="font-medium">Your role:</span> {profile?.role || 'Unknown'}</p>
              <p><span className="font-medium">Required role:</span> {
                Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole
              }</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  console.log('✅ Access granted to protected route');
  return <>{children}</>;
};

export default ProtectedRoute;