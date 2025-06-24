'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FundPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <section className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Support SnapOrtho</h1>
        <p className="text-lg mb-6">Your donation helps us empower the next generation of surgeons.</p>
        <a href="/donate" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Donate Now
        </a>
      </section>

      {/* Mission */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
        <p>At SnapOrtho, we’re dedicated to building visual, engaging, and clinically relevant tools to help medical students and residents thrive in orthopaedics.</p>
      </section>

      {/* Story */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">Our Story</h2>
        <p>SnapOrtho began as a frustration with memorizing eponyms and a vision for interactive, image-based learning. Since launch, it’s grown from a solo side project into a tool hundreds rely on during their orthopaedic away rotations.</p>
      </section>

      {/* Success */}
      <section className="mb-10 bg-gray-100 p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Our Success So Far</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>300+</strong> downloads</li>
          <li><strong>50+</strong> active accounts</li>
        </ul>
      </section>

      {/* Donation Impact */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-2">How Your Donation Helps</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Developing new app features to enhance user experience</li>
          <li>Expanding the Learn video library</li>
          <li>Adding more X-ray cases to the Practice section</li>
          <li>Creating new tools and resources for medical education</li>
          <li>Advertising to reach underserved learners</li>
        </ul>
      </section>

      {/* Stripe Donation */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Make a Donation</h2>
        <p className="mb-4">100% of your donation goes directly into development and educational content.</p>
        <a href="https://your-stripe-donation-link.com" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Donate via Stripe
        </a>
      </section>

      {/* Contact */}
      <section className="text-sm text-center text-gray-500">
        Have questions or want to collaborate? Email us at <a className="underline" href="mailto:support@snap-ortho.com">support@snap-ortho.com</a>
      </section>
    </main>
  );
}
