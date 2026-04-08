"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Calendar,
  Settings,
  UserCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  PlaneTakeoffIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type WorkspaceSidebarProps = {
  onHide?: () => void;
};

const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/work", icon: LayoutGrid },
  { label: "Call", href: "/work/call", icon: Calendar },
  { label: "Time Off", href: "/work/time-off", icon: PlaneTakeoffIcon },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Profile", href: "/work/profile", icon: UserCircle2 },
  { label: "Settings", href: "/work/settings", icon: Settings },
];

const STORAGE_KEY = "snaportho-workspace-sidebar-collapsed";

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/work") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-center rounded-2xl transition-all ${
        collapsed ? "justify-center px-3 py-3" : "gap-3 px-3.5 py-3"
      } ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
      title={collapsed ? item.label : undefined}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          active
            ? "text-white"
            : "text-slate-500 transition group-hover:text-slate-900"
        }`}
      />
      {!collapsed ? (
        <span className="truncate text-sm font-semibold">{item.label}</span>
      ) : null}
    </Link>
  );
}

export function WorkspaceSidebar({ onHide }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed, mounted]);

  const sidebarWidth = useMemo(
    () => (collapsed ? "w-[88px]" : "w-[240px]"),
    [collapsed]
  );

  return (
    <aside
      className={`${sidebarWidth} relative h-full border-r border-slate-200 bg-white transition-[width] duration-200`}
    >
      {!collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="absolute -right-4 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:bg-slate-50 hover:text-slate-950"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="absolute -right-4 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:bg-slate-50 hover:text-slate-950"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <div className="flex h-full flex-col overflow-hidden">
        <div
          className={`border-b border-slate-200 px-3 py-4 ${
            collapsed ? "flex justify-center" : ""
          }`}
        >
          <Link
            href="/work"
            className={`min-w-0 rounded-2xl transition hover:bg-slate-50 ${
              collapsed ? "mx-auto p-2.5" : "flex items-center gap-3 px-2 py-2"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
              S
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  SnapOrtho
                </p>
                <p className="truncate text-base font-bold tracking-tight text-slate-950">
                  Workspace
                </p>
              </div>
            ) : null}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {!collapsed ? (
              <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Schedule
              </p>
            ) : null}

            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActivePath(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            {!collapsed ? (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Account
              </p>
            ) : null}

            <div className="space-y-1">
              {BOTTOM_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={isActivePath(pathname, item.href)}
                />
              ))}
            </div>
          </div>
        </div>

        {onHide ? (
          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={onHide}
              className={`inline-flex w-full items-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${
                collapsed
                  ? "justify-center px-3 py-3"
                  : "gap-3 px-3.5 py-3 text-sm font-semibold"
              }`}
              aria-label="Hide sidebar"
              title={collapsed ? "Hide sidebar" : undefined}
            >
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>Hide sidebar</span> : null}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}