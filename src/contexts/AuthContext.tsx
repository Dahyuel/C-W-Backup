// src/contexts/AuthContext.tsx - PRODUCTION READY
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
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

  // Refs for preventing race conditions
  const initializedRef = useRef(false);
  const profileFetchInProgressRef = useRef(false);

  // Session storage utilities
  const saveProfileToSession = useCallback((profileData: any) => {
    try {
      if (typeof Storage !== 'undefined') {
        sessionStorage.setItem('user_profile', JSON.stringify(profileData));
      }
    } catch (error) {
      console.warn('Could not save profile to session storage:', error);
    }
  }, []);

  const getProfileFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = sessionStorage.getItem('user_profile');
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.warn('Could not read profile from session storage:', error);
    }
    return null;
  }, []);

  const clearProfileFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        sessionStorage.removeItem('user_profile');
      }
    } catch (error) {
      console.warn('Could not clear profile from session storage:', error);
    }
  }, []);

  // Profile completion check
  const isProfileComplete = useCallback((profile: any, role?: string): boolean => {
    if (!profile) return false;
    
    // Use profile_complete boolean from database as source of truth
    if (typeof profile.profile_complete === 'boolean') {
      return profile.profile_complete;
    }
    
    // Fallback logic
    const actualRole = role || profile.role;
    if (actualRole === 'attendee') {
      return !!(profile.personal_id && profile.university);
    } else if (actualRole) {
      return !!(profile.personal_id && profile.phone);
    }
    
    return false;
  }, []);

  // Fetch profile with deduplication
  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<any> => {
    if (profileFetchInProgressRef.current) {
      console.log('Profile fetch already in progress - skipping');
      return null;
    }

    profileFetchInProgressRef.current = true;

    try {
      // Try cache first
      const cachedProfile = getProfileFromSession();
      if (cachedProfile && cachedProfile.id === userId) {
        setProfile(cachedProfile);
        return cachedProfile;
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const { data, error } = await supabase
            .from("users_profiles")
            .select("*")
            .eq("id", userId)
            .single();

          if (error) {
            if (attempt === retries) {
              console.error('Profile fetch failed after retries:', error);
              return null;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          if (data) {
            setProfile(data);
            saveProfileToSession(data);
            return data;
          } else {
            return null;
          }
        } catch (error) {
          if (attempt === retries) {
            console.error('Profile fetch exception:', error);
            return null;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    } finally {
      profileFetchInProgressRef.current = false;
    }

    return null;
  }, [getProfileFromSession, saveProfileToSession]);

  // Auth state change handler
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session?.user?.id);

    if (event === 'SIGNED_OUT') {
      setUser(null);
      setProfile(null);
      clearProfileFromSession();
      setSessionLoaded(true);
      setLoading(false);
      return;
    }

    if (event === 'SIGNED_IN' && session?.user) {
      setUser(session.user);
      setSessionLoaded(true);
      
      if (!profile || profile.id !== session.user.id) {
        await fetchProfile(session.user.id);
      }
      
      setLoading(false);
    } else if (event === 'INITIAL_SESSION') {
      setSessionLoaded(true);
      if (!session?.user) {
        setLoading(false);
      }
    }
  }, [fetchProfile, clearProfileFromSession, profile]);

  // Initialize auth
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setLoading(false);
            setSessionLoaded(true);
          }
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          setSessionLoaded(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        } else {
          if (mounted) {
            setLoading(false);
            setSessionLoaded(true);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setSessionLoaded(true);
        }
      }
    };

    initializeAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthStateChange, fetchProfile]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading && sessionLoaded) {
        console.warn('Loading timeout - forcing state reset');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(safetyTimeout);
  }, [loading, sessionLoaded]);

  // Role-based redirect
  const getRoleBasedRedirect = useCallback((role?: string, profileComplete?: boolean) => {
    const r = role || profile?.role;
    const isComplete = profileComplete ?? (profile ? isProfileComplete(profile) : false);

    console.log('Redirect check:', { role: r, profileComplete: isComplete });

    // If profile is not complete, redirect to registration
    if (!isComplete) {
      if (r === 'attendee') {
        return '/attendee-register';
      } else {
        return '/V0lunt33ringR3g';
      }
    }

    // Profile is complete - redirect to dashboard
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
      case "attendee":
        return "/attendee";
      case "volunteer":
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

        // Fetch profile
        await fetchProfile(result.data.user.id);

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

        if (result.data.profile) {
          setProfile(result.data.profile);
          saveProfileToSession(result.data.profile);
        } else {
          await fetchProfile(result.data.user.id);
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
        const userProfile = await fetchProfile(data.user.id);
        
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
      clearProfileFromSession();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out exception:', error);
      clearProfileFromSession();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
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

  const isAuthenticated = useMemo(() => !!user && sessionLoaded, [user, sessionLoaded]);

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