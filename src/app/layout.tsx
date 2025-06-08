// src/app/layout.tsx
import "./globals.css";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata = {
  title: "SnapOrtho",
  description: "Orthopaedic learning, anytime, anywhere",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-cream text-midnight">
        <Nav />

        {/* full-width main with horizontal padding */}
        <main className="flex-1 w-full">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
