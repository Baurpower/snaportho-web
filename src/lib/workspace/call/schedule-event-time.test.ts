/**
 * Unit tests for schedule_events time validation, duration presets, and
 * card time-label formatting.
 *
 * Run with: npx tsx src/lib/workspace/call/schedule-event-time.test.ts
 */

import assert from "node:assert/strict";
import {
  detectPreset,
  formatScheduleEventTimeLabel,
  getPresetTimes,
  isValidHHMM,
  validateScheduleEventTimes,
} from "./schedule-event-time";

// ─── isValidHHMM ────────────────────────────────────────────────────────────

assert.equal(isValidHHMM("00:00"), true, "00:00 is a valid boundary time");
assert.equal(isValidHHMM("23:59"), true, "23:59 is a valid boundary time");
assert.equal(isValidHHMM("12:00"), true, "12:00 is valid");
assert.equal(isValidHHMM("99:99"), false, "99:99 is rejected");
assert.equal(isValidHHMM("24:00"), false, "24:00 is out of range");
assert.equal(isValidHHMM("12:60"), false, "minutes above 59 are rejected");
assert.equal(isValidHHMM("1:00"), false, "single-digit hour is rejected");
assert.equal(isValidHHMM(""), false, "empty string is rejected");
assert.equal(isValidHHMM(null), false, "null is rejected");
assert.equal(isValidHHMM(undefined), false, "undefined is rejected");

// ─── validateScheduleEventTimes ─────────────────────────────────────────────

assert.equal(
  validateScheduleEventTimes({ isAllDay: true }).valid,
  true,
  "all-day events are always valid regardless of time fields"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: true, startTime: "99:99", endTime: null }).valid,
  true,
  "all-day events ignore invalid time fields"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false }).valid,
  false,
  "timed events missing both start and end are rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, startTime: "08:00" }).valid,
  false,
  "timed events missing endTime are rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, endTime: "12:00" }).valid,
  false,
  "timed events missing startTime are rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, startTime: "99:99", endTime: "12:00" }).valid,
  false,
  "invalid startTime format is rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, startTime: "08:00", endTime: "99:99" }).valid,
  false,
  "invalid endTime format is rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, startTime: "12:00", endTime: "12:00" }).valid,
  false,
  "endTime equal to startTime is rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, startTime: "17:00", endTime: "12:00" }).valid,
  false,
  "endTime before startTime is rejected"
);

assert.equal(
  validateScheduleEventTimes({ isAllDay: false, startTime: "12:00", endTime: "17:00" }).valid,
  true,
  "a valid timed range with startTime < endTime is accepted"
);

// ─── getPresetTimes ─────────────────────────────────────────────────────────

assert.deepEqual(
  getPresetTimes("clinic", "full_day"),
  { isAllDay: true, startTime: null, endTime: null },
  "full_day preset clears times for any category"
);

assert.deepEqual(
  getPresetTimes("clinic", "am_half"),
  { isAllDay: false, startTime: "08:00", endTime: "12:00" },
  "Clinic AM half is 08:00-12:00"
);

assert.deepEqual(
  getPresetTimes("clinic", "pm_half"),
  { isAllDay: false, startTime: "12:00", endTime: "17:00" },
  "Clinic PM half is 12:00-17:00"
);

assert.deepEqual(
  getPresetTimes("or", "am_half"),
  { isAllDay: false, startTime: "07:00", endTime: "12:00" },
  "OR AM half is 07:00-12:00"
);

assert.deepEqual(
  getPresetTimes("or", "pm_half"),
  { isAllDay: false, startTime: "12:00", endTime: "17:00" },
  "OR PM half is 12:00-17:00"
);

assert.deepEqual(
  getPresetTimes("custom", "am_half"),
  { isAllDay: false, startTime: "08:00", endTime: "12:00" },
  "unknown/custom category AM half falls back to 08:00-12:00"
);

assert.deepEqual(
  getPresetTimes("custom", "pm_half"),
  { isAllDay: false, startTime: "12:00", endTime: "17:00" },
  "unknown/custom category PM half falls back to 12:00-17:00"
);

const customPreset = getPresetTimes("clinic", "custom");
assert.equal(customPreset.isAllDay, false, "custom preset is not all-day");
assert.equal(customPreset.startTime, null, "custom preset leaves startTime for caller to fill in");
assert.equal(customPreset.endTime, null, "custom preset leaves endTime for caller to fill in");

// ─── detectPreset ───────────────────────────────────────────────────────────

assert.equal(detectPreset("clinic", true, null, null), "full_day");
assert.equal(detectPreset("clinic", false, "08:00", "12:00"), "am_half");
assert.equal(detectPreset("clinic", false, "12:00", "17:00"), "pm_half");
assert.equal(detectPreset("or", false, "07:00", "12:00"), "am_half");
assert.equal(detectPreset("or", false, "08:00", "12:00"), "custom", "OR 08:00-12:00 is not the OR AM preset");
assert.equal(detectPreset("clinic", false, "12:30", "16:30"), "custom");
assert.equal(detectPreset("clinic", false, null, null), "custom");

// ─── formatScheduleEventTimeLabel ───────────────────────────────────────────

assert.equal(
  formatScheduleEventTimeLabel({ isAllDay: true, startTime: null, endTime: null }),
  null,
  "all-day events have no time label"
);

assert.equal(
  formatScheduleEventTimeLabel({
    isAllDay: false,
    startTime: "08:00",
    endTime: "12:00",
    category: "clinic",
  }),
  "AM half · 08:00-12:00",
  "Clinic AM half renders as 'AM half · 08:00-12:00'"
);

assert.equal(
  formatScheduleEventTimeLabel({
    isAllDay: false,
    startTime: "12:00",
    endTime: "17:00",
    category: "clinic",
  }),
  "PM half · 12:00-17:00",
  "PM half renders as 'PM half · 12:00-17:00'"
);

assert.equal(
  formatScheduleEventTimeLabel({
    isAllDay: false,
    startTime: "12:30",
    endTime: "16:30",
    category: "custom",
  }),
  "12:30-16:30",
  "a custom time range renders as a plain start-end range"
);

assert.equal(
  formatScheduleEventTimeLabel({
    isAllDay: false,
    startTime: "08:00:00",
    endTime: "12:00:00",
    category: "clinic",
  }),
  "AM half · 08:00-12:00",
  "HH:MM:SS values coming back from the DB are truncated to HH:MM before labeling"
);

console.log("schedule-event-time.test.ts passed");
