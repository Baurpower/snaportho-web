// src/app/learn/signin/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";

export default function SignInPage() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already signed in, go straight to Learn Home
  if (user) {
    console.log("Already signed in, redirecting to Learn Home:", user.email);
    router.replace("/learn");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("SignIn attempt:", { email, password });
    setErrorMsg(null);
    try {
      const { data, error } = await signIn(email, password);
      console.log("Supabase signIn response:", { data, error });
      if (error) {
        console.error("SignIn error:", error);
        setErrorMsg(error.message);
      } else {
        console.log("SignIn successful, redirecting to Learn Home");
        router.replace("/learn");
      }
    } catch (err) {
      console.error("Unexpected error during signIn:", err);
      setErrorMsg("Unexpected error—check console for details.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Sign In
      </h2>

      {errorMsg && (
        <div className="mb-4 text-sm text-red-600 text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => {
            console.log("Email input:", e.target.value);
            setEmail(e.target.value);
          }}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => {
            console.log("Password input:", e.target.value);
            setPassword(e.target.value);
          }}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <button
          type="submit"
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Sign In
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link href="/auth/password-reset" className="text-sky hover:underline">
          Forgot Password?
        </Link>
        <span>
          Don’t have an account?{" "}
          <Link href="/auth/signup" className="text-sky hover:underline">
            Sign Up
          </Link>
        </span>
      </div>
    </div>
  );
}
