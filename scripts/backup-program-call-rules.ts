import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { sanitizeRuleConfig } from "../src/lib/workspace/call/rule-definitions";

function loadEnvFile(filePath: string) {
  try {
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const raw = trimmed.slice(separator + 1).trim();
      const value =
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
          ? raw.slice(1, -1)
          : raw;
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Environment variables may already be supplied by the caller.
  }
}

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"));
  const programId = argument("program-id");
  const outputPath = argument("out");
  if (!programId || !outputPath) {
    throw new Error("Usage: --program-id=<uuid> --out=<backup.json>");
  }

  const supabase = createAdminClient();
  const [{ data: ruleSets, error: ruleSetsError }, { data: rules, error: rulesError }] =
    await Promise.all([
      supabase.from("program_call_rule_sets").select("*").eq("program_id", programId),
      supabase
        .from("program_call_rules")
        .select("*")
        .eq("program_id", programId)
        .order("priority", { ascending: true }),
    ]);

  if (ruleSetsError) throw new Error(ruleSetsError.message);
  if (rulesError) throw new Error(rulesError.message);

  const buddyRules = (rules ?? []).filter((rule) => rule.rule_type === "buddy_requirement");
  for (const buddyRule of buddyRules) {
    const sanitized = sanitizeRuleConfig("buddy_requirement", buddyRule.config ?? {});
    const persistedConfig = (buddyRule.config ?? {}) as Record<string, unknown>;
    const losesPersistedValue = Object.entries(persistedConfig).some(
      ([key, value]) => JSON.stringify(sanitized[key as keyof typeof sanitized]) !== JSON.stringify(value)
    );
    if (losesPersistedValue) {
      throw new Error(
        `Buddy rule ${buddyRule.id} would lose a persisted value during canonicalization; inspect before deployment.`
      );
    }
  }

  const absoluteOutput = resolve(outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(
    absoluteOutput,
    `${JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        programId,
        ruleSets: ruleSets ?? [],
        rules: rules ?? [],
        verification: {
          buddyRuleCount: buddyRules.length,
          buddyRulesCanonical: true,
        },
      },
      null,
      2
    )}\n`,
    { encoding: "utf8", mode: 0o600 }
  );

  console.log(
    JSON.stringify({
      output: absoluteOutput,
      ruleSetCount: ruleSets?.length ?? 0,
      ruleCount: rules?.length ?? 0,
      buddyRuleCount: buddyRules.length,
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
