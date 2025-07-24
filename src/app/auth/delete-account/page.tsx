"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // 2. Refresh session
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      // 3. Delete user via RPC
      const { error: rpcError } = await supabase.rpc("delete_user");
      if (rpcError) throw rpcError;

      // 4. Sign out
      await supabase.auth.signOut();

      // 5. Confirm deletion
      setSuccess(true);
      setTimeout(() => router.replace("/learn"), 3000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error("Account deletion error:", err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-red-600">
        Delete Account
      </h2>

      {success ? (
        <p className="text-green-600 text-center">
          Your account has been deleted. Redirecting to Learn...
        </p>
      ) : (
        <>
          <p className="mb-4 text-center text-gray-700">
            Enter your email and password to permanently delete your account.
          </p>

          {errorMsg && (
            <div className="mb-4 text-sm text-red-600 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleDelete} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition"
            >
              {isLoading ? "Deleting..." : "Delete My Account"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
