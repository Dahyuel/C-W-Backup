// src/contexts/AuthContext.tsx - PERMANENT FIX FOR YOUR FLOW
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, signUpUser, signUpVolunteer, signInUser, validateRegistrationData } from "../lib/supabase";
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: any;
  loading: boolean;
  isAuthenticated: boolean;
  sessionLoaded: boolean;
  authActionLoading: boolean;
  authActionMessage: string;
  signUp: (
    email: string,
    password: string,
    profileData: any
  ) => Promise<{ success: boolean; data?: any; error?: any; redirectPath?: string }>;
  signUpVolunteer: (
    email: string,
    password: string,
    profileData: any
  ) => Promise<{ success: boolean; data?: any; error?: any; redirectPath?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: any; redirectPath?: string }>;
  signOut: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  getRoleBasedRedirect: (role?: string, profileComplete?: boolean) => string;
  validateRegistration: (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => Promise<{ isValid: boolean; errors: string[] }>;
  refreshProfile: () => Promise<void>;
  clearAuthAction: () => void;
  isProfileComplete: (profile: any, role?: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authActionMessage, setAuthActionMessage] = useState('');

  // Refs to prevent race conditions
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  // Profile completion check - matches your database schema
  const isProfileComplete = useCallback((profile: any): boolean => {
    if (!profile) return false;
    
    // Use profile_complete boolean from database as source of truth
    if (typeof profile.profile_complete === 'boolean') {
      return profile.profile_complete;
    }
    
    return false; // Default to false if not specified
  }, []);

  // Fetch profile - optimized for your trigger-based flow
  const fetchProfile = useCallback(async (userId: string): Promise<any> => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.log('❌ Profile fetch error:', error.message);
        
        // If profile doesn't exist yet (trigger hasn't run), return null
        if (error.code === 'PGRST116') {
          console.log('📝 Profile not found - trigger may not have run yet');
          return null;
        }
        
        return null;
      }

      console.log('✅ Profile found:', { 
        id: data.id, 
        role: data.role, 
        profile_complete: data.profile_complete 
      });
      
      return data;
    } catch (error) {
      console.log('💥 Profile fetch exception:', error);
      return null;
    }
  }, []);

  // Initialize auth - SIMPLIFIED AND RELIABLE
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing authentication...');

        // Step 1: Get session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          if (mountedRef.current) {
            setLoading(false);
            setSessionLoaded(true);
          }
          return;
        }

        console.log('🔐 Session result:', session ? `User: ${session.user.id}` : 'No session');

        if (session?.user && mountedRef.current) {
          console.log('👤 User authenticated, setting user state');
          setUser(session.user);
          setSessionLoaded(true);

          // Step 2: Fetch profile (but don't block on it)
          console.log('🔍 Fetching user profile...');
          const profileData = await fetchProfile(session.user.id);
          
          if (mountedRef.current) {
            if (profileData) {
              console.log('✅ Profile loaded during initialization');
              setProfile(profileData);
            } else {
              console.log('📝 Profile not found or empty - user needs registration');
              setProfile(null);
            }
            setLoading(false);
          }
        } else {
          console.log('🚫 No user session found');
          if (mountedRef.current) {
            setUser(null);
            setProfile(null);
            setSessionLoaded(true);
            setLoading(false);
          }
        }

      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        if (mountedRef.current) {
          setUser(null);
          setProfile(null);
          setSessionLoaded(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Auth state listener - handles real-time changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🎧 Auth state change:', event, session?.user?.id);

        if (!mountedRef.current) return;

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('👤 User signed in');
          setUser(session.user);
          setSessionLoaded(true);
          
          // Fetch profile but don't block UI
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
          } else {
            setProfile(null);
          }
          setLoading(false);
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
          setProfile(null);
          setSessionLoaded(true);
          setLoading(false);
        }
        else if (event === 'INITIAL_SESSION') {
          console.log('📦 Initial session processed');
          setSessionLoaded(true);
          // Loading state handled in initializeAuth
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth provider');
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading && sessionLoaded && mountedRef.current) {
        console.warn('⚠️ Loading timeout - forcing state reset');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(safetyTimeout);
  }, [loading, sessionLoaded]);

  // Role-based redirect - matches your flow
  const getRoleBasedRedirect = useCallback((role?: string, profileComplete?: boolean) => {
    const actualRole = role || profile?.role;
    const actualProfileComplete = profileComplete ?? (profile ? isProfileComplete(profile) : false);

    console.log('🔧 Redirect check:', { 
      role: actualRole, 
      profileComplete: actualProfileComplete,
      hasProfile: !!profile 
    });

    // If profile is not complete, redirect to appropriate registration form
    if (!actualProfileComplete) {
      if (actualRole === 'attendee') {
        return '/attendee-register';
      } else {
        return '/V0lunt33ringR3g';
      }
    }

    // Profile is complete - redirect to appropriate dashboard
    switch (actualRole) {
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
      case "attendee":
        return "/attendee";
      case "ushers":
      case "marketing":
      case "media":
      case "ER":
      case "BD team":
      case "catering":
      case "feedback":
      case "stage":
        return "/volunteer";
      default:
        console.warn('⚠️ Unknown role for redirect:', actualRole);
        return "/V0lunt33ringR3g";
    }
  }, [profile, isProfileComplete]);

  // Auth actions
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your account...');

      const result = await signUpUser(email, password, profileData);

      if (result.success && result.data?.user) {
        setUser(result.data.user);
        setAuthActionMessage('Account created successfully!');

        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch the newly created profile
        const userProfile = await fetchProfile(result.data.user.id);
        setProfile(userProfile);

        const redirectPath = profileData.role === 'attendee' ? '/attendee-register' : '/V0lunt33ringR3g';

        return {
          success: true,
          data: result.data,
          redirectPath
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return {
        success: false,
        error: { message: error.message || 'Registration failed. Please try again.' }
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your volunteer account...');

      const result = await signUpVolunteer(email, password, profileData);

      if (result.error) {
        setAuthActionMessage('Volunteer registration failed. Please try again.');
        return {
          success: false,
          error: result.error
        };
      }

      setAuthActionMessage('Volunteer account created!');

      if (result.data?.user?.id) {
        setUser(result.data.user);

        // Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (result.data.profile) {
          setProfile(result.data.profile);
        } else {
          const userProfile = await fetchProfile(result.data.user.id);
          setProfile(userProfile);
        }
      }

      return {
        success: true,
        data: result.data,
        redirectPath: "/V0lunt33ringR3g"
      };
    } catch (error: any) {
      setAuthActionMessage('Volunteer registration failed. Please try again.');
      return {
        success: false,
        error: { message: error.message || 'Volunteer registration failed. Please try again.' }
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthActionLoading(true);
      setAuthActionMessage('Signing you in...');

      const { data, error } = await signInUser(email, password);

      if (error) {
        setAuthActionMessage('Sign in failed. Please check your credentials.');
        return {
          success: false,
          error
        };
      }

      setAuthActionMessage('Success! Loading profile...');

      if (data?.user?.id) {
        setUser(data.user);
        
        // Fetch profile after sign in
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
        
        const redirectPath = getRoleBasedRedirect(userProfile?.role, userProfile?.profile_complete);

        return {
          success: true,
          redirectPath
        };
      }

      return {
        success: true,
        redirectPath: '/V0lunt33ringR3g'
      };
    } catch (error: any) {
      setAuthActionMessage('Sign in failed. Please try again.');
      return {
        success: false,
        error: { message: error.message || 'Sign in failed. Please try again.' }
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out exception:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      console.log('🔄 Manually refreshing profile...');
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      return profileData;
    }
    return null;
  }, [user?.id, fetchProfile]);

  const clearAuthAction = useCallback(() => {
    setAuthActionLoading(false);
    setAuthActionMessage('');
  }, []);

  const validateRegistration = async (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => {
    return await validateRegistrationData(email, personalId, volunteerId);
  };

  const hasRole = useCallback((roles: string | string[]) => {
    if (!profile?.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  }, [profile?.role]);

  const isAuthenticated = !!user;

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    sessionLoaded,
    authActionLoading,
    authActionMessage,
    signUp,
    signUpVolunteer: signUpVolunteerFunc,
    signIn,
    signOut,
    hasRole,
    getRoleBasedRedirect,
    validateRegistration,
    refreshProfile,
    clearAuthAction,
    isProfileComplete,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};