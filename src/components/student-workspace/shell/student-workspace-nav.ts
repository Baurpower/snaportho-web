import type { ComponentType } from "react";
import {
  BookOpenText,
  Home,
  BriefcaseMedical,
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
    label: "MyCases",
    href: "/student-workspace/mycases",
    icon: BriefcaseMedical,
  },
  {
    label: "Profile",
    href: "/student-workspace/profile",
    icon: UserCircle2,
  },
];

const PREPARE_ACTIVE_PREFIXES = [
  "/student-workspace/prepare",
  "/student-workspace/case-readiness",
] as const;

export function isStudentWorkspacePathActive(
  pathname: string | null,
  href: string
) {
  if (!pathname) return false;
  if (href === "/student-workspace") {
    return pathname === href;
  }

  if (href === "/student-workspace/prepare") {
    return PREPARE_ACTIVE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export const STUDENT_WORKSPACE_BRAND = {
  eyebrow: "SnapOrtho",
  title: "Student Workspace",
  icon: BookOpenText,
};
