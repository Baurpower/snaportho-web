"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SignUpClient() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const redirectTo = searchParams?.get("redirectTo") || "/";
  const confirmationRedirectTo = `/api/auth/confirm?redirectTo=${encodeURIComponent(redirectTo)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage("Passwords don’t match.");
      return;
    }

    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}${confirmationRedirectTo}`,
        },
      });

      if (signUpError) {
        setMessage(signUpError.message);
      } else {
        setMessage(
          "✅ Check your inbox for a confirmation link to finish creating your account."
        );
      }
    } catch (err) {
      console.error("Sign-up error:", err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Create Your SnapOrtho Account
      </h2>

      {message && (
        <p className="mb-4 text-center text-sm text-midnight/70">{message}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />

        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create password"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />

        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-midnight/70">
        Already have an account?{" "}
        <Link
          href={{
            pathname: "/auth/sign-in",
            query: { redirectTo },
          }}
          className="text-sky hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}