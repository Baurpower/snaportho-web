import assert from "node:assert/strict";
import {
  parseTodoLines,
  serializeFields,
  serializeTodoLines,
  splitFields,
} from "./fields";

// Split a structured body into lead + known fields.
const body =
  "34M R femur s/p IM nail · NWB\n" +
  "## HPI/Exam\nWatch compartments\n" +
  "## Plan\nContinue NWB\n" +
  "## To-do\n[ ] Recheck q2h";
const f = splitFields(body);
assert.equal(f.lead, "34M R femur s/p IM nail · NWB");
assert.equal(f.values["HPI/Exam"], "Watch compartments");
assert.equal(f.values["Plan"], "Continue NWB");
assert.equal(f.values["To-do"], "[ ] Recheck q2h");
assert.equal(f.values["Labs/Imaging/PT"], undefined);
assert.deepEqual(f.extras, []);

// Round-trip: split then serialize returns an equivalent body.
assert.equal(serializeFields(splitFields(body)), body);

// Empty fields are omitted on serialize.
assert.equal(
  serializeFields({ lead: "one-liner", values: { "HPI/Exam": "", Plan: "do X" }, extras: [] }),
  "one-liner\n## Plan\ndo X"
);

// Unknown sections are preserved as extras and re-emitted.
const withExtra = splitFields("lead\n## Vitals\nT 99\n## Plan\ndo Y");
assert.equal(withExtra.extras.length, 1);
assert.equal(withExtra.extras[0].title, "Vitals");
assert.ok(serializeFields(withExtra).includes("## Vitals\nT 99"));

// A legacy freeform body (no headers) becomes the lead — nothing lost.
const legacy = splitFields("just a one liner NWB POD1");
assert.equal(legacy.lead, "just a one liner NWB POD1");
assert.deepEqual(legacy.values, {});

// Legacy Plan-only body (mixed plan + checkboxes) stays under Plan; To-do empty.
const legacyPlan = splitFields(
  "lead\n## Plan\nSign off if improving.\n[ ] Recheck CBC\n[x] Call plastics"
);
assert.equal(legacyPlan.values["Plan"], "Sign off if improving.\n[ ] Recheck CBC\n[x] Call plastics");
assert.equal(legacyPlan.values["To-do"], undefined);

// Todo line helpers round-trip.
const todos = parseTodoLines("[ ] Recheck CBC\n[x] Call plastics\nplain line");
assert.deepEqual(todos, [
  { checked: false, text: "Recheck CBC" },
  { checked: true, text: "Call plastics" },
  { checked: false, text: "plain line" },
]);
assert.equal(
  serializeTodoLines(todos),
  "[ ] Recheck CBC\n[x] Call plastics\n[ ] plain line"
);
assert.equal(serializeTodoLines([{ checked: false, text: "  " }]), "");
assert.deepEqual(parseTodoLines(""), []);

console.log("Sign-out fields tests passed");
