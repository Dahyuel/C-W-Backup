// components/VolunteerRegistration.tsx - Profile completion form (after auth)
import React, { useState, useEffect } from 'react';
import { User, ChevronRight, CheckCircle, AlertCircle, Heart, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ValidationError } from '../../types';
import { FACULTIES } from '../../utils/constants';
import {
  validateName,
  validatePhone,
  validatePersonalId,
} from '../../utils/validation';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AuthTransition } from '../../components/AuthTransition';

interface VolunteerFormData {
  firstName: string;
  lastName: string;
  phone: string;
  personalId: string;
  faculty: string;
  role: string;
  gender: string;
  tlTeam: string;
}

export const VolunteerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading: authLoading, getRoleBasedRedirect, refreshProfile } = useAuth();
  
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<VolunteerFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    personalId: '',
    faculty: '',
    role: '',
    gender: '',
    tlTeam: ''
  });
  
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAuthTransition, setShowAuthTransition] = useState(false);

  const sections = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Role Selection', icon: Heart }
  ];

  const roleOptions = [
    { value: 'registration', label: 'Registration Desk' },
    { value: 'building', label: 'Building Assistance' },
    { value: 'info_desk', label: 'Info Desk' },
    { value: 'ushers', label: 'Ushers' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'media', label: 'Media' },
    { value: 'ER', label: 'ER Team' },
    { value: 'BD team', label: 'BD Team' },
    { value: 'catering', label: 'Catering' },
    { value: 'feedback', label: 'Feedback Team' },
    { value: 'stage', label: 'Stage Team' },
    { value: 'team_leader', label: 'Team Leader' }
  ];

  const teamOptions = [
    { value: 'registration', label: 'Registration Team' },
    { value: 'building', label: 'Building Team' },
    { value: 'info_desk', label: 'Info Desk Team' },
    { value: 'ushers', label: 'Ushers Team' },
    { value: 'marketing', label: 'Marketing Team' },
    { value: 'media', label: 'Media Team' },
    { value: 'ER', label: 'ER Team' },
    { value: 'BD team', label: 'BD Team' },
    { value: 'catering', label: 'Catering Team' },
    { value: 'feedback', label: 'Feedback Team' },
    { value: 'stage', label: 'Stage Team' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (!authLoading && isAuthenticated) {
        // Only redirect if profile is complete AND user has a specific role (not just 'volunteer')
        if (profile?.profile_complete && profile.role && profile.role !== 'volunteer') {
          console.log('Profile complete with specific role, redirecting:', profile.role);
          navigate(getRoleBasedRedirect(), { replace: true });
        }
        // Otherwise, stay on the form to let user complete registration
      } else if (!authLoading && !isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        navigate('/login', { replace: true });
      }
    };
  
    checkProfileAndRedirect();
  }, [isAuthenticated, profile, authLoading, navigate, getRoleBasedRedirect]);

  // Update form with profile data
  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.first_name || prev.firstName,
        lastName: profile.last_name || prev.lastName,
        ...(profile.personal_id && { personalId: profile.personal_id }),
        ...(profile.phone && { phone: profile.phone }),
        ...(profile.faculty && { faculty: profile.faculty }),
        ...(profile.gender && { gender: profile.gender }),
        ...(profile.role && { role: profile.role }),
        ...(profile.tl_team && { tlTeam: profile.tl_team })
      }));
    }
  }, [user, profile]);

  // Safety timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.warn('Auth loading timeout - forcing state');
        if (isAuthenticated && user) {
          console.log('Timeout: User is authenticated, allowing registration form');
        }
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [authLoading, isAuthenticated, user]);

  const updateField = (field: keyof VolunteerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  // Reset team selection when role changes
  useEffect(() => {
    if (formData.role !== 'team_leader') {
      setFormData(prev => ({ ...prev, tlTeam: '' }));
    }
  }, [formData.role]);

  const validateGender = (gender: string): string | null => {
    if (!gender || !gender.trim()) {
      return 'Gender is required';
    }

    const validGenders = ['male', 'female'];
    if (!validGenders.includes(gender.trim().toLowerCase())) {
      return 'Please select a valid gender';
    }

    return null;
  };

  const validateSection = (section: number): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    if (section === 1) {
      const firstNameError = validateName(formData.firstName, 'First name');
      if (firstNameError) validationErrors.push({ field: 'firstName', message: firstNameError });

      const lastNameError = validateName(formData.lastName, 'Last name');
      if (lastNameError) validationErrors.push({ field: 'lastName', message: lastNameError });

      const phoneError = validatePhone(formData.phone);
      if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

      const personalIdError = validatePersonalId(formData.personalId);
      if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });

      if (!formData.faculty) validationErrors.push({ field: 'faculty', message: 'Faculty is required' });
      
      const genderError = validateGender(formData.gender);
      if (genderError) validationErrors.push({ field: 'gender', message: genderError });
    }

    if (section === 2) {
      if (!formData.role) {
        validationErrors.push({ field: 'role', message: 'Please select a volunteer role' });
      }

      if (formData.role === 'team_leader' && !formData.tlTeam) {
        validationErrors.push({ field: 'tlTeam', message: 'Please select which team you will lead' });
      }
    }

    return validationErrors;
  };
  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentSection < 2) {
      e.preventDefault(); // Prevent form submission on Enter
      nextSection();
    }
  };
  const nextSection = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Next section clicked, current section:', currentSection);
    
    const sectionErrors = validateSection(currentSection);
    if (sectionErrors.length > 0) {
      console.log('Section errors:', sectionErrors);
      setErrors(sectionErrors);
      return;
    }
    
    setErrors([]);
    if (currentSection < 2) {
      console.log('Moving to section:', currentSection + 1);
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
    e.stopPropagation(); // Add this to prevent event bubbling
    
    console.log('Form submission started...');
    
    // Validate all sections
    const allErrors = [1, 2].flatMap(section => validateSection(section));
    if (allErrors.length > 0) {
      console.log('Validation errors found:', allErrors);
      setErrors(allErrors);
      // Find the first section with errors
      const firstErrorSection = Math.min(...allErrors.map(error => {
        if (['firstName', 'lastName', 'phone', 'personalId', 'faculty', 'gender'].includes(error.field)) return 1;
        if (['role', 'tlTeam'].includes(error.field)) return 2;
        return 1;
      }));
      setCurrentSection(firstErrorSection);
      return;
    }
  
    console.log('All validation passed, proceeding with submission...');
    
    setLoading(true);
    setErrors([]);
    setShowAuthTransition(true);
  
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
  
      // Update profile with the selected specific volunteer role
      const profileData = {
        id: user.id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        personal_id: formData.personalId.trim(),
        faculty: formData.faculty,
        role: formData.role, // This will update from 'volunteer' to specific role
        gender: formData.gender,
        tl_team: formData.tlTeam || null,
        profile_complete: true, // MARK AS COMPLETE
        updated_at: new Date().toISOString()
      };
  
      console.log("🚀 Updating volunteer profile with specific role:", formData.role);
  
      const { error: updateError } = await supabase
        .from('users_profiles')
        .update(profileData)
        .eq('id', user.id);
  
      if (updateError) {
        console.error("❌ Profile update failed:", updateError);
        if (updateError.code === '23505' && updateError.message?.includes('personal_id')) {
          setErrors([{ 
            field: "personalId", 
            message: "This Personal ID is already registered. Please use a different ID." 
          }]);
        } else {
          setErrors([{ 
            field: "general", 
            message: "Failed to save profile. Please try again." 
          }]);
        }
        setShowAuthTransition(false);
        return;
      }
  
      console.log("✅ Profile updated successfully with role:", formData.role);
  
      await refreshProfile();
  
      console.log("🎉 Volunteer registration completed successfully!");
      setShowAuthTransition(false);
      setShowSuccess(true);
  
      setTimeout(() => {
        navigate(getRoleBasedRedirect(), { replace: true });
      }, 3000);
  
    } catch (error: any) {
      console.error("💥 Unexpected error during profile completion:", error);
      setErrors([{
        field: "general",
        message: "An unexpected error occurred. Please try again or contact support if the problem persists.",
      }]);
      setShowAuthTransition(false);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(error => error.field === field)?.message;
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6 stagger-children">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('firstName') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your first name"
          />
          {getFieldError('firstName') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('firstName')}</p>
          )}
        </div>

        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('lastName') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your last name"
          />
          {getFieldError('lastName') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('lastName')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('phone') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="01X-XXXXXXXX"
          />
          {getFieldError('phone') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('phone')}</p>
          )}
        </div>

        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personal ID *
          </label>
          <input
            type="text"
            value={formData.personalId}
            onChange={(e) => updateField('personalId', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('personalId') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="14-digit Egyptian ID"
            maxLength={14}
          />
          {getFieldError('personalId') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('personalId')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faculty *
          </label>
          <select
            value={formData.faculty}
            onChange={(e) => updateField('faculty', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('faculty') ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select faculty</option>
            {FACULTIES.map(faculty => (
              <option key={faculty} value={faculty}>{faculty}</option>
            ))}
          </select>
          {getFieldError('faculty') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('faculty')}</p>
          )}
        </div>

        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender *
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('gender') ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select gender</option>
            {genderOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {getFieldError('gender') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('gender')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="space-y-6 stagger-children">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 fade-in-blur">
        <div className="flex items-center mb-4">
          <Heart className="h-6 w-6 text-orange-600 mr-2" />
          <h3 className="text-lg font-semibold text-orange-900">Volunteer Role Selection</h3>
        </div>
        <p className="text-orange-800">
          Please select the volunteer role you're interested in. This helps us assign you to the most suitable position.
        </p>
      </div>
  
      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Preferred Volunteer Role *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleOptions.map((option) => (
            <div
              key={option.value}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all duration-300 ${
                formData.role === option.value
                  ? 'border-orange-500 bg-orange-50 transform scale-[1.02] ring-2 ring-orange-500'
                  : 'border-gray-300 bg-white hover:bg-gray-50 smooth-hover'
              }`}
              onClick={() => {
                console.log('Role selected:', option.value);
                updateField('role', option.value);
              }}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={formData.role === option.value}
                onChange={(e) => {
                  console.log('Radio change:', e.target.value);
                  updateField('role', e.target.value);
                }}
                className="sr-only"
              />
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{option.label}</span>
                </div>
                <div className={`flex-shrink-0 transition-colors duration-300 ${
                  formData.role === option.value ? 'text-orange-600' : 'text-gray-300'
                }`}>
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {getFieldError('role') && (
          <p className="mt-2 text-sm text-red-600 fade-in-blur">{getFieldError('role')}</p>
        )}
      </div>
  
  
      {/* Team Leader Section - ADD THIS COMPLETE SECTION */}
      {formData.role === 'team_leader' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 fade-in-scale">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">Team Leadership</h3>
          </div>
          <p className="text-blue-800 mb-4">
            As a Team Leader, please select which team you will be leading. This helps us organize the volunteer structure.
          </p>
          
          <div className="fade-in-blur">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Team to Lead *
            </label>
            <select
              value={formData.tlTeam}
              onChange={(e) => updateField('tlTeam', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ${
                getFieldError('tlTeam') ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select team</option>
              {teamOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {getFieldError('tlTeam') && (
              <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('tlTeam')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
  const renderSectionContent = () => {
    switch (currentSection) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderRoleSelection();
      default:
        return null;
    }
  };

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

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-orange-100 fade-in-scale modal-content-blur">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 fade-in-scale">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 fade-in-blur">Profile Complete!</h2>
          <p className="text-gray-600 mb-6 fade-in-blur">
            Your volunteer profile has been completed successfully. Redirecting to your dashboard...
          </p>
          <div className="animate-pulse">
            <p className="text-orange-600 font-medium">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AuthTransition 
        isLoading={showAuthTransition}
        message="Completing your volunteer profile..."
      />

      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: 'url("/images/careercenter.png")',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 fade-in-up-blur">
            <div className="flex items-center justify-center mb-4">
              <Heart className="h-12 w-12 text-white mr-3 drop-shadow-lg" />
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">Complete Your Volunteer Profile</h1>
            </div>
            <p className="text-white drop-shadow">Finish setting up your volunteer account</p>
          </div>
        </div>

        <div className="mb-8 fade-in-up-blur">
          <div className="flex items-center max-w-2xl mx-auto">
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    currentSection >= section.id
                      ? 'bg-orange-500 border-orange-500 text-white transform scale-110'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                </div>
                {index < sections.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                    currentSection > section.id ? 'bg-orange-500' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between max-w-2xl mx-auto mt-2">
            {sections.map(section => (
              <div key={section.id} className="text-xs text-center" style={{ width: '200px' }}>
                <span className={`transition-all duration-300 ${
                  currentSection >= section.id 
                    ? 'text-white font-medium drop-shadow transform scale-105' 
                    : 'text-white drop-shadow'
                }`}>
                  {section.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100 fade-in-up-blur modal-content-blur">
          {getFieldError('general') && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center fade-in-blur">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-red-700">{getFieldError('general')}</p>
            </div>
          )}

          <div className="mb-8 fade-in-blur">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {sections[currentSection - 1].title}
            </h2>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(currentSection / 2) * 100}%` }}
              />
            </div>
          </div>

          <div className="stagger-children">
            {renderSectionContent()}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 fade-in-blur">
            <button
              type="button"
              onClick={prevSection}
              disabled={currentSection === 1}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                currentSection === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 smooth-hover transform hover:scale-105'
              }`}
            >
              Previous
            </button>

            {currentSection < 2 ? (
  <button
    type="button" // Make sure this is explicitly set
    onClick={nextSection}
    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 flex items-center smooth-hover"
  >
    Next
    <ChevronRight className="w-4 h-4 ml-2" />
  </button>
) : (
  <button
    type="submit" // Only the final button should be type="submit"
    disabled={loading}
    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center smooth-hover"
  >
    {loading ? (
      <>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        Completing Profile...
      </>
    ) : (
      'Complete Profile'
    )}
  </button>
)}
          </div>
        </form>
      </div>
    </div>
  );
};
