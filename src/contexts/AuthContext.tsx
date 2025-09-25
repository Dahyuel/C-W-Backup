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
          setLoading(false);
          return;
        }
        
        console.log('📋 AuthContext: Initial session:', session ? 'Found' : 'None');
        console.log('📋 AuthContext: Session details:', {
          userId: session?.user?.id,
          email: session?.user?.email,
          role: session?.user?.role
        });
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 AuthContext: User found, fetching profile for ID:', session.user.id);
          await fetchUserProfile(session.user.id);
        } else {
          console.log('❌ AuthContext: No user found');
        }
        
        console.log('✅ AuthContext: Initial loading complete');
      } catch (error) {
        console.error('💥 AuthContext: Exception in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 AuthContext: Auth state changed:', event, session ? 'Session exists' : 'No session');
        console.log('🔔 AuthContext: Event details:', {
          event,
          userId: session?.user?.id,
          email: session?.user?.email
        });
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 AuthContext: Fetching profile for user:', session.user.id);
          await fetchUserProfile(session.user.id);
        } else {
          console.log('🚫 AuthContext: Clearing profile');
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

  const fetchUserProfile = async (userId: string) => {
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
        
        // Don't set loading to false here, let the parent handle it
        return;
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
      } else {
        console.log('⚠️ AuthContext: No profile data returned');
        setProfile(null);
      }
    } catch (error) {
      console.error('💥 AuthContext: Exception in fetchUserProfile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ AuthContext: Sign in error:', error);
        return { error };
      }

      console.log('✅ AuthContext: Sign in successful for user:', data.user?.id);

      if (data.user) {
        console.log('👤 AuthContext: Fetching profile after sign in');
        await fetchUserProfile(data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('💥 AuthContext: Exception in signIn:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 AuthContext: Signing out...');
      
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        console.log('✅ AuthContext: Sign out successful');
        setUser(null);
        setProfile(null);
      } else {
        console.error('❌ AuthContext: Sign out error:', error);
      }
    } catch (error) {
      console.error('💥 AuthContext: Exception in signOut:', error);
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

  const isAuthenticated = !!user && !!profile;

  // Log current state periodically for debugging
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('📊 AuthContext: Current state:', {
        loading,
        hasUser: !!user,
        hasProfile: !!profile,
        isAuthenticated,
        userEmail: user?.email,
        profileRole: profile?.role,
        profileName: profile ? `${profile.first_name} ${profile.last_name}` : null
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, user, profile, isAuthenticated]);

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
    isAuthenticated
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