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

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/V0lunt33ringR3g" element={<VolunteerRegistration />} />
          
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
              <ProtectedRoute requiredRole={['registration']}>
                <RegTeamDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/buildteam" 
            element={
              <ProtectedRoute requiredRole={['building']}>
                <BuildTeamDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Create a separate component for infodesk if it should be different */}
          <Route 
            path="/infodesk" 
            element={
              <ProtectedRoute requiredRole={['info_desk']}>
                <InfoDeskDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/teamleader" 
            element={
              <ProtectedRoute requiredRole={['team_leader']}>
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
      </AuthProvider>
    </Router>
  );
}

export default App;