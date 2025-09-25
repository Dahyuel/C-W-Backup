// types.ts - Fixed interface definitions

export interface RegistrationData {
  // Personal Information
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | '';
  nationality: 'Egyptian' | 'Other' | '';
  email: string;
  phone: string;
  personalId: string;
  
  // Academic Information
  university: string;
  customUniversity?: string;
  faculty: string;
  degreeLevel: 'Student' | 'Graduate' | '';
  program: string;
  classYear?: string;
  
  // Event & Volunteer Information
  howDidYouHear: string;
  volunteerId?: string;
  
  // Account Security
  password: string;
  confirmPassword: string;
}

// Fixed: LoginData should use email, not personalId based on your LoginForm
export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  personalId: string;
  email: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FileUpload {
  universityId?: File;
  resume?: File;
}