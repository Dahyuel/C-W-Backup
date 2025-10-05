// src/contexts/AuthContext.tsx - FIXED: Prevents redirect loops, race conditions, and initialization issues
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
  getRegistrationState: () => any;
  setRegistrationState: (state: any) => void;
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

  // CRITICAL: Use refs to prevent duplicate initialization and track state
  const initializedRef = useRef(false);
  const authListenerRef = useRef<any>(null);
  const profileFetchInProgressRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  // OPTIMIZATION: Memoize session storage functions
  const saveProfileToSession = useCallback((profileData: any) => {
    try {
      if (typeof Storage !== 'undefined') {
        sessionStorage.setItem('user_profile', JSON.stringify(profileData));
        const registrationState = {
          hasAuth: !!profileData,
          role: profileData?.role,
          profileComplete: profileData?.profile_complete || false,
          timestamp: Date.now()
        };
        sessionStorage.setItem('registration_state', JSON.stringify(registrationState));
      }
    } catch (error) {
      console.warn('⚠️ Could not save profile to session storage:', error);
    }
  }, []);

  const getProfileFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = sessionStorage.getItem('user_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Cache expiry: 5 minutes
          const state = sessionStorage.getItem('registration_state');
          if (state) {
            const stateData = JSON.parse(state);
            if (Date.now() - stateData.timestamp < 5 * 60 * 1000) {
              return parsed;
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not read profile from session storage:', error);
    }
    return null;
  }, []);

  const getRegistrationStateFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = sessionStorage.getItem('registration_state');
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.warn('⚠️ Could not read registration state from session storage:', error);
    }
    return null;
  }, []);

  const setRegistrationState = useCallback((state: any) => {
    try {
      if (typeof Storage !== 'undefined') {
        sessionStorage.setItem('registration_state', JSON.stringify({
          ...state,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.warn('⚠️ Could not save registration state:', error);
    }
  }, []);

  const clearProfileFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        sessionStorage.removeItem('user_profile');
        sessionStorage.removeItem('registration_state');
      }
    } catch (error) {
      console.warn('⚠️ Could not clear profile from session storage:', error);
    }
  }, []);

  // OPTIMIZATION: Memoize profile complete check
  const isProfileComplete = useCallback((profile: any, role?: string): boolean => {
    if (!profile) return false;

    const actualRole = role || profile.role;

    // CRITICAL: Use profile_complete boolean from database as source of truth
    if (typeof profile.profile_complete === 'boolean') {
      return profile.profile_complete;
    }

    // Fallback logic for backward compatibility
    if (actualRole === 'attendee') {
      return !!(profile.personal_id && profile.university);
    } else if (actualRole) {
      return !!(profile.personal_id && profile.phone);
    }

    return false;
  }, []);

// Add this useEffect to your AuthContext as a safety net
useEffect(() => {
  const safetyTimeout = setTimeout(() => {
    if (loading && sessionLoaded) {
      console.warn('⚠️ WARNING: Loading timeout - forcing state reset');
      setLoading(false);
    }
  }, 10000); // 10 second timeout

  return () => clearTimeout(safetyTimeout);
}, [loading, sessionLoaded]);
  
  // FIXED: Enhanced fetchProfile with deduplication and race condition prevention
  const fetchProfile = useCallback(async (uid: string, retries = 3): Promise<any> => {
    // CRITICAL: Prevent duplicate fetches for the same user
    if (profileFetchInProgressRef.current && lastFetchedUserIdRef.current === uid) {
      console.log('🔄 Profile fetch already in progress for user:', uid, '- skipping duplicate');
      return null;
    }

    profileFetchInProgressRef.current = true;
    lastFetchedUserIdRef.current = uid;

    console.log(`🔍 NOTICE: Fetching profile for user: ${uid}`);

    // Try session cache first
    const cachedProfile = getProfileFromSession();
    if (cachedProfile && cachedProfile.id === uid) {
      console.log('✅ NOTICE: Using cached profile');
      setProfile(cachedProfile);
      profileFetchInProgressRef.current = false;
      return cachedProfile;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 NOTICE: Fetch attempt ${attempt}/${retries}`);

        const { data, error } = await supabase
          .from("users_profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle(); // CRITICAL: Use maybeSingle() instead of single()

        if (error) {
          console.error(`❌ ERROR: Profile fetch error (attempt ${attempt}):`, error.message);

          if (attempt === retries) {
            console.error('❌ ERROR: Profile fetch failed after all retries');
            profileFetchInProgressRef.current = false;
            setProfile(null);
            return null;
          }

          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (data) {
          console.log('✅ SUCCESS: Profile fetched successfully:', {
            id: data.id,
            role: data.role,
            profile_complete: data.profile_complete
          });

          setProfile(data);
          saveProfileToSession(data);
          profileFetchInProgressRef.current = false;
          return data;
        } else {
          // Profile not found - this is expected for new users
          console.log('📝 NOTICE: No profile found - user needs to complete registration');
          const registrationState = {
            hasAuth: true,
            role: null,
            profileComplete: false,
            needsRegistration: true,
            timestamp: Date.now()
          };
          setRegistrationState(registrationState);
          setProfile(null);
          profileFetchInProgressRef.current = false;
          return null;
        }

      } catch (error) {
        console.error(`💥 EXCEPTION: Profile fetch exception (attempt ${attempt}):`, error);
        if (attempt === retries) {
          profileFetchInProgressRef.current = false;
          setProfile(null);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    console.error('❌ ERROR: Profile fetch failed after all retries');
    profileFetchInProgressRef.current = false;
    setProfile(null);
    return null;
  }, [saveProfileToSession, setRegistrationState, getProfileFromSession]);

  // FIXED: Handle auth state changes with proper deduplication
// FIXED: Handle auth state changes with proper deduplication
const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
  console.log('🔄 AUTH EVENT:', event, '| User ID:', session?.user?.id);

  // CRITICAL: Handle SIGNED_OUT event immediately
  if (event === 'SIGNED_OUT') {
    console.log('👋 NOTICE: User signed out');
    setUser(null);
    setProfile(null);
    clearProfileFromSession();
    setSessionLoaded(true);
    setLoading(false);
    profileFetchInProgressRef.current = false;
    lastFetchedUserIdRef.current = null;
    return;
  }

  // CRITICAL: Skip duplicate SIGNED_IN events to prevent loops
  if (event === 'SIGNED_IN' && user?.id === session?.user?.id && profile) {
    console.log('🔄 NOTICE: Duplicate SIGNED_IN event detected - skipping to prevent loop');
    return;
  }

  // CRITICAL: Don't process events during initial load except INITIAL_SESSION
  if (!initializedRef.current && event !== 'INITIAL_SESSION') {
    console.log('🔄 NOTICE: Skipping auth event during initialization');
    return;
  }

  try {
    if (session?.user) {
      console.log('👤 NOTICE: User authenticated:', session.user.id);
      setUser(session.user);
      setSessionLoaded(true);

      // CRITICAL: Only fetch profile if we don't already have it for this user
      if (!profile || profile.id !== session.user.id) {
        console.log('🔍 NOTICE: Profile missing or different user - fetching profile...');
        await fetchProfile(session.user.id);
      } else {
        console.log('ℹ️ NOTICE: Profile already loaded for this user - skipping fetch');
      }
      
      setLoading(false);
    } else {
      // No session - ensure we're properly signed out
      console.log('ℹ️ NOTICE: No session in auth state change');
      setUser(null);
      setProfile(null);
      clearProfileFromSession();
      setSessionLoaded(true);
      setLoading(false);
    }
  } catch (error) {
    console.error('💥 EXCEPTION: Auth state change error:', error);
    setUser(null);
    setProfile(null);
    setSessionLoaded(true);
    setLoading(false);
  }
}, [fetchProfile, clearProfileFromSession, user, profile]);
// FIXED: Initialize auth only once with proper cleanup
useEffect(() => {
  // CRITICAL: Prevent duplicate initialization
  if (initializedRef.current) {
    console.log('🔄 NOTICE: Auth already initialized - skipping duplicate initialization');
    return;
  }

  initializedRef.current = true;
  let mounted = true;

  const initializeAuth = async () => {
    try {
      console.log('🚀 NOTICE: Initializing authentication system...');

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ ERROR: Error getting session:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          clearProfileFromSession();
          setSessionLoaded(true);
          setLoading(false); // CRITICAL: Ensure loading stops on error
        }
        return;
      }

      if (session?.user && mounted) {
        console.log('✅ SUCCESS: Found existing session for user:', session.user.id);
        setUser(session.user);
        setSessionLoaded(true);

        // CRITICAL: Fetch profile and wait for completion before setting loading to false
        const profileData = await fetchProfile(session.user.id);

        if (mounted) {
          console.log('✅ SUCCESS: Profile fetch completed during initialization');
          setLoading(false);
        }
      } else {
        console.log('ℹ️ NOTICE: No existing session found');
        if (mounted) {
          setUser(null);
          setProfile(null);
          clearProfileFromSession();
          setSessionLoaded(true);
          setLoading(false); // CRITICAL: Ensure loading stops when no session
        }
      }

    } catch (error) {
      console.error('💥 EXCEPTION: Auth initialization error:', error);
      if (mounted) {
        setUser(null);
        setProfile(null);
        clearProfileFromSession();
        setSessionLoaded(true);
        setLoading(false); // CRITICAL: Ensure loading stops on exception
      }
    }
  };

  initializeAuth();

  // CRITICAL: Set up auth listener only once
  if (!authListenerRef.current) {
    console.log('🎧 NOTICE: Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    authListenerRef.current = subscription;
  }

  return () => {
    mounted = false;
    // CRITICAL: Clean up listener on unmount
    if (authListenerRef.current) {
      console.log('🧹 NOTICE: Cleaning up auth listener...');
      authListenerRef.current.unsubscribe();
      authListenerRef.current = null;
    }
  };
}, [handleAuthStateChange, fetchProfile, clearProfileFromSession]);
  // OPTIMIZATION: Memoize getRoleBasedRedirect
  const getRoleBasedRedirect = useCallback((role?: string, profileComplete?: boolean) => {
    const r = role || profile?.role;
    const isComplete = profileComplete ?? profile?.profile_complete;

    console.log('🔧 NOTICE: getRoleBasedRedirect called:', {
      role: r,
      profileComplete: isComplete,
      hasProfile: !!profile
    });

    // CRITICAL: If profile is not complete, redirect to appropriate registration form
    if (!isComplete) {
      if (r === 'attendee') {
        return '/attendee-register';
      } else {
        return '/V0lunt33ringR3g';
      }
    }

    // Profile is complete - redirect to appropriate dashboard
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
        console.warn('⚠️ WARNING: Unknown role for redirect:', r);
        return "/V0lunt33ringR3g";
    }
  }, [profile]);

  // FIXED: signUp with proper error handling
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🚀 NOTICE: Starting registration...');
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your account...');

      const result = await signUpUser(email, password, profileData);

      console.log('ℹ️ NOTICE: Registration result:', result.success ? 'SUCCESS' : 'FAILED');

      if (result.success && result.data?.user) {
        console.log('✅ SUCCESS: Registration successful');

        // Update auth state
        setUser(result.data.user);

        // Try to fetch the profile immediately with more retries
        console.log('🔍 NOTICE: Attempting to fetch profile after signup...');
        const userProfile = await fetchProfile(result.data.user.id, 5);

        setAuthActionMessage('Account created successfully!');

        // Determine redirect path based on role
        let redirectPath = '/V0lunt33ringR3g';

        if (userProfile?.role === 'attendee') {
          redirectPath = '/attendee-register';
        }

        console.log('🔧 NOTICE: Registration redirect path:', redirectPath, '| Role:', userProfile?.role);

        return {
          success: true,
          data: result.data,
          redirectPath
        };
      } else {
        console.error('❌ ERROR: Registration failed:', result.error?.message);
        return { success: false, error: result.error };
      }

    } catch (error: any) {
      console.error('💥 EXCEPTION: Registration exception:', error);
      return {
        success: false,
        error: { message: error.message || 'Registration failed. Please try again.' }
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  // FIXED: signUpVolunteer with registration state tracking
  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🚀 NOTICE: Starting volunteer registration via Edge Function...');
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your volunteer account...');

      const result = await signUpVolunteer(email, password, profileData);

      if (result.error) {
        console.error('❌ ERROR: Volunteer registration failed:', result.error.message);
        setAuthActionMessage('Volunteer registration failed. Please try again.');
        return {
          success: false,
          error: result.error
        };
      }

      console.log('✅ SUCCESS: Volunteer registration successful via Edge Function');
      setAuthActionMessage('Volunteer account created! Loading profile...');

      if (result.data?.user?.id) {
        setUser(result.data.user);

        const registrationState = {
          hasAuth: true,
          role: null,
          profileComplete: false,
          needsVolunteerRegistration: true,
          timestamp: Date.now()
        };

        setRegistrationState(registrationState);

        if (result.data.profile) {
          setProfile(result.data.profile);
          saveProfileToSession(result.data.profile);
        } else {
          console.log('🔍 NOTICE: Attempting to fetch volunteer profile...');
          await fetchProfile(result.data.user.id, 3);
        }
      }

      setAuthActionMessage('Volunteer account created successfully!');

      return {
        success: true,
        data: result.data,
        redirectPath: "/V0lunt33ringR3g"
      };
    } catch (error: any) {
      console.error('💥 EXCEPTION: Volunteer registration exception:', error);
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
      console.log('🚀 NOTICE: Starting sign in...');
      setAuthActionLoading(true);
      setAuthActionMessage('Signing you in...');

      const { data, error } = await signInUser(email, password);

      if (error) {
        console.error('❌ ERROR: Sign in failed:', error.message);
        setAuthActionMessage('Sign in failed. Please check your credentials.');
        return {
          success: false,
          error
        };
      }

      console.log('✅ SUCCESS: Sign in successful');
      setAuthActionMessage('Success! Loading profile...');

      if (data?.user?.id) {
        setUser(data.user);

        // CRITICAL: Wait for profile to be fetched before determining redirect
        const userProfile = await fetchProfile(data.user.id, 5);

        setAuthActionMessage('Sign in successful!');

        const redirectPath = getRoleBasedRedirect(userProfile?.role, userProfile?.profile_complete);

        console.log('🔧 NOTICE: Sign in redirect path:', redirectPath, {
          hasProfile: !!userProfile,
          profileRole: userProfile?.role,
          profileComplete: userProfile?.profile_complete
        });

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
      console.error('💥 EXCEPTION: Sign in exception:', error);
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
      console.log('🚪 NOTICE: Signing out...');
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ ERROR: Sign out error:', error);
      } else {
        console.log('✅ SUCCESS: Signed out successfully');
      }

      clearProfileFromSession();
      setUser(null);
      setProfile(null);
      profileFetchInProgressRef.current = false;
      lastFetchedUserIdRef.current = null;

    } catch (error) {
      console.error('💥 EXCEPTION: Sign out exception:', error);
      clearProfileFromSession();
      setUser(null);
      setProfile(null);
      profileFetchInProgressRef.current = false;
      lastFetchedUserIdRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZATION: Memoize refreshProfile
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      console.log('🔄 NOTICE: Manually refreshing profile...');
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

  // OPTIMIZATION: Memoize hasRole
  const hasRole = useCallback((roles: string | string[]) => {
    if (!profile?.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  }, [profile?.role]);

  const getRegistrationState = useCallback(() => {
    return getRegistrationStateFromSession();
  }, [getRegistrationStateFromSession]);

  // OPTIMIZATION: Memoize isAuthenticated
  const isAuthenticated = useMemo(() => !!user && sessionLoaded, [user, sessionLoaded]);


  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionLoaded,
        isAuthenticated,
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
        getRegistrationState,
        setRegistrationState,
      }}
    >
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
