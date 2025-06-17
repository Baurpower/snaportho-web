"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function TraumaModulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/learn");
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const scrollToVideo = () => {
    videoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f9f7f4] text-navy">
        <p className="text-lg">Loading Trauma Module...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-12 space-y-16">
      {/* 🧠 Welcome */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-lg py-16 px-8 max-w-5xl mx-auto text-center space-y-6">
        <h1 className="text-5xl font-bold text-[#444]">Welcome to the Trauma Module</h1>
        <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Trauma forms the <strong>bedrock</strong> of orthopedic training — understanding how to classify, manage, and treat injuries is essential for every orthopedic surgeon.
        </p>
        <button
          onClick={scrollToVideo}
          className="bg-[#597498] text-white text-xl sm:text-2xl font-semibold px-10 py-5 rounded-full shadow-lg hover:bg-[#4e6886] transition-all animate-pulse"
        >
          ▶️ Watch the First Video
        </button>
      </section>

      {/* 🚧 Coming Soon */}
      <section className="max-w-5xl mx-auto text-center space-y-4">
        <h2 className="text-3xl font-semibold text-[#444]">Animations In Progress 🚀</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          We’re actively building fully animated content to help you <strong>visually master</strong> fracture patterns, fixation principles, and classifications.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          This module will evolve quickly — check back often!
        </p>
      </section>

      {/* Divider */}
      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      {/* 🔍 Sneak Peek */}
      <section className="max-w-5xl mx-auto text-center space-y-8">
        <h2 className="text-3xl font-semibold text-[#444]">What You’ll Learn 👇</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Fracture Classification",
              text: "Memorable visuals to master every fracture system.",
            },
            {
              title: "Management Principles",
              text: "Clear steps for evaluating and treating trauma patients.",
            },
            {
              title: "Fixation Techniques",
              text: "See modern surgical techniques animated clearly.",
            },
          ].map(({ title, text }) => (
            <div
              key={title}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-6 hover:shadow-lg transition text-left"
            >
              <h3 className="text-xl font-semibold mb-3 text-[#597498]">{title}</h3>
              <p className="text-gray-600 text-md leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 📺 Embedded Video — Now at Bottom */}
      <section
        ref={videoRef}
        className="bg-white border border-gray-200 rounded-xl shadow-lg py-12 px-6 sm:px-12 max-w-6xl mx-auto text-center"
      >
        <h2 className="text-4xl font-semibold text-[#444] mb-8">
          First Learn Video: Distal Radius Fractures
        </h2>
        <div className="w-full" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            className="w-full h-full rounded-xl shadow-md"
            src="https://www.youtube.com/embed/nSqiWf5Z-B0?si=YSovj45MZZWmrz7z"
            title="SnapOrtho Trauma Learn Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto text-center space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          This is just the beginning. SnapOrtho Learn is here to make trauma training more engaging, visual, and intuitive than ever before.
        </p>
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
