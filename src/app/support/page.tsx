"use client";

import Link from "next/link";
import { useState } from "react";

export default function SupportPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-16 space-y-24">
      {/* Header */}
      <section className="max-w-4xl mx-auto text-center space-y-6 pt-20">
        <h1 className="text-5xl font-bold text-[#333] tracking-tight">Support</h1>
        <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Need help? We’re here for you. Browse our FAQ, or submit a support request below.
        </p>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto space-y-8 text-lg text-gray-700 leading-relaxed">
        <h2 className="text-3xl font-semibold text-[#333] mb-4">Frequently Asked Questions</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-[#444]">Do you collect personal data?</h3>
            <p className="text-gray-700">
              No. Please see our <Link href="/privacy" className="text-blue-500 hover:text-blue-600">Privacy Policy</Link> for full details.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#444]">How can I suggest a feature?</h3>
            <p className="text-gray-700">
              We’d love to hear your ideas! Use the support form below to send us feature suggestions.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#444]">How quickly do you respond to support requests?</h3>
            <p className="text-gray-700">
              We typically respond within 2-3 business days. For urgent issues, please indicate this in your message.
            </p>
          </div>
        </div>
      </section>

      {/* Support Form CTA */}
      <section className="max-w-4xl mx-auto text-center space-y-6">
        <p className="text-xl text-gray-700 leading-relaxed">
          Didn’t find what you were looking for? You can submit a support request below.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-block bg-[#597498] text-white px-10 py-5 rounded-full font-semibold hover:bg-[#4e6886] transition text-lg shadow-lg"
        >
          {showForm ? "Hide Support Form" : "Submit a Support Request"}
        </button>

        {showForm && (
          <div className="mt-8 rounded-lg overflow-hidden shadow-lg border border-gray-200">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSd5EVQlffTLq_iRGHIt5TPvZuClJ_EMzqredZP9xptc0NpPdg/viewform?embedded=true"
              width="100%"
              height="689"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              className="w-full"
            >
              Loading…
            </iframe>
          </div>
        )}
      </section>

      {/* CTA to go back */}
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
