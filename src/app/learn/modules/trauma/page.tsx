"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient"; // adjust path if needed!

export default function TraumaModulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Not signed in → redirect
        router.replace("/learn");
      } else {
        // Signed in → show page
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f9f7f4] text-navy">
        <p className="text-lg">Loading Trauma Module...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-12 space-y-8">
      {/* Hero */}
      <section className="relative bg-white border border-gray-200 rounded-xl shadow-lg py-16 px-8 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 text-[#444] tracking-tight">
          Trauma Module
        </h1>
        <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Welcome to our first SnapOrtho module. Trauma forms the{" "}
          <strong>bedrock</strong> of orthopedic training — understanding how to classify,
          manage, and treat injuries is essential for every orthopedic surgeon.
        </p>
      </section>

      {/* Animation Section */}
      <section className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-semibold text-[#444]">Animations In Progress 🚀</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          We are actively building out fully animated visual content for this module. Our goal is to help you{" "}
          <strong>visually master</strong> complex fracture patterns, fixation principles, and classifications — all through intuitive, modern animations.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          You’ll see this content <strong>grow and evolve</strong> rapidly — stay tuned!
        </p>
      </section>

      {/* Divider */}
      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      {/* Sneak Peek */}
      <section className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-semibold text-[#444]">Sneak Peek 👀</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Here’s a preview of what’s coming in this module:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {[
            {
              title: "Fracture Classification",
              text: "Helpful symbols to master fracture classifications.",
            },
            {
              title: "Management Principles",
              text: "Learn the key steps in managing trauma patients and deciding on treatment strategies.",
            },
            {
              title: "Visual Animations",
              text: "Watch as fractures and fixation techniques are brought to life through modern animation.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white border border-gray-200 rounded-xl shadow-md p-6 hover:shadow-lg transition cursor-pointer text-left"
            >
              <h3 className="text-xl font-semibold mb-3 text-[#597498]">
                {card.title}
              </h3>
              <p className="text-gray-600 text-md leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      {/* Call to Action */}
      <section className="max-w-5xl mx-auto text-center space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Trauma is the <strong>foundation of orthopedics</strong> — and we are just getting started.
          Be part of this journey as we continue to expand and innovate.
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
