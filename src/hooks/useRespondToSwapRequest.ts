"use client";

import { useCallback, useState } from "react";
import type {
  RespondToSwapRequestInput,
  SwapRequestListItem,
} from "@/lib/workspace/call-swaps/types";

type RespondSwapRequestResponse = {
  item: SwapRequestListItem;
};

function isRespondSwapRequestResponse(
  payload: RespondSwapRequestResponse | { error?: string } | null
): payload is RespondSwapRequestResponse {
  return Boolean(payload && "item" in payload);
}

export function useRespondToSwapRequest() {
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = useCallback(
    async (input: RespondToSwapRequestInput & { note?: string | null }) => {
      setLoadingRequestId(input.requestId);
      setError(null);

      try {
        const response = await fetch(
          `/api/program/calls/swaps/${input.requestId}/respond`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              decision: input.decision,
              note: input.note ?? input.recipientNote ?? null,
            }),
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | RespondSwapRequestResponse
          | { error?: string }
          | null;

        if (!response.ok || !isRespondSwapRequestResponse(payload)) {
          const errorMessage =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(errorMessage ?? "Failed to update swap request.");
        }

        return payload.item;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update swap request.";
        setError(message);
        throw err;
      } finally {
        setLoadingRequestId(null);
      }
    },
    []
  );

  return {
    respond,
    loadingRequestId,
    error,
    setError,
  };
}
