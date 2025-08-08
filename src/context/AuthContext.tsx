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
  Session,
  User,
  AuthChangeEvent,
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
    // 1️⃣ Load the current user on mount
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data.user ?? null);
    };
    loadUser();

    // 2️⃣ Listen for auth state changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
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
