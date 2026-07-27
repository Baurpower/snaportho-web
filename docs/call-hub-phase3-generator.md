# Call Hub — Phase 3: State-of-the-Art Schedule Generator

Implementation guide / handoff. Written 2026-07-26 after Phases 0–2 of the Call Hub
automation audit. Read this together with the memory note `project-callhub-audit.md`.

> **Status:** IN PROGRESS. Phases 0–2 done. Phase 3 **optimizer core is built and
> tested** (see Progress below); Web Worker, serializable protocol, Phase-A repair,
> report parity, and A/B rollout remain.

### Progress (2026-07-26)

Done, in `programcallautogenerator.ts`, tested in
`call-schedule-optimizer.test.ts` (7 invariant + integration cases, all green,
typecheck clean):

- **`softStatsScore(stats)`** — extracted the fairness objective (burden/weekend
  spreads + totals) so the optimizer minimizes the *exact* objective
  `scoreGeneratedSchedule` ranks by. `scoreGeneratedSchedule` now calls it.
- **`undoStats(...)`** — exact O(1) inverse of `updateStats` (task 3).
- **`createSeededRng`** — deterministic mulberry32 PRNG.
- **`optimizeCallSchedule({...})`** (exported) — simulated annealing over
  Primary/Backup **reassign** and **swap** moves. Hard constraints are invariants
  (each move re-checked with `evaluateResidentForSlot` on affected cells; rejected
  if it introduces a block). **Buddy days frozen.** Completeness preserved (never
  empties a filled slot). Deterministic per seed. Returns best-seen schedule +
  before/after soft score + move counts. This is a first cut of task 5.
- **Integration** — `generateCallSchedule` gained `enableLocalSearch` (default
  **off**) + `localSearchMaxIterations`. When on, it runs the optimizer on the
  best complete+valid combo, **re-verifies feasibility** before adopting, and adds
  an `optimization` block to `generationReport`. Default path is byte-unchanged.

**Verified invariants:** feasibility preserved (no hard-blocked cell, never places
a resident on approved time-off), never worse than the start, measurable balance
improvement on an unbalanced start, buddy day untouched, determinism, safe no-op on
trivial inputs.

**Serializable protocol done (task 2)** — `call-generator-protocol.ts`, tested in
`call-generator-protocol.test.ts`:
- `CalendarDaySnapshot` + `toCalendarDaySnapshot` / `calendarDayFromSnapshot`
  (solves the one non-serializable field, `CalendarDay.date`).
- `GenerateRequestPayload` / `GenerateResponsePayload` / `GenerateWorkerRequest` /
  `GenerateWorkerResponse` message types.
- **`runGenerateRequest(payload)`** — the exact function the worker's `onmessage`
  will call (rebuilds CalendarDays, runs `generateCallSchedule`, returns a
  serializable response). Pure/testable, so the worker becomes a ~10-line wrapper.
- Tests prove BOTH the request payload and the response survive `JSON` round-trip
  (the real worker-boundary requirement), plus end-to-end generation,
  `enableLocalSearch` pass-through, and determinism.

**Phase-A feasibility repair done (task 4)** — in `programcallautogenerator.ts`,
tested in `call-schedule-repair.test.ts` (6 scenarios):
- Refactored `countOpenRequiredSlots` to derive from a new `listOpenRequiredSlots`
  (single source of truth for "what's open"; count = list length).
- **`repairCallSchedule({...})`** (exported) — three stages: (1) purge
  hard-violating Primary/Backup occupants, (2) directly fill open required slots
  with the best eligible resident, (3) **swap-to-unstick** slots whose only
  eligible resident is used elsewhere (move them in, refill their vacated cell).
  Buddy slots left to the buddy pre-pass. Never introduces a hard violation;
  reports `infeasibleSlots` with reasons when it can't reach feasibility.
- Verified: direct fill, swap-to-unstick (the real value), genuine-infeasibility
  reporting (no fabricated assignment), hard-violation purge+refill, complete
  no-op, determinism.

**Repair-then-optimize pipeline wired into `generateCallSchedule`** (still behind
`enableLocalSearch`, default off): Stage A repairs an incomplete/invalid best
(adopted only if it reaches full feasibility), Stage B optimizes. `generationReport`
now carries both an `optimization` and a `repair` block. Default path unchanged.

**Worker + manager wiring (task 1) — DONE & BROWSER-VERIFIED (2026-07-26).**
- `call-generator.worker.ts` — postMessage wrapper over `runGenerateRequest`.
- `call-gen-flags.ts` — `isCallGenV2Enabled()` (env `NEXT_PUBLIC_CALL_GEN_V2`,
  `localStorage.callGenV2`, or `?callGenV2=1`). Default OFF.
- `programcallmanager.tsx` — module-level `runGenerationInWorker(payload)` (new
  Worker via `new URL("@/…/call-generator.worker.ts", import.meta.url)`, 60s
  timeout, `worker.terminate()` cleanup); `handleAutoGenerate` branches on the
  flag → worker path (enableLocalSearch on) with a synchronous fallback on worker
  error. Default (flag off) path byte-unchanged.
- `app/dev/call-gen-worker/page.tsx` — dev-only harness (guarded out of prod).
- **Verified in `next dev` (Next 15.3.8) browser:** the worker chunk bundled and
  ran off the main thread — returned in ~308ms, 14/14 days filled, optimization
  applied (soft score 3166 → 2095, ~34% fairness gain), response JSON-serializable,
  zero console/server errors. The manager uses the identical worker-construction
  pattern (typecheck-clean); its admin Auto-Generate click-through wasn't exercised
  because that route is auth-gated in the test browser, but the worker mechanism it
  relies on is confirmed.
- **Remaining before flipping default ON:** confirm with a production `next build`
  (verify the worker chunk stays pure, no `next/*`), then enable via
  `NEXT_PUBLIC_CALL_GEN_V2` and validate on a real program (A/B vs v1).

Reference stub (implemented above; kept for context):

```ts
// src/components/workspace/call/call-generator.worker.ts
import {
  runGenerateRequest,
  type GenerateWorkerRequest,
  type GenerateWorkerResponse,
} from "./call-generator-protocol";

self.onmessage = (event: MessageEvent<GenerateWorkerRequest>) => {
  const req = event.data;
  if (req?.kind !== "generate") return;
  try {
    const res = runGenerateRequest(req);
    const msg: GenerateWorkerResponse = { kind: "result", ...res };
    (self as unknown as Worker).postMessage(msg);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      kind: "error",
      requestId: req.requestId,
      message: err instanceof Error ? err.message : "generation failed",
    } satisfies GenerateWorkerResponse);
  }
};
```

Manager integration (`handleAutoGenerate`), behind the flag:
```ts
if (CALL_GEN_V2) {
  const worker = new Worker(
    new URL("./call-generator.worker.ts", import.meta.url)
  );
  const requestId = crypto.randomUUID();
  const payload = {
    kind: "generate", requestId,
    monthDays: monthDays.map(toCalendarDaySnapshot),
    residents: sortedResidents,
    existingAssignments: forceRegenerate ? {} : draftAssignments,
    rules: latestRules, slotDefinitions: latestSlotDefinitions,
    availabilityByResident: programAvailability?.availability ?? {},
    historicalStats, slotMode: scheduleSlotMode,
    generationVersion: Date.now(), forceRegenerate,
    enableLocalSearch: true, localSearchMaxIterations: 4000,
  };
  worker.onmessage = (e) => { /* result → setDraftAssignments + setGenerationReport + openReview; error → fallback */ worker.terminate(); };
  worker.postMessage(payload);
} else {
  // existing synchronous generateCallSchedule path (unchanged)
}
```
**Build-verification checklist before enabling:** `next build` succeeds; the worker
chunk does not import `next/*`/React/server-only (inspect the bundle); generation
runs off the main thread (UI stays responsive); cancel via `worker.terminate()`.

**Deliberate v1 limitations (follow-ups):**
- Optimizes the **fairness/spread** soft objective only; soft **rule-warning**
  minimization (the `warnings·300` term) is not yet part of the move objective.
- Full `softStatsScore(Array.from(stats.values()))` is recomputed per candidate
  move (O(residents)); acceptable at current iteration budgets but the incremental
  **Δ-objective** (task 3 tail) is still worth doing before raising the budget.
- Buddy days are frozen; **linked buddy moves** (task 8) not implemented.
- Not yet in a Web Worker (tasks 1–2) — `enableLocalSearch` is not wired into
  `handleAutoGenerate`/`CALL_GEN_V2` yet, so nothing runs it in production.

### Remaining tasks (see §9): 1 worker extraction, 2 protocol, 3 incremental Δ-eval,
4 Phase-A repair loop, 6 report/option-picker parity for the optimized result,
7 A/B + flag flip, 8 linked buddy moves.

---

## 1. Objective

Replace the current "best of 75 greedy random restarts" generator with a **two-phase
optimizer** — guaranteed hard-constraint feasibility, then local-search optimization of
the existing objective — running in a **Web Worker** so the UI never freezes.

### Success criteria
1. **Never returns an invalid schedule silently.** Either produces a schedule with zero
   hard-rule violations and zero open required slots, or reports *exactly* which
   constraints are infeasible (which dates/slots, why).
2. **Materially better fairness** than today: lower burden/weekend spread across residents
   for the same inputs (measure with the existing `scoreGeneratedSchedule` and the
   spreads in `summarizeCombinationForAI`).
3. **Non-blocking UI.** Generation runs in a worker with progress updates; the main thread
   stays responsive. Target < 3 s for a 31-day month with ~30 residents; hard cap with a
   cancel button.
4. **Deterministic when seeded.** Same inputs + same seed ⇒ same schedule (reproducibility
   for debugging and tests).
5. **Behavior-preserving fallback.** A feature flag keeps the current generator available;
   the new one can be A/B compared before it becomes the default.

---

## 2. What exists today (build on this, don't rewrite it)

All in `src/components/workspace/call/programcallautogenerator.ts` unless noted.

- **`generateCallSchedule(params)`** — entry point. Runs `ATTEMPTS = 75`
  `generateSingleCallSchedule` passes (each a full greedy day-by-day fill differing only by
  `seededNoise`), scores each, ranks lexicographically by `(hardErrorCount,
  openRequiredSlots, score)`, returns the best + a `generationReport`.
- **`generateSingleCallSchedule(params)`** — one greedy construction: buddy pre-pass, then
  for each day fill Primary → Backup → Buddy using `pickBestResident`. **Reuse this as the
  Phase-A warm-start constructor.**
- **`pickBestResident` / `scoreResident`** — per-candidate greedy scoring (fairness, spacing,
  PGY-adjusted burden via `ResidentAutoStats.expectedBurdenMultiplier`, `getRulePenalty`,
  `seededNoise`). **Reuse `scoreResident` inside neighborhood evaluation if helpful.**
- **`scoreGeneratedSchedule({ stats, assignments, ... })`** — whole-schedule objective
  (hardErrors, invalidAssignments, openRequiredSlots, warnings, burden/weekend spreads,
  totals). **This is the Phase-B objective to minimize.** Keep it as the single source of
  truth for "how good is this schedule."
- **`analyzeCombinationDiagnostics` / `countOpenRequiredSlots`** — compute hard errors,
  warnings, and open required slots for a candidate. **Reuse verbatim** for feasibility
  checks and the final report.
- **Eligibility:** `isResidentAllowedForSlot` → `evaluateResidentForSlot`
  (`programcallevaluator.ts`) is the canonical "can resident R take slot S on date D"
  check (rules + availability, hard vs soft). **This is the hard-constraint oracle.**
- **`ResidentAutoStats`** — per-resident running counts (month/year primary/backup/buddy,
  weekend buckets, assigned dates) + `expectedBurdenMultiplier` (resolved once for the
  month, Phase 1 #1). `updateStats` mutates it on assign. **Extend with a matching
  `undoStats` (see §4.4) for incremental local search.**
- **Buddy subsystem** — `buddy-requirements.ts`; policy now configurable via
  `resolveBuddyPolicy` (Phase 2). The generator resolves `buddyPolicy` once and runs a
  buddy pre-pass. **Buddy placement is special (PGY-1 ↔ partner-PGY pairing, Fri/Sat, N/mo);
  keep the pre-pass as a Phase-A step and treat buddy slots carefully in neighborhoods
  (see §7).**
- **Slot definitions** — `DEFAULT_SLOT_DEFINITIONS` + `getSlotStatusForDay`
  (`rule-definitions.ts`). Per-day visibility/required-ness of Primary/Backup/Buddy depends
  on primary PGY, day-of-week, and buddy state. **Which slots are "required and open" comes
  from here — do not hardcode Primary/Backup.**
- **Consumer:** `handleAutoGenerate` in `programcallmanager.tsx` calls `generateCallSchedule`
  synchronously, sets `draftAssignments` + `generationReport`, opens the review modal.
  `programcallreviewmodal.tsx` `parseGeneratedOptions` reads `report.topCombinations` /
  `topCombinationSummaries`; Phase 1 #6 added a completeness banner keyed off the selected
  option's health.

### Known limitations Phase 3 must fix
- No local search / repair — a greedy pass that leaves an open slot or a soft-suboptimal
  placement is never improved.
- Runs on the main thread (multi-second freeze; `handleAutoGenerate` is `async` but the
  work is synchronous CPU).
- `evaluateResidentForSlot` rescans **all** assignments per call
  (`getAssignedDatesForResident`), and `getPgyAverages` is recomputed per candidate →
  O(attempts × days² × residents). Local search needs **incremental** evaluation or it will
  be too slow.

---

## 3. Target architecture

```
main thread (programcallmanager.tsx)
  └─ postMessage(GenerateRequest)  ──►  call-generator.worker.ts
        ◄── postMessage(GenerateProgress)   (periodic: bestScore, phase, elapsed)
        ◄── postMessage(GenerateResult)      (assignments + generationReport OR infeasibility)

worker (pure, no DOM, no next/*):
  Phase A — CONSTRUCT + REPAIR to feasibility
     1. buddy pre-pass (reuse)
     2. greedy fill (reuse generateSingleCallSchedule internals)
     3. feasibility repair: while open-required-slots or hard-errors > 0,
        apply targeted repair moves; if stuck, record infeasibility and stop.
  Phase B — OPTIMIZE (only if Phase A reached feasibility)
     simulated annealing (or tabu) over soft objective, hard constraints as invariants.
```

### 3.1 Why two phases
Hard constraints (approved time-off, PGY restriction, spacing HARD, monthly/weekend HARD
caps, rotation blocks, required daily slots) are **satisfiability**; soft objectives
(fairness spread, day-of-week preferences, weekend balancing) are **optimization**. Mixing
them into one weighted score (today's approach) means the optimizer can "buy" a hard
violation with enough soft improvement. Separating them guarantees the result is always
hard-feasible, and makes infeasibility explicit instead of a silently-bad schedule.

### 3.2 Move to a Web Worker — do this FIRST
This is the lowest-risk, highest-visible win and de-risks everything else.

- Create `src/components/workspace/call/call-generator.worker.ts` (Next.js supports
  `new Worker(new URL('./call-generator.worker.ts', import.meta.url))`).
- The worker imports ONLY pure modules: `programcallautogenerator`, `programcallevaluator`,
  `rule-evaluator`, `rule-definitions`, `buddy-requirements`. **None of these may import
  `next/*`, React, or server-only code** — verify with a build. (They're already pure; keep
  them that way.)
- Message contract (see §5). Serialize plain JSON — `monthDays` currently carries `Date`
  objects (`day.date`); either send date strings and rebuild, or precompute all
  date-derived fields (`isWeekend`, `key`, `getDay()`) before posting. **Prefer sending a
  serializable `CalendarDaySnapshot` and reconstructing minimal helpers in the worker.**
- Keep `generateCallSchedule` callable synchronously too (tests + fallback). The worker is a
  thin wrapper that calls into the same functions.

---

## 4. Phase B optimizer — detailed design

### 4.1 Objective
Minimize `scoreGeneratedSchedule(...)` **with hard-violation terms removed** (those are
invariants in Phase B, never traded). Concretely, define
`softObjective(state) = scoreGeneratedSchedule(...) − (hardErrors·1e6 + invalidAssignments·2.5e5 + openRequiredSlots·1e5)`.
i.e. reuse the existing function but only vary the soft components (spreads, warnings,
totals). Assert in a test that Phase B never changes the hard terms.

### 4.2 Neighborhood moves
Operate on the assignment map. Each move must (a) keep every slot's occupant
hard-eligible and (b) keep required slots filled. Candidate moves:

1. **Reassign** — replace the resident in one (date, slot) with a different hard-eligible
   resident (or empty, only if the slot is optional).
2. **Swap** — exchange the residents of two (date, slot) cells (same slot type or
   compatible), both directions must stay hard-eligible.
3. **Relocate** — move a resident's assignment from one date to another eligible open slot.

Generate moves biased toward the residents/dates contributing most to the objective (e.g.
the highest-burden resident on a weekend, or a day-of-week-preference violator). Random
tie-breaks from the seeded RNG.

### 4.3 Acceptance (simulated annealing)
- Start temperature `T0`, geometric cooling `T ← T·α` per iteration batch.
- Accept a move with Δ = softObjective(after) − softObjective(before):
  Δ ≤ 0 always; Δ > 0 with probability `exp(−Δ/T)`.
- **Reject any move that introduces a hard violation or opens a required slot** before the
  acceptance test (hard invariant).
- Track and return the best feasible state seen (not the last).
- Stop on: iteration cap, wall-clock cap (posted from main thread), or convergence
  (no accepted improving move in K iterations). Post progress every ~50 ms.

> Tabu search is a fine alternative (short tabu list of recently-touched (date,slot) cells,
> best-improvement move each step). Annealing is simpler to tune; pick one and document the
> chosen parameters. Either way the objective + hard-constraint invariant are identical.

### 4.4 Incremental evaluation (critical for speed)
The current per-move cost is dominated by full rescans. To make thousands of moves cheap:

- Maintain the live `Map<residentId, ResidentAutoStats>` across moves. Add
  **`undoStats(stats, residentId, slot, day, countsTowardWorkload)`** mirroring
  `updateStats` so a move can be applied/reverted in O(1).
- For hard-eligibility of a candidate move, call `evaluateResidentForSlot` for **only the
  affected (resident, date, slot)** cells, not the whole month. Note it still internally
  scans `assignments` for the resident's other dates — acceptable per-move, but if it's the
  bottleneck, add an incremental "assigned dates by resident" index updated on each move and
  pass it in (requires a small evaluator refactor; do only if profiling demands it).
- Compute Δ-objective from the changed residents' burden deltas, not a full
  `scoreGeneratedSchedule` each move. Keep a full recompute only for the periodic
  "is this a new best" checkpoint (correctness guard against drift).

### 4.5 Determinism
- Thread a single seeded PRNG (reuse the FNV approach behind `seededNoise`, or a small
  xorshift) through move generation and acceptance. Seed = `generationVersion`.
- No `Math.random()`, no `Date.now()` inside the optimization loop (wall-clock cap comes in
  as an absolute deadline from the main thread).

---

## 5. Message / data contracts

Define in a shared, serializable module (e.g. `call-generator-protocol.ts`) imported by both
the worker and the manager.

```ts
type GenerateRequest = {
  kind: "generate";
  requestId: string;
  seed: number;                 // = generationVersion
  deadlineMs: number;           // absolute epoch ms; worker must stop by this
  monthDays: CalendarDaySnapshot[];   // serializable (no Date objects)
  residents: ResidentOption[];        // already plain JSON
  existingAssignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];               // raw; worker applies getEffectiveRules
  slotDefinitions: ProgramCallSlotDefinition[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  historicalStats: ExistingResidentStats[];
  slotMode: QuickAssignSlotMode;
  forceRegenerate: boolean;
  config: { maxIterations: number; annealing: {...} };  // tunables, versioned
};

type GenerateProgress = {
  kind: "progress"; requestId: string;
  phase: "construct" | "repair" | "optimize";
  bestSoftScore: number; hardFeasible: boolean; elapsedMs: number; iterations: number;
};

type GenerateResult =
  | { kind: "result"; requestId: string; ok: true;
      assignments: Record<string, DraftDayAssignment>;
      generationReport: GenerationReport; }   // SAME shape as today's report
  | { kind: "result"; requestId: string; ok: false;
      infeasible: { openRequiredSlots: SlotRef[]; hardViolations: Issue[]; reason: string } };
```

**Keep `generationReport` shape identical to today** (`topCombinations`,
`topCombinationSummaries`, `completeCombinationCount`, `selectionSummary`,
`generationDebug`) so `parseGeneratedOptions` and the Phase-1 #6 banner keep working
untouched. The optimizer can still surface a handful of "top options" (e.g. best + a few
diverse near-best local optima) to preserve the option-picker UX.

`CalendarDaySnapshot = { key: string; isWeekend: boolean; dayOfWeek: number }` (add fields
as needed). Reconstruct any `Date` use inside the worker from `key`.

---

## 6. Integration & rollout

1. **Feature flag.** Add `CALL_GEN_V2` (env or a program setting). `handleAutoGenerate`
   branches: v2 → post to worker + show progress/cancel UI; v1 → current synchronous path.
   Default OFF until validated.
2. **Manager changes** (`programcallmanager.tsx`): create the worker lazily, wire progress
   into a small "Generating… (cancel)" state alongside `isGenerating`, handle `result`
   (set `draftAssignments` + `generationReport`, open review) and `infeasible` (show a
   blocking error naming the unsatisfiable slots — reuse the Phase-1 #6 banner styling).
3. **Review modal:** no change required if `generationReport` shape is preserved. Optionally
   surface `phase`/iterations/elapsed from progress.
4. **A/B / validation:** run v1 and v2 on the same seeded inputs across a fixture set;
   assert v2 hard-feasibility always ≥ v1 and burden spread ≤ v1. Keep a dev-only toggle to
   compare side by side.

---

## 7. Risks & gotchas (read before coding)

- **Buddy coupling.** Buddy placement mutates the Primary slot (sets the partner-PGY primary)
  and disables Backup on buddy days. Neighborhood moves must treat a buddy day as a linked
  (Primary=partner, Buddy=PGY-x, Backup=none) unit — moving the primary off a buddy day, or
  swapping a non-partner into it, breaks the invariant. Simplest safe approach: **freeze
  buddy-day cells after the Phase-A buddy pre-pass** (exclude them from Phase-B moves) in
  v1 of the optimizer; relax later once the linked-move machinery exists. Validation already
  enforces buddy-partner PGY (`validateBuddyAssignments`), so freezing is safe.
- **Availability snapshot is static.** `availabilityByResident` is fetched once and reflects
  the *saved* schedule for month/weekend flags (Phase-0 finding #15). The optimizer must
  compute counts from the *draft* it's building (as `ResidentAutoStats` already does), and
  use availability only for **time-off / rotation** conflicts, which are static. Don't read
  availability's monthly/weekend rule flags for feasibility.
- **Rules consistency.** Apply `getEffectiveRules(rules, { includeDisabled: false })` once at
  the top and use that everywhere (Phase-1 #4 already made generation/scoring consistent —
  don't reintroduce a raw-vs-effective split).
- **Slot required-ness is per-day and conditional.** Use `getSlotStatusForDay` /
  `countOpenRequiredSlots` for "is this slot required and open," never a static assumption.
  Backup is often optional; buddy visibility comes from the buddy engine.
- **Worker bundling.** Confirm the worker build doesn't pull in `next/headers`, React, or
  server-only modules (this bit us in Phase 0 when a test imported `calls.ts`). Keep the
  worker's import graph pure; add a build check.
- **Serialization of `Date`.** `monthDays[i].date` is a `Date`; structured-clone works but
  the pure worker code should not depend on `Date` identity — derive from `key`.
- **Determinism drift.** Any `Set`/`Map` iteration order or `localeCompare` tie-break must be
  stable; the current code already sorts by `displayName`/`key` for ties — preserve that.

---

## 8. Testing strategy

- **Invariant tests (most important):** for a suite of seeded fixtures, assert the v2 result
  has `hardErrors === 0` and `openRequiredSlots === 0`, OR returns `infeasible` with a
  non-empty reason. Never a silent invalid schedule.
- **Objective monotonicity:** Phase B's tracked best soft-score is non-increasing; the
  returned state equals the best seen.
- **Hard-invariant under moves:** property test — apply N random accepted moves, assert
  hard terms of `scoreGeneratedSchedule` never increased.
- **Determinism:** same seed ⇒ identical assignments (deep-equal).
- **Parity/quality vs v1:** across fixtures, v2 burden/weekend spread ≤ v1 (allow equality);
  v2 open-required-slots ≤ v1.
- **`undoStats` correctness:** `updateStats` then `undoStats` returns stats to the prior
  deep-equal state.
- **Perf benchmark:** 31 days × {10, 20, 30} residents under the wall-clock cap; record
  iterations/sec. Use the existing test harness:
  `node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs <file>.test.ts`.

Add fixtures mirroring the real program: a buddy rule, a spacing rule, PGY load targets,
a rotation block, some approved time-off.

---

## 9. Suggested task order (each independently shippable)

1. **Worker extraction** — move existing `generateCallSchedule` into a worker behind
   `CALL_GEN_V2` OFF; UI shows progress/cancel; no algorithm change yet. Ship + verify no
   regression (v2 flag simply relocates today's algorithm).
2. **Serializable protocol** — `call-generator-protocol.ts` + `CalendarDaySnapshot`; remove
   `Date` dependence in the worker path.
3. **`undoStats` + incremental delta objective** — with unit tests.
4. **Phase A repair loop** — turn open-slot/hard-error states into feasibility or explicit
   infeasibility; freeze buddy-day cells.
5. **Phase B annealer** — moves, acceptance, seeded RNG, best-tracking; wall-clock cap.
6. **Report parity** — assemble the existing `generationReport` shape (top options,
   completeCombinationCount, diagnostics) from the optimizer output.
7. **A/B validation + tuning** — fixtures, benchmarks, parameter tuning; then flip
   `CALL_GEN_V2` default ON.
8. (Optional, later) linked buddy moves to unfreeze buddy days.

---

## 10. Open decisions to confirm before coding

- **Annealing vs tabu** for Phase B (recommend annealing first — fewer knobs).
- **Buddy days frozen in v1?** (recommend yes — safe, simplest; revisit in task 8).
- **Where the wall-clock/iteration budget lives** (recommend: main thread sends
  `deadlineMs`; worker also honors `maxIterations`).
- **Multiple "top options" semantics** — best + N diverse local optima, or drop the option
  picker for v2 and always return the single optimum? (Affects review-modal UX; recommend
  keeping best + a few for continuity with Phase-1 #6.)
- **Infeasibility UX** — block with a per-slot list, or allow saving a partial draft with a
  hard warning? (Ties into Phase-0 save-gate, which already blocks hard errors.)

---

## Reference index (files touched/consumed)

- `src/components/workspace/call/programcallautogenerator.ts` — generator core (reuse).
- `src/components/workspace/call/programcallevaluator.ts` — `evaluateResidentForSlot` (hard oracle).
- `src/lib/workspace/call/rule-evaluator.ts` — rule matching/eval primitives.
- `src/lib/workspace/call/rule-definitions.ts` — slot status, `getEffectiveRules`, `DEFAULT_SLOT_DEFINITIONS`.
- `src/lib/workspace/call/buddy-requirements.ts` — buddy policy + engine (Phase 2 configurable).
- `src/components/workspace/call/programcallmanager.tsx` — `handleAutoGenerate` (consumer/integration).
- `src/components/workspace/call/programcallreviewmodal.tsx` — `parseGeneratedOptions`, #6 banner.
- New: `call-generator.worker.ts`, `call-generator-protocol.ts`.
