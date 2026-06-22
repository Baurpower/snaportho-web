"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftOpen, X, MoreHorizontal, Home } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { WorkspaceSidebar } from "@/components/workspace/workspacesidebar";
import {
  PRIMARY_NAV,
  BOTTOM_NAV,
  isActivePath,
  NavLink,
} from "@/components/workspace/workspacesidebar";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";

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

  // Permissions for correct nav labels + settings visibility (used by mobile drawer + desktop sidebar internally)
  const { permissions, isAdmin } = useWorkspacePermissions();
  const bottomNav = useMemo(
    () =>
      BOTTOM_NAV.filter((item) =>
        item.href === "/work/settings"
          ? permissions?.canManageProgramSettings ?? false
          : true
      ),
    [permissions?.canManageProgramSettings]
  );

  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mobile drawer state (Phase 1 - additive, only affects < md)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

  // --- Mobile drawer effects (Phase 1 only, additive) ---
  // Close drawer on route change (good UX + prevents stale open state)
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Listen for custom event from global Nav (on /work mobile) to open the workspace drawer
  useEffect(() => {
    const handler = () => setMobileDrawerOpen(true);
    window.addEventListener('open-workspace-drawer', handler);
    return () => window.removeEventListener('open-workspace-drawer', handler);
  }, []);

  // Escape key closes drawer
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileDrawerOpen]);

  // Lock body scroll while drawer is open (mobile only pattern)
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileDrawerOpen]);

  return (
    <div className="w-full bg-slate-950 pt-[52px]">
      <div className="flex min-w-0 w-full md:min-h-[calc(100vh-52px)] md:items-stretch">
        {/* Desktop-only sidebar rail (md+). Hidden on mobile.
            All original desktop collapse/hide/sticky/width/persistence behavior preserved exactly. */}
        <div className="hidden shrink-0 md:block">
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
                  aria-label="Show workspace sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main content column. On mobile: full width (no sidebar squeeze).
            Mobile header is in-flow (no z-index conflict with global Nav).
            Safe-area padding for iOS bottom bar. overflow-x-clip preserved so child layout issues remain visible for later phases. */}
        <div className="min-w-0 flex-1 overflow-x-clip pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          {/* Mobile-only workspace header.
              Hidden on mobile because the global Nav now provides the single "Workspace" top bar
              (rebranded on /work mobile routes) + hamburger that opens this drawer via custom event.
              Desktop sidebar is used instead. */}
          <div className="hidden flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200"
              aria-label="Open workspace navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-950 text-[10px] font-black text-white">
                S
              </div>
              <span className="text-sm font-semibold text-slate-700">Workspace</span>
            </div>

            {/* Spacer for visual balance with menu button */}
            <div className="w-9" aria-hidden />
          </div>

          {children}
        </div>
      </div>

      {/* Mobile workspace bottom tab bar - Phase 6 UX fix.
          Visible only on mobile, provides clear workspace navigation.
          "More" opens the existing full drawer (which already handles permissions and secondary items).
          Uses the same PRIMARY_NAV data for consistency. Compact, safe-area aware. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 text-[10px] font-medium text-slate-500">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition ${active ? "text-slate-950 font-semibold" : "hover:text-slate-700"}`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span className="leading-none">{item.mobileLabel ?? item.label}</span>
              </Link>
            );
          })}

          {/* More opens the existing workspace drawer (Profile, Settings, Billing, admin info) */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 hover:text-slate-700"
            aria-label="More workspace options"
          >
            <MoreHorizontal className="h-5 w-5 mb-0.5" />
            <span className="leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer (slide from left). Rendered at shell root so it can be fixed.
          Only functional/visible below md via header trigger. Reuses exact nav items + NavLink component from sidebar for consistency. */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[200] bg-slate-950/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer panel - slides from right to match right hamburger (mobile only) */}
            <motion.div
              className="fixed right-0 top-0 z-[210] flex h-full w-72 flex-col border-l border-slate-200 bg-white shadow-2xl md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex h-full flex-col overflow-hidden">
                {/* Drawer header with close */}
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                      S
                    </div>
                    <span className="text-base font-bold tracking-tight text-slate-950">Workspace</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                    aria-label="Close workspace menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Nav content (mirrors sidebar structure but always expanded, no collapse controls) */}
                <div className="flex-1 overflow-y-auto px-3 py-4">
                  {/* Prominent first item: SnapOrtho Home (goes to public site root) */}
                  <Link
                    href="/"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 mb-2 border-b border-slate-200 pb-3"
                  >
                    <Home className="h-5 w-5 shrink-0" />
                    SnapOrtho Home
                  </Link>

                  <nav className="space-y-1">
                    <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {isAdmin ? "Workspace" : "Schedule"}
                    </p>

                    {PRIMARY_NAV.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        href={item.href}
                        collapsed={false}
                        active={isActivePath(pathname, item.href)}
                        isAdminMode={isAdmin}
                        onClick={() => setMobileDrawerOpen(false)}
                      />
                    ))}
                  </nav>

                  {isAdmin ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Program Operations
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">
                        Admin workspace mode is active.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Manage schedules, swaps, academic planning, and program setup from the current workspace shell.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {isAdmin ? "Program & Account" : "Account"}
                    </p>

                    <div className="space-y-1">
                      {bottomNav.map((item) => (
                        <NavLink
                          key={item.href}
                          item={item}
                          href={item.href}
                          collapsed={false}
                          active={isActivePath(pathname, item.href)}
                          isAdminMode={isAdmin}
                          onClick={() => setMobileDrawerOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
