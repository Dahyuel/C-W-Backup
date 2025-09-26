import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginData, ValidationError } from '../types';
import { validateEmail, validatePassword } from '../utils/validation';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { 
    signIn, 
    isAuthenticated, 
    getRoleBasedRedirect, 
    loading: authLoading, 
    initialized,
    profile,
    user 
  } = useAuth();
  
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle redirection when authentication is complete
  useEffect(() => {
    // Only redirect when:
    // 1. Auth is initialized (not loading initial state)
    // 2. User is authenticated
    // 3. Profile is loaded
    if (initialized && isAuthenticated && user && profile && !authLoading) {
      console.log('Redirecting authenticated user to:', getRoleBasedRedirect());
      navigate(getRoleBasedRedirect(), { replace: true });
    }
  }, [initialized, isAuthenticated, user, profile, authLoading, navigate, getRoleBasedRedirect]);

  const updateField = (field: keyof LoginData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const validateForm = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.push({ field: 'email', message: emailError });

    const passwordError = validatePassword(formData.password);
    if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        console.error('Login error:', error);
        setErrors([{ field: 'general', message: 'Invalid email or password' }]);
        return;
      }

      // Don't manually redirect - let the useEffect handle it
      console.log('Login successful, waiting for profile to load...');
      
    } catch (error) {
      console.error('Login exception:', error);
      setErrors([{ field: 'general', message: 'Login failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  // Show loading state while initializing authentication
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading state while profile is loading after successful login
  if (isAuthenticated && (!profile || authLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 text-center">
          <Mail className="mx-auto h-12 w-12 text-white mb-3" />
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-orange-100">Sign in to ASU Career Week</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          {/* General Error */}
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center space-x-2 mb-6">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{getFieldError('general')}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                  getFieldError('email') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
                disabled={loading}
              />
              {getFieldError('email') && (
                <p className="text-sm text-red-600 mt-2">{getFieldError('email')}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                    getFieldError('password') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {getFieldError('password') && (
                <p className="text-sm text-red-600 mt-2">{getFieldError('password')}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Register Links */}
            <div className="text-center pt-4 border-t border-gray-200 space-y-2">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  disabled={loading}
                >
                  Create Attendee Account
                </button>
              </p>
              <p className="text-gray-600">
                Want to volunteer?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/V0lunt33ringR3g')}
                  className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  disabled={loading}
                >
                  Register as Volunteer
                </button>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};