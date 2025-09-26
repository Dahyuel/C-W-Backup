import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, profile, loading, initialized, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);

  // Handle profile loading state
  useEffect(() => {
    if (initialized && user && !loading) {
      if (profile) {
        // Profile is already loaded
        setProfileLoading(false);
      } else {
        // Wait for profile to load with timeout
        const timer = setTimeout(() => {
          setProfileLoading(false);
        }, 3000); // 3 second timeout for profile loading

        return () => clearTimeout(timer);
      }
    } else if (initialized && !user) {
      setProfileLoading(false);
    }
  }, [initialized, user, loading, profile]);

  // Show loading while authentication is initializing
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading while profile is being fetched
  if (user && !profile && profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If we have a user but no profile after timeout, show error
  if (user && !profile && !profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Error</h2>
          <p className="text-gray-600 mb-6">
            Unable to load your profile. Please try signing out and signing back in.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role requirements if profile exists and role is required
  if (requiredRole && profile && !hasRole(requiredRole)) {
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

  // If role is required but profile is still loading, show loading
  if (requiredRole && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // All checks passed - render the protected component
  return <>{children}</>;
};

export default ProtectedRoute;