"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { StudentWorkspaceMobileTabBar } from "@/components/student-workspace/mobile/StudentWorkspaceMobileTabBar";
import { STUDENT_WORKSPACE_BRAND } from "@/components/student-workspace/shell/student-workspace-nav";

const GLOBAL_NAV_HEIGHT = 52;
const MOBILE_HEADER_HEIGHT = 53;

/**
 * Offset for anything that needs to stick directly below the mobile app
 * header (the global site nav plus this shell's own header).
 */
export const MOBILE_STICKY_OFFSET = GLOBAL_NAV_HEIGHT + MOBILE_HEADER_HEIGHT;

/**
 * Mobile app shell for the student workspace.
 *
 * Differences from the desktop chrome, all deliberate for one-handed phone use:
 * - a single compact sticky header instead of a tall hero + duplicated title pill
 * - a real bottom tab bar (no "More" drawer that repeated the same four tabs)
 * - safe-area padding so the tab bar clears the iOS home indicator
 */
export function StudentWorkspaceMobileChrome({
  title,
  description,
  badge,
  actions,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const BrandIcon = STUDENT_WORKSPACE_BRAND.icon;

  return (
    <div className="min-h-[calc(100vh-52px)] w-full bg-slate-100 pt-[52px]">
      <header
        className="sticky z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        style={{ top: GLOBAL_NAV_HEIGHT }}
      >
        {/* Keep this row's height in sync with MOBILE_HEADER_HEIGHT above. */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link
            href="/student-workspace"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"
            aria-label="Student workspace home"
          >
            <BrandIcon className="h-[18px] w-[18px]" />
          </Link>

          <div className="min-w-0 flex-1">
            {badge ? (
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                {badge}
              </p>
            ) : null}
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-slate-950">
              {title}
            </h1>
          </div>

          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </header>

      {/* overflow-x-clip (not hidden) guards against a single wide child making
          the page scroll sideways; unlike hidden it does not create a scroll
          container, so sticky children still work. */}
      <main className="overflow-x-clip px-4 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {description ? (
          <p className="mb-4 text-[13px] leading-5 text-slate-500">{description}</p>
        ) : null}

        {children}
      </main>

      <StudentWorkspaceMobileTabBar />
    </div>
  );
}
