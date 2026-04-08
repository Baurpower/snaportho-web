"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function OncologyModulePage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user === null) {
      router.replace("/learn");
    }
  }, [user, router]);

  if (user === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f9f7f4] text-navy">
        <p className="text-lg">Loading Oncology Module...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-12 space-y-12">
      <section className="relative bg-white border border-gray-200 rounded-xl shadow-lg py-16 px-8 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 text-[#444] tracking-tight">
          Oncology Module
        </h1>
        <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
          We’re incredibly excited to bring you our Orthopaedic Oncology module — built to help you efficiently{" "}
          <strong>master the high-yield concepts</strong> most commonly tested on the <strong>OITE</strong> and <strong>Orthopaedic Boards</strong>.
        </p>
      </section>

      <section className="max-w-5xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-semibold text-[#444]">Optimized for Memorization 🎓</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          This module will be designed as your go-to resource for{" "}
          <strong>visual mnemonics</strong>, <strong>high-yield review</strong>, and{" "}
          <strong>board-relevant patterns</strong>.
        </p>
      </section>

      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      <section className="max-w-5xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-semibold text-[#444]">Development Timeline 📅</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Early development stage — launching after Trauma Module.
        </p>
      </section>

      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      <section className="max-w-5xl mx-auto text-center space-y-6">
        <Link
          href="/learn"
          className="inline-block bg-[#597498] text-white px-8 py-4 rounded-xl font-medium hover:bg-[#4e6886] transition text-lg"
        >
          Back to Learn
        </Link>
      </section>
    </main>
  );
}