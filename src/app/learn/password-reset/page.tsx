// src/app/learn/password-reset/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    console.log("Attempting password reset for:", email);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://snaportho.com/learn/update-password',
      });
      console.log("resetPasswordForEmail response:", { data, error });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Check your email for the reset link.");
      }
    } catch (err) {
      console.error("Unexpected error during password reset:", err);
      setMessage("An unexpected error occurred. See console for details.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Reset Password
      </h2>

      {message && (
        <p className="mb-4 text-center text-sm text-midnight/70">{message}</p>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <button
          type="submit"
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Send Reset Link
        </button>
      </form>
    </div>
  );
}
