"use client";

import { useCallback, useRef, useState } from "react";

import { createSseParseState, parseSseChunk } from "@/lib/caseprep-v1-1/sse";
import {
  createInitialPacketState,
  reducePacketEvent,
  type CasePrepPacketState,
} from "@/lib/caseprep-v1-1/stream-schema";

export type UseCasePrepStream = {
  state: CasePrepPacketState;
  start: (prompt: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
};

/**
 * Consumes the /api/case-prep/v1.1/stream SSE endpoint and reduces events
 * into progressive packet state. Non-SSE responses (403/429/404/502) resolve
 * into denied/error states so callers can fall back.
 */
export function useCasePrepStream(): UseCasePrepStream {
  const [state, setState] = useState<CasePrepPacketState>(
    createInitialPacketState,
  );
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
    setState(createInitialPacketState());
  }, [abort]);

  const start = useCallback(
    async (prompt: string) => {
      abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({
        ...createInitialPacketState(),
        status: "connecting",
        requestedPrompt: prompt.trim(),
        progress: {
          phase: "connecting",
          label: "Connecting to BroBot",
          progress_min: 0,
          progress_max: 5,
          elapsed_ms: 0,
          heartbeat: false,
        },
      });

      let response: Response;
      try {
        // v1.3 is the website's current CasePrep contract. Keep the older
        // endpoints only as availability fallbacks during deployment skew.
        const preferredVersion = "v1.3" as const;
        const requestStream = (version: "v1.1" | "v1.2" | "v1.3") =>
          fetch(`/api/case-prep/${version}/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
            signal: controller.signal,
          });

        response = await requestStream(preferredVersion);

        // The browser, web proxy, and CasePrep service can deploy at different
        // times. A disabled/missing upstream is surfaced by the proxy as 502,
        // so treat both 404 and 502 as rollout skew and preserve availability.
        // Never fall back on 403/429: those are authoritative access limits.
        if (
          preferredVersion === "v1.3" &&
          (response.status === 404 || response.status === 502)
        ) {
          response = await requestStream("v1.1");
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "Case Prep is temporarily unavailable.",
        }));
        return;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const body = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        if (response.status === 403 || response.status === 429) {
          setState((prev) => ({ ...prev, status: "denied", deniedMeta: body }));
        } else {
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage:
              (body?.error as string) ||
              "Case Prep is temporarily unavailable.",
          }));
        }
        return;
      }
      if (!response.body) {
        setState((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "Case Prep stream unavailable.",
        }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parseState = createSseParseState();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const events = parseSseChunk(
            parseState,
            decoder.decode(value, { stream: true }),
          );
          if (events.length > 0) {
            setState((prev) =>
              events.reduce(
                (acc, event) => reducePacketEvent(acc, event.event, event.data),
                prev,
              ),
            );
          }
        }
        // Stream closed without a done/error event → surface as error, not hang.
        setState((prev) =>
          prev.status === "streaming" || prev.status === "connecting"
            ? {
                ...prev,
                status: "error",
                errorMessage: "Case Prep stream ended unexpectedly.",
              }
            : prev,
        );
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            status: "error",
            errorMessage: "Case Prep stream interrupted.",
          }));
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [abort],
  );

  return { state, start, abort, reset };
}
