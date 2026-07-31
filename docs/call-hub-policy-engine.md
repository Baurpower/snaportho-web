# Call Hub Policy Engine — design & implementation plan

Status: **PLAN** (approved direction 2026-07-28). No code written yet.

Owner decisions locked in:

- **Scope:** full unified policy engine (one compiled policy + one evaluator that every
  consumer calls). Not targeted primitives.
- **Rollout:** engine-only, single cutover. Do **not** ship stopgap fixes to the current
  code; all four audited bugs are fixed by config on the new engine.
- **Eligibility model:** progression by **Gen-Ortho month index** within the academic year.
  1st Gen-Ortho month → Buddy; 2nd+ → Primary-eligible. Backup = PGY-5 preferred, PGY-4
  fallback. Buddy paired with a PGY-4 **or** PGY-5 primary.

Related: see the Call Hub audit notes (memory `project-callhub-audit`) and
`docs/call-hub-phase3-generator.md` (generator internals).

---

## 1. Why

Four bugs found in the audit are all one root problem: **"who can take this slot" is
answered in ~5 places, and the rule primitives are too blunt to express real policy.**

| Bug | Symptom | Real cause |
|---|---|---|
| #2 | Buddy picker shows the PGY-5, not the PGY-1 | `filteredPickerResidents` routes Buddy → Backup pool; no Buddy branch exists |
| #3 | PGY-1 on Buddy every weekend | Buddy `requiredDaysPerMonth: 2` applied **per intern** × 3 interns, then "optional" pass tops each up to the generic monthly hard-max (4) |
| #1 | Can't fill Backup in Add view, can after draft | Backup is conditional-on-PGY-2-primary + PGY-5-only; Add view's global-mode tap can't reach it, Edit view's per-slot picker can |
| #4 | Intern can't be Primary even in 2nd ortho month | `restrict_call_type_by_pgy` hard-blocks all PGY-1 from Primary; no temporal/experience concept exists |

Drift sources (each re-answers eligibility): the generator evaluator
(`programcallevaluator.ts` + `rule-evaluator.ts`), `validation.ts`, the swap engine,
`buildSchedulePacket.ts` (AI), per-view UI logic, **and** a separate bolted-on buddy engine
(`buddy-requirements.ts`).

### What today's primitives can't say

- **Temporal / experience:** "Nth month on a service" (buddy = first Gen-Ortho month).
- **Partner as a set + real cross-slot link:** buddy paired with PGY-4 **or** 5.
- **Preference tiers with fallback:** Backup = PGY-5, PGY-4 *if needed* (not a flat allow-list).

---

## 2. Architecture — one compiled policy, one evaluator

```
DB rules ──► compilePolicy() ──► CallPolicy (normalized, versioned, in-memory)
                                     │
Resident + rotation + availability ──► SchedulingContext (facts, computed once)
                                     │
                          evaluateSlot(resident, slot, date, ctx)
                                     │
        ┌────────────┬──────────────┼───────────────┬─────────────┐
     generator    validation    UI pickers        swaps        AI packet
```

Five layers, each a single source of truth:

1. **Policy schema** — declarative types describing every slot (presence, requiredness,
   ordered eligibility tiers, cross-slot pairing).
2. **Compiler** — `compilePolicy(dbRules) → CallPolicy`. Legacy rule types compile into the
   new model, so **no DB migration on day one**; new expressiveness is additive. This is the
   analogue of `persisted-rule-migration.ts`, generalized.
3. **Context / fact providers** — precompute per-resident/per-date facts once: effective PGY,
   full academic-year rotation timeline (+ derived `genOrthoMonthIndex`), availability,
   live assignment counts. Rotation reads stay on the canonical loader
   `getProgramRotationAssignmentsInRange` (extended to an AY range).
4. **Evaluator (pure)** — `evaluateSlot(...) → { present, required, tier|null, blocks, warnings, pairing }`.
   THE single function. One `evalPredicate` walks the predicate tree.
5. **Consumers** — all call the evaluator; none re-implement eligibility. The standalone
   buddy engine is deleted (buddy becomes an ordinary slot with a pairing constraint).

---

## 3. Data model (illustrative TS)

```ts
type CallPolicy = {
  version: number;
  slots: SlotPolicy[];
  globals: {
    spacing?: SpacingRule;
    weekendCaps?: WeekendCapRule[];
    loadTargets?: LoadTargetRule[];      // per-PGY min/max/hardMax per call type
    buddy?: { weekendsPerEligibleInternMonth: { min: number; max: number } };
  };
};

type SlotPolicy = {
  callType: string;                       // "Primary" | "Backup" | "Buddy" | custom
  present: Predicate;                     // does this slot exist on this day?
  required: Predicate;                    // when present, must it be filled?
  eligibility: EligibilityTier[];         // ordered: first feasible tier preferred
  pairing?: PairingConstraint[];          // links this occupant to another slot's
  countsTowardWorkload: boolean;
};

type EligibilityTier = {
  predicate: Predicate;                   // resident qualifies for this tier
  preference: number;                     // lower = more preferred (0 = primary pool)
  softLabel?: string;                     // e.g. "Fallback: PGY-4 covering"
};

type PairingConstraint = {
  otherSlot: string;
  predicate: Predicate;                   // over (thisResident, otherResident, date)
  severity: "hard" | "soft";
};

type Predicate =
  | { kind: "pgyIn"; years: number[] }
  | { kind: "onService"; tokens: string[] }                    // rotation-name tokens
  | { kind: "serviceMonthIndex"; tokens: string[]; op: Op; n: number }  // temporal
  | { kind: "dayOfWeekIn"; days: number[] }
  | { kind: "slotOccupantPgyIn"; slot: string; years: number[] }
  | { kind: "availabilityClear" }                              // no approved TO / rotation block
  | { kind: "and" | "or"; of: Predicate[] }
  | { kind: "not"; of: Predicate };

type Op = "eq" | "gte" | "lte" | "lt" | "gt";
```

New predicate kinds are added in **one** place (the evaluator + this union) and are
immediately usable by every consumer. This is the "adaptable, strong foundation" — a
structured predicate set, not a free-form rule language (keeps it testable, no footguns).

### Temporal facts (the novel part)

`SchedulingContext` precomputes, per resident, the ordered set of distinct **Gen-Ortho
months** in the academic year (July→June). `serviceMonthIndex(genortho)` for a date = the
1-based position of that date's month within the resident's Gen-Ortho months (0 if not on
service). "Service" is matched by policy-level name tokens (generalize the existing
`normalizeBuddyRotationName` / tokens `["genortho","pager"]`). Requires loading rotations
for the whole AY, not just the target month — extend `getProgramRotationAssignmentsInRange`
callsites.

Edge (accepted per decision #3): a single Gen-Ortho block spanning two calendar months
counts as two months. Fine for month-index semantics.

---

## 4. The Houston Methodist policy, expressed in the new model

```
Primary:
  present:     always
  eligibility: [
    { pref 0, pgyIn[2,3,4] },
    { pref 0, and(pgyIn[1], serviceMonthIndex(genortho) >= 2) },   // fixes #4
  ]

Backup:
  present:     slotOccupantPgyIn(Primary, [1,2])                    // (PGY-1 can't be primary → effectively PGY-2)
  eligibility: [
    { pref 0, pgyIn[5] },                                          // preferred
    { pref 1, pgyIn[4], softLabel: "Fallback: PGY-4 covering" },   // "5, but 4 if needed"
  ]

Buddy:
  present:     and(dayOfWeekIn[Fri,Sat], slotOccupantPgyIn(Primary,[4,5]))
  eligibility: [ { pref 0, and(pgyIn[1], onService[genortho], serviceMonthIndex(genortho) == 1) } ]  // fixes #4/#3 scope
  pairing:     { otherSlot: Primary, slotOccupantPgyIn(Primary,[4,5]), hard }   // partner 4 OR 5
  required:    driven by globals.buddy.weekendsPerEligibleInternMonth (min/max)  // fixes #3
```

How each bug dies:

- **#2** — Buddy picker asks the evaluator for eligible residents → the PGY-1 first-ortho-month
  intern, never the PGY-5. (The routing bug can't recur; there's no per-slot pool table.)
- **#3** — Buddy requiredness is a program-wide/per-intern-month cap (`min/max` weekends),
  not a per-intern minimum topped up to the generic hard-max. Default `{min:1,max:2}`.
- **#1** — Backup presence + tiers come from the same evaluator the Add and Edit views both
  call; Add view stops relying on static `pgyYear` and the global-mode tap. (See §6.)
- **#4** — Primary eligibility includes `pgyIn[1] AND serviceMonthIndex(genortho) >= 2`, and
  Buddy is scoped to `== 1`, so the 2nd-ortho-month intern joins the primary pool.

---

## 5. Legacy compilation map

`compilePolicy` translates existing `program_call_rules` rows so current programs keep
working with zero data change:

| Existing rule_type | Compiles to |
|---|---|
| `call_slot_definition` (+ `when_pgy_scheduled`, `daysOfWeek`) | `SlotPolicy.present` predicate + `countsTowardWorkload` |
| `required_daily_call_slots` | `SlotPolicy.required` |
| `restrict_call_type_by_pgy` (allow-list) | eligibility tier(s) `pgyIn[...]` per allowed call type |
| `buddy_requirement` | Buddy slot: eligibility (`pgyIn`, `onService`) + pairing (`partnerPgyYear`→set) + `globals.buddy` |
| `monthly_load_target_by_pgy` | `globals.loadTargets` |
| `restrict_call_by_rotation` | `not(onService[restricted])` conjunct on affected slots' eligibility |
| `max_calls_for_rotation` | `globals` rotation cap (reuse `parseRotationCallLimitConfig`) |
| `min_days_between_assignments` | `globals.spacing` |
| `weekend_pairing`, `day_of_week_preference` | `globals` soft constraints |

The **new** expressiveness (tiers with `preference`, `serviceMonthIndex`, pairing sets) is
authored either by upgrading a program's rules or via a JSON policy config path initially;
a rules-sheet editor for it is Phase 3.

---

## 6. Consumer refactors

- **Generator** (`programcallautogenerator.ts`): candidates for a present+required slot =
  residents with `tier != null`, ordered by `(tier.preference, fairness)`. Fallback tiers
  used only when higher tiers are infeasible. Buddy is filled as a normal slot honoring its
  pairing constraint → **delete `buddy-requirements.ts`** and the bespoke buddy pass.
  Keep the P3 repair/optimize pipeline; it now operates on evaluator results.
- **Validation** (`validation.ts`): hard `blocks` → gate (`assertValid...`). Soft/fallback
  tier usage → warning flag. Removes `validation.ts`'s parallel rule reimplementations.
- **UI pickers** (`programcallmanager.tsx` `selectableResidentsBySlot` /
  `filteredPickerResidents`): one code path keyed by `pickerSlot.slot`, grouping by tier
  ("Recommended" / "If needed"). Fixes #2 structurally.
- **Add view** (`programcalladdview.tsx`): drop static `pgyYear` for presence; use the
  evaluator (same as Edit view `programcalleditview.tsx`). Consider per-slot tap targets so
  conditional Backup is reachable without the global mode toggle (fixes #1 UX).
- **Swaps** (`call-swaps/*`): already routes through `assertSwapIntroducesNoHardViolations`;
  repoint its diff at the new evaluator.
- **AI packet** (`buildSchedulePacket.ts`): replace its incomplete third reimplementation
  with `evaluateSlot`.

---

## 7. Testing & cutover

Single cutover, but de-risked with a **parity harness**:

1. **Golden parity tests** — for each real program's current rules, assert the new evaluator
   returns the same allowed/blocked decisions as today's `evaluateResidentForSlot` across a
   month grid. Must be green before any consumer flips.
2. **Fix tests** — encode HM's grey-zone policy; assert #1–#4 behaviors (intern buddy only
   1st ortho month; primary-eligible 2nd+; backup PGY-5 pref / PGY-4 fallback; buddy ≤2
   weekends; buddy partner ∈ {4,5}).
3. **Generator determinism / feasibility** — reuse existing optimizer/repair invariants.
4. Dev-time flag (`CALL_POLICY_V2`, like `CALL_GEN_V2`) gates the new path during
   development; cutover removes the old path once 1–3 pass on all programs.

---

## 8. Phased task list

- **Phase 1 — Foundation (pure, tested). ✅ DONE (2026-07-28).** Built under
  `src/lib/workspace/call/policy/`: `types.ts` (CallPolicy/SlotPolicy/EligibilityTier/
  PairingConstraint/Predicate/SlotEvaluation), `context.ts` (`buildSchedulingContext` +
  `serviceMonthIndex` over the academic year), `predicates.ts` (`evalPredicate` +
  `firstMatchingTier`), `evaluator.ts` (`evaluateSlot` — tiers replace the PGY branch;
  all other globals reuse rule-evaluator.ts for parity; new presence/required/pairing),
  `compile.ts` (`compilePolicy` from legacy rules). Tests: `policy-engine.test.ts`
  (30 assertions) + `policy-parity.test.ts` (504 checks, **0 mismatches** vs
  `evaluateResidentForSlot.allowed`). Typecheck clean. Nothing wired to live consumers yet.
- **Phase 2 — Consumers.** Point generator (delete buddy engine), validation, UI pickers,
  swaps, AI packet at the evaluator, behind `CALL_POLICY_V2`. Parity green.
  - ✅ **Flag + runtime adapter (2026-07-28).** `call-policy-flags.ts`
    (`isCallPolicyV2Enabled`, default OFF), `policy-runtime.ts` (`makeEngineHelpers` →
    `evaluate` / `isAllowed` / `presence` / `selectableResidentsForSlot`, with the Buddy
    roster gate layered on engine eligibility). `policy-runtime.test.ts` (11 assertions).
  - ✅ **UI pickers wired (2026-07-28) — fixes #2.** `programcallmanager.tsx`
    `selectableResidentsBySlot` gained a Buddy branch and, when V2 on, routes all three
    slots through the engine; `filteredPickerResidents` routes `buddy` → the Buddy pool.
    Legacy path byte-unchanged when flag off. Typecheck clean.
  - ✅ **Add/edit views wired (2026-07-28) — #1 groundwork.** `policyEngine` threaded
    into `programcalladdview.tsx` + `programcalleditview.tsx`; slot presence via
    `presence()` (effective-date PGY, not the static field) and add-view tap eligibility
    via `isSelectable()`. Legacy path unchanged when off.
  - ✅ **Generator wired (2026-07-28) — fixes #3.** `useCallPolicyV2` threaded through
    `GenerateParams` → worker payload → `handleAutoGenerate`. `generateSingleCallSchedule`
    enforces the buddy hard cap post-fill via exported `computeBuddyCapTrim` (keeps each
    intern's earliest N buddy weekends, trims the rest + reverses stats). Buddy engine
    NOT deleted yet (legacy path needs it) — deletion deferred to Phase 4 cutover.
    `call-buddy-cap.test.ts` (8 assertions).
  - ✅ **Validation / swaps / AI packet wired (2026-07-28) — #11.** `buildSchedulePacket.ts`
    builds the engine from its residents and derives candidate eligibility via
    `evaluate()`/`isSelectable()` (removes the third partial reimplementation);
    `validation.ts` adds additive flag-gated `validateBuddyCapRule` to
    `validateCallMonthDraft` (the save-gate) — swaps inherit it via
    `validateProgramCallMutationDraft`. `validate-buddy-cap.test.ts` (6 assertions).
    NOTE: the parity-critical validators (PGY/spacing/etc.) are left on their existing
    code — they are already parity-proven against the engine, so rerouting them is a
    zero-behavior-change Phase 4 cleanup, not rushed into the save-gate here.

  **Phase 2 complete.** All consumers route through the engine behind `CALL_POLICY_V2`
  (default OFF); legacy paths byte-unchanged when off. #1 groundwork, #2, #3 delivered.
  Tests: 30 + 504 + 11 + 8 + 6 assertions green; full typecheck clean (only pre-existing
  errors remain).
- **Phase 3 — Grey-zone policy + authoring. ✅ ENGINE DONE (2026-07-28).** Compiler reads
  OPT-IN grey-zone config off existing, UI-safe rule types (no new rule type → no rules-sheet
  crash risk); programs without it stay byte-identical to Phase 1/2 (parity still green).
  `buddy_requirement` config: `eligibleServiceMonthIndices` (Buddy only in those Gen-Ortho
  month indices), `partnerPgyYears` (partner set → pairing + presence), and
  `internPrimaryFromServiceMonthIndex` (interns join Primary from that month → **#4**).
  `call_slot_definition` config: `slotFallbackPgyYears` (+ label) → a preference-1 fallback
  tier (Backup = PGY-5 preferred, PGY-4 if needed). `policy-phase3.test.ts` (14 assertions)
  proves #1–#4 on this policy. `scripts/apply-hm-greyzone-config.ts` writes HM's config
  (dry-run default; `--apply` to write) — dormant until the flag flips. DEFERRED (open Q4):
  rules-sheet UI editor for these fields; JSON/script is the interim authoring path.
- **Phase 4a — Cutover. ✅ DONE (2026-07-28).** `isCallPolicyV2Enabled()` now defaults ON
  (engine is the production path) with the flag retained as an opt-out KILL-SWITCH
  (`NEXT_PUBLIC_CALL_POLICY_V2=false` / `?callPolicyV2=0` / localStorage). Closed the one
  cutover correctness gap: the save-gate now honors grey-zone tiers — `validation.ts`
  `validatePgyRestrictionRule` suppresses the legacy PGY violation for tier-eligible
  residents (e.g. a 2nd-ortho-month intern on Primary), via `buildGreyZonePoolEligibility`
  (compiles the policy from the validation input, no availability needed). Non-grey-zone
  programs: byte-identical behavior (a resident is only ever "suppressed" if they match a
  tier, which for legacy pools = residents who had no violation anyway). Tests:
  `validate-greyzone-consistency.test.ts` (4), `validate-buddy-cap.test.ts` updated.
  Full suite green; parity still 504/0.
- **Phase 4b — Legacy deletion (DEFERRED until prod soak).** Rewrite the generator buddy
  pass as engine-native (buddy-as-slot), move `resolveBuddyPolicy`/defaults into the policy
  module, delete `buddy-requirements.ts` + strip all legacy dual-path branches, remove the
  flag. Held deliberately: removing the kill-switch before any live-app soak is the one
  irreversible/reckless step, it needs the untested generator buddy rewrite, and it delivers
  ZERO user-facing value (every fix is already live via the default-on cutover).

---

## 9. Open questions

1. **Buddy quota shape:** ✅ RESOLVED (2026-07-28) — **2 buddy weekends per intern-month is a
   HARD CAP** (max, not a required minimum; buddy is optional up to the cap). Modeled as
   `globals.buddy.maxWeekendsPerInternMonth = 2`.
2. **Backup fallback trigger:** is PGY-4 fallback purely generator-side (only when no PGY-5
   is feasible), or also manually pickable in the UI with a soft warning? (Proposed: both —
   generator prefers tier-0, UI shows tier-1 under "If needed".)
3. **Service tokens per program:** keep `["genortho","pager"]` global, or make the service
   token set a policy field (needed once other programs define their own progression service)?
   (Proposed: policy field, defaulted.)
4. **Authoring surface for tiers/temporal predicates:** JSON config first, full rules-sheet
   editor in Phase 3 — acceptable, or is the editor required at cutover?
