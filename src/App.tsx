// src/App.tsx - FIXED ROUTER
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import PublicRoute from './components/shared/PublicRoute';

// Auth Components
import { LoginForm } from './components/LoginForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';

// Lazy load components
const AttendeeDashboard = React.lazy(() => import('./pages/user/AttendeeDashboard'));
const VolunteerDashboard = React.lazy(() => import('./pages/volunteer/VolunteerDashboard').then(module => ({ default: module.VolunteerDashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));

const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginForm />
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

      {/* Protected Routes */}
      <Route path="/attendee" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<LoadingFallback />}>
            <AttendeeDashboard />
          </Suspense>
        </ProtectedRoute>
      } />
      
      <Route path="/volunteer" element={
        <ProtectedRoute requiredRole={['volunteer', 'ushers', 'marketing', 'media', 'ER', 'BD team', 'catering', 'feedback', 'stage']}>
          <Suspense fallback={<LoadingFallback />}>
            <VolunteerDashboard />
          </Suspense>
        </ProtectedRoute>
      } />
      
      <Route path="/secure-9821panel" element={
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<LoadingFallback />}>
            <AdminPanel />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

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