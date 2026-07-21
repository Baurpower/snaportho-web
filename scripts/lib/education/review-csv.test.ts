import assert from "node:assert/strict";

import { parseCsv, parseRequiredBoolean, serializeCsv } from "./review-csv.ts";

const rows = [
  { id: "one", title: "Comma, quote \"and\" newline\nkept", empty: "" },
  { id: "two", title: "plain", empty: "" },
];
assert.deepEqual(parseCsv(serializeCsv(rows)), rows);
assert.equal(parseRequiredBoolean("TRUE", "flag"), true);
assert.equal(parseRequiredBoolean("false", "flag"), false);
assert.throws(() => parseRequiredBoolean("", "flag"), /must be true or false/);
assert.throws(() => parseCsv('id,title\n1,"unterminated'), /quoted field/);

process.stdout.write("review-csv tests passed\n");
