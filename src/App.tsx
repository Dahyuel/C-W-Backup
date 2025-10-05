// src/App.tsx - Fixed with complete routing logic
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ResetPasswordForm } from './components/ResetPasswordForm';

// Auth Components
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { AuthRegistration } from './components/AuthRegistration';
import { VolunteerAuthRegistration } from './components/VolunteerAuthRegistration';

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

const LazyLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
    <div className="animate-pulse">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
    
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        <span className="text-gray-600">Loading dashboard...</span>
      </div>
    </div>
  </div>
);

// Fixed ProtectedRoute Component
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
  
  if (!sessionLoaded || loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }
  
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Handle incomplete profiles
  if (profile && !profile.profile_complete) {
    console.log('🔧 Profile incomplete, checking redirect logic:', {
      role: profile.role,
      requireCompleteProfile,
      allowIncompleteVolunteer
    });
    
    // If this route allows incomplete volunteer profiles and user is volunteer
    if (allowIncompleteVolunteer && profile.role === 'volunteer') {
      console.log('✅ Allowing incomplete volunteer access');
      return <>{children}</>;
    }
    
    // If this route allows incomplete profiles in general
    if (!requireCompleteProfile) {
      console.log('✅ Allowing incomplete profile access');
      return <>{children}</>;
    }
    
    // Redirect to appropriate registration form
    const redirectPath = getRoleBasedRedirect(profile.role, profile.profile_complete);
    console.log('🔧 Redirecting incomplete profile to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }

  // Check role permissions if specified
  if (requiredRole && profile) {
    const hasRequiredRole = Array.isArray(requiredRole) 
      ? hasRole(requiredRole) 
      : hasRole(requiredRole);
      
    if (!hasRequiredRole) {
      console.log('❌ Access denied for role:', profile.role, 'Required:', requiredRole);
      const redirectPath = getRoleBasedRedirect();
      return <Navigate to={redirectPath} replace />;
    }
  }
  
  console.log('✅ Access granted for role:', profile?.role, 'Profile complete:', profile?.profile_complete);
  return <>{children}</>;
};

// Fixed PublicRoute Component
const PublicRoute: React.FC<{ 
  children: React.ReactNode;
  allowIncompleteProfile?: boolean;
}> = ({ children, allowIncompleteProfile = false }) => {
  const { 
    isAuthenticated, 
    profile, 
    loading, 
    sessionLoaded, 
    getRoleBasedRedirect
  } = useAuth();
  
  if (!sessionLoaded || loading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  if (isAuthenticated && profile) {
    // Use the updated getRoleBasedRedirect that handles incomplete profiles
    const redirectPath = getRoleBasedRedirect(profile.role, profile.profile_complete);
    
    console.log('🔧 PublicRoute redirecting to:', redirectPath, {
      role: profile.role,
      profileComplete: profile.profile_complete
    });
    
    // Only allow access to public routes if explicitly allowed for incomplete profiles
    if (!allowIncompleteProfile) {
      return <Navigate to={redirectPath} replace />;
    }
  }
  
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

// Main App Router
const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes - Redirect authenticated users with incomplete profiles */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginForm />
        </PublicRoute>
      } />

      <Route path="/volunteer-auth-register" element={
        <PublicRoute>
          <VolunteerAuthRegistrationWrapper />
        </PublicRoute>
      } />
      
      <Route path="/auth-register" element={
        <PublicRoute>
          <AuthRegistrationWrapper />
        </PublicRoute>
      } />
      
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPasswordForm />
        </PublicRoute>
      } />
      
      <Route path="/reset-password" element={
        <PublicRoute>
          <ResetPasswordForm />
        </PublicRoute>
      } />
      
      {/* Registration Forms - Allow incomplete profiles */}
      <Route path="/attendee-register" element={
        <ProtectedRoute requireCompleteProfile={false}>
          <RegistrationForm />
        </ProtectedRoute>
      } />
      
      <Route path="/V0lunt33ringR3g" element={
        <ProtectedRoute requireCompleteProfile={false} allowIncompleteVolunteer={true}>
          <Suspense fallback={<LoadingScreen message="Loading volunteer registration form..." />}>
            <VolunteerRegistration />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Dashboards - Require complete profiles and specific roles */}
      <Route 
        path="/attendee" 
        element={
          <LazyRoute 
            component={AttendeeDashboard} 
            requiredRole="attendee" 
            requireCompleteProfile={true}
          />
        }
      />
      
      <Route 
        path="/regteam" 
        element={
          <LazyRoute 
            component={RegTeamDashboard} 
            requiredRole="registration" 
            requireCompleteProfile={true}
          />
        }
      />
      
      <Route 
        path="/buildteam" 
        element={
          <LazyRoute 
            component={BuildTeamDashboard} 
            requiredRole="building" 
            requireCompleteProfile={true}
          />
        }
      />
        <Route 
    path="/volunteer" 
    element={
      <LazyRoute 
        component={VolunteerDashboard} 
        requiredRole={['ushers', 'marketing', 'media', 'ER', 'BD team', 'catering', 'feedback', 'stage']} 
        requireCompleteProfile={true}
      />
    }
  />
      
      <Route 
        path="/infodesk" 
        element={
          <LazyRoute 
            component={InfoDeskDashboard} 
            requiredRole="info_desk" 
            requireCompleteProfile={true}
          />
        }
      />
      
      <Route 
        path="/teamleader" 
        element={
          <LazyRoute 
            component={TeamLeaderDashboard} 
            requiredRole="team_leader" 
            requireCompleteProfile={true}
          />
        }
      />
      
      <Route 
        path="/secure-9821panel" 
        element={
          <LazyRoute 
            component={AdminPanel} 
            requiredRole="admin" 
            requireCompleteProfile={true}
          />
        }
      />
      
      <Route 
        path="/super-ctrl-92k1x" 
        element={
          <LazyRoute 
            component={SuperAdminPanel} 
            requiredRole="sadmin" 
            requireCompleteProfile={true}
          />
        }
      />
      
      {/* Redirects */}
      <Route path="/register" element={<Navigate to="/auth-register" replace />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              The application encountered an unexpected error.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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