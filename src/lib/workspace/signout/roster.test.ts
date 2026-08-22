import assert from "node:assert/strict";
import {
  buildRosterRow,
  clampLines,
  extractOpenTodos,
  extractWeightBearing,
  rosterClinicalExtras,
  rosterOneLiner,
  rosterPlanBlock,
  rosterTableColumns,
} from "./roster";
import type { SignoutCard } from "./types";

// --- weight bearing ---
assert.deepEqual(extractWeightBearing("34M R femur · NWB"), ["NWB"]);
assert.deepEqual(extractWeightBearing("WBAT now, was NWB"), ["WBAT", "NWB"]);
assert.deepEqual(extractWeightBearing("no status"), []);
assert.deepEqual(extractWeightBearing("nwb and NWB"), ["NWB"]); // dedupe

// --- one-liner (full lead, multi-line) ---
const multiLead = "42M s/p plateau ORIF\nOvernight: pain controlled\n## Plan\n[ ] Home";
assert.equal(rosterOneLiner(multiLead), "42M s/p plateau ORIF\nOvernight: pain controlled");
assert.equal(rosterOneLiner("## Plan\n[ ] only"), "");

// --- open todos ---
const todosBody =
  "lead\n## Plan\n[ ] Recheck compartments\n[x] Done thing\n[ ] Trend H/H\n## HPI/Exam\n[ ] also open here\n## Dispo barriers\n[ ] Clear PT";
const todos = extractOpenTodos(todosBody);
assert.equal(todos.length, 4);
assert.equal(todos[0].text, "Recheck compartments");
assert.equal(todos[1].text, "Trend H/H");
assert.equal(todos[2].text, "also open here");
assert.equal(todos[3].section, "Dispo barriers");

// --- plan block ---
const plan = rosterPlanBlock(
  "one-liner NWB\n## Plan\nAnemia — recheck AM.\n[ ] Confirm rehab #dispo\n[x] Old\n- Call PT"
);
assert.equal(plan.openTodos.length, 1);
assert.equal(plan.openTodos[0].text, "Confirm rehab #dispo");
assert.ok(plan.planProse.some((p) => p.includes("Anemia")));
assert.ok(plan.planProse.some((p) => p === "Call PT"));
assert.equal(plan.empty, false);
assert.equal(rosterPlanBlock("just a one-liner").empty, true);

// --- clinical extras ---
const extras = rosterClinicalExtras(
  "lead\n## HPI/Exam\nFirm compartments\n## Labs/Imaging/PT\nHgb 9.1\n## Plan\n[ ] x"
);
assert.equal(extras.length, 2);
assert.equal(extras[0].title, "HPI/Exam");
assert.equal(extras[1].text, "Hgb 9.1");

// --- clamp ---
const clamped = clampLines("a\nb\nc\nd", 2);
assert.equal(clamped.text, "a\nb");
assert.equal(clamped.clipped, true);

// --- full row model (surgery date = 3 calendar days ago → POD 3) ---
function localIsoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const card: SignoutCard = {
  id: "c1",
  serviceId: "s1",
  handle: "Hinojosa, Jorge",
  attending: "Lecavalier",
  location: "SICU 8",
  surgery: "IM nail R femur",
  surgeryDate: localIsoDaysAgo(3),
  nextSurgery: "",
  nextSurgeryDate: "",
  managementMode: "surgery",
  severity: "watcher",
  status: "active",
  sortOrder: 0,
  pinned: false,
  body:
    "42M s/p lower extremity medial and lateral plateau · NWB\n" +
    "## HPI/Exam\nWatch compartments.\n" +
    "## Plan\n[ ] Recheck q2h #pending\nAnemia watch\n" +
    "## Dispo\nHome pending PT\n" +
    "## Dispo barriers\n[ ] Clear stairs",
  diagnostics: { version: 1, items: [] },
  hasIdentifiers: false,
  version: 1,
  dischargedAt: null,
  createdBy: null,
  createdAt: "",
  updatedBy: null,
  updatedAt: "",
};

const row = buildRosterRow(card);
assert.equal(row.patient, "Hinojosa, Jorge");
assert.equal(row.location, "SICU 8");
assert.equal(row.surgery, "IM nail R femur");
assert.equal(row.podLabel, "POD 3");
assert.deepEqual(row.weightBearing, ["NWB"]);
assert.ok(row.oneLiner.includes("42M"));
assert.equal(row.openTodos.length, 1);
assert.equal(row.disposition, "Home pending PT");
assert.equal(row.dispoBarriers[0]?.text, "Clear stairs");
assert.ok(row.planProse.some((p) => p.includes("Anemia")));
assert.ok(row.tags.includes("pending"));
assert.equal(row.clinicalExtras[0]?.title, "HPI/Exam");

// --- table columns (Google Doc style) ---
const cols = rosterTableColumns(card);
assert.ok(cols.clinical.includes("42M"));
assert.ok(cols.clinical.includes("Watch compartments"));
assert.ok(cols.plan.includes("Recheck q2h"));
assert.ok(cols.plan.includes("Anemia"));
assert.equal(cols.dispo, "Home pending PT\n☐ Clear stairs");
assert.equal(cols.labs, "");

console.log("Sign-out roster tests passed");
