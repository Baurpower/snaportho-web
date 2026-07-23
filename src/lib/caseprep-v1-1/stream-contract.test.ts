import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Node's type-stripping runner requires the extension; the app tsconfig intentionally disallows it.
// @ts-expect-error -- required by the direct Node test runner.
import { createSseParseState, parseSseChunk, encodeSseEvent } from "./sse.ts";
// @ts-expect-error -- required by the direct Node test runner.
import { createInitialPacketState, reducePacketEvent } from "./stream-schema.ts";

type PacketState = ReturnType<typeof createInitialPacketState>;

function reduceAll(frames: string, state: PacketState = createInitialPacketState()) {
  const parseState = createSseParseState();
  for (const event of parseSseChunk(parseState, frames)) {
    state = reducePacketEvent(state, event.event, event.data);
  }
  return state;
}

// ── SSE parser: split frames across arbitrary chunk boundaries ──────────────
{
  const frames =
    encodeSseEvent("meta", {
      packet_id: "p1",
      caseprep_version: "v1.1",
      engine: "web_packet_stream",
      stream_protocol_version: 1,
    }) + encodeSseEvent("warning", { message: "hello" });
  const state = createSseParseState();
  const mid = Math.floor(frames.length / 2) + 3;
  const events = [
    ...parseSseChunk(state, frames.slice(0, mid)),
    ...parseSseChunk(state, frames.slice(mid)),
  ];
  assert.equal(events.length, 2);
  assert.equal(events[0].event, "meta");
  assert.equal(events[1].event, "warning");
  assert.equal(state.buffer, "");
}

// ── Happy path: meta → header → sections → done ─────────────────────────────
const HEADER = {
  case: {
    requested_case: "trigger thumb release",
    canonical_slug: "trigger_finger_release",
    canonical_name: "Trigger Finger Release",
    requires_clarification: false,
  },
  header: {
    display_name: "Trigger Finger Release",
    certified: false,
    procedure_type: "release_or_decompression",
    difficulty: "foundational",
    pgy_level: "MS4-PGY2",
    est_prep_minutes: 20,
    common_attending_focus: ["radial digital nerve"],
  },
};
{
  const frames =
    encodeSseEvent("meta", {
      packet_id: "p1",
      caseprep_version: "v1.1",
      engine: "web_packet_stream",
      stream_protocol_version: 1,
    }) +
    encodeSseEvent("header", HEADER) +
    encodeSseEvent("section", {
      section_id: "pimp_questions",
      status: "partial",
      items: [
        {
          id: "a1",
          question: "Q1",
          answer: "A1",
          category: "attending_question",
          confidence: 0.9,
          generated: false,
        },
      ],
      source: "certified",
      generated_field_paths: [],
      duration_ms: 10,
    }) +
    encodeSseEvent("section", {
      section_id: "pimp_questions",
      status: "complete",
      items: [
        {
          id: "a1",
          question: "Q1",
          answer: "A1",
          category: "attending_question",
          confidence: 0.9,
          generated: false,
          teaching_pearl: "Pearl.",
          difficulty: "medium",
        },
      ],
      source: "certified",
      generated_field_paths: ["items[0].teaching_pearl"],
      duration_ms: 10,
    }) +
    encodeSseEvent("done", { pipeline_status: {}, timing: { total_ms: 900 }, warnings: [] });
  const state = reduceAll(frames);
  assert.equal(state.status, "done");
  assert.equal(state.header?.display_name, "Trigger Finger Release");
  const pimp = state.sections["pimp_questions"];
  assert.ok(pimp);
  assert.equal(pimp.status, "complete");
  assert.equal(pimp.items[0].teaching_pearl, "Pearl.");
  assert.deepEqual(pimp.generatedFieldPaths, ["items[0].teaching_pearl"]);
}

// ── Out-of-order arrival never changes slot mapping ─────────────────────────
{
  const frames =
    encodeSseEvent("section", {
      section_id: "pitfalls",
      status: "complete",
      items: [{ id: "p1", question: "Mistake", answer: "Avoid it", category: "pitfall" }],
      source: "curated_uncertified",
    }) +
    encodeSseEvent("section", {
      section_id: "summary",
      status: "complete",
      items: [{ id: "s1", question: "Overview", answer: "Release of the A1 pulley", category: "summary" }],
      source: "curated_uncertified",
    });
  const state = reduceAll(frames);
  assert.ok(state.sections["pitfalls"]);
  assert.ok(state.sections["summary"]);
}

// ── Clarification path is terminal and carries options ──────────────────────
{
  const frames =
    encodeSseEvent("meta", {
      packet_id: "p2",
      caseprep_version: "v1.1",
      engine: "web_packet_stream",
      stream_protocol_version: 1,
    }) +
    encodeSseEvent("clarification", {
      case: { requested_case: "ctr", canonical_slug: "carpal_tunnel_release", canonical_name: "Carpal Tunnel Release" },
      clarification_reason: "Choose open or endoscopic.",
      options: [{ label: "Open Carpal Tunnel Release", prompt: "Open Carpal Tunnel Release" }],
    }) +
    encodeSseEvent("done", { pipeline_status: {}, timing: {}, warnings: [] });
  const state = reduceAll(frames);
  assert.equal(state.status, "clarification");
  assert.equal(state.clarification?.options.length, 1);
}

// ── Degradation: section_error doesn't kill the packet; late error can't downgrade complete ──
{
  const frames =
    encodeSseEvent("section_error", { section_id: "evidence", reason: "timed out" }) +
    encodeSseEvent("section", {
      section_id: "anatomy",
      status: "complete",
      items: [{ id: "n1", question: "Nerve", answer: "Radial digital nerve", category: "structure_at_risk" }],
      source: "certified",
    }) +
    encodeSseEvent("section_error", { section_id: "anatomy", reason: "late duplicate" }) +
    encodeSseEvent("done", { pipeline_status: {}, timing: {}, warnings: ["Enrichment degraded"] });
  const state = reduceAll(frames);
  assert.equal(state.status, "done");
  assert.equal(state.sections["evidence"]?.status, "error");
  assert.equal(state.sections["anatomy"]?.status, "complete");
  assert.deepEqual(state.warnings, ["Enrichment degraded"]);
}

// ── KG-injected related_concepts event validates ────────────────────────────
{
  const frames = encodeSseEvent("section", {
    section_id: "related_concepts",
    status: "complete",
    items: [
      {
        id: "kg:1",
        question: "A1 pulley",
        answer: "anatomy structure",
        category: "anatomy_structure",
        source_ids: ["kg-beta-20260716-002"],
        confidence: 0.75,
        generated: false,
        source: "kg",
      },
    ],
    source: "kg",
    generated_field_paths: [],
    duration_ms: 0,
  });
  const state = reduceAll(frames);
  assert.equal(state.sections["related_concepts"]?.source, "kg");
}

// ── Fatal error event ───────────────────────────────────────────────────────
{
  const state = reduceAll(encodeSseEvent("error", { message: "boom" }));
  assert.equal(state.status, "error");
  assert.equal(state.errorMessage, "boom");
}

// ── Route source guards: gate before upstream; frozen routes untouched ──────
const streamRouteSource = readFileSync(
  join(process.cwd(), "src/app/api/case-prep/v1.1/stream/route.ts"),
  "utf8"
);
assert.ok(
  streamRouteSource.indexOf("getBroBotAccessGate") <
    streamRouteSource.indexOf("/case-prep/web/v1.1/stream"),
  "entitlement gate must run before the upstream stream is opened"
);
assert.match(streamRouteSource, /isCasePrepStreamEnabled\(\)/);
assert.match(streamRouteSource, /X-Accel-Buffering/);

const legacyAskRouteSource = readFileSync(
  join(process.cwd(), "src/app/api/brobot/ask/route.ts"),
  "utf8"
);
assert.doesNotMatch(legacyAskRouteSource, /v1\.1\/stream/);

console.log("CasePrep v1.1 stream contract tests passed");
