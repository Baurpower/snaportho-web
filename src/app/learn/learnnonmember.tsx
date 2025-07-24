// src/app/learn/LearnNonMember.tsx
'use client';

import Link from "next/link";

export default function LearnNonMember() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
        <h2 className="text-2xl font-semibold mb-4 text-navy">
          Welcome to Learn
        </h2>
        <p className="text-midnight/80 mb-6">
          You need an account to access our orthopaedics modules.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/sign-in"
            className="flex-1 py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="flex-1 py-2 border-2 border-sky text-sky rounded-full font-medium hover:bg-sky/10 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
