"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isStudentWorkspacePathActive,
  STUDENT_WORKSPACE_NAV_ITEMS,
} from "@/components/student-workspace/shell/student-workspace-nav";

/**
 * Bottom tab bar for the mobile student workspace.
 *
 * Replaces the previous four-tabs-plus-"More" bar whose drawer listed the same
 * four destinations. Rendered inside `md:hidden` containers only.
 */
export function StudentWorkspaceMobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Student workspace"
    >
      <ul className="flex items-stretch">
        {STUDENT_WORKSPACE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isStudentWorkspacePathActive(pathname, item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 transition ${
                  active ? "text-slate-950" : "text-slate-400"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? "bg-slate-950 text-white" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span
                  className={`text-[10px] leading-none ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
