/**
 * Phase 3 rollout: write Houston Methodist's grey-zone call policy into
 * program_call_rules. DORMANT until CALL_POLICY_V2 is enabled — the legacy path
 * ignores the new config fields (verified: resolveBuddyPolicy / extractSlotDefinitions
 * only read known fields), so this is safe to apply ahead of the flag flip.
 *
 * DRY-RUN by default (prints the plan, writes nothing). Apply with:  --apply
 *   npx tsx scripts/apply-hm-greyzone-config.ts          # dry run
 *   npx tsx scripts/apply-hm-greyzone-config.ts --apply  # perform writes
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";

function loadEnv(fp: string) {
  try {
    for (const l of readFileSync(fp, "utf8").split("\n")) {
      const t = l.trim();
      if (!t || t.startsWith("#")) continue;
      const s = t.indexOf("=");
      if (s === -1) continue;
      const k = t.slice(0, s).trim();
      let v = t.slice(s + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      process.env[k] = v;
    }
  } catch {}
}
loadEnv(join(process.cwd(), ".env.local"));

const HM = "082cc352-bba2-4f19-b837-b28d0878a308";
const APPLY = process.argv.includes("--apply");

async function main() {
  const s = createAdminClient();

  const { data: rules, error } = await s
    .from("program_call_rules")
    .select("id, program_id, rule_set_id, rule_type, name, is_enabled, is_hard_rule, config")
    .eq("program_id", HM);
  if (error) throw error;

  const existingBuddy = (rules ?? []).find((r) => r.rule_type === "buddy_requirement");
  const backupSlot = (rules ?? []).find(
    (r) =>
      r.rule_type === "call_slot_definition" &&
      (r.config as Record<string, unknown>)?.slotCallType === "Backup"
  );
  const ruleSetId =
    existingBuddy?.rule_set_id ?? backupSlot?.rule_set_id ?? (rules ?? [])[0]?.rule_set_id ?? null;

  // ── Plan 1: buddy_requirement (grey-zone config) ──
  const buddyConfig = {
    ...(existingBuddy?.config as Record<string, unknown> | undefined),
    requiredDaysPerMonth: 2, // hard cap: max 2 buddy weekends / intern-month
    eligibleRotationNameTokens: ["genortho", "pager"],
    eligibleServiceMonthIndices: [1], // buddy only in the intern's FIRST Gen-Ortho month
    partnerPgyYears: [4, 5], // buddy paired with a PGY-4 OR PGY-5 primary
    internPrimaryFromServiceMonthIndex: 2, // intern joins Primary pool from 2nd Gen-Ortho month
  };

  // ── Plan 2: Backup slot fallback pool ──
  const backupConfig = backupSlot
    ? {
        ...(backupSlot.config as Record<string, unknown>),
        slotFallbackPgyYears: [4], // PGY-5 preferred (existing pool), PGY-4 if needed
        slotFallbackLabel: "Fallback: PGY-4 covering",
      }
    : null;

  console.log("=== HOUSTON METHODIST GREY-ZONE CONFIG PLAN ===");
  console.log(`mode: ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"}  ruleSetId: ${ruleSetId}`);
  console.log(
    `\n[buddy_requirement] ${existingBuddy ? `UPDATE ${existingBuddy.id}` : "INSERT new rule"}`
  );
  console.log("  config:", JSON.stringify(buddyConfig));
  if (backupSlot) {
    console.log(`\n[call_slot_definition Backup] UPDATE ${backupSlot.id}`);
    console.log("  config:", JSON.stringify(backupConfig));
  } else {
    console.log("\n[call_slot_definition Backup] NOT FOUND — skipping fallback (needs a Backup slot).");
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these changes.");
    return;
  }

  if (existingBuddy) {
    const { error: e } = await s
      .from("program_call_rules")
      .update({ config: buddyConfig, is_enabled: true })
      .eq("id", existingBuddy.id);
    if (e) throw e;
    console.log(`updated buddy_requirement ${existingBuddy.id}`);
  } else {
    const { data, error: e } = await s
      .from("program_call_rules")
      .insert({
        program_id: HM,
        rule_set_id: ruleSetId,
        rule_type: "buddy_requirement",
        name: "Buddy requirement (grey-zone)",
        is_enabled: true,
        is_hard_rule: true,
        config: buddyConfig,
      })
      .select("id")
      .single();
    if (e) throw e;
    console.log(`inserted buddy_requirement ${data?.id}`);
  }

  if (backupSlot && backupConfig) {
    const { error: e } = await s
      .from("program_call_rules")
      .update({ config: backupConfig })
      .eq("id", backupSlot.id);
    if (e) throw e;
    console.log(`updated Backup slot ${backupSlot.id}`);
  }

  console.log("\nApplied. Dormant until NEXT_PUBLIC_CALL_POLICY_V2 (or ?callPolicyV2=1) is on.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
