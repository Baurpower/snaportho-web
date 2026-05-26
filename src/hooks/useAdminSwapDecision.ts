"use client";

import { useCallback, useState } from "react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";

type AdminSwapDecisionResponse = {
  item: SwapRequestListItem;
};

const ADMIN_DECISION_TIMEOUT_MS = 45000;

function logDebug(label: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[swap-approval-client] ${label}${payload}`);
}

function isAdminSwapDecisionResponse(
  payload: AdminSwapDecisionResponse | { error?: string } | null
): payload is AdminSwapDecisionResponse {
  return Boolean(payload && "item" in payload);
}

export function useAdminSwapDecision() {
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = useCallback(
    async (params: {
      requestId: string;
      decision: "approve" | "reject";
      note?: string | null;
    }) => {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), ADMIN_DECISION_TIMEOUT_MS);
      setLoadingRequestId(params.requestId);
      setError(null);
      logDebug("request.start", {
        requestId: params.requestId,
        decision: params.decision,
      });

      try {
        const response = await fetch(
          `/api/program/calls/swaps/${params.requestId}/admin-decision`,
          {
            method: "POST",
            credentials: "include",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              decision: params.decision,
              note: params.note ?? null,
            }),
          }
        );

        const payload = (await response.json().catch(() => null)) as
          | AdminSwapDecisionResponse
          | { error?: string }
          | null;

        logDebug("request.response", {
          requestId: params.requestId,
          decision: params.decision,
          status: response.status,
          durationMs: Date.now() - startedAt,
          payload,
        });

        if (!response.ok || !isAdminSwapDecisionResponse(payload)) {
          const errorMessage =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(errorMessage ?? "Failed to process admin decision.");
        }

        return payload.item;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.name === "AbortError"
              ? "Approval request timed out before the server responded."
              : err.message
            : "Failed to process admin decision.";
        logDebug("request.error", {
          requestId: params.requestId,
          decision: params.decision,
          durationMs: Date.now() - startedAt,
          error: message,
        });
        setError(message);
        throw err;
      } finally {
        window.clearTimeout(timeoutId);
        logDebug("request.finish", {
          requestId: params.requestId,
          decision: params.decision,
          durationMs: Date.now() - startedAt,
        });
        setLoadingRequestId(null);
      }
    },
    []
  );

  return {
    decide,
    loadingRequestId,
    error,
    setError,
  };
}
