"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { StudentWorkspaceMobileTabBar } from "@/components/student-workspace/mobile/StudentWorkspaceMobileTabBar";
import { StudentWorkspaceNavRail } from "@/components/student-workspace/shell/StudentWorkspaceNavRail";
import { STUDENT_WORKSPACE_BRAND } from "@/components/student-workspace/shell/student-workspace-nav";

const SIDEBAR_HIDDEN_KEY = "snaportho-student-workspace-sidebar-hidden";
const SIDEBAR_COLLAPSED_KEY = "snaportho-student-workspace-sidebar-collapsed";
const TOP_NAV_HEIGHT = 52;

export function StudentWorkspaceChrome({
  title,
  description,
  badge,
  actions,
  children,
  compactOnMobile = false,
}: {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * Hides the tall title/description block below `md` for pages whose content
   * already renders its own header (currently MyCases). Only affects
   * mobile-only markup; desktop output is unchanged.
   */
  compactOnMobile?: boolean;
}) {
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const BrandIcon = STUDENT_WORKSPACE_BRAND.icon;

  useEffect(() => {
    const hidden = window.localStorage.getItem(SIDEBAR_HIDDEN_KEY);
    const collapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setSidebarHidden(hidden === "true");
    setSidebarCollapsed(collapsed === "true");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, String(sidebarHidden));
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_KEY,
      String(sidebarCollapsed)
    );
  }, [mounted, sidebarCollapsed, sidebarHidden]);

  return (
    <div className="w-full bg-slate-100 pt-[52px]">
      <div className="flex min-w-0 w-full md:min-h-[calc(100vh-52px)] md:items-stretch">
        <div className="hidden shrink-0 md:block">
          {!sidebarHidden ? (
            <div
              className="sticky shrink-0 self-start"
              style={{
                top: TOP_NAV_HEIGHT,
                height: `calc(100vh - ${TOP_NAV_HEIGHT}px)`,
              }}
            >
              <StudentWorkspaceNavRail
                collapsed={sidebarCollapsed}
                onToggleCollapsed={() =>
                  setSidebarCollapsed((current) => !current)
                }
                onHide={() => setSidebarHidden(true)}
                title={title}
              />
            </div>
          ) : (
            <div
              className="sticky flex w-16 shrink-0 self-start border-r border-slate-200 bg-white lg:w-20 xl:w-[72px]"
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
                  aria-label="Show student workspace sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-x-clip pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          <div
            className={`border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70${
              compactOnMobile ? " max-md:hidden" : ""
            }`}
          >
            <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {badge ? (
                    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                      {badge}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    <BrandIcon className="h-3.5 w-3.5" />
                    Student Edition
                  </span>
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-[2rem]">
                  {title}
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  {description}
                </p>
              </div>

              <div className="hidden shrink-0 md:block">{actions}</div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
            <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
              <Link
                href="/student-workspace"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"
                aria-label="Student workspace home"
              >
                <BrandIcon className="h-[18px] w-[18px]" />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold leading-tight tracking-tight text-slate-950">
                  {title}
                </p>
              </div>

              <div className="shrink-0">{actions}</div>
            </div>

            {children}
          </div>
        </div>
      </div>

      <StudentWorkspaceMobileTabBar />
    </div>
  );
}
