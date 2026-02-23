// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

import Nav from "../components/Nav";
import ClientProvider from "../components/ClientProvider";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://snap-ortho.com"), // ✅ enables proper canonical generation
  title: {
    default: "SnapOrtho",
    template: "%s | SnapOrtho",
  },
  description: "Memorize, Master, Excel in Orthopaedics",
  keywords: [
    "SnapOrtho",
    "orthopaedic education",
    "fracture conference",
    "medical student resources",
    "support medical education",
    "practice x-ray reading",
    "ortho away rotations",
    "fracture classification",
    "orthopaedic trauma",
    "orthopaedic xrays",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "SnapOrtho",
    description:
      "All-in-One Orthopaedic Resources for Medical Students and Residents",
    url: "https://snap-ortho.com",
    siteName: "SnapOrtho",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SnapOrtho App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapOrtho",
    description: "Your orthopaedic study resource.",
    images: ["/og-image.png"],
  },
};

const BRANCH_KEY = process.env.NEXT_PUBLIC_BRANCH_KEY ?? "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Scripts must be in <head> or <body>, not directly under <html> */}
        <Script
          src="https://cdn.branch.io/branch-latest.min.js"
          strategy="beforeInteractive"
        />

        {/* ✅ inline init; avoids referencing process.env inside the string */}
        <Script id="branch-init" strategy="afterInteractive">
          {`
            (function() {
              if (!window.branch) return;

              var key = ${JSON.stringify(BRANCH_KEY)};
              if (!key) {
                console.warn("Branch key missing: NEXT_PUBLIC_BRANCH_KEY");
                return;
              }

              window.branch.init(key, function(err, data) {
                if (err) {
                  console.error("Branch init failed:", err);
                } else {
                  console.log("Branch initialized:", data);
                }
              });
            })();
          `}
        </Script>

        {/* Optional but recommended: helps avoid duplicate URL issues */}
        {/* Next will automatically generate canonical tags once metadataBase exists */}
      </head>

      <body className="flex flex-col min-h-screen bg-cream text-midnight">
        <ClientProvider>
          <Nav />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </ClientProvider>
      </body>
    </html>
  );
}