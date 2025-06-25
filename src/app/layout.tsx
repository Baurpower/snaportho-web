// src/app/layout.tsx
import "./globals.css";
import Nav from "../components/Nav";
import ClientProvider from "../components/ClientProvider";
import Footer from "../components/Footer";

import Script from "next/script"; // ← add

export const metadata = {
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
    "orthopaedic xrays"
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
    description: "Master fracture classification and management.",
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
    description: "Your orthopaedic study companion.",
    images: ["/og-image.png"],
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* ① Load Branch script early */}
      <Script
        src="https://cdn.branch.io/branch-latest.min.js"
        strategy="beforeInteractive"
      />

      {/* ② Run branch.init after script is ready */}
      <Script id="branch-init" strategy="afterInteractive">
        {`
          if (window.branch) {
            branch.init(
              '${process.env.NEXT_PUBLIC_BRANCH_KEY}',
              function(err, data) {
                if (err) {
                  console.error('Branch init failed:', err);
                } else {
                  console.log('Branch initialized:', data);
                }
              }
            );
          }
        `}
      </Script>

      <body className="flex flex-col min-h-screen bg-cream text-midnight">
        <ClientProvider>
          <Nav />

          {/* full-width main with horizontal padding */}
          <main className="flex-1 w-full">{children}</main>

          <Footer />
        </ClientProvider>
      </body>
    </html>
  );
}
