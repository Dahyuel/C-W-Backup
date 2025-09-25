import React, { useState } from 'react';
import { KeyRound, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { ForgotPasswordData, ValidationError } from '../types';
import { validatePersonalId, validateEmail } from '../utils/validation';
import { resetPassword } from '../lib/supabase';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState<ForgotPasswordData>({
    personalId: '',
    email: ''
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateField = (field: keyof ForgotPasswordData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear specific field error when user starts typing
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const validateForm = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    const personalIdError = validatePersonalId(formData.personalId);
    if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });

    const emailError = validateEmail(formData.email);
    if (emailError) validationErrors.push({ field: 'email', message: emailError });

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
      const { data, error } = await resetPassword(formData.email);

      if (error) {
        setErrors([{ field: 'general', message: error.message }]);
        return;
      }

      setSuccess(true);
      
    } catch (error) {
      setErrors([{ field: 'general', message: 'Password reset failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 w-full max-w-md p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent password reset instructions to your email address. Please check your inbox and follow the link to reset your password.
          </p>
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 text-center">
          <KeyRound className="mx-auto h-12 w-12 text-white mb-3" />
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-orange-100">Enter your details to reset your password</p>
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
            {/* Personal ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal ID
              </label>
              <input
                type="text"
                value={formData.personalId}
                onChange={(e) => updateField('personalId', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                  getFieldError('personalId') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your 14-digit Personal ID"
                maxLength={14}
              />
              {getFieldError('personalId') && (
                <p className="text-sm text-red-600 mt-2">{getFieldError('personalId')}</p>
              )}
            </div>

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
                placeholder="Enter your registered email address"
              />
              {getFieldError('email') && (
                <p className="text-sm text-red-600 mt-2">{getFieldError('email')}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending Reset Link...</span>
                </div>
              ) : (
                'Send Reset Link'
              )}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full flex items-center justify-center space-x-2 text-orange-600 hover:text-orange-700 font-medium py-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};