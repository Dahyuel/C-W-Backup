import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginData, ValidationError } from '../types';
import { validateEmail, validatePassword } from '../utils/validation';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, getRoleBasedRedirect, loading: authLoading, profile } = useAuth();
  
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Redirect when authentication is complete and profile is loaded
  useEffect(() => {
    if (isAuthenticated && profile && !authLoading) {
      navigate(getRoleBasedRedirect(), { replace: true });
    }
  }, [isAuthenticated, profile, authLoading, navigate, getRoleBasedRedirect]);

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
        setErrors([{ field: 'general', message: 'Invalid email or password' }]);
        return;
      }

      // Set login success flag - redirection will be handled by useEffect
      setLoginSuccess(true);
      
    } catch (error) {
      setErrors([{ field: 'general', message: 'Login failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center fade-in-scale">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success message while redirecting
  if (loginSuccess && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center fade-in-scale">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Login successful! Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Responsive Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
backgroundImage: 'url("/images/careercenter.png")',
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </div>

      {/* Login Form */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 w-full max-w-md overflow-hidden fade-in-up-blur modal-content-blur">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-center fade-in-blur">
            {/* Bigger Rounded Logo */}
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
            {/* General Error */}
            {getFieldError('general') && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center space-x-2 mb-6 fade-in-blur">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700">{getFieldError('general')}</p>
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-600 transition-colors"
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
              <div className="text-right fade-in-blur">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium transition-colors"
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

              {/* Register Links */}
              <div className="text-center pt-4 border-t border-gray-200 space-y-2 fade-in-blur">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
                  >
                    Create Attendee Account
                  </button>
                </p>
                <p className="text-gray-600">
                  Want to volunteer?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/V0lunt33ringR3g')}
                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
                  >
                    Register as Volunteer
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