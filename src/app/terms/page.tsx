/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-16 space-y-24">
      {/* Header */}
      <section className="max-w-4xl mx-auto text-center space-y-6 pt-20">
        <h1 className="text-5xl font-bold text-[#333] tracking-tight">Terms of Service</h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Effective Date: {new Date().getFullYear()}
        </p>
      </section>

      {/* Terms Content */}
      <section className="max-w-4xl mx-auto text-left space-y-12 text-lg text-gray-700 leading-relaxed">
        {/* Introduction */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">1. Introduction</h2>
          <p>
            SnapOrtho is a product of MyOrtho Solutions LLC ("we", "us", or "our"). By accessing or using the SnapOrtho application ("SnapOrtho" or "the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
          </p>
        </div>

        {/* Use of the Service */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">2. Use of the Service</h2>
          <p>
            You may use SnapOrtho only for lawful purposes and in accordance with these Terms. You must be at least 18 years of age, or the age of majority in your jurisdiction, to use the App.
          </p>
        </div>

        {/* Intellectual Property */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">3. Intellectual Property</h2>
          <p>
            All content, features, and functionality of SnapOrtho — including but not limited to text, images, animations, videos, educational materials, software code, design, and trademarks — are the exclusive property of MyOrtho Solutions LLC and are protected by U.S. and international copyright, trademark, and intellectual property laws.
          </p>
          <p>
            <strong>You may not copy, reproduce, distribute, transmit, display, publish, or otherwise use any part of SnapOrtho’s content or materials without express written permission from MyOrtho Solutions LLC.</strong> This includes but is not limited to redistribution via screenshots, recordings, downloads, or third-party platforms.
          </p>
          <p>
            Unauthorized use of SnapOrtho’s intellectual property is strictly prohibited and may result in legal action.
          </p>
        </div>

        {/* Educational Purpose Only */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">4. Educational Purpose Only / No Medical Advice</h2>
          <p>
            SnapOrtho is intended for educational purposes only. The content provided through the App is not a substitute for professional medical advice, diagnosis, or treatment.
          </p>
          <p>
            <strong>Nothing in SnapOrtho constitutes or should be interpreted as medical advice.</strong> You must not rely on SnapOrtho to make medical decisions. Always consult a licensed healthcare professional for diagnosis and treatment.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">5. Disclaimer of Warranties</h2>
          <p>
            SnapOrtho is provided on an {"as is"} and {"as available"} basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of the App or its content.
          </p>
        </div>

        {/* Limitation of Liability */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">6. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, MyOrtho Solutions LLC and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation lost profits, data, use, or goodwill arising from or related to your use of SnapOrtho.
          </p>
        </div>

        {/* Changes to Terms */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">7. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will post any changes on this page with an updated effective date. By continuing to use SnapOrtho after such changes, you agree to the revised Terms.
          </p>
        </div>

        {/* Governing Law */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">8. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Commonwealth of Virginia, United States, without regard to its conflict of law principles.
          </p>
        </div>

        {/* Contact Us */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">9. Contact Us</h2>
          <p>
            If you have any questions or concerns about these Terms, please contact us at <a href="mailto:alexbaur123@gmail.com" className="text-blue-500 hover:text-blue-600">alexbaur123@gmail.com</a>.
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
