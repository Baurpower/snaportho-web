// src/app/learn/home/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

export default function LearnHomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/learn/signin");
  };

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      {/* Header: title + auth status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 space-y-4 md:space-y-0">
        <h1 className="text-4xl md:text-5xl font-bold text-navy">
          Learn Home
        </h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-midnight/80">
          <span>
            Signed in as <strong className="text-navy">{user?.email}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-sky text-white rounded-full hover:bg-sky/90 transition"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Intro Section */}
      <section className="bg-white p-8 md:p-10 rounded-2xl shadow-lg space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-navy">
          Welcome to SnapOrtho’s Learning Library
        </h2>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re building a comprehensive library of high-quality orthopaedics video
          tutorials, designed to take you from basics all the way to mastery.
        </p>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re kicking things off with our first series on{' '}
          <strong>Trauma</strong>. Stay tuned as we add more subspecialties, cases,
          and expert walkthroughs!
        </p>
      </section>
    </main>
  );
}
