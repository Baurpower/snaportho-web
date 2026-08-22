import assert from "node:assert/strict";
import { buildCopyUpdate } from "./copy-update";
import type { SignoutCard } from "./types";

const card: SignoutCard = {
  id: "c1",
  serviceId: "s1",
  handle: "7W-12",
  attending: "Dr. Lee",
  location: "SICU",
  surgery: "IM nail R femur",
  surgeryDate: "2026-08-05",
  nextSurgery: "repeat I&D",
  nextSurgeryDate: "2026-08-21",
  managementMode: "surgery",
  severity: "unstable",
  status: "active",
  sortOrder: 0,
  pinned: false,
  body:
    "34M R femur · NWB\n" +
    "## HPI/Exam\nWatch compartments, firm but compressible.\n" +
    "## Labs/Imaging/PT\nWBC 12.4, Hgb 9.1. Image attached.\n" +
    "## Plan\nRecheck q2h.\n" +
    "## To-do\n[ ] Trend H/H\n" +
    "## Consults\nID following",
  diagnostics: { version: 1, items: [] },
  hasIdentifiers: true,
  version: 1,
  dischargedAt: null,
  createdBy: null,
  createdAt: "",
  updatedBy: null,
  updatedAt: "",
};

assert.equal(
  buildCopyUpdate(card, "Jane Doe"),
  "Jane Doe, 34M R femur · NWB. Procedure: IM nail R femur (8/5). " +
    "Next OR: repeat I&D (8/21). HPI/Exam: Watch compartments, firm but compressible. " +
    "Labs/Imaging/PT: WBC 12.4, Hgb 9.1. Image attached. Plan: Recheck q2h. " +
    "To-do: [ ] Trend H/H. Consults: ID following."
);
assert.ok(!buildCopyUpdate(card, "Jane Doe").includes("POD"));
assert.ok(buildCopyUpdate(card, null).startsWith("[Name],"));
assert.ok(!buildCopyUpdate(card, "Jane Doe").includes("SICU"));
assert.ok(!buildCopyUpdate(card, "Jane Doe").includes("Dr. Lee"));

console.log("Sign-out copy-update tests passed");
