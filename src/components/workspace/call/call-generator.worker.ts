/// <reference lib="webworker" />
import {
  runGenerateRequest,
  type GenerateWorkerRequest,
  type GenerateWorkerResponse,
} from "@/components/workspace/call/call-generator-protocol";

/**
 * Web Worker entry point for Phase 3 schedule generation (CALL_GEN_V2).
 *
 * All the real work lives in the pure, unit-tested `runGenerateRequest`; this
 * file is only the postMessage boundary so generation runs off the main thread.
 * The worker's import graph must stay pure (no next/*, React, or server-only) —
 * see docs/call-hub-phase3-generator.md.
 */
self.onmessage = (event: MessageEvent<GenerateWorkerRequest>) => {
  const request = event.data;
  if (!request || request.kind !== "generate") return;

  try {
    const response = runGenerateRequest(request);
    const message: GenerateWorkerResponse = { kind: "result", ...response };
    (self as unknown as Worker).postMessage(message);
  } catch (error) {
    const message: GenerateWorkerResponse = {
      kind: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Schedule generation failed",
    };
    (self as unknown as Worker).postMessage(message);
  }
};
