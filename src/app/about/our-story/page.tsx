"use client";

import Link from "next/link";

export default function OurStoryPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-20 space-y-24">
      {/* Header */}
      <section className="max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-6xl font-bold text-[#333] tracking-tight">Our Story</h1>
        <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          How SnapOrtho came to be — and where we’re going next.
        </p>
      </section>

      {/* Our Beginning */}
      <section className="max-w-5xl mx-auto text-left space-y-10 text-lg text-gray-700 leading-relaxed">
        <div className="border-l-4 border-[#597498] pl-6">
          <h2 className="text-3xl font-semibold text-[#333] mb-4">Our Beginning</h2>
          <p>
            When I set out to pursue <strong>orthopaedics</strong>, I quickly realized just how little time is devoted to it during medical training. Like many others, I faced a <strong>steep learning curve</strong> and found myself struggling to efficiently absorb the foundational knowledge I needed.
          </p>

          <p>
            The sheer number of <strong>classification systems</strong>, treatment principles, and surgical decision-making frameworks felt overwhelming. I often wished there were a more efficient, structured way to approach this learning — a tool that could help me quickly grasp and retain these concepts.
          </p>

          <p>
            That frustration sparked the idea for SnapOrtho: a resource designed to make learning orthopaedics <strong>faster, clearer, and more practical</strong> — so that future learners wouldn’t have to start from scratch the hard way.
          </p>
        </div>
      </section>

      {/* Our Mission */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-md px-8 py-10 max-w-5xl mx-auto space-y-6 text-lg text-gray-700 leading-relaxed">
        <h2 className="text-3xl font-semibold text-[#333] mb-4 border-b-2 border-[#597498] pb-2">
          Our Mission
        </h2>
        <p>
          Provide a <strong>high-yield, easy-to-use</strong> resource for anyone pursuing orthopaedics.
        </p>

        <p>
          We aim to help you <strong>quickly learn</strong> the concepts that matter most, and understand every step of the process to excel in orthopaedics.
        </p>
      </section>

      {/* Closing CTA */}
      <section className="max-w-4xl mx-auto text-center space-y-6 mt-16">
        <p className="text-xl text-gray-700 leading-relaxed">
          We’re just getting started — and we’re glad you’re here.
        </p>
        <Link
          href="/learn"
          className="inline-block bg-[#597498] text-white px-10 py-5 rounded-full font-semibold hover:bg-[#4e6886] transition text-lg shadow-lg"
        >
          Start Learning
        </Link>
      </section>
    </main>
  );
}
