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

function buildNotificationsUrl(params: {
  programId: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("programId", params.programId);

  if (params.unreadOnly) {
    searchParams.set("unreadOnly", "true");
  }

  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  return `/api/workspace/notifications?${searchParams.toString()}`;
}

export function useWorkspaceNotifications(params?: {
  programId?: string | null;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<WorkspaceNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!params?.programId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        buildNotificationsUrl({
          programId: params.programId,
          unreadOnly: params?.unreadOnly,
          limit: params?.limit,
        }),
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
  }, [params?.limit, params?.programId, params?.unreadOnly]);

  useEffect(() => {
    setItems([]);
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
    items,
    loading,
    error,
    refresh,
    setItems,
  };
}