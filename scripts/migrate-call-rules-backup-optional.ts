import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import {
  findBackupRequirementSources,
  migratePersistedCallRule,
} from "../src/lib/workspace/call/persisted-rule-migration";

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

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"));
  const supabase = createAdminClient();

  const { data: rules, error } = await supabase
    .from("program_call_rules")
    .select("id, program_id, rule_set_id, rule_type, name, is_enabled, config")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = rules ?? [];
  let updatedCount = 0;

  for (const row of rows) {
    const beforeSources = findBackupRequirementSources([row]);
    const migrated = migratePersistedCallRule(row);
    if (!migrated.changed) continue;

    const { error: updateError } = await supabase
      .from("program_call_rules")
      .update({ config: migrated.rule.config })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`Failed to update rule ${row.id}: ${updateError.message}`);
    }

    updatedCount += 1;
    console.log(
      JSON.stringify({
        id: row.id,
        program_id: row.program_id,
        rule_type: row.rule_type,
        name: row.name,
        reasons: migrated.reasons,
        before: {
          requiredDaily:
            beforeSources.requiredDailyCallSlotsRule?.config ?? null,
          backupSlot: beforeSources.backupSlotDefinitionRule?.config ?? null,
        },
        after: migrated.rule.config,
      })
    );
  }

  console.log(`MIGRATION_COMPLETE updated_rules=${updatedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});