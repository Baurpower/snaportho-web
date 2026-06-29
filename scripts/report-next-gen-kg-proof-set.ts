import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type ProofEntity = {
  id: string;
  entity_type: string;
  preferred_label: string;
  slug: string | null;
  status: string;
  review_status: string;
};

type CurriculumLink = {
  curriculum_node_id: string;
  relation_type: string;
  confidence: number;
  review_status: string;
};

type CurriculumNode = {
  id: string;
  slug: string;
  title: string;
  node_type: string;
};

type SourceAlias = {
  alias_kind: string;
  alias_value: string;
  external_id: string | null;
  source_id: string;
};

type ExternalSource = {
  id: string;
  slug: string;
  name: string;
};

type CanonicalRelationship = {
  subject_entity_id: string;
  predicate: string;
  object_entity_id: string;
  confidence: number;
  review_status: string;
};

type CardLink = {
  canonical_card_id: string;
  curriculum_node_id: string | null;
  concept_id: string | null;
  mapping_confidence: number;
  review_status: string;
};

type QuestionLink = {
  external_question_id: string;
  curriculum_node_id: string | null;
  concept_id: string | null;
  mapping_confidence: number;
  needs_review: boolean;
};

type ParsedArgs = {
  outDir: string;
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

function chunk<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  const { supabaseUrl, serviceRoleKey } = resolveEnv();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as {
    from: (relation: string) => any;
  };

  const { data: entities, error: entityError } = await supabase
    .from("canonical_entities")
    .select("id, entity_type, preferred_label, slug, status, review_status")
    .in("slug", [...PROOF_ENTITY_SLUGS])
    .order("preferred_label", { ascending: true });

  if (entityError) {
    throw entityError;
  }

  const proofEntities = (entities ?? []) as ProofEntity[];
  const entityById = new Map(proofEntities.map((entity) => [entity.id, entity]));
  const entityIds = proofEntities.map((entity) => entity.id);

  const { data: sources, error: sourceError } = await supabase
    .from("external_sources")
    .select("id, slug, name")
    .in("slug", ["orthobullets", "snaportho-anki"]);

  if (sourceError) {
    throw sourceError;
  }

  const sourceById = new Map(((sources ?? []) as ExternalSource[]).map((source) => [source.id, source]));

  const { data: aliases, error: aliasError } = await supabase
    .from("source_aliases")
    .select("entity_id, alias_kind, alias_value, external_id, source_id")
    .eq("entity_type", "canonical_entity")
    .in("entity_id", entityIds);

  if (aliasError) {
    throw aliasError;
  }

  const aliasesByEntityId = new Map<string, SourceAlias[]>();
  for (const alias of (aliases ?? []) as Array<SourceAlias & { entity_id: string }>) {
    const bucket = aliasesByEntityId.get(alias.entity_id) ?? [];
    bucket.push(alias);
    aliasesByEntityId.set(alias.entity_id, bucket);
  }

  const { data: curriculumLinks, error: curriculumError } = await supabase
    .from("curriculum_node_entities")
    .select("canonical_entity_id,curriculum_node_id,relation_type,confidence,review_status")
    .in("canonical_entity_id", entityIds)
    .order("confidence", { ascending: false });

  if (curriculumError) {
    throw curriculumError;
  }

  const curriculumLinksByEntityId = new Map<string, CurriculumLink[]>();
  const curriculumNodeIds = new Set<string>();
  for (const link of (curriculumLinks ?? []) as Array<CurriculumLink & { canonical_entity_id: string }>) {
    const bucket = curriculumLinksByEntityId.get(link.canonical_entity_id) ?? [];
    bucket.push(link);
    curriculumLinksByEntityId.set(link.canonical_entity_id, bucket);
    curriculumNodeIds.add(link.curriculum_node_id);
  }

  const { data: curriculumNodes, error: curriculumNodeError } = await supabase
    .from("curriculum_nodes")
    .select("id,slug,title,node_type")
    .in("id", [...curriculumNodeIds]);

  if (curriculumNodeError) {
    throw curriculumNodeError;
  }

  const curriculumNodeById = new Map(
    ((curriculumNodes ?? []) as CurriculumNode[]).map((node) => [node.id, node])
  );

  const { data: subjectRelationships, error: subjectRelationshipError } = await supabase
    .from("canonical_relationships")
    .select("subject_entity_id,predicate,object_entity_id,confidence,review_status")
    .in("subject_entity_id", entityIds)
    .eq("subject_entity_type", "canonical_entity")
    .eq("object_entity_type", "canonical_entity")
    .eq("is_active", true)
    .order("predicate", { ascending: true });

  if (subjectRelationshipError) {
    throw subjectRelationshipError;
  }

  const { data: objectRelationships, error: objectRelationshipError } = await supabase
    .from("canonical_relationships")
    .select("subject_entity_id,predicate,object_entity_id,confidence,review_status")
    .in("object_entity_id", entityIds)
    .eq("subject_entity_type", "canonical_entity")
    .eq("object_entity_type", "canonical_entity")
    .eq("is_active", true)
    .order("predicate", { ascending: true });

  if (objectRelationshipError) {
    throw objectRelationshipError;
  }

  const relationshipKey = (row: CanonicalRelationship) =>
    `${row.subject_entity_id}:${row.predicate}:${row.object_entity_id}`;
  const combinedRelationships = new Map<string, CanonicalRelationship>();
  for (const row of [...((subjectRelationships ?? []) as CanonicalRelationship[]), ...((objectRelationships ?? []) as CanonicalRelationship[])]) {
    combinedRelationships.set(relationshipKey(row), row);
  }

  const relationshipsByEntityId = new Map<string, CanonicalRelationship[]>();
  for (const relationship of combinedRelationships.values()) {
    const subjectBucket = relationshipsByEntityId.get(relationship.subject_entity_id) ?? [];
    subjectBucket.push(relationship);
    relationshipsByEntityId.set(relationship.subject_entity_id, subjectBucket);

    if (entityById.has(relationship.object_entity_id)) {
      const objectBucket = relationshipsByEntityId.get(relationship.object_entity_id) ?? [];
      objectBucket.push(relationship);
      relationshipsByEntityId.set(relationship.object_entity_id, objectBucket);
    }
  }

  const cardLinksByNodeId = new Map<string, CardLink[]>();
  const questionLinksByNodeId = new Map<string, QuestionLink[]>();
  const nodeIdList = [...curriculumNodeIds];

  for (const nodeChunk of chunk(nodeIdList, 25)) {
    const { data: cardLinks, error: cardError } = await supabase
      .from("card_knowledge_links")
      .select("canonical_card_id,curriculum_node_id,concept_id,mapping_confidence,review_status")
      .in("curriculum_node_id", nodeChunk)
      .eq("is_active", true)
      .limit(200);

    if (cardError) {
      throw cardError;
    }

    for (const link of (cardLinks ?? []) as CardLink[]) {
      if (!link.curriculum_node_id) continue;
      const bucket = cardLinksByNodeId.get(link.curriculum_node_id) ?? [];
      bucket.push(link);
      cardLinksByNodeId.set(link.curriculum_node_id, bucket);
    }

    const { data: questionLinks, error: questionError } = await supabase
      .from("external_question_curriculum_mappings")
      .select("external_question_id,curriculum_node_id,concept_id,mapping_confidence,needs_review")
      .in("curriculum_node_id", nodeChunk)
      .eq("is_active", true)
      .limit(200);

    if (questionError) {
      throw questionError;
    }

    for (const link of (questionLinks ?? []) as QuestionLink[]) {
      if (!link.curriculum_node_id) continue;
      const bucket = questionLinksByNodeId.get(link.curriculum_node_id) ?? [];
      bucket.push(link);
      questionLinksByNodeId.set(link.curriculum_node_id, bucket);
    }
  }

  const lines: string[] = [];
  lines.push("# Next-Generation KG Proof Set Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  for (const entity of proofEntities) {
    const aliasRows = aliasesByEntityId.get(entity.id) ?? [];
    const curriculumRows = curriculumLinksByEntityId.get(entity.id) ?? [];
    const relationshipRows = relationshipsByEntityId.get(entity.id) ?? [];

    const nodeCards = curriculumRows.flatMap((row) => cardLinksByNodeId.get(row.curriculum_node_id) ?? []);
    const nodeQuestions = curriculumRows.flatMap((row) => questionLinksByNodeId.get(row.curriculum_node_id) ?? []);

    const distinctCards = [...new Set(nodeCards.map((row) => row.canonical_card_id))];
    const distinctQuestions = [...new Set(nodeQuestions.map((row) => row.external_question_id))];

    lines.push(`## ${entity.preferred_label}`);
    lines.push("");
    lines.push(`- Type: \`${entity.entity_type}\``);
    lines.push(`- Slug: \`${entity.slug ?? "n/a"}\``);
    lines.push(`- Status: \`${entity.status}\``);
    lines.push(`- Review status: \`${entity.review_status}\``);
    lines.push("");

    lines.push("### Linked Curriculum Nodes");
    if (curriculumRows.length === 0) {
      lines.push("- None");
    } else {
      for (const row of curriculumRows) {
        const node = curriculumNodeById.get(row.curriculum_node_id);
        lines.push(
          `- ${node?.title ?? row.curriculum_node_id} (\`${node?.slug ?? "unknown-slug"}\`, \`${row.relation_type}\`, confidence ${row.confidence.toFixed(3)}, review \`${row.review_status}\`)`
        );
      }
    }
    lines.push("");

    lines.push("### Source Aliases");
    if (aliasRows.length === 0) {
      lines.push("- None");
    } else {
      for (const row of aliasRows) {
        const source = sourceById.get(row.source_id);
        lines.push(
          `- ${source?.name ?? row.source_id}: \`${row.alias_kind}\` -> ${row.alias_value}${row.external_id ? ` (external_id: \`${row.external_id}\`)` : ""}`
        );
      }
    }
    lines.push("");

    lines.push("### Relationships");
    if (relationshipRows.length === 0) {
      lines.push("- None");
    } else {
      for (const row of relationshipRows) {
        const subjectLabel = entityById.get(row.subject_entity_id)?.preferred_label ?? row.subject_entity_id;
        const objectLabel = entityById.get(row.object_entity_id)?.preferred_label ?? row.object_entity_id;
        lines.push(
          `- ${subjectLabel} \`${row.predicate}\` ${objectLabel} (confidence ${row.confidence.toFixed(3)}, review \`${row.review_status}\`)`
        );
      }
    }
    lines.push("");

    lines.push("### Linked Cards / Questions");
    lines.push(`- Linked cards via curriculum overlay: ${distinctCards.length}`);
    if (distinctCards.length > 0) {
      lines.push(`- Sample card ids: ${distinctCards.slice(0, 8).map((id) => `\`${id}\``).join(", ")}`);
    }
    lines.push(`- Linked external questions via curriculum overlay: ${distinctQuestions.length}`);
    if (distinctQuestions.length > 0) {
      lines.push(
        `- Sample external question ids: ${distinctQuestions.slice(0, 8).map((id) => `\`${id}\``).join(", ")}`
      );
    }
    lines.push("");
  }

  ensureOutDir(args.outDir);
  const outputPath = path.join(args.outDir, "next-gen-kg-proof-set-report.md");
  writeFileSync(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        entityCount: proofEntities.length,
        canonicalEntitySlugs: proofEntities.map((entity) => entity.slug),
        outputPath,
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
