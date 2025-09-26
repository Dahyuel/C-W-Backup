import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Components
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { VolunteerRegistration } from './pages/volunteer/VolunteerRegistration';

// Dashboard Components
import { AttendeeDashboard } from './pages/user/AttendeeDashboard';
import { VolunteerDashboard } from './pages/volunteer/VolunteerDashboard';
import { RegTeamDashboard } from './pages/team/RegTeamDashboard';
import { BuildTeamDashboard } from './pages/team/BuildTeamDashboard';
import { InfoDeskDashboard } from './pages/team/InfoDeskDashboard';
import { TeamLeaderDashboard } from './pages/team/TeamLeaderDashboard';
import { AdminPanel } from './pages/admin/AdminPanel';
import { SuperAdminPanel } from './pages/admin/SuperAdminPanel';

// Updated App.tsx
function App() {
  const { isAuthenticated, profile, loading } = useAuth();

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

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes - redirect to dashboard if already authenticated */}
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? <LoginForm /> : <Navigate to={getRoleBasedRedirect()} replace />
            } 
          />
          <Route 
            path="/register" 
            element={
              !isAuthenticated ? <RegistrationForm /> : <Navigate to={getRoleBasedRedirect()} replace />
            } 
          />
          <Route 
            path="/forgot-password" 
            element={
              !isAuthenticated ? <ForgotPasswordForm /> : <Navigate to={getRoleBasedRedirect()} replace />
            } 
          />
          <Route 
            path="/V0lunt33ringR3g" 
            element={
              !isAuthenticated ? <VolunteerRegistration /> : <Navigate to={getRoleBasedRedirect()} replace />
            } 
          />
          
          {/* Protected routes */}
          <Route path="/attendee" element={<ProtectedRoute requiredRole="attendee"><AttendeeDashboard /></ProtectedRoute>} />
          <Route path="/volunteer" element={<ProtectedRoute requiredRole="volunteer"><VolunteerDashboard /></ProtectedRoute>} />
          <Route path="/regteam" element={<ProtectedRoute requiredRole="registration"><RegTeamDashboard /></ProtectedRoute>} />
          <Route path="/buildteam" element={<ProtectedRoute requiredRole="building"><BuildTeamDashboard /></ProtectedRoute>} />
          <Route path="/infodesk" element={<ProtectedRoute requiredRole="info_desk"><InfoDeskDashboard /></ProtectedRoute>} />
          <Route path="/teamleader" element={<ProtectedRoute requiredRole="team_leader"><TeamLeaderDashboard /></ProtectedRoute>} />
          <Route path="/secure-9821panel" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
          <Route path="/super-ctrl-92k1x" element={<ProtectedRoute requiredRole="sadmin"><SuperAdminPanel /></ProtectedRoute>} />
          
          {/* Root redirect */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <Navigate to={getRoleBasedRedirect()} replace /> : 
                <Navigate to="/login" replace />
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;