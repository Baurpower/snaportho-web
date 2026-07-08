/**
 * Unit tests for the pure planner-draft helpers used by the week planner's
 * duration presets and copy-to-other-days behavior.
 *
 * Run with: npx tsx src/components/workspace/weekplanner.test.ts
 */

import assert from "node:assert/strict";
import {
  applyPreset,
  copyDraftToDates,
  createDefaultDraft,
  createDraftFromExistingEvent,
  type DayDraft,
  type ExistingScheduleEvent,
} from "./weekplanner";

// ─── applyPreset ─────────────────────────────────────────────────────────────

const baseDraft: DayDraft = {
  ...createDefaultDraft("clinic"),
  selected: true,
};

const fullDayDraft = applyPreset(
  { ...baseDraft, isAllDay: false, startTime: "12:30", endTime: "16:30" },
  "full_day"
);
assert.equal(fullDayDraft.isAllDay, true, "full_day preset sets isAllDay true");
assert.equal(fullDayDraft.startTime, "", "full_day preset clears startTime");
assert.equal(fullDayDraft.endTime, "", "full_day preset clears endTime");

const clinicAm = applyPreset(baseDraft, "am_half");
assert.equal(clinicAm.isAllDay, false);
assert.equal(clinicAm.startTime, "08:00", "Clinic AM half preset fills 08:00");
assert.equal(clinicAm.endTime, "12:00", "Clinic AM half preset fills 12:00");

const clinicPm = applyPreset(baseDraft, "pm_half");
assert.equal(clinicPm.startTime, "12:00", "Clinic PM half preset fills 12:00");
assert.equal(clinicPm.endTime, "17:00", "Clinic PM half preset fills 17:00");

const orDraft: DayDraft = { ...createDefaultDraft("or"), selected: true };
const orAm = applyPreset(orDraft, "am_half");
assert.equal(orAm.startTime, "07:00", "OR AM half preset fills 07:00");
assert.equal(orAm.endTime, "12:00", "OR AM half preset fills 12:00");

const orPm = applyPreset(orDraft, "pm_half");
assert.equal(orPm.startTime, "12:00", "OR PM half preset fills 12:00");
assert.equal(orPm.endTime, "17:00", "OR PM half preset fills 17:00");

const customDraft = applyPreset(
  { ...baseDraft, startTime: "09:15", endTime: "10:45" },
  "custom"
);
assert.equal(customDraft.isAllDay, false, "custom preset is not all-day");
assert.equal(
  customDraft.startTime,
  "09:15",
  "custom preset preserves whatever start time was already on the draft"
);
assert.equal(customDraft.endTime, "10:45");

// ─── createDraftFromExistingEvent / preset detection ────────────────────────

const existingHalfDayEvent: ExistingScheduleEvent = {
  id: "event-1",
  title: "Clinic",
  category: "clinic",
  event_date: "2026-07-06",
  is_all_day: false,
  start_time: "08:00",
  end_time: "12:00",
  location: null,
  attending: null,
  description: null,
};

const draftFromExisting = createDraftFromExistingEvent(existingHalfDayEvent);
assert.equal(draftFromExisting.preset, "am_half", "existing 08:00-12:00 clinic event is detected as am_half");

// ─── copyDraftToDates ────────────────────────────────────────────────────────

const drafts: Record<string, DayDraft> = {
  "2026-07-06": {
    ...createDefaultDraft("clinic"),
    selected: true,
    preset: "pm_half",
    isAllDay: false,
    startTime: "12:00",
    endTime: "17:00",
    title: "Clinic",
  },
  "2026-07-07": createDefaultDraft("clinic"),
  "2026-07-08": createDefaultDraft("clinic"),
};

const copied = copyDraftToDates(drafts, "2026-07-06", [
  "2026-07-06",
  "2026-07-07",
  "2026-07-08",
]);

assert.equal(copied["2026-07-07"].isAllDay, false, "copy preserves isAllDay on target days");
assert.equal(copied["2026-07-07"].startTime, "12:00", "copy preserves startTime on target days");
assert.equal(copied["2026-07-07"].endTime, "17:00", "copy preserves endTime on target days");
assert.equal(copied["2026-07-07"].preset, "pm_half", "copy preserves preset on target days");
assert.equal(copied["2026-07-08"].startTime, "12:00");

// Each copied day keeps its own event_date (the drafts record is keyed by
// date, and copyDraftToDates never touches the record's keys).
assert.deepEqual(
  Object.keys(copied).sort(),
  ["2026-07-06", "2026-07-07", "2026-07-08"],
  "copy does not introduce or remove date keys"
);

// The source day itself is left untouched.
assert.equal(copied["2026-07-06"].startTime, "12:00");

console.log("weekplanner.test.ts passed");
