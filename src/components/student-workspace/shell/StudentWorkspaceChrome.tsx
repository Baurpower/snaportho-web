"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MoreHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { StudentWorkspaceNavRail } from "@/components/student-workspace/shell/StudentWorkspaceNavRail";
import {
  isStudentWorkspacePathActive,
  STUDENT_WORKSPACE_BRAND,
  STUDENT_WORKSPACE_NAV_ITEMS,
} from "@/components/student-workspace/shell/student-workspace-nav";

const SIDEBAR_HIDDEN_KEY = "snaportho-student-workspace-sidebar-hidden";
const SIDEBAR_COLLAPSED_KEY = "snaportho-student-workspace-sidebar-collapsed";
const TOP_NAV_HEIGHT = 52;

export function StudentWorkspaceChrome({
  title,
  description,
  badge,
  actions,
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileDrawerOpen]);

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
          <div className="border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
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
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Open student workspace navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {title}
                </p>
              </div>

              <div className="md:hidden">{actions}</div>
            </div>

            {children}
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-14 items-center justify-around text-[10px] font-medium text-slate-500">
          {STUDENT_WORKSPACE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isStudentWorkspacePathActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center py-1 transition ${
                  active
                    ? "font-semibold text-slate-950"
                    : "hover:text-slate-700"
                }`}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-1 hover:text-slate-700"
            aria-label="More student workspace options"
          >
            <MoreHorizontal className="mb-0.5 h-5 w-5" />
            <span className="leading-none">More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileDrawerOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              className="fixed right-0 top-0 z-[210] flex h-full w-72 flex-col border-l border-slate-200 bg-white shadow-2xl md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <BrandIcon className="h-4 w-4" />
                  </div>
                  <span className="text-base font-bold tracking-tight text-slate-950">
                    Student Workspace
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  aria-label="Close student workspace menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-1">
                  {STUDENT_WORKSPACE_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isStudentWorkspacePathActive(
                      pathname,
                      item.href
                    );

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 transition ${
                          active
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            active ? "text-white" : "text-slate-500"
                          }`}
                        />
                        <span className="truncate text-sm font-semibold">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
