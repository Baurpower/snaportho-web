import assert from "node:assert/strict";
import { buildDraftMessages, draftPayload, DRAFT_SYSTEM_PROMPT } from "./draft-prompt";
import type { SignoutCard } from "./types";

function makeCard(overrides: Partial<SignoutCard>): SignoutCard {
  return {
    id: "c1",
    serviceId: "s1",
    handle: "7W-12",
    attending: "Dr. Lee",
    location: "SICU",
    surgery: "IM nail R femur",
    surgeryDate: "2026-08-05",
    nextSurgery: "",
    nextSurgeryDate: "",
    managementMode: "surgery",
    severity: "unstable",
    status: "active",
    sortOrder: 0,
    pinned: false,
    body: "",
    hasIdentifiers: true,
    version: 1,
    dischargedAt: null,
    createdBy: null,
    createdAt: "",
    updatedBy: null,
    updatedAt: "",
    ...overrides,
  };
}

const card = makeCard({
  body:
    "34M R femur · NWB\n" +
    "## HPI/Exam\nWatch compartments, firm but compressible.\n" +
    "## Labs/Imaging/PT\nWBC 12.4, Hgb 9.1. Image attached.\n" +
    "## Plan\nRecheck q2h.\n## To-do\n[ ] Trend H/H",
});

const payload = draftPayload(card);

// Includes the clinical fields.
assert.equal(payload.oneLiner, "34M R femur · NWB");
assert.ok(payload.hpiExam.includes("Watch compartments"));
assert.ok(payload.labsImaging.includes("Image attached"));
assert.ok(payload.plan.includes("Recheck q2h"));
assert.ok(payload.surgeryContext.includes("IM nail R femur"));

// SAFETY: the payload must never carry location or any identifier field.
const serialized = JSON.stringify(payload).toLowerCase();
assert.ok(!serialized.includes("sicu"), "location must not be sent to the model");
assert.ok(!serialized.includes("dr. lee"), "attending should not appear in the payload");
assert.ok(!("location" in payload));

// The system prompt enforces the {{name}} token and the no-room / no-greeting rules.
assert.ok(DRAFT_SYSTEM_PROMPT.includes("{{name}}"));
assert.ok(/do not include a greeting/i.test(DRAFT_SYSTEM_PROMPT));
assert.ok(/do not include room/i.test(DRAFT_SYSTEM_PROMPT));

// Non-op mode uses the treatment-day context, not POD.
const nonop = makeCard({ managementMode: "nonop", surgery: "IV abx cellulitis", surgeryDate: "2026-08-04" });
assert.ok(draftPayload(nonop).surgeryContext.includes("IV abx cellulitis"));

// buildDraftMessages returns a JSON user payload.
const messages = buildDraftMessages(card);
assert.equal(messages.system, DRAFT_SYSTEM_PROMPT);
assert.deepEqual(JSON.parse(messages.user), payload);

console.log("Sign-out draft-prompt tests passed");
