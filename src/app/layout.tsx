// src/app/layout.tsx
import "./globals.css";
import Nav from "../components/Nav";
import ClientProvider from "../components/ClientProvider";
import Footer from "../components/Footer";

export const metadata = {
  title: "SnapOrtho",
  description: "Memorize, Master, Excel in Orthopaedics",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
