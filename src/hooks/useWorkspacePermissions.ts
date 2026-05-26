"use client";

import { useMemo } from "react";
import { useWorkspaceInfo } from "@/lib/workspace/use-workspace-info";

export function useWorkspacePermissions() {
  const { workspaceInfo, loading, error, programId } = useWorkspaceInfo();

  const accessContext = workspaceInfo?.accessContext ?? null;
  const permissions = workspaceInfo?.permissions ?? null;

  return useMemo(
    () => ({
      programId,
      accessContext,
      permissions,
      mode: permissions?.mode ?? accessContext?.mode ?? "resident",
      isAdmin: Boolean(accessContext?.isAdmin),
      isRosterLinked: Boolean(accessContext?.isRosterLinked),
      loading,
      error,
    }),
    [accessContext, error, loading, permissions, programId]
  );
}
