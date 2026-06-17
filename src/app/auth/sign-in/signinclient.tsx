// src/app/auth/sign-in/SignInClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Props {
  redirectTo: string;
}

export default function SignInClient({ redirectTo }: Props) {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();

  const safeRedirectTo = redirectTo || "/work";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(safeRedirectTo);
    }
  }, [loading, user, safeRedirectTo, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const { error } = await signIn(email.trim(), password);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.refresh();
    router.replace(safeRedirectTo);
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        {safeRedirectTo.startsWith('/brobot') ? 'Sign in to continue BroBot' : 'Sign In'}
      </h2>

      {errorMsg ? (
        <div className="mb-4 text-sm text-red-600 text-center">
          {errorMsg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />

        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        <Link
          href={{
            pathname: "/auth/password-reset",
            query: { redirectTo: safeRedirectTo },
          }}
          className="text-sky hover:underline"
        >
          Forgot Password?
        </Link>

        <span>
          Don&apos;t have an account?{" "}
          <Link
            href={{
              pathname: "/auth/sign-up",
              query: { redirectTo: safeRedirectTo },
            }}
            className="text-sky hover:underline"
          >
            Sign Up
          </Link>
        </span>
      </div>
    </div>
  );
}
