'use client';

import Link from 'next/link';
import AccountDropdown from '@/components/accountdropdown';

export default function LearnMember() {
  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-navy">Learn Home</h1>
        <AccountDropdown />
      </div>

      {/* Intro */}
      <section className="bg-white p-8 md:p-10 rounded-2xl shadow-lg space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-navy">
          Welcome to SnapOrtho’s Learning Library
        </h2>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re building a comprehensive library of high-quality orthopaedics video tutorials, designed to take you from basics all the way to mastery.
        </p>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re kicking things off with our first series on <strong>Trauma</strong>.
          Stay tuned as we add more subspecialties, cases, and expert walkthroughs!
        </p>
      </section>

      {/* Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Link
          href="/learn/modules/trauma"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 1: Trauma</h3>
          <p className="text-sm text-midnight/70">Get started with orthopaedic trauma.</p>
        </Link>
        <Link
          href="/learn/modules/oncology"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 2: Oncology</h3>
          <p className="text-sm text-midnight/70">Review oncology before board exams.</p>
        </Link>
      </div>
    </main>
  );
}
