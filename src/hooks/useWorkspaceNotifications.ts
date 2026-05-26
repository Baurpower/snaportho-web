"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorkspaceNotification } from "@/lib/workspace/notifications/types";

type NotificationListResponse = {
  items: WorkspaceNotification[];
};

function isNotificationListResponse(
  payload: NotificationListResponse | { error?: string } | null
): payload is NotificationListResponse {
  return Boolean(payload && "items" in payload && Array.isArray(payload.items));
}

export function useWorkspaceNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<WorkspaceNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.unreadOnly) {
        searchParams.set("unreadOnly", "true");
      }
      if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
      }

      const response = await fetch(
        `/api/workspace/notifications${searchParams.size ? `?${searchParams.toString()}` : ""}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | NotificationListResponse
        | { error?: string }
        | null;

      if (!response.ok || !isNotificationListResponse(payload)) {
        const errorMessage =
          payload && "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Failed to load notifications.");
      }

      setItems(payload.items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, [params?.limit, params?.unreadOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items,
    loading,
    error,
    refresh,
    setItems,
  };
}
