import React, { useState, useEffect, useCallback } from 'react';
import { User, GraduationCap, Users, Lock, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  RegistrationData, 
  ValidationError, 
  FileUpload as FileUploadType 
} from '../types';
import { 
  UNIVERSITIES, 
  FACULTIES, 
  CLASS_YEARS, 
  HOW_DID_YOU_HEAR_OPTIONS 
} from '../utils/constants';
import { 
  validateName,
  validateEmail,
  validatePhone,
  validatePersonalId,
  validatePassword,
  validateConfirmPassword,
  validateVolunteerId
} from '../utils/validation';
import { uploadFile, updateUserFiles } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// FileUpload Component
const FileUpload: React.FC<{
  accept: string;
  maxSize: number;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  label: string;
  currentFile?: File;
  required?: boolean;
}> = ({ accept, maxSize, onFileSelect, onFileRemove, label, currentFile, required = false }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
        return;
      }
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
        currentFile ? 'border-green-200 bg-green-50' : 'border-orange-200'
      }`}>
        {currentFile ? (
          <div className="flex items-center justify-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">{currentFile.name}</span>
            <button
              type="button"
              onClick={onFileRemove}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              required={required}
            />
            <label
              htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              {label} {required && '*'}
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signIn, isAuthenticated, profile, loading: authLoading, getRoleBasedRedirect, validateRegistration } = useAuth();
  
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    gender: '',
    nationality: '',
    email: '',
    phone: '',
    personalId: '',
    university: '',
    customUniversity: '',
    faculty: '',
    degreeLevel: '',
    program: '',
    classYear: '',
    howDidYouHear: '',
    volunteerId: '',
    password: '',
    confirmPassword: ''
  });
  
  const [fileUploads, setFileUploads] = useState<FileUploadType>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const sections = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Academic Information', icon: GraduationCap },
    { id: 3, title: 'Event & Volunteer Info', icon: Users },
    { id: 4, title: 'Account Security', icon: Lock }
  ];

  // Redirect when authentication is complete after auto-login
  useEffect(() => {
    if (isAuthenticated && profile && !authLoading) {
      console.log('Auth context ready, redirecting to dashboard...');
      navigate(getRoleBasedRedirect(), { replace: true });
    }
  }, [isAuthenticated, profile, authLoading, navigate, getRoleBasedRedirect]);

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

    if (!formData.gender) validationErrors.push({ field: 'gender', message: 'Gender is required' });
    if (!formData.nationality) validationErrors.push({ field: 'nationality', message: 'Nationality is required' });
  }

  if (section === 2) {
    if (!formData.university) validationErrors.push({ field: 'university', message: 'University is required' });
    if (formData.university === 'Other' && !formData.customUniversity) {
      validationErrors.push({ field: 'customUniversity', message: 'Custom university name is required' });
    }
    if (!formData.faculty) validationErrors.push({ field: 'faculty', message: 'Faculty is required' });
    if (!formData.degreeLevel) validationErrors.push({ field: 'degreeLevel', message: 'Degree level is required' });
    if (!formData.program) validationErrors.push({ field: 'program', message: 'Program/Major is required' });
    if (formData.degreeLevel === 'Student' && !formData.classYear) {
      validationErrors.push({ field: 'classYear', message: 'Class year is required for students' });
    }
  }

  if (section === 3) {
    if (!formData.howDidYouHear) validationErrors.push({ field: 'howDidYouHear', message: 'This field is required' });
    
    // File upload validation
    if (!fileUploads.universityId) validationErrors.push({ field: 'universityId', message: 'University ID is required' });
    if (!fileUploads.resume) validationErrors.push({ field: 'resume', message: 'CV/Resume is required' });
  }

  if (section === 4) {
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
    if (currentSection < 4) {
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
  const allErrors = [1, 2, 3, 4].flatMap(section => validateSection(section));
  if (allErrors.length > 0) {
    setErrors(allErrors);
    const firstErrorSection = Math.min(...allErrors.map(error => {
      if (['firstName', 'lastName', 'email', 'phone', 'personalId', 'faculty', 'gender', 'nationality'].includes(error.field)) return 1;
      if (['university', 'degreeLevel', 'program', 'classYear'].includes(error.field)) return 2;
      if (['howDidYouHear', 'universityId', 'resume'].includes(error.field)) return 3;
      if (['password', 'confirmPassword'].includes(error.field)) return 4;
      return 1;
    }));
    setCurrentSection(firstErrorSection);
    return;
  }

  setLoading(true);
  setErrors([]);

  try {
    const profileData = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone: formData.phone.trim(),
      personal_id: formData.personalId.trim(),
      faculty: formData.faculty,
      university: formData.university === 'Other' ? formData.customUniversity : formData.university,
      gender: formData.gender,
      nationality: formData.nationality,
      degree_level: formData.degreeLevel,
      program: formData.program,
      class: formData.classYear,
      how_did_hear_about_event: formData.howDidYouHear,
      volunteer_id: formData.volunteerId || null,
      // role will be set to 'attendee' by signUp function
    };

    // Use regular signUp for attendee registration
    const { data, error } = await signUp(formData.email, formData.password, profileData);

    if (error) {
      setErrors([{ field: "general", message: error.message }]);
      return;
    }

    console.log("✅ Registration successful, attempting auto-login...");
    
    // Auto-signin after successful registration
    const { error: signInError } = await signIn(formData.email, formData.password);

    if (signInError) {
      console.log("⚠️ Auto-login failed, showing success message");
      setShowSuccess(true);
    }
    // If auto-login succeeds, the useEffect will handle the redirect
    
  } catch (error: any) {
    setErrors([
      {
        field: "general",
        message: error.message || "An unexpected error occurred. Please try again.",
      },
    ]);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender *
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('gender') ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          {getFieldError('gender') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('gender')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nationality *
          </label>
          <select
            value={formData.nationality}
            onChange={(e) => updateField('nationality', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('nationality') ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select nationality</option>
            <option value="Egyptian">Egyptian</option>
            <option value="Other">Other</option>
          </select>
          {getFieldError('nationality') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('nationality')}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <div className="relative">
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('email') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
          />
        </div>
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
          <div className="relative">
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
          </div>
          {getFieldError('personalId') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('personalId')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAcademicInfo = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          University *
        </label>
        <select
          value={formData.university}
          onChange={(e) => updateField('university', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('university') ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select university</option>
          {UNIVERSITIES.map(uni => (
            <option key={uni} value={uni}>{uni}</option>
          ))}
        </select>
        {getFieldError('university') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('university')}</p>
        )}
      </div>

      {formData.university === 'Other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom University Name *
          </label>
          <input
            type="text"
            value={formData.customUniversity}
            onChange={(e) => updateField('customUniversity', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('customUniversity') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your university name"
          />
          {getFieldError('customUniversity') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('customUniversity')}</p>
          )}
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Degree Level *
          </label>
          <select
            value={formData.degreeLevel}
            onChange={(e) => updateField('degreeLevel', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('degreeLevel') ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select degree level</option>
            <option value="Student">Student</option>
            <option value="Graduate">Graduate</option>
          </select>
          {getFieldError('degreeLevel') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('degreeLevel')}</p>
          )}
        </div>

        {formData.degreeLevel === 'Student' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Year *
            </label>
            <select
              value={formData.classYear}
              onChange={(e) => updateField('classYear', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                getFieldError('classYear') ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select class year</option>
              {CLASS_YEARS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {getFieldError('classYear') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('classYear')}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Program/Major *
        </label>
        <input
          type="text"
          value={formData.program}
          onChange={(e) => updateField('program', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('program') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your program or major"
        />
        {getFieldError('program') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('program')}</p>
        )}
      </div>
    </div>
  );

  const renderEventInfo = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How did you hear about this event? *
        </label>
        <select
          value={formData.howDidYouHear}
          onChange={(e) => updateField('howDidYouHear', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
            getFieldError('howDidYouHear') ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select an option</option>
          {HOW_DID_YOU_HEAR_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {getFieldError('howDidYouHear') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('howDidYouHear')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Volunteer ID (Optional)
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.volunteerId}
            onChange={(e) => updateField('volunteerId', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
              getFieldError('volunteerId') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter volunteer ID (if applicable)"
          />
        </div>
        {getFieldError('volunteerId') && (
          <p className="mt-1 text-sm text-red-600">{getFieldError('volunteerId')}</p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Required Documents</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            University ID *
          </label>
          <FileUpload
            accept=".jpg,.jpeg,.png,.pdf"
            maxSize={10 * 1024 * 1024}
            onFileSelect={(file) => {
              setFileUploads(prev => ({ ...prev, universityId: file }));
              setErrors(prev => prev.filter(error => error.field !== 'universityId'));
            }}
            onFileRemove={() => setFileUploads(prev => ({ ...prev, universityId: undefined }))}
            label="Upload University ID (JPG, PNG, PDF - Max 10MB)"
            currentFile={fileUploads.universityId}
            required={true}
          />
          {getFieldError('universityId') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('universityId')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CV/Resume *
          </label>
          <FileUpload
            accept=".pdf,.doc,.docx"
            maxSize={10 * 1024 * 1024}
            onFileSelect={(file) => {
              setFileUploads(prev => ({ ...prev, resume: file }));
              setErrors(prev => prev.filter(error => error.field !== 'resume'));
            }}
            onFileRemove={() => setFileUploads(prev => ({ ...prev, resume: undefined }))}
            label="Upload CV/Resume (PDF, DOC, DOCX - Max 10MB)"
            currentFile={fileUploads.resume}
            required={true}
          />
          {getFieldError('resume') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('resume')}</p>
          )}
        </div>
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
        return renderAcademicInfo();
      case 3:
        return renderEventInfo();
      case 4:
        return renderAccountSecurity();
      default:
        return null;
    }
  };

  // Show loading while AuthContext is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success message only when auto-login fails
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-orange-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully. You can now log in to access Career Week Account.
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Join Career Week</h1>
          <p className="text-gray-600">Create your attendee account to access exclusive events</p>
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
                style={{ width: `${(currentSection / 4) * 100}%` }}
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

            {currentSection < 4 ? (
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
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