// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  user: any;
  profile: any;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch profile from DB
  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("users_profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (!error && data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  };

  // 🔹 Load session & profile on mount
  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session?.user) {
        setUser(data.session.user);
        await fetchProfile(data.session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    // 🔹 Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // ✅ SIGN UP with profile insert
  const signUp = async (email: string, password: string, profileData: any) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error("SignUp error:", signUpError.message);
      return { data: null, error: signUpError };
    }

    const user = signUpData.user;
    if (user) {
      const { error: profileError } = await supabase.from("users_profiles").insert({
        id: user.id, // must match auth.users.id
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        personal_id: profileData.personal_id,
        faculty: profileData.faculty,
        role: profileData.role || "attendee", // 👈 default role
      });

      if (profileError) {
        console.error("Profile insert error:", profileError.message);
        return { data: null, error: profileError };
      }

      await fetchProfile(user.id);
    }

    return { data: signUpData, error: null };
  };

  // ✅ SIGN IN
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error };

  if (data.user) {
    // Wait for profile to be fetched and state to update
    await fetchProfile(data.user.id);
    setUser(data.user);
    
    // Return success without profile - the useEffect in LoginForm will handle redirect
    return { error: null };
  }

  return { error: null };
};
  
  // ✅ SIGN OUT
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // ✅ ROLE HELPERS
  const hasRole = (roles: string | string[]) => {
    if (!profile?.role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(profile.role);
    }
    return profile.role === roles;
  };

  const getRoleBasedRedirect = (role?: string) => {
    const r = role || profile?.role;
    switch (r) {
      case "admin":
        return "/admin";
      case "superadmin":
        return "/superadmin";
      case "team_leader":
        return "/teamleader";
      case "registration":
        return "/regteam";
      case "volunteer":
        return "/volunteer";
      case "attendee":
        return "/attendee";
      default:
        return "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signOut,
        hasRole,
        getRoleBasedRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
