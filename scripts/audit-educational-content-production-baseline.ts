/**
 * Read-only production baseline for the Educational Content Layer vertical slice.
 *
 * Safety:
 * - opens a single PostgreSQL transaction;
 * - executes SET TRANSACTION READ ONLY before application queries;
 * - verifies transaction_read_only = on;
 * - never executes DDL or DML;
 * - rolls the transaction back after reads;
 * - writes reports only to the local filesystem.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const DEFAULT_OUT = "reports/educational-content-layer/production-baseline-2026-07-19";
const APPROVED = new Set(["approved"]);

function loadEnv(filePath: string) {
  const values: Record<string, string> = {};
  if (!existsSync(filePath)) return values;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function parseArgs() {
  const outArg = process.argv.find((value) => value.startsWith("--out="));
  return { outDir: path.resolve(outArg?.slice("--out=".length) || DEFAULT_OUT) };
}

function csvCell(value: unknown) {
  const text = value == null ? "" : Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return writeFileSync(filePath, "", "utf8");
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  writeFileSync(
    filePath,
    [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n") + "\n",
    "utf8"
  );
}

function pct(part: number, whole: number) {
  return whole ? Number(((part / whole) * 100).toFixed(1)) : 0;
}

function distribution<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function group<T>(rows: T[], key: (row: T) => string) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const bucket = result.get(value) ?? [];
    bucket.push(row);
    result.set(value, bucket);
  }
  return result;
}

function unique<T>(values: Iterable<T>) {
  return [...new Set(values)];
}

type Card = {
  canonical_card_id: string; canonical_status: string; title: string | null;
  anki_card_id: string; source_card_key: string; native_card_id: string | null; card_ord: number;
  note_id: string; source_note_key: string; native_note_id: string | null; note_guid: string | null;
  deck_id: string | null; deck_name: string | null; deck_full_name: string | null; deck_path: string[] | null;
};
type Link = {
  resource_id: string; entity_id: string; mapping_confidence: number; review_status: string;
  retarget_path: string; match_basis: string; created_by_source: string; source_curriculum_node_id: string | null;
  entity_type: string; entity_label: string; entity_slug: string | null;
};
type Question = {
  question_id: string; external_question_id: string; specialty: string | null; topic: string | null;
  topic_slug: string | null;
};
type Membership = {
  release_id: string; neighborhood_slug: string; coverage_status: string; review_tier: string;
  entity_id: string; risk_tier: string; publication_status: string; provenance_status: string;
};

async function main() {
  const { outDir } = parseArgs();
  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required");
  mkdirSync(outDir, { recursive: true });

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, application_name: "educational_content_readonly_audit" });
  await client.connect();
  const q = async <T>(text: string, values: unknown[] = []) => (await client.query<T>(text, values)).rows;
  let rolledBack = false;
  try {
    await client.query("begin");
    await client.query("set transaction read only");
    await client.query("set local statement_timeout = '120s'");
    const readOnly = (await q<{ transaction_read_only: string }>("show transaction_read_only"))[0]?.transaction_read_only;
    if (readOnly !== "on") throw new Error(`Read-only guard failed: transaction_read_only=${readOnly}`);

    const tableRows = await q<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema='public' and (table_name = any($1::text[]) or table_name like 'brobot_anki_%') order by table_name
    `, [[
      "anki_notes", "anki_cards", "canonical_cards", "canonical_card_versions", "card_knowledge_links",
      "card_canonical_entity_links", "anki_kg_mapping_candidates", "external_questions",
      "external_question_curriculum_mappings", "question_canonical_entity_links", "canonical_entities",
      "kg_production_releases", "kg_production_neighborhoods", "kg_production_objects",
      "kg_production_neighborhood_objects", "brobot_anki_prep_requests", "brobot_anki_study_sessions",
      "brobot_anki_session_matches", "brobot_anki_addon_devices"
    ]]);
    const presentTables = new Set(tableRows.map((row) => row.table_name));
    const required = ["anki_notes", "anki_cards", "canonical_cards", "canonical_card_versions", "card_knowledge_links", "card_canonical_entity_links", "external_questions", "external_question_curriculum_mappings", "question_canonical_entity_links", "canonical_entities", "kg_production_releases", "kg_production_neighborhoods", "kg_production_objects", "kg_production_neighborhood_objects"];
    const missingRequired = required.filter((name) => !presentTables.has(name));
    if (missingRequired.length) throw new Error(`Required production tables missing: ${missingRequired.join(", ")}`);
    const brobotAnkiSchema = await q<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(`
      select table_name,column_name,data_type,is_nullable from information_schema.columns
      where table_schema='public' and table_name like 'brobot_anki_%'
      order by table_name,ordinal_position
    `);
    const brobotAnkiPolicies = await q<{ tablename: string; policyname: string; cmd: string; roles: string[]; qual: string | null; with_check: string | null }>(`
      select tablename,policyname,cmd,roles,qual,with_check from pg_policies
      where schemaname='public' and tablename like 'brobot_anki_%' order by tablename,policyname
    `);
    const brobotAnkiRls = await q<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }>(`
      select c.relname table_name,c.relrowsecurity rls_enabled,c.relforcerowsecurity rls_forced
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and c.relname like 'brobot_anki_%'
      order by c.relname
    `);
    const brobotAnkiCounts: Record<string, number> = {};
    for (const tableName of [...presentTables].filter((name) => name.startsWith("brobot_anki_")).sort()) {
      if (!/^[a-z0-9_]+$/.test(tableName)) continue;
      brobotAnkiCounts[tableName] = (await q<{ count: number }>(`select count(*)::int count from public.${tableName}`))[0].count;
    }

    const release = (await q<{ release_id: string; publication_status: string; status: string; review_tier: string; activated_at: string }>(`
      select release_id,publication_status,status,review_tier,activated_at
      from public.kg_production_releases
      where publication_status in ('beta_active','reviewed_active') and status in ('active','partially_active')
      order by activated_at desc nulls last limit 1
    `))[0];
    if (!release) throw new Error("No active production KG release found");

    const counts = Object.fromEntries((await Promise.all([
      ["totalImportedAnkiNotes", "select count(*)::int count from public.anki_notes"],
      ["activeAnkiNotes", "select count(*)::int count from public.anki_notes where is_active"],
      ["totalImportedAnkiCards", "select count(*)::int count from public.anki_cards"],
      ["activeImportedAnkiCards", "select count(*)::int count from public.anki_cards where is_active"],
      ["totalCanonicalCards", "select count(*)::int count from public.canonical_cards"],
      ["activeCanonicalCards", "select count(*)::int count from public.canonical_cards where is_active"],
      ["totalCanonicalCardVersions", "select count(*)::int count from public.canonical_card_versions"],
      ["activeCanonicalCardVersions", "select count(*)::int count from public.canonical_card_versions where is_active"],
      ["canonicalCardsWithActiveCurrentVersion", "select count(*)::int count from public.canonical_cards c join public.canonical_card_versions v on v.id=c.current_version_id and v.is_active where c.is_active"],
    ].map(async ([name, sql]) => [name, (await q<{ count: number }>(sql))[0].count]))));

    const cards = await q<Card>(`
      select c.id canonical_card_id,c.canonical_status,c.title,c.anki_card_id,
        ac.source_card_key,ac.anki_card_id native_card_id,ac.card_ord,
        n.id note_id,n.source_note_key,n.anki_note_id native_note_id,n.anki_note_guid note_guid,
        d.id deck_id,d.deck_name,d.full_name deck_full_name,d.deck_path
      from public.canonical_cards c
      join public.anki_cards ac on ac.id=c.anki_card_id and ac.is_active
      join public.anki_notes n on n.id=c.anki_note_id and n.is_active
      left join public.anki_decks d on d.id=ac.deck_id
      where c.is_active
    `);
    const cardLinks = await q<Link>(`
      select l.canonical_card_id resource_id,l.canonical_entity_id entity_id,l.mapping_confidence::float8,
        l.review_status,l.retarget_path,l.match_basis,l.created_by_source,l.source_curriculum_node_id,
        e.entity_type,e.preferred_label entity_label,e.slug entity_slug
      from public.card_canonical_entity_links l join public.canonical_entities e on e.id=l.canonical_entity_id
      where l.is_active and e.is_active
    `);
    const legacyCardLinks = await q<{ canonical_card_id: string }>(`
      select distinct canonical_card_id from public.card_knowledge_links where is_active
    `);
    const cardCandidateStatuses = presentTables.has("anki_kg_mapping_candidates")
      ? await q<{ canonical_card_id: string; review_status: string; count: number }>(`
          select canonical_card_id,review_status,count(*)::int count
          from public.anki_kg_mapping_candidates where is_active group by canonical_card_id,review_status
        `)
      : [];

    const orthobulletsSource = (await q<{ id: string }>("select id from public.external_sources where slug='orthobullets' and is_active limit 1"))[0];
    if (!orthobulletsSource) throw new Error("Active Orthobullets external source not found");
    const totalOrthobulletsQuestions = (await q<{ count: number }>(
      "select count(*)::int count from public.external_questions where source_id=$1",
      [orthobulletsSource.id]
    ))[0].count;
    const questions = await q<Question>(`
      select id question_id,external_question_id,specialty_normalized specialty,
        topic_normalized topic,topic_slug
      from public.external_questions where source_id=$1 and is_active
    `, [orthobulletsSource.id]);
    const curriculumMappings = await q<{ question_id: string; mapping_confidence: number; needs_review: boolean; mapping_method: string }>(`
      select external_question_id question_id,mapping_confidence::float8,needs_review,mapping_method
      from public.external_question_curriculum_mappings where is_active
        and external_question_id = any($1::uuid[])
    `, [questions.map((row) => row.question_id)]);
    const questionLinks = await q<Link>(`
      select l.external_question_id resource_id,l.canonical_entity_id entity_id,l.mapping_confidence::float8,
        l.review_status,l.retarget_path,l.match_basis,l.created_by_source,l.source_curriculum_node_id,
        e.entity_type,e.preferred_label entity_label,e.slug entity_slug
      from public.question_canonical_entity_links l join public.canonical_entities e on e.id=l.canonical_entity_id
      where l.is_active and e.is_active and l.external_question_id = any($1::uuid[])
    `, [questions.map((row) => row.question_id)]);

    const memberships = await q<Membership>(`
      select n.release_id,n.neighborhood_slug,n.coverage_status,n.review_tier,
        o.target_id entity_id,o.risk_tier,o.publication_status,o.provenance_status
      from public.kg_production_neighborhoods n
      join public.kg_production_neighborhood_objects no using(release_id,neighborhood_slug)
      join public.kg_production_objects o using(release_id,target_table,target_id)
      where n.release_id=$1 and n.publication_status in ('beta_active','reviewed_active')
        and n.lifecycle_state in ('production_beta_active','production_active')
        and o.target_table='canonical_entities'
        and o.publication_status in ('beta_active','reviewed_active') and o.risk_tier <> 'high'
    `, [release.release_id]);
    const productionEntityMetadata = await q<{ id: string; entity_type: string; preferred_label: string }>(`
      select id,entity_type,preferred_label from public.canonical_entities
      where id = any($1::uuid[])
    `, [unique(memberships.map((row) => row.entity_id))]);
    const productionEntityById = new Map(productionEntityMetadata.map((row) => [row.id, row]));
    const nodeSpecialties = await q<{ node_id: string; specialty: string }>(`
      select n.id node_id,coalesce(s.slug,'unknown') specialty from public.curriculum_nodes n
      left join public.specialties s on s.id=n.specialty_id
    `);
    const specialtyByNode = new Map(nodeSpecialties.map((row) => [row.node_id, row.specialty]));

    const productionEntities = new Set(memberships.map((row) => row.entity_id));
    const eligibleCardLinks = cardLinks.filter((row) => APPROVED.has(row.review_status) && productionEntities.has(row.entity_id));
    const eligibleQuestionLinks = questionLinks.filter((row) => APPROVED.has(row.review_status) && productionEntities.has(row.entity_id));
    const cardLinksByCard = group(eligibleCardLinks, (row) => row.resource_id);
    const questionLinksByQuestion = group(eligibleQuestionLinks, (row) => row.resource_id);
    const cardsByEntity = group(eligibleCardLinks, (row) => row.entity_id);
    const questionsByEntity = group(eligibleQuestionLinks, (row) => row.entity_id);
    const membershipByEntity = group(memberships, (row) => row.entity_id);
    const cardById = new Map(cards.map((row) => [row.canonical_card_id, row]));
    const questionById = new Map(questions.map((row) => [row.question_id, row]));

    const mappedCards = new Set(cardLinks.map((row) => row.resource_id));
    const eligibleCards = new Set(eligibleCardLinks.map((row) => row.resource_id));
    const legacyCards = new Set(legacyCardLinks.map((row) => row.canonical_card_id));
    const directAnalysisCardLinks = cardLinks.filter((row) => row.retarget_path === "direct_exact" || row.created_by_source === "manual" || row.created_by_source === "reviewed");
    const mappedQuestions = new Set(questionLinks.map((row) => row.resource_id));
    const eligibleQuestions = new Set(eligibleQuestionLinks.map((row) => row.resource_id));
    const curriculumQuestionIds = new Set(curriculumMappings.map((row) => row.question_id));
    const directAnalysisQuestionLinks = questionLinks.filter((row) => row.retarget_path === "direct_exact" || row.created_by_source === "manual" || row.created_by_source === "reviewed");
    const guidOrdinalCounts = distribution(
      cards.filter((row) => row.note_guid != null),
      (row) => `${row.note_guid}:${row.card_ord}`
    );

    const cardInventory = {
      ...counts,
      cardsWithNativeCardId: cards.filter((row) => row.native_card_id != null).length,
      cardsWithNoteGuid: cards.filter((row) => row.note_guid != null).length,
      noteGuidCoveragePct: pct(cards.filter((row) => row.note_guid != null).length, cards.length),
      uniqueNoteGuidOrdinalIdentities: Object.keys(guidOrdinalCounts).length,
      duplicateNoteGuidOrdinalIdentities: Object.values(guidOrdinalCounts).filter((count) => count > 1).length,
      canonicalCardsWithAnyDirectTableRow: mappedCards.size,
      canonicalCardsWithProductionEligibleLink: eligibleCards.size,
      uniqueProductionEligibleEntities: new Set(eligibleCardLinks.map((row) => row.entity_id)).size,
      legacyCurriculumMappedButNoDirectEntityRow: [...legacyCards].filter((id) => !mappedCards.has(id)).length,
      multipleActiveEntityLinks: [...group(cardLinks, (row) => row.resource_id).values()].filter((rows) => rows.length > 1).length,
      noEntityMapping: cards.filter((row) => !mappedCards.has(row.canonical_card_id)).length,
      directAnalysisLinkRows: directAnalysisCardLinks.length,
      curriculumRetargetedLinkRows: cardLinks.filter((row) => row.retarget_path === "curriculum_node_bridge").length,
      linkReviewStatus: distribution(cardLinks, (row) => row.review_status),
      candidateReviewStatus: distribution(cardCandidateStatuses.flatMap((row) => Array(row.count).fill(row)), (row) => row.review_status),
    };
    const questionInventory = {
      totalOrthobulletsQuestions,
      activeOrthobulletsQuestions: questions.length,
      questionsWithCurriculumMappings: curriculumQuestionIds.size,
      questionsWithAnyDirectTableRow: mappedQuestions.size,
      questionsWithProductionEligibleLink: eligibleQuestions.size,
      uniqueProductionEligibleEntities: new Set(eligibleQuestionLinks.map((row) => row.entity_id)).size,
      multipleActiveEntityLinks: [...group(questionLinks, (row) => row.resource_id).values()].filter((rows) => rows.length > 1).length,
      noDirectCanonicalEntityMapping: questions.filter((row) => !mappedQuestions.has(row.question_id)).length,
      directAnalysisLinkRows: directAnalysisQuestionLinks.length,
      curriculumRetargetedLinkRows: questionLinks.filter((row) => row.retarget_path === "curriculum_node_bridge").length,
      linkReviewStatus: distribution(questionLinks, (row) => row.review_status),
      retargetPath: distribution(questionLinks, (row) => row.retarget_path),
    };

    const coverageRows: Array<Record<string, unknown>> = [];
    for (const neighborhood of unique(memberships.map((row) => row.neighborhood_slug)).sort()) {
      const neighborhoodMemberships = memberships.filter((row) => row.neighborhood_slug === neighborhood);
      const entityIds = new Set(neighborhoodMemberships.map((row) => row.entity_id));
      const neighborhoodCardLinks = eligibleCardLinks.filter((row) => entityIds.has(row.entity_id));
      const neighborhoodQuestionLinks = eligibleQuestionLinks.filter((row) => entityIds.has(row.entity_id));
      const questionIds = unique(neighborhoodQuestionLinks.map((row) => row.resource_id));
      const cardIds = unique(neighborhoodCardLinks.map((row) => row.resource_id));
      let withOne = 0;
      let withThree = 0;
      let candidateTotal = 0;
      for (const questionId of questionIds) {
        const qEntities = new Set((questionLinksByQuestion.get(questionId) ?? []).map((row) => row.entity_id).filter((id) => entityIds.has(id)));
        const sharedCards = new Set<string>();
        for (const entityId of qEntities) for (const link of cardsByEntity.get(entityId) ?? []) sharedCards.add(link.resource_id);
        candidateTotal += sharedCards.size;
        if (sharedCards.size >= 1) withOne += 1;
        if (sharedCards.size >= 3) withThree += 1;
      }
      const linkConfidences = [...neighborhoodCardLinks, ...neighborhoodQuestionLinks].map((row) => row.mapping_confidence);
      const migratedRows = [...neighborhoodCardLinks, ...neighborhoodQuestionLinks].filter((row) => row.retarget_path === "curriculum_node_bridge").length;
      const totalRows = neighborhoodCardLinks.length + neighborhoodQuestionLinks.length;
      const structuralScore = Math.round(
        Math.min(30, questionIds.length) +
        Math.min(20, cardIds.length / 2) +
        pct(withThree, questionIds.length) * 0.35 +
        (linkConfidences.length ? (linkConfidences.reduce((a, b) => a + b, 0) / linkConfidences.length) * 15 : 0) -
        (totalRows ? (migratedRows / totalRows) * 20 : 20)
      );
      coverageRows.push({
        releaseId: release.release_id,
        neighborhood,
        coverageStatus: neighborhoodMemberships[0]?.coverage_status,
        reviewTier: neighborhoodMemberships[0]?.review_tier,
        productionEntityCount: entityIds.size,
        linkedQuestionCount: questionIds.length,
        linkedCardCount: cardIds.length,
        questionsWithAtLeastOneSharedCard: withOne,
        questionsWithAtLeastThreeSharedCards: withThree,
        directLinkCoveragePct: pct(withOne, questionIds.length),
        threeCardCoveragePct: pct(withThree, questionIds.length),
        averageCandidateCardsPerQuestion: questionIds.length ? Number((candidateTotal / questionIds.length).toFixed(2)) : 0,
        minimumLinkConfidence: linkConfidences.length ? Number(Math.min(...linkConfidences).toFixed(3)) : 0,
        averageLinkConfidence: linkConfidences.length ? Number((linkConfidences.reduce((a, b) => a + b, 0) / linkConfidences.length).toFixed(3)) : 0,
        linkReviewStatusDistribution: JSON.stringify(distribution([...neighborhoodCardLinks, ...neighborhoodQuestionLinks], (row) => row.review_status)),
        curriculumRetargetedLinkPct: pct(migratedRows, totalRows),
        structuralCandidateScore: structuralScore,
      });
    }
    coverageRows.sort((a, b) =>
      Number(b.structuralCandidateScore) - Number(a.structuralCandidateScore) ||
      Number(b.questionsWithAtLeastThreeSharedCards) - Number(a.questionsWithAtLeastThreeSharedCards) ||
      Number(b.coverageStatus === "full") - Number(a.coverageStatus === "full") ||
      String(a.neighborhood).localeCompare(String(b.neighborhood))
    );

    const entityCoverageRows = unique(memberships.map((row) => row.entity_id)).sort().map((entityId) => {
      const qLinks = eligibleQuestionLinks.filter((row) => row.entity_id === entityId);
      const cLinks = eligibleCardLinks.filter((row) => row.entity_id === entityId);
      const questionIds = unique(qLinks.map((row) => row.resource_id));
      const cardIds = unique(cLinks.map((row) => row.resource_id));
      const allLinks = [...qLinks, ...cLinks];
      const meta = productionEntityById.get(entityId);
      return {
        releaseId: release.release_id,
        entityId,
        entityLabel: meta?.preferred_label ?? "unknown",
        entityType: meta?.entity_type ?? "unknown",
        neighborhoods: unique((membershipByEntity.get(entityId) ?? []).map((row) => row.neighborhood_slug)).sort(),
        linkedQuestionCount: questionIds.length,
        linkedCardCount: cardIds.length,
        questionsWithAtLeastOneSharedCard: cardIds.length >= 1 ? questionIds.length : 0,
        questionsWithAtLeastThreeSharedCards: cardIds.length >= 3 ? questionIds.length : 0,
        uniqueCardsAvailable: cardIds.length,
        directLinkCoveragePct: cardIds.length >= 1 ? pct(questionIds.length, questionIds.length) : 0,
        minimumLinkConfidence: allLinks.length ? Number(Math.min(...allLinks.map((row) => row.mapping_confidence)).toFixed(3)) : 0,
        averageLinkConfidence: allLinks.length ? Number((allLinks.reduce((sum, row) => sum + row.mapping_confidence, 0) / allLinks.length).toFixed(3)) : 0,
        linkReviewStatusDistribution: JSON.stringify(distribution(allLinks, (row) => row.review_status)),
        curriculumRetargetedLinkPct: pct(allLinks.filter((row) => row.retarget_path === "curriculum_node_bridge").length, allLinks.length),
      };
    }).sort((a, b) => b.questionsWithAtLeastThreeSharedCards - a.questionsWithAtLeastThreeSharedCards || b.linkedQuestionCount - a.linkedQuestionCount || b.linkedCardCount - a.linkedCardCount);

    function rankedCandidates(questionId: string, allowedEntities?: Set<string>) {
      const qLinks = (questionLinksByQuestion.get(questionId) ?? []).filter((link) => !allowedEntities || allowedEntities.has(link.entity_id));
      const qByEntity = new Map(qLinks.map((link) => [link.entity_id, link]));
      const candidateIds = unique(qLinks.flatMap((link) => (cardsByEntity.get(link.entity_id) ?? []).map((cardLink) => cardLink.resource_id)));
      const candidates = candidateIds.map((cardId) => {
        const card = cardById.get(cardId)!;
        const cLinks = cardLinksByCard.get(cardId) ?? [];
        const shared = cLinks.filter((link) => qByEntity.has(link.entity_id));
        const confidence = shared.reduce((sum, link) => sum + Math.min(link.mapping_confidence, qByEntity.get(link.entity_id)!.mapping_confidence), 0) / Math.max(1, shared.length);
        const directRows = shared.filter((link) => link.retarget_path === "direct_exact").length + [...qByEntity.values()].filter((link) => shared.some((s) => s.entity_id === link.entity_id) && link.retarget_path === "direct_exact").length;
        return { card, shared, confidence, directRows, score: shared.length * 100 + confidence * 10 + directRows * 5 };
      }).sort((a, b) => b.score - a.score || a.card.canonical_card_id.localeCompare(b.card.canonical_card_id));
      const seenNotes = new Set<string>();
      const deduped = [] as typeof candidates;
      for (const candidate of candidates) {
        const noteIdentity = candidate.card.note_guid || candidate.card.note_id;
        if (seenNotes.has(noteIdentity)) continue;
        seenNotes.add(noteIdentity);
        deduped.push(candidate);
      }
      return { raw: candidates, deduped };
    }

    const topNeighborhoods = coverageRows.filter((row) => Number(row.linkedQuestionCount) > 0 && Number(row.linkedCardCount) > 0).slice(0, 5);
    const sampleTargets = topNeighborhoods.map((row) => ({ neighborhood: String(row.neighborhood), count: 100 }));
    const reviewerRows: Array<Record<string, unknown>> = [];
    const sampledQuestionIds = new Set<string>();
    for (const target of sampleTargets) {
      const entityIds = new Set(memberships.filter((row) => row.neighborhood_slug === target.neighborhood).map((row) => row.entity_id));
      const candidateQuestionIds = unique(eligibleQuestionLinks.filter((row) => entityIds.has(row.entity_id)).map((row) => row.resource_id)).sort();
      for (const questionId of candidateQuestionIds.slice(0, target.count)) {
        if (sampledQuestionIds.has(questionId)) continue;
        sampledQuestionIds.add(questionId);
        const question = questionById.get(questionId)!;
        const qLinks = (questionLinksByQuestion.get(questionId) ?? []).filter((row) => entityIds.has(row.entity_id));
        const ranked = rankedCandidates(questionId, entityIds);
        const selected = ranked.deduped.slice(0, 3);
        const siblingDuplicatesRemoved = ranked.raw.slice(0, 10).length - new Set(ranked.raw.slice(0, 10).map((row) => row.card.note_guid || row.card.note_id)).size;
        for (let index = 0; index < Math.max(3, selected.length); index += 1) {
          const candidate = selected[index];
          reviewerRows.push({
            neighborhood: target.neighborhood,
            sourceQuestionId: question.external_question_id,
            specialty: question.specialty,
            topic: question.topic,
            topicSlug: question.topic_slug,
            questionEntityIds: qLinks.map((row) => row.entity_id),
            questionEntityLabels: qLinks.map((row) => row.entity_label),
            questionMappingConfidence: qLinks.length ? Math.min(...qLinks.map((row) => row.mapping_confidence)) : null,
            questionMappingProvenance: unique(qLinks.map((row) => row.retarget_path)),
            rank: index + 1,
            canonicalCardId: candidate?.card.canonical_card_id ?? null,
            safeCardTitle: candidate?.card.title?.slice(0, 240) ?? null,
            deck: candidate?.card.deck_full_name ?? null,
            noteGuid: candidate?.card.note_guid ?? null,
            cardOrdinal: candidate?.card.card_ord ?? null,
            sourceCardId: candidate?.card.native_card_id ?? null,
            sharedEntityIds: candidate?.shared.map((row) => row.entity_id) ?? [],
            sharedEntityLabels: candidate?.shared.map((row) => row.entity_label) ?? [],
            cardMappingConfidence: candidate ? Number(candidate.confidence.toFixed(3)) : null,
            cardMappingProvenance: candidate ? unique(candidate.shared.map((row) => row.retarget_path)) : [],
            rankingReason: candidate ? `exact_entity_overlap:${candidate.shared.length};confidence:${candidate.confidence.toFixed(3)};direct_exact_rows:${candidate.directRows}` : "fewer_than_three_cards",
            siblingDuplicatesRemoved,
            reviewerLabel: "",
            reviewerNotes: "",
            missingObviousCard: "",
          });
        }
      }
    }

    const sampledQuestions = unique(reviewerRows.map((row) => String(row.sourceQuestionId)));
    const perQuestion = group(reviewerRows, (row) => String(row.sourceQuestionId));
    let noResult = 0, fewerThanThree = 0, rawDuplicateQuestions = 0, launchResolvable = 0;
    for (const rows of perQuestion.values()) {
      const real = rows.filter((row) => row.canonicalCardId);
      if (!real.length) noResult += 1;
      if (real.length < 3) fewerThanThree += 1;
      if (rows.some((row) => Number(row.siblingDuplicatesRemoved) > 0)) rawDuplicateQuestions += 1;
      if (real.length && real.every((row) => row.noteGuid != null && row.cardOrdinal != null)) launchResolvable += 1;
    }
    const preReviewMetrics = {
      sampledQuestionCount: sampledQuestions.length,
      proposedRecommendationCount: reviewerRows.filter((row) => row.canonicalCardId).length,
      precisionAt1: null,
      precisionAt3: null,
      precisionStatus: "requires_human_labels",
      noResultRatePct: pct(noResult, sampledQuestions.length),
      fewerThanThreeRatePct: pct(fewerThanThree, sampledQuestions.length),
      siblingDuplicateCandidateRatePct: pct(rawDuplicateQuestions, sampledQuestions.length),
      mappingErrorRatePct: null,
      mappingErrorStatus: "requires_human_labels",
      questionSetsWithResolvableNoteGuidAndOrdinalPct: pct(launchResolvable, sampledQuestions.length),
      launchSuccessRatePct: null,
      launchStatus: "add_on_open_card_capability_not_present_in_repository",
      suitableForLaunchPct: null,
      suitabilityStatus: "cannot_claim_before_mapping_review_and_launch_test",
    };

    const deckRows = [...group(cards, (row) => row.deck_path?.[0] || row.deck_full_name || "unknown").entries()].map(([deck, rows]) => ({
      deck, canonicalCards: rows.length, productionEligibleMappedCards: rows.filter((row) => eligibleCards.has(row.canonical_card_id)).length,
      coveragePct: pct(rows.filter((row) => eligibleCards.has(row.canonical_card_id)).length, rows.length),
    })).sort((a, b) => b.canonicalCards - a.canonicalCards);
    const branchRows = [...group(cards, (row) => row.deck_full_name || "unknown").entries()].map(([deckBranch, rows]) => ({
      deckBranch, canonicalCards: rows.length, productionEligibleMappedCards: rows.filter((row) => eligibleCards.has(row.canonical_card_id)).length,
      coveragePct: pct(rows.filter((row) => eligibleCards.has(row.canonical_card_id)).length, rows.length),
    })).sort((a, b) => b.canonicalCards - a.canonicalCards);
    const cardEntityTypeRows = [...group(eligibleCardLinks, (row) => row.entity_type).entries()].map(([entityType, rows]) => ({ entityType, linkRows: rows.length, uniqueCards: new Set(rows.map((row) => row.resource_id)).size, uniqueEntities: new Set(rows.map((row) => row.entity_id)).size }));
    const cardSpecialtyRows = [...group(eligibleCardLinks, (row) => specialtyByNode.get(row.source_curriculum_node_id ?? "") ?? "unknown").entries()].map(([specialty, rows]) => ({ specialty, linkRows: rows.length, uniqueCards: new Set(rows.map((row) => row.resource_id)).size, uniqueEntities: new Set(rows.map((row) => row.entity_id)).size }));
    const questionEntityTypeRows = [...group(eligibleQuestionLinks, (row) => row.entity_type).entries()].map(([entityType, rows]) => ({ entityType, linkRows: rows.length, uniqueQuestions: new Set(rows.map((row) => row.resource_id)).size, uniqueEntities: new Set(rows.map((row) => row.entity_id)).size }));
    const questionSpecialtyRows = [...group(questions, (row) => row.specialty || "unknown").entries()].map(([specialty, rows]) => ({ specialty, questions: rows.length, directTableMapped: rows.filter((row) => mappedQuestions.has(row.question_id)).length, productionEligibleMapped: rows.filter((row) => eligibleQuestions.has(row.question_id)).length }));
    const entityMembershipRows = [...group(memberships, (row) => row.entity_id).entries()].filter(([, rows]) => rows.length > 1).map(([entityId, rows]) => ({ entityId, neighborhoods: unique(rows.map((row) => row.neighborhood_slug)), neighborhoodCount: unique(rows.map((row) => row.neighborhood_slug)).length, linkedCards: new Set((cardsByEntity.get(entityId) ?? []).map((row) => row.resource_id)).size, linkedQuestions: new Set((questionsByEntity.get(entityId) ?? []).map((row) => row.resource_id)).size })).sort((a, b) => b.linkedQuestions - a.linkedQuestions || b.linkedCards - a.linkedCards);
    const questionTopicRows = [...group(questions, (row) => `${row.specialty || "unknown"}|||${row.topic_slug || row.topic || "unknown"}`).entries()].map(([key, rows]) => {
      const [specialty, topic] = key.split("|||");
      return { specialty, topic, questions: rows.length, directTableMapped: rows.filter((row) => mappedQuestions.has(row.question_id)).length, productionEligibleMapped: rows.filter((row) => eligibleQuestions.has(row.question_id)).length };
    }).sort((a, b) => b.questions - a.questions);

    const result = {
      generatedAt: new Date().toISOString(),
      databaseHost: new URL(connectionString).hostname,
      safety: { transactionReadOnly: readOnly, transactionDisposition: "rollback", applicationName: "educational_content_readonly_audit" },
      activeRelease: release,
      schemaPresence: { present: [...presentTables].sort(), absentOptionalBroBotAnkiTables: ["brobot_anki_prep_requests", "brobot_anki_study_sessions", "brobot_anki_session_matches", "brobot_anki_addon_devices"].filter((name) => !presentTables.has(name)) },
      brobotAnkiOperationalSchema: { counts: brobotAnkiCounts, rls: brobotAnkiRls, columns: brobotAnkiSchema, policies: brobotAnkiPolicies },
      anki: cardInventory,
      orthobullets: questionInventory,
      sharedCoverage: coverageRows,
      preReviewMetrics,
    };

    writeFileSync(path.join(outDir, "production-baseline.json"), JSON.stringify(result, null, 2) + "\n");
    writeCsv(path.join(outDir, "shared-coverage-matrix.csv"), coverageRows);
    writeCsv(path.join(outDir, "shared-coverage-by-entity.csv"), entityCoverageRows);
    writeCsv(path.join(outDir, "anki-coverage-by-deck.csv"), deckRows);
    writeCsv(path.join(outDir, "anki-coverage-by-deck-branch.csv"), branchRows);
    writeCsv(path.join(outDir, "anki-coverage-by-entity-type.csv"), cardEntityTypeRows);
    writeCsv(path.join(outDir, "anki-coverage-by-specialty.csv"), cardSpecialtyRows);
    writeCsv(path.join(outDir, "orthobullets-coverage-by-specialty-topic.csv"), questionTopicRows);
    writeCsv(path.join(outDir, "orthobullets-coverage-by-specialty.csv"), questionSpecialtyRows);
    writeCsv(path.join(outDir, "orthobullets-coverage-by-entity-type.csv"), questionEntityTypeRows);
    writeCsv(path.join(outDir, "production-entity-cross-neighborhood-memberships.csv"), entityMembershipRows);
    writeCsv(path.join(outDir, "recommendation-reviewer-packet.csv"), reviewerRows);
    writeFileSync(path.join(outDir, "reviewer-packet-metrics.json"), JSON.stringify(preReviewMetrics, null, 2) + "\n");

    await client.query("rollback");
    rolledBack = true;
    process.stdout.write(JSON.stringify({ outDir, ...result }, null, 2) + "\n");
  } finally {
    if (!rolledBack) {
      try { await client.query("rollback"); } catch {}
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
