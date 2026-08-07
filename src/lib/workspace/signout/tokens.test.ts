import assert from "node:assert/strict";
import {
  extractTags,
  parseBody,
  toggleCheckboxAt,
  tokenizeLine,
} from "./tokens";

// tokenizeLine classifies WB / POD / tag / text in order.
const toks = tokenizeLine("s/p ORIF POD 2 · WBAT #dispo");
assert.deepEqual(
  toks.map((t) => t.type),
  ["text", "pod", "text", "wb", "text", "tag"]
);
assert.equal(toks.find((t) => t.type === "pod")?.value, "POD 2");
assert.equal(toks.find((t) => t.type === "wb")?.value, "WBAT");
assert.equal(toks.find((t) => t.type === "tag")?.value, "#dispo");

// case-insensitive WB / POD.
assert.equal(tokenizeLine("nwb today").some((t) => t.type === "wb"), true);
assert.equal(tokenizeLine("pod3 check").some((t) => t.type === "pod"), true);

// empty content -> no tokens.
assert.deepEqual(tokenizeLine(""), []);

// a section header is NOT a tag (regression: '## Subjective' must stay plain text).
const headerToks = tokenizeLine("## Subjective");
assert.equal(headerToks.every((t) => t.type === "text"), true);
assert.deepEqual(extractTags("## Assessment & Plan\nHgb 9.1"), []);
// a real tag mid-line still classifies, with correct surrounding text.
const mixed = tokenizeLine("call PT #dispo now");
assert.deepEqual(mixed.map((t) => t.type), ["text", "tag", "text"]);

// parseBody detects checkbox state per line.
const body = "34M R hip · NWB\n[ ] Recheck compartments\n[x] Foley out";
const lines = parseBody(body);
assert.equal(lines.length, 3);
assert.equal(lines[0].checkbox, "none");
assert.equal(lines[1].checkbox, "unchecked");
assert.equal(lines[2].checkbox, "checked");
assert.equal(lines[1].tokens.map((t) => t.value).join(""), "Recheck compartments");

// toggleCheckboxAt flips only the target line.
const toggled = toggleCheckboxAt(body, 1);
assert.equal(parseBody(toggled)[1].checkbox, "checked");
assert.equal(parseBody(toggled)[2].checkbox, "checked"); // untouched
const untoggled = toggleCheckboxAt(toggled, 2);
assert.equal(parseBody(untoggled)[2].checkbox, "unchecked");
// toggling a non-checkbox line is a no-op.
assert.equal(toggleCheckboxAt(body, 0), body);
// out-of-range index is a no-op.
assert.equal(toggleCheckboxAt(body, 99), body);

// extractTags: unique, lowercased, deduped, no leading #.
assert.deepEqual(
  extractTags("watch #Pending\n[ ] call #pending\n#OR add-on").sort(),
  ["or", "pending"]
);
assert.deepEqual(extractTags("no tags here"), []);

console.log("Sign-out tokens tests passed");
