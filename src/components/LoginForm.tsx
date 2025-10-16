// components/LoginForm.tsx - FIXED VERSION (remove duplicate useEffect)
import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, AlertCircle, UserX, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginData, ValidationError } from '../types';
import { validateEmail, validatePassword } from '../utils/validation';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { 
    signIn, 
    signOut,
    isAuthenticated, 
    getRoleBasedRedirect, 
    loading: authLoading, 
    profile, 
    user,
    isUserAuthorized
  } = useAuth();
  
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [unauthorizedUser, setUnauthorizedUser] = useState(false);
  const [checkedAuthorization, setCheckedAuthorization] = useState(false);

  // SINGLE useEffect for authorization and redirect - REMOVE THE DUPLICATE ONE
  useEffect(() => {
    const checkAuthorizationAndRedirect = async () => {
      if (authLoading || !isAuthenticated || !profile || checkedAuthorization) {
        return;
      }

      console.log('🔐 Checking authorization status:', {
        isAuthenticated,
        profileId: profile?.id,
        authorized: profile?.authorized,
        isUserAuthorized
      });

      // If user is not authorized, show unauthorized message
      if (isUserAuthorized === false) {
        console.log('🚫 User is not authorized, blocking access');
        setUnauthorizedUser(true);
        setCheckedAuthorization(true);
        return; // Don't sign out here - let the unauthorized page handle it
      }

      // Only proceed if user is authorized
      if (isUserAuthorized === true) {
        console.log('✅ User is authorized, proceeding to redirect');
        setCheckedAuthorization(true);
        
        const redirectPath = getRoleBasedRedirect(profile.role, profile.profile_complete);
        console.log('🔄 Authorized user redirecting to:', redirectPath);
        navigate(redirectPath, { replace: true });
      }
    };

    checkAuthorizationAndRedirect();
  }, [isAuthenticated, profile, authLoading, navigate, getRoleBasedRedirect, isUserAuthorized, checkedAuthorization]);

  // Reset checkedAuthorization when user signs out or form changes
  useEffect(() => {
    if (!isAuthenticated) {
      setCheckedAuthorization(false);
      setUnauthorizedUser(false);
    }
  }, [isAuthenticated]);

  const updateField = (field: keyof LoginData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
    // Reset unauthorized state when user starts typing again
    if (unauthorizedUser) {
      setUnauthorizedUser(false);
    }
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
    
    // Prevent double submission
    if (loading) return;
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);
    setUnauthorizedUser(false);
    setCheckedAuthorization(false);

    try {
      const result = await signIn(formData.email, formData.password);

      if (!result.success) {
        // Check if it's an unauthorized error
        if (result.error?.unauthorized) {
          setUnauthorizedUser(true);
          setCheckedAuthorization(true);
        } else {
          setErrors([{ 
            field: 'general', 
            message: result.error?.message || 'Invalid email or password' 
          }]);
        }
        setLoading(false);
        return;
      }

      // The useEffect will handle the authorization check and redirect
      
    } catch (error: any) {
      console.error('Login exception:', error);
      setErrors([{ 
        field: 'general', 
        message: error.message || 'Login failed. Please try again.' 
      }]);
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  // Show unauthorized user message - BLOCK EVERYTHING
  if (unauthorizedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden text-center fade-in-up-blur">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <UserX className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Disabled</h1>
            <p className="text-red-100">Access Restricted</p>
          </div>

          {/* Message */}
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">
                  Access Denied
                </h3>
              </div>
              <p className="text-red-700 mb-4">
                Your account does not meet the event eligibility requirements and has been disabled.
              </p>
              <div className="text-left bg-red-100 p-4 rounded-lg mb-4">
                <p className="text-red-800 text-sm font-medium mb-2">Eligibility Requirements:</p>
                <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                  <li>Ain Shams University students or graduates</li>
                  <li>Graduates from Helwan University</li>
                  <li>Graduates from Banha University</li>
                  <li>Graduates from Canadian Ahram University</li>
                </ul>
              </div>
              <p className="text-red-600 text-sm">
                If you believe this is a mistake, please contact the event organizers.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  // Force sign out and reset everything
                  await signOut();
                  setUnauthorizedUser(false);
                  setCheckedAuthorization(false);
                  setFormData({ email: '', password: '' });
                  window.location.reload(); // Force complete reset
                }}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state during authorization check
  if (authLoading && isAuthenticated && !checkedAuthorization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center fade-in-scale">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Show loading state during initial auth load
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center fade-in-scale">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show the login form if we're authenticated and checking authorization
  if (isAuthenticated && !checkedAuthorization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center fade-in-scale">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: 'url("/images/careercenter.png")',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 w-full max-w-md overflow-hidden fade-in-up-blur modal-content-blur">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-center fade-in-blur">
            <div className="mx-auto w-28 h-28 bg-white rounded-full flex items-center justify-center mb-2 shadow-lg fade-in-scale">
              <img 
                src="/images/logo.png"
                alt="ASU Career Week Logo" 
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-orange-100">Sign in to ASU Career Week</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 stagger-children">
            {getFieldError('general') && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center space-x-2 mb-6 fade-in-blur">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm">{getFieldError('general')}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Email */}
              <div className="fade-in-blur">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
                    getFieldError('email') ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                  disabled={loading}
                  autoComplete="email"
                />
                {getFieldError('email') && (
                  <p className="text-sm text-red-600 mt-2">{getFieldError('email')}</p>
                )}
              </div>

              {/* Password */}
              <div className="fade-in-blur">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
                      getFieldError('password') ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
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

              {/* Forgot Password */}
              <div className="text-right fade-in-blur">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium transition-colors"
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed fade-in-blur smooth-hover"
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

              {/* Register Link */}
              <div className="text-center pt-4 border-t border-gray-200 fade-in-blur">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/auth-register')}
                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
                    disabled={loading}
                  >
                    Create Attendee Account
                  </button>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};