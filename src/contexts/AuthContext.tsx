// src/contexts/AuthContext.tsx - OPTIMIZED & FIXED
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
  signUp: (email: string, password: string, profileData: any) => Promise<{ success: boolean; data?: any; error?: any; redirectPath?: string }>;
  signUpVolunteer: (email: string, password: string, profileData: any) => Promise<{ success: boolean; data?: any; error?: any; redirectPath?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any; redirectPath?: string }>;
  signOut: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  getRoleBasedRedirect: (role?: string, profileComplete?: boolean) => string;
  validateRegistration: (email: string, personalId: string, volunteerId?: string) => Promise<{ isValid: boolean; errors: string[] }>;
  refreshProfile: () => Promise<void>;
  clearAuthAction: () => void;
  isProfileComplete: (profile: any, role?: string) => boolean;
  getRegistrationState: () => any;
  setRegistrationState: (state: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State management
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authActionMessage, setAuthActionMessage] = useState('');

  // Refs to prevent re-initialization
  const initializedRef = useRef(false);
  const authListenerRef = useRef<any>(null);
  const profileFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingAuthChange = useRef(false);

  // Session storage helpers - memoized to prevent recreation
  const sessionHelpers = useMemo(() => ({
    saveProfile: (profileData: any) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem('user_profile', JSON.stringify(profileData));
          sessionStorage.setItem('registration_state', JSON.stringify({
            hasAuth: !!profileData,
            role: profileData?.role,
            profileComplete: profileData?.profile_complete || false,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.warn('Session storage error:', error);
      }
    },
    getProfile: () => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const stored = sessionStorage.getItem('user_profile');
          return stored ? JSON.parse(stored) : null;
        }
      } catch (error) {
        console.warn('Session storage read error:', error);
      }
      return null;
    },
    clearProfile: () => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.removeItem('user_profile');
          sessionStorage.removeItem('registration_state');
        }
      } catch (error) {
        console.warn('Session storage clear error:', error);
      }
    },
    getRegistrationState: () => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const stored = sessionStorage.getItem('registration_state');
          return stored ? JSON.parse(stored) : null;
        }
      } catch (error) {
        console.warn('Registration state read error:', error);
      }
      return null;
    },
    setRegistrationState: (state: any) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem('registration_state', JSON.stringify({
            ...state,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.warn('Registration state save error:', error);
      }
    }
  }), []);

  // Profile completeness check
  const isProfileComplete = useCallback((profile: any, role?: string): boolean => {
    if (!profile) return false;
    
    // Trust the database field
    if (profile.profile_complete === true) return true;
    if (profile.profile_complete === false) return false;
    
    // Fallback logic
    const actualRole = role || profile.role;
    if (actualRole === 'attendee') {
      return !!(profile.personal_id && profile.university);
    }
    if (actualRole && actualRole !== 'attendee') {
      return !!(profile.personal_id && profile.phone);
    }
    
    return false;
  }, []);

  // Optimized profile fetching with exponential backoff
  const fetchProfile = useCallback(async (uid: string): Promise<any> => {
    const maxRetries = 3;
    const baseDelay = 500;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from("users_profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle(); // Use maybeSingle to avoid errors on no rows

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found
            sessionHelpers.setRegistrationState({
              hasAuth: true,
              role: null,
              profileComplete: false,
              needsRegistration: true
            });
            return null;
          }
          
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
            continue;
          }
          return null;
        }

        if (data) {
          setProfile(data);
          sessionHelpers.saveProfile(data);
          return data;
        }

        return null;

      } catch (error) {
        if (attempt === maxRetries - 1) {
          console.error('Profile fetch failed:', error);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
    
    return null;
  }, [sessionHelpers]);

  // Debounced auth state change handler
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    // Prevent concurrent processing
    if (isProcessingAuthChange.current) return;
    isProcessingAuthChange.current = true;

    try {
      if (session?.user) {
        setUser(session.user);
        setSessionLoaded(true);

        // Check cached profile first for speed
        const cachedProfile = sessionHelpers.getProfile();
        if (cachedProfile && cachedProfile.id === session.user.id) {
          setProfile(cachedProfile);
          setLoading(false);
          return;
        }

        // Fetch profile with timeout
        if (profileFetchTimeoutRef.current) {
          clearTimeout(profileFetchTimeoutRef.current);
        }

        profileFetchTimeoutRef.current = setTimeout(async () => {
          await fetchProfile(session.user.id);
          setLoading(false);
        }, 100); // Small delay to debounce

      } else {
        setUser(null);
        setProfile(null);
        sessionHelpers.clearProfile();
        setSessionLoaded(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      setSessionLoaded(true);
      setLoading(false);
    } finally {
      isProcessingAuthChange.current = false;
    }
  }, [fetchProfile, sessionHelpers]);

// In AuthContext.tsx - FIXED initialization
useEffect(() => {
  let mounted = true;
  let initializationTimeout: NodeJS.Timeout;

  const initialize = async () => {
    // Set timeout to prevent infinite loading
    initializationTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
        setSessionLoaded(true);
      }
    }, 3000);

    try {
      console.log('🚀 Starting optimized auth initialization...');
      
      // Get session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (session?.user) {
        console.log('✅ Session found for user:', session.user.id);
        setUser(session.user);
        
        // Try to get profile quickly
        const cachedProfile = sessionHelpers.getProfile();
        if (cachedProfile && cachedProfile.id === session.user.id) {
          console.log('✅ Using cached profile');
          setProfile(cachedProfile);
          setSessionLoaded(true);
          setLoading(false);
          clearTimeout(initializationTimeout);
          return;
        }

        // Fetch fresh profile with timeout
        const profileFetch = fetchProfile(session.user.id);
        const profileTimeout = new Promise((resolve) => 
          setTimeout(() => resolve(null), 2000)
        );

        const profileResult = await Promise.race([profileFetch, profileTimeout]);
        
        if (mounted) {
          setSessionLoaded(true);
          setLoading(false);
          clearTimeout(initializationTimeout);
        }
      } else {
        console.log('ℹ️ No session found');
        if (mounted) {
          setSessionLoaded(true);
          setLoading(false);
          clearTimeout(initializationTimeout);
        }
      }
    } catch (error) {
      console.error('Initialization error:', error);
      if (mounted) {
        setSessionLoaded(true);
        setLoading(false);
        clearTimeout(initializationTimeout);
      }
    }
  };

  initialize();

  return () => {
    mounted = false;
    clearTimeout(initializationTimeout);
  };
}, []); // Empty deps - only run once

  // Role-based redirect logic
  const getRoleBasedRedirect = useCallback((role?: string, profileComplete?: boolean) => {
    const r = role || profile?.role;
    const isComplete = profileComplete ?? profile?.profile_complete;
    
    if (!isComplete) {
      return r === 'attendee' ? '/attendee-register' : '/V0lunt33ringR3g';
    }
    
    const roleMap: Record<string, string> = {
      admin: '/secure-9821panel',
      sadmin: '/super-ctrl-92k1x',
      team_leader: '/teamleader',
      registration: '/regteam',
      building: '/buildteam',
      info_desk: '/infodesk',
      attendee: '/attendee',
    };

    return roleMap[r] || '/volunteer';
  }, [profile]);

  // Sign up handler
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your account...');
      
      const result = await signUpUser(email, password, profileData);
      
      if (result.success && result.data?.user) {
        setUser(result.data.user);
        
        // Wait a bit for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        const userProfile = await fetchProfile(result.data.user.id);
        
        setAuthActionMessage('Account created successfully!');
        
        const redirectPath = userProfile?.role === 'attendee' 
          ? '/attendee-register' 
          : '/V0lunt33ringR3g';
        
        return { success: true, data: result.data, redirectPath };
      }
      
      return { success: false, error: result.error };
      
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Registration failed' } };
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Volunteer sign up handler
  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      setAuthActionLoading(true);
      setAuthActionMessage('Creating volunteer account...');
      
      const result = await signUpVolunteer(email, password, profileData);
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.data?.user?.id) {
        setUser(result.data.user);
        
        sessionHelpers.setRegistrationState({
          hasAuth: true,
          role: null,
          profileComplete: false,
          needsVolunteerRegistration: true
        });

        if (result.data.profile) {
          setProfile(result.data.profile);
          sessionHelpers.saveProfile(result.data.profile);
        }
      }
      
      setAuthActionMessage('Volunteer account created!');
      return { success: true, data: result.data, redirectPath: "/V0lunt33ringR3g" };
      
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Registration failed' } };
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Sign in handler
  const signIn = async (email: string, password: string) => {
    try {
      setAuthActionLoading(true);
      setAuthActionMessage('Signing you in...');
      
      const { data, error } = await signInUser(email, password);
  
      if (error) {
        return { success: false, error };
      }
  
      if (data?.user?.id) {
        setUser(data.user);
        
        // Wait for profile fetch
        const userProfile = await fetchProfile(data.user.id);
        
        setAuthActionMessage('Sign in successful!');
        
        const redirectPath = getRoleBasedRedirect(
          userProfile?.role, 
          userProfile?.profile_complete
        );
        
        return { success: true, redirectPath };
      }
      
      return { success: true, redirectPath: '/V0lunt33ringR3g' };
      
    } catch (error: any) {
      return { success: false, error: { message: error.message || 'Sign in failed' } };
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Sign out handler
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      sessionHelpers.clearProfile();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  // Clear auth action
  const clearAuthAction = useCallback(() => {
    setAuthActionLoading(false);
    setAuthActionMessage('');
  }, []);

  // Validate registration
  const validateRegistration = async (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => {
    return await validateRegistrationData(email, personalId, volunteerId);
  };

  // Has role checker
  const hasRole = useCallback((roles: string | string[]) => {
    if (!profile?.role) return false;
    return Array.isArray(roles) ? roles.includes(profile.role) : profile.role === roles;
  }, [profile?.role]);

  // Context value - memoized to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    sessionLoaded,
    isAuthenticated: !!user && sessionLoaded,
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
    getRegistrationState: sessionHelpers.getRegistrationState,
    setRegistrationState: sessionHelpers.setRegistrationState,
  }), [
    user,
    profile,
    loading,
    sessionLoaded,
    authActionLoading,
    authActionMessage,
    hasRole,
    getRoleBasedRedirect,
    refreshProfile,
    clearAuthAction,
    isProfileComplete,
    sessionHelpers
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
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