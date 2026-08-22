import assert from "node:assert/strict";
import {
  SignoutValidationError,
  parseCreateCardBody,
  parseCreateServiceBody,
  parseReorderBody,
  parseUpdateCardBody,
} from "./validation";

// createService
assert.equal(parseCreateServiceBody({ name: "  Trauma  " }).name, "Trauma");
assert.throws(() => parseCreateServiceBody({ name: "" }), SignoutValidationError);
assert.throws(() => parseCreateServiceBody({ name: "x".repeat(81) }), SignoutValidationError);
assert.throws(() => parseCreateServiceBody(null), SignoutValidationError);

// createCard
const card = parseCreateCardBody({ handle: "7W-12", severity: "unstable", body: "NWB" });
assert.equal(card.handle, "7W-12");
assert.equal(card.severity, "unstable");
assert.equal(card.body, "NWB");
assert.equal(parseCreateCardBody({ handle: "4E-08" }).severity, undefined);
assert.throws(() => parseCreateCardBody({ handle: "" }), SignoutValidationError);
assert.throws(() => parseCreateCardBody({ handle: "x", severity: "critical" }), SignoutValidationError);
assert.throws(() => parseCreateCardBody({ handle: "x", body: "y".repeat(20001) }), SignoutValidationError);

// updateCard
const upd = parseUpdateCardBody({ expectedVersion: 3, body: "updated", pinned: true });
assert.equal(upd.expectedVersion, 3);
assert.equal(upd.patch.body, "updated");
assert.equal(upd.patch.pinned, true);
const diagnosticsUpd = parseUpdateCardBody({
  expectedVersion: 1,
  diagnostics: {
    version: 1,
    items: [{
      id: "lab-1",
      type: "lab",
      label: "Hgb",
      date: "2026-08-21",
      status: "Recheck",
      details: "",
      pinned: true,
      labValues: [{ id: "value-1", value: "8.1", date: "2026-08-21" }],
      ptDistance: "",
      ptRecommendation: "",
    }],
  },
});
assert.equal(diagnosticsUpd.patch.diagnostics?.items[0].label, "Hgb");
assert.equal(parseUpdateCardBody({ expectedVersion: 1, status: "discharged" }).patch.status, "discharged");
const surgeryUpd = parseUpdateCardBody({
  expectedVersion: 1,
  location: "SICU",
  surgery: "IM nail",
  surgeryDate: "2026-08-05",
  managementMode: "surgery",
});
assert.equal(surgeryUpd.patch.location, "SICU");
assert.equal(surgeryUpd.patch.surgery, "IM nail");
assert.equal(surgeryUpd.patch.surgeryDate, "2026-08-05");
assert.equal(surgeryUpd.patch.managementMode, "surgery");
assert.equal(parseUpdateCardBody({ expectedVersion: 1, surgeryDate: "" }).patch.surgeryDate, "");
assert.equal(
  parseUpdateCardBody({ expectedVersion: 1, managementMode: "" }).patch.managementMode,
  ""
);
assert.equal(
  parseUpdateCardBody({ expectedVersion: 1, managementMode: "nonop" }).patch.managementMode,
  "nonop"
);
const nextOr = parseUpdateCardBody({
  expectedVersion: 1,
  nextSurgery: "repeat I&D",
  nextSurgeryDate: "2026-08-08",
});
assert.equal(nextOr.patch.nextSurgery, "repeat I&D");
assert.equal(nextOr.patch.nextSurgeryDate, "2026-08-08");
assert.throws(
  () => parseUpdateCardBody({ expectedVersion: 1, surgeryDate: "08/05/2026" }),
  SignoutValidationError
);
assert.throws(
  () => parseUpdateCardBody({ expectedVersion: 1, nextSurgeryDate: "08/08/2026" }),
  SignoutValidationError
);
assert.throws(
  () => parseUpdateCardBody({ expectedVersion: 1, managementMode: "cast" }),
  SignoutValidationError
);
assert.throws(() => parseUpdateCardBody({ expectedVersion: 0, body: "x" }), SignoutValidationError);
assert.throws(() => parseUpdateCardBody({ body: "x" }), SignoutValidationError);
assert.throws(() => parseUpdateCardBody({ expectedVersion: 1 }), /No fields/);
assert.throws(() => parseUpdateCardBody({ expectedVersion: 1, pinned: "yes" }), SignoutValidationError);

// reorder
const reorder = parseReorderBody({
  serviceId: "svc-1",
  items: [
    { id: "a", sortOrder: 0, pinned: true },
    { id: "b", sortOrder: 1 },
  ],
});
assert.equal(reorder.serviceId, "svc-1");
assert.equal(reorder.items.length, 2);
assert.equal(reorder.items[0].pinned, true);
assert.throws(() => parseReorderBody({ serviceId: "s", items: [] }), SignoutValidationError);
assert.throws(() => parseReorderBody({ serviceId: "s", items: [{ id: "a", sortOrder: -1 }] }), SignoutValidationError);
assert.throws(() => parseReorderBody({ serviceId: "s", items: [{ sortOrder: 0 }] }), SignoutValidationError);

console.log("Sign-out validation tests passed");
