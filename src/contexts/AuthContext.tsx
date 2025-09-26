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
  
  // Use refs to prevent multiple concurrent operations
  const fetchingProfile = useRef(false);
  const initializingAuth = useRef(false);
  const mountedRef = useRef(true);

  // Enhanced profile fetch with better error handling and timeout
  const fetchProfile = useCallback(async (uid: string, maxRetries: number = 2): Promise<any> => {
    if (!mountedRef.current || !uid) return null;
    
    // Prevent concurrent fetches for the same user
    if (fetchingProfile.current) {
      console.log('Profile fetch already in progress, skipping...');
      return null;
    }

    fetchingProfile.current = true;
    console.log(`Fetching profile for user ${uid}`);

    try {
      // Add timeout to prevent hanging requests
      const fetchWithTimeout = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Profile fetch timeout'));
        }, 10000); // 10 second timeout

        supabase
          .from("users_profiles")
          .select("*")
          .eq("id", uid)
          .single()
          .then((result) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      const { data, error } = await fetchWithTimeout as any;

      if (!mountedRef.current) {
        fetchingProfile.current = false;
        return null;
      }

      if (error) {
        console.log('Profile fetch error:', error);
        fetchingProfile.current = false;
        
        // Don't retry on certain errors
        if (error.code === 'PGRST116' || error.message?.includes('No rows found')) {
          console.log('Profile not found for user:', uid);
          return null;
        }
        
        // Retry on network/permission errors
        if (maxRetries > 0 && (error.code === 'PGRST301' || error.code === '42501')) {
          console.log(`Retrying profile fetch in 2 seconds... (${maxRetries} retries left)`);
          setTimeout(() => {
            if (mountedRef.current) {
              fetchingProfile.current = false;
              fetchProfile(uid, maxRetries - 1);
            }
          }, 2000);
        }
        
        return null;
      }

      if (data) {
        console.log('✅ Profile fetched successfully:', data.role);
        if (mountedRef.current) {
          setProfile(data);
        }
        fetchingProfile.current = false;
        return data;
      }
      
      fetchingProfile.current = false;
      return null;
    } catch (error) {
      console.log('Profile fetch exception:', error);
      fetchingProfile.current = false;
      return null;
    }
  }, []);

  // Initialize auth on mount with better error handling
  useEffect(() => {
    mountedRef.current = true;
    
    if (initializingAuth.current) {
      return;
    }

    const initAuth = async () => {
      initializingAuth.current = true;
      console.log('🔄 Initializing authentication...');

      try {
        // Set a timeout for session fetch
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout')), 8000);
        });

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (!mountedRef.current) return;

        if (error) {
          console.error('Session fetch error:', error);
          setUser(null);
          setProfile(null);
        } else if (session?.user) {
          console.log('✅ Existing session found');
          setUser(session.user);
          // Fetch profile but don't wait for it to complete initialization
          fetchProfile(session.user.id).catch(console.error);
        } else {
          console.log('No existing session');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
          initializingAuth.current = false;
          console.log('✅ Auth initialization completed');
        }
      }
    };

    initAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchProfile]);

  // Handle auth state changes
  useEffect(() => {
    if (!initialized) return;

    console.log('Setting up auth state listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        console.log('🔄 Auth state change:', event, !!session);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setProfile(null);
          fetchingProfile.current = false;
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session.user) {
            setUser(session.user);
            // Only fetch profile if we don't have one or it's a different user
            if (!profile || profile.id !== session.user.id) {
              fetchProfile(session.user.id).catch(console.error);
            }
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, profile, initialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      fetchingProfile.current = false;
      initializingAuth.current = false;
    };
  }, []);

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
      
      if (result.data?.user && mountedRef.current) {
        setUser(result.data.user);
        fetchProfile(result.data.user.id).catch(console.error);
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
      
      if (result.data?.user && mountedRef.current) {
        setUser(result.data.user);
        fetchProfile(result.data.user.id).catch(console.error);
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

      if (data.user && mountedRef.current) {
        console.log('✅ Sign in successful, updating state...');
        setUser(data.user);
        
        // Fetch profile and wait for it
        const profileData = await fetchProfile(data.user.id);
        
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

  // Calculate isAuthenticated more reliably
  const isAuthenticated = !!user && initialized && !loading;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        initialized,
        isAuthenticated,
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