import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";

function loadEnvFile(filePath: string) {
  try {
    const contents = readFileSync(filePath, "utf8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env file
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));

async function main() {
  const supabase = createAdminClient();
  const { data: rules, error } = await supabase
    .from("program_call_rules")
    .select("id, program_id, rule_set_id, rule_type, name, is_enabled, config")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const backupSlotRules = (rules ?? []).filter((rule) => {
    const config = rule.config as Record<string, unknown> | null;
    return rule.rule_type === "call_slot_definition" && config?.slotCallType === "Backup";
  });

  const requiredSlotRules = (rules ?? []).filter(
    (rule) => rule.rule_type === "required_daily_call_slots"
  );

  console.log("TOTAL_RULES", rules?.length ?? 0);
  console.log("BACKUP_SLOT_DEFINITIONS", backupSlotRules.length);
  for (const rule of backupSlotRules) {
    const config = rule.config as Record<string, unknown>;
    console.log(
      JSON.stringify({
        id: rule.id,
        program_id: rule.program_id,
        name: rule.name,
        enabled: rule.is_enabled,
        slotRequiredMode: config.slotRequiredMode,
        slotRequiredWhenVisible: config.slotRequiredWhenVisible,
        requiredWhenVisible: config.requiredWhenVisible,
        scheduleSlotMode: config.scheduleSlotMode,
      })
    );
  }

  console.log("REQUIRED_DAILY_CALL_SLOTS", requiredSlotRules.length);
  for (const rule of requiredSlotRules) {
    const config = rule.config as Record<string, unknown>;
    console.log(
      JSON.stringify({
        id: rule.id,
        program_id: rule.program_id,
        name: rule.name,
        enabled: rule.is_enabled,
        requiredCallTypes: config.requiredCallTypes,
        scheduleSlotMode: config.scheduleSlotMode,
      })
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});