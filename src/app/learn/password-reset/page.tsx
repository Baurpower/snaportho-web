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

    // Exactly the docs call:
    const { error } = await supabase.auth.resetPasswordForEmail('valid.email@supabase.io', {
  redirectTo: 'http://snap-orth.com/update-password',
});

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for the reset link.");
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
