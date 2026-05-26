"use client";

import { useEffect, useState } from "react";

type WorkspaceInfo = {
  data?: {
    user?: {
      id: string;
      email: string;
    };
    activeProgram?: {
      id: string;
      name: string;
      institutionName?: string | null;
    } | null;
    membership?: {
      id: string;
      role: string | null;
    } | null;
    roster?: {
      id: string;
      fullName: string | null;
      gradYear: number | null;
      role: string | null;
      isAdmin: boolean;
    } | null;
    accessContext?: {
      userId: string;
      programId: string;
      membershipId: string | null;
      rosterId: string | null;
      isRosterLinked: boolean;
      isAdmin: boolean;
      mode: "admin" | "resident";
      membershipRole: string | null;
      rosterRole: string | null;
    } | null;
    permissions?: {
      mode: "admin" | "resident";
      canViewWorkspace: boolean;
      canViewCallSchedule: boolean;
      canViewTimeOff: boolean;
      canViewAcademicCalendar: boolean;
      canRequestCoverage: boolean;
      canRespondToCoverageRequests: boolean;
      canApproveSwaps: boolean;
      canEditCallAssignments: boolean;
      canCreatePersonalCallEntry: boolean;
      canUploadCallSchedule: boolean;
      canManageCallRules: boolean;
      canExportProgramCallCalendar: boolean;
      canSyncOwnCalendar: boolean;
      canSyncProgramCalendar: boolean;
      canRequestTimeOff: boolean;
      canEditOwnTimeOff: boolean;
      canApproveTimeOff: boolean;
      canUploadTimeOff: boolean;
      canManageRotations: boolean;
      canManageRoster: boolean;
      canManageProgramSettings: boolean;
      canCreateAcademicEvents: boolean;
      canEditAcademicEvents: boolean;
      canDeleteAcademicEvents: boolean;
    } | null;
  };
  error?: string;
};

export function useWorkspaceInfo() {
  const [programId, setProgramId] = useState<string | null>(null);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo["data"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaceInfo() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/me/info", {
          method: "GET",
          cache: "no-store",
        });

        const json = (await response.json()) as WorkspaceInfo;

        if (!response.ok) {
          throw new Error(json?.error ?? "Failed to load workspace info");
        }

        if (!cancelled) {
          setWorkspaceInfo(json?.data ?? null);
          setProgramId(json?.data?.activeProgram?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setWorkspaceInfo(null);
          setProgramId(null);
          setError(
            err instanceof Error ? err.message : "Failed to load workspace info"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWorkspaceInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  return { programId, workspaceInfo, loading, error };
}
