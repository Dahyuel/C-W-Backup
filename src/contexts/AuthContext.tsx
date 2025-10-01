// src/contexts/AuthContext.tsx - Enhanced with robust session management and fixed redirects
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, signUpUser, signUpVolunteer, signInUser, validateRegistrationData } from "../lib/supabase";
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: any;
  loading: boolean;
  isAuthenticated: boolean;
  sessionLoaded: boolean;
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
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false); // New
  const [authActionMessage, setAuthActionMessage] = useState(''); // New
  const navigate = useNavigate();
    const clearAuthAction = useCallback(() => {
    setAuthActionLoading(false);
    setAuthActionMessage('');
  }, []);
  // Session storage helpers - optimized to avoid errors
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

  // Enhanced profile fetching with session storage and retry logic
  const fetchProfile = useCallback(async (uid: string, retries = 3): Promise<boolean> => {
    // First check session storage for cached profile
    const cachedProfile = getProfileFromSession();
    if (cachedProfile && cachedProfile.id === uid) {
      console.log('Using cached profile:', cachedProfile.role);
      setProfile(cachedProfile);
      return true;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching profile (attempt ${attempt}/${retries}) for user:`, uid);
        
        const { data, error } = await supabase
          .from("users_profiles")
          .select("*")
          .eq("id", uid)
          .single();

        if (error) {
          console.error(`Profile fetch error (attempt ${attempt}):`, error);
          
          // If it's the last attempt or a non-retryable error, handle it
          if (attempt === retries || error.code === 'PGRST116') { // PGRST116 = no rows returned
            console.error('Profile not found or fetch failed permanently');
            
            // If we have a cached profile, use it as fallback
            if (cachedProfile && cachedProfile.id === uid) {
              console.log('Using cached profile as fallback');
              setProfile(cachedProfile);
              return true;
            }
            
            setProfile(null);
            clearProfileFromSession();
            return false;
          }
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
          continue;
        }

        if (data) {
          console.log('Profile fetched successfully:', data.role);
          setProfile(data);
          saveProfileToSession(data);
          return true;
        }

        console.warn('No profile data returned');
        
        // Use cached profile as fallback
        if (cachedProfile && cachedProfile.id === uid) {
          console.log('Using cached profile as fallback');
          setProfile(cachedProfile);
          return true;
        }
        
        setProfile(null);
        clearProfileFromSession();
        return false;
      } catch (error) {
        console.error(`Profile fetch exception (attempt ${attempt}):`, error);
        if (attempt === retries) {
          // Use cached profile as final fallback
          if (cachedProfile && cachedProfile.id === uid) {
            console.log('Using cached profile as final fallback');
            setProfile(cachedProfile);
            return true;
          }
          
          setProfile(null);
          clearProfileFromSession();
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
    return false;
  }, [getProfileFromSession, saveProfileToSession, clearProfileFromSession]);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
    
    try {
      if (session?.user) {
        console.log('Setting user from session:', session.user.id);
        setUser(session.user);
        
        // Set session loaded immediately - don't wait for profile
        setSessionLoaded(true);
        
        // For volunteer registration success, we need to fetch profile immediately
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Fetch profile synchronously for sign-in events
          const profileFetched = await fetchProfile(session.user.id);
          if (!profileFetched) {
            console.warn('Could not fetch profile, but session is valid');
          }
          setLoading(false);
        } else {
          // For other events, fetch profile asynchronously
          fetchProfile(session.user.id).then(profileFetched => {
            if (!profileFetched) {
              console.warn('Could not fetch profile, but session is valid');
            }
            setLoading(false);
          }).catch(error => {
            console.error('Profile fetch failed:', error);
            setLoading(false);
          });
        }
      } else {
        console.log('Clearing user and profile');
        setUser(null);
        setProfile(null);
        clearProfileFromSession();
        setSessionLoaded(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error handling auth state change:', error);
      setUser(null);
      setProfile(null);
      clearProfileFromSession();
      setSessionLoaded(true);
      setLoading(false);
    }
  }, [fetchProfile, clearProfileFromSession]);

  // Initialize auth on mount
  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
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
          console.log('Found existing session for user:', session.user.id);
          setUser(session.user);
          setSessionLoaded(true);
          
          // Fetch profile synchronously on initialization
          const profileFetched = await fetchProfile(session.user.id);
          if (mounted) {
            if (!profileFetched) {
              console.warn('Profile not found for authenticated user');
            }
            setLoading(false);
          }
        } else {
          console.log('No existing session found');
          if (mounted) {
            setUser(null);
            setProfile(null);
            clearProfileFromSession();
            setSessionLoaded(true);
            setLoading(false);
          }
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          clearProfileFromSession();
          setSessionLoaded(true);
          setLoading(false);
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    authListener = subscription;

    // Cleanup function
    return () => {
      mounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []); // No dependencies to prevent re-initialization

  // Refresh profile manually
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      console.log('Manually refreshing profile...');
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

 const signUp = async (email: string, password: string, profileData: any) => {
    try {
      console.log('Starting attendee registration...');
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your account...');
      
      const result = await signUpUser(email, password, profileData);
      
      if (result.error) {
        console.error('Registration failed:', result.error);
        setAuthActionMessage('Registration failed. Please try again.');
        return result;
      }

      console.log('Registration successful');
      setAuthActionMessage('Account created! Verifying authentication...');
      
      // Wait 2 seconds for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force profile refresh after successful registration
      if (result.data?.user?.id) {
        await fetchProfile(result.data.user.id);
        
        // Navigate after profile is loaded
        if (profile) {
          const redirectPath = getRoleBasedRedirect(profile.role);
          setAuthActionMessage('Redirecting to your dashboard...');
          setTimeout(() => navigate(redirectPath), 500);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Registration exception:', error);
      setAuthActionMessage('Registration failed. Please try again.');
      return { 
        data: null, 
        error: { message: error.message || 'Registration failed' } 
      };
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signUpVolunteerFunc = async (email: string, password: string, profileData: any) => {
    try {
      console.log('Starting volunteer registration...');
      setAuthActionLoading(true);
      setAuthActionMessage('Creating your volunteer account...');
      
      const result = await signUpVolunteer(email, password, {
        ...profileData,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        personal_id: profileData.personal_id,
        phone: profileData.phone,
        faculty: profileData.faculty,
        role: profileData.role,
        gender: profileData.gender,
        tl_team: profileData.tl_team || null
      });
      
      if (result.error) {
        console.error('Volunteer registration failed:', result.error);
        setAuthActionMessage('Volunteer registration failed. Please try again.');
        return result;
      }

      console.log('Volunteer registration successful');
      setAuthActionMessage('Volunteer account created! Verifying authentication...');
      
      // Wait 2 seconds for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force profile refresh after successful volunteer registration
      if (result.data?.user?.id) {
        const profileFetched = await fetchProfile(result.data.user.id, 5);
        
        if (profileFetched && profile) {
          setAuthActionMessage('Redirecting to volunteer dashboard...');
          setTimeout(() => navigate("/volunteer"), 500);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Volunteer registration exception:', error);
      setAuthActionMessage('Volunteer registration failed. Please try again.');
      return { 
        data: null, 
        error: { message: error.message || 'Volunteer registration failed' } 
      };
    } finally {
      setAuthActionLoading(false);
    }
  };
  
 const signIn = async (email: string, password: string) => {
    try {
      console.log('Starting sign in...');
      setAuthActionLoading(true);
      setAuthActionMessage('Signing you in...');
      
      const { data, error } = await signInUser(email, password);

      if (error) {
        console.error('Sign in failed:', error);
        setAuthActionMessage('Sign in failed. Please check your credentials.');
        return { error };
      }

      console.log('Sign in successful');
      setAuthActionMessage('Success! Verifying authentication...');
      
      // Wait 2 seconds for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force profile fetch after successful sign in
      if (data?.user?.id) {
        const profileFetched = await fetchProfile(data.user.id);
        
        if (profileFetched && profile) {
          const redirectPath = getRoleBasedRedirect(profile.role);
          setAuthActionMessage('Redirecting to your dashboard...');
          setTimeout(() => navigate(redirectPath), 500);
        }
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      setAuthActionMessage('Sign in failed. Please try again.');
      return { error: { message: error.message || 'Sign in failed' } };
    } finally {
      setAuthActionLoading(false);
    }
  };

  // Enhanced SIGN OUT
  const signOut = async () => {
    try {
      console.log('Signing out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Signed out successfully');
      }
      
      // Clear session storage and state
      clearProfileFromSession();
      setUser(null);
      setProfile(null);
      
    } catch (error) {
      console.error('Sign out exception:', error);
      // Still clear local state
      clearProfileFromSession();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // VALIDATION HELPER
  const validateRegistration = async (
    email: string,
    personalId: string,
    volunteerId?: string
  ) => {
    return await validateRegistrationData(email, personalId, volunteerId);
  };

  // ROLE HELPERS
  const hasRole = useCallback((roles: string | string[]) => {
    if (!profile?.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  }, [profile?.role]);

  // Enhanced role-based redirect with better volunteer role mapping
// Enhanced role-based redirect with ALL volunteer roles mapped to /volunteer
// In AuthContext.tsx - update getRoleBasedRedirect
const getRoleBasedRedirect = useCallback((role?: string) => {
  const r = role || profile?.role;
  
  // Map all volunteer-type roles correctly
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
    // ALL these roles should go to volunteer dashboard
    case "volunteer":
    case "ushers":
    case "marketing":
    case "media": // Make sure media is included
    case "ER":
    case "BD team": // Changed from 'BD' to 'BD team'
    case "catering":
    case "feedback":
    case "stage":
      return "/volunteer";
    default:
      console.warn('Unknown role for redirect:', r);
      return "/login";
  }
}, [profile?.role]);
  // Computed values - Updated logic for authentication
  const isAuthenticated = !!user && sessionLoaded;
  
  console.log('Auth Context State:', {
    hasUser: !!user,
    hasProfile: !!profile,
    loading,
    sessionLoaded,
    isAuthenticated,
    userRole: profile?.role
  });

 return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionLoaded,
        isAuthenticated,
        authActionLoading, // New
        authActionMessage, // New
        signUp,
        signUpVolunteer: signUpVolunteerFunc,
        signIn,
        signOut,
        hasRole,
        getRoleBasedRedirect,
        validateRegistration,
        refreshProfile,
        clearAuthAction, // New
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook with better error handling
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};