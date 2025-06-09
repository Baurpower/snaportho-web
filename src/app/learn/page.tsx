// src/app/learn/page.tsx
"use client";

import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function LearnPage() {
  const { user } = useAuth();

  // If not signed in, show nothing (or loader)
  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6 text-navy">Learn</h1>
      <p className="text-base text-midnight/80 mb-8">
        Welcome back, <strong className="text-navy">{user.email}</strong>!
      </p>
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
    </main>
  );
}
