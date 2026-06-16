"use client";

import { usePathname } from "next/navigation";

import ClientProvider from "../components/ClientProvider";
import Footer from "../components/Footer";
import Nav from "../components/Nav";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMyCasesLanding = pathname === "/mycases/landing";

  return (
    <ClientProvider>
      {isMyCasesLanding ? (
        <main className="flex-1 w-full">{children}</main>
      ) : (
        <>
          <Nav />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </>
      )}
    </ClientProvider>
  );
}
