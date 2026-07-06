"use client";

import { useCallback, useState } from "react";

export function useMarkAllNotificationsRead(params?: {
  programId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAllRead = useCallback(async () => {
    if (!params?.programId) {
      throw new Error("A program context is required to mark notifications read.");
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("programId", params.programId);

      const response = await fetch(
        `/api/workspace/notifications/mark-all-read?${searchParams.toString()}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { readAt: string }
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("readAt" in payload)) {
        const errorMessage =
          payload && "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Failed to mark all notifications read.");
      }

      return payload.readAt;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications read.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [params?.programId]);

  return {
    markAllRead,
    loading,
    error,
    setError,
  };
}