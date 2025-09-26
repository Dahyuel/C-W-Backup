// lib/supabase.ts - Enhanced with email column and proper validation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypiwfedtvgmazqcwolac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaXdmZWR0dmdtYXpxY3dvbGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDYxMDIsImV4cCI6MjA3NDIyMjEwMn0.QnHPyeMBpezC-Q72fVDuRPdM5dkSYqoHC3uY_Dgsuxs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// Check if user exists by personal ID or email
export const checkUserExists = async (personalId: string, email: string): Promise<{exists: boolean, byPersonalId: boolean, byEmail: boolean}> => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('personal_id, email')
      .or(`personal_id.eq.${personalId.trim()},email.eq.${email.trim().toLowerCase()}`)
      .limit(1);
    
    if (error) {
      console.error('Error checking user existence:', error);
      return { exists: false, byPersonalId: false, byEmail: false };
    }
    
    if (data && data.length > 0) {
      const user = data[0];
      return {
        exists: true,
        byPersonalId: user.personal_id === personalId.trim(),
        byEmail: user.email === email.trim().toLowerCase()
      };
    }
    
    return { exists: false, byPersonalId: false, byEmail: false };
  } catch (error: any) {
    console.error('User existence check error:', error);
    return { exists: false, byPersonalId: false, byEmail: false };
  }
};

// Check if personal ID is unique
export const checkPersonalIdUnique = async (personalId: string): Promise<ValidationResult> => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('personal_id')
      .eq('personal_id', personalId.trim())
      .limit(1);
    
    if (error) {
      return { isValid: false, error: 'Database error while checking Personal ID' };
    }
    
    const isUnique = !data || data.length === 0;
    return { 
      isValid: isUnique, 
      error: isUnique ? null : 'This Personal ID is already registered' 
    };
  } catch (error: any) {
    return { isValid: false, error: 'Failed to validate Personal ID' };
  }
};

// Check if email is unique in users_profiles
export const checkEmailUnique = async (email: string): Promise<ValidationResult> => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .limit(1);
    
    if (error) {
      return { isValid: false, error: 'Database error while checking email' };
    }
    
    const isUnique = !data || data.length === 0;
    return { 
      isValid: isUnique, 
      error: isUnique ? null : 'This email is already registered' 
    };
  } catch (error: any) {
    return { isValid: false, error: 'Failed to validate email address' };
  }
};

// Check if volunteer ID exists and is actually a volunteer
export const checkVolunteerIdExists = async (volunteerId: string): Promise<ValidationResult> => {
  if (!volunteerId || !volunteerId.trim()) {
    return { isValid: true, error: null };
  }
  
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('personal_id, role')
      .eq('personal_id', volunteerId.trim())
      .limit(1);
    
    if (error) {
      return { isValid: false, error: 'Database error while checking Volunteer ID' };
    }
    
    if (!data || data.length === 0) {
      return { 
        isValid: false, 
        error: 'Volunteer ID not found. Please check the ID and try again.' 
      };
    }
    
    const user = data[0];
    if (user.role === 'attendee') {
      return { 
        isValid: false, 
        error: 'The provided ID belongs to an attendee, not a volunteer.' 
      };
    }
    
    return { isValid: true, error: null };
  } catch (error: any) {
    return { isValid: false, error: 'Failed to validate Volunteer ID' };
  }
};

// Enhanced registration validation
export const validateRegistrationData = async (
  email: string,
  personalId: string,
  volunteerId?: string
): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    // Check if user already exists
    const userExists = await checkUserExists(personalId, email);
    if (userExists.exists) {
      if (userExists.byPersonalId) {
        errors.push('This Personal ID is already registered');
      }
      if (userExists.byEmail) {
        errors.push('This email is already registered');
      }
    }

    // Only validate volunteer ID if provided
    if (volunteerId && volunteerId.trim()) {
      const volunteerIdCheck = await checkVolunteerIdExists(volunteerId);
      if (!volunteerIdCheck.isValid && volunteerIdCheck.error) {
        errors.push(volunteerIdCheck.error);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: ['An unexpected error occurred during validation. Please try again.']
    };
  }
};

// Enhanced sign up function with proper user existence check
export const signUpUser = async (email: string, password: string, userData: any) => {
  try {
    console.log('Starting attendee registration...');
    
    // STEP 1: Check if user already exists
    const userExists = await checkUserExists(userData.personal_id, email);
    if (userExists.exists) {
      const errors: string[] = [];
      if (userExists.byPersonalId) {
        errors.push('Personal ID already registered');
      }
      if (userExists.byEmail) {
        errors.push('Email already registered');
      }
      return { 
        data: null, 
        error: { 
          message: errors.join('. '),
          validationErrors: errors
        }
      };
    }

    console.log('User does not exist, creating auth user...');
    
    // STEP 2: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'Failed to create user account' } };
    }

    console.log('Auth user created, creating profile...');

    // STEP 3: Create profile with email
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(), // Add email to profile
        ...userData,
        role: 'attendee',
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Clean up auth user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return { data: null, error: profileError };
    }

    console.log('Attendee registration completed successfully');
    return { data: authData, error: null };

  } catch (error: any) {
    console.error('Registration error:', error);
    return { data: null, error: { message: error.message || 'Registration failed' } };
  }
};

// Enhanced volunteer sign up
export const signUpVolunteer = async (email: string, password: string, userData: any) => {
  try {
    console.log('Starting volunteer registration...');
    
    // STEP 1: Check if user already exists
    const userExists = await checkUserExists(userData.personal_id, email);
    if (userExists.exists) {
      const errors: string[] = [];
      if (userExists.byPersonalId) {
        errors.push('Personal ID already registered');
      }
      if (userExists.byEmail) {
        errors.push('Email already registered');
      }
      return { 
        data: null, 
        error: { 
          message: errors.join('. '),
          validationErrors: errors
        }
      };
    }

    console.log('User does not exist, creating volunteer auth user...');

    // STEP 2: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'Failed to create volunteer account' } };
    }

    console.log('Auth user created, creating volunteer profile...');

    // STEP 3: Create volunteer profile with email
    const { data: profileData, error: profileError } = await supabase
      .from("users_profiles")
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(), // Add email to profile
        ...userData,
        role: userData.role || 'volunteer',
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (profileError) {
      console.error('Volunteer profile creation error:', profileError);
      
      // Clean up auth user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return { data: null, error: profileError };
    }

    console.log('Volunteer registration completed successfully');
    return { data: authData, error: null };

  } catch (error: any) {
    console.error('Volunteer registration error:', error);
    return { data: null, error: { message: error.message || 'Volunteer registration failed' } };
  }
};

// Keep existing functions for backward compatibility
export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`
  });
  return { data, error };
};

export const resetPasswordWithPersonalId = async (personalId: string, email: string) => {
  try {
    // Verify personal ID exists
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('personal_id', personalId.trim())
      .limit(1);

    if (profileError || !profileData || profileData.length === 0) {
      return { 
        data: null, 
        error: { message: 'Personal ID not found' }
      };
    }

    const { data, error } = await resetPassword(email);
    return { data, error };

  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Password reset failed' } };
  }
};

export const uploadFile = async (bucket: string, userId: string, file: File) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log(`Uploading file to ${bucket}/${filePath}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) {
      console.error('File upload error:', error);
      return { data: null, error };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', urlData.publicUrl);

    return { 
      data: { 
        path: filePath, 
        url: urlData.publicUrl 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const updateUserFiles = async (userId: string, filePaths: { university_id_path?: string, cv_path?: string }) => {
  try {
    console.log('Updating user files:', filePaths);
    
    const { data, error } = await supabase
      .from('users_profiles')
      .update(filePaths)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Profile update error:', error);
    } else {
      console.log('Profile updated successfully');
    }

    return { data, error };
  } catch (error: any) {
    console.error('Update error:', error);
    return { data: null, error: { message: error.message } };
  }
};