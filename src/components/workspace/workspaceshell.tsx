"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftOpen } from "lucide-react";
import { WorkspaceSidebar } from "@/components/workspace/workspacesidebar";

const SIDEBAR_HIDDEN_KEY = "snaportho-workspace-sidebar-hidden";
const TOP_NAV_HEIGHT = 52;

function shouldAutoHideSidebar(pathname: string | null) {
  if (!pathname) return false;

  return (
    pathname === "/work/welcome" ||
    pathname === "/work/onboarding" ||
    pathname.startsWith("/work/onboarding/")
  );
}

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const autoHideForRoute = useMemo(
    () => shouldAutoHideSidebar(pathname),
    [pathname]
  );

  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_HIDDEN_KEY);

    if (autoHideForRoute) {
      setSidebarHidden(true);
    } else {
      setSidebarHidden(saved === "true");
    }

    setMounted(true);
  }, [autoHideForRoute]);

  useEffect(() => {
    if (!mounted) return;

    // Do not persist the auto-hidden onboarding/welcome behavior.
    // That way other workspace pages still use the user's normal preference.
    if (autoHideForRoute) return;

    window.localStorage.setItem(
      SIDEBAR_HIDDEN_KEY,
      String(sidebarHidden)
    );
  }, [sidebarHidden, mounted, autoHideForRoute]);

  return (
    <div className="w-full bg-slate-950">
      <div className="flex w-full items-start">
        {!sidebarHidden ? (
          <div
            className="sticky shrink-0 self-start"
            style={{
              top: TOP_NAV_HEIGHT,
              height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
            }}
          >
            <WorkspaceSidebar onHide={() => setSidebarHidden(true)} />
          </div>
        ) : (
          <div
            className="sticky flex w-[72px] shrink-0 self-start border-r border-slate-200 bg-white"
            style={{
              top: TOP_NAV_HEIGHT,
              height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
            }}
          >
            <div className="relative flex h-full w-full items-center justify-center">
              <button
                type="button"
                onClick={() => setSidebarHidden(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Show workspace sidebar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}