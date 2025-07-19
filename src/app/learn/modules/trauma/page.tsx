"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Video = {
  id: string;
  title: string;
  description: string;
  youtubeURL: string;
  category: string;
  isPreview: boolean;
};

export default function TraumaModulePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/learn");
      } else {
        try {
          const res = await fetch("https://api.snap-ortho.com/video-access");
          if (!res.ok) throw new Error("Failed to fetch videos");
          const data: Video[] = await res.json();
          setVideos(data.filter((v) => v.isPreview));
        } catch (err: unknown) {
  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("An unexpected error occurred");
  }
}
 finally {
          setLoading(false);
        }
      }
    };

    checkAuthAndFetch();
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

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f9f7f4] text-red-600">
        <p className="text-lg">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-12 space-y-16">
      {/* Welcome Section */}
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

      {/* Animations Coming Soon */}
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

      {/* Sneak Peek Section */}
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
              text: "Clear steps for determining management.",
            },
            {
              title: "Other Tested Concepts",
              text: "Our videos include the high-yield commonly tested concepts.",
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

      {/* Video Section */}
      <section ref={videoRef} className="space-y-12 max-w-6xl mx-auto">
        {videos.map((video) => {
          const youtubeID = new URL(video.youtubeURL).searchParams.get("v") || video.youtubeURL.split("/").pop();
          return (
            <div
              key={video.id}
              className="bg-white border border-gray-200 rounded-xl shadow-lg py-12 px-6 sm:px-12 text-center"
            >
              <h2 className="text-4xl font-semibold text-[#444] mb-8">{video.title}</h2>
              <p className="text-md text-gray-600 max-w-3xl mx-auto mb-4">{video.description}</p>
              <div className="w-full" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  className="w-full h-full rounded-xl shadow-md"
                  src={`https://www.youtube.com/embed/${youtubeID}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        })}
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
