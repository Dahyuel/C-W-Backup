import React, { useState } from 'react';
import { User, Lock, ChevronRight, CheckCircle, AlertCircle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  RegistrationData, 
  ValidationError
} from '../../types';
import { 
  FACULTIES
} from '../../utils/constants';
import { 
  validateName,
  validateEmail,
  validatePhone,
  validatePersonalId,
  validatePassword,
  validateConfirmPassword
} from '../../utils/validation';
import { signUpVolunteer } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const VolunteerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    personalId: '',
    faculty: '',
    password: '',
    confirmPassword: '',
    role: '' // New role field
  });
  
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const sections = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Role Selection', icon: Heart },
    { id: 3, title: 'Account Security', icon: Lock }
  ];

const roleOptions = [
  { value: 'registration', label: 'Registration Desk' },
  { value: 'building', label: 'Building Assistance' },
  { value: 'volunteer', label: 'Other Volunteer' }, // Changed from 'info desk'
  { value: 'team_leader', label: 'Team Leader' } // Added team_leader option
];

  const updateField = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  const validateSection = (section: number): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    if (section === 1) {
      const firstNameError = validateName(formData.firstName, 'First name');
      if (firstNameError) validationErrors.push({ field: 'firstName', message: firstNameError });

      const lastNameError = validateName(formData.lastName, 'Last name');
      if (lastNameError) validationErrors.push({ field: 'lastName', message: lastNameError });

      const emailError = validateEmail(formData.email);
      if (emailError) validationErrors.push({ field: 'email', message: emailError });

      const phoneError = validatePhone(formData.phone);
      if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

      const personalIdError = validatePersonalId(formData.personalId);
      if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });

      if (!formData.faculty) validationErrors.push({ field: 'faculty', message: 'Faculty is required' });
    }

    if (section === 2) {
      if (!formData.role) validationErrors.push({ field: 'role', message: 'Please select a volunteer role' });
    }

    if (section === 3) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) validationErrors.push({ field: 'password', message: passwordError });

      const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
      if (confirmPasswordError) validationErrors.push({ field: 'confirmPassword', message: confirmPasswordError });
    }

    return validationErrors;
  };

  const nextSection = () => {
    const sectionErrors = validateSection(currentSection);
    if (sectionErrors.length > 0) {
      setErrors(sectionErrors);
      return;
    }
    
    setErrors([]);
    if (currentSection < 3) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all sections
    const allErrors = [1, 2, 3].flatMap(section => validateSection(section));
    if (allErrors.length > 0) {
      setErrors(allErrors);
      const firstErrorSection = Math.min(...allErrors.map(error => {
        if (['firstName', 'lastName', 'email', 'phone', 'personalId', 'faculty'].includes(error.field)) return 1;
        if (['role'].includes(error.field)) return 2;
        if (['password', 'confirmPassword'].includes(error.field)) return 3;
        return 1;
      }));
      setCurrentSection(firstErrorSection);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      // Determine the role to send to the backend
const roleToSend = formData.role === 'other' || formData.role === 'info desk' 
  ? 'volunteer' 
  : formData.role;

const userData = {
  first_name: formData.firstName.trim(),
  last_name: formData.lastName.trim(),
  phone: formData.phone.trim(),
  personal_id: formData.personalId.trim(),
  faculty: formData.faculty,
  role: formData.role // Send the selected role directly
};

      const { data, error } = await signUpVolunteer(formData.email, formData.password, userData);

      if (error) {
        setErrors([{ field: 'general', message: error.message }]);
        return;
      }

      setShowSuccess(true);
      
    } catch (error: any) {
      setErrors([{ 
        field: 'general', 
        message: error.message || 'An unexpected error occurred. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('firstName') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your first name"
          />
          {getFieldError('firstName') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('firstName')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('lastName') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your last name"
          />
          {getFieldError('lastName') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('lastName')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('email') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your email address"
        />
        {getFieldError('email') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('phone') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="01X-XXXXXXXX"
          />
          {getFieldError('phone') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personal ID *
          </label>
          <input
            type="text"
            value={formData.personalId}
            onChange={(e) => updateField('personalId', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('personalId') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="14-digit Egyptian ID"
            maxLength={14}
          />
          {getFieldError('personalId') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('personalId')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Faculty *
        </label>
        <select
          value={formData.faculty}
          onChange={(e) => updateField('faculty', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('faculty') ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select faculty</option>
          {FACULTIES.map(faculty => (
            <option key={faculty} value={faculty}>{faculty}</option>
          ))}
        </select>
        {getFieldError('faculty') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('faculty')}</p>
        )}
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Heart className="h-6 w-6 text-orange-600 mr-2" />
          <h3 className="text-lg font-semibold text-orange-900">Volunteer Role Selection</h3>
        </div>
        <p className="text-orange-800">
          Please select the volunteer role you're interested in. This helps us assign you to the most suitable position.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Preferred Volunteer Role *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleOptions.map((option) => (
            <label
              key={option.value}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-colors ${
                formData.role === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={formData.role === option.value}
                onChange={(e) => updateField('role', e.target.value)}
                className="sr-only"
              />
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{option.label}</span>
                </div>
                <div className={`flex-shrink-0 ${formData.role === option.value ? 'text-orange-600' : 'text-gray-300'}`}>
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </label>
          ))}
        </div>
        {getFieldError('role') && (
          <p className="mt-2 text-sm text-red-600">{getFieldError('role')}</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Selecting "Information Desk" or "Other Volunteer Role" will register you as a general volunteer. 
          Specific role assignments will be communicated after registration.
        </p>
      </div>
    </div>
  );

  const renderAccountSecurity = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password *
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('password') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your password (minimum 6 characters)"
        />
        {getFieldError('password') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password *
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('confirmPassword') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Confirm your password"
        />
        {getFieldError('confirmPassword') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
        )}
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (currentSection) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderRoleSelection();
      case 3:
        return renderAccountSecurity();
      default:
        return null;
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-orange-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Volunteer Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully. You can now log in to access your volunteer dashboard.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-12 w-12 text-orange-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Volunteer Registration</h1>
          </div>
          <p className="text-gray-600">Join our amazing volunteer team and help make Career Week unforgettable!</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {sections.map((section, index) => (
              <div key={section.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentSection >= section.id
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <section.icon className="w-5 h-5" />
                </div>
                {index < sections.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-colors ${
                    currentSection > section.id ? 'bg-orange-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between max-w-2xl mx-auto mt-2">
            {sections.map(section => (
              <div key={section.id} className="text-xs text-center" style={{ width: '120px' }}>
                <span className={currentSection >= section.id ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                  {section.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100">
          {/* General Error */}
          {getFieldError('general') && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-red-700">{getFieldError('general')}</p>
            </div>
          )}

          {/* Section Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {sections[currentSection - 1].title}
            </h2>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentSection / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Section Content */}
          {renderSectionContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevSection}
              disabled={currentSection === 1}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                currentSection === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            {currentSection < 3 ? (
              <button
                type="button"
                onClick={nextSection}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Volunteer Account...
                  </>
                ) : (
                  'Create Volunteer Account'
                )}
              </button>
            )}
          </div>

          {/* Login Link */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};