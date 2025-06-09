// src/app/learn/password-reset/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";


export default function PasswordResetPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Build a full URL for where your user should land
    const redirectTo = `${window.location.origin}/account/update-password`;

    console.log("Initiating reset to:", email, "redirectTo:", redirectTo);

    const { data, error } = await resetPassword(email, { redirectTo });
    console.log("resetPasswordForEmail response:", { data, error });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "If that address exists, you’ll receive an email with a reset link."
      );
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
