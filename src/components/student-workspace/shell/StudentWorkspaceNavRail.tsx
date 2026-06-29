"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  isStudentWorkspacePathActive,
  STUDENT_WORKSPACE_BRAND,
  STUDENT_WORKSPACE_NAV_ITEMS,
} from "@/components/student-workspace/shell/student-workspace-nav";

type StudentWorkspaceNavRailProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onHide?: () => void;
  title?: string;
};

export function StudentWorkspaceNavRail({
  collapsed,
  onToggleCollapsed,
  onHide,
  title,
}: StudentWorkspaceNavRailProps) {
  const pathname = usePathname();
  const BrandIcon = STUDENT_WORKSPACE_BRAND.icon;
  const sidebarWidth = collapsed
    ? "w-20 xl:w-[88px]"
    : "w-[224px] xl:w-[240px]";

  return (
    <aside
      className={`${sidebarWidth} relative h-full max-w-full border-r border-slate-200 bg-white transition-[width] duration-200`}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute -right-4 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:bg-slate-50 hover:text-slate-950"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      <div className="flex h-full flex-col overflow-hidden">
        <div
          className={`border-b border-slate-200 px-3 py-4 ${
            collapsed ? "flex justify-center" : ""
          }`}
        >
          <Link
            href="/student-workspace"
            className={`min-w-0 rounded-2xl transition hover:bg-slate-50 ${
              collapsed ? "mx-auto p-2.5" : "flex items-center gap-3 px-2 py-2"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <BrandIcon className="h-5 w-5" />
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {STUDENT_WORKSPACE_BRAND.eyebrow}
                </p>
                <p className="truncate text-base font-bold tracking-tight text-slate-950">
                  {STUDENT_WORKSPACE_BRAND.title}
                </p>
              </div>
            ) : null}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed ? (
            <div className="px-3 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {title ?? "Your fourth-year home base"}
              </p>
            </div>
          ) : null}

          <nav className="space-y-1">
            {STUDENT_WORKSPACE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isStudentWorkspacePathActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
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
                    <span className="truncate text-sm font-semibold">
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {!collapsed ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Daily Operating System
              </p>
              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                Built for fourth-year students.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Keep your prep, weekly plan, tasks, and rotation momentum in one
                student-owned workspace.
              </p>
            </div>
          ) : null}
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
