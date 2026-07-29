/**
 * Unit tests for the Call Hub Policy Engine (context facts, predicates, compile,
 * presence, pairing). Pure — no DB. Run with:
 *   npx tsx src/lib/workspace/call/policy/policy-engine.test.ts
 */
import assert from "node:assert/strict";
import type {
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { buildSchedulingContext } from "@/lib/workspace/call/policy/context";
import { evalPredicate, firstMatchingTier } from "@/lib/workspace/call/policy/predicates";
import { compilePolicy } from "@/lib/workspace/call/policy/compile";
import { evaluateSlotPresence, evaluateSlot } from "@/lib/workspace/call/policy/evaluator";
import type { EligibilityTier, Predicate } from "@/lib/workspace/call/policy/types";

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.equal(cond, true, label);
  passed += 1;
}

// ── Fixtures ──────────────────────────────────────────────────────────────

function resident(
  id: string,
  gradYear: number,
  rotations: Array<{ name: string; id?: string; start: string; end: string }> = []
): ResidentOption {
  return {
    residentId: id,
    membershipId: id,
    displayName: id,
    trainingLevel: null,
    pgyYear: null, // force effective-date resolution from gradYear
    gradYear,
    rotationAssignments: rotations.map((r) => ({
      rotationId: r.id ?? r.name,
      rotationName: r.name,
      startDate: r.start,
      endDate: r.end,
    })),
  };
}

// AY 2026 (July 2026 → June 2027): gradYear 2031 = PGY-1, 2030 = PGY-2, 2028 = PGY-4, 2027 = PGY-5.
const intern = resident("intern", 2031, [
  { name: "Gen Ortho/Pager", start: "2026-08-01", end: "2026-08-31" },
  { name: "GS Trauma", start: "2026-09-01", end: "2026-09-30" },
  { name: "Gen Ortho/Pager", start: "2026-10-01", end: "2026-10-31" },
]);
const pgy2 = resident("pgy2", 2030);
const pgy4 = resident("pgy4", 2028);
const pgy5 = resident("pgy5", 2027);
const residents = [intern, pgy2, pgy4, pgy5];

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
    requiredWhenVisible: true,
  },
  {
    id: "buddy",
    label: "Buddy",
    shortLabel: "B°",
    callType: "Buddy",
    colorKey: "violet",
    requiredMode: "conditional",
    daysOfWeek: [5, 6],
    condition: { type: "when_pgy_scheduled", pgyYears: [4], sourceSlotCallTypes: ["Primary"] },
    countsTowardWorkload: true,
    sortOrder: 2,
    requiredWhenVisible: false,
  },
  {
    id: "backup",
    label: "Backup",
    shortLabel: "2°",
    callType: "Backup",
    colorKey: "emerald",
    requiredMode: "conditional",
    condition: { type: "when_pgy_scheduled", pgyYears: [1, 2], sourceSlotCallTypes: ["Primary"] },
    countsTowardWorkload: true,
    sortOrder: 2,
    requiredWhenVisible: false,
  },
];

function rule(
  id: string,
  rule_type: ProgramRule["rule_type"],
  config: ProgramRule["config"],
  is_hard_rule = true
): ProgramRule {
  return { id, name: id, rule_type, is_enabled: true, is_hard_rule, config };
}

const poolRules: ProgramRule[] = [
  rule("pool1", "restrict_call_type_by_pgy", { restrictedPgyYears: [1], allowedCallTypes: ["Buddy"] }),
  rule("pool2", "restrict_call_type_by_pgy", { restrictedPgyYears: [2], allowedCallTypes: ["Primary"] }),
  rule("pool4", "restrict_call_type_by_pgy", { restrictedPgyYears: [4], allowedCallTypes: ["Primary"] }),
  rule("pool5", "restrict_call_type_by_pgy", { restrictedPgyYears: [5], allowedCallTypes: ["Backup"] }),
];

const ctx = buildSchedulingContext({ residents });

// ── serviceMonthIndex ───────────────────────────────────────────────────────

ok(
  "genortho month index: Aug = 1",
  ctx.serviceMonthIndex("intern", "2026-08-15", ["genortho"]) === 1
);
ok(
  "genortho month index: Oct = 2 (skips non-ortho Sept)",
  ctx.serviceMonthIndex("intern", "2026-10-10", ["genortho"]) === 2
);
ok(
  "genortho month index: Sept = 0 (not on service)",
  ctx.serviceMonthIndex("intern", "2026-09-10", ["genortho"]) === 0
);
ok("pager token also matches gen ortho/pager", ctx.serviceMonthIndex("intern", "2026-08-15", ["pager"]) === 1);

// ── evalPredicate ───────────────────────────────────────────────────────────

const subj = { residentId: "intern", dateKey: "2026-08-15" };
ok("pgyIn matches PGY-1 intern", evalPredicate({ kind: "pgyIn", years: [1] }, subj, ctx));
ok("pgyIn rejects wrong PGY", !evalPredicate({ kind: "pgyIn", years: [2, 3] }, subj, ctx));
ok("onService gen ortho", evalPredicate({ kind: "onService", tokens: ["genortho"] }, subj, ctx));
ok(
  "onService false in Sept",
  !evalPredicate({ kind: "onService", tokens: ["genortho"] }, { residentId: "intern", dateKey: "2026-09-10" }, ctx)
);
ok(
  "serviceMonthIndex == 1 is true in Aug",
  evalPredicate({ kind: "serviceMonthIndex", tokens: ["genortho"], op: "eq", n: 1 }, subj, ctx)
);
ok(
  "serviceMonthIndex >= 2 is true in Oct",
  evalPredicate(
    { kind: "serviceMonthIndex", tokens: ["genortho"], op: "gte", n: 2 },
    { residentId: "intern", dateKey: "2026-10-10" },
    ctx
  )
);
ok(
  "serviceMonthIndex >= 2 false in Aug",
  !evalPredicate({ kind: "serviceMonthIndex", tokens: ["genortho"], op: "gte", n: 2 }, subj, ctx)
);
ok("dayOfWeekIn Sat (2026-08-15 is a Sat)", evalPredicate({ kind: "dayOfWeekIn", days: [6] }, subj, ctx));
ok("and/or/not compose", evalPredicate(
  { kind: "and", of: [{ kind: "pgyIn", years: [1] }, { kind: "not", of: { kind: "pgyIn", years: [5] } }] },
  subj,
  ctx
));

// slotOccupantPgyIn reads the assignment snapshot.
const ctxWithAssign = buildSchedulingContext({
  residents,
  assignments: { "2026-08-15": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null } },
});
ok(
  "slotOccupantPgyIn(Primary,[4,5]) true when PGY-4 on primary",
  evalPredicate({ kind: "slotOccupantPgyIn", slot: "Primary", years: [4, 5] }, subj, ctxWithAssign)
);
ok(
  "slotOccupantPgyIn false when slot empty",
  !evalPredicate({ kind: "slotOccupantPgyIn", slot: "Backup", years: [4, 5] }, subj, ctxWithAssign)
);

// ── firstMatchingTier ───────────────────────────────────────────────────────

const tiers: EligibilityTier[] = [
  { predicate: { kind: "pgyIn", years: [4] }, preference: 1, softLabel: "fallback" },
  { predicate: { kind: "pgyIn", years: [5] }, preference: 0 },
];
ok(
  "tier: PGY-5 gets preferred tier 0",
  firstMatchingTier(tiers, { residentId: "pgy5", dateKey: "2026-08-15" }, ctx)?.preference === 0
);
ok(
  "tier: PGY-4 gets fallback tier 1",
  firstMatchingTier(tiers, { residentId: "pgy4", dateKey: "2026-08-15" }, ctx)?.preference === 1
);
ok(
  "tier: PGY-2 matches no tier",
  firstMatchingTier(tiers, { residentId: "pgy2", dateKey: "2026-08-15" }, ctx) === null
);

// ── compilePolicy ───────────────────────────────────────────────────────────

const policy = compilePolicy(poolRules, slotDefs);
ok("policy has 3 slots sorted", policy.slots.map((s) => s.callType).join(",") === "Primary,Buddy,Backup");
const primaryPolicy = policy.slots.find((s) => s.callType === "Primary")!;
const buddyPolicy = policy.slots.find((s) => s.callType === "Buddy")!;

// Pool eligibility compiled from restrict_call_type_by_pgy.
ok(
  "compiled: PGY-2 eligible for Primary",
  evalPredicate(primaryPolicy.eligibility[0].predicate, { residentId: "pgy2", dateKey: "2026-08-15" }, ctx)
);
ok(
  "compiled: PGY-1 NOT eligible for Primary (Buddy-only pool)",
  !evalPredicate(primaryPolicy.eligibility[0].predicate, { residentId: "intern", dateKey: "2026-08-15" }, ctx)
);
ok(
  "compiled: PGY-5 NOT eligible for Primary (Backup-only pool)",
  !evalPredicate(primaryPolicy.eligibility[0].predicate, { residentId: "pgy5", dateKey: "2026-08-15" }, ctx)
);
ok("compiled: buddy pairing requires PGY-4 primary", buddyPolicy.pairing.length === 1);

// ── presence ────────────────────────────────────────────────────────────────

// Backup present only when Primary is PGY-1/2.
const ctxPgy2Primary = buildSchedulingContext({
  residents,
  assignments: { "2026-08-04": { primaryRosterId: "pgy2", backupRosterId: null, buddyRosterId: null } },
});
ok(
  "Backup present under PGY-2 primary",
  evaluateSlotPresence(policy, "Backup", "2026-08-04", ctxPgy2Primary).present
);
const ctxPgy4Primary = buildSchedulingContext({
  residents,
  assignments: { "2026-08-04": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null } },
});
ok(
  "Backup NOT present under PGY-4 primary",
  !evaluateSlotPresence(policy, "Backup", "2026-08-04", ctxPgy4Primary).present
);
// Buddy present only on Fri/Sat with a PGY-4 primary.
const ctxBuddySat = buildSchedulingContext({
  residents,
  assignments: { "2026-08-15": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null } }, // Sat
});
ok("Buddy present Sat + PGY-4 primary", evaluateSlotPresence(policy, "Buddy", "2026-08-15", ctxBuddySat).present);
const ctxBuddyWed = buildSchedulingContext({
  residents,
  assignments: { "2026-08-12": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null } }, // Wed
});
ok("Buddy NOT present midweek", !evaluateSlotPresence(policy, "Buddy", "2026-08-12", ctxBuddyWed).present);

// ── pairing via evaluateSlot ─────────────────────────────────────────────────

// Buddy paired with a PGY-3 primary → hard pairing violation.
const pgy3 = resident("pgy3", 2029);
const residentsWith3 = [...residents, pgy3];
const ctxBadPair = buildSchedulingContext({
  residents: residentsWith3,
  assignments: { "2026-08-15": { primaryRosterId: "pgy3", backupRosterId: null, buddyRosterId: null } },
});
const buddyEval = evaluateSlot({
  resident: intern,
  slot: "Buddy",
  dateKey: "2026-08-15",
  ctx: ctxBadPair,
  policy,
  assignments: { "2026-08-15": { primaryRosterId: "pgy3", backupRosterId: null, buddyRosterId: null } },
  availabilityByResident: {},
});
ok("buddy pairing fails against PGY-3 primary", buddyEval.pairing.ok === false);

const ctxGoodPair = buildSchedulingContext({
  residents,
  assignments: { "2026-08-15": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null } },
});
const buddyEvalOk = evaluateSlot({
  resident: intern,
  slot: "Buddy",
  dateKey: "2026-08-15",
  ctx: ctxGoodPair,
  policy,
  assignments: { "2026-08-15": { primaryRosterId: "pgy4", backupRosterId: null, buddyRosterId: null } },
  availabilityByResident: {},
});
ok("buddy pairing ok against PGY-4 primary", buddyEvalOk.pairing.ok === true);
ok("intern eligible for Buddy (pool)", buddyEvalOk.eligible === true);

console.log(`policy-engine.test.ts passed (${passed} assertions)`);
