// src/app/learn/page.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LearnPage() {
  const { user } = useAuth();
  const router = useRouter();

  // If you want to auto-redirect logged-out users away:
  // useEffect(() => {
  //   if (!user) router.replace("/learn/signin");
  // }, [user, router]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6 text-navy">Learn</h1>

      {!user ? (
        <div className="bg-white rounded-2xl shadow-md p-8 text-center">
          <p className="mb-6 text-midnight/80">
            You need an account to access the learning modules.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/learn/signin"
              className="flex-1 py-3 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
            >
              Sign In
            </Link>
            <Link
              href="/learn/signup"
              className="flex-1 py-3 border-2 border-sky text-sky rounded-full font-medium hover:bg-sky/10 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-base text-midnight/80">
            Welcome back, <span className="font-semibold">{user.email}</span>!
          </p>
          {/* TODO: replace with your module list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/learn/module/1"
              className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-1">Module 1: Basics</h2>
              <p className="text-sm text-midnight/70">Get started with core concepts.</p>
            </Link>
            <Link
              href="/learn/module/2"
              className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-1">Module 2: Advanced</h2>
              <p className="text-sm text-midnight/70">Deep dive into advanced topics.</p>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
