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
            We collect limited non-personal data to help us understand how the app is used. This includes device identifiers, general usage behavior, and interaction metrics. We use this data solely to improve functionality, performance, and user experience. We do not collect or store personally identifiable information.
          </p>
        </div>

        {/* Data Security */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Data Security</h2>
          <p>
            We take data security seriously and implement technical measures to protect any collected information. While we do not collect personal data, the usage data we gather is stored securely and used only to optimize app features and performance. Please note that no internet transmission is ever 100% secure.
          </p>
        </div>

        {/* How We Use Your Data */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">How We Use Your Data</h2>
          <div>
            <p>The usage data we collect helps us:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Improve user experience through personalized notifications</li>
              <li>Improve app stability and performance</li>
              <li>Plan future updates based on actual user needs</li>
            </ul>
            <p className="mt-2">We do not use this data for marketing or advertising purposes.</p>
          </div>
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
            If you have any questions or concerns about this Privacy Policy, please contact us at{" "}
            <a href="mailto:alexbaur123@gmail.com" className="text-blue-500 hover:text-blue-600">
              support@myortho-solutions.com
            </a>.
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
