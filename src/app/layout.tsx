// app/layout.tsx
import "./globals.css";            // Tailwind imports
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
      <body className="flex flex-col min-h-screen">
        <Nav />
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
