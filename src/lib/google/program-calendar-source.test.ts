import assert from "node:assert/strict";
import {
  enumerateAllDayDates,
  normalizeCalendarPersonName,
  validateCalendarEvent,
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

const pto = validateCalendarEvent({
  title: "Fang PTO",
  startDate: "2026-09-21",
  endDateExclusive: "2026-09-26",
  aliases: [],
});
assert.equal(pto.validationStatus, "ignored");
assert.equal(pto.alias, null);
assert.deepEqual(pto.issues, []);
assert.equal(pto.dates.length, 5);
console.log("program calendar source tests passed");
