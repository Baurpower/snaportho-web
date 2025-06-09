// src/app/learn/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LearnPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Redirect to signin if not logged in
  if (!user) {
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
              href="/learn/signin"
              className="flex-1 py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
            >
              Sign In
            </Link>
            <Link
              href="/learn/signup"
              className="flex-1 py-2 border-2 border-sky text-sky rounded-full font-medium hover:bg-sky/10 transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Logged-in dashboard
  const handleLogout = async () => {
    await signOut();
    router.push("/learn/signin");
  };

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 space-y-4 md:space-y-0">
        <h1 className="text-4xl md:text-5xl font-bold text-navy">Learn Home</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-midnight/80">
          <span>
            Signed in as <strong className="text-navy">{user.email}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-sky text-white rounded-full hover:bg-sky/90 transition"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Intro */}
      <section className="bg-white p-8 md:p-10 rounded-2xl shadow-lg space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-navy">
          Welcome to SnapOrtho’s Learning Library
        </h2>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re building a comprehensive library of high-quality orthopaedics video
          tutorials, designed to take you from basics all the way to mastery.
        </p>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re kicking things off with our first series on <strong>Trauma</strong>.
          Stay tuned as we add more subspecialties, cases, and expert walkthroughs!
        </p>
      </section>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Link
          href="/learn/module/1"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 1: Basics</h3>
          <p className="text-sm text-midnight/70">Get started with core concepts.</p>
        </Link>
        <Link
          href="/learn/module/2"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 2: Advanced</h3>
          <p className="text-sm text-midnight/70">Deep dive into advanced topics.</p>
        </Link>
      </div>
    </main>
  );
}
