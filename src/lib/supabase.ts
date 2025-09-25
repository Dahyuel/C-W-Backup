// lib/supabase.ts - Fixed to match your actual database schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypiwfedtvgmazqcwolac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaXdmZWR0dmdtYXpxY3dvbGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDYxMDIsImV4cCI6MjA3NDIyMjEwMn0.QnHPyeMBpezC-Q72fVDuRPdM5dkSYqoHC3uY_Dgsuxs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if personal ID is unique
export const checkPersonalIdUnique = async (personalId: string) => {
  const { data, error } = await supabase
    .from('users_profiles')
    .select('personal_id')
    .eq('personal_id', personalId)
    .limit(1);
  
  if (error) {
    console.error('Error checking personal ID:', error);
    return { isUnique: false, error: error.message };
  }
  
  return { isUnique: data.length === 0, error: null };
};

// Validate volunteer ID exists and belongs to volunteer
export const validateVolunteerIdExists = async (volunteerId: string) => {
  if (!volunteerId) return { isValid: true, error: null };
  
  const { data, error } = await supabase
    .from('users_profiles')
    .select('personal_id, role')
    .eq('personal_id', volunteerId)
    .eq('role', 'volunteer')
    .limit(1);
  
  if (error) {
    console.error('Error validating volunteer ID:', error);
    return { isValid: false, error: error.message };
  }
  
  return { 
    isValid: data.length > 0, 
    error: data.length === 0 ? 'Volunteer ID not found or not a volunteer' : null 
  };
};

// Enhanced sign up function with proper schema mapping
export const signUpUser = async (email: string, password: string, userData: any) => {
  try {
    // Validate personal ID is unique
    const { isUnique, error: uniqueError } = await checkPersonalIdUnique(userData.personal_id);
    if (!isUnique) {
      return { 
        data: null, 
        error: { message: uniqueError || 'This Personal ID is already registered.' }
      };
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'Failed to create user account' } };
    }

    // Create complete profile
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .insert({
        id: authData.user.id,
        ...userData,
        role: 'attendee',
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (profileError) {
      return { data: null, error: profileError };
    }

    return { data: authData, error: null };

  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

// Sign in with email
export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Reset password function
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  return { data, error };
};

// Reset password with personal ID validation
export const resetPasswordWithPersonalId = async (personalId: string, email: string) => {
  try {
    // Verify personal ID exists and get associated user email for verification
    const { data: profileData, error: profileError } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('personal_id', personalId)
      .limit(1);

    if (profileError || !profileData || profileData.length === 0) {
      return { 
        data: null, 
        error: { message: 'Personal ID not found' }
      };
    }

    // Send reset email
    const { data, error } = await resetPassword(email);
    return { data, error };

  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Password reset failed' } };
  }
};

// Upload file to storage
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

    // Get public URL
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

// Update user profile with file paths
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