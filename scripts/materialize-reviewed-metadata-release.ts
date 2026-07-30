import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;
const RUN_KEY = "snaportho-codex-cohorts-v1";
const POLICY = "snaportho-codex-cohorts.1";
const RELEASE_KEY = "snaportho-metadata-full-codex-v1-reviewed";
const RELEASE_VERSION = "1.0.0-codex-reviewed";

function env() {
  return Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
      }),
  );
}
function read(name: string) {
  return JSON.parse(fs.readFileSync(`tmp/codex-metadata/audits/${name}`, "utf8"));
}
function key(row: Row) {
  return `${row.canonical_card_version_id ?? row.canonicalCardVersionId}|${row.facet}|${row.canonical_entity_id ?? row.metadata_concept_id ?? row.termId}`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && !process.argv.includes("--confirm=CREATE_REVIEWED_METADATA_DRAFT")) {
    throw new Error("apply requires --confirm=CREATE_REVIEWED_METADATA_DRAFT");
  }
  const anatomy = read("anatomy-corrections.json");
  const clinical = read("clinical-cohort1-corrections.json");
  const specialty = read("specialty-corrections.json");
  // Conservative publication: uncertain anatomy mappings are excluded alongside definite rejects.
  const exclusions = new Set<string>([
    ...anatomy.items.filter((item: Row) => item.action !== "keep")
      .map((item: Row) => `${item.canonicalCardVersionId}|${item.facet}|${item.termId}`),
    ...clinical.rejectKeys.map((item: string) => item.replaceAll(":", "|")),
    ...specialty.rejectKeys.map((item: string) => item.replaceAll(":", "|")),
  ]);
  if (exclusions.size !== 697) throw new Error(`unexpected_exclusion_count:${exclusions.size}`);

  const e = env();
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  async function pages(table: string, select: string, filter: (q: any) => any) {
    const out: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await filter(db.from(table).select(select).range(from, from + 999));
      if (error) throw new Error(`${table}:${error.message}`);
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return out;
  }
  const { data: run, error: runError } = await db.from("metadata_pipeline_runs")
    .select("*").eq("run_key", RUN_KEY).single();
  if (runError) throw runError;
  const assertions = await pages("card_metadata_assertions",
    "id,canonical_card_version_id,facet,canonical_entity_id,metadata_concept_id,decision,confidence,evidence_spans,rationale_codes",
    (q) => q.eq("pipeline_run_id", run.id).eq("decision_policy_version", POLICY).eq("decision", "accepted"));
  const assertionKeys = new Set(assertions.map(key));
  const missingExclusions = [...exclusions].filter((item) => !assertionKeys.has(item));
  if (missingExclusions.length) throw new Error(`missing_exclusion_keys:${missingExclusions.slice(0, 5).join(",")}`);
  const selected = assertions.filter((row) => !exclusions.has(key(row)));
  const invalid = selected.filter((row) => Number(row.confidence) < 0.98
    || !Array.isArray(row.evidence_spans) || !row.evidence_spans.length
    || !Array.isArray(row.rationale_codes) || !row.rationale_codes.length);
  if (invalid.length) throw new Error(`invalid_selected_assertions:${invalid.length}`);
  const checksum = crypto.createHash("sha256")
    .update(selected.map((row) => row.id).sort().join("\n")).digest("hex");
  const summary = {
    apply, runId: run.id, originalAssertions: assertions.length,
    excludedAssertions: exclusions.size, selectedAssertions: selected.length,
    selectedCards: new Set(selected.map((row) => row.canonical_card_version_id)).size,
    releaseKey: RELEASE_KEY, releaseVersion: RELEASE_VERSION, manifestChecksum: checksum,
  };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));
  const { data: existing, error: existingError } = await db.from("metadata_releases")
    .select("*").eq("release_key", RELEASE_KEY).maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error(`reviewed_release_already_exists:${existing.id}`);
  const { data: release, error: releaseError } = await db.from("metadata_releases").insert({
    release_key: RELEASE_KEY,
    release_version: RELEASE_VERSION,
    deck_release_id: run.deck_release_id,
    taxonomy_version_id: run.taxonomy_version_id,
    pipeline_run_id: run.id,
    status: "draft",
    manifest_checksum: checksum,
  }).select("id").single();
  if (releaseError) throw releaseError;
  for (let i = 0; i < selected.length; i += 300) {
    const { error } = await db.from("metadata_release_assertions").insert(
      selected.slice(i, i + 300).map((row) => ({
        metadata_release_id: release.id, assertion_id: row.id,
      })),
    );
    if (error) throw error;
  }
  console.log(JSON.stringify({ ...summary, metadataReleaseId: release.id }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
