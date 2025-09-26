// src/contexts/AuthContext.tsx - Fixed authentication with proper session management
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, signUpUser, signUpVolunteer, signInUser, validateRegistrationData } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  profile: any;
  loading: boolean;
  initialized: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to prevent multiple concurrent fetches
  const fetchingProfile = useRef(false);
  const initializingAuth = useRef(false);

  console.log('🔄 Initializing authentication...');

  // Enhanced profile fetch with proper error handling and concurrency control
  const fetchProfile = useCallback(async (uid: string, attempt: number = 1): Promise<any> => {
    // Prevent concurrent fetches
    if (fetchingProfile.current) {
      console.log('Profile fetch already in progress, skipping...');
      return null;
    }

    if (attempt > 3) {
      console.log('Failed to fetch profile after 3 attempts');
      fetchingProfile.current = false;
      return null;
    }

    fetchingProfile.current = true;
    console.log(`Fetching profile for user ${uid} (attempt ${attempt})`);

    try {
      const { data, error } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) {
        console.log(`Profile fetch error (attempt ${attempt}):`, error);
        
        // If it's a permission error, don't retry immediately
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.code === '42501') {
          console.log('Supabase request failed', error);
          
          // Wait before retrying
          if (attempt < 3) {
            setTimeout(() => {
              fetchingProfile.current = false;
              fetchProfile(uid, attempt + 1);
            }, 1000 * attempt); // Exponential backoff
          } else {
            fetchingProfile.current = false;
          }
          return null;
        }
        
        fetchingProfile.current = false;
        return null;
      }

      if (data) {
        console.log('✅ Profile fetched successfully:', data.role);
        setProfile(data);
        fetchingProfile.current = false;
        return data;
      }
      
      fetchingProfile.current = false;
      return null;
    } catch (error) {
      console.log(`Profile fetch exception (attempt ${attempt}):`, error);
      fetchingProfile.current = false;
      
      // Retry on network errors
      if (attempt < 3) {
        setTimeout(() => fetchProfile(uid, attempt + 1), 1000 * attempt);
      }
      
      return null;
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    if (initializingAuth.current) {
      console.log('Auth already initialized or initializing, skipping...');
      return;
    }

    const initAuth = async () => {
      initializingAuth.current = true;
      console.log('🔄 Initializing authentication...');

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session fetch error:', error);
          setUser(null);
          setProfile(null);
        } else if (session?.user) {
          console.log('✅ Existing session found');
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log('No existing session');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
      setInitialized(true);
      initializingAuth.current = false;
      console.log('✅ Auth initialization completed');
    };

    initAuth();
  }, [fetchProfile]);

  // Handle auth state changes
  useEffect(() => {
    console.log('Setting up auth state listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setProfile(null);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session.user) {
            setUser(session.user);
            // Only fetch profile if we don't have one or it's a different user
            if (!profile || profile.id !== session.user.id) {
              console.log('Fetching profile for auth state change...');
              await fetchProfile(session.user.id);
            }
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, profile]);

  // Debug state changes
  useEffect(() => {
    console.log('Loading state:', loading, 'Initialized:', initialized, 'User:', !!user, 'Profile:', !!profile);
  }, [loading, initialized, user, profile]);

  // Sign up function
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🔄 Starting attendee registration...');
      
      const result = await signUpUser(email, password, profileData);
      
      if (result.error) {
        console.error('❌ Registration failed:', result.error);
        return result;
      }

      console.log('✅ Registration successful');
      
      if (result.data?.user) {
        setUser(result.data.user);
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

  // Sign up volunteer function
  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🔄 Starting volunteer registration...');
      
      const result = await signUpVolunteer(email, password, profileData);
      
      if (result.error) {
        console.error('❌ Volunteer registration failed:', result.error);
        return result;
      }

      console.log('✅ Volunteer registration successful');
      
      if (result.data?.user) {
        setUser(result.data.user);
        await fetchProfile(result.data.user.id);
      }

      return result;
    } catch (error: any) {
      console.error('Volunteer registration exception:', error);
      return { 
        data: null, 
        error: { message: error.message || 'Volunteer registration failed' } 
      };
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔄 Attempting sign in...');
      const { data, error } = await signInUser(email, password);

      if (error) {
        console.error('❌ Sign in failed:', error);
        return { error };
      }

      if (data.user) {
        console.log('✅ Sign in successful, updating state...');
        setUser(data.user);
        const profileData = await fetchProfile(data.user.id);
        
        if (!profileData) {
          console.log('⚠️ Profile fetch failed after sign in');
        }
        
        console.log('✅ Sign in process completed');
        return { error: null, profile: profileData };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      return { error: { message: error.message || 'Sign in failed' } };
    }
  };
  
  // Sign out function
  const signOut = async () => {
    try {
      console.log('🔄 Signing out...');
      
      // Clear state first
      setUser(null);
      setProfile(null);
      fetchingProfile.current = false;
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
      } else {
        console.log('✅ Signed out successfully');
      }
      
      // Force redirect to login
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even on error
      window.location.href = '/login';
    }
  };

  // Validation function
  const validateRegistration = async (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => {
    return await validateRegistrationData(email, personalId, volunteerId);
  };

  // Role helper functions
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
        initialized,
        isAuthenticated: !!user && !!profile,
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

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};