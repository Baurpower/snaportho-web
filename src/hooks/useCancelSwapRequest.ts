"use client";

import { useCallback, useState } from "react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";

type CancelSwapRequestResponse = {
  item: SwapRequestListItem;
};

function isCancelSwapRequestResponse(
  payload: CancelSwapRequestResponse | { error?: string } | null
): payload is CancelSwapRequestResponse {
  return Boolean(payload && "item" in payload);
}

export function useCancelSwapRequest() {
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRequest = useCallback(
    async (params: { requestId: string; note?: string | null }) => {
      setLoadingRequestId(params.requestId);
      setError(null);

      try {
        const response = await fetch(
          `/api/program/calls/swaps/${params.requestId}/cancel`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              note: params.note ?? null,
            }),
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | CancelSwapRequestResponse
          | { error?: string }
          | null;

        if (!response.ok || !isCancelSwapRequestResponse(payload)) {
          const errorMessage =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(errorMessage ?? "Failed to cancel swap request.");
        }

        return payload.item;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to cancel swap request.";
        setError(message);
        throw err;
      } finally {
        setLoadingRequestId(null);
      }
    },
    []
  );

  return {
    cancelRequest,
    loadingRequestId,
    error,
    setError,
  };
}
