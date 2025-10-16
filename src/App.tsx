// src/App.tsx - FINAL CORRECTED VERSION
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { ErrorBoundary } from './components/ErrorBoundary';

// Auth Components
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { AuthRegistration } from './components/AuthRegistration';
import { VolunteerAuthRegistration } from './components/VolunteerAuthRegistration';
import { RoleChanger } from './components/RoleChanger';
import { UnauthorizedPage } from './components/UnauthorizedPage';

// Lazy load dashboards
const AttendeeDashboard = React.lazy(() => import('./pages/user/AttendeeDashboard'));
const VolunteerRegistration = React.lazy(() => import('./pages/volunteer/VolunteerRegistration').then(module => ({ default: module.VolunteerRegistration })));
const VolunteerDashboard = React.lazy(() => import('./pages/volunteer/VolunteerDashboard').then(module => ({ default: module.VolunteerDashboard })));
const RegTeamDashboard = React.lazy(() => import('./pages/team/RegTeamDashboard').then(module => ({ default: module.RegTeamDashboard })));
const BuildTeamDashboard = React.lazy(() => import('./pages/team/BuildTeamDashboard').then(module => ({ default: module.BuildTeamDashboard })));
const InfoDeskDashboard = React.lazy(() => import('./pages/team/InfoDeskDashboard').then(module => ({ default: module.InfoDeskDashboard })));
const TeamLeaderDashboard = React.lazy(() => import('./pages/team/TeamLeaderDashboard').then(module => ({ default: module.TeamLeaderDashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const SuperAdminPanel = React.lazy(() => import('./pages/admin/SuperAdminPanel').then(module => ({ default: module.SuperAdminPanel })));

const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  </div>
);

// OPTIMIZED ProtectedRoute with better state management
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
    getRoleBasedRedirect,
    isUserAuthorized
  } = useAuth();

  const [routeState, setRouteState] = useState<'checking' | 'redirecting' | 'ready'>('checking');

  useEffect(() => {
    // If still loading auth state, remain in checking state
    if (loading || !sessionLoaded) {
      setRouteState('checking');
      return;
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      setRouteState('redirecting');
      return;
    }

    // If authenticated but no profile yet (shouldn't happen normally)
    if (!profile) {
      setRouteState('redirecting');
      return;
    }

    // Check authorization first (only for attendees)
    if (profile.role === 'attendee' && !isUserAuthorized()) {
      setRouteState('redirecting');
      return;
    }

    // Handle incomplete profiles
    if (!profile.profile_complete) {
      if (allowIncompleteVolunteer && profile.role === 'volunteer') {
        setRouteState('ready');
        return;
      }

      if (!requireCompleteProfile) {
        setRouteState('ready');
        return;
      }

      setRouteState('redirecting');
      return;
    }

    // Check role permissions
    if (requiredRole) {
      const hasRequiredRole = Array.isArray(requiredRole)
        ? hasRole(requiredRole)
        : hasRole(requiredRole);

      if (!hasRequiredRole) {
        setRouteState('redirecting');
        return;
      }
    }

    // All checks passed - ready to render
    setRouteState('ready');
  }, [isAuthenticated, profile, loading, sessionLoaded, requiredRole, requireCompleteProfile, allowIncompleteVolunteer, hasRole, isUserAuthorized]);

  // Show loading while checking auth state
  if (routeState === 'checking') {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Handle redirects
  if (routeState === 'redirecting') {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    // Calculate the correct redirect path based on profile state
    const redirectPath = getRoleBasedRedirect(profile?.role, profile?.profile_complete, profile?.authorized);
    console.log(`🔄 ProtectedRoute redirecting to: ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  // Render children when ready
  return <>{children}</>;
};

// OPTIMIZED PublicRoute with better state management
const PublicRoute: React.FC<{ 
  children: React.ReactNode;
}> = ({ children }) => {
  const { 
    isAuthenticated, 
    profile, 
    loading, 
    sessionLoaded, 
    getRoleBasedRedirect
  } = useAuth();
  
  const [routeState, setRouteState] = useState<'checking' | 'redirecting' | 'ready'>('checking');

  useEffect(() => {
    // If still loading auth state, remain in checking state
    if (loading || !sessionLoaded) {
      setRouteState('checking');
      return;
    }

    // If authenticated with profile, redirect to appropriate dashboard
    if (isAuthenticated && profile) {
      setRouteState('redirecting');
      return;
    }

    // Ready to show public content
    setRouteState('ready');
  }, [isAuthenticated, profile, loading, sessionLoaded]);

  // Show loading while checking auth state
  if (routeState === 'checking') {
    return <LoadingScreen message="Loading..." />;
  }

  // Redirect authenticated users to their dashboard
  if (routeState === 'redirecting') {
    const redirectPath = getRoleBasedRedirect(profile?.role, profile?.profile_complete);
    console.log(`🔄 PublicRoute redirecting to: ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  // Show public content for unauthenticated users
  return <>{children}</>;
};

// Wrapper Components
const VolunteerAuthRegistrationWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <VolunteerAuthRegistration onSuccess={() => navigate('/V0lunt33ringR3g')} />;
};

const AuthRegistrationWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <AuthRegistration onSuccess={() => navigate('/attendee-register')} />;
};

// LazyLoadingFallback
const LazyLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading dashboard...</p>
    </div>
  </div>
);

// Lazy Route Helper
const LazyRoute: React.FC<{ 
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
}> = ({ component: Component, requiredRole, requireCompleteProfile = true }) => (
  <ProtectedRoute requiredRole={requiredRole} requireCompleteProfile={requireCompleteProfile}>
    <Suspense fallback={<LazyLoadingFallback />}>
      <Component />
    </Suspense>
  </ProtectedRoute>
);

// Add Auth State Debugger (optional - remove in production)
const AuthStateDebugger: React.FC = () => {
  const { isAuthenticated, profile, loading, sessionLoaded } = useAuth();
  
  useEffect(() => {
    console.log('🔐 Auth State:', {
      isAuthenticated,
      profile: profile ? `${profile.first_name} (${profile.role})` : 'null',
      profileComplete: profile?.profile_complete,
      loading,
      sessionLoaded
    });
  }, [isAuthenticated, profile, loading, sessionLoaded]);
  
  return null;
};

// Main App Router
const AppRouter: React.FC = () => {
  return (
    <>
      <AuthStateDebugger />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
        <Route path="/volunteer-auth-register" element={<PublicRoute><VolunteerAuthRegistrationWrapper /></PublicRoute>} />
        <Route path="/auth-register" element={<PublicRoute><AuthRegistrationWrapper /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordForm /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordForm /></PublicRoute>} />

        {/* Unauthorized Page */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Registration Forms */}
        <Route path="/attendee-register" element={
          <ProtectedRoute requireCompleteProfile={false}>
            <RegistrationForm />
          </ProtectedRoute>
        } />
        
        <Route path="/V0lunt33ringR3g" element={
          <ProtectedRoute requireCompleteProfile={false} allowIncompleteVolunteer={true}>
            <Suspense fallback={<LoadingScreen message="Loading registration form..." />}>
              <VolunteerRegistration />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Role Changer - Only accessible by marketing role */}
<Route path="/rolechangingform" element={
  <ProtectedRoute requiredRole={["marketing", "team_leader"]} requireCompleteProfile={true}>
    <RoleChanger />
  </ProtectedRoute>
} />

        {/* Dashboards */}
        <Route path="/attendee" element={<LazyRoute component={AttendeeDashboard} requiredRole="attendee" />} />
        <Route path="/regteam" element={<LazyRoute component={RegTeamDashboard} requiredRole="registration" />} />
        <Route path="/buildteam" element={<LazyRoute component={BuildTeamDashboard} requiredRole="building" />} />
        <Route path="/volunteer" element={<LazyRoute component={VolunteerDashboard} requiredRole={['ushers', 'marketing', 'media', 'ER', 'BD team', 'catering', 'feedback', 'stage']} />} />
        <Route path="/infodesk" element={<LazyRoute component={InfoDeskDashboard} requiredRole="info_desk" />} />
        <Route path="/teamleader" element={<LazyRoute component={TeamLeaderDashboard} requiredRole="team_leader" />} />
        <Route path="/secure-9821panel" element={<LazyRoute component={AdminPanel} requiredRole="admin" />} />
        <Route path="/super-ctrl-92k1x" element={<LazyRoute component={SuperAdminPanel} requiredRole="sadmin" />} />
        
        {/* Redirects */}
        <Route path="/register" element={<Navigate to="/auth-register" replace />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;