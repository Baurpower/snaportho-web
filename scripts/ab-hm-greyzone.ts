/**
 * Live A/B: run the REAL generator on HM's live rules + roster for a month, twice with
 * the SAME seed — legacy (useCallPolicyV2: false) vs engine (true) — and diff the result.
 * Isolates exactly what CALL_POLICY_V2 + the applied grey-zone config change.
 * Read-only. npx tsx scripts/ab-hm-greyzone.ts
 *
 * NOTE: time-off / rotation-restriction availability is not modeled here (empty
 * availability), so this cleanly isolates the grey-zone buddy/PGY behavior, not a
 * publish-ready schedule.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { generateCallSchedule } from "../src/components/workspace/call/programcallautogenerator";
import { isResidentAllowedForSlot } from "../src/components/workspace/call/programcallevaluator";
import { makeEngineHelpers } from "../src/lib/workspace/call/policy/policy-runtime";
import { extractSlotDefinitions } from "../src/lib/workspace/call/rule-definitions";
import type { CalendarDay, ProgramRule, ResidentOption } from "../src/components/workspace/call/programcalltypes";

function loadEnv(fp: string) {
  try {
    for (const l of readFileSync(fp, "utf8").split("\n")) {
      const t = l.trim();
      if (!t || t.startsWith("#")) continue;
      const s = t.indexOf("=");
      if (s === -1) continue;
      const k = t.slice(0, s).trim();
      let v = t.slice(s + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[k] = v;
    }
  } catch {}
}
loadEnv(join(process.cwd(), ".env.local"));
const HM = "082cc352-bba2-4f19-b837-b28d0878a308";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthDays(year: number, month: number): CalendarDay[] {
  const total = new Date(year, month, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const date = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`);
    const dow = date.getDay();
    return {
      date,
      key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      dayNumber: day,
      dayName: DOW[dow],
      isWeekend: dow === 0 || dow === 6,
    };
  });
}

async function main() {
  const s = createAdminClient();
  const { data: ruleRows } = await s
    .from("program_call_rules")
    .select("id, name, rule_type, is_enabled, is_hard_rule, config")
    .eq("program_id", HM);
  const rules = (ruleRows ?? []) as unknown as ProgramRule[];
  const slotDefinitions = extractSlotDefinitions(rules);

  const { data: roster } = await s.from("program_roster").select("id, full_name, grad_year").eq("program_id", HM);
  const { data: ra } = await s
    .from("rotation_assignments").select("roster_id, start_date, end_date, rotation_id")
    .gte("end_date", "2026-07-01").lte("start_date", "2027-06-30");
  const rotIds = [...new Set((ra ?? []).map((r) => r.rotation_id))];
  const { data: rots } = await s.from("rotations").select("id, name").in("id", rotIds);
  const rotName = new Map((rots ?? []).map((r) => [r.id, r.name]));
  const nameById = new Map((roster ?? []).map((r) => [r.id, r.full_name ?? r.id]));

  const residents: ResidentOption[] = (roster ?? []).map((r) => ({
    residentId: r.id, membershipId: r.id, displayName: r.full_name ?? r.id,
    trainingLevel: null, pgyYear: null, gradYear: r.grad_year ?? null,
    rotationAssignments: (ra ?? []).filter((a) => a.roster_id === r.id).map((a) => ({
      rotationId: a.rotation_id, rotationName: rotName.get(a.rotation_id) ?? null,
      startDate: a.start_date, endDate: a.end_date,
    })),
  }));
  const pgy1Ids = new Set((roster ?? []).filter((r) => r.grad_year === 2031).map((r) => r.id));

  function run(year: number, month: number, useCallPolicyV2: boolean) {
    const g = generateCallSchedule({
      monthDays: monthDays(year, month), residents, existingAssignments: {}, rules,
      generationVersion: 20260728, forceRegenerate: true, availabilityByResident: {},
      historicalStats: [], slotMode: "Both", slotDefinitions, useCallPolicyV2,
    });
    const buddyByIntern = new Map<string, string[]>();
    const internPrimaryDays: string[] = [];
    for (const [dateKey, a] of Object.entries(g.assignments)) {
      if (a.buddyRosterId) {
        const arr = buddyByIntern.get(a.buddyRosterId) ?? [];
        arr.push(dateKey); buddyByIntern.set(a.buddyRosterId, arr);
      }
      if (a.primaryRosterId && pgy1Ids.has(a.primaryRosterId)) internPrimaryDays.push(`${nameById.get(a.primaryRosterId)}@${dateKey}`);
    }
    return { buddyByIntern, internPrimaryDays };
  }

  // Per-intern Primary ELIGIBILITY on a mid-month date: legacy pool vs engine.
  function primaryEligibility(year: number, month: number) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-08`;
    const engine = makeEngineHelpers({ rules, slotDefinitions, residents, assignments: {} });
    return residents
      .filter((r) => pgy1Ids.has(r.residentId))
      .map((r) => {
        const legacy = isResidentAllowedForSlot({ resident: r, slot: "Primary", dateKey, assignments: {}, rules, availabilityByResident: {} });
        const eng = engine.isSelectable(r, "Primary", dateKey);
        return `${nameById.get(r.residentId)}: legacy=${legacy ? "yes" : "no"} engine=${eng ? "yes" : "no"}`;
      });
  }

  for (const [label, year, month] of [["AUGUST 2026 (intern 1st ortho month → buddy #3)", 2026, 8], ["SEPTEMBER 2026 (intern 2nd ortho month → primary #4)", 2026, 9]] as const) {
    console.log(`\n════ ${label} ════`);
    for (const on of [false, true]) {
      const { buddyByIntern, internPrimaryDays } = run(year, month, on);
      console.log(`\n  ${on ? "ENGINE (CALL_POLICY_V2 on)" : "LEGACY (flag off)"}`);
      if (buddyByIntern.size === 0) console.log("    buddy: (none)");
      for (const [id, dates] of buddyByIntern) {
        console.log(`    buddy: ${nameById.get(id)} → ${dates.length} day(s)  [${dates.sort().join(", ")}]`);
      }
      console.log(`    PGY-1 on Primary: ${internPrimaryDays.length ? internPrimaryDays.join(", ") : "(none)"}`);
    }
    console.log(`\n  PGY-1 Primary ELIGIBILITY (mid-month) [#4]:`);
    for (const line of primaryEligibility(year, month)) console.log(`    ${line}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
