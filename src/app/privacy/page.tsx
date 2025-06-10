"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-16 space-y-16">
      {/* Header */}
      <section className="max-w-4xl mx-auto text-center space-y-6 pt-20">
        <h1 className="text-5xl font-bold text-[#333] tracking-tight">Privacy Policy</h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Effective Date: {new Date().getFullYear()}
        </p>
      </section>

      {/* Policy Content */}
      <section className="max-w-4xl mx-auto text-left space-y-12 text-lg text-gray-700 leading-relaxed">
        {/* Introduction */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Introduction</h2>
          <p>
            At SnapOrtho, we respect your privacy and are committed to protecting your personal information. This policy explains how we handle data when you use our app.
          </p>
        </div>

        {/* Information We Collect */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Information We Collect</h2>
          <p>
            We do not collect any personal information at this time.
          </p>
        </div>

        {/* Data Security */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Data Security</h2>
          <p>
            Although we don’t collect personal information, we maintain robust security measures to protect any anonymous data used to improve our app experience. However, no method of transmission over the Internet is 100% secure.
          </p>
        </div>

        {/* Changes to This Policy */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date. Please review this policy periodically.
          </p>
        </div>

        {/* Contact Us */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us at <a href="mailto:alexbaur123@gmail.com" className="text-blue-500 hover:text-blue-600">alexbaur123@gmail.com</a>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto text-center space-y-6 mt-16">
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
