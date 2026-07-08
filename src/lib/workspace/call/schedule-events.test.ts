/**
 * Unit tests for the schedule_events row-shaping helpers.
 *
 * These exercise the exact payloads sent to/read from Supabase for create,
 * update, and fetch, without needing a live database connection.
 *
 * Run with: npx tsx src/lib/workspace/call/schedule-events.test.ts
 */

import assert from "node:assert/strict";
import {
  buildCreateScheduleEventRows,
  buildUpdateScheduleEventPayload,
  mapScheduleEventRow,
} from "./schedule-events";

// ─── buildCreateScheduleEventRows (POST) ────────────────────────────────────

const allDayRows = buildCreateScheduleEventRows({
  userId: "user-1",
  title: "OR",
  category: "or",
  dates: ["2026-07-06"],
  isAllDay: true,
});

assert.equal(allDayRows.length, 1);
assert.equal(allDayRows[0].start_time, null, "all-day POST stores null start_time");
assert.equal(allDayRows[0].end_time, null, "all-day POST stores null end_time");
assert.equal(allDayRows[0].is_all_day, true);

const timedRows = buildCreateScheduleEventRows({
  userId: "user-1",
  title: "Clinic",
  category: "clinic",
  dates: ["2026-07-06"],
  isAllDay: false,
  startTime: "12:00",
  endTime: "17:00",
});

assert.equal(timedRows[0].start_time, "12:00", "timed POST stores 12:00 for start_time");
assert.equal(timedRows[0].end_time, "17:00", "timed POST stores 17:00 for end_time");
assert.equal(timedRows[0].is_all_day, false);

assert.throws(
  () =>
    buildCreateScheduleEventRows({
      userId: "user-1",
      title: "Clinic",
      category: "clinic",
      dates: ["2026-07-06"],
      isAllDay: false,
    }),
  /startTime and an endTime/,
  "timed events missing start/end are rejected before hitting the DB"
);

// Multiple selected days each keep their own event_date.
const multiDayRows = buildCreateScheduleEventRows({
  userId: "user-1",
  title: "OR",
  category: "or",
  dates: ["2026-07-06", "2026-07-07"],
  isAllDay: false,
  startTime: "07:00",
  endTime: "12:00",
});

assert.equal(multiDayRows[0].event_date, "2026-07-06");
assert.equal(multiDayRows[1].event_date, "2026-07-07");
assert.equal(multiDayRows[0].start_time, "07:00");
assert.equal(multiDayRows[1].start_time, "07:00");

// ─── buildUpdateScheduleEventPayload (PATCH) ────────────────────────────────

const timedUpdatePayload = buildUpdateScheduleEventPayload({
  eventId: "event-1",
  userId: "user-1",
  isAllDay: false,
  startTime: "12:00",
  endTime: "17:00",
});

assert.equal(timedUpdatePayload.start_time, "12:00", "timed PATCH stores 12:00 for start_time");
assert.equal(timedUpdatePayload.end_time, "17:00", "timed PATCH stores 17:00 for end_time");
assert.equal(timedUpdatePayload.is_all_day, false);

const allDayUpdatePayload = buildUpdateScheduleEventPayload({
  eventId: "event-1",
  userId: "user-1",
  isAllDay: true,
  startTime: "12:00",
  endTime: "17:00",
});

assert.equal(
  allDayUpdatePayload.start_time,
  null,
  "switching to all-day clears start_time even if a stale startTime is passed"
);
assert.equal(allDayUpdatePayload.end_time, null);

// ─── mapScheduleEventRow (fetch) ─────────────────────────────────────────────

const fetchedRow = mapScheduleEventRow({
  id: "event-1",
  user_id: "user-1",
  title: "Clinic",
  category: "clinic",
  event_date: "2026-07-06",
  is_all_day: false,
  start_time: "12:00:00",
  end_time: "17:00:00",
  location: null,
  description: null,
  attending: null,
});

assert.equal(fetchedRow.start_time, "12:00", "fetch truncates HH:MM:SS to HH:MM");
assert.equal(fetchedRow.end_time, "17:00", "fetch truncates HH:MM:SS to HH:MM");

const fetchedAllDayRow = mapScheduleEventRow({
  id: "event-2",
  user_id: "user-1",
  title: "OR",
  category: "or",
  event_date: "2026-07-06",
  is_all_day: true,
  start_time: null,
  end_time: null,
  location: null,
  description: null,
  attending: null,
});

assert.equal(fetchedAllDayRow.start_time, null);
assert.equal(fetchedAllDayRow.end_time, null);

console.log("schedule-events.test.ts passed");
