import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Auth Components
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { VolunteerRegistration } from './pages/volunteer/VolunteerRegistration';

// Dashboard Components
import AttendeeDashboard from './pages/user/AttendeeDashboard';
import { VolunteerDashboard } from './pages/volunteer/VolunteerDashboard';
import { RegTeamDashboard } from './pages/team/RegTeamDashboard';
import { BuildTeamDashboard } from './pages/team/BuildTeamDashboard';
import { InfoDeskDashboard } from './pages/team/InfoDeskDashboard';
import { TeamLeaderDashboard } from './pages/team/TeamLeaderDashboard';
import { AdminPanel } from './pages/admin/AdminPanel';
import { SuperAdminPanel } from './pages/admin/SuperAdminPanel';

// Enhanced Loading component with better UX
const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center fade-in">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4 spinner-enhanced"></div>
      <p className="text-gray-600 text-lg fade-in-up" style={{ animationDelay: '0.2s' }}>{message}</p>
    </div>
  </div>
);

// Enhanced Protected Route component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: string | string[];
}> = ({ children, requiredRole }) => {
  const { isAuthenticated, profile, loading, sessionLoaded, hasRole } = useAuth();
  
  // Still loading session or auth state
  if (!sessionLoaded || loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }
  
  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log('🔄 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // User is authenticated but profile is not loaded yet
  if (isAuthenticated && !profile) {
    return <LoadingScreen message="Loading your profile..." />;
  }
  
  // Check role permissions if specified
  if (requiredRole && profile) {
    const hasRequiredRole = Array.isArray(requiredRole) 
      ? hasRole(requiredRole) 
      : hasRole(requiredRole);
      
    if (!hasRequiredRole) {
      console.log('❌ Access denied for role:', profile.role, 'Required:', requiredRole);
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your role: <span className="font-medium">{profile.role}</span>
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }
  
  console.log('✅ Access granted for role:', profile?.role);
  return <>{children}</>;
};

// Public Route component (redirects if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, profile, loading, sessionLoaded, getRoleBasedRedirect } = useAuth();
  
  // Still loading session
  if (!sessionLoaded || loading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  // Already authenticated and has profile, redirect to appropriate dashboard
  if (isAuthenticated && profile) {
    const redirectPath = getRoleBasedRedirect();
    console.log('🚀 Already authenticated, redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

// App Router component that uses the auth context
const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginForm />
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <RegistrationForm />
        </PublicRoute>
      } />
      
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPasswordForm />
        </PublicRoute>
      } />
      
      <Route path="/V0lunt33ringR3g" element={
        <PublicRoute>
          <VolunteerRegistration />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route 
        path="/attendee" 
        element={
          <ProtectedRoute requiredRole="attendee">
            <AttendeeDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/volunteer" 
        element={
          <ProtectedRoute requiredRole="volunteer">
            <VolunteerDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/regteam" 
        element={
          <ProtectedRoute requiredRole="registration">
            <RegTeamDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/buildteam" 
        element={
          <ProtectedRoute requiredRole="building">
            <BuildTeamDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/infodesk" 
        element={
          <ProtectedRoute requiredRole="info_desk">
            <InfoDeskDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/teamleader" 
        element={
          <ProtectedRoute requiredRole="team_leader">
            <TeamLeaderDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/secure-9821panel" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminPanel />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/super-ctrl-92k1x" 
        element={
          <ProtectedRoute requiredRole="sadmin">
            <SuperAdminPanel />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </Router>
  );
}

export default App;