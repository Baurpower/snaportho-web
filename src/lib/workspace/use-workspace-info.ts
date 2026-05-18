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
    } | null;
    membership?: {
      id: string;
      role: string;
    } | null;
  };
  error?: string;
};

export function useWorkspaceInfo() {
  const [programId, setProgramId] = useState<string | null>(null);
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
          setProgramId(json?.data?.activeProgram?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
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

  return { programId, loading, error };
}
