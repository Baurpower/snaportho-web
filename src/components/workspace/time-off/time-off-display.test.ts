/**
 * Run: npx tsx src/components/workspace/time-off/time-off-display.test.ts
 */
import assert from "node:assert/strict";
import {
  buildProgramKpis,
  filterProgramTimeOffItems,
  groupItemsByResident,
  mergeTimeOffItems,
  normalizeTimeOffMonthResponse,
  createDefaultProgramFilters,
} from "./time-off-display";
import type { TimeOffItem } from "@/lib/workspace/call/time-off-shared";

const base: TimeOffItem = {
  id: "1",
  membershipId: null,
  rosterId: "r1",
  programMembershipId: null,
  residentName: "Justin Walsh",
  trainingLevel: null,
  classYear: null,
  userId: null,
  type: "other",
  usingPto: false,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  title: "Dallas Trauma",
  location: null,
  notes: null,
  approvalStatus: "approved",
  approved: true,
  isMine: false,
};

const vacation: TimeOffItem = {
  ...base,
  id: "2",
  type: "vacation",
  usingPto: true,
  startDate: "2026-08-07",
  endDate: "2026-08-09",
  title: "PTO",
  approvalStatus: "requested",
  approved: null,
};

const normalized = normalizeTimeOffMonthResponse({
  monthStart: "2026-07-01",
  monthEnd: "2026-07-31",
  myMembershipId: "m1",
  myRosterId: "r9",
  items: [
    {
      id: "e1",
      membershipId: null,
      rosterId: "r2",
      programMembershipId: null,
      residentName: "Erin Orozco",
      type: "vacation",
      usingPto: true,
      startDate: "2026-07-25",
      endDate: "2026-07-26",
      title: "PTO",
      location: null,
      notes: null,
      approvalStatus: "approved",
      isMine: false,
    },
  ],
});

assert.equal(normalized.items[0].type, "vacation");
assert.equal(normalized.items[0].rosterId, "r2");
assert.equal(normalized.items[0].residentName, "Erin Orozco");
assert.equal(normalized.myRosterId, "r9");

const merged = mergeTimeOffItems([[base], [base, vacation]]);
assert.equal(merged.length, 2);

const filters = createDefaultProgramFilters();
filters.types = new Set(["vacation"]);
const filtered = filterProgramTimeOffItems([base, vacation], filters);
assert.equal(filtered.length, 1);
assert.equal(filtered[0].id, "2");

const groups = groupItemsByResident([base, vacation]);
assert.equal(groups.length, 1);
assert.equal(groups[0].ptoDays, 3);
assert.equal(groups[0].totalDays, 33);

const kpis = buildProgramKpis([base, vacation], "2026-09-05");
assert.equal(kpis.eventCount, 2);
assert.equal(kpis.pending, 1);
assert.equal(kpis.outToday, 1);
assert.equal(kpis.ptoDays, 3);

console.log("time-off-display.test.ts: all assertions passed");
