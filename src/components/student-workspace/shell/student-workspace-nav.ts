import type { ComponentType } from "react";
import {
  BookOpenText,
  Home,
  NotebookPen,
  Stethoscope,
  UserCircle2,
} from "lucide-react";

export type StudentWorkspaceNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const STUDENT_WORKSPACE_NAV_ITEMS: StudentWorkspaceNavItem[] = [
  { label: "Home", href: "/student-workspace", icon: Home },
  {
    label: "Prepare",
    href: "/student-workspace/prepare",
    icon: Stethoscope,
  },
  {
    label: "Notes",
    href: "/student-workspace/notes",
    icon: NotebookPen,
  },
  {
    label: "Profile",
    href: "/student-workspace/profile",
    icon: UserCircle2,
  },
];

export function isStudentWorkspacePathActive(
  pathname: string | null,
  href: string
) {
  if (!pathname) return false;
  if (href === "/student-workspace") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export const STUDENT_WORKSPACE_BRAND = {
  eyebrow: "SnapOrtho",
  title: "Student Workspace",
  icon: BookOpenText,
};
