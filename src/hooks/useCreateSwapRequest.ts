"use client";

import { useCallback, useState } from "react";
import type {
  CreateSwapRequestInput,
  SwapRequestListItem,
} from "@/lib/workspace/call-swaps/types";

type CreateSwapRequestResponse = {
  item: SwapRequestListItem;
  warnings?: string[];
};

function isCreateSwapRequestResponse(
  payload: CreateSwapRequestResponse | { error?: string; warnings?: string[] } | null
): payload is CreateSwapRequestResponse {
  return Boolean(payload && "item" in payload);
}

export function useCreateSwapRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(async (input: CreateSwapRequestInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/program/calls/swaps", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = (await response.json().catch(() => null)) as
        | CreateSwapRequestResponse
        | { error?: string; warnings?: string[] }
        | null;

      if (!response.ok || !isCreateSwapRequestResponse(payload)) {
        const errorMessage =
          payload && "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Failed to create swap request.");
      }

      return {
        item: payload.item,
        warnings: payload.warnings ?? [],
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create swap request.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createRequest,
    loading,
    error,
    setError,
  };
}
