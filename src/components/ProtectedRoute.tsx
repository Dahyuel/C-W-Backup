// src/components/shared/ProtectedRoute.tsx
import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}
const hasRequiredRole = Array.isArray(requiredRole) 
  ? requiredRole.includes(userRole)
  : userRole === requiredRole;
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, profile, loading, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
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

  return <>{children}</>;
};

export default ProtectedRoute;