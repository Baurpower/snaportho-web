import assert from "node:assert/strict";
import {
  enumerateAllDayDates,
  normalizeCalendarPersonName,
  validateCalendarEvent,
  // @ts-expect-error Node strip-types resolves the explicit TypeScript extension.
} from "./program-calendar-source.ts";

assert.equal(normalizeCalendarPersonName("  McNair  "), "mcnair");
assert.deepEqual(enumerateAllDayDates("2026-08-21", "2026-08-24"), [
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
]);

const result = validateCalendarEvent({
  title: "McNair - Labor Day",
  startDate: "2026-09-04",
  endDateExclusive: "2026-09-08",
  aliases: [
    {
      normalized_alias: "mcnair",
      roster_id: "r1",
      program_membership_id: "m1",
    },
  ],
});
assert.equal(result.validationStatus, "warning");
assert.equal(result.alias?.roster_id, "r1");
assert.equal(result.dates.length, 4);

const blocked = validateCalendarEvent({
  title: "Unknown",
  startDate: "2026-08-01",
  endDateExclusive: "2026-08-02",
  aliases: [],
});
assert.equal(blocked.validationStatus, "blocked");
console.log("program calendar source tests passed");
