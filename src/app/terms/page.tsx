/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";

const EFFECTIVE_DATE = "June 5, 2026";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Read the SnapOrtho Terms of Use, including educational-use limitations, subscription terms, Apple auto-renewable subscription language, Stripe billing terms, and legal disclaimers.",
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] px-6 py-16 text-navy sm:px-10 lg:px-24">
      <section className="mx-auto max-w-4xl space-y-6 pt-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-[#333]">
          Terms of Use
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
          Effective Date: {EFFECTIVE_DATE}
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-4xl space-y-12 text-lg leading-relaxed text-gray-700">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            1. Agreement to These Terms
          </h2>
          <p>
            SnapOrtho is a product of MyOrtho Solutions LLC. These Terms of Use
            govern your access to and use of the SnapOrtho website, mobile
            applications, educational content, Workspace tools, BroBot features,
            and related services.
          </p>
          <p>
            By accessing or using SnapOrtho, you agree to these Terms. If you
            do not agree, do not use SnapOrtho.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            2. Educational Use Only
          </h2>
          <p>
            SnapOrtho is intended solely for educational and informational use.
            It is not medical advice, diagnosis, or treatment, and it is not a
            substitute for professional judgment.
          </p>
          <p>
            Your use of SnapOrtho does not create a physician-patient
            relationship, provider-patient relationship, or any other clinical
            duty between you and SnapOrtho or MyOrtho Solutions LLC.
          </p>
          <p>
            SnapOrtho is not a hospital, clinic, medical practice, or medical
            care provider.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            3. Eligibility and User Responsibilities
          </h2>
          <p>
            You must be legally able to enter into this agreement and comply
            with applicable law to use SnapOrtho. You are responsible for the
            accuracy of information you submit and for your use of the platform.
          </p>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use SnapOrtho for unlawful, harmful, or deceptive purposes.</li>
            <li>
              Rely on SnapOrtho as a substitute for medical, legal, or other
              professional advice.
            </li>
            <li>
              Interfere with platform security, scrape content, reverse
              engineer, or attempt unauthorized access.
            </li>
            <li>
              Share content or account access in a way that violates these Terms
              or applicable law.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            4. Accounts and Access
          </h2>
          <p>
            Some features require an account. You are responsible for
            maintaining the confidentiality of your login credentials and for
            activity that occurs through your account.
          </p>
          <p>
            We may suspend or restrict access if we believe your account is
            being used in violation of these Terms, poses a security risk, or
            is required by law.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            5. Subscription Terms
          </h2>
          <p>
            SnapOrtho may offer paid subscriptions, including plans such as
            BroBot Unlimited. Available prices, features, and billing periods
            are presented before purchase.
          </p>
          <p>
            Some subscriptions renew automatically unless canceled before the
            end of the current billing period. The timing of charges, renewal
            intervals, and pricing shown at checkout control the subscription
            you purchase.
          </p>
          <p>
            Promotional offers, trial periods, or plan options may change or be
            discontinued at any time unless prohibited by law.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            6. Apple App Store Purchases
          </h2>
          <p>
            If you subscribe through the iOS app, payment is charged to your
            Apple ID account at confirmation of purchase.
          </p>
          <p>
            Apple App Store subscriptions automatically renew unless auto-renew
            is turned off at least 24 hours before the end of the current
            period. Your account will be charged for renewal within the 24
            hours before the end of the current period at the price shown to
            you before purchase.
          </p>
          <p>
            You can manage or cancel Apple subscriptions in your Apple account
            settings after purchase. If supported in the app, you may also use a
            restore purchases function to refresh access associated with prior
            Apple purchases.
          </p>
          <p>
            Apple billing, refunds, and payment methods are handled by Apple
            under Apple&apos;s terms and policies.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            7. Web and Stripe Purchases
          </h2>
          <p>
            If you subscribe through the web or another external checkout,
            payment processing may be handled by Stripe. Stripe may collect your
            payment details directly under its own agreements and privacy
            practices.
          </p>
          <p>
            Web or Stripe subscriptions are managed separately from Apple
            subscriptions. Canceling a Stripe or web subscription does not
            cancel an Apple subscription, and canceling an Apple subscription
            does not cancel a Stripe or web subscription.
          </p>
          <p>
            Unless otherwise stated at checkout, web subscriptions may also
            renew automatically until canceled in the applicable billing portal
            or through the process presented at purchase.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            8. Cancellation and Access
          </h2>
          <p>
            If you cancel, you generally retain access through the end of the
            current paid period unless otherwise stated at the time of purchase
            or required by law.
          </p>
          <p>
            Deleting the app does not automatically cancel a subscription.
            Subscription management must be completed through the platform where
            the subscription was purchased.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            9. Intellectual Property
          </h2>
          <p>
            SnapOrtho and its content, software, text, graphics, design,
            educational materials, trademarks, and related materials are owned
            by MyOrtho Solutions LLC or its licensors and are protected by
            intellectual property laws.
          </p>
          <p>
            You may not copy, reproduce, distribute, sell, publicly display,
            republish, or create derivative works from SnapOrtho content except
            as expressly permitted in writing.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            10. Acceptable Use and Termination
          </h2>
          <p>
            We may suspend, limit, or terminate access to SnapOrtho if we
            reasonably believe you violated these Terms, created risk or harm,
            misused the platform, or if continued access is not operationally
            feasible.
          </p>
          <p>
            Sections that by their nature should survive termination will
            survive, including intellectual property, disclaimers, limitation of
            liability, and dispute-related provisions.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            11. Disclaimers
          </h2>
          <p>
            SnapOrtho is provided on an "as is" and "as available" basis. To
            the fullest extent permitted by law, we disclaim warranties of any
            kind, whether express, implied, or statutory, including implied
            warranties of merchantability, fitness for a particular purpose,
            non-infringement, accuracy, and availability.
          </p>
          <p>
            We do not guarantee that SnapOrtho will be uninterrupted, error
            free, secure, or suitable for your specific educational or clinical
            needs.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            12. Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, MyOrtho Solutions LLC and
            its affiliates, officers, employees, contractors, and licensors will
            not be liable for any indirect, incidental, consequential, special,
            exemplary, or punitive damages, or for any loss of profits,
            revenues, data, goodwill, or business opportunities arising out of
            or related to your use of SnapOrtho.
          </p>
          <p>
            To the extent liability cannot be disclaimed, our total liability
            for claims arising out of or relating to SnapOrtho will be limited
            to the amount you paid us for the applicable service during the
            twelve months before the event giving rise to the claim.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            13. Changes to These Terms
          </h2>
          <p>
            We may update these Terms from time to time. When we do, we will
            post the updated version here and revise the effective date.
            Continued use of SnapOrtho after the updated Terms become effective
            means you accept the revised Terms.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">14. Contact</h2>
          <p>
            If you have questions about these Terms, please contact us at{" "}
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
