import type { Metadata } from "next";
import Link from "next/link";

const EFFECTIVE_DATE = "June 5, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the SnapOrtho Privacy Policy, including information about account data, subscriptions, Apple In-App Purchases, Stripe billing, analytics, and service providers.",
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] px-6 py-16 text-navy sm:px-10 lg:px-24">
      <section className="mx-auto max-w-4xl space-y-6 pt-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-[#333]">
          Privacy Policy
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
          Effective Date: {EFFECTIVE_DATE}
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-4xl space-y-12 text-lg leading-relaxed text-gray-700">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">1. Overview</h2>
          <p>
            SnapOrtho is an educational platform for orthopaedic learners and
            training programs. This Privacy Policy explains how SnapOrtho and
            MyOrtho Solutions LLC collect, use, disclose, and protect
            information when you use the SnapOrtho website, mobile apps,
            Workspace tools, BroBot features, and related services.
          </p>
          <p>
            SnapOrtho is provided for educational purposes only. SnapOrtho is
            not a medical care provider, does not provide medical treatment, and
            is not a substitute for professional medical judgment.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            2. Information We Collect
          </h2>
          <p>Depending on how you use SnapOrtho, we may collect:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Account and authentication data, such as your name, email
              address, sign-in method, and account identifiers.
            </li>
            <li>
              Profile and educational data, such as training level, program
              affiliation, scheduling details, rotations, call assignments,
              saved preferences, and other information you submit.
            </li>
            <li>
              Subscription and billing data, such as plan selection, billing
              status, renewal dates, transaction references, and customer or
              subscription identifiers from our payment providers.
            </li>
            <li>
              Apple In-App Purchase data, such as the product identifier,
              original transaction identifier, purchase status, and expiration
              information provided through Apple subscription workflows.
            </li>
            <li>
              Device, log, and usage data, such as IP address, browser or app
              version, device type, pages viewed, features used, and diagnostic
              or crash-related information.
            </li>
            <li>
              Deep linking, referral, and attribution data from Branch and
              similar tools used to understand app opens, campaigns, and
              conversion flows.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            3. How We Use Information
          </h2>
          <p>We use information we collect to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Create and manage accounts and authenticate users.</li>
            <li>Operate educational content, scheduling, and app features.</li>
            <li>Provide and manage subscriptions, purchases, and renewals.</li>
            <li>
              Verify Apple In-App Purchases and support Stripe web billing.
            </li>
            <li>Respond to support requests and account questions.</li>
            <li>
              Monitor performance, troubleshoot issues, prevent misuse, and
              improve SnapOrtho products.
            </li>
            <li>
              Comply with legal obligations and enforce our policies and terms.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            4. Payments and Subscription Data
          </h2>
          <p>
            SnapOrtho may offer paid subscriptions, including subscription
            plans such as BroBot Unlimited. Prices and billing periods are shown
            before purchase.
          </p>
          <p>
            If you purchase through Apple, the transaction is processed by
            Apple. We do not receive your full Apple payment card information,
            but we may receive subscription status, product, transaction, and
            renewal-related details needed to provide access and support.
          </p>
          <p>
            If you purchase through the web or another external checkout,
            payments may be processed by Stripe. Stripe may collect payment and
            billing information directly from you under its own terms and
            privacy practices. SnapOrtho may receive limited billing details
            such as customer identifiers, subscription identifiers, payment
            status, and invoice-related metadata.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            5. Analytics, Attribution, and Service Providers
          </h2>
          <p>
            We work with service providers that help us host SnapOrtho, manage
            infrastructure, authenticate users, process subscriptions, measure
            app performance, and support deep linking or attribution.
          </p>
          <p>
            These providers may include hosting and database vendors,
            authentication providers, Apple, Stripe, Branch, and other vendors
            that support core platform operations. They may process information
            on our behalf subject to contractual or legal restrictions.
          </p>
          <p>
            We do not sell personal information and do not share personal
            information with third parties for their own targeted advertising.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            6. Data Sharing
          </h2>
          <p>We may share information only as reasonably necessary to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Operate and secure the SnapOrtho platform.</li>
            <li>Process subscriptions, renewals, and billing support.</li>
            <li>
              Provide analytics, attribution, hosting, authentication, and
              customer support services.
            </li>
            <li>Comply with law, legal process, or enforceable requests.</li>
            <li>
              Protect the rights, safety, and security of SnapOrtho, our users,
              and others.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            7. Data Retention and Storage
          </h2>
          <p>
            We retain information for as long as reasonably necessary to
            provide the service, maintain records, resolve disputes, enforce our
            agreements, and comply with legal obligations.
          </p>
          <p>
            Information may be stored and processed by SnapOrtho and its service
            providers in the United States and other jurisdictions where our
            providers operate.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            8. Your Choices and Rights
          </h2>
          <p>
            You may update certain account information through your account, and
            you may contact us to request account access, correction, or
            deletion, subject to applicable law and legitimate retention needs.
          </p>
          <p>
            Apple subscriptions are managed through your Apple account settings.
            Web subscriptions processed through Stripe are managed separately
            through the applicable checkout or billing portal.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">9. Security</h2>
          <p>
            We use reasonable administrative, technical, and organizational
            safeguards designed to protect information. No system is completely
            secure, and we cannot guarantee absolute security.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            10. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we
            will post the updated version here and revise the effective date.
            Your continued use of SnapOrtho after the updated policy becomes
            effective indicates acceptance of the revised policy.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">11. Contact</h2>
          <p>
            If you have questions about this Privacy Policy or your data, please
            contact us at{" "}
            <a
              href="mailto:support@myortho-solutions.com"
              className="text-blue-500 hover:text-blue-600"
            >
              support@myortho-solutions.com
            </a>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-4xl text-center">
        <Link
          href="/"
          className="inline-block rounded-full bg-[#597498] px-10 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-[#4e6886]"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
