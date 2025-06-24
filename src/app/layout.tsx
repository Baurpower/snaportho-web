// src/app/layout.tsx
import "./globals.css";
import Nav from "../components/Nav";
import ClientProvider from "../components/ClientProvider";
import Footer from "../components/Footer";

import Script from "next/script"; // ← add

export const metadata = {
  title: "SnapOrtho",
  description: "Memorize, Master, Excel in Orthopaedics",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
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
