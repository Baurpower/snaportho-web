// Generate legacy-ontology retargeting proposals (controlled migration toward
// canonical entities) and write the retargeting inventory report.
//
// Reality at authoring time (verified live): 0 concepts exist. All legacy
// mappings flow through curriculum_nodes. Retargeting therefore proceeds via the
// approved curriculum_node -> canonical_entity bridge (curriculum_node_entities).
// Concept-based fields are kept for forward-compatibility but are null today.
//
// Guardrails enforced here:
//   * Only bridges with review_status='approved' AND relation_type='primary_coverage'.
//   * Only nodes that map to EXACTLY ONE canonical entity (skip ambiguous).
//   * A proposal is marked safe_retarget only when match_basis='exact_label'.
//   * Never mutates/deletes legacy rows; only writes proposals.
//
// Flags: --dry-run (compute + write report, do not write proposals).

const commonModulePromise = import(new URL("./kg-automation-common.ts", import.meta.url).href);

type ProposalRecord = import("./kg-automation-common").ProposalRecord;

type ParsedArgs = { dryRun: boolean; outDir: string };

function parseArgs(argv: string[]): ParsedArgs {
  let outDir = "reports";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--out-dir") {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    }
  }
  return { dryRun: argv.includes("--dry-run"), outDir };
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/['".,()/]/g, " ").replace(/\s+/g, " ").trim();
}

type Bridge = {
  id: string;
  curriculum_node_id: string;
  canonical_entity_id: string | null;
  relation_type: string;
  review_status: string;
  confidence: number;
};
type Entity = { id: string; preferred_label: string; entity_type: string };
type Node = { id: string; title: string; slug: string; specialty_id: string | null };
type CardLink = { id: string; canonical_card_id: string; curriculum_node_id: string | null };
type QuestionLink = { id: string; external_question_id: string; curriculum_node_id: string | null };

async function main() {
  const { createServiceRoleClient, fetchAllRows, ensureOutDir, toConfidenceTier, defaultReviewStatus, chunkArray } =
    await commonModulePromise;
  // Typed view over the dynamically-imported (any) helper so generic calls + their
  // range callbacks type-check.
  const fetchAll = fetchAllRows as <T>(
    buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
  ) => Promise<T[]>;
  const args = parseArgs(process.argv);
  ensureOutDir(args.outDir);
  const supabase = createServiceRoleClient();

  // --- Load (paginated) ---
  const bridges = await fetchAll<Bridge>((from, to) =>
    supabase
      .from("curriculum_node_entities")
      .select("id,curriculum_node_id,canonical_entity_id,relation_type,review_status,confidence")
      .eq("is_active", true)
      .range(from, to)
  );
  const entities = await fetchAll<Entity>((from, to) =>
    supabase.from("canonical_entities").select("id,preferred_label,entity_type").eq("is_active", true).range(from, to)
  );
  const allCardLinks = await fetchAll<CardLink>((from, to) =>
    supabase
      .from("card_knowledge_links")
      .select("id,canonical_card_id,curriculum_node_id")
      .eq("is_active", true)
      .range(from, to)
  );
  const allQuestionLinks = await fetchAll<QuestionLink>((from, to) =>
    supabase
      .from("external_question_curriculum_mappings")
      .select("id,external_question_id,curriculum_node_id")
      .eq("is_active", true)
      .range(from, to)
  );
  const conceptCount = (
    await supabase.from("concepts").select("id", { count: "exact", head: true }).eq("is_active", true)
  ).count as number;

  const entityById = new Map(entities.map((e) => [e.id, e]));

  // entities per node (ambiguity detection) restricted to approved primary_coverage
  const eligibleBridges = bridges.filter(
    (b) => b.canonical_entity_id && b.review_status === "approved" && b.relation_type === "primary_coverage"
  );
  const entitiesPerNode = new Map<string, Set<string>>();
  for (const b of eligibleBridges) {
    const set = entitiesPerNode.get(b.curriculum_node_id) ?? new Set<string>();
    set.add(b.canonical_entity_id as string);
    entitiesPerNode.set(b.curriculum_node_id, set);
  }
  const bridgedNodeIds = [...entitiesPerNode.keys()];

  // Fetch node detail for bridged nodes
  const nodes: Node[] = [];
  for (const chunk of chunkArray(bridgedNodeIds, 100)) {
    if (chunk.length === 0) continue;
    const { data, error } = await supabase
      .from("curriculum_nodes")
      .select("id,title,slug,specialty_id")
      .in("id", chunk);
    if (error) throw error;
    nodes.push(...((data ?? []) as Node[]));
  }
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Legacy mapping affected rows per bridged node
  const cardLinksByNode = new Map<string, CardLink[]>();
  for (const l of allCardLinks) {
    if (l.curriculum_node_id && entitiesPerNode.has(l.curriculum_node_id)) {
      const a = cardLinksByNode.get(l.curriculum_node_id) ?? [];
      a.push(l);
      cardLinksByNode.set(l.curriculum_node_id, a);
    }
  }
  const questionLinksByNode = new Map<string, QuestionLink[]>();
  for (const l of allQuestionLinks) {
    if (l.curriculum_node_id && entitiesPerNode.has(l.curriculum_node_id)) {
      const a = questionLinksByNode.get(l.curriculum_node_id) ?? [];
      a.push(l);
      questionLinksByNode.set(l.curriculum_node_id, a);
    }
  }

  // Existing canonical links (for dupes-avoided projection)
  const existingCardLinks = await fetchAll<{ canonical_card_id: string; canonical_entity_id: string }>(
    (from, to) =>
      supabase
        .from("card_canonical_entity_links")
        .select("canonical_card_id,canonical_entity_id")
        .eq("is_active", true)
        .range(from, to)
  );
  const existingQuestionLinks = await fetchAll<{ external_question_id: string; canonical_entity_id: string }>(
    (from, to) =>
      supabase
        .from("question_canonical_entity_links")
        .select("external_question_id,canonical_entity_id")
        .eq("is_active", true)
        .range(from, to)
  );
  const existingCardPairs = new Set(existingCardLinks.map((r) => `${r.canonical_card_id}:${r.canonical_entity_id}`));
  const existingQuestionPairs = new Set(
    existingQuestionLinks.map((r) => `${r.external_question_id}:${r.canonical_entity_id}`)
  );

  // --- Build proposals ---
  const proposals: ProposalRecord[] = [];
  type NodePlan = {
    node: Node;
    entity: Entity;
    matchBasis: "exact_label" | "curriculum_inferred";
    ambiguous: boolean;
    cardIds: string[];
    questionIds: string[];
    cardLinkIds: string[];
    questionLinkIds: string[];
    cardDupesAvoided: number;
    questionDupesAvoided: number;
    safe: boolean;
  };
  const plans: NodePlan[] = [];
  const skippedAmbiguous: string[] = [];

  for (const nodeId of bridgedNodeIds) {
    const entitySet = entitiesPerNode.get(nodeId) as Set<string>;
    const node = nodeById.get(nodeId);
    if (!node) continue;

    if (entitySet.size > 1) {
      // GUARDRAIL: ambiguous node maps to multiple entities — never auto-retarget.
      skippedAmbiguous.push(node.title);
      continue;
    }
    const entityId = [...entitySet][0];
    const entity = entityById.get(entityId);
    if (!entity) continue;
    const bridge = eligibleBridges.find(
      (b) => b.curriculum_node_id === nodeId && b.canonical_entity_id === entityId
    ) as Bridge;

    const matchBasis: "exact_label" | "curriculum_inferred" =
      normalizeLabel(node.title) === normalizeLabel(entity.preferred_label) ? "exact_label" : "curriculum_inferred";
    const safe = matchBasis === "exact_label";

    const cardLinks = cardLinksByNode.get(nodeId) ?? [];
    const questionLinks = questionLinksByNode.get(nodeId) ?? [];
    const cardIds = [...new Set(cardLinks.map((l) => l.canonical_card_id))];
    const questionIds = [...new Set(questionLinks.map((l) => l.external_question_id))];
    const cardDupesAvoided = cardIds.filter((id) => existingCardPairs.has(`${id}:${entityId}`)).length;
    const questionDupesAvoided = questionIds.filter((id) => existingQuestionPairs.has(`${id}:${entityId}`)).length;

    const plan: NodePlan = {
      node,
      entity,
      matchBasis,
      ambiguous: false,
      cardIds,
      questionIds,
      cardLinkIds: cardLinks.map((l) => l.id),
      questionLinkIds: questionLinks.map((l) => l.id),
      cardDupesAvoided,
      questionDupesAvoided,
      safe,
    };
    plans.push(plan);

    const rollbackBatchKey = `retarget:${node.slug}`;
    const confidence = Math.max(0.9, Math.min(0.99, bridge.confidence || 0.95));
    const tier = toConfidenceTier(confidence);

    const baseMeta = {
      source_curriculum_node_id: node.id,
      source_curriculum_node_title: node.title,
      source_curriculum_node_slug: node.slug,
      source_concept_id: null,
      source_curriculum_node_entity_id: bridge.id,
      target_entity_id: entity.id,
      target_entity_label: entity.preferred_label,
      target_entity_type: entity.entity_type,
      retarget_path: "curriculum_node_bridge",
      match_basis: matchBasis,
      safe_retarget: safe,
      rollback_batch_key: rollbackBatchKey,
    };

    if (cardIds.length > 0) {
      proposals.push({
        proposal_fingerprint: `retarget-card:${node.id}:${entity.id}`,
        proposal_type: "retarget_card_to_entity",
        source_signal_type: "curriculum_node",
        source_signal_ids: [node.id],
        specialty_id: node.specialty_id,
        proposed_entity_type: entity.entity_type,
        proposed_entity_label: entity.preferred_label,
        proposed_existing_entity_id: entity.id,
        proposed_subject_entity_id: null,
        proposed_predicate: null,
        proposed_object_entity_id: null,
        proposed_alias: null,
        proposed_bridge_type: null,
        confidence,
        confidence_tier: tier,
        confidence_reason: `${matchBasis === "exact_label" ? "Exact label match" : "Curriculum-inferred"} via approved primary_coverage bridge ${node.title} -> ${entity.preferred_label}.`,
        evidence_summary: `${cardIds.length} card(s) under curriculum node ${node.title} retarget to canonical entity ${entity.preferred_label}. ${cardDupesAvoided} already mapped (dupes avoided).`,
        supporting_card_count: cardIds.length,
        supporting_question_count: 0,
        supporting_curriculum_node_count: 1,
        supporting_source_count: 1,
        conflict_count: 0,
        review_status: defaultReviewStatus(tier),
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
        applied_at: null,
        superseded_by: null,
        metadata: {
          ...baseMeta,
          object_kind: "card",
          affected_object_ids: cardIds,
          affected_legacy_link_ids: cardLinks.map((l) => l.id),
          dupes_avoided: cardDupesAvoided,
          review_packet_key: `retarget-card:${node.slug}`,
          review_packet_label: `Retarget cards: ${node.title} -> ${entity.preferred_label}`,
        },
        comments: null,
        is_active: true,
      });
    }

    if (questionIds.length > 0) {
      proposals.push({
        proposal_fingerprint: `retarget-question:${node.id}:${entity.id}`,
        proposal_type: "retarget_question_to_entity",
        source_signal_type: "curriculum_node",
        source_signal_ids: [node.id],
        specialty_id: node.specialty_id,
        proposed_entity_type: entity.entity_type,
        proposed_entity_label: entity.preferred_label,
        proposed_existing_entity_id: entity.id,
        proposed_subject_entity_id: null,
        proposed_predicate: null,
        proposed_object_entity_id: null,
        proposed_alias: null,
        proposed_bridge_type: null,
        confidence,
        confidence_tier: tier,
        confidence_reason: `${matchBasis === "exact_label" ? "Exact label match" : "Curriculum-inferred"} via approved primary_coverage bridge ${node.title} -> ${entity.preferred_label}.`,
        evidence_summary: `${questionIds.length} question(s) under curriculum node ${node.title} retarget to canonical entity ${entity.preferred_label}. ${questionDupesAvoided} already mapped (dupes avoided).`,
        supporting_card_count: 0,
        supporting_question_count: questionIds.length,
        supporting_curriculum_node_count: 1,
        supporting_source_count: 1,
        conflict_count: 0,
        review_status: defaultReviewStatus(tier),
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
        applied_at: null,
        superseded_by: null,
        metadata: {
          ...baseMeta,
          object_kind: "question",
          affected_object_ids: questionIds,
          affected_legacy_link_ids: questionLinks.map((l) => l.id),
          dupes_avoided: questionDupesAvoided,
          review_packet_key: `retarget-question:${node.slug}`,
          review_packet_label: `Retarget questions: ${node.title} -> ${entity.preferred_label}`,
        },
        comments: null,
        is_active: true,
      });
    }
  }

  // --- Persist proposals (idempotent by fingerprint; preserve reviewed/applied) ---
  let inserted = 0;
  let updated = 0;
  if (!args.dryRun && proposals.length > 0) {
    const fingerprints = proposals.map((p) => p.proposal_fingerprint);
    const existing: Array<{ id: string; proposal_fingerprint: string; review_status: string }> = [];
    for (const chunk of chunkArray(fingerprints, 100)) {
      const { data, error } = await supabase
        .from("kg_automation_proposals")
        .select("id,proposal_fingerprint,review_status")
        .in("proposal_fingerprint", chunk)
        .eq("is_active", true);
      if (error) throw error;
      existing.push(...((data ?? []) as typeof existing));
    }
    const existingByFp = new Map(existing.map((r) => [r.proposal_fingerprint, r]));
    const terminal = new Set(["approved", "rejected", "applied", "superseded"]);

    const toInsert: ProposalRecord[] = [];
    for (const proposal of proposals) {
      const prior = existingByFp.get(proposal.proposal_fingerprint);
      if (!prior) {
        toInsert.push(proposal);
        continue;
      }
      // Preserve reviewed/terminal state; refresh payload + metadata only.
      const payload: Partial<ProposalRecord> = { ...proposal };
      if (terminal.has(prior.review_status)) {
        delete payload.review_status;
      }
      const { error } = await supabase.from("kg_automation_proposals").update(payload).eq("id", prior.id);
      if (error) throw error;
      updated += 1;
    }
    for (const chunk of chunkArray(toInsert, 100)) {
      if (chunk.length === 0) continue;
      const { error } = await supabase.from("kg_automation_proposals").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }
  }

  // --- Distinct legacy coverage (full universe) for the inventory ---
  const distinctLegacyCards = new Set(
    allCardLinks.filter((l) => l.curriculum_node_id).map((l) => l.canonical_card_id)
  ).size;
  const distinctLegacyQuestions = new Set(
    allQuestionLinks.filter((l) => l.curriculum_node_id).map((l) => l.external_question_id)
  ).size;

  const safePlans = plans.filter((p) => p.safe);
  const blockedPlans = plans.filter((p) => !p.safe);
  const safeCards = safePlans.reduce((s, p) => s + p.cardIds.length, 0);
  const safeQuestions = safePlans.reduce((s, p) => s + p.questionIds.length, 0);

  // --- Write inventory report ---
  const lines: string[] = [];
  lines.push("# Legacy → Canonical Retargeting Inventory");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}${args.dryRun ? " (dry-run — no proposals written)" : ""}`);
  lines.push("");
  lines.push("## Key reality check");
  lines.push("");
  lines.push(
    `- **Legacy concept rows in DB: ${conceptCount}.** The legacy concept layer is empty. There are no concept-based mappings to retarget. Retargeting proceeds via the approved \`curriculum_node → canonical_entity\` bridge (\`curriculum_node_entities\`).`
  );
  lines.push("");
  lines.push("## Legacy mapping totals (full universe)");
  lines.push("");
  lines.push(`- Active card_knowledge_links: ${allCardLinks.length}`);
  lines.push(`- Active external_question_curriculum_mappings: ${allQuestionLinks.length}`);
  lines.push(`- Distinct legacy-mapped cards (via curriculum node): ${distinctLegacyCards}`);
  lines.push(`- Distinct legacy-mapped questions (via curriculum node): ${distinctLegacyQuestions}`);
  lines.push("");
  lines.push("## Concept → canonical entity matching");
  lines.push("");
  lines.push("- Concepts with exact canonical-entity matches: 0 (no concepts exist)");
  lines.push("- Concepts with inferred matches via curriculum-node bridges: 0 (no concepts exist)");
  lines.push("- Concepts requiring manual review: 0 (no concepts exist)");
  lines.push("");
  lines.push("## Curriculum-node bridge retargeting (the live path)");
  lines.push("");
  lines.push(`- Approved primary_coverage bridges (node → entity): ${eligibleBridges.length}`);
  lines.push(`- Distinct bridged curriculum nodes: ${bridgedNodeIds.length}`);
  lines.push(`- Ambiguous bridged nodes skipped (map to >1 entity): ${skippedAmbiguous.length}${skippedAmbiguous.length ? ` — ${skippedAmbiguous.join(", ")}` : ""}`);
  lines.push("");
  lines.push("### Safe to retarget now (exact-label, unambiguous, approved)");
  lines.push("");
  lines.push(`- Cards safely retargetable now: ${safeCards}`);
  lines.push(`- Questions safely retargetable now: ${safeQuestions}`);
  lines.push("");
  lines.push("| Curriculum node | Canonical entity | Match | Cards | Questions | Card dupes avoided | Q dupes avoided |");
  lines.push("|---|---|---|---:|---:|---:|---:|");
  for (const p of plans.sort((a, b) => b.cardIds.length + b.questionIds.length - (a.cardIds.length + a.questionIds.length))) {
    lines.push(
      `| ${p.node.title} | ${p.entity.preferred_label} | ${p.matchBasis}${p.safe ? "" : " (blocked)"} | ${p.cardIds.length} | ${p.questionIds.length} | ${p.cardDupesAvoided} | ${p.questionDupesAvoided} |`
    );
  }
  lines.push("");
  lines.push("### Blocked from auto-retarget");
  lines.push("");
  lines.push(`- Plans blocked (non-exact match basis): ${blockedPlans.length}`);
  lines.push(`- Cards/questions blocked by ambiguous nodes: covered by the ${skippedAmbiguous.length} ambiguous node(s) above`);
  lines.push("");
  lines.push("## Projected coverage after safe retargeting");
  lines.push("");
  lines.push(
    `- Canonical-mapped cards would go from ${existingCardLinks.length} to ~${existingCardLinks.length + safeCards - safePlans.reduce((s, p) => s + p.cardDupesAvoided, 0)} (distinct card-entity links).`
  );
  lines.push(
    `- Canonical-mapped questions would go from ${existingQuestionLinks.length} to ~${existingQuestionLinks.length + safeQuestions - safePlans.reduce((s, p) => s + p.questionDupesAvoided, 0)} (distinct question-entity links).`
  );
  lines.push("- Legacy mappings remain fully intact (additive retargeting).");
  lines.push("");
  lines.push("## Proposals");
  lines.push("");
  lines.push(`- Retarget proposals built: ${proposals.length} (${proposals.filter((p) => p.proposal_type === "retarget_card_to_entity").length} card, ${proposals.filter((p) => p.proposal_type === "retarget_question_to_entity").length} question)`);
  lines.push(`- Written to DB: ${args.dryRun ? "no (dry-run)" : `yes — ${inserted} inserted, ${updated} updated`}`);

  const { writeFileSync } = await import("node:fs");
  const path = await import("node:path");
  const outPath = path.join(args.outDir, "legacy-to-canonical-retargeting-inventory.md");
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        conceptCount,
        eligibleBridges: eligibleBridges.length,
        bridgedNodes: bridgedNodeIds.length,
        skippedAmbiguous: skippedAmbiguous.length,
        proposalsBuilt: proposals.length,
        inserted,
        updated,
        safeCards,
        safeQuestions,
        outputPath: outPath,
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
