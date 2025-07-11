// src/app/learn/signup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

export default function SignUpPage() {
  // Hooks always first
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const { signUp, user } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (user) {
      router.replace("/learn");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    const response = await signUp(email, password);
    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Check your email to confirm your account!");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Sign Up
      </h2>
      {message && (
        <p className="mb-4 text-center text-sm text-midnight/70">{message}</p>
      )}
      {attempted && (
        <div className="mb-4 text-center">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-sky text-white rounded-full hover:bg-sky/90 transition"
          >
            Resend confirmation email
          </button>
        </div>
      )}
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
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <button
          type="submit"
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Create Account
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have one?{" "}
        <a href="/learn/signin" className="text-sky hover:underline">
          Sign In
        </a>
      </p>
    </div>
  );
}
