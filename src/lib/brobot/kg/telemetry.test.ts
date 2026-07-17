import assert from "node:assert/strict";

import type { BroBotKgShadowResult } from "./contracts";
import { buildBroBotKgTelemetryRow, persistBroBotKgShadowTrace } from "./telemetry";

process.env.BROBOT_KG_STORE_SANITIZED_QUERY = "false";

function result(status: "hit" | "timeout" | "error" = "hit"): BroBotKgShadowResult {
  return {
    mode: "shadow",
    packet: status === "hit" ? {
      retrievalId: "00000000-0000-4000-8000-000000000002",
      releaseId: "kg-beta-20260716-002",
      status: "hit",
      anchors: [], facts: [], neighborhoodSlugs: [], coverage: "full", limitations: [], tokenEstimate: 0,
    } : null,
    trace: {
      requestId: "00000000-0000-4000-8000-000000000001",
      retrievalId: "00000000-0000-4000-8000-000000000002",
      releaseId: "kg-beta-20260716-002",
      decision: { eligible: true, action: "retrieve", score: 1, reasons: ["clinical"] },
      candidates: [], selectedEntityIds: [], selectedRelationshipIds: [], neighborhoodSlugs: [],
      predicateFamilies: [], cacheStatus: "miss", stageTimingsMs: { kg_subgraph_retrieval: 275 },
      configuredDeadlineMs: 275, elapsedLatencyMs: 276, timeoutStage: status === "timeout" ? "rpc_timeout" : undefined,
      rpcStarted: true, rpcCompleted: status === "hit", answerInfluenced: false, retrievalMode: "shadow",
      safeErrorCode: status === "timeout" ? "KG_RETRIEVAL_DEADLINE" : status === "error" ? "KG_RPC_ERROR" : undefined,
      safeErrorStage: status === "hit" ? undefined : "rpc_network_call",
      packetTokenEstimate: 0, status, policyVersion: "test", packetSchemaVersion: "test",
      gaps: [{ gapType: "missing_entity", normalizedConcept: "safe concept", confidence: 0.9, reasons: ["test"] }],
    },
  };
}

const baseInput = {
  result: result(), query: "patient@example.com secret prompt", userId: "user-id",
  conversationId: "conversation-id", messageId: "message-id", mode: "clinic", subintent: "other",
  trainingLevel: "pgy2", responseDepth: "standard", isFollowUp: false,
};

const row = buildBroBotKgTelemetryRow(baseInput);
assert.equal(row.sanitized_query, null);
assert.equal(row.answer_influenced, false);
assert.equal(row.retrieval_mode, "shadow");
assert.equal(JSON.stringify(row).includes("patient@example.com"), false);
assert.deepEqual(row.gap_signals, result().trace.gaps);

const writes: Record<string, unknown>[] = [];
const writer = {
  from(table: string) {
    assert.equal(table, "brobot_kg_retrieval_events");
    return { async upsert(value: Record<string, unknown>, options: { onConflict: string; ignoreDuplicates: boolean }) {
      assert.deepEqual(options, { onConflict: "request_id", ignoreDuplicates: true });
      writes.push(value);
      return { error: null };
    } };
  },
};

assert.equal((await persistBroBotKgShadowTrace(baseInput, { client: writer })).persisted, true);
assert.equal(writes.length, 1);
assert.equal((await persistBroBotKgShadowTrace({ ...baseInput, result: result("timeout") }, { client: writer })).persisted, true);
assert.equal(writes[1]?.retrieval_status, "timeout");
assert.equal(writes[1]?.timeout_stage, "rpc_timeout");
assert.equal((await persistBroBotKgShadowTrace({ ...baseInput, result: result("error") }, { client: writer })).persisted, true);
assert.equal(writes[2]?.safe_error_code, "KG_RPC_ERROR");

const failed = await persistBroBotKgShadowTrace(baseInput, { client: {
  from() { return { async upsert() { return { error: { message: "safe failure" } }; } }; },
} });
assert.equal(failed.persisted, false);
assert.equal(failed.errorCode, "KG_TELEMETRY_INSERT_FAILED");

await persistBroBotKgShadowTrace(baseInput, { client: writer });
assert.equal(writes[3]?.request_id, writes[0]?.request_id);

console.log("brobot kg telemetry tests passed");
