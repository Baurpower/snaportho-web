'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Video = {
  id: string;
  title: string;
  description: string;
  youtubeURL: string;
  category: string;
  isPreview: boolean;
};

export default function TraumaModuleClient() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/learn');
        return;
      }

      try {
        const res = await fetch('https://api.snap-ortho.com/video-access');
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data: Video[] = await res.json();
        setVideos(data.filter((v) => v.category === 'Trauma'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [router]);

  if (loading) return <LoadingOverlay />;

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fefcf7] text-red-700">
        <p className="text-lg">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] text-[#1A1C2C] px-4 py-12 max-w-5xl mx-auto space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Trauma Module</h1>
        <p className="text-gray-700 max-w-xl mx-auto">
          Dive into fracture classification, management principles, and visual-first ortho learning.
        </p>
      </section>

      <section className="space-y-10">
        {videos.map((video) => {
          const youtubeID =
            new URL(video.youtubeURL).searchParams.get('v') ||
            video.youtubeURL.split('/').pop();

          return (
            <div
              key={video.id}
              className="rounded-xl bg-white shadow border border-gray-200 p-6 space-y-4"
            >
              <h2 className="text-2xl font-semibold">{video.title}</h2>
              <p className="text-gray-600">{video.description}</p>
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-xl"
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
    </main>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-t-4 border-gray-200 border-t-teal-600" />
      <h3 className="text-2xl font-bold text-teal-700 tracking-tight">Loading Trauma Module</h3>
      <p className="mt-2 text-sm text-gray-600">Fetching videos and verifying access...</p>
    </div>
  );
}
