"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [message, setMessage]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady]           = useState(false); // wait for session

 useEffect(() => {
  (async () => {
    /* ---------- 1. IMPLICIT flow -------------------------------------- */
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const at = hashParams.get("access_token");
    const rt = hashParams.get("refresh_token");

    if (at && rt) {
      const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      if (error) setMessage(error.message);
      setReady(true);
      return;
    }

    /* ---------- 2. PKCE flow ------------------------------------------ */
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");

    if (code) {
      // v1.35+ and all v2.x expose this helper
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) setMessage(error.message);
      setReady(true);
      return;
    }

    /* ---------- 3. Nothing found -------------------------------------- */
    setMessage("Missing credentials from the reset link.");
    setReady(true);
  })();
}, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("✅ Password updated! Redirecting to Learn…");
      setTimeout(() => router.replace("/learn"), 2000);
    }
  };

  if (!ready) {
    return (
      <main className="flex justify-center items-center h-screen">
        <p className="text-midnight/70">Verifying session…</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-semibold text-center mb-4 text-navy">
        Change Your Password
      </h1>

      {message && (
        <p className="mb-4 text-center text-sm text-midnight/80">{message}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          required
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update Password"}
        </button>
      </form>
    </main>
  );
}
