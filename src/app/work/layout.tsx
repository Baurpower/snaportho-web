import React from "react";
import { WorkspaceShell } from "@/components/workspace/workspaceshell";

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}