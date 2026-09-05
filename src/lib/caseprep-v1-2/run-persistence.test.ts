import assert from "node:assert/strict";

import { createInitialPacketState, reducePacketEvent } from "../caseprep-v1-1/stream-schema.ts";
import {
  buildCasePrepRunRow,
  casePrepRunOutcomeFromState,
  compactCasePrepPacket,
  resolveCasePrepPersistDecision,
} from "./run-persistence.ts";

{
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: "web", hasBearerToken: false }),
    { persist: true, platform: "web" },
  );
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: "WEB", hasBearerToken: true }),
    { persist: true, platform: "web" },
  );
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: "ios", hasBearerToken: true }),
    { persist: false, platform: "ios" },
  );
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: " ios ", hasBearerToken: false }),
    { persist: false, platform: "ios" },
  );
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: null, hasBearerToken: false }),
    { persist: true, platform: "web" },
  );
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: undefined, hasBearerToken: true }),
    { persist: false, platform: null },
  );
  assert.deepEqual(
    resolveCasePrepPersistDecision({ clientHeader: "android", hasBearerToken: false }),
    { persist: false, platform: null },
  );
}

{
  const connecting = createInitialPacketState();
  connecting.status = "connecting";
  assert.equal(casePrepRunOutcomeFromState(connecting), "partial");

  const done = { ...createInitialPacketState(), status: "done" as const };
  assert.equal(casePrepRunOutcomeFromState(done), "complete");

  const clarification = {
    ...createInitialPacketState(),
    status: "clarification" as const,
  };
  assert.equal(casePrepRunOutcomeFromState(clarification), "clarification");

  const errored = { ...createInitialPacketState(), status: "error" as const };
  assert.equal(casePrepRunOutcomeFromState(errored), "error");
}

{
  let state = createInitialPacketState();
  state = reducePacketEvent(state, "meta", {
    packet_id: "pkt-1",
    caseprep_version: "v1.3",
    engine: "web_packet_stream",
    stream_protocol_version: 2,
  });
  state = reducePacketEvent(state, "header", {
    case: {
      requested_case: "trigger thumb",
      canonical_slug: "trigger_finger_release",
      canonical_name: "Trigger Finger Release",
    },
    header: {
      display_name: "Trigger Finger Release",
      certified: false,
      procedure_type: "release_or_decompression",
      difficulty: "foundational",
      pgy_level: "PGY2",
      est_prep_minutes: 20,
      common_attending_focus: [],
    },
  });
  state = reducePacketEvent(state, "section", {
    section_id: "summary",
    status: "complete",
    items: [
      {
        id: "s1",
        question: "Overview",
        answer: "Release the A1 pulley",
        category: "summary",
      },
    ],
    source: "certified",
  });
  state = reducePacketEvent(state, "done", {
    pipeline_status: {},
    timing: { total_ms: 1200 },
    warnings: ["check attending preference"],
    coverage_status: "partial",
    quality_gate: "warn",
    grounded_percentage: 0.8,
    grounded_count: 8,
    generated_count: 2,
    omitted_sections: ["evidence"],
  });
  state = { ...state, requestedPrompt: "trigger thumb", progress: null };

  const snapshot = compactCasePrepPacket(state);
  assert.equal(snapshot.packetId, "pkt-1");
  assert.equal(snapshot.caseIdentity?.canonical_slug, "trigger_finger_release");
  assert.ok(snapshot.sections.summary);
  assert.equal("requestedPrompt" in snapshot, false);
  assert.equal("progress" in snapshot, false);
  assert.equal("deniedMeta" in snapshot, false);
  assert.equal("status" in snapshot, false);

  const row = buildCasePrepRunRow({
    subject: { type: "user", id: "11111111-1111-1111-1111-111111111111" },
    platform: "web",
    clientSurface: "web_case_prep_v1_3_stream",
    version: "v1.3",
    prompt: "  trigger thumb  ",
    trainingLevel: "pgy2",
    requestId: "req-1",
    state,
    latencyMs: 1234.6,
  });
  assert.equal(row.user_id, "11111111-1111-1111-1111-111111111111");
  assert.equal(row.guest_id, null);
  assert.equal(row.client_platform, "web");
  assert.equal(row.prompt, "trigger thumb");
  assert.equal(row.outcome, "complete");
  assert.equal(row.packet_id, "pkt-1");
  assert.equal(row.canonical_slug, "trigger_finger_release");
  assert.equal(row.quality_gate, "warn");
  assert.equal(row.grounded_count, 8);
  assert.deepEqual(row.omitted_sections, ["evidence"]);
  assert.equal(row.latency_ms, 1235);
  assert.equal(row.packet.sections.summary?.items[0].answer, "Release the A1 pulley");
}

{
  let state = createInitialPacketState();
  state = reducePacketEvent(state, "clarification", {
    case: {
      requested_case: "ctr",
      canonical_slug: "carpal_tunnel_release",
      canonical_name: "Carpal Tunnel Release",
    },
    clarification_reason: "Choose open or endoscopic.",
    options: [{ label: "Open", prompt: "Open CTR" }],
  });
  const row = buildCasePrepRunRow({
    subject: { type: "guest", id: "guest_abc" },
    platform: "web",
    clientSurface: "web_case_prep_v1_3_stream",
    version: "v1.3",
    prompt: "ctr",
    state,
    latencyMs: 200,
  });
  assert.equal(row.outcome, "clarification");
  assert.equal(row.user_id, null);
  assert.equal(row.guest_id, "guest_abc");
  assert.equal(row.packet.clarification?.options.length, 1);
}

console.log("CasePrep run persistence tests passed");
