// src/contexts/AuthContext.tsx - Updated with enhanced validation
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, signUpUser, signUpVolunteer, signInUser, validateRegistrationData } from "../lib/supabase";

type AuthContextType = {
  user: any;
  profile: any;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (
    email: string,
    password: string,
    profileData: any
  ) => Promise<{ data: any; error: any }>;
  signUpVolunteer: (
    email: string,
    password: string,
    profileData: any
  ) => Promise<{ data: any; error: any }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: any; profile?: any }>;
  signOut: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  getRoleBasedRedirect: (role?: string) => string;
  validateRegistration: (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => Promise<{ isValid: boolean; errors: string[] }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch profile from DB
  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (!error && data) {
        setProfile(data);
        console.log('✅ Profile fetched:', data.role);
      } else {
        console.error('Profile fetch error:', error);
        setProfile(null);
      }
    } catch (error) {
      console.error('Profile fetch exception:', error);
      setProfile(null);
    }
  };

  // 🔹 Load session & profile on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data.session?.user) {
          setUser(data.session.user);
          await fetchProfile(data.session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 🔹 Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        
        const u = session?.user ?? null;
        setUser(u);
        
        if (u) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ✅ Enhanced SIGN UP for attendees with pre-validation
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🔄 Starting attendee registration with validation...');
      
      // Use the enhanced signUpUser function which includes validation
      const result = await signUpUser(email, password, profileData);
      
      if (result.error) {
        console.error('❌ Registration failed:', result.error);
        return result;
      }

      console.log('✅ Registration successful');
      
      // Fetch the newly created profile
      if (result.data?.user) {
        await fetchProfile(result.data.user.id);
      }

      return result;
    } catch (error: any) {
      console.error('Registration exception:', error);
      return { 
        data: null, 
        error: { message: error.message || 'Registration failed' } 
      };
    }
  };

  // ✅ Enhanced SIGN UP for volunteers with pre-validation
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

    // Create complete profile with the selected volunteer role
    const { data: profileData, error: profileError } = await supabase
      .from("users_profiles")
      .insert({
        id: authData.user.id,
        ...userData,
        role: userData.role || 'volunteer', // ✅ Use the selected role or default to 'volunteer'
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
  // ✅ SIGN IN
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await signInUser(email, password);

      if (error) {
        console.error('❌ Sign in failed:', error);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
        console.log('✅ Sign in successful');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      return { error: { message: error.message || 'Sign in failed' } };
    }
  };
  
  // ✅ SIGN OUT
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // ✅ VALIDATION HELPER - expose validation function for form validation
  const validateRegistration = async (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => {
    return await validateRegistrationData(email, personalId, volunteerId);
  };

  // ✅ ROLE HELPERS
  const hasRole = (roles: string | string[]) => {
    if (!profile?.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  };

  const getRoleBasedRedirect = (role?: string) => {
    const r = role || profile?.role;
    switch (r) {
      case "admin":
        return "/secure-9821panel";
      case "sadmin":
        return "/super-ctrl-92k1x";
      case "team_leader":
        return "/teamleader";
      case "registration":
        return "/regteam";
      case "building":
        return "/buildteam";
      case "info_desk":
        return "/infodesk";
      case "volunteer":
        return "/volunteer";
      case "attendee":
        return "/attendee";
      default:
        return "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        signUp,
        signUpVolunteer: signUpVolunteerFunc,
        signIn,
        signOut,
        hasRole,
        getRoleBasedRedirect,
        validateRegistration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};