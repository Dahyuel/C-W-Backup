// components/RouteGuard.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isUserAuthorized, loading, profile } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth-login" replace />;
  }

  // Block access if not authorized
  if (isUserAuthorized === false) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <UserX className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h2>
          <p className="text-red-600 mb-6">
            Your account has been disabled. Please contact event organizers.
          </p>
          <button
            onClick={() => window.location.href = '/auth-login'}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
};