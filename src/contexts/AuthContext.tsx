// src/contexts/AuthContext.tsx - DEBUG VERSION
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: any;
  loading: boolean;
  isAuthenticated: boolean;
  sessionLoaded: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  console.log('🔄 AuthProvider render:', { loading, sessionLoaded, user: user?.id });

  // Simple profile fetch
  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching profile for:', userId);
      const { data, error } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.log('❌ Profile fetch error:', error.message);
        return null;
      }

      console.log('✅ Profile found:', { id: data.id, role: data.role });
      return data;
    } catch (error) {
      console.log('💥 Profile fetch exception:', error);
      return null;
    }
  };

  // Initialize auth - SIMPLIFIED
  useEffect(() => {
    console.log('🚀 AuthProvider mounted - starting initialization');
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Step 1: Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.log('❌ Session error:', error);
          if (mounted) {
            setLoading(false);
            setSessionLoaded(true);
          }
          return;
        }

        console.log('🔐 Step 2: Session result:', session ? `User: ${session.user.id}` : 'No session');

        if (session?.user && mounted) {
          console.log('👤 Step 3: User found, fetching profile...');
          setUser(session.user);
          
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
            setLoading(false);
            setSessionLoaded(true);
            console.log('✅ Initialization complete with user');
          }
        } else {
          console.log('🚫 Step 3: No user found');
          if (mounted) {
            setLoading(false);
            setSessionLoaded(true);
            console.log('✅ Initialization complete without user');
          }
        }

      } catch (error) {
        console.log('💥 Initialization error:', error);
        if (mounted) {
          setLoading(false);
          setSessionLoaded(true);
          console.log('✅ Initialization complete after error');
        }
      }
    };

    initializeAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🎧 Auth state change:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider unmounting');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    profile,
    loading,
    isAuthenticated,
    sessionLoaded,
    signOut,
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