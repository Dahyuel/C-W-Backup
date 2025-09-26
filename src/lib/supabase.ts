// src/lib/supabase.ts - Fixed with proper signUpVolunteer implementation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl ='';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaXdmZWR0dmdtYXpxY3dvbGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDYxMDIsImV4cCI6MjA3NDIyMjEwMn0.QnHPyeMBpezC-Q72fVDuRPdM5dkSYqoHC3uY_Dgsuxs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate QR code for user
const generateQRCode = (userId: string): string => {
  return `CW2024_${userId.slice(0, 8)}_${Date.now().toString(36)}`;
};

// Sign up regular attendee
export const signUpUser = async (email: string, password: string, profileData: any) => {
  try {
    console.log('🔄 Starting attendee registration...');

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error('❌ Auth signup error:', authError);
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'User creation failed' } };
    }

    console.log('✅ Auth user created, creating profile...');

    // Create profile with attendee role
    const { error: profileError } = await supabase
      .from('users_profiles')
      .insert({
        id: authData.user.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: email.trim().toLowerCase(),
        phone: profileData.phone,
        personal_id: profileData.personal_id,
        faculty: profileData.faculty,
        university: profileData.university || null,
        gender: profileData.gender || null,
        nationality: profileData.nationality || null,
        degree_level: profileData.degree_level || null,
        program: profileData.program || null,
        class: profileData.class_year || null,
        how_did_hear_about_event: profileData.how_did_you_hear || null,
        volunteer_id: profileData.volunteer_id || null,
        role: 'attendee', // Always attendee for regular signup
        qr_code: generateQRCode(authData.user.id),
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return { data: null, error: profileError };
    }

    console.log('✅ Attendee registration completed successfully');
    return { data: authData, error: null };

  } catch (error: any) {
    console.error('❌ Registration exception:', error);
    return { data: null, error: { message: error.message || 'Registration failed' } };
  }
};

// Sign up volunteer with specific role
export const signUpVolunteer = async (email: string, password: string, profileData: any) => {
  try {
    console.log('🔄 Starting volunteer registration...');

    // Validate role
    const validRoles = ['registration', 'building', 'info_desk', 'volunteer', 'team_leader'];
    if (!profileData.role || !validRoles.includes(profileData.role)) {
      return { data: null, error: { message: 'Invalid volunteer role specified' } };
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error('❌ Volunteer auth signup error:', authError);
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'User creation failed' } };
    }

    console.log('✅ Auth user created, creating volunteer profile...');

    // Create profile with specified volunteer role
    const { error: profileError } = await supabase
      .from('users_profiles')
      .insert({
        id: authData.user.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: email.trim().toLowerCase(),
        phone: profileData.phone,
        personal_id: profileData.personal_id,
        faculty: profileData.faculty,
        role: profileData.role, // Use the specified volunteer role
        qr_code: generateQRCode(authData.user.id),
        score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Volunteer profile creation error:', profileError);
      
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return { data: null, error: profileError };
    }

    console.log('✅ Volunteer registration completed successfully');
    return { data: authData, error: null };

  } catch (error: any) {
    console.error('❌ Volunteer registration exception:', error);
    return { data: null, error: { message: error.message || 'Volunteer registration failed' } };
  }
};

// Sign in user
export const signInUser = async (email: string, password: string) => {
  try {
    console.log('🔄 Attempting sign in...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.error('❌ Sign in error:', error);
      return { data: null, error };
    }

    console.log('✅ Sign in successful');
    return { data, error: null };

  } catch (error: any) {
    console.error('❌ Sign in exception:', error);
    return { data: null, error: { message: error.message || 'Sign in failed' } };
  }
};

// Validate registration data
export const validateRegistrationData = async (
  email: string,
  personalId: string,
  volunteerId?: string
): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Check if email already exists
    const { data: emailCheck } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (emailCheck) {
      errors.push('Email address is already registered');
    }

    // Check if personal ID already exists
    const { data: personalIdCheck } = await supabase
      .from('users_profiles')
      .select('id')
      .eq('personal_id', personalId.trim())
      .single();

    if (personalIdCheck) {
      errors.push('Personal ID is already registered');
    }

    // Check volunteer ID if provided
    if (volunteerId) {
      const { data: volunteerIdCheck } = await supabase
        .from('users_profiles')
        .select('id')
        .eq('volunteer_id', volunteerId.trim())
        .single();

      if (volunteerIdCheck) {
        errors.push('Volunteer ID is already used');
      }
    }

  } catch (error) {
    console.error('Validation error:', error);
    errors.push('Unable to validate registration data');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Upload file (placeholder for file upload functionality)
export const uploadFile = async (file: File, bucket: string, path: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};

// Update user files
export const updateUserFiles = async (userId: string, files: any) => {
  try {
    const { error } = await supabase
      .from('users_profiles')
      .update({
        university_id_path: files.universityId || null,
        cv_path: files.resume || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return { error };
  } catch (error: any) {
    return { error };
  }
};

export default supabase;