"use client";

import { useCallback, useEffect, useState } from "react";

type UnreadCountResponse = {
  count: number;
};

function isUnreadCountResponse(
  payload: UnreadCountResponse | { error?: string } | null
): payload is UnreadCountResponse {
  return Boolean(payload && "count" in payload && typeof payload.count === "number");
}

function buildUnreadCountUrl(programId: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("programId", programId);
  return `/api/workspace/notifications/unread-count?${searchParams.toString()}`;
}

export function useUnreadNotificationCount(params?: {
  programId?: string | null;
}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!params?.programId) {
      setCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildUnreadCountUrl(params.programId), {
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | UnreadCountResponse
        | { error?: string }
        | null;

      if (!response.ok || !isUnreadCountResponse(payload)) {
        const errorMessage =
          payload && "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Failed to load unread count.");
      }

      setCount(payload.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load unread count.");
    } finally {
      setLoading(false);
    }
  }, [params?.programId]);

  useEffect(() => {
    setCount(0);
    setError(null);
  }, [params?.programId]);

  useEffect(() => {
    if (!params?.programId) {
      setLoading(false);
      return;
    }

    void refresh();
  }, [params?.programId, refresh]);

  return {
    count,
    loading,
    error,
    refresh,
    setCount,
  };
}