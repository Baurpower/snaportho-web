"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const prepareRecoverySession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));

        // Preferred SSR / PKCE flow: ?code=...
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (!isMounted) return;

          if (error) {
            console.error("Code exchange failed:", error.message);
            setMessage("Could not verify your reset link. Please request a new one.");
          } else {
            // Clean URL after successful exchange
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          setReady(true);
          return;
        }

        // Fallback for older implicit-style links: #access_token=...&refresh_token=...
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!isMounted) return;

          if (error) {
            console.error("Session setup failed:", error.message);
            setMessage("Could not verify your reset link. Please request a new one.");
          } else {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          setReady(true);
          return;
        }

        // If a recovery session already exists, allow password update
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          setReady(true);
          return;
        }

        setMessage("Missing or expired recovery credentials in the email link.");
        setReady(true);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setMessage("Something went wrong while verifying your reset link.");
          setReady(true);
        }
      }
    };

    prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

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
      return;
    }

    setMessage("✅ Password updated! Redirecting...");
    router.refresh();
    setTimeout(() => router.replace("/learn"), 1200);
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