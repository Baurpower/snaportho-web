"use client";

import { useCallback, useState } from "react";
import type { WorkspaceNotification } from "@/lib/workspace/notifications/types";

type MarkReadResponse = {
  item: WorkspaceNotification;
};

function isMarkReadResponse(
  payload: MarkReadResponse | { error?: string } | null
): payload is MarkReadResponse {
  return Boolean(payload && "item" in payload);
}

export function useMarkNotificationRead() {
  const [loadingNotificationId, setLoadingNotificationId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const markRead = useCallback(async (notificationId: string) => {
    setLoadingNotificationId(notificationId);
    setError(null);

    try {
      const response = await fetch(
        `/api/workspace/notifications/${notificationId}/read`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | MarkReadResponse
        | { error?: string }
        | null;

      if (!response.ok || !isMarkReadResponse(payload)) {
        const errorMessage =
          payload && "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Failed to mark notification as read.");
      }

      return payload.item;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to mark notification as read.";
      setError(message);
      throw err;
    } finally {
      setLoadingNotificationId(null);
    }
  }, []);

  return {
    markRead,
    loadingNotificationId,
    error,
    setError,
  };
}
