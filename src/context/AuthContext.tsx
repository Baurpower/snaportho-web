"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import type {
  User,
  AuthError,
  AuthResponse,
} from "@supabase/supabase-js";

type ResetResponse = { data: object | null; error: AuthError | null };

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  resetPassword: (
    email: string,
    options?: { redirectTo?: string }
  ) => Promise<ResetResponse>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
  const loadUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error) setUser(user ?? null);
  };

  // Run immediately on mount
  loadUser();

  // Listen for any auth state changes (login, logout, token refresh)
  const { data: subscription } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );

  return () => {
    subscription.subscription.unsubscribe();
  };
}, []);


  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email: string, password: string) =>
    supabase.auth.signUp({ email, password });

  const resetPassword = (email: string, options?: { redirectTo?: string }) =>
    supabase.auth.resetPasswordForEmail(email, options);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signUp, resetPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
