// Apply legacy → canonical retargeting (controlled, reversible).
//
// Inserts ONLY into the parallel canonical mapping tables
// (card_canonical_entity_links / question_canonical_entity_links). Never mutates
// or deletes legacy mappings. Every inserted row carries full rollback metadata.
//
// Usage:
//   --dry-run                 compute + report, write nothing (default if no scope)
//   --node <curriculum-slug>  apply only proposals for one curriculum node (one batch)
//   --all                     apply all approved, safe retarget proposals
//   --rollback <batch_key>    deactivate the canonical rows from a batch and revert
//                             its proposals to 'approved' (prints hard-delete SQL too)
//
// Guardrails: only proposals with review_status='approved' AND
// metadata.safe_retarget === true are applied.

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);
const mappingModulePromise = import(
  new URL("./lib/education/kg-canonical-mapping.ts", import.meta.url).href
);

type ProposalRow = import("./kg-automation-common").ProposalRow;

type ParsedArgs = {
  dryRun: boolean;
  node: string | null;
  all: boolean;
  rollback: string | null;
  outDir: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let node: string | null = null;
  let rollback: string | null = null;
  let outDir = "reports";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--node") {
      node = argv[i + 1] ?? null;
      i += 1;
    } else if (argv[i] === "--rollback") {
      rollback = argv[i + 1] ?? null;
      i += 1;
    } else if (argv[i] === "--out-dir") {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    }
  }
  const all = argv.includes("--all");
  // Safe default: if no explicit apply scope, force dry-run.
  const dryRun = argv.includes("--dry-run") || (!node && !all && !rollback);
  return { dryRun, node, all, rollback, outDir };
}

async function writeCoverageReport(
  supabase: any,
  fetchAllRows: any,
  outDir: string,
  context: Record<string, unknown>
) {
  const mapping = await mappingModulePromise;

  const cardCanon = await fetchAllRows((from: number, to: number) =>
    supabase
      .from("card_canonical_entity_links")
      .select("canonical_card_id,canonical_entity_id,is_active,review_status")
      .eq("is_active", true)
      .range(from, to)
  );
  const qCanon = await fetchAllRows((from: number, to: number) =>
    supabase
      .from("question_canonical_entity_links")
      .select("external_question_id,canonical_entity_id,is_active,review_status")
      .eq("is_active", true)
      .range(from, to)
  );
  const cardLegacy = await fetchAllRows((from: number, to: number) =>
    supabase
      .from("card_knowledge_links")
      .select("canonical_card_id,curriculum_node_id,concept_id,is_active")
      .eq("is_active", true)
      .range(from, to)
  );
  const qLegacy = await fetchAllRows((from: number, to: number) =>
    supabase
      .from("external_question_curriculum_mappings")
      .select("external_question_id,curriculum_node_id,concept_id,is_active")
      .eq("is_active", true)
      .range(from, to)
  );
  const allCards = await fetchAllRows((from: number, to: number) =>
    supabase.from("canonical_cards").select("id").eq("is_active", true).range(from, to)
  );
  const allQuestions = await fetchAllRows((from: number, to: number) =>
    supabase.from("external_questions").select("id").eq("is_active", true).range(from, to)
  );

  const cardCoverage = mapping.summarizeMappingCoverage(
    allCards.map((r: any) => r.id),
    cardCanon.map((r: any) => ({ objectId: r.canonical_card_id, canonical_entity_id: r.canonical_entity_id, is_active: r.is_active, review_status: r.review_status })),
    cardLegacy.map((r: any) => ({ objectId: r.canonical_card_id, curriculum_node_id: r.curriculum_node_id, concept_id: r.concept_id, is_active: r.is_active }))
  );
  const questionCoverage = mapping.summarizeMappingCoverage(
    allQuestions.map((r: any) => r.id),
    qCanon.map((r: any) => ({ objectId: r.external_question_id, canonical_entity_id: r.canonical_entity_id, is_active: r.is_active, review_status: r.review_status })),
    qLegacy.map((r: any) => ({ objectId: r.external_question_id, curriculum_node_id: r.curriculum_node_id, concept_id: r.concept_id, is_active: r.is_active }))
  );

  const lines: string[] = [];
  lines.push("# Legacy → Canonical Retargeting — Apply Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Run context");
  lines.push("");
  for (const [k, v] of Object.entries(context)) {
    lines.push(`- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  lines.push("");
  lines.push("## Card coverage");
  lines.push("");
  lines.push(`- Total active cards: ${cardCoverage.totalObjects}`);
  lines.push(`- Canonical-mapped cards: ${cardCoverage.canonicalMapped}`);
  lines.push(`- Legacy-only cards: ${cardCoverage.legacyOnly}`);
  lines.push(`- Dual-mapped cards: ${cardCoverage.dualMapped}`);
  lines.push(`- Unmapped cards: ${cardCoverage.unmapped}`);
  lines.push("");
  lines.push("## Question coverage");
  lines.push("");
  lines.push(`- Total active questions: ${questionCoverage.totalObjects}`);
  lines.push(`- Canonical-mapped questions: ${questionCoverage.canonicalMapped}`);
  lines.push(`- Legacy-only questions: ${questionCoverage.legacyOnly}`);
  lines.push(`- Dual-mapped questions: ${questionCoverage.dualMapped}`);
  lines.push(`- Unmapped questions: ${questionCoverage.unmapped}`);
  lines.push("");
  lines.push("## Projected product coverage");
  lines.push("");
  lines.push(
    `- Cards now reachable via canonical entities: ${cardCoverage.canonicalMapped} (${((cardCoverage.canonicalMapped / Math.max(1, cardCoverage.totalObjects)) * 100).toFixed(1)}% of active cards).`
  );
  lines.push(
    `- Questions now reachable via canonical entities: ${questionCoverage.canonicalMapped} (${((questionCoverage.canonicalMapped / Math.max(1, questionCoverage.totalObjects)) * 100).toFixed(1)}% of active questions).`
  );
  lines.push("- Legacy mappings remain fully intact; reads still fall back to legacy where no canonical mapping exists.");
  lines.push("");
  lines.push("## Rollback");
  lines.push("");
  if (context.rollback_batch_keys && Array.isArray(context.rollback_batch_keys) && context.rollback_batch_keys.length) {
    for (const key of context.rollback_batch_keys as string[]) {
      lines.push(`### Batch \`${key}\``);
      lines.push("");
      lines.push("Soft rollback (reversible, recommended):");
      lines.push("```");
      lines.push(`node --experimental-strip-types scripts/apply-legacy-retargeting.ts --rollback ${key}`);
      lines.push("```");
      lines.push("Hard delete (irreversible):");
      lines.push("```sql");
      lines.push(`delete from public.card_canonical_entity_links where rollback_batch_key = '${key}';`);
      lines.push(`delete from public.question_canonical_entity_links where rollback_batch_key = '${key}';`);
      lines.push("```");
      lines.push("");
    }
  } else {
    lines.push("_No batch applied in this run._");
  }

  const { writeFileSync } = await import("node:fs");
  const path = await import("node:path");
  const outPath = path.join(outDir, "legacy-to-canonical-retargeting-apply.md");
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  return { outPath, cardCoverage, questionCoverage };
}

async function main() {
  const { createServiceRoleClient, fetchAllRows, ensureOutDir, chunkArray } = await commonModulePromise;
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);
  const supabase = createServiceRoleClient();

  // --- Rollback path ---
  if (args.rollback) {
    const batchKey = args.rollback;
    const cardDeact = await supabase
      .from("card_canonical_entity_links")
      .update({ is_active: false })
      .eq("rollback_batch_key", batchKey)
      .eq("is_active", true)
      .select("id");
    if (cardDeact.error) throw cardDeact.error;
    const qDeact = await supabase
      .from("question_canonical_entity_links")
      .update({ is_active: false })
      .eq("rollback_batch_key", batchKey)
      .eq("is_active", true)
      .select("id");
    if (qDeact.error) throw qDeact.error;

    const propRevert = await supabase
      .from("kg_automation_proposals")
      .update({ review_status: "approved", applied_at: null })
      .eq("metadata->>rollback_batch_key", batchKey)
      .eq("review_status", "applied")
      .select("id");
    if (propRevert.error) throw propRevert.error;

    console.log(
      JSON.stringify(
        {
          mode: "rollback",
          batchKey,
          cardLinksDeactivated: (cardDeact.data ?? []).length,
          questionLinksDeactivated: (qDeact.data ?? []).length,
          proposalsReverted: (propRevert.data ?? []).length,
          hardDeleteSql: [
            `delete from public.card_canonical_entity_links where rollback_batch_key = '${batchKey}';`,
            `delete from public.question_canonical_entity_links where rollback_batch_key = '${batchKey}';`,
          ],
        },
        null,
        2
      )
    );
    await writeCoverageReport(supabase, fetchAllRows, args.outDir, {
      mode: "rollback",
      batchKey,
    });
    return;
  }

  // --- Load approved, safe retarget proposals ---
  const { data, error } = await supabase
    .from("kg_automation_proposals")
    .select("*")
    .eq("is_active", true)
    .eq("review_status", "approved")
    .in("proposal_type", ["retarget_card_to_entity", "retarget_question_to_entity"]);
  if (error) throw error;

  let proposals = (data ?? []) as ProposalRow[];
  proposals = proposals.filter((p) => p.metadata?.safe_retarget === true);
  if (args.node) {
    proposals = proposals.filter((p) => p.metadata?.source_curriculum_node_slug === args.node);
  }

  const perProposal: Array<Record<string, unknown>> = [];
  const appliedBatchKeys = new Set<string>();
  let insertedCards = 0;
  let insertedQuestions = 0;
  let dupesSkipped = 0;
  let appliedProposals = 0;

  for (const proposal of proposals) {
    const meta = proposal.metadata as Record<string, any>;
    const entityId = proposal.proposed_existing_entity_id as string;
    const objectIds: string[] = Array.isArray(meta.affected_object_ids) ? meta.affected_object_ids : [];
    const nodeId = meta.source_curriculum_node_id as string;
    const bridgeId = meta.source_curriculum_node_entity_id as string | null;
    const batchKey = (meta.rollback_batch_key as string) ?? `retarget:${meta.source_curriculum_node_slug}`;
    const isCard = proposal.proposal_type === "retarget_card_to_entity";
    const table = isCard ? "card_canonical_entity_links" : "question_canonical_entity_links";
    const objectCol = isCard ? "canonical_card_id" : "external_question_id";

    // Existing active pairs (dupe avoidance) for this entity.
    const existing = await fetchAll<Record<string, string>>((from, to) =>
      supabase
        .from(table)
        .select(`${objectCol},canonical_entity_id`)
        .eq("canonical_entity_id", entityId)
        .eq("is_active", true)
        .range(from, to)
    );
    const existingObjects = new Set(existing.map((r) => r[objectCol]));

    const toInsertIds = objectIds.filter((id) => !existingObjects.has(id));
    const dupes = objectIds.length - toInsertIds.length;
    dupesSkipped += dupes;

    perProposal.push({
      proposalId: proposal.id,
      proposalType: proposal.proposal_type,
      node: meta.source_curriculum_node_title,
      entity: meta.target_entity_label,
      matchBasis: meta.match_basis,
      affected: objectIds.length,
      wouldInsert: toInsertIds.length,
      dupesAvoided: dupes,
      batchKey,
    });

    if (!args.dryRun && toInsertIds.length > 0) {
      const rows = toInsertIds.map((objectId) => ({
        [objectCol]: objectId,
        canonical_entity_id: entityId,
        source_curriculum_node_id: nodeId,
        source_concept_id: null,
        source_curriculum_node_entity_id: bridgeId,
        retarget_path: "curriculum_node_bridge",
        match_basis: meta.match_basis ?? "curriculum_inferred",
        mapping_confidence: proposal.confidence,
        review_status: "approved",
        created_by_source: "legacy_ontology_retargeting",
        migration_proposal_id: proposal.id,
        rollback_batch_key: batchKey,
        metadata: { applied_from_proposal: proposal.id },
        is_active: true,
      }));
      for (const chunk of chunkArray(rows, 500)) {
        const { error: insErr } = await supabase.from(table).insert(chunk);
        if (insErr) throw insErr;
      }
      if (isCard) insertedCards += rows.length;
      else insertedQuestions += rows.length;
      appliedBatchKeys.add(batchKey);
    }

    if (!args.dryRun) {
      const { error: updErr } = await supabase
        .from("kg_automation_proposals")
        .update({
          review_status: "applied",
          applied_at: new Date().toISOString(),
          metadata: {
            ...meta,
            applied_by_script: "apply-legacy-retargeting",
            applied_row_count: toInsertIds.length,
          },
        })
        .eq("id", proposal.id);
      if (updErr) throw updErr;
      appliedProposals += 1;
    }
  }

  const report = await writeCoverageReport(supabase, fetchAllRows, args.outDir, {
    mode: args.dryRun ? "dry-run" : "apply",
    nodeScope: args.node ?? (args.all ? "all" : "none"),
    appliedProposals,
    insertedCards,
    insertedQuestions,
    dupesSkipped,
    rollback_batch_keys: [...appliedBatchKeys],
  });

  console.log(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "apply",
        nodeScope: args.node ?? (args.all ? "all" : "none"),
        proposalsConsidered: proposals.length,
        perProposal,
        insertedCards,
        insertedQuestions,
        dupesSkipped,
        appliedProposals,
        appliedBatchKeys: [...appliedBatchKeys],
        legacyMappingsTouched: 0,
        reportPath: report.outPath,
      },
      null,
      2
    )
  );
}

main().catch(async (error) => {
  const { serializeError } = await commonModulePromise;
  console.error(JSON.stringify(serializeError(error), null, 2));
  process.exit(1);
});
