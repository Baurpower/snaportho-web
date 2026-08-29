"use client";

import { usePathname } from "next/navigation";

import ClientProvider from "../components/ClientProvider";
import Footer from "../components/Footer";
import Nav from "../components/Nav";
import BroBotTrafficTracker from "../components/analytics/BroBotTrafficTracker";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMyCasesLanding = pathname === "/mycases/landing";
  const isBroBotChat =
    pathname === "/brobot/chat" || Boolean(pathname?.startsWith("/brobot/chat/"));

  return (
    <ClientProvider>
      <BroBotTrafficTracker />
      {isMyCasesLanding ? (
        <main className="flex-1 w-full">{children}</main>
      ) : (
        <>
          <Nav />
          <main className="flex-1 w-full">{children}</main>
          {isBroBotChat ? null : <Footer />}
        </>
      )}
    </ClientProvider>
  );
}
