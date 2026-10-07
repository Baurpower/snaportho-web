/**
 * Dual-run scorecard for Path-1+Path-2 claims shadow retrieval (v2 RPC).
 * Read-only against live Supabase. Never serves Orthobullets QCL / needs_review.
 *
 * Usage: npx tsx scripts/brobot-path2-shadow-scorecard.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PROMPTS = [
  "ankle fracture ORIF indications",
  "distal radius ORIF volar approach",
  "carpal tunnel release recurrent motor branch",
  "ACL reconstruction graft choice",
  "SCFE in situ pinning",
];

function loadEnv() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const rows = [];
  for (const query of PROMPTS) {
    const t0 = Date.now();
    const { data, error } = await sb.rpc("retrieve_brobot_knowledge_v2", {
      p_release_id: "kg-beta-20260716-002",
      p_query: query,
      p_entity_types: [
        "condition",
        "anatomy_structure",
        "procedure",
        "treatment_principle",
        "complication",
        "injury",
      ],
      p_predicates: ["treats", "has_complication", "indicated_for", "located_in", "part_of"],
      p_max_candidates: 8,
      p_max_entities: 8,
      p_max_relationships: 10,
      p_max_neighborhoods: 2,
      p_mode: "consult",
      p_subintent: "general",
      p_max_claims: 8,
      p_max_cards: 8,
    });
    const ms = Date.now() - t0;
    if (error) {
      rows.push({ query, ms, error: error.message });
      continue;
    }
    const claims = data?.claims ?? [];
    const cards = data?.cardCandidates ?? [];
    const needsReview = claims.filter(
      (c: { reviewStatus?: string }) => c.reviewStatus === "needs_review"
    ).length;
    rows.push({
      query,
      ms,
      coverage: data?.coverage,
      claimCount: claims.length,
      cardCount: cards.length,
      needsReviewServed: needsReview,
      sample: claims.slice(0, 3).map((c: { claimId: string; claimText: string; trustTier: string; reviewStatus: string }) => ({
        id: c.claimId,
        trust: c.trustTier,
        review: c.reviewStatus,
        text: (c.claimText || "").slice(0, 100),
      })),
    });
  }

  const outDir = resolve("reports/brobot-path2-grounding");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "shadow-scorecard.json"), JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
  const md = [
    "# BroBot Path-2 claims shadow scorecard",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Query | ms | claims | cards | needs_review | coverage |",
    "|---|---:|---:|---:|---:|---|",
    ...rows.map((r) =>
      `| ${r.query} | ${r.ms ?? ""} | ${r.claimCount ?? ""} | ${r.cardCount ?? ""} | ${r.needsReviewServed ?? ""} | ${r.coverage ?? r.error ?? ""} |`
    ),
    "",
    "Invariant: needs_review must always be 0.",
  ].join("\n");
  writeFileSync(resolve(outDir, "SHADOW-SCORECARD.md"), md);
  console.log(md);
  const leaked = rows.some((r) => (r.needsReviewServed ?? 0) > 0);
  if (leaked) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
