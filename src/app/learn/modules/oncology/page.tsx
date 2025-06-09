"use client";

import Link from "next/link";

export default function OncologyModulePage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-12 space-y-12">
      {/* Hero */}
      <section className="relative bg-white border border-gray-200 rounded-xl shadow-lg py-16 px-8 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6 text-[#444] tracking-tight">
          Oncology Module
        </h1>
        <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
          We’re incredibly excited to bring you our Orthopaedic Oncology module — built to help you efficiently <strong>master the high-yield concepts</strong> most commonly tested on the <strong>OITE</strong> and <strong>Orthopaedic Boards</strong>.
        </p>
      </section>

      {/* Animation Section */}
      <section className="max-w-5xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-semibold text-[#444]">Optimized for Memorization 🎓</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          This module will be designed as your go-to resource for <strong>visual mnemonics</strong>, <strong>high-yield review</strong>, and <strong>board-relevant patterns</strong> — not just another text-heavy reference.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Our animations and tools will help you retain complex tumor characteristics, staging systems, and treatment principles — for both clinical use and exam success.
        </p>
      </section>

      {/* Divider */}
      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      {/* Updates Section */}
      <section className="max-w-5xl mx-auto text-center space-y-6">
  <h2 className="text-3xl font-semibold text-[#444]">Development Timeline 📅</h2>
  <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
    Our Oncology Module is in the <strong>early stages of development</strong> and will follow the launch of our Trauma Module. We are taking extra time to ensure this module meets the highest standards for accuracy, clarity, and visual design.
  </p>
  <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
    <strong>Updates to follow.</strong> We’ll share progress milestones and sneak previews as development advances.
  </p>
</section>


      {/* Divider */}
      <div className="h-px bg-gray-200 max-w-5xl mx-auto"></div>

      {/* Call to Action */}
      <section className="max-w-5xl mx-auto text-center space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          We’re committed to making SnapOrtho Oncology a world-class learning experience — and we can’t wait to share it with you soon.
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
