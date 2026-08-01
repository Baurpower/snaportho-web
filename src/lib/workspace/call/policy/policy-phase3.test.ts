/**
 * Phase 3 — the real grey-zone policy on the engine tiers. Encodes Houston Methodist's
 * intended rules and asserts the four audited behaviors are fixed. Run with:
 *   npx tsx src/lib/workspace/call/policy/policy-phase3.test.ts
 */
import assert from "node:assert/strict";
import type {
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption
} from "@/components/workspace/call/programcalltypes";
import { buildSchedulingContext } from "@/lib/workspace/call/policy/context";
import { compilePolicy } from "@/lib/workspace/call/policy/compile";
import {
  evaluateSlot,
  evaluateSlotPresence
} from "@/lib/workspace/call/policy/evaluator";
import { makeEngineHelpers } from "@/lib/workspace/call/policy/policy-runtime";

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed += 1;
}

function resident(
  id: string,
  gradYear: number,
  rotations: Array<{ name: string; start: string; end: string }> = []
): ResidentOption {
  return {
    residentId: id,
    membershipId: id,
    displayName: id,
    trainingLevel: null,
    pgyYear: null,
    gradYear,
    rotationAssignments: rotations.map((r) => ({
      rotationId: r.name,
      rotationName: r.name,
      startDate: r.start,
      endDate: r.end
    }))
  };
}

// Intern on Gen Ortho in Aug (1st ortho month) and Oct (2nd ortho month; Sept is off-service).
const intern = resident("intern", 2031, [
  { name: "Gen Ortho/Pager", start: "2026-08-01", end: "2026-08-31" },
  { name: "GS Trauma", start: "2026-09-01", end: "2026-09-30" },
  { name: "Gen Ortho/Pager", start: "2026-10-01", end: "2026-10-31" }
]);
const consecutiveIntern = resident("consecutive-intern", 2031, [
  { name: "Gen Ortho", start: "2026-08-01", end: "2026-08-31" },
  { name: "Gen Ortho/Pager", start: "2026-09-01", end: "2026-09-30" }
]);
const pgy2 = resident("pgy2", 2030);
const pgy4 = resident("pgy4", 2028);
const pgy5 = resident("pgy5", 2027);
const residents = [intern, pgy2, pgy4, pgy5];

function rule(
  id: string,
  rule_type: string,
  config: Record<string, unknown>,
  is_hard_rule = true
): ProgramRule {
  return {
    id,
    name: id,
    rule_type: rule_type as never,
    is_enabled: true,
    is_hard_rule,
    config
  };
}

// Legacy pools + the grey-zone config (buddy_requirement extensions + Backup fallback).
const rules: ProgramRule[] = [
  rule("pool1", "restrict_call_type_by_pgy", {
    restrictedPgyYears: [1],
    allowedCallTypes: ["Buddy"]
  }),
  rule("pool2", "restrict_call_type_by_pgy", {
    restrictedPgyYears: [2],
    allowedCallTypes: ["Primary"]
  }),
  rule("pool4", "restrict_call_type_by_pgy", {
    restrictedPgyYears: [4],
    allowedCallTypes: ["Primary"]
  }),
  rule("pool5", "restrict_call_type_by_pgy", {
    restrictedPgyYears: [5],
    allowedCallTypes: ["Backup"]
  }),
  rule("buddy", "buddy_requirement", {
    requiredDaysPerMonth: 2,
    eligibleRotationNameTokens: ["genortho", "pager"],
    // Grey-zone:
    eligibleServiceMonthIndices: [1], // buddy only in the first Gen-Ortho month
    partnerPgyYears: [4, 5], // partner is PGY-4 OR PGY-5
    internPrimaryFromServiceMonthIndex: 2 // interns join Primary pool from 2nd ortho month
  })
];

const slotDefs: ProgramCallSlotDefinition[] = [
  {
    id: "primary",
    label: "Primary",
    shortLabel: "1°",
    callType: "Primary",
    colorKey: "sky",
    requiredMode: "always",
    countsTowardWorkload: true,
    sortOrder: 1,
    requiredWhenVisible: true
  },
  {
    id: "buddy",
    label: "Buddy",
    shortLabel: "B°",
    callType: "Buddy",
    colorKey: "violet",
    requiredMode: "conditional",
    daysOfWeek: [5, 6],
    condition: {
      type: "when_pgy_scheduled",
      pgyYears: [4],
      sourceSlotCallTypes: ["Primary"]
    },
    countsTowardWorkload: true,
    sortOrder: 2,
    requiredWhenVisible: false
  },
  // Backup: PGY-5 pool (from restrict_call_type_by_pgy) + PGY-4 fallback (slotFallbackPgyYears).
  {
    id: "backup",
    label: "Backup",
    shortLabel: "2°",
    callType: "Backup",
    colorKey: "emerald",
    requiredMode: "conditional",
    condition: {
      type: "when_pgy_scheduled",
      pgyYears: [1, 2],
      sourceSlotCallTypes: ["Primary"]
    },
    countsTowardWorkload: true,
    sortOrder: 2,
    requiredWhenVisible: false
  }
];
// slotFallbackPgyYears lives on the call_slot_definition rule config; inject it here so
// compilePolicy (which reads raw rules) can see it.
const slotDefRules: ProgramRule[] = [
  rule(
    "slot-backup",
    "call_slot_definition",
    {
      slotCallType: "Backup",
      slotFallbackPgyYears: [4],
      slotFallbackLabel: "Fallback: PGY-4 covering"
    },
    false
  )
];
const allRules = [...rules, ...slotDefRules];

const policy = compilePolicy(allRules, slotDefs);
const empty = {};
const av = {};

function evalAt(
  res: ResidentOption,
  slot: string,
  dateKey: string,
  assignments: Record<string, never> = empty
) {
  const ctx = buildSchedulingContext({ residents, assignments });
  return evaluateSlot({
    resident: res,
    slot,
    dateKey,
    ctx,
    policy,
    assignments,
    availabilityByResident: av
  });
}

// ── #4 + buddy first-month: intern eligibility by ortho-month index ──
ok(
  "intern Buddy-eligible in 1st ortho month (Aug)",
  evalAt(intern, "Buddy", "2026-08-15").eligible
);
ok(
  "intern NOT Buddy-eligible in 2nd ortho month (Oct)",
  !evalAt(intern, "Buddy", "2026-10-17").eligible
);
ok(
  "intern NOT Primary-eligible in 1st ortho month (Aug)",
  !evalAt(intern, "Primary", "2026-08-04").eligible
);
ok(
  "intern Primary-eligible in 2nd ortho month (Oct) [#4]",
  evalAt(intern, "Primary", "2026-10-06").eligible
);
ok(
  "intern NOT Primary-eligible off-service (Sept)",
  !evalAt(intern, "Primary", "2026-09-08").eligible
);
ok(
  "consecutive-month intern is Primary-eligible in September month two",
  evaluateSlot({
    resident: consecutiveIntern,
    slot: "Primary",
    dateKey: "2026-09-08",
    ctx: buildSchedulingContext({
      residents: [...residents, consecutiveIntern]
    }),
    policy,
    assignments: {},
    availabilityByResident: {}
  }).eligible
);
ok(
  "consecutive-month intern is not Buddy-eligible in September month two",
  !evaluateSlot({
    resident: consecutiveIntern,
    slot: "Buddy",
    dateKey: "2026-09-11",
    ctx: buildSchedulingContext({
      residents: [...residents, consecutiveIntern]
    }),
    policy,
    assignments: {},
    availabilityByResident: {}
  }).eligible
);

// Seniors' primary eligibility unchanged.
ok(
  "PGY-2 still Primary-eligible",
  evalAt(pgy2, "Primary", "2026-08-04").eligible
);
ok(
  "PGY-5 still NOT Primary-eligible",
  !evalAt(pgy5, "Primary", "2026-08-04").eligible
);

// ── Backup fallback tiers: PGY-5 preferred (tier 0), PGY-4 fallback (tier 1) ──
const backupPgy5 = evalAt(pgy5, "Backup", "2026-08-04");
const backupPgy4 = evalAt(pgy4, "Backup", "2026-08-04");
ok(
  "PGY-5 Backup-eligible at preferred tier 0",
  backupPgy5.eligible && backupPgy5.tierPreference === 0
);
ok(
  "PGY-4 Backup-eligible at fallback tier 1",
  backupPgy4.eligible && backupPgy4.tierPreference === 1
);
ok(
  "PGY-4 Backup carries a fallback soft label",
  backupPgy4.warnings.some((w) => /fallback/i.test(w.message))
);

// ── Buddy partner set {4,5}: presence + pairing ──
const ctxPgy5Primary = buildSchedulingContext({
  residents,
  assignments: {
    "2026-08-15": {
      primaryRosterId: "pgy5",
      backupRosterId: null,
      buddyRosterId: null
    }
  }
});
ok(
  "Buddy present on Sat under a PGY-5 primary (partner set)",
  evaluateSlotPresence(policy, "Buddy", "2026-08-15", ctxPgy5Primary).present
);
const buddyWithPgy5 = evaluateSlot({
  resident: intern,
  slot: "Buddy",
  dateKey: "2026-08-15",
  ctx: ctxPgy5Primary,
  policy,
  assignments: {
    "2026-08-15": {
      primaryRosterId: "pgy5",
      backupRosterId: null,
      buddyRosterId: null
    }
  },
  availabilityByResident: av
});
ok("Buddy pairing OK with a PGY-5 primary", buddyWithPgy5.pairing.ok);

// ── #2 still holds via runtime: buddy candidate list is the 1st-month intern ──
const engine = makeEngineHelpers({
  rules: allRules,
  slotDefinitions: slotDefs,
  residents,
  assignments: {
    "2026-08-15": {
      primaryRosterId: "pgy4",
      backupRosterId: null,
      buddyRosterId: null
    }
  }
});
const buddyCands = engine
  .selectableResidentsForSlot("Buddy", "2026-08-15", residents)
  .map((r) => r.residentId);
ok(
  "buddy candidates on an Aug Sat = [intern]",
  JSON.stringify(buddyCands) === JSON.stringify(["intern"])
);
const buddyCandsOct = engine
  .selectableResidentsForSlot("Buddy", "2026-10-17", residents)
  .map((r) => r.residentId);
ok(
  "buddy candidates in 2nd ortho month = [] (not eligible)",
  buddyCandsOct.length === 0
);

console.log(`policy-phase3.test.ts passed (${passed} assertions)`);
