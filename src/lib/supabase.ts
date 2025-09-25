// lib/supabase.ts - Enhanced validation functions
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypiwfedtvgmazqcwolac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaXdmZWR0dmdtYXpxY3dvbGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDYxMDIsImV4cCI6MjA3NDIyMjEwMn0.QnHPyeMBpezC-Q72fVDuRPdM5dkSYqoHC3uY_Dgsuxs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced validation interface
interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// Check if personal ID is unique in users_profiles
export const checkPersonalIdUnique = async (personalId: string): Promise<ValidationResult> => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('personal_id')
      .eq('personal_id', personalId.trim())
      .limit(1);
    
    if (error) {
      console.error('Error checking personal ID:', error);
      return { isValid: false, error: 'Database error while checking Personal ID' };
    }
    
    const isUnique = data.length === 0;
    return { 
      isValid: isUnique, 
      error: isUnique ? null : 'This Personal ID is already registered' 
    };
  } catch (error: any) {
    console.error('Personal ID check error:', error);
    return { isValid: false, error: 'Failed to validate Personal ID' };
  }
};

// Check if email is unique - simplified approach
export const checkEmailUnique = async (email: string): Promise<ValidationResult> => {
  try {
    // Instead of trying to validate auth.users directly, we'll rely on 
    // the actual signup process to handle email validation
    // This function will always return true for client-side validation
    // The real validation happens in the signUp process
    return { isValid: true, error: null };
  } catch (error: any) {
    console.error('Email validation error:', error);
    return { isValid: false, error: 'Failed to validate email address' };
  }
};

// Check if volunteer ID exists in users_profiles (personal_id column)
export const checkVolunteerIdExists = async (volunteerId: string): Promise<ValidationResult> => {
  if (!volunteerId || !volunteerId.trim()) {
    return { isValid: true, error: null }; // Optional field
  }
  
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('personal_id, role')
      .eq('personal_id', volunteerId.trim())
      .limit(1);
    
    if (error) {
      console.error('Error checking volunteer ID:', error);
      return { isValid: false, error: 'Database error while checking Volunteer ID' };
    }
    
    if (data.length === 0) {
      return { 
        isValid: false, 
        error: 'Volunteer ID not found. Please check the ID and try again.' 
      };
    }
    
    // Check if the found user is actually a volunteer
    const user = data[0];
    if (user.role !== 'volunteer') {
      return { 
        isValid: false, 
        error: 'The provided ID does not belong to a volunteer.' 
      };
    }
    
    return { isValid: true, error: null };
  } catch (error: any) {
    console.error('Volunteer ID validation error:', error);
    return { isValid: false, error: 'Failed to validate Volunteer ID' };
  }
};

// Comprehensive registration validation - now only validates personal ID and volunteer ID
export const validateRegistrationData = async (
  email: string,
  personalId: string,
  volunteerId?: string
): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    // Only validate personal ID and volunteer ID (email validation happens during signup)
    const [personalIdCheck, volunteerIdCheck] = await Promise.all([
      checkPersonalIdUnique(personalId),
      volunteerId ? checkVolunteerIdExists(volunteerId) : Promise.resolve({ isValid: true, error: null })
    ]);
    
    // Collect errors
    if (!personalIdCheck.isValid && personalIdCheck.error) {
      errors.push(personalIdCheck.error);
    }
    
    if (!volunteerIdCheck.isValid && volunteerIdCheck.error) {
      errors.push(volunteerIdCheck.error);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error: any) {
    console.error('Registration validation error:', error);
    return {
      isValid: false,
      errors: ['An unexpected error occurred during validation. Please try again.']
    };
  }
};

// Enhanced sign up function with proper validation order
export const signUpUser = async (email: string, password: string, userData: any) => {
  try {
    console.log('Starting registration validation...');
    
    // STEP 1: Pre-validate personal ID and volunteer ID (but not email)
    const personalIdCheck = await checkPersonalIdUnique(userData.personal_id);
    const volunteerIdCheck = userData.volunteer_id ? 
      await checkVolunteerIdExists(userData.volunteer_id) : 
      { isValid: true, error: null };
    
    const errors: string[] = [];
    
    if (!personalIdCheck.isValid && personalIdCheck.error) {
      errors.push(personalIdCheck.error);
    }
    
    if (!volunteerIdCheck.isValid && volunteerIdCheck.error) {
      errors.push(volunteerIdCheck.error);
    }
    
    // If personal ID or volunteer ID validation fails, stop here
    if (errors.length > 0) {
      console.log('Pre-validation failed:', errors);
      return { 
        data: null, 
        error: { 
          message: errors.join('. '),
          validationErrors: errors
        }
      };
    }
    
    console.log('Pre-validation passed, creating auth user...');
    
    // STEP 2: Create auth user (this will validate email uniqueness)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      // Return the auth error (which includes email already exists errors)
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'Failed to create user account' } };
    }

    console.log('Auth user created successfully, creating profile...');

    // STEP 3: Create or update profile in users_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .upsert({
        id: authData.user.id,  // Insert or update based on the auth user ID
        ...userData,
        role: 'attendee', // Default role (you can adjust based on business logic)
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Clean up the auth user if profile creation fails
      try {
        console.log('Cleaning up auth user due to profile creation failure...');
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('Auth user cleaned up successfully');
      } catch (cleanupError) {
        console.error('CRITICAL: Failed to cleanup auth user:', cleanupError);
      }
      
      return { 
        data: null, 
        error: { message: 'Registration failed. Please try again.' } 
      };
    }

    console.log('Registration completed successfully');
    return { data: authData, error: null };

  } catch (error: any) {
    console.error('Registration error:', error);
    return { data: null, error: { message: error.message || 'Registration failed' } };
  }
};




// Enhanced sign up volunteer function with pre-validation
export const signUpVolunteer = async (email: string, password: string, userData: any) => {
  try {
    console.log('Starting volunteer registration validation...');
    
    // Pre-validate data (volunteers don't need volunteer_id validation)
    const validation = await validateRegistrationData(
      email,
      userData.personal_id
    );
    
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      return { 
        data: null, 
        error: { 
          message: validation.errors.join('. '),
          validationErrors: validation.errors
        }
      };
    }
    
    console.log('✅ All validations passed, proceeding with volunteer registration...');

    // Create auth user
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

    console.log('✅ Auth user created, creating volunteer profile...');

    // Create complete profile with volunteer role
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .insert({
        id: authData.user.id,
        ...userData,
        role: 'volunteer',
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (profileError) {
      console.error('Volunteer profile creation error:', profileError);
      
      // Clean up auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('Cleaned up auth user due to profile creation failure');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return { data: null, error: profileError };
    }

    console.log('✅ Volunteer registration completed successfully');
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