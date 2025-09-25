import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'attendee' | 'volunteer' | 'registration' | 'building' | 'team_leader' | 'admin';
  university?: string;
  faculty?: string;
  phone?: string;
  personal_id?: string;
  score?: number;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  hasRole: (role: string | string[]) => boolean;
  isAuthenticated: boolean;
  getRoleBasedRedirect: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 AuthContext: Starting authentication check...');
    
    // Get initial session
    const getInitialSession = async () => {
      console.log('🔍 AuthContext: Getting initial session...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthContext: Error getting session:', error);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        console.log('📋 AuthContext: Initial session:', session ? 'Found' : 'None');
        
        if (session?.user) {
          console.log('👤 AuthContext: User found, fetching profile for ID:', session.user.id);
          setUser(session.user);
          
          // Always fetch profile and handle the result
          const profileFetched = await fetchUserProfile(session.user.id);
          
          if (!profileFetched) {
            console.log('⚠️ AuthContext: Profile not found, but keeping session');
            // Keep the user session but clear profile
            setProfile(null);
          }
        } else {
          console.log('❌ AuthContext: No user found');
          setUser(null);
          setProfile(null);
        }
        
        console.log('✅ AuthContext: Initial loading complete');
        setLoading(false);
      } catch (error) {
        console.error('💥 AuthContext: Exception in getInitialSession:', error);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 AuthContext: Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        if (session?.user) {
          console.log('👤 AuthContext: Setting user and fetching profile for:', session.user.id);
          setUser(session.user);
          
          const profileFetched = await fetchUserProfile(session.user.id);
          
          if (!profileFetched) {
            console.log('⚠️ AuthContext: Profile not found during auth change');
            setProfile(null);
          }
        } else {
          console.log('🚫 AuthContext: Clearing user and profile');
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 AuthContext: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 AuthContext: Fetching profile for user ID:', userId);
      
      const { data, error } = await supabase
        .from('users_profiles')
        .select(`
          id,
          first_name,
          last_name,
          role,
          university,
          faculty,
          phone,
          personal_id,
          score,
          created_at
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ AuthContext: Error fetching user profile:', error);
        console.error('❌ AuthContext: Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        setProfile(null);
        return false;
      }

      if (data) {
        console.log('✅ AuthContext: Profile fetched successfully:', {
          id: data.id,
          role: data.role,
          name: `${data.first_name} ${data.last_name}`,
          university: data.university,
          faculty: data.faculty
        });
        setProfile(data);
        return true;
      } else {
        console.log('⚠️ AuthContext: No profile data returned');
        setProfile(null);
        return false;
      }
    } catch (error) {
      console.error('💥 AuthContext: Exception in fetchUserProfile:', error);
      setProfile(null);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Attempting sign in for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ AuthContext: Sign in error:', error);
        setLoading(false);
        return { error };
      }

      console.log('✅ AuthContext: Sign in successful for user:', data.user?.id);

      if (data.user) {
        setUser(data.user);
        console.log('👤 AuthContext: Fetching profile after sign in');
        
        const profileFetched = await fetchUserProfile(data.user.id);
        
        if (!profileFetched) {
          console.log('⚠️ AuthContext: Profile not found after sign in');
        }
      }

      setLoading(false);
      return { error: null };
    } catch (error) {
      console.error('💥 AuthContext: Exception in signIn:', error);
      setLoading(false);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 AuthContext: Signing out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        console.log('✅ AuthContext: Sign out successful');
        setUser(null);
        setProfile(null);
      } else {
        console.error('❌ AuthContext: Sign out error:', error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('💥 AuthContext: Exception in signOut:', error);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 AuthContext: Resetting password for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        console.error('❌ AuthContext: Password reset error:', error);
      } else {
        console.log('✅ AuthContext: Password reset email sent');
      }
      
      return { error };
    } catch (error) {
      console.error('💥 AuthContext: Exception in resetPassword:', error);
      return { error };
    }
  };

  const hasRole = (requiredRole: string | string[]): boolean => {
    const result = (() => {
      if (!profile?.role) return false;
      
      if (Array.isArray(requiredRole)) {
        return requiredRole.includes(profile.role);
      }
      
      return profile.role === requiredRole;
    })();
    
    console.log('🔒 AuthContext: Role check:', {
      userRole: profile?.role,
      requiredRole,
      hasAccess: result
    });
    
    return result;
  };

  const getRoleBasedRedirect = (): string => {
    if (!profile?.role) {
      console.log('⚠️ AuthContext: No role found, redirecting to login');
      return '/login';
    }
    
    const redirect = (() => {
      switch (profile.role) {
        case 'attendee':
          return '/attendee';
        case 'volunteer':
          return '/volunteer';
        case 'registration':
          return '/regteam';
        case 'building':
          return '/buildteam';
        case 'team_leader':
          return '/teamleader';
        case 'admin':
          return '/secure-9821panel';
        default:
          return '/attendee';
      }
    })();
    
    console.log('🎯 AuthContext: Role-based redirect:', {
      role: profile.role,
      redirect
    });
    
    return redirect;
  };

  // Modified authentication check - user must have both session AND profile
  const isAuthenticated = !!user && !!profile;

  // Also provide a way to check if user has session but no profile
  const hasSessionButNoProfile = !!user && !profile;

  // Log current state periodically for debugging (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('📊 AuthContext: Current state:', {
        loading,
        hasUser: !!user,
        hasProfile: !!profile,
        isAuthenticated,
        hasSessionButNoProfile,
        userEmail: user?.email,
        profileRole: profile?.role,
        profileName: profile ? `${profile.first_name} ${profile.last_name}` : null
      });
    }, 10000); // Reduced to every 10 seconds

    return () => clearInterval(interval);
  }, [loading, user, profile, isAuthenticated, hasSessionButNoProfile]);

  const contextValue: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    resetPassword,
    hasRole,
    isAuthenticated,
    getRoleBasedRedirect
  };

  console.log('🔄 AuthContext: Rendering with state:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    isAuthenticated,
    hasSessionButNoProfile
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};