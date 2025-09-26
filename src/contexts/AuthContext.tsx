// src/contexts/AuthContext.tsx - Fixed version
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, signUpUser, signUpVolunteer, signInUser, validateRegistrationData } from "../lib/supabase";
import { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  profile: any;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, profileData: any) => Promise<{ data: any; error: any }>;
  signUpVolunteer: (email: string, password: string, profileData: any) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; profile?: any }>;
  signOut: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  getRoleBasedRedirect: (role?: string) => string;
  validateRegistration: (email: string, personalId: string, volunteerId?: string) => Promise<{ isValid: boolean; errors: string[] }>;
  refetchProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  const mountedRef = useRef(true);
  const profileFetchRef = useRef<Promise<any> | null>(null);

  // Enhanced profile fetch with caching and proper error handling
  const fetchProfile = useCallback(async (userId: string, forceRefresh = false): Promise<any> => {
    if (!mountedRef.current || !userId) return null;

    // Return existing promise if already fetching
    if (profileFetchRef.current && !forceRefresh) {
      return profileFetchRef.current;
    }

    const fetchPromise = (async () => {
      try {
        console.log(`🔄 Fetching profile for user ${userId}`);
        
        const { data, error } = await supabase
          .from("users_profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(); // Use maybeSingle to avoid throwing on no rows

        if (!mountedRef.current) return null;

        if (error) {
          console.error('Profile fetch error:', error);
          
          // Don't retry for "not found" errors
          if (error.code === 'PGRST116') {
            console.log('Profile not found for user:', userId);
            return null;
          }
          
          throw error;
        }

        if (data) {
          console.log('✅ Profile fetched successfully:', data.role);
          if (mountedRef.current) {
            setProfile(data);
          }
          return data;
        }
        
        return null;
      } catch (error) {
        console.error('Profile fetch exception:', error);
        throw error;
      }
    })();

    profileFetchRef.current = fetchPromise;
    
    // Clear the promise reference when done
    fetchPromise.finally(() => {
      profileFetchRef.current = null;
    });

    return fetchPromise;
  }, []);

  // Manual profile refetch
  const refetchProfile = useCallback(async () => {
    if (user?.id) {
      return fetchProfile(user.id, true);
    }
    return null;
  }, [user?.id, fetchProfile]);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      console.log('🔄 Initializing authentication...');
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!mountedRef.current) return;

      if (error) {
        console.error('Session fetch error:', error);
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
        }
        return;
      }

      if (session?.user) {
        console.log('✅ Existing session found');
        if (mountedRef.current) {
          setUser(session.user);
          // Fetch profile but don't block initialization
          fetchProfile(session.user.id).catch(error => {
            console.error('Initial profile fetch error:', error);
          });
        }
      } else {
        console.log('No existing session');
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
        }
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
        console.log('✅ Auth initialization completed');
      }
    }
  }, [fetchProfile]);

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;
    initializeAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [initializeAuth]);

  // Auth state change listener
  useEffect(() => {
    if (!initialized) return;

    console.log('Setting up auth state listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        console.log('🔄 Auth state change:', event, session?.user?.id);
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setUser(session.user);
              // Fetch profile for new sign-in or refresh
              if (event === 'SIGNED_IN' || !profile || profile.id !== session.user.id) {
                fetchProfile(session.user.id).catch(console.error);
              }
            }
            break;
            
          case 'SIGNED_OUT':
            setUser(null);
            setProfile(null);
            profileFetchRef.current = null;
            break;
            
          case 'USER_UPDATED':
            // Refresh user data if needed
            if (session?.user) {
              setUser(session.user);
            }
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized, profile, fetchProfile]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auth methods
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      const result = await signUpUser(email, password, profileData);
      
      if (result.error) {
        return result;
      }

      if (result.data?.user && mountedRef.current) {
        setUser(result.data.user);
        // Wait for profile to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      const result = await signUpVolunteer(email, password, profileData);
      
      if (result.error) {
        return result;
      }

      if (result.data?.user && mountedRef.current) {
        setUser(result.data.user);
        await new Promise(resolve => setTimeout(resolve, 1000));
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

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await signInUser(email, password);

      if (error) {
        return { error };
      }

      if (data.user && mountedRef.current) {
        setUser(data.user);
        const profileData = await fetchProfile(data.user.id);
        return { error: null, profile: profileData };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      return { error: { message: error.message || 'Sign in failed' } };
    }
  };
  
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // State will be updated by the auth state listener
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/login';
    }
  };

  const validateRegistration = async (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => {
    return await validateRegistrationData(email, personalId, volunteerId);
  };

  // Role helpers
  const hasRole = (roles: string | string[]) => {
    if (!profile?.role) return false;
    const userRole = profile.role;
    return Array.isArray(roles) ? roles.includes(userRole) : userRole === roles;
  };

  const getRoleBasedRedirect = (role?: string) => {
    const userRole = role || profile?.role;
    switch (userRole) {
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

  const isAuthenticated = !!user && !!profile && initialized;

  const value: AuthContextType = {
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
    refetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};