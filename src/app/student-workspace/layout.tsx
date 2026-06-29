import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Workspace",
  description:
    "A personal SnapOrtho workspace for fourth-year medical students.",
};

export default function StudentWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
