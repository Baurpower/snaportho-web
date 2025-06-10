"use client";

import Link from "next/link";
import { FaInstagram, FaEnvelope, FaTwitter } from "react-icons/fa";

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-16 flex flex-col items-center justify-center space-y-16">
      {/* Header */}
      <section className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-[#333] tracking-tight">Contact Us</h1>
        <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Stay connected with SnapOrtho. Follow us, reach out, and be part of our growing community.
        </p>
      </section>

      {/* Social & Contact Links */}
      <section className="flex flex-col sm:flex-row sm:space-x-8 space-y-6 sm:space-y-0 items-center justify-center">
        {/* Instagram */}
        <Link
          href="https://www.instagram.com/snaportho/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-4 bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-8 py-5 rounded-full font-semibold text-lg shadow-lg hover:scale-105 transition-transform"
        >
          <FaInstagram className="text-2xl" />
          <span>Follow on Instagram</span>
        </Link>

        {/* X (Twitter) */}
        <Link
          href="https://x.com/SnapOrtho"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-4 bg-black text-white px-8 py-5 rounded-full font-semibold text-lg shadow-lg hover:scale-105 transition-transform"
        >
          <FaTwitter className="text-2xl" />
          <span>Follow on X</span>
        </Link>

        {/* Email */}
        <Link
          href="mailto:alexbaur123@gmail.com"
          className="flex items-center space-x-4 bg-[#597498] text-white px-8 py-5 rounded-full font-semibold text-lg shadow-lg hover:scale-105 transition-transform"
        >
          <FaEnvelope className="text-2xl" />
          <span>Email Us</span>
        </Link>
      </section>

      {/* CTA Back */}
      <section className="text-center space-y-6">
        <Link
          href="/"
          className="inline-block bg-[#597498] text-white px-10 py-5 rounded-full font-semibold hover:bg-[#4e6886] transition text-lg shadow-lg"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
