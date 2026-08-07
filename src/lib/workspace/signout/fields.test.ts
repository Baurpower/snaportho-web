import assert from "node:assert/strict";
import { serializeFields, splitFields } from "./fields";

// Split a structured body into lead + known fields.
const body =
  "34M R femur s/p IM nail · NWB\n" +
  "## HPI/Exam\nWatch compartments\n" +
  "## Plan\n[ ] Recheck q2h";
const f = splitFields(body);
assert.equal(f.lead, "34M R femur s/p IM nail · NWB");
assert.equal(f.values["HPI/Exam"], "Watch compartments");
assert.equal(f.values["Plan"], "[ ] Recheck q2h");
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

console.log("Sign-out fields tests passed");
