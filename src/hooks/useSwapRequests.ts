"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SwapRequestListItem, SwapRequestStatus } from "@/lib/workspace/call-swaps/types";

type SwapRequestListResponse = {
  items: SwapRequestListItem[];
};

function isSwapRequestListResponse(
  payload: SwapRequestListResponse | { error?: string } | null
): payload is SwapRequestListResponse {
  return Boolean(payload && "items" in payload && Array.isArray(payload.items));
}

const COMPLETED_STATUSES = new Set<SwapRequestStatus>([
  "approved",
  "rejected",
  "declined",
  "cancelled",
  "expired",
]);

export function useSwapRequests(currentRosterId: string | null | undefined) {
  const [items, setItems] = useState<SwapRequestListItem[]>([]);
  const [adminItems, setAdminItems] = useState<SwapRequestListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReviewAdmin, setCanReviewAdmin] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentRosterId) {
      setItems([]);
      setAdminItems([]);
      setCanReviewAdmin(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allPromise = fetch("/api/program/calls/swaps?view=all", {
        credentials: "include",
        cache: "no-store",
      });
      const adminPromise = fetch("/api/program/calls/swaps?view=admin", {
        credentials: "include",
        cache: "no-store",
      });

      const [allResponse, adminResponse] = await Promise.all([
        allPromise,
        adminPromise,
      ]);

      const allPayload = (await allResponse.json().catch(() => null)) as
        | SwapRequestListResponse
        | { error?: string }
        | null;

      if (!allResponse.ok || !isSwapRequestListResponse(allPayload)) {
        const errorMessage =
          allPayload && "error" in allPayload ? allPayload.error : undefined;
        throw new Error(errorMessage ?? "Failed to load swap requests.");
      }

      setItems(allPayload.items);

      const adminPayload = (await adminResponse.json().catch(() => null)) as
        | SwapRequestListResponse
        | { error?: string }
        | null;

      if (adminResponse.ok && isSwapRequestListResponse(adminPayload)) {
        setAdminItems(adminPayload.items);
        setCanReviewAdmin(true);
      } else if (adminResponse.status === 403) {
        setAdminItems([]);
        setCanReviewAdmin(false);
      } else {
        const errorMessage =
          adminPayload && "error" in adminPayload ? adminPayload.error : undefined;
        throw new Error(errorMessage ?? "Failed to load admin swap requests.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load swap requests."
      );
    } finally {
      setLoading(false);
    }
  }, [currentRosterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const incoming = useMemo(
    () =>
      items.filter(
        (item) =>
          item.recipient?.id === currentRosterId &&
          item.status === "pending_recipient"
      ),
    [currentRosterId, items]
  );

  const outgoing = useMemo(
    () =>
      items.filter(
        (item) =>
          item.requester?.id === currentRosterId &&
          !COMPLETED_STATUSES.has(item.status)
      ),
    [currentRosterId, items]
  );

  const completed = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.requester?.id === currentRosterId ||
            item.recipient?.id === currentRosterId) &&
          COMPLETED_STATUSES.has(item.status)
      ),
    [currentRosterId, items]
  );

  return {
    items,
    incoming,
    outgoing,
    completed,
    adminPending: adminItems,
    canReviewAdmin,
    loading,
    error,
    refresh,
    setItems,
  };
}
