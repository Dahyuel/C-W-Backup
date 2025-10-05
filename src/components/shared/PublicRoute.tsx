// src/components/shared/PublicRoute.tsx - FIXED VERSION
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
  allowAuthenticated?: boolean;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ 
  children, 
  allowAuthenticated = false 
}) => {
  const { 
    isAuthenticated, 
    profile, 
    loading, 
    sessionLoaded 
  } = useAuth();
  const location = useLocation();

  console.log('🌐 PublicRoute check:', {
    path: location.pathname,
    loading,
    sessionLoaded,
    isAuthenticated,
    allowAuthenticated
  });

  // Show loading during initial session load
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

  // If authenticated and public route doesn't allow authenticated users, redirect to dashboard
  if (isAuthenticated && !allowAuthenticated) {
    console.log('🔀 Authenticated user accessing public route, redirecting...');
    
    // Determine where to redirect based on profile
    let redirectPath = '/attendee';
    if (profile?.role === 'volunteer') redirectPath = '/volunteer';
    if (profile?.role === 'admin') redirectPath = '/secure-9821panel';
    
    return <Navigate to={redirectPath} replace />;
  }

  console.log('✅ Access granted to public route');
  return <>{children}</>;
};

export default PublicRoute;