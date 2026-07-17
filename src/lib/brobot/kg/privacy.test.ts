import assert from "node:assert/strict";

import { hashBroBotKgQuery, sanitizeBroBotKgQuery } from "./privacy";

const sanitized = sanitizeBroBotKgQuery(
  "John Smith MRN 123456789 DOB 01/02/1980 room 4B email john@example.com phone 415-555-1212"
);
assert.ok(!sanitized.includes("John Smith"));
assert.ok(!sanitized.includes("123456789"));
assert.ok(!sanitized.includes("01/02/1980"));
assert.ok(!sanitized.includes("john@example.com"));
assert.ok(!sanitized.includes("415-555-1212"));
assert.equal(hashBroBotKgQuery(" Distal Radius "), hashBroBotKgQuery("distal radius"));

console.log("brobot kg privacy tests passed");
