// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  user: any;
  loading: boolean;
  signUp: (email: string, password: string, profileData: any) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

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
        role: profileData.role || "attendee", // default role if none passed
      });

      if (profileError) {
        console.error("Profile insert error:", profileError.message);
        return { data: null, error: profileError };
      }
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

  let profile = null;
  if (data.user) {
    const { data: profileData } = await supabase
      .from("users_profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    profile = profileData;
    setProfile(profile);
  }

  setUser(data.user);
  return { error: null, profile };
};

  // ✅ SIGN OUT
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
