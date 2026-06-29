import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath: string) {
  const env = Object.create(null) as Record<string, string>;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index).trim()] = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function parseArgs(argv: string[]) {
  let runId = "";
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--run-id") {
      runId = argv[index + 1] ?? "";
      index += 1;
    }
  }
  if (!runId) {
    throw new Error("Missing required --run-id");
  }
  return { runId };
}

async function main() {
  const { runId } = parseArgs(process.argv);
  const env = loadEnvFile(path.join(process.cwd(), ".env.local"));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count: candidateRowCount, error: candidateCountError } = await supabase
    .from("anki_kg_mapping_candidates")
    .select("id", { count: "exact", head: true })
    .eq("mapping_run_id", runId);
  if (candidateCountError) {
    throw candidateCountError;
  }
  if ((candidateRowCount ?? 0) > 0) {
    const { error } = await supabase
      .from("anki_kg_mapping_candidates")
      .delete()
      .eq("mapping_run_id", runId);
    if (error) {
      throw error;
    }
  }

  const linkIds: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("card_knowledge_links")
      .select("id")
      .contains("metadata", { mapping_run_id: runId })
      .range(from, from + 999);
    if (error) {
      throw error;
    }
    linkIds.push(...((data ?? []).map((row) => String(row.id))));
    if (!data || data.length < 1000) {
      break;
    }
  }
  for (const chunk of Array.from({ length: Math.ceil(linkIds.length / 200) }, (_, i) =>
    linkIds.slice(i * 200, (i + 1) * 200)
  )) {
    if (chunk.length === 0) {
      continue;
    }
    const { error } = await supabase.from("card_knowledge_links").delete().in("id", chunk);
    if (error) {
      throw error;
    }
  }

  const { error: runUpdateError } = await supabase
    .from("anki_kg_mapping_runs")
    .update({
      status: "failed",
      comments: `Run ${runId} cleaned manually after partial persistence.`,
    })
    .eq("id", runId)
    .neq("status", "completed");
  if (runUpdateError) {
    throw runUpdateError;
  }

  console.log(
    JSON.stringify(
      {
        runId,
        candidateRowsDeleted: candidateRowCount ?? 0,
        cardKnowledgeLinksDeleted: linkIds.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error: String(error) },
      null,
      2
    )
  );
  process.exit(1);
});
