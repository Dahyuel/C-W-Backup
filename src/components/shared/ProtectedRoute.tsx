// src/components/shared/ProtectedRoute.tsx - FIXED VERSION
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requireCompleteProfile = true
}) => {
  const { 
    user, 
    profile, 
    loading, 
    sessionLoaded,
    isAuthenticated 
  } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    loading,
    sessionLoaded,
    isAuthenticated,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role
  });

  // Show loading only during initial session load
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

  // CRITICAL: Once session is loaded but no user, redirect to login
  if (sessionLoaded && !isAuthenticated) {
    console.log('🔐 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we have a user but no profile yet, wait for profile
  if (isAuthenticated && !profile && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Check role permissions if specified
  if (requiredRole && profile) {
    const hasRequiredRole = Array.isArray(requiredRole) 
      ? requiredRole.includes(profile.role)
      : profile.role === requiredRole;
      
    if (!hasRequiredRole) {
      console.log('❌ Access denied for role:', profile.role, 'Required:', requiredRole);
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
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