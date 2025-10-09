// components/RegistrationForm.tsx - UPDATED with logout button
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, GraduationCap, ChevronRight, CheckCircle, AlertCircle, FileText, X, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RegistrationData, ValidationError, FileUpload as FileUploadType } from '../types';
import { FACULTIES, CLASS_YEARS, HOW_DID_YOU_HEAR_OPTIONS } from '../utils/constants';
import { validatePhone, validatePersonalId, validateVolunteerId } from '../utils/validation';
import { uploadFile, cleanupUploadedFiles, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AuthTransition } from '../components/AuthTransition';

const ErrorPopup: React.FC<{
  message: string;
  onClose: () => void;
  type?: 'error' | 'warning';
}> = ({ message, onClose, type = 'error' }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`rounded-lg shadow-lg border p-4 max-w-sm ${
        type === 'error' 
          ? 'bg-red-50 border-red-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${
            type === 'error' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              type === 'error' ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`flex-shrink-0 hover:opacity-70 transition-opacity ${
              type === 'error' ? 'text-red-600' : 'text-yellow-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div className="space-y-2 fade-in-blur">
      <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
        currentFile 
          ? 'border-green-200 bg-green-50 transform hover:scale-[1.02]' 
          : 'border-orange-200 hover:border-orange-300'
      }`}>
        {currentFile ? (
          <div className="flex items-center justify-center space-x-3 fade-in-scale">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">{currentFile.name}</span>
            <button
              type="button"
              onClick={onFileRemove}
              className="text-red-600 hover:text-red-800 transition-colors duration-200"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="fade-in-blur">
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
              className="cursor-pointer text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors duration-200 smooth-hover"
            >
              {label} {required ? '*' : '(Optional)'}
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

const LogoutButton: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed smooth-hover"
    >
      <LogOut className="w-4 h-4" />
      <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
    </button>
  );
};

export const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading: authLoading, getRoleBasedRedirect, refreshProfile, signOut } = useAuth();
  
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
  const [showAuthTransition, setShowAuthTransition] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{ message: string; type?: 'error' | 'warning' } | null>(null);

  // Refs to prevent form resets
  const formDataRef = useRef(formData);
  const hasInitialized = useRef(false);
  const hasRedirected = useRef(false);
  const sectionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when form data changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const sections = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Academic Information', icon: GraduationCap },
    { id: 3, title: 'Event & Documents', icon: FileText }
  ];

  const universities = [
    'Ain Shams University',
    'Helwan University',
    'Canadian Ahram University',
    'Banha University',
    'Cairo University',
    'Other'
  ];

  const showErrorPopup = useCallback((message: string, type: 'error' | 'warning' = 'error') => {
    setErrorPopup({ message, type });
  }, []);

  const closeErrorPopup = useCallback(() => {
    setErrorPopup(null);
  }, []);

  // Single initialization effect
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const checkAuth = async () => {
      if (!authLoading) {
        if (!isAuthenticated) {
          navigate('/login', { replace: true });
          return;
        }
        
        // If profile is already complete, redirect directly to dashboard
        if (profile?.profile_complete && !hasRedirected.current) {
          hasRedirected.current = true;
          const redirectPath = getRoleBasedRedirect();
          console.log('🔄 Profile already complete, redirecting to:', redirectPath);
          navigate(redirectPath, { replace: true });
          return;
        }
        
        // Pre-fill form with existing data if available
        if (profile) {
          setFormData(prev => ({
            ...prev,
            firstName: profile.first_name || prev.firstName,
            lastName: profile.last_name || prev.lastName,
            email: profile.email || prev.email,
            ...(profile.personal_id && { personalId: profile.personal_id }),
            ...(profile.phone && { phone: profile.phone }),
            ...(profile.university && { university: profile.university }),
            ...(profile.faculty && { faculty: profile.faculty }),
            ...(profile.gender && { gender: profile.gender }),
            ...(profile.nationality && { nationality: profile.nationality })
          }));
        }
      }
    };

    checkAuth();
  }, [isAuthenticated, profile, authLoading, navigate, getRoleBasedRedirect]);

  const updateField = useCallback((field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  const validateSection = async (section: number): Promise<ValidationError[]> => {
    const validationErrors: ValidationError[] = [];

    if (section === 1) {
      if (!formData.firstName) validationErrors.push({ field: 'firstName', message: 'First name is required' });
      if (!formData.lastName) validationErrors.push({ field: 'lastName', message: 'Last name is required' });
      if (!formData.gender) validationErrors.push({ field: 'gender', message: 'Gender is required' });
      if (!formData.nationality) validationErrors.push({ field: 'nationality', message: 'Nationality is required' });

      const phoneError = validatePhone(formData.phone);
      if (phoneError) validationErrors.push({ field: 'phone', message: phoneError });

      const personalIdError = validatePersonalId(formData.personalId);
      if (personalIdError) validationErrors.push({ field: 'personalId', message: personalIdError });
    }

    if (section === 2) {
      if (!formData.university) validationErrors.push({ field: 'university', message: 'University is required' });
      if (formData.university === 'Other' && !formData.customUniversity) {
        validationErrors.push({ field: 'customUniversity', message: 'Please specify your university' });
      }
      if (!formData.faculty) validationErrors.push({ field: 'faculty', message: 'Faculty is required' });
      if (!formData.degreeLevel) validationErrors.push({ field: 'degreeLevel', message: 'Degree level is required' });
      if (!formData.program) validationErrors.push({ field: 'program', message: 'Program/Major is required' });
      if (formData.degreeLevel === 'student' && !formData.classYear) {
        validationErrors.push({ field: 'classYear', message: 'Class year is required for students' });
      }
    }

    if (section === 3) {
      if (!formData.howDidYouHear) validationErrors.push({ field: 'howDidYouHear', message: 'This field is required' });
      
      if (formData.volunteerId && formData.volunteerId.trim()) {
        const volunteerIdError = validateVolunteerId(formData.volunteerId);
        if (volunteerIdError) {
          validationErrors.push({ field: 'volunteerId', message: volunteerIdError });
        }
      }
          
      if (!fileUploads.universityId) {
        validationErrors.push({ field: 'universityId', message: 'University ID is required' });
      }
    }

    return validationErrors;
  };

  const nextSection = async () => {
    // Clear any pending timeout
    if (sectionChangeTimeoutRef.current) {
      clearTimeout(sectionChangeTimeoutRef.current);
    }

    const sectionErrors = await validateSection(currentSection);
    if (sectionErrors.length > 0) {
      setErrors(sectionErrors);
      if (sectionErrors.length > 0) {
        showErrorPopup(sectionErrors[0].message, 'error');
      }
      return;
    }
    
    setErrors([]);
    
    // Debounce section change to prevent rapid navigation
    sectionChangeTimeoutRef.current = setTimeout(() => {
      if (currentSection < 3) {
        setCurrentSection(currentSection + 1);
      }
    }, 100);
  };

  const prevSection = () => {
    if (sectionChangeTimeoutRef.current) {
      clearTimeout(sectionChangeTimeoutRef.current);
    }

    sectionChangeTimeoutRef.current = setTimeout(() => {
      if (currentSection > 1) {
        setCurrentSection(currentSection - 1);
      }
    }, 100);
  };

  // OPTIMIZED: Direct redirection without success screen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    const allErrors = await Promise.all([1, 2, 3].map(section => validateSection(section)))
      .then(errorArrays => errorArrays.flat());
      
    if (allErrors.length > 0) {
      setErrors(allErrors);
      if (allErrors.length > 0) {
        showErrorPopup(allErrors[0].message, 'error');
      }
      
      const sectionMap: Record<string, number> = {
        firstName: 1, lastName: 1, gender: 1, nationality: 1,
        phone: 1, personalId: 1,
        university: 2, faculty: 2, degreeLevel: 2,
        program: 2, classYear: 2,
        howDidYouHear: 3, volunteerId: 3, universityId: 3
      };

      const firstErrorSection = Math.min(
        ...allErrors.map(error => sectionMap[error.field] ?? 1)
      );
      setCurrentSection(firstErrorSection);
      return;
    }

    setLoading(true);
    setErrors([]);
    setShowAuthTransition(true);

    const uploadedFiles: { bucket: string; path: string }[] = [];

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const profileData = {
        id: user.id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        gender: formData.gender,
        nationality: formData.nationality,
        phone: formData.phone.trim(),
        personal_id: formData.personalId.trim(),
        university: formData.university === 'Other' ? formData.customUniversity : formData.university,
        faculty: formData.faculty,
        degree_level: formData.degreeLevel,
        program: formData.program,
        class: formData.degreeLevel === 'student' ? formData.classYear : null,
        how_did_hear_about_event: formData.howDidYouHear,
        reg_id: formData.volunteerId?.trim() || null,
        university_id_path: null,
        cv_path: null,
        profile_complete: true, // CRITICAL: Set profile_complete to true
        role: 'attendee', // CRITICAL: Ensure role is set to attendee
        updated_at: new Date().toISOString()
      };

      const fileUpdates: { university_id_path?: string; cv_path?: string } = {};
      
      if (fileUploads.universityId) {
        const uniResult = await uploadFile('university-ids', user.id, fileUploads.universityId);
        if (uniResult && 'error' in uniResult && uniResult.error) {
          showErrorPopup('Failed to upload University ID. Please try again.', 'error');
          await cleanupUploadedFiles(uploadedFiles);
          setShowAuthTransition(false);
          setLoading(false);
          return;
        } else if (uniResult && 'data' in uniResult && uniResult.data) {
          fileUpdates.university_id_path = uniResult.data.path;
          if (uniResult.data.path) {
            uploadedFiles.push({ bucket: 'university-ids', path: uniResult.data.path });
          }
        }
      }

      if (fileUploads.resume) {
        const resumeResult = await uploadFile('cvs', user.id, fileUploads.resume);
        if (resumeResult && 'data' in resumeResult && resumeResult.data) {
          fileUpdates.cv_path = resumeResult.data.path;
          if (resumeResult.data.path) {
            uploadedFiles.push({ bucket: 'cvs', path: resumeResult.data.path });
          }
        }
      }

      const profileDataWithFiles = {
        ...profileData,
        ...fileUpdates,
        reg_id: formData.volunteerId?.trim() || null
      };

      const { data: existingProfile, error: checkError } = await supabase
        .from('users_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      let updateError = null;

      if (existingProfile) {
        const { error } = await supabase
          .from('users_profiles')
          .update(profileDataWithFiles)
          .eq('id', user.id);
        updateError = error;
      } else {
        const { error } = await supabase
          .from('users_profiles')
          .insert([profileDataWithFiles]);
        updateError = error;
      }

      if (updateError) {
        if (updateError.code === '23505' && updateError.message?.includes('personal_id')) {
          showErrorPopup("This Personal ID is already registered. Please use a different ID.", 'error');
        } else {
          showErrorPopup("Failed to save profile. Please try again.", 'error');
        }
        
        await cleanupUploadedFiles(uploadedFiles);
        setShowAuthTransition(false);
        setLoading(false);
        return;
      }

      // CRITICAL: Refresh profile and wait for it to complete
      await refreshProfile();
      
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setShowAuthTransition(false);
      
      // DIRECT REDIRECTION: Navigate immediately without showing success screen
      console.log('✅ Registration complete, redirecting directly to dashboard');
      navigate('/attendee', { replace: true });

    } catch (error: unknown) {
      console.error("Profile completion error:", error);
      await cleanupUploadedFiles(uploadedFiles);
      showErrorPopup("An unexpected error occurred. Please try again.", 'error');
      setShowAuthTransition(false);
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
            First Name
          </label>
          <input
            type="text"
            value={formData.firstName}
            disabled
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            placeholder="First name from account"
          />
          <p className="mt-1 text-sm text-gray-500">Name cannot be changed</p>
        </div>

        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
          </label>
          <input
            type="text"
            value={formData.lastName}
            disabled
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            placeholder="Last name from account"
          />
          <p className="mt-1 text-sm text-gray-500">Name cannot be changed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {getFieldError('gender') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('gender')}</p>
          )}
        </div>

        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nationality *
          </label>
          <select
            value={formData.nationality}
            onChange={(e) => updateField('nationality', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('nationality') ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select nationality</option>
            <option value="Egyptian">Egyptian</option>
            <option value="Other">Other</option>
          </select>
          {getFieldError('nationality') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('nationality')}</p>
          )}
        </div>
      </div>

      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={formData.email}
          disabled
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          placeholder="Your email address"
        />
        <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
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
    </div>
  );

  const renderAcademicInfo = () => (
    <div className="space-y-6 stagger-children">
      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          University *
        </label>
        <select
          value={formData.university}
          onChange={(e) => updateField('university', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
            getFieldError('university') ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Select university</option>
          {universities.map(uni => (
            <option key={uni} value={uni}>{uni}</option>
          ))}
        </select>
        {getFieldError('university') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('university')}</p>
        )}
      </div>

      {formData.university === 'Other' && (
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom University Name *
          </label>
          <input
            type="text"
            value={formData.customUniversity}
            onChange={(e) => updateField('customUniversity', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('customUniversity') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your university name"
          />
          {getFieldError('customUniversity') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('customUniversity')}</p>
          )}
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fade-in-blur">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Degree Level *
          </label>
          <select
            value={formData.degreeLevel}
            onChange={(e) => updateField('degreeLevel', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
              getFieldError('degreeLevel') ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select degree level</option>
            <option value="student">Student</option>
            <option value="graduate">Graduate</option>
          </select>
          {getFieldError('degreeLevel') && (
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('degreeLevel')}</p>
          )}
        </div>

        {formData.degreeLevel === 'student' && (
          <div className="fade-in-blur">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Year *
            </label>
            <select
              value={formData.classYear}
              onChange={(e) => updateField('classYear', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
                getFieldError('classYear') ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select class year</option>
              {CLASS_YEARS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {getFieldError('classYear') && (
              <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('classYear')}</p>
            )}
          </div>
        )}
      </div>

      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Program/Major *
        </label>
        <input
          type="text"
          value={formData.program}
          onChange={(e) => updateField('program', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
            getFieldError('program') ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter your program or major"
        />
        {getFieldError('program') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('program')}</p>
        )}
      </div>
    </div>
  );

  const renderEventInfo = () => (
    <div className="space-y-6 stagger-children">
      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How did you hear about this event? *
        </label>
        <select
          value={formData.howDidYouHear}
          onChange={(e) => updateField('howDidYouHear', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
            getFieldError('howDidYouHear') ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">Select an option</option>
          {HOW_DID_YOU_HEAR_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {getFieldError('howDidYouHear') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('howDidYouHear')}</p>
        )}
      </div>
  
      <div className="fade-in-blur">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Volunteer ID (Optional)
        </label>
        <input
          type="text"
          value={formData.volunteerId}
          onChange={(e) => updateField('volunteerId', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 ${
            getFieldError('volunteerId') ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter volunteer ID (if applicable)"
        />
        {getFieldError('volunteerId') && (
          <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('volunteerId')}</p>
        )}
      </div>
  
      <div className="space-y-4 fade-in-blur">
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
            <p className="mt-1 text-sm text-red-600 fade-in-blur">{getFieldError('universityId')}</p>
          )}
        </div>
  
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CV/Resume (Optional)
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
            required={false}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> University ID is required. CV/Resume is optional and can be uploaded later if needed.
              </p>
            </div>
          </div>
        </div>
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
      default:
        return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sectionChangeTimeoutRef.current) {
        clearTimeout(sectionChangeTimeoutRef.current);
      }
    };
  }, []);

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

  return (
    <div className="min-h-screen relative">
      {errorPopup && (
        <ErrorPopup 
          message={errorPopup.message} 
          type={errorPopup.type}
          onClose={closeErrorPopup}
        />
      )}

      <AuthTransition 
        isLoading={showAuthTransition}
        message="Completing your profile..."
      />

      {/* Logout Button */}
      <LogoutButton />

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
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Complete Your Profile</h1>
            <p className="text-white drop-shadow">Finish setting up your attendee account</p>
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
              <div key={section.id} className="text-xs text-center" style={{ width: '120px' }}>
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

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100 fade-in-up-blur modal-content-blur max-w-4xl mx-auto">
          <div className="mb-8 fade-in-blur">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {sections[currentSection - 1].title}
            </h2>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(currentSection / 3) * 100}%` }}
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
              disabled={currentSection === 1 || loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                currentSection === 1 || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 smooth-hover transform hover:scale-105'
              }`}
            >
              Previous
            </button>

            {currentSection < 3 ? (
              <button
                type="button"
                onClick={nextSection}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 flex items-center smooth-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
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