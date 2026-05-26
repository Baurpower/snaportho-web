"use client";

import { useCallback, useState } from "react";

export function useMarkAllNotificationsRead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAllRead = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/workspace/notifications/mark-all-read",
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
  }, []);

  return {
    markAllRead,
    loading,
    error,
    setError,
  };
}
