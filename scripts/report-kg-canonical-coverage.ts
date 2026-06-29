import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  findConceptBridgeOpportunities,
  findCurriculumBridgeGaps,
  inferCardCanonicalCoverage,
  inferQuestionCanonicalCoverage,
  loadCanonicalCoverageSnapshot,
  type CanonicalCoverageSnapshot,
  type InferredCanonicalCoveragePath,
} from "./lib/education/kg-canonical-coverage.ts";

type ParsedArgs = {
  outDir: string;
};

type ProofEntityStatus = {
  slug: string;
  label: string;
  entity_type: string;
  curriculum_bridge_count: number;
  card_count: number;
  question_count: number;
};

const PROOF_ENTITY_SLUGS = [
  "intertrochanteric-fracture",
  "femoral-neck-fracture",
  "garden-classification",
  "medial-femoral-circumflex-artery",
  "cephalomedullary-nail",
  "hip-hemiarthroplasty",
  "avascular-necrosis",
] as const;

function parseArgs(argv: string[]): ParsedArgs {
  let outDir = "reports";

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      outDir = argv[index + 1] ?? outDir;
      index += 1;
    }
  }

  return { outDir };
}

function loadEnvFile(filePath: string) {
  const env = Object.create(null) as Record<string, string>;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function resolveEnv() {
  const cwdEnvPath = path.join(process.cwd(), ".env.local");
  const fileEnv = existsSync(cwdEnvPath) ? loadEnvFile(cwdEnvPath) : {};

  return {
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const ownProps = Object.fromEntries(
      Object.getOwnPropertyNames(error)
        .filter((key) => !["name", "message", "stack"].includes(key))
        .map((key) => [key, (error as unknown as { [key: string]: unknown })[key]])
    );

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...ownProps,
    };
  }

  return { error: String(error) };
}

function ensureOutDir(outDir: string) {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function formatPathExample(kind: "card" | "question", id: string, path: InferredCanonicalCoveragePath) {
  if (path.path_type === "curriculum_node") {
    return `- ${kind} \`${id}\` -> curriculum node ${path.curriculum_node_title ?? path.curriculum_node_id ?? "unknown"} -> canonical entity ${path.canonical_entity_label} (\`${path.relation_type}\`, bridge ${path.bridge_confidence.toFixed(3)})`;
  }

  return `- ${kind} \`${id}\` -> concept ${path.concept_name ?? path.concept_id ?? "unknown"} -> canonical entity ${path.canonical_entity_label} (\`${path.relation_type}\`, bridge ${path.bridge_confidence.toFixed(3)})`;
}

function summarizeProofEntities(
  snapshot: CanonicalCoverageSnapshot,
  cardCoverage: ReturnType<typeof inferCardCanonicalCoverage>,
  questionCoverage: ReturnType<typeof inferQuestionCanonicalCoverage>
) {
  const proofEntities = snapshot.canonicalEntities.filter(
    (row) => row.slug && PROOF_ENTITY_SLUGS.includes(row.slug as (typeof PROOF_ENTITY_SLUGS)[number])
  );
  const curriculumBridgeCounts = new Map<string, number>();
  for (const link of snapshot.curriculumNodeEntityLinks) {
    if (!link.canonical_entity_id) {
      continue;
    }
    curriculumBridgeCounts.set(
      link.canonical_entity_id,
      (curriculumBridgeCounts.get(link.canonical_entity_id) ?? 0) + 1
    );
  }

  const proofStatus: ProofEntityStatus[] = proofEntities.map((entity) => {
    const cardCount = cardCoverage.filter((row) =>
      row.inferred_paths.some((path) => path.canonical_entity_id === entity.id)
    ).length;
    const questionCount = questionCoverage.filter((row) =>
      row.inferred_paths.some((path) => path.canonical_entity_id === entity.id)
    ).length;

    return {
      slug: entity.slug ?? "n/a",
      label: entity.preferred_label,
      entity_type: entity.entity_type,
      curriculum_bridge_count: curriculumBridgeCounts.get(entity.id) ?? 0,
      card_count: cardCount,
      question_count: questionCount,
    };
  });

  return proofStatus.sort((left, right) => left.label.localeCompare(right.label));
}

async function main() {
  const args = parseArgs(process.argv);
  const { supabaseUrl, serviceRoleKey } = resolveEnv();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as Parameters<typeof loadCanonicalCoverageSnapshot>[0];

  const snapshot = await loadCanonicalCoverageSnapshot(supabase);
  const cardCoverage = inferCardCanonicalCoverage(snapshot);
  const questionCoverage = inferQuestionCanonicalCoverage(snapshot);
  const curriculumGaps = findCurriculumBridgeGaps(snapshot);
  const conceptOpportunities = findConceptBridgeOpportunities(snapshot);
  const proofStatus = summarizeProofEntities(snapshot, cardCoverage, questionCoverage);

  const cardsWithMappings = uniqueCount(snapshot.cardKnowledgeLinks.map((row) => row.canonical_card_id));
  const cardsWithCanonicalCoverage = cardCoverage.filter((row) => row.inferred_paths.length > 0).length;
  const questionsWithMappings = uniqueCount(
    snapshot.questionCurriculumMappings.map((row) => row.external_question_id)
  );
  const questionsWithCanonicalCoverage = questionCoverage.filter((row) => row.inferred_paths.length > 0).length;
  const bridgedCurriculumNodes = uniqueCount(
    snapshot.curriculumNodeEntityLinks.map((row) => row.curriculum_node_id)
  );
  const bridgedConcepts = uniqueCount(snapshot.conceptCanonicalEntityLinks.map((row) => row.concept_id));

  const exampleCardPaths = cardCoverage
    .filter((row) => row.inferred_paths.length > 0)
    .slice(0, 5)
    .map((row) => formatPathExample("card", row.canonical_card_id, row.inferred_paths[0]));

  const exampleQuestionPaths = questionCoverage
    .filter((row) => row.inferred_paths.length > 0)
    .slice(0, 5)
    .map((row) => formatPathExample("question", row.external_question_id, row.inferred_paths[0]));

  const lines: string[] = [];
  lines.push("# KG Canonical Coverage Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`- Cards with existing old mappings: ${cardsWithMappings}`);
  lines.push(`- Cards with inferred canonical entity coverage: ${cardsWithCanonicalCoverage}`);
  lines.push(`- Questions with existing old mappings: ${questionsWithMappings}`);
  lines.push(`- Questions with inferred canonical entity coverage: ${questionsWithCanonicalCoverage}`);
  lines.push(`- Curriculum nodes bridged to canonical coverage: ${bridgedCurriculumNodes}`);
  lines.push(`- Concepts bridged to canonical entities: ${bridgedConcepts}`);
  lines.push("");

  lines.push("## Card Coverage");
  lines.push("");
  if (exampleCardPaths.length === 0) {
    lines.push("- No inferred card-to-canonical paths yet.");
  } else {
    lines.push(...exampleCardPaths);
  }
  lines.push("");

  lines.push("## Question Coverage");
  lines.push("");
  if (exampleQuestionPaths.length === 0) {
    lines.push("- No inferred question-to-canonical paths yet.");
  } else {
    lines.push(...exampleQuestionPaths);
  }
  lines.push("");

  lines.push("## Curriculum Bridge Gaps");
  lines.push("");
  if (curriculumGaps.length === 0) {
    lines.push("- No unbridged curriculum nodes currently used by cards or questions.");
  } else {
    for (const gap of curriculumGaps.slice(0, 15)) {
      lines.push(
        `- ${gap.node_path} (\`${gap.node_slug}\`)${gap.specialty_name ? ` [${gap.specialty_name}]` : ""}: ${gap.card_count} card links, ${gap.question_count} question links`
      );
    }
  }
  lines.push("");

  lines.push("## Concept Bridge Opportunities");
  lines.push("");
  if (conceptOpportunities.length === 0) {
    lines.push("- No concept-linked legacy mappings without a reviewed concept bridge.");
  } else {
    for (const opportunity of conceptOpportunities.slice(0, 15)) {
      lines.push(
        `- ${opportunity.concept_name} (\`${opportunity.concept_slug}\`, \`${opportunity.concept_type}\`) in ${opportunity.node_path ?? opportunity.curriculum_node_title ?? "unknown node"}: ${opportunity.card_count} card links, ${opportunity.question_count} question links`
      );
    }
  }
  lines.push("");

  lines.push("## Proof-Set Validation");
  lines.push("");
  if (proofStatus.length === 0) {
    lines.push("- Proof-set canonical entities are not present in the queried database yet.");
  } else {
    for (const proof of proofStatus) {
      lines.push(
        `- ${proof.label} (\`${proof.entity_type}\`, \`${proof.slug}\`): ${proof.curriculum_bridge_count} curriculum bridges, ${proof.card_count} covered cards, ${proof.question_count} covered questions`
      );
    }
  }
  lines.push("");

  lines.push("## Recommendations");
  lines.push("");
  if (curriculumGaps.length > 0) {
    lines.push("Next curriculum nodes to bridge:");
    for (const gap of curriculumGaps.slice(0, 10)) {
      lines.push(
        `- ${gap.node_path} (\`${gap.node_slug}\`) with ${gap.card_count + gap.question_count} total legacy mappings`
      );
    }
  } else {
    lines.push("- Curriculum bridge coverage is already complete for currently mapped nodes.");
  }
  lines.push("");
  if (conceptOpportunities.length > 0) {
    lines.push("Next concepts to triage for reviewed bridges:");
    for (const opportunity of conceptOpportunities.slice(0, 10)) {
      lines.push(
        `- ${opportunity.concept_name} (\`${opportunity.concept_type}\`) with ${opportunity.card_count + opportunity.question_count} total legacy mappings`
      );
    }
  } else {
    lines.push("- No concept bridge triage queue is visible from current legacy mappings.");
  }
  lines.push("");

  ensureOutDir(args.outDir);
  const outputPath = path.join(args.outDir, "kg-canonical-coverage-report.md");
  writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        cardsWithMappings,
        cardsWithCanonicalCoverage,
        questionsWithMappings,
        questionsWithCanonicalCoverage,
        bridgedCurriculumNodes,
        bridgedConcepts,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify(serializeError(error), null, 2));
  process.exit(1);
});
