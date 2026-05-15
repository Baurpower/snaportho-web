"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4] text-navy px-6 sm:px-10 lg:px-24 py-16 space-y-16">
      <section className="max-w-4xl mx-auto text-center space-y-6 pt-20">
        <h1 className="text-5xl font-bold text-[#333] tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
          Effective Date: {new Date().getFullYear()}
        </p>
      </section>

      <section className="max-w-4xl mx-auto text-left space-y-12 text-lg text-gray-700 leading-relaxed">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Introduction</h2>
          <p>
            At SnapOrtho, we respect your privacy and are committed to
            protecting your information. This Privacy Policy explains how we
            collect, use, store, and protect information when you use SnapOrtho,
            SnapOrtho Workspace, and related products.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Information We Collect
          </h2>
          <p>
            SnapOrtho may collect limited account, profile, scheduling, device,
            and usage information necessary to operate the platform, provide
            requested features, improve performance, troubleshoot issues, and
            enhance user experience.
          </p>
          <p>
            Depending on the product and features used, this may include account
            identifiers, authentication information, residency program
            membership information, schedule data, rotation assignments, call
            assignments, time-off information, and application interaction
            metrics.
          </p>
          <p>
            We do not sell personal information or use collected information for
            third-party advertising purposes.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Google OAuth and Google Calendar Integration
          </h2>
          <p>
            SnapOrtho Workspace offers optional Google Calendar integration to
            help residency program members synchronize orthopaedic call
            schedules, rotations, approved time-off events, and other
            Workspace-generated scheduling events with their connected Google
            Calendar.
          </p>
          <p>
            SnapOrtho Workspace is the only SnapOrtho product that requests
            Google Calendar access. The SnapOrtho mobile app and MyCases mobile
            app may use Google OAuth for authentication and sign-in purposes,
            but they do not request or access Google Calendar data.
          </p>
          <p>
            When a user chooses to connect Google Calendar, SnapOrtho Workspace
            may create, update, synchronize, and delete calendar events generated
            by the Workspace scheduling system. Calendar access is used only to
            provide scheduling synchronization requested by the user.
          </p>
          <p>
            Users may disconnect Google Calendar integration at any time within
            Workspace settings or through their Google Account permissions page.
            When disconnected, synchronization stops and SnapOrtho-generated
            calendar events may be removed from the connected Google Calendar.
          </p>
          <p>
            Google Calendar data is never sold, shared for advertising purposes,
            or used for marketing. We do not use Google user data to train
            artificial intelligence or machine learning models.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Google API Limited Use Disclosure
          </h2>
          <p>
            SnapOrtho’s use and transfer of information received from Google
            APIs adheres to the Google API Services User Data Policy, including
            the Limited Use requirements.
          </p>
          <p>
            Google user data accessed through SnapOrtho Workspace is used only
            to provide or improve user-facing scheduling synchronization
            features that users authorize.
          </p>
          <p>
            You can review Google’s policy here:{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              Google API Services User Data Policy
            </a>
            .
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            How We Use Your Data
          </h2>
          <div>
            <p>Information collected by SnapOrtho may be used to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide account authentication and user access</li>
              <li>Operate Workspace scheduling and calendar sync features</li>
              <li>Display residency schedules, rotations, and call assignments</li>
              <li>Improve app stability, performance, and user experience</li>
              <li>Troubleshoot technical issues</li>
              <li>Plan future updates based on user needs</li>
            </ul>
            <p className="mt-2">
              We do not use user data for third-party advertising or resale.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Data Sharing
          </h2>
          <p>
            We do not sell user information. We may share limited information
            with service providers only as necessary to operate SnapOrtho
            products, provide authentication, host application services, process
            authorized calendar synchronization, maintain security, and support
            platform functionality.
          </p>
          <p>
            Google Calendar data accessed through Workspace is not shared with
            third parties for advertising, marketing, or unrelated purposes.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Data Retention and Deletion
          </h2>
          <p>
            We retain information only as long as reasonably necessary to
            provide SnapOrtho services, comply with legal obligations, resolve
            disputes, and maintain platform security.
          </p>
          <p>
            Calendar access remains active only while a user maintains the
            Workspace Google Calendar connection. Users may disconnect Google
            Calendar integration at any time. After disconnection, future
            synchronization stops and SnapOrtho-generated calendar events may be
            removed from the connected calendar.
          </p>
          <p>
            Users may contact us to request deletion of account-related
            information, subject to legal, security, and operational retention
            requirements.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Data Security
          </h2>
          <p>
            We implement reasonable technical and organizational safeguards
            designed to protect user information and connected account data.
            Access to Google user data is limited to authorized functionality
            necessary for Workspace scheduling synchronization.
          </p>
          <p>
            Although we take security seriously, no method of internet
            transmission or electronic storage is completely secure.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">
            Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes
            will be posted on this page with an updated effective date. Please
            review this policy periodically.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#333]">Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy,
            please contact us at{" "}
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