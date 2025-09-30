import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ResetPasswordForm } from './components/ResetPasswordForm';

// Auth Components (keep these regular imports since they're small and frequently used)
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';

// Lazy load all dashboard components to improve initial load time
const AttendeeDashboard = React.lazy(() => import('./pages/user/AttendeeDashboard'));
const VolunteerRegistration = React.lazy(() => import('./pages/volunteer/VolunteerRegistration').then(module => ({ default: module.VolunteerRegistration })));
const VolunteerDashboard = React.lazy(() => import('./pages/volunteer/VolunteerDashboard').then(module => ({ default: module.VolunteerDashboard })));
const RegTeamDashboard = React.lazy(() => import('./pages/team/RegTeamDashboard').then(module => ({ default: module.RegTeamDashboard })));
const BuildTeamDashboard = React.lazy(() => import('./pages/team/BuildTeamDashboard').then(module => ({ default: module.BuildTeamDashboard })));
const InfoDeskDashboard = React.lazy(() => import('./pages/team/InfoDeskDashboard').then(module => ({ default: module.InfoDeskDashboard })));
const TeamLeaderDashboard = React.lazy(() => import('./pages/team/TeamLeaderDashboard').then(module => ({ default: module.TeamLeaderDashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const SuperAdminPanel = React.lazy(() => import('./pages/admin/SuperAdminPanel').then(module => ({ default: module.SuperAdminPanel })));

// Enhanced Loading component with better UX
const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  </div>
);

// Lazy loading fallback component with skeleton
const LazyLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
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

// Enhanced Protected Route component with better role mapping
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: string | string[];
}> = ({ children, requiredRole }) => {
  const { isAuthenticated, profile, loading, sessionLoaded, hasRole, getRoleBasedRedirect } = useAuth();
  
  // Still loading session or auth state
  if (!sessionLoaded || loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }
  
  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
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
      console.log('Access denied for role:', profile.role, 'Required:', requiredRole);
      
      // Redirect to appropriate dashboard instead of showing error
      const redirectPath = getRoleBasedRedirect();
      return <Navigate to={redirectPath} replace />;
    }
  }
  
  console.log('Access granted for role:', profile?.role);
  return <>{children}</>;
};

// Enhanced Public Route component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, profile, loading, sessionLoaded, getRoleBasedRedirect } = useAuth();
  
  // Still loading session
  if (!sessionLoaded || loading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  // Already authenticated and has profile, redirect to appropriate dashboard
  if (isAuthenticated && profile) {
    const redirectPath = getRoleBasedRedirect();
    console.log('Already authenticated, redirecting to:', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

// Lazy Route wrapper component
const LazyRoute: React.FC<{ 
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  requiredRole?: string | string[];
}> = ({ component: Component, requiredRole }) => (
  <ProtectedRoute requiredRole={requiredRole}>
    <Suspense fallback={<LazyLoadingFallback />}>
      <Component />
    </Suspense>
  </ProtectedRoute>
);

// App Router component that uses the auth context
const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes - No lazy loading for auth forms */}
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
      
      {/* Volunteer Registration - Lazy loaded since it's accessed less frequently */}
      <Route path="/V0lunt33ringR3g" element={
        <PublicRoute>
          <Suspense fallback={<LoadingScreen message="Loading registration form..." />}>
            <VolunteerRegistration />
          </Suspense>
        </PublicRoute>
      } />
      
      {/* Protected Routes - All lazy loaded */}
      <Route 
        path="/attendee" 
        element={<LazyRoute component={AttendeeDashboard} requiredRole="attendee" />}
      />
      
<Route 
  path="/volunteer" 
  element={
    <LazyRoute 
      component={VolunteerDashboard} 
      requiredRole={[
        'volunteer',
        'ushers',
        'marketing', 
        'media', // Make sure media is included
        'ER',
        'BD team', // Changed from 'BD' to 'BD team'
        'catering',
        'feedback',
        'stage'
      ]} 
    />
  }
/>
      
      <Route 
        path="/regteam" 
        element={<LazyRoute component={RegTeamDashboard} requiredRole="registration" />}
      />
      
      <Route 
        path="/buildteam" 
        element={<LazyRoute component={BuildTeamDashboard} requiredRole="building" />}
      />
      
      <Route 
        path="/infodesk" 
        element={<LazyRoute component={InfoDeskDashboard} requiredRole="info_desk" />}
      />
      
      <Route 
        path="/teamleader" 
        element={<LazyRoute component={TeamLeaderDashboard} requiredRole="team_leader" />}
      />
      
      <Route 
        path="/secure-9821panel" 
        element={<LazyRoute component={AdminPanel} requiredRole="admin" />}
      />
      
      <Route 
        path="/super-ctrl-92k1x" 
        element={<LazyRoute component={SuperAdminPanel} requiredRole="sadmin" />}
      />
<Route path="/reset-password" element={
  <PublicRoute>
    <ResetPasswordForm />
  </PublicRoute>
} />
      
      {/* Default redirect - Enhanced to handle edge cases */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// Main App component with error boundary
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

// Main App component
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