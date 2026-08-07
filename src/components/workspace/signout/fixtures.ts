import type { SignoutCard, SignoutService } from "@/lib/workspace/signout/types";

/** Dev-only sample data for the ?preview=1 board (no network, no PHI). */

const now = new Date().toISOString();

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localIso(d);
}

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localIso(d);
}

export const PREVIEW_SERVICES: SignoutService[] = [
  {
    id: "svc-trauma",
    programId: "prog-demo",
    name: "Trauma",
    phiEnabled: true,
    isActive: true,
    createdBy: null,
    createdAt: now,
  },
  {
    id: "svc-joints",
    programId: "prog-demo",
    name: "Joints",
    phiEnabled: false,
    isActive: true,
    createdBy: null,
    createdAt: now,
  },
];

function card(partial: Partial<SignoutCard> & Pick<SignoutCard, "id" | "handle">): SignoutCard {
  return {
    serviceId: "svc-trauma",
    severity: "stable",
    location: "",
    surgery: "",
    surgeryDate: "",
    nextSurgery: "",
    nextSurgeryDate: "",
    managementMode: "",
    status: "active",
    sortOrder: 0,
    pinned: false,
    body: "",
    attending: "",
    hasIdentifiers: false,
    version: 1,
    dischargedAt: null,
    createdBy: null,
    createdAt: now,
    updatedBy: null,
    updatedAt: now,
    ...partial,
  };
}

export const PREVIEW_CARDS: SignoutCard[] = [
  card({
    id: "c1",
    handle: "7W-12",
    location: "SICU",
    attending: "Dr. Lee",
    surgery: "IM nail R femur",
    surgeryDate: daysAgo(1),
    nextSurgery: "repeat I&D + vac change",
    nextSurgeryDate: daysAhead(2),
    managementMode: "surgery",
    severity: "unstable",
    pinned: true,
    sortOrder: 0,
    body:
      "34M R femur · NWB\n" +
      "## HPI/Exam\nWatch for compartment syndrome. Firm but compressible.\n" +
      "## Plan\nContinue NWB; monitor compartments. Return to OR for washout.\n" +
      "## To-do\n[ ] Recheck compartments q2h #pending\n[ ] Trend H/H at 2am\n[ ] NPO after midnight #OR",
  }),
  card({
    id: "c2",
    handle: "4E-08",
    location: "7 West",
    attending: "Dr. Patel",
    surgery: "ORIF L hip",
    surgeryDate: daysAgo(2),
    managementMode: "surgery",
    severity: "watcher",
    sortOrder: 1,
    hasIdentifiers: true,
    body:
      "72F L hip · WBAT · lovenox\n" +
      "## HPI/Exam\nOvernight mild delirium, resolved with reorientation. Pain controlled.\nPE: incision C/D/I, NVI distally\n" +
      "## Labs/Imaging/PT\nT 37.9 HR 104 BP 118/72 · Hgb 9.1 · Cr 1.4\nPT: 3ft with walker\n" +
      "## Plan\nAnemia — recheck AM, transfuse if <7.\n" +
      "## To-do\n[ ] Confirm rehab dispo with PT #dispo",
  }),
  card({
    id: "c3",
    handle: "2W-21",
    location: "4 East",
    attending: "Dr. Lee",
    surgery: "NWB boot · clinic 2 wk",
    surgeryDate: daysAgo(4),
    managementMode: "nonop",
    severity: "stable",
    sortOrder: 2,
    body:
      "58M stable Weber A ankle · NWB\n" +
      "## Plan\nNon-op. Elevation, ice, f/u clinic.\n" +
      "## To-do\n[ ] Home in AM with ortho follow-up",
  }),
];

// A planned (future) surgery to show pre-op POD styling.
PREVIEW_CARDS.push(
  card({
    id: "c4",
    handle: "ED-3",
    location: "ED",
    attending: "Dr. Patel",
    surgery: "Washout R knee",
    surgeryDate: daysAhead(1),
    managementMode: "surgery",
    severity: "watcher",
    sortOrder: 3,
    body:
      "48M septic R knee, OR planned tomorrow\n" +
      "## Plan\nIV abx, NPO for OR.\n" +
      "## To-do\n[ ] NPO after midnight #OR",
  })
);
