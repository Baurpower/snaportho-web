/**
 * Unit tests for time-off import safety helpers and schema-aligned constants.
 *
 * Run with: npx tsx src/lib/workspace/call/time-off-import.test.ts
 *
 * These do not require production credentials. SQL structure tests read the
 * migration files from disk.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertUsingPtoAllowed,
  AVAILABILITY_EVENT_TYPES,
  AVAILABILITY_SOURCE_KINDS,
  buildAvailabilityEventDayRows,
  buildHoustonMethodistImportKey,
  enumerateTimeOffDates,
  isAvailabilitySourceKind,
  PROGRAM_TIME_OFF_SOURCE_KIND,
  SELF_TIME_OFF_SOURCE_KIND,
  timeOffImportIdentity,
} from "./time-off";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const importSqlPath = path.join(
  root,
  "supabase/migrations/import_2026_2027_houston_methodist_time_off.sql"
);
const membershipSqlPath = path.join(
  root,
  "supabase/migrations/20260725_120000_availability_events_membership_nullable.sql"
);
const eventTypeSqlPath = path.join(
  root,
  "supabase/migrations/20260725_121000_availability_events_event_type_expand.sql"
);
const verificationSqlPath = path.join(
  root,
  "supabase/verification/houston_methodist_2026_27_time_off.sql"
);

const importSql = readFileSync(importSqlPath, "utf8");
const membershipSql = readFileSync(membershipSqlPath, "utf8");
const eventTypeSql = readFileSync(eventTypeSqlPath, "utf8");

// ─── 1. canonical source_kind acceptance ───────────────────────────────────

assert.equal(PROGRAM_TIME_OFF_SOURCE_KIND, "official");
assert.equal(SELF_TIME_OFF_SOURCE_KIND, "self_reported");
assert.deepEqual([...AVAILABILITY_SOURCE_KINDS].sort(), [
  "official",
  "preference",
  "self_reported",
].sort());
for (const kind of AVAILABILITY_SOURCE_KINDS) {
  assert.equal(isAvailabilitySourceKind(kind), true, `${kind} accepted`);
}

// ─── 2. invalid source_kind rejection ──────────────────────────────────────

assert.equal(isAvailabilitySourceKind("admin_entry"), false);
assert.equal(isAvailabilitySourceKind("program_quick_add"), false);
assert.equal(isAvailabilitySourceKind(""), false);
assert.equal(isAvailabilitySourceKind(null), false);

// ─── 3. using_pto validation (rollback-class input rejection) ──────────────

assert.doesNotThrow(() => assertUsingPtoAllowed("vacation", true));
assert.doesNotThrow(() => assertUsingPtoAllowed("conference", false));
assert.throws(
  () => assertUsingPtoAllowed("conference", true),
  /using_pto=true is not allowed/
);
assert.throws(
  () => assertUsingPtoAllowed("other", true),
  /using_pto=true is not allowed/
);

// ─── 4/5. idempotent identity (no duplicate parents / days) ────────────────

const identityA = timeOffImportIdentity({
  programId: "082cc352-bba2-4f19-b837-b28d0878a308",
  rosterId: "3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22",
  eventType: "other",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  title: "Justin Walsh — Dallas Trauma",
  sourceKind: PROGRAM_TIME_OFF_SOURCE_KIND,
});
const identityB = timeOffImportIdentity({
  programId: "082cc352-bba2-4f19-b837-b28d0878a308",
  rosterId: "3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22",
  eventType: "other",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  title: " Justin Walsh — Dallas Trauma ",
  sourceKind: PROGRAM_TIME_OFF_SOURCE_KIND,
});
assert.deepEqual(identityA, identityB, "normalized title matches for reuse");

const key = buildHoustonMethodistImportKey({
  rosterId: "3cf8eb3d-dba1-4c48-a33c-ea79d1ea3d22",
  eventType: "other",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
});
assert.match(key, /^\[snaportho-import:houston-methodist-2026-27:/);

// ─── 6. inclusive multi-day generation ─────────────────────────────────────

const multi = enumerateTimeOffDates("2026-09-01", "2026-09-03");
assert.equal(multi.length, 3);
assert.deepEqual(
  multi.map((d) => d.off_date),
  ["2026-09-01", "2026-09-02", "2026-09-03"]
);

// Month-long Justin Walsh Dallas Trauma
const trauma = enumerateTimeOffDates("2026-09-01", "2026-09-30");
assert.equal(trauma.length, 30, "inclusive month-long block");

// Year boundary
const nye = enumerateTimeOffDates("2026-12-31", "2027-01-03");
assert.equal(nye.length, 4);

// ─── 7. weekend calculation ────────────────────────────────────────────────

// 2026-09-05 is Saturday, 2026-09-06 is Sunday
const weekendSpan = enumerateTimeOffDates("2026-09-04", "2026-09-07");
assert.equal(weekendSpan[0].is_weekend, false, "Fri");
assert.equal(weekendSpan[1].is_weekend, true, "Sat");
assert.equal(weekendSpan[2].is_weekend, true, "Sun");
assert.equal(weekendSpan[3].is_weekend, false, "Mon");

// ─── 8/9. membership nullability intent (claimed vs unclaimed) ─────────────

const claimedDays = buildAvailabilityEventDayRows({
  eventId: "evt-claimed",
  programId: "prog",
  membershipId: "1c394b65-1c38-4222-8e34-298bcdd93c38",
  rosterId: "c57c41db-a1e3-45b3-8f93-05a2bbbc4a80",
  eventType: "vacation",
  sourceKind: PROGRAM_TIME_OFF_SOURCE_KIND,
  constraintLevel: "hard",
  startDate: "2026-09-02",
  endDate: "2026-09-02",
});
assert.equal(claimedDays[0].membership_id, "1c394b65-1c38-4222-8e34-298bcdd93c38");

const unclaimedDays = buildAvailabilityEventDayRows({
  eventId: "evt-unclaimed",
  programId: "prog",
  membershipId: null,
  rosterId: "b4ac3a24-4bc3-4c9c-96b5-e26172412cce",
  eventType: "vacation",
  sourceKind: PROGRAM_TIME_OFF_SOURCE_KIND,
  constraintLevel: "hard",
  startDate: "2026-08-16",
  endDate: "2026-08-16",
});
assert.equal(unclaimedDays[0].membership_id, null);
assert.equal(unclaimedDays[0].roster_id, "b4ac3a24-4bc3-4c9c-96b5-e26172412cce");

// ─── 10. roster/program mismatch rejection is enforced in SQL preflight ────

assert.match(importSql, /roster IDs belong to a different program/i);
assert.match(importSql, /target program % does not exist/i);
assert.match(importSql, /slug is %, expected %/i);

// ─── 11. child rows exactly match parent date range ────────────────────────

const parentRange = buildAvailabilityEventDayRows({
  eventId: "evt-range",
  programId: "prog",
  membershipId: null,
  rosterId: "roster",
  eventType: "other",
  sourceKind: "official",
  constraintLevel: "hard",
  startDate: "2027-05-01",
  endDate: "2027-05-31",
});
assert.equal(parentRange.length, 31);
assert.equal(parentRange[0].off_date, "2027-05-01");
assert.equal(parentRange[30].off_date, "2027-05-31");
assert.ok(parentRange.every((row) => row.event_id === "evt-range"));
assert.ok(parentRange.every((row) => row.source_kind === "official"));
assert.ok(parentRange.every((row) => row.event_type === "other"));

// ─── 12. existing exact event with missing child days is repaired safely ───

assert.match(importSql, /insert only missing/i);
assert.match(importSql, /not exists \(\s*select 1\s*from public\.availability_event_days/i);
assert.match(importSql, /hm_2026_27_parent_map/);
assert.match(importSql, /was_inserted/);
assert.doesNotMatch(importSql, /delete from public\.availability_events/i);
assert.doesNotMatch(
  importSql,
  /alter table public\.availability_events\s+alter column membership_id drop not null/i
);

// ─── Full rollback when one input row is invalid (preflight before DML) ────

const preflightIdx = importSql.indexOf("Preflight validation");
const insertParentsIdx = importSql.indexOf(
  "insert into public.availability_events"
);
assert.ok(preflightIdx > 0, "preflight section present");
assert.ok(
  insertParentsIdx > preflightIdx,
  "parent insert happens after preflight"
);
assert.match(importSql, /raise exception/i);
assert.match(importSql, /pg_advisory_xact_lock/);
assert.match(importSql, /\bbegin;/i);
assert.match(importSql, /\bcommit;/i);

// ─── Import uses canonical official source_kind ────────────────────────────

const officialCount = (importSql.match(/'official'::text/g) ?? []).length;
assert.equal(officialCount, 92, "all 92 input rows use official source_kind");
assert.doesNotMatch(
  importSql.replace(/admin_entry, program_quick_add/g, ""),
  /'admin_entry'/
);
assert.doesNotMatch(
  importSql.replace(/admin_entry, program_quick_add/g, ""),
  /'program_quick_add'/
);

// Dataset completeness
assert.equal((importSql.match(/'vacation'::text/g) ?? []).length, 67);
assert.equal((importSql.match(/'conference'::text/g) ?? []).length, 23);
assert.equal((importSql.match(/'other'::text/g) ?? []).length, 2);
assert.doesNotMatch(importSql, /Dallas Trauma/);
assert.match(importSql, /Justin Walsh — Europe Elective/);
assert.match(importSql, /Erin Orozco — Peru Elective/);
assert.match(importSql, /Clyde Fomunung — AOSSM/);
assert.match(importSql, /2027-07-11/);

// Schema migrations separate from import
assert.match(membershipSql, /drop not null/i);
assert.match(membershipSql, /Evidence/i);
assert.doesNotMatch(membershipSql, /insert into public\.availability_events/i);
assert.match(eventTypeSql, /'other'/);
assert.match(eventTypeSql, /'sick'/);
assert.doesNotMatch(eventTypeSql, /insert into public\.availability_events/i);

// Event type catalog includes app types
for (const t of ["vacation", "conference", "personal", "sick", "other"]) {
  assert.ok(
    (AVAILABILITY_EVENT_TYPES as readonly string[]).includes(t),
    `${t} in catalog`
  );
}

// Invalid date range rejection
assert.throws(() => enumerateTimeOffDates("2027-01-05", "2027-01-01"), /after/);

// Verification SQL (read-only helpers) exists
const verificationSql = readFileSync(verificationSqlPath, "utf8");
assert.match(verificationSql, /transaction read only|begin;/i);
assert.match(verificationSql, /availability_events_source_kind_check/);
assert.match(verificationSql, /rollback/i);

console.log("time-off-import.test.ts: all assertions passed");
