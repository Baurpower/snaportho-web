import type { ReactNode } from "react";

export function StudentWorkspaceFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-100 via-white to-slate-50 px-4 pb-16 pt-20 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </main>
  );
}
