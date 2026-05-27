# Call Rules System — Manual QA Checklist (Post Phase 1-9 Fixes)

**Purpose**: Verify all acceptance criteria from the 2025 rule persistence/loading audit remediation.

**Environment**: Any dev or staging workspace with at least one program that has (or can create) a default rule set.

**Pre-requisites**
- A program with active residents + at least one rotation assignment for testing rotation rules.
- Ability to open the Call Schedule builder and the Rules sheet.
- (Optional but recommended) A second browser tab or incognito for concurrent edit testing.

---

## 1. Rule Type Unification (Phase 2)

**Goal**: Only one source of truth for `RuleType` / `RuleConfig` / `ProgramRule`.

**Steps**:
1. In `src/lib/workspace/call/rule-definitions.ts` — confirm `RuleType` union and `RULE_DEFINITIONS` are the only definition.
2. In `src/components/workspace/call/programcalltypes.ts` — confirm it only re-exports (no duplicate union).
3. Grep the codebase for other inline `| "required_daily_call_slots" | ...` lists (only the AI parse prompt + internal heuristic strings should remain).
4. Add a temporary new rule type in `rule-definitions.ts` only. Verify it appears in the Rules sheet picker without touching any component files.

**Pass criteria**: Adding a rule type requires changes in ≤ 3 files (mostly the definitions + one evaluator branch).

---

## 2. Required Daily Call Slots — No Silent Overwrite (Phase 4)

**Goal**: The required slots rule behaves like any other persisted rule.

**Test A — Basic persistence**
1. Open Rules sheet.
2. Note the current "Required daily call slots" rule (or let the system create it).
3. Manually edit its **name** to "My Custom Required Slots Name" and set **Hard rule** = false.
4. Save rules.
5. Close and reopen the Rules sheet.
6. Verify the custom name and Hard=false persisted.

**Test B — Picker does not destroy user edits**
1. With the rule open from Test A, change the Slot Mode picker from "Primary" to "Both".
2. Verify the rule still shows your custom name and Hard=false (only `requiredCallTypes` should have updated).
3. Save.
4. Reload — custom name + hardness must still be there.

**Test C — Saving unrelated rules does not touch it**
1. Add or edit any other rule (e.g. min days).
2. Save.
3. Reload rules sheet — your custom required slots rule must be untouched.

**Test D — No duplicates**
1. Manually try to add another "required_daily_call_slots" via any path (should be blocked in UI).
2. Save — DB should never contain two rows of that type for the same rule_set.

**Pass**: All four tests pass with no data loss.

---

## 3. Normalization & Effective Loading Consistency (Phase 3)

**Steps**:
1. Create or edit a rule and give it weird casing / extra fields in config (e.g. `minDays: "3"`, extra keys).
2. Save.
3. Inspect the row in Supabase (or via API) — config must be sanitized (numbers are numbers, only known keys remain).
4. In the Rules sheet, toggle a rule to **disabled** (is_enabled=false).
5. Save.
6. Open the Call builder / generator — the disabled rule must not affect generation or create blocks.
7. Re-open Rules sheet — the disabled rule must still be visible and editable.

**Pass**: Sanitization works; disabled rules are visible in editor but excluded from effective validation/generation.

---

## 4. AI-Created Rules Path (Phase 5)

**Prerequisites**: OpenAI key configured and the AI parse button in the Rules sheet works.

**Test A — Singleton deduplication**
1. Have an existing "Minimum days between assignments" rule.
2. Use the AI text box: "Residents must have at least 3 days between calls".
3. Let it propose + accept the rule.
4. After save, inspect the rules list — there must still be only **one** row of that type (the AI one should have updated/replaced the previous).

**Test B — Sanitization + validation**
1. Feed the AI text that would produce a malformed config for a known type (e.g. negative minDays or missing required fields for rotation rule).
2. Verify the AI-created endpoint rejects or sanitizes (does not create a broken rule row).

**Test C — Provenance**
1. After an AI rule is accepted, the stored config should contain `ai_generated: true` + explanation.

**Pass**: AI rules are clean, deduplicated for singletons, and go through the same normalizer as manual rules.

---

## 5. Save Safety (Phase 6)

**Test — Empty save guard**
1. (Advanced) Use curl or the browser dev tools to POST an empty `rules: []` array to `/api/program/call-rules` **without** `allowEmpty`.
2. The call must **not** wipe your rules (it should return the current set).

**Test — Bad payload**
1. Send a rule missing `name` or with `enabled: "yes"`.
2. The API must reject with a clear error before any delete happens.

**Pass**: Failed / malicious saves do not destroy existing rules.

---

## 6. Staleness Protection (Phase 7)

**Steps**:
1. Open Rules sheet in Tab A. Note the `updated_at` of the rule set (you may need to inspect the network response for the rule-sets call).
2. In Tab B (different session or fast timing), open the same rules sheet and save a change.
3. In Tab A, make a different change and attempt to save while sending the old `previousRuleSetUpdatedAt`.
4. Expect HTTP 409 + clear message + the current timestamp.

**Pass**: Concurrent edits are detectable (even if the current client UI does not yet send the header on every save).

---

## 7. Scope Field (Phase 8)

**Inspection**:
1. After any save (manual or AI), every rule row in the DB should have `scope` = `{}` (or the documented default).
2. Grep the evaluator / validation / generator code — confirm **zero** places read `rule.scope` to change behavior (only storage and getRuleConfig passthrough).

**Pass**: Scope is explicitly documented as currently inert.

---

## 8. End-to-End Generation + Validation Still Work

1. With a realistic set of rules (spacing + PGY + rotation + required slots + weekend pairing):
   - Run Auto-generate.
   - Manually tweak a few assignments.
   - Save via the normal calendar save path.
2. Verify:
   - No rules were lost.
   - Validation errors appear for hard violations.
   - Disabled rules do not block assignments.

---

## 9. Regression — Existing Valid Schedules

- Load any previously generated month that had call assignments before these changes.
- The schedule must still display and validate without new spurious errors caused by rule loading changes.

---

## Known Acceptable Limitations (Intentionally Not Fixed in This Task)

- Swap approval RPC bypass of rules (explicitly out of scope).
- Full client-side optimistic locking UX (server guard exists; client should be enhanced later).
- No automated unit tests (project has none for this domain).
- Generator remains a heuristic (not a solver).
- `scope` remains inert until future scoping work.

---

**Sign-off**: After running the checklist, record date + tester + any deviations.

This checklist + the code changes satisfy the 11 required deliverable points.