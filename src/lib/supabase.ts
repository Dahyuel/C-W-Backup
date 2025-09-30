// lib/supabase.ts - Enhanced with UUID search support, dynamic attendee search, and session booking
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypiwfedtvgmazqcwolac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaXdmZWR0dmdtYXpxY3dvbGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDYxMDIsImV4cCI6MjA3NDIyMjEwMn0.QnHPyeMBpezC-Q72fVDuRPdM5dkSYqoHC3uY_Dgsuxs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export const isValidEnumValue = <T extends readonly string[]>(
  value: string, 
  enumArray: T
): value is T[number] => {
  return enumArray.includes(value as T[number]);
};

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
    const { data, error } = await supabase.rpc('check_personal_id_exists', {
      p_personal_id: personalId.trim()
    });

    if (error) {
      console.error('Personal ID check error:', error);
      return { isValid: false, error: 'Failed to validate Personal ID' };
    }

    return {
      isValid: !data.exists,
      error: data.error
    };
  } catch (error: any) {
    console.error('Personal ID check exception:', error);
    return { isValid: false, error: 'Failed to validate Personal ID' };
  }
};
// Check if email is unique in users_profiles
export const checkEmailUnique = async (email: string): Promise<ValidationResult> => {
  try {
    const { data, error } = await supabase.rpc('check_email_exists', {
      p_email: email.trim().toLowerCase()
    });

    if (error) {
      console.error('Email check error:', error);
      return { isValid: false, error: 'Failed to validate email' };
    }

    return {
      isValid: !data.exists,
      error: data.error
    };
  } catch (error: any) {
    console.error('Email check exception:', error);
    return { isValid: false, error: 'Failed to validate email' };
  }
};
export const checkVolunteerIdExists = async (volunteerId: string): Promise<ValidationResult> => {
  if (!volunteerId || !volunteerId.trim()) {
    return { isValid: true, error: null };
  }

  try {
    const { data, error } = await supabase.rpc('validate_volunteer_id', {
      p_volunteer_id: volunteerId.trim()
    });

    if (error) {
      console.error('Volunteer ID check error:', error);
      return { isValid: false, error: 'Failed to validate Volunteer ID' };
    }

    return {
      isValid: data.is_valid,
      error: data.error
    };
  } catch (error: any) {
    console.error('Volunteer ID check exception:', error);
    return { isValid: false, error: 'Failed to validate Volunteer ID' };
  }
};

// Enhanced error handling for validation
export const validateRegistrationData = async (
  email: string,
  personalId: string,
  volunteerId?: string,
  phone?: string
): Promise<{ isValid: boolean; errors: string[]; volunteerInfo?: any }> => {
  const errors: string[] = [];

  // Basic email validation
  if (!email || !email.includes('@')) {
    errors.push('Valid email is required');
  }

  // Personal ID validation (14 digits)
  if (!personalId || !/^\d{14}$/.test(personalId.trim())) {
    errors.push('Personal ID must be exactly 14 digits');
  }

  // Phone validation if provided
  if (phone && !/^(010|011|012|015)\d{8}$/.test(phone.trim())) {
    errors.push('Phone number must be valid Egyptian format (01X-XXXXXXXX)');
  }

  // Check for existing users
  const userExists = await checkUserExists(personalId, email);
  if (userExists.exists) {
    if (userExists.byPersonalId) errors.push('Personal ID already registered');
    if (userExists.byEmail) errors.push('Email already registered');
  }

  // Validate volunteer ID if provided
  let volunteerInfo = null;
  if (volunteerId && volunteerId.trim()) {
    const volunteerValidation = await checkVolunteerIdExists(volunteerId);
    if (!volunteerValidation.isValid && volunteerValidation.error) {
      errors.push(volunteerValidation.error);
    } else if (volunteerValidation.isValid) {
      const { data: volunteer } = await getVolunteerByVolunteerId(volunteerId);
      volunteerInfo = volunteer;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    volunteerInfo
  };
};

export const getVolunteerByVolunteerId = async (volunteerId: string) => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        volunteer_id
      `)
      .eq('volunteer_id', volunteerId.trim())
      .neq('role', 'attendee')
      .single();

    if (error) {
      console.error('Get volunteer error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Get volunteer exception:', error);
    return { data: null, error: { message: error.message } };
  }
};


// Replace validateRegistrationWithVolunteer with this:

export const validateRegistrationWithEdgeFunction = async (
  personalId: string,
  email: string,
  firstName: string,
  lastName: string,
  volunteerId?: string,
  phone?: string,
  userType: 'attendee' | 'volunteer' = 'attendee',
  role?: string,
  gender?: string,
  tl_team?: string  // Add this parameter
): Promise<{ 
  isValid: boolean; 
  errors: string[]; 
  volunteerInfo?: any;
  volunteerUuid?: string;
  warnings?: string[];
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/validate-registration`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email?.trim().toLowerCase(),
        personalId: personalId?.trim(),
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        volunteerId: volunteerId?.trim() || null,
        phone: phone?.trim() || null,
        userType,
        role: role || null,
        gender: gender || null,
        tl_team: tl_team || null  // Add this to request body
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function validation error:', response.status, errorText);
      throw new Error(`Validation service error: ${response.status}`);
    }

    const validation = await response.json();
    return validation;

  } catch (error: any) {
    console.error('Edge function validation error:', error);
    return {
      isValid: false,
      errors: ['Validation failed. Please try again.'],
      warnings: []
    };
  }
};

// Updated signUpUser function using the same successful approach as volunteer registration
// CORRECTED signUpUser function using RPC for proper enum handling


// In your supabase.ts file, replace the signUpUser function with this simplified version:

// Updated signUpUser function using Edge Function validation
export const signUpUser = async (email: string, password: string, userData: any) => {
  try {
    console.log('Starting attendee registration with edge function validation...');
    
    // STEP 1: Use Edge Function for comprehensive validation
    const validation = await validateRegistrationWithEdgeFunction(
      userData.personal_id,
      email,
      userData.first_name,
      userData.last_name,
      userData.volunteer_id,
      userData.phone,
      'attendee'
    );

    if (!validation.isValid) {
      return { 
        data: null, 
        error: { 
          message: validation.errors.join('. '),
          validationErrors: validation.errors
        }
      };
    }

    console.log('Edge function validation passed, creating auth user...');

    // STEP 2: Create auth user (validation already done by Edge Function)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'Failed to create attendee account' } };
    }

    console.log('Auth user created successfully:', authData.user.id);

    // STEP 3: Create profile (should succeed since validation passed)
    try {
      // Small delay to ensure auth user is committed
      await new Promise(resolve => setTimeout(resolve, 500));

      const profileData = {
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        first_name: userData.first_name?.trim() || '',
        last_name: userData.last_name?.trim() || '',
        personal_id: userData.personal_id?.trim(),
        university: userData.university?.trim() || '',
        faculty: userData.faculty?.trim() || '',
        program: userData.program?.trim() || '',
        nationality: userData.nationality?.trim() || '',
        phone: userData.phone?.trim() || null,
        reg_id: validation.volunteerUuid || null,
        volunteer_id: null, // Always null for attendees
        role: 'attendee',
        gender: userData.gender?.toLowerCase() === 'male' ? 'male' : 
                userData.gender?.toLowerCase() === 'female' ? 'female' : null,
        degree_level: userData.degree_level?.toLowerCase() === 'student' ? 'student' :
                      userData.degree_level?.toLowerCase() === 'graduate' ? 'graduate' : null,
        class: ['1', '2', '3', '4', '5'].includes(userData.class?.toString()) ? userData.class?.toString() : null,
        how_did_hear_about_event: ['linkedin', 'facebook', 'instagram', 'friends', 'banners_in_street', 'information_session_at_faculty', 'campus_marketing', 'other'].includes(userData.how_did_hear_about_event?.toLowerCase()) ? userData.how_did_hear_about_event?.toLowerCase() : null,
        university_id_path: userData.university_id_path || null,
        cv_path: userData.cv_path || null,
        score: 0,
        building_entry: false,
        event_entry: false
      };

      const { data: insertedProfile, error: profileError } = await supabase
        .from('users_profiles')
        .insert([profileData])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation failed despite validation:', profileError);
        console.error(`ORPHANED AUTH USER: ${authData.user.id} (${email})`);
        
        return { 
          data: null, 
          error: { message: 'Profile creation failed unexpectedly. Please contact support.' }
        };
      }

      console.log('Attendee profile created successfully:', insertedProfile.id);
      return { 
        data: { 
          ...authData, 
          profile: insertedProfile,
          referredBy: validation.volunteerInfo
        }, 
        error: null 
      };

    } catch (profileError: any) {
      console.error('Profile creation exception:', profileError);
      console.error(`ORPHANED AUTH USER: ${authData.user.id} (${email})`);
      return { data: null, error: { message: 'Registration failed during profile creation' } };
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    return { data: null, error: { message: error.message || 'Registration failed' } };
  }
};

// Updated signUpVolunteer function using Edge Function validation

export const signUpVolunteer = async (email: string, password: string, userData: any) => {
  try {
    console.log('Starting volunteer registration with edge function validation...');
    
    // STEP 1: Use Edge Function for comprehensive validation with gender and tl_team
    const validation = await validateRegistrationWithEdgeFunction(
      userData.personal_id,
      email,
      userData.first_name,
      userData.last_name,
      null, // No volunteer ID needed for volunteer signup
      userData.phone,
      'volunteer',
      userData.role,
      userData.gender,
      userData.tl_team  // Add this parameter
    );

    if (!validation.isValid) {
      return { 
        data: null, 
        error: { 
          message: validation.errors.join('. '),
          validationErrors: validation.errors
        }
      };
    }

    console.log('Edge function validation passed, creating volunteer auth user...');

    // STEP 2: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData.user) {
      return { data: null, error: { message: 'Failed to create volunteer account' } };
    }

    console.log('Volunteer auth user created successfully:', authData.user.id);

    // STEP 3: Generate volunteer ID and create profile
    try {
      const volunteerId = await generateVolunteerId(userData.role || 'volunteer');
      
      // Small delay for auth user commitment
      await new Promise(resolve => setTimeout(resolve, 500));

      const profileData = {
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        volunteer_id: volunteerId,
        first_name: userData.first_name?.trim() || '',
        last_name: userData.last_name?.trim() || '',
        personal_id: userData.personal_id?.trim(),
        faculty: userData.faculty?.trim() || '',
        phone: userData.phone?.trim() || null,
        university: 'Ain Shams University',
        role: userData.role || 'volunteer',
        gender: userData.gender?.toLowerCase() === 'male' ? 'male' : 
                userData.gender?.toLowerCase() === 'female' ? 'female' : null,
        tl_team: userData.tl_team || null,  // Make sure this is included
        score: 0,
        building_entry: false,
        event_entry: false
      };

      const { data: insertedProfile, error: profileError } = await supabase
        .from('users_profiles')
        .insert([profileData])
        .select()
        .single();

      if (profileError) {
        console.error('Volunteer profile creation failed despite validation:', profileError);
        console.error(`ORPHANED AUTH USER: ${authData.user.id} (${email})`);
        
        return { 
          data: null, 
          error: { message: 'Profile creation failed unexpectedly. Please contact support.' }
        };
      }

      console.log('Volunteer registration completed successfully with ID:', volunteerId);
      console.log('Team leader team assignment:', userData.tl_team);
      
      return { 
        data: { 
          ...authData, 
          volunteerId, 
          profile: insertedProfile 
        }, 
        error: null 
      };

    } catch (profileError: any) {
      console.error('Volunteer profile creation exception:', profileError);
      console.error(`ORPHANED AUTH USER: ${authData.user.id} (${email})`);
      
      return { 
        data: null, 
        error: { message: 'Volunteer registration failed during profile creation' }
      };
    }

  } catch (error: any) {
    console.error('Volunteer registration error:', error);
    return { data: null, error: { message: error.message || 'Volunteer registration failed' } };
  }
};
const cleanupOrphanedAuthUser = async (userId: string, email: string) => {
  try {
    console.log('Attempting to clean up orphaned auth user:', email);
    
    // Try using an edge function for cleanup (requires admin privileges)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      const response = await fetch(`${supabaseUrl}/functions/v1/cleanup-auth-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email: email
        })
      });

      if (response.ok) {
        console.log('Successfully cleaned up orphaned auth user');
      } else {
        console.warn('Failed to clean up auth user via edge function');
      }
    }
  } catch (cleanupError) {
    console.warn('Auth user cleanup failed:', cleanupError);
    // Store the orphaned user info for manual cleanup later
    console.warn(`Orphaned auth user: ${userId} (${email}) - needs manual cleanup`);
  }
};

// Function to find and report orphaned users (for admin use)
export const findOrphanedUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('find_orphaned_auth_users');
    
    if (error) {
      console.error('Error finding orphaned users:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Find orphaned users exception:', error);
    return { data: [], error: { message: error.message } };
  }
};
// Function for admin to clean up orphaned users
export const cleanupOrphanedUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_orphaned_auth_users');
    
    if (error) {
      console.error('Error cleaning orphaned users:', error);
      return { data: [], error };
    }
    
    console.log(`Cleaned up ${data?.length || 0} orphaned users`);
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Cleanup orphaned users exception:', error);
    return { data: [], error: { message: error.message } };
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

export const uploadCompanyLogo = async (userId: string, file: File, companyName: string) => {
  try {
    if (!file) {
      return { data: null, error: { message: 'No logo file provided' } };
    }

    // Validate image file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { 
        data: null, 
        error: { message: 'Logo must be an image file (JPEG, PNG, GIF, or WebP)' } 
      };
    }

    // Check file size (5MB limit for logos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { data: null, error: { message: 'Logo file size must be less than 5MB' } };
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${Date.now()}-${sanitizedCompanyName}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    console.log(`Uploading company logo to Assets/${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("Assets")
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Company logo upload error:', uploadError);
      return { data: null, error: uploadError };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("Assets")
      .getPublicUrl(filePath);

    return { 
      data: { 
        path: filePath, 
        url: urlData.publicUrl,
        fileName: fileName
      }, 
      error: null 
    };

  } catch (error: any) {
    console.error('Company logo upload exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const uploadMapImage = async (dayNumber: number, imageFile: File, userId: string) => {
  try {
    if (!imageFile) {
      return { data: null, error: { message: 'No map image provided' } };
    }

    // Validate image file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return { 
        data: null, 
        error: { message: 'Map must be an image file (JPEG, PNG, GIF, or WebP)' } 
      };
    }

    // Check file size (10MB limit for maps)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return { data: null, error: { message: 'Map image must be less than 10MB' } };
    }

    if (dayNumber < 1 || dayNumber > 5) {
      return { data: null, error: { message: 'Day number must be between 1 and 5' } };
    }

    const fileName = `day${dayNumber}.png`; // Always use PNG for maps
    const filePath = `Maps/${fileName}`;

    console.log(`Uploading map image to Assets/${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("Assets")
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: true // Replace existing map for this day
      });

    if (uploadError) {
      console.error('Map upload error:', uploadError);
      return { data: null, error: uploadError };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("Assets")
      .getPublicUrl(filePath);

    return { 
      data: { 
        path: filePath, 
        url: urlData.publicUrl,
        fileName: fileName
      }, 
      error: null 
    };

  } catch (error: any) {
    console.error('Map upload exception:', error);
    return { data: null, error: { message: error.message } };
  }
};



export const uploadFile = async (bucket: string, userId: string, file: File) => {
  try {
    // Validate inputs
    if (!file) {
      return { data: null, error: { message: 'No file provided' } };
    }

    if (!bucket || !userId) {
      return { data: null, error: { message: 'Missing bucket or userId parameter' } };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { data: null, error: { message: 'File size exceeds 10MB limit' } };
    }

    // Validate file type based on bucket
    const bucketFileTypes = {
      'Assets': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      'cvs': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'university-ids': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    };

    const allowedTypes = bucketFileTypes[bucket] || ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        data: null, 
        error: { 
          message: `File type ${file.type} not allowed for ${bucket} bucket. Allowed types: ${allowedTypes.join(', ')}` 
        } 
      };
    }

    // Generate secure filename
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      return { data: null, error: { message: 'File must have a valid extension' } };
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log(`Uploading ${file.name} (${(file.size / 1024).toFixed(2)}KB) to ${bucket}/${filePath}`);

    // Upload with retry logic
    let uploadAttempt = 0;
    const maxRetries = 3;
    
    while (uploadAttempt < maxRetries) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false // Don't overwrite existing files
          });

        if (uploadError) {
          console.error(`Upload attempt ${uploadAttempt + 1} failed:`, uploadError);
          
          if (uploadError.message?.includes('already exists') || uploadError.statusCode === '409') {
            // File already exists, try with new filename
            const newFileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const newFilePath = `${userId}/${newFileName}`;
            
            const { data: retryData, error: retryError } = await supabase.storage
              .from(bucket)
              .upload(newFilePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (retryError) {
              throw retryError;
            }

            // Get public URL for successful retry upload
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(newFilePath);

            return { 
              data: { 
                path: newFilePath, 
                url: urlData.publicUrl,
                fileName: newFileName
              }, 
              error: null 
            };
          }
          
          throw uploadError;
        }

        // Successful upload - get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        console.log('File uploaded successfully:', urlData.publicUrl);

        return { 
          data: { 
            path: filePath, 
            url: urlData.publicUrl,
            fileName: fileName
          }, 
          error: null 
        };

      } catch (attemptError) {
        uploadAttempt++;
        console.error(`Upload attempt ${uploadAttempt} failed:`, attemptError);
        
        if (uploadAttempt >= maxRetries) {
          return { 
            data: null, 
            error: { 
              message: `Upload failed after ${maxRetries} attempts: ${attemptError.message}`,
              originalError: attemptError
            } 
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempt));
      }
    }

  } catch (error: any) {
    console.error('Upload function error:', error);
    return { 
      data: null, 
      error: { 
        message: `Upload failed: ${error.message}`,
        originalError: error
      } 
    };
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

export const processAttendance = async (personalId: string, action: 'enter' | 'exit') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/process-attendance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personal_id: personalId,
        action: action
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process attendance');
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Process attendance error:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Get attendee by personal ID (only attendees) - UPDATED for boolean fields
export const getAttendeeByPersonalId = async (personalId: string) => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        personal_id,
        role,
        university,
        faculty,
        building_entry,
        event_entry,
        created_at
      `)
      .eq('personal_id', personalId.trim())
      .eq('role', 'attendee') // Only get attendees
      .single();

    if (error) {
      console.error('Get attendee by Personal ID error:', error);
      return { data: null, error };
    }

    return { 
      data: {
        ...data,
        current_status: data.event_entry ? 'inside_event' : 'outside_event',
        building_status: data.building_entry ? 'inside_building' : 'outside_building'
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Get attendee by Personal ID exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Get attendee by UUID (for QR code scans) - only attendees - UPDATED for boolean fields
export const getAttendeeByUUID = async (uuid: string) => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        personal_id,
        role,
        university,
        faculty,
        building_entry,
        event_entry,
        created_at
      `)
      .eq('id', uuid.trim())
      .eq('role', 'attendee') // Only get attendees
      .single();

    if (error) {
      console.error('Get attendee by UUID error:', error);
      return { data: null, error };
    }

    return { 
      data: {
        ...data,
        current_status: data.event_entry ? 'inside_event' : 'outside_event',
        building_status: data.building_entry ? 'inside_building' : 'outside_building'
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Get attendee by UUID exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Dynamic search for attendees by partial Personal ID - UPDATED for boolean fields
export const searchAttendeesByPersonalId = async (partialPersonalId: string) => {
  try {
    if (!partialPersonalId || partialPersonalId.trim().length < 2) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('users_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        personal_id,
        role,
        university,
        faculty,
        building_entry,
        event_entry,
        created_at
      `)
      .eq('role', 'attendee') // Only search attendees
      .ilike('personal_id', `%${partialPersonalId.trim()}%`) // Search by partial Personal ID
      .order('personal_id')
      .limit(10); // Limit results to prevent overwhelming UI

    if (error) {
      console.error('Search attendees error:', error);
      return { data: [], error };
    }

    // Add status fields based on the boolean flags
    const attendeesWithStatus = (data || []).map(attendee => ({
      ...attendee,
      current_status: attendee.event_entry ? 'inside_event' : 'outside_event',
      building_status: attendee.building_entry ? 'inside_building' : 'outside_building'
    }));

    return { data: attendeesWithStatus, error: null };
  } catch (error: any) {
    console.error('Search attendees exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// UPDATED: Get registration statistics using new boolean fields
export const getRegistrationStats = async () => {
  try {
    // Total registered users
    const { count: totalRegistered } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true });

    // Total attendees (only attendee role)
    const { count: totalAttendees } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'attendee');

    // Count users currently inside event (event_entry = true)
    const { count: insideEvent } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('event_entry', true)
      .eq('role', 'attendee');

    // Count users currently inside building (building_entry = true)
    const { count: insideBuilding } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('building_entry', true)
      .eq('role', 'attendee');

    return {
      data: {
        total_registered: totalRegistered || 0,
        total_attendees: totalAttendees || 0,
        inside_event: insideEvent || 0,
        inside_building: insideBuilding || 0
      },
      error: null
    };
  } catch (error: any) {
    console.error('Get stats error:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const processBuildingAttendance = async (personalId: string, action: 'building_entry' | 'building_exit' | 'session_entry', sessionId?: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token found');
    }

    const requestBody: any = {
      personal_id: personalId,
      action: action
    };

    if (action === 'session_entry' && sessionId) {
      requestBody.session_id = sessionId;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/process-building-attendance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process attendance');
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Process building attendance error:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Get all sessions from the database
export const getAllSessions = async () => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        speaker,
        start_time,
        end_time,
        location,
        capacity,
        current_attendees,
        max_attendees,
        current_bookings,
        session_type,
        created_at
      `)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Get sessions error:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get sessions exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// Get session by ID
export const getSessionById = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        speaker,
        start_time,
        end_time,
        location,
        capacity,
        current_attendees,
        max_attendees,
        current_bookings,
        session_type,
        created_at
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Get session by ID error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Get session by ID exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const getScheduleByDay = async (day: number) => {
  try {
    // Calculate the date for the specific day
    const eventStartDate = new Date('2024-03-18'); // Adjust this start date
    const targetDate = new Date(eventStartDate);
    targetDate.setDate(eventStartDate.getDate() + (day - 1));
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('schedule_items')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        location,
        item_type,
        created_at
      `)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Get schedule by day error:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get schedule by day exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// Get all schedule items
export const getAllScheduleItems = async () => {
  try {
    const { data, error } = await supabase
      .from('schedule_items')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        location,
        item_type,
        created_at
      `)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Get all schedule items error:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get all schedule items exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// Get schedule item by ID
export const getScheduleItemById = async (itemId: string) => {
  try {
    const { data, error } = await supabase
      .from('schedule_items')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        location,
        item_type,
        created_at
      `)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('Get schedule item by ID error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Get schedule item by ID exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Get all companies from the database
export const getAllCompanies = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        logo_url,
        description,
        website,
        booth_number,
        created_at
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Get companies error:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get companies exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// Get company by ID
export const getCompanyById = async (companyId: string) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        logo_url,
        description,
        website,
        booth_number,
        created_at
      `)
      .eq('id', companyId)
      .single();

    if (error) {
      console.error('Get company by ID error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Get company by ID exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Get user's session bookings
export const getUserBookings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select(`
        session_id,
        scanned_at,
        sessions (
          id,
          title,
          description,
          speaker,
          start_time,
          end_time,
          location
        )
      `)
      .eq('user_id', userId)
      .eq('scan_type', 'booking')
      .order('scanned_at', { ascending: false });

    if (error) {
      console.error('Get user bookings error:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get user bookings exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// Book a session (alternative direct approach if RPC doesn't work)
export const bookSessionDirect = async (userId: string, sessionId: string, scannedBy?: string) => {
  try {
    // First check if already booked
    const { data: existingBooking, error: checkError } = await supabase
      .from('attendances')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('scan_type', 'booking')
      .single();

    if (existingBooking) {
      return { data: null, error: { message: 'Session already booked' } };
    }

    // Check session capacity
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('max_attendees, current_bookings')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      return { data: null, error: { message: 'Session not found' } };
    }

    if (session.max_attendees && session.current_bookings >= session.max_attendees) {
      return { data: null, error: { message: 'Session is full' } };
    }

    // Create booking
    const { data, error } = await supabase
      .from('attendances')
      .insert({
        user_id: userId,
        session_id: sessionId,
        scan_type: 'booking',
        scanned_by: scannedBy || userId
      })
      .select()
      .single();

    if (error) {
      console.error('Book session error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Book session exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Cancel a session booking (alternative direct approach if RPC doesn't work)
export const cancelSessionBookingDirect = async (userId: string, sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('scan_type', 'booking')
      .select();

    if (error) {
      console.error('Cancel booking error:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: { message: 'Booking not found' } };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Cancel booking exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const addSession = async (sessionData) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        title: sessionData.title,
        description: sessionData.description || null,
        speaker: sessionData.speaker,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        location: sessionData.location,
        max_attendees: sessionData.max_attendees || null,
        session_type: sessionData.session_type || 'session',
        current_attendees: 0,
        current_bookings: 0
      }])
      .select();

    if (error) {
      console.error('Error adding session:', error);
      return { data: null, error };
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('Add session exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Add Event/Schedule Item
export const addScheduleItem = async (eventData) => {
  try {
    const { data, error } = await supabase
      .from('schedule_items')
      .insert([{
        title: eventData.title,
        description: eventData.description || null,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location || null,
        item_type: eventData.item_type || 'general'
      }])
      .select();

    if (error) {
      console.error('Error adding schedule item:', error);
      return { data: null, error };
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('Add schedule item exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// In supabase.ts - update the generateVolunteerId function
const generateVolunteerId = async (role: string): Promise<string> => {
  try {
    // Define role prefixes for ALL volunteer roles
    const rolePrefixes: { [key: string]: string } = {
      'registration': 'REG',
      'building': 'BLD',
      'info_desk': 'INFDSK',
      'volunteer': 'VOL',
      'team_leader': 'TLDR',
      'ushers': 'USHR',
      'marketing': 'MKTG',
      'media': 'MEDIA',
      'ER': 'ER',
      'BD team': 'BD', // Changed from 'BD' to 'BD team'
      'catering': 'CAT',
      'feedback': 'FDBK',
      'stage': 'STAGE'
    };
    
    const prefix = rolePrefixes[role] || 'VOL';
    
    // Rest of the function remains the same...
    const { data: volunteers, error } = await supabase
      .from('users_profiles')
      .select('volunteer_id')
      .eq('role', role)
      .not('volunteer_id', 'is', null)
      .order('volunteer_id', { ascending: false });

    if (error) {
      console.error('Error fetching volunteers:', error);
      return `${prefix}${Date.now().toString().slice(-6)}`;
    }

    let counter = 1;
    
    if (volunteers && volunteers.length > 0) {
      // Find the highest number for this prefix
      const numbers = volunteers
        .map(v => {
          if (v.volunteer_id && v.volunteer_id.startsWith(prefix)) {
            const numPart = v.volunteer_id.replace(prefix, '');
            const num = parseInt(numPart);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        })
        .filter(n => n > 0);
      
      if (numbers.length > 0) {
        counter = Math.max(...numbers) + 1;
      }
    }
    
    const paddedCounter = counter.toString().padStart(2, '0');
    return `${prefix}${paddedCounter}`;
    
  } catch (error) {
    console.error('Error generating volunteer ID:', error);
    const rolePrefixes: { [key: string]: string } = {
      'registration': 'REG',
      'building': 'BLD',
      'info_desk': 'INFDSK',
      'volunteer': 'VOL',
      'team_leader': 'TLDR',
      'ushers': 'USHR',
      'marketing': 'MKTG',
      'media': 'MEDIA',
      'ER': 'ER',
      'BD team': 'BD', // Changed from 'BD' to 'BD team'
      'catering': 'CAT',
      'feedback': 'FDBK',
      'stage': 'STAGE'
    };
    const prefix = rolePrefixes[role] || 'VOL';
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
};
// Add Company
export const addCompany = async (companyData) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([{
        name: companyData.name,
        logo_url: companyData.logo_url || null,
        description: companyData.description || null,
        website: companyData.website,
        booth_number: companyData.booth_number
      }])
      .select();

    if (error) {
      console.error('Error adding company:', error);
      return { data: null, error };
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('Add company exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const sendAnnouncement = async (announcementData) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      throw new Error('User not authenticated');
    }

    let insertData = {
      title: announcementData.title,
      message: announcementData.message,
      target_type: announcementData.target_type,
      created_by: session.user.id
    };

    if (announcementData.target_type === 'role') {
      insertData.target_role = announcementData.target_role;
    } else if (announcementData.target_type === 'custom') {
      insertData.target_user_ids = announcementData.target_user_ids;
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Error sending announcement:', error);
      return { data: null, error };
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('Send announcement exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// UPDATED: Simplified dynamic building stats using new boolean fields
export async function getDynamicBuildingStats() {
  try {
    // Get counts directly from users_profiles using the boolean fields
    const { count: totalAttendees } = await supabase
      .from("users_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "attendee");

    const { count: insideBuilding } = await supabase
      .from("users_profiles")
      .select("*", { count: "exact", head: true })
      .eq("building_entry", true)
      .eq("role", "attendee");

    const { count: insideEvent } = await supabase
      .from("users_profiles")
      .select("*", { count: "exact", head: true })
      .eq("event_entry", true)
      .eq("role", "attendee");

    return {
      data: {
        inside_building: insideBuilding || 0,
        inside_event: insideEvent || 0,
        total_attendees: totalAttendees || 0
      },
      error: null
    };

  } catch (error) {
    console.error("Error in getDynamicBuildingStats:", error);
    return { data: null, error };
  }
}
export const deleteFile = async (bucket: string, filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete file error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Delete file exception:', error);
    return { success: false, error: { message: error.message } };
  }
};

export const deleteCompany = async (companyId) => {
  try {
    // Get company data including logo URL
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('logo_url')
      .eq('id', companyId)
      .single();

    if (fetchError) {
      console.error('Error fetching company for deletion:', fetchError);
      return { data: null, error: fetchError };
    }

    // Delete company from database
    const { data, error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId)
      .select();

    if (error) {
      console.error('Error deleting company:', error);
      return { data: null, error };
    }

    // Delete logo file if it exists and is in our storage
    if (company?.logo_url) {
      await deleteCompanyLogo(company.logo_url);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Delete company exception:', error);
    return { data: null, error: { message: error.message } };
  }
};
const deleteCompanyLogo = async (logoUrl) => {
  try {
    // Check if it's a file stored in our Assets bucket
    if (!logoUrl.includes('supabase.co/storage/v1/object/public/Assets/')) {
      console.log('Logo is external URL, skipping file deletion');
      return;
    }

    // Extract file path from different possible URL formats
    let filePath = null;
    
    if (logoUrl.includes('/Assets/')) {
      // Standard public URL format
      const parts = logoUrl.split('/Assets/');
      filePath = parts[parts.length - 1];
    } else if (logoUrl.includes('company-logos/')) {
      // Direct path format
      const parts = logoUrl.split('/');
      const assetsIndex = parts.findIndex(part => part === 'Assets');
      if (assetsIndex !== -1) {
        filePath = parts.slice(assetsIndex + 1).join('/');
      }
    }

    if (filePath) {
      console.log('Attempting to delete logo file:', filePath);
      
      const { error: deleteError } = await supabase.storage
        .from('Assets')
        .remove([filePath]);

      if (deleteError) {
        console.warn('Failed to delete logo file:', deleteError);
      } else {
        console.log('Logo file deleted successfully');
      }
    } else {
      console.warn('Could not extract file path from logo URL:', logoUrl);
    }
  } catch (error) {
    console.warn('Error deleting logo file:', error);
  }
};



export const getFileInfo = async (bucket: string, filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: null, error: { message: 'File not found' } };
    }

    const fileInfo = data[0];
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { 
      data: {
        ...fileInfo,
        publicUrl: urlData.publicUrl
      }, 
      error: null 
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

export const checkFileExists = async (bucket: string, filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (error) {
      return { exists: false, error };
    }

    const exists = data && data.length > 0;
    return { exists, error: null };
  } catch (error: any) {
    return { exists: false, error };
  }
};
export const getUserRankingAndScore = async (userId: string) => {
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('users_profiles')
      .select('score, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return { data: null, error: profileError };
    }

    // Get ranking based on role
    let query = supabase
      .from('users_profiles')
      .select('id, score')
      .order('score', { ascending: false });

    if (userProfile.role === 'attendee') {
      query = query.eq('role', 'attendee');
    } else if (userProfile.role !== 'admin') {
      query = query.not('role', 'in', '("attendee","admin")');
    }

    const { data: allUsers, error: rankError } = await query;

    if (rankError) {
      console.error('Error fetching ranking:', rankError);
      return { data: null, error: rankError };
    }

    const userRank = allUsers?.findIndex(user => user.id === userId) + 1 || 0;
    const totalUsers = allUsers?.length || 0;

    return {
      data: {
        score: userProfile.score || 0,
        rank: userRank,
        total_users: totalUsers
      },
      error: null
    };
  } catch (error: any) {
    console.error('Get user ranking exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// Get recent activities for a user
export const getRecentActivities = async (userId: string, limit: number = 5) => {
  try {
    const { data, error } = await supabase
      .from('user_scores')
      .select(`
        id,
        points,
        activity_type,
        activity_description,
        awarded_at
      `)
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent activities:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Get recent activities exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// Get leaderboard data based on role
export const getLeaderboardData = async (userRole: string, leaderboardType?: 'attendees' | 'volunteers') => {
  try {
    let query = supabase
      .from('users_profiles')
      .select('id, first_name, last_name, role, score')
      .order('score', { ascending: false });

    if (userRole === 'admin') {
      // Admin can see both - controlled by leaderboardType
      if (leaderboardType === 'attendees') {
        query = query.eq('role', 'attendee');
      } else if (leaderboardType === 'volunteers') {
        query = query.in('role', ['volunteer', 'registration', 'building', 'team_leader', 'info_desk']);
      }
    } else if (userRole === 'attendee') {
      // Attendees only see other attendees
      query = query.eq('role', 'attendee');
    } else {
      // Other roles see all non-attendees and non-admins
      query = query.not('role', 'in', '("attendee","admin")');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return { data: [], error };
    }

    // Add ranking to the data
    const rankedData = (data || []).map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    return { data: rankedData, error: null };
  } catch (error: any) {
    console.error('Get leaderboard exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// UPDATED: Get building attendance statistics using new boolean fields
export const getBuildingStats = async () => {
  try {
    // Total attendees
    const { count: totalAttendees } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'attendee');

    // Count users currently inside building (building_entry = true)
    const { count: insideBuilding } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('building_entry', true)
      .eq('role', 'attendee');

    // Count users currently inside event (event_entry = true)
    const { count: insideEvent } = await supabase
      .from('users_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('event_entry', true)
      .eq('role', 'attendee');

    // Today's building entries (count building_entry scans today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayBuildingEntries } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .eq('scan_type', 'building_entry')
      .gte('scanned_at', today.toISOString());

    // Today's event entries (count entry scans today)
    const { count: todayEventEntries } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .eq('scan_type', 'entry')
      .gte('scanned_at', today.toISOString());

    return {
      data: {
        total_attendees: totalAttendees || 0,
        inside_building: insideBuilding || 0,
        inside_event: insideEvent || 0,
        today_building_entries: todayBuildingEntries || 0,
        today_event_entries: todayEventEntries || 0
      },
      error: null
    };
  } catch (error: any) {
    console.error('Get building stats error:', error);
    return { data: null, error: { message: error.message } };
  }
};

// NEW: Function to get user's current status by ID
export const getUserCurrentStatus = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('building_entry, event_entry')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get user status error:', error);
      return { data: null, error };
    }

    return {
      data: {
        building_status: data.building_entry ? 'inside_building' : 'outside_building',
        event_status: data.event_entry ? 'inside_event' : 'outside_event'
      },
      error: null
    };
  } catch (error: any) {
    console.error('Get user status exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

// NEW: Function to get all users with their current status
export const getAllUsersWithStatus = async (roleFilter?: string) => {
  try {
    let query = supabase
      .from('users_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        personal_id,
        role,
        building_entry,
        event_entry,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get all users with status error:', error);
      return { data: [], error };
    }

    // Add status fields based on the boolean flags
    const usersWithStatus = (data || []).map(user => ({
      ...user,
      building_status: user.building_entry ? 'inside_building' : 'outside_building',
      event_status: user.event_entry ? 'inside_event' : 'outside_event'
    }));

    return { data: usersWithStatus, error: null };
  } catch (error: any) {
    console.error('Get all users with status exception:', error);
    return { data: [], error: { message: error.message } };
  }
};

// NEW: Function to get real-time status updates
export const subscribeToStatusChanges = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('users_profiles_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users_profiles'
      },
      callback
    )
    .subscribe();

  return subscription;
};

// NEW: Function to manually update user status (for testing/emergency)
export const updateUserStatus = async (userId: string, updates: { building_entry?: boolean, event_entry?: boolean }) => {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Update user status error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Update user status exception:', error);
    return { data: null, error: { message: error.message } };
  }
};

export default supabase;