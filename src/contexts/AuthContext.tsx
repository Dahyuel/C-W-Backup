// src/contexts/AuthContext.tsx - Fixed session management and loading states
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
  const [initialized, setInitialized] = useState(false);
  
  // Use refs to prevent multiple simultaneous fetches
  const fetchingProfile = useRef(false);
  const initializingAuth = useRef(false);

  // 🔹 Enhanced profile fetch with better error handling and timeout
  const fetchProfile = async (uid: string, maxRetries = 3): Promise<boolean> => {
    if (fetchingProfile.current) {
      console.log('Profile fetch already in progress, skipping...');
      return false;
    }

    fetchingProfile.current = true;
    let retries = 0;

    try {
      while (retries < maxRetries) {
        try {
          console.log(`Fetching profile for user ${uid} (attempt ${retries + 1})`);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const { data, error } = await supabase
            .from("users_profiles")
            .select("*")
            .eq("id", uid)
            .single()
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);

          if (!error && data) {
            setProfile(data);
            console.log('✅ Profile fetched successfully:', data.role);
            return true;
          } else if (error?.code === 'PGRST116') {
            // No profile found - this might be a new user
            console.log('ℹ️ No profile found for user, might be a new registration');
            setProfile(null);
            return true; // Don't retry for missing profiles
          } else {
            console.error(`Profile fetch error (attempt ${retries + 1}):`, error);
            retries++;
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
            }
          }
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            console.error('Profile fetch timed out');
          } else {
            console.error(`Profile fetch exception (attempt ${retries + 1}):`, fetchError);
          }
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      // If all retries failed
      console.error(`Failed to fetch profile after ${maxRetries} attempts`);
      setProfile(null);
      return false;

    } finally {
      fetchingProfile.current = false;
    }
  };

  // 🔹 Enhanced initialization with timeout and better error handling
  useEffect(() => {
    const initAuth = async () => {
      if (initializingAuth.current || initialized) {
        console.log('Auth already initialized or initializing, skipping...');
        return;
      }

      initializingAuth.current = true;
      
      try {
        console.log('🔄 Initializing authentication...');
        
        // Add timeout to prevent hanging on initial load
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.error('Auth initialization timed out');
        }, 15000); // 15 second timeout

        const { data, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Auth initialization error:', error);
          setUser(null);
          setProfile(null);
        } else if (data.session?.user) {
          console.log('✅ Existing session found');
          setUser(data.session.user);
          await fetchProfile(data.session.user.id);
        } else {
          console.log('ℹ️ No existing session');
          setUser(null);
          setProfile(null);
        }

        setInitialized(true);

      } catch (error) {
        console.error('❌ Auth initialization exception:', error);
        setUser(null);
        setProfile(null);
        setInitialized(true);
      } finally {
        initializingAuth.current = false;
        setLoading(false);
        console.log('✅ Auth initialization completed');
      }
    };

    initAuth();

    // 🔹 Enhanced auth state change listener with debouncing
    let authStateTimeout: NodeJS.Timeout;
    
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session?.user);
        
        // Clear any pending auth state changes to debounce rapid changes
        if (authStateTimeout) {
          clearTimeout(authStateTimeout);
        }

        authStateTimeout = setTimeout(async () => {
          try {
            const u = session?.user ?? null;
            setUser(u);
            
            if (u && event !== 'SIGNED_OUT') {
              console.log('Fetching profile for auth state change...');
              await fetchProfile(u.id);
            } else {
              console.log('Clearing profile for auth state change...');
              setProfile(null);
            }

            // Ensure loading is set to false after auth state change
            if (initialized) {
              setLoading(false);
            }
          } catch (error) {
            console.error('Error handling auth state change:', error);
            if (initialized) {
              setLoading(false);
            }
          }
        }, 300); // 300ms debounce
      }
    );

    return () => {
      if (authStateTimeout) {
        clearTimeout(authStateTimeout);
      }
      subscription.subscription.unsubscribe();
    };
  }, [initialized]);

  // ✅ Enhanced SIGN UP for attendees with loading management
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🔄 Starting attendee registration...');
      
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

  // ✅ Enhanced SIGN UP for volunteers
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

  // ✅ Enhanced SIGN IN with better loading management
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
        
        // Fetch profile and wait for it to complete
        const profileFetched = await fetchProfile(data.user.id);
        
        if (!profileFetched) {
          console.warn('⚠️ Profile fetch failed after sign in');
        }
        
        console.log('✅ Sign in process completed');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      return { error: { message: error.message || 'Sign in failed' } };
    }
  };
  
  // ✅ Enhanced SIGN OUT
  const signOut = async () => {
    try {
      console.log('🔄 Starting sign out process...');
      
      // Set loading state
      setLoading(true);
      
      // First, clear local state immediately
      setUser(null);
      setProfile(null);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        // Don't throw error, still redirect
      }
      
      console.log('✅ Signed out successfully');
      
      // Force navigation to login page
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear state and redirect
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    }
  };

  // ✅ VALIDATION HELPER
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

  // Debug logging for loading state
  useEffect(() => {
    console.log(`Loading state: ${loading}, Initialized: ${initialized}, User: ${!!user}, Profile: ${!!profile}`);
  }, [loading, initialized, user, profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user && !!profile, // Only authenticated if both user and profile exist
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