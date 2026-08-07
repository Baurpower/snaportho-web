import assert from "node:assert/strict";
import {
  buildHandoffDocument,
  groupByLocation,
  locationBucket,
  sortForRounds,
} from "./handoff";
import type { SignoutCard } from "./types";

function card(partial: Partial<SignoutCard> & Pick<SignoutCard, "id" | "handle">): SignoutCard {
  return {
    serviceId: "s1",
    attending: "",
    location: "",
    surgery: "",
    surgeryDate: "",
    nextSurgery: "",
    nextSurgeryDate: "",
    managementMode: "",
    severity: "stable",
    status: "active",
    sortOrder: 0,
    pinned: false,
    body: "",
    hasIdentifiers: false,
    version: 1,
    dischargedAt: null,
    createdBy: null,
    createdAt: "",
    updatedBy: null,
    updatedAt: "",
    ...partial,
  };
}

// --- location buckets ---
assert.equal(locationBucket("SICU 8"), 0);
assert.equal(locationBucket("MICU"), 0);
assert.equal(locationBucket("ED-3"), 1);
assert.equal(locationBucket("7 West"), 2);
assert.equal(locationBucket("444"), 2);
assert.equal(locationBucket(""), 3);

// --- sort: critical care before wards; severity within unit ---
const sorted = sortForRounds([
  card({ id: "1", handle: "Ward Stable", location: "444", severity: "stable" }),
  card({ id: "2", handle: "SICU Watcher", location: "SICU 8", severity: "watcher" }),
  card({ id: "3", handle: "SICU Unstable", location: "SICU 8", severity: "unstable" }),
  card({ id: "4", handle: "ED", location: "ED", severity: "stable" }),
  card({ id: "5", handle: "No Loc", location: "", severity: "stable" }),
  card({ id: "6", handle: "Ward Unstable", location: "444", severity: "unstable" }),
]);
assert.deepEqual(
  sorted.map((c) => c.handle),
  ["SICU Unstable", "SICU Watcher", "ED", "Ward Unstable", "Ward Stable", "No Loc"]
);

// --- group by location ---
const groups = groupByLocation(sorted);
assert.equal(groups[0].locationLabel, "SICU 8");
assert.equal(groups[0].rows.length, 2);
assert.equal(groups[groups.length - 1].locationLabel, "No location");

// --- document: active only, counts, action rollup ---
const doc = buildHandoffDocument({
  serviceName: "Valley Ortho",
  generatedAt: new Date("2026-08-07T14:00:00"),
  cards: [
    card({
      id: "a",
      handle: "Hinojosa, Jorge",
      location: "SICU 8",
      attending: "Lecavalier",
      surgery: "lower extremity ID",
      managementMode: "surgery",
      severity: "watcher",
      body: "42M s/p I&D\n## Plan\n[ ] NPO midnight\n[ ] Cont IV abx\nProse plan line",
    }),
    card({
      id: "b",
      handle: "Discharged Pt",
      location: "444",
      status: "discharged",
      body: "## Plan\n[ ] should not appear",
    }),
    card({
      id: "c",
      handle: "Kirk, Michael",
      location: "444",
      severity: "watcher",
      body: "Confused.\n## Plan\n[ ] Dressing change",
    }),
  ],
});

assert.equal(doc.meta.serviceName, "Valley Ortho");
assert.equal(doc.meta.counts.active, 2);
assert.equal(doc.meta.counts.watcher, 2);
assert.equal(doc.meta.counts.openItems, 3);
// Discharged excluded
assert.ok(!doc.groups.some((g) => g.rows.some((r) => r.patient === "Discharged Pt")));
// Location order: SICU before 444
assert.equal(doc.groups[0].locationLabel, "SICU 8");
assert.equal(doc.groups[1].locationLabel, "444");
// Row columns populated
const h = doc.groups[0].rows[0];
assert.equal(h.patient, "Hinojosa, Jorge");
assert.ok(h.clinical.includes("42M"));
assert.ok(h.plan.includes("NPO midnight"));
assert.ok(h.surgeryLine.includes("lower extremity ID"));
// Action rollup lists patient + item
assert.ok(doc.actionRollup.some((a) => a.patient === "Hinojosa, Jorge" && a.text.includes("NPO")));
assert.ok(doc.actionRollup.some((a) => a.patient === "Kirk, Michael"));

console.log("Sign-out handoff tests passed");
