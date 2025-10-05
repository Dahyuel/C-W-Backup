// src/contexts/AuthContext.tsx - Fixed with proper initialization
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

  // Use refs to track initialization state
  const initializedRef = useRef(false);
  const authListenerRef = useRef<any>(null);

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

  const getRegistrationStateFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        const stored = sessionStorage.getItem('registration_state');
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.warn('Could not read registration state from session storage:', error);
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
      console.warn('Could not save registration state:', error);
    }
  }, []);

  const clearProfileFromSession = useCallback(() => {
    try {
      if (typeof Storage !== 'undefined') {
        sessionStorage.removeItem('user_profile');
        sessionStorage.removeItem('registration_state');
      }
    } catch (error) {
      console.warn('Could not clear profile from session storage:', error);
    }
  }, []);

  const isProfileComplete = useCallback((profile: any, role?: string): boolean => {
    if (!profile) return false;
    
    const actualRole = role || profile.role;
    
    // Use profile_complete boolean from database
    if (profile.profile_complete) {
      return true;
    }
    
    // Fallback logic for backward compatibility
    if (actualRole === 'attendee') {
      return !!(profile.personal_id && profile.university);
    } else if (actualRole) {
      // For volunteers and other roles (non-attendee, non-null)
      return !!(profile.personal_id && profile.phone);
    }
    
    // No role assigned yet - profile is incomplete
    return false;
  }, []);

  // FIXED: Enhanced fetchProfile with better error handling
  const fetchProfile = useCallback(async (uid: string, retries = 3): Promise<any> => {
    console.log(`🔍 Fetching profile for user: ${uid}`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${retries}`);
        
        const { data, error } = await supabase
          .from("users_profiles")
          .select("*")
          .eq("id", uid)
          .single();

        if (error) {
          console.log(`Profile fetch error (attempt ${attempt}):`, error.message);
          
          if (error.code === 'PGRST116') {
            // Profile not found - this is expected for new users
            console.log('📝 No profile found - user needs to complete registration');
            const registrationState = {
              hasAuth: true,
              role: null,
              profileComplete: false,
              needsRegistration: true,
              timestamp: Date.now()
            };
            setRegistrationState(registrationState);
            setProfile(null);
            return null;
          }
          
          if (attempt === retries) {
            console.log('❌ Profile fetch failed after retries');
            setProfile(null);
            return null;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (data) {
          console.log('✅ Profile fetched successfully:', { 
            id: data.id, 
            role: data.role, 
            profile_complete: data.profile_complete 
          });
          
          setProfile(data);
          saveProfileToSession(data);
          return data;
        }

      } catch (error) {
        console.error(`Profile fetch exception (attempt ${attempt}):`, error);
        if (attempt === retries) {
          setProfile(null);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    console.log('❌ Profile fetch failed after all retries');
    setProfile(null);
    return null;
  }, [saveProfileToSession, setRegistrationState]);

  // FIXED: Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('🔄 Auth state change:', event, session?.user?.id);
    
    // Skip if we're already initialized and this is just a duplicate event
    if (initializedRef.current && event === 'SIGNED_IN' && user?.id === session?.user?.id) {
      console.log('🔄 Duplicate SIGNED_IN event, skipping...');
      return;
    }

    try {
      if (session?.user) {
        console.log('👤 User authenticated:', session.user.id);
        setUser(session.user);
        setSessionLoaded(true);

        // Fetch profile but don't block the UI
        fetchProfile(session.user.id).then((profileData) => {
          if (profileData) {
            console.log('✅ Profile loaded during auth state change');
          } else {
            console.log('ℹ️ No profile found during auth state change - user needs registration');
          }
          setLoading(false);
        }).catch((error) => {
          console.error('❌ Profile fetch error during auth state change:', error);
          setLoading(false);
        });

      } else {
        // Signed out
        console.log('👋 User signed out');
        setUser(null);
        setProfile(null);
        clearProfileFromSession();
        setSessionLoaded(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('💥 Auth state change error:', error);
      setUser(null);
      setProfile(null);
      setSessionLoaded(true);
      setLoading(false);
    }
  }, [fetchProfile, clearProfileFromSession, user]);

  // FIXED: Initialize auth only once
  useEffect(() => {
    if (initializedRef.current) {
      console.log('🔄 Auth already initialized, skipping...');
      return;
    }

    initializedRef.current = true;
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            clearProfileFromSession();
            setSessionLoaded(true);
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('✅ Found existing session for user:', session.user.id);
          setUser(session.user);
          setSessionLoaded(true);
          
          // Fetch profile
          await fetchProfile(session.user.id);
          
          if (mounted) {
            setLoading(false);
          }
        } else {
          console.log('ℹ️ No existing session found');
          if (mounted) {
            setUser(null);
            setProfile(null);
            clearProfileFromSession();
            setSessionLoaded(true);
            setLoading(false);
          }
        }

      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          clearProfileFromSession();
          setSessionLoaded(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth listener only once
    if (!authListenerRef.current) {
      console.log('🎧 Setting up auth state change listener...');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
      authListenerRef.current = subscription;
    }

    return () => {
      mounted = false;
      // Don't unsubscribe here - we want the listener to persist
    };
  }, [handleAuthStateChange, fetchProfile, clearProfileFromSession]);

  // Enhanced getRoleBasedRedirect
  const getRoleBasedRedirect = useCallback((role?: string, profileComplete?: boolean) => {
    const r = role || profile?.role;
    const isComplete = profileComplete ?? profile?.profile_complete;
    
    console.log('🔧 getRoleBasedRedirect called:', { 
      role: r, 
      profileComplete: isComplete,
      hasProfile: !!profile
    });
    
    // If profile is not complete, redirect to appropriate registration form
    if (!isComplete) {
      if (r === 'attendee') {
        return '/attendee-register';
      } else {
        // Default to volunteer registration for all other cases
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
        console.warn('Unknown role for redirect:', r);
        return "/V0lunt33ringR3g";
    }
  }, [profile?.role, profile?.profile_complete]);

  // FIXED: signUp with immediate profile fetch
  const signUp = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🚀 Starting registration...');
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your account...');
      
      const result = await signUpUser(email, password, profileData);
      
      console.log('Registration result:', result);
      
      if (result.success && result.data?.user) {
        console.log('✅ Registration successful');
        
        // Update auth state
        setUser(result.data.user);
        
        // Try to fetch the profile immediately
        console.log('Attempting to fetch profile after signup...');
        const userProfile = await fetchProfile(result.data.user.id, 5); // Try 5 times
        
        setAuthActionMessage('Account created successfully!');
        
        // Determine redirect path based on role
        let redirectPath = '/V0lunt33ringR3g'; // Default to volunteer registration
        
        if (userProfile?.role === 'attendee') {
          redirectPath = '/attendee-register';
        }
        
        console.log('🔧 Registration redirect path:', redirectPath, { role: userProfile?.role });
        
        return { 
          success: true, 
          data: result.data,
          redirectPath
        };
      } else {
        console.error('Registration failed:', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error: any) {
      console.error('Registration exception:', error);
      return { 
        success: false, 
        error: { message: error.message || 'Registration failed' } 
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  // FIXED: signUpVolunteer with registration state tracking
  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      console.log('🚀 Starting volunteer registration via Edge Function...');
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your volunteer account...');
      
      const result = await signUpVolunteer(email, password, profileData);
      
      if (result.error) {
        console.error('Volunteer registration failed:', result.error);
        setAuthActionMessage('Volunteer registration failed. Please try again.');
        return { 
          success: false, 
          error: result.error 
        };
      }

      console.log('✅ Volunteer registration successful via Edge Function');
      setAuthActionMessage('Volunteer account created! Loading profile...');
      
      if (result.data?.user?.id) {
        // Set user immediately
        setUser(result.data.user);
        
        // Store registration state for volunteer flow
        const registrationState = {
          hasAuth: true,
          role: null, // Volunteer registration not completed yet
          profileComplete: false,
          needsVolunteerRegistration: true,
          timestamp: Date.now()
        };
        
        setRegistrationState(registrationState);

        // Set profile from Edge Function response if available
        if (result.data.profile) {
          setProfile(result.data.profile);
          saveProfileToSession(result.data.profile);
        } else {
          // Fallback: try to fetch profile
          console.log('Attempting to fetch volunteer profile...');
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
      console.error('Volunteer registration exception:', error);
      setAuthActionMessage('Volunteer registration failed. Please try again.');
      return { 
        success: false, 
        error: { message: error.message || 'Volunteer registration failed' } 
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🚀 Starting sign in...');
      setAuthActionLoading(true);
      setAuthActionMessage('Signing you in...');
      
      const { data, error } = await signInUser(email, password);
  
      if (error) {
        console.error('Sign in failed:', error);
        setAuthActionMessage('Sign in failed. Please check your credentials.');
        return { 
          success: false, 
          error 
        };
      }
  
      console.log('✅ Sign in successful');
      setAuthActionMessage('Success! Loading profile...');
      
      if (data?.user?.id) {
        setUser(data.user);
        
        // Wait for profile to be fetched
        const userProfile = await fetchProfile(data.user.id, 5);
        
        setAuthActionMessage('Sign in successful!');
        
        // Use the updated getRoleBasedRedirect that handles incomplete profiles
        const redirectPath = getRoleBasedRedirect(userProfile?.role, userProfile?.profile_complete);
        
        console.log('🔧 Sign in redirect path:', redirectPath, {
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
        redirectPath: '/V0lunt33ringR3g' // Default to volunteer registration
      };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      setAuthActionMessage('Sign in failed. Please try again.');
      return { 
        success: false, 
        error: { message: error.message || 'Sign in failed' } 
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('✅ Signed out successfully');
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

// Add these missing functions to your AuthContext.tsx

// Refresh profile manually
const refreshProfile = useCallback(async () => {
  if (user?.id) {
    console.log('🔄 Manually refreshing profile...');
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

  const getRegistrationState = useCallback(() => {
    return getRegistrationStateFromSession();
  }, [getRegistrationStateFromSession]);

  const isAuthenticated = !!user && sessionLoaded;
  
  console.log('📊 Auth Context State:', {
    hasUser: !!user,
    hasProfile: !!profile,
    loading,
    sessionLoaded,
    isAuthenticated,
    userRole: profile?.role,
    profileComplete: isProfileComplete(profile),
    registrationState: getRegistrationState()
  });

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