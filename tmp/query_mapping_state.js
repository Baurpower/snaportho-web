const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");

const runId = process.argv[2];

if (!runId) {
  throw new Error("Expected run ID argument.");
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  const { data: candidates, error: candidateError } = await supabase
    .from("anki_kg_mapping_candidates")
    .select("id,mapping_confidence,review_status,curriculum_node_id,canonical_card_id")
    .eq("mapping_run_id", runId);
  if (candidateError) {
    throw candidateError;
  }

  const { data: links, error: linkError } = await supabase
    .from("card_knowledge_links")
    .select("id,mapping_confidence,review_status,link_method,curriculum_node_id,curriculum_nodes(title,node_type,slug)")
    .eq("link_method", "deterministic");
  if (linkError) {
    throw linkError;
  }

  const { count: failedRunCount, error: failedRunError } = await supabase
    .from("anki_kg_mapping_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");
  if (failedRunError) {
    throw failedRunError;
  }

  const candidateByStatus = {};
  const candidateBands = { high: 0, medium: 0, low: 0 };
  const duplicateCandidateKeys = new Map();
  for (const row of candidates ?? []) {
    candidateByStatus[row.review_status] = (candidateByStatus[row.review_status] ?? 0) + 1;
    const confidence = Number(row.mapping_confidence ?? 0);
    if (confidence >= 0.9) {
      candidateBands.high += 1;
    } else if (confidence >= 0.75) {
      candidateBands.medium += 1;
    } else {
      candidateBands.low += 1;
    }
    const key = [
      row.canonical_card_id ?? "",
      row.curriculum_node_id ?? "",
      row.review_status ?? "",
      String(row.mapping_confidence ?? ""),
    ].join(":");
    duplicateCandidateKeys.set(key, (duplicateCandidateKeys.get(key) ?? 0) + 1);
  }

  const duplicateCandidateCount = [...duplicateCandidateKeys.values()].filter((count) => count > 1).length;

  const broadLinks = [];
  for (const row of links ?? []) {
    const node = Array.isArray(row.curriculum_nodes) ? row.curriculum_nodes[0] : row.curriculum_nodes;
    if (
      node &&
      ["specialty", "region", "module", "exam_domain", "pathway"].includes(node.node_type)
    ) {
      broadLinks.push({
        id: row.id,
        slug: node.slug,
        title: node.title,
        node_type: node.node_type,
      });
    }
  }

  const missingConfidence = (links ?? []).filter((row) => row.mapping_confidence == null).length;
  const wrongMethod = (links ?? []).filter((row) => row.link_method !== "deterministic").length;

  process.stdout.write(
    `${JSON.stringify(
      {
        runId,
        candidateCount: (candidates ?? []).length,
        candidateByStatus,
        candidateBands,
        duplicateCandidateCount,
        appliedLinkCount: (links ?? []).length,
        broadLinkCount: broadLinks.length,
        broadLinks: broadLinks.slice(0, 10),
        missingConfidence,
        wrongMethod,
        failedRunCount,
      },
      null,
      2
    )}\n`
  );
})().catch((error) => {
  console.error(
    JSON.stringify(
      {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
      },
      null,
      2
    )
  );
  process.exit(1);
});
