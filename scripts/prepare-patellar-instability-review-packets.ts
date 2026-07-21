/** Read-only packet generator for the fixed Patellar Instability pilot. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { serializeCsv } from "./lib/education/review-csv.ts";

const { Client } = pg;
const ENTITY_ID = "1ad8280b-74e5-416c-b8fb-06c7d9cc0d0a";
const DECK = "Marty McFlyin's Ortho Deck::3) OrthoBullets::Knee & Sports::Knee::Knee Extensor Mechanism::Patellar Instability";
const DEFAULT_OUT = "reports/educational-content-layer/anki-launch-foundation/patellar-instability-review";

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

function safeText(value: string | null, limit = 240) {
  return value?.replace(/\s+/g, " ").trim().slice(0, limit) || "";
}

async function main() {
  const outArg = process.argv.find((value) => value.startsWith("--out="));
  const outDir = path.resolve(outArg?.slice(6) || DEFAULT_OUT);
  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  if (!env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required");
  const client = new Client({ connectionString: env.DATABASE_URL.trim(), ssl: { rejectUnauthorized: false }, application_name: "patellar_review_packet_readonly" });
  await client.connect();
  const query = async <T>(sql: string, values: unknown[] = []) => (await client.query<T>(sql, values)).rows;
  let rolledBack = false;
  try {
    await client.query("begin");
    await client.query("set transaction read only");
    await client.query("set local statement_timeout = '60s'");
    const readOnly = (await query<{ transaction_read_only: string }>("show transaction_read_only"))[0]?.transaction_read_only;
    if (readOnly !== "on") throw new Error(`Read-only guard failed: ${readOnly}`);

    const questions = await query<{
      question_uuid: string; source_question_id: string; question_link_id: string;
      specialty: string; topic: string; topic_slug: string; link_confidence: number;
      review_status: string; retarget_path: string; created_by_source: string;
    }>(`
      select q.id question_uuid,q.external_question_id source_question_id,l.id question_link_id,
        q.specialty_normalized specialty,q.topic_normalized topic,q.topic_slug,
        l.mapping_confidence::float8 link_confidence,l.review_status,l.retarget_path,l.created_by_source
      from public.external_questions q
      join public.external_sources s on s.id=q.source_id and s.slug='orthobullets'
      join public.question_canonical_entity_links l on l.external_question_id=q.id
      where q.is_active and l.is_active and l.canonical_entity_id=$1
        and q.specialty_normalized='knee-sports' and q.topic_slug='patellar-instability'
      order by q.external_question_id
    `, [ENTITY_ID]);

    const cards = await query<{
      canonical_card_id: string; card_link_id: string; safe_title: string | null;
      source_id: string; note_guid: string | null; card_ordinal: number; source_card_id_hint: string | null;
      deck_branch: string; link_confidence: number; review_status: string; retarget_path: string;
      created_by_source: string; identity_match_count: number;
    }>(`
      with identity_counts as (
        select ac.source_id,n.anki_note_guid,ac.card_ord,count(*)::int identity_match_count
        from public.anki_cards ac join public.anki_notes n on n.id=ac.note_id
        where ac.is_active and n.is_active and n.anki_note_guid is not null
        group by ac.source_id,n.anki_note_guid,ac.card_ord
      )
      select c.id canonical_card_id,l.id card_link_id,c.title safe_title,
        ac.source_id,n.anki_note_guid note_guid,ac.card_ord card_ordinal,
        ac.anki_card_id source_card_id_hint,d.full_name deck_branch,
        l.mapping_confidence::float8 link_confidence,l.review_status,l.retarget_path,l.created_by_source,
        coalesce(ic.identity_match_count,0)::int identity_match_count
      from public.canonical_cards c
      join public.canonical_card_versions v on v.id=c.current_version_id and v.is_active
      join public.card_canonical_entity_links l on l.canonical_card_id=c.id and l.is_active
      join public.anki_cards ac on ac.id=c.anki_card_id and ac.is_active
      join public.anki_notes n on n.id=c.anki_note_id and n.is_active
      join public.anki_decks d on d.id=ac.deck_id
      left join identity_counts ic on ic.source_id=ac.source_id and ic.anki_note_guid=n.anki_note_guid and ic.card_ord=ac.card_ord
      where c.is_active and l.canonical_entity_id=$1 and d.full_name=$2
      order by c.id
    `, [ENTITY_ID, DECK]);

    if (questions.length !== 30) throw new Error(`Expected 30 pilot questions; found ${questions.length}`);
    if (cards.length !== 4) throw new Error(`Expected 4 pilot cards; found ${cards.length}`);
    const identityErrors = cards.flatMap((card) => {
      const errors: string[] = [];
      if (!card.note_guid) errors.push(`${card.canonical_card_id}: missing note GUID`);
      if (!Number.isInteger(card.card_ordinal) || card.card_ordinal < 0) errors.push(`${card.canonical_card_id}: invalid ordinal`);
      if (!card.source_card_id_hint) errors.push(`${card.canonical_card_id}: missing native card ID hint`);
      if (card.identity_match_count !== 1) errors.push(`${card.canonical_card_id}: GUID/ordinal matches ${card.identity_match_count} active source cards`);
      return errors;
    });

    const directReviewRows: Array<Record<string, unknown>> = [
      ...questions.map((question) => ({
        resourceType: "orthobullets_question",
        sourceResourceId: question.source_question_id,
        databaseResourceId: question.question_uuid,
        entityLinkId: question.question_link_id,
        canonicalEntityId: ENTITY_ID,
        canonicalEntityLabel: "Patellar Instability",
        specialty: question.specialty,
        topic: question.topic,
        deckBranch: "",
        safeCardTitle: "",
        historicalProvenance: question.retarget_path,
        historicalCreatedBy: question.created_by_source,
        historicalReviewStatus: question.review_status,
        historicalConfidence: question.link_confidence,
        suggestedMappingRole: "tests",
        mappingRole: "",
        reviewerDecision: "",
        reviewerUserId: "",
        reviewedAt: "",
        reviewedConfidence: "",
        safeNotes: "",
        evidenceHashes: "",
      })),
      ...cards.map((card) => ({
        resourceType: "anki_card",
        sourceResourceId: card.canonical_card_id,
        databaseResourceId: card.canonical_card_id,
        entityLinkId: card.card_link_id,
        canonicalEntityId: ENTITY_ID,
        canonicalEntityLabel: "Patellar Instability",
        specialty: "knee-sports",
        topic: "patellar-instability",
        deckBranch: card.deck_branch,
        safeCardTitle: safeText(card.safe_title),
        historicalProvenance: card.retarget_path,
        historicalCreatedBy: card.created_by_source,
        historicalReviewStatus: card.review_status,
        historicalConfidence: card.link_confidence,
        suggestedMappingRole: "teaches",
        mappingRole: "",
        reviewerDecision: "",
        reviewerUserId: "",
        reviewedAt: "",
        reviewedConfidence: "",
        safeNotes: "",
        evidenceHashes: "",
      })),
    ];

    const selectedCards = cards.slice(0, 3);
    const recommendationRows = questions.flatMap((question) => selectedCards.map((card, index) => ({
      sourceQuestionId: question.source_question_id,
      questionDatabaseId: question.question_uuid,
      questionLinkId: question.question_link_id,
      specialty: question.specialty,
      topic: question.topic,
      topicSlug: question.topic_slug,
      canonicalEntityId: ENTITY_ID,
      canonicalEntityLabel: "Patellar Instability",
      questionHistoricalProvenance: question.retarget_path,
      questionHistoricalConfidence: question.link_confidence,
      rank: index + 1,
      canonicalCardId: card.canonical_card_id,
      cardLinkId: card.card_link_id,
      safeCardTitle: safeText(card.safe_title),
      deckBranch: card.deck_branch,
      noteGuid: card.note_guid,
      cardOrdinal: card.card_ordinal,
      sourceCardIdHint: card.source_card_id_hint,
      cardHistoricalProvenance: card.retarget_path,
      cardHistoricalConfidence: card.link_confidence,
      recommendationReason: `exact_entity_overlap:${ENTITY_ID}`,
      relevanceLabel: "",
      mappingError: "",
      missingObviousCard: "",
      reviewerNotes: "",
      reviewerUserId: "",
      reviewedAt: "",
    })));

    const markdown = [
      "# Patellar Instability recommendation review",
      "",
      "Allowed relevance labels: `highly_relevant`, `acceptable`, `weak`, `incorrect`, `duplicate_redundant`.",
      "Complete the CSV, not this rendering. Do not add protected question content.",
      "",
      ...questions.flatMap((question) => {
        const rows = recommendationRows.filter((row) => row.sourceQuestionId === question.source_question_id);
        return [
          `## Question ${question.source_question_id}`,
          "",
          `Specialty/topic: ${question.specialty} / ${question.topic_slug}`,
          "",
          "| Rank | Safe card title | Canonical card | Deck | Match |",
          "|---:|---|---|---|---|",
          ...rows.map((row) => `| ${row.rank} | ${String(row.safeCardTitle).replaceAll("|", "\\|")} | \`${row.canonicalCardId}\` | ${String(row.deckBranch).replaceAll("|", "\\|")} | exact Patellar Instability entity |`),
          "",
        ];
      }),
    ].join("\n");

    const identityReport = {
      generatedAt: new Date().toISOString(),
      safety: { transactionReadOnly: readOnly, transactionDisposition: "rollback" },
      canonicalEntityId: ENTITY_ID,
      expectedCardCount: 4,
      valid: identityErrors.length === 0,
      errors: identityErrors,
      cards: cards.map((card) => ({
        canonicalCardId: card.canonical_card_id,
        sourceId: card.source_id,
        noteGuidPresent: Boolean(card.note_guid),
        cardOrdinal: card.card_ordinal,
        sourceCardIdHintPresent: Boolean(card.source_card_id_hint),
        activeSourceIdentityMatchCount: card.identity_match_count,
      })),
    };

    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "direct-mapping-review.csv"), serializeCsv(directReviewRows), "utf8");
    writeFileSync(path.join(outDir, "recommendation-review.csv"), serializeCsv(recommendationRows), "utf8");
    writeFileSync(path.join(outDir, "recommendation-review.md"), markdown + "\n", "utf8");
    writeFileSync(path.join(outDir, "pilot-card-identity-verification.json"), JSON.stringify(identityReport, null, 2) + "\n", "utf8");

    await client.query("rollback");
    rolledBack = true;
    process.stdout.write(JSON.stringify({ outDir, questionCount: questions.length, cardCount: cards.length, recommendationRows: recommendationRows.length, identityValid: identityReport.valid }, null, 2) + "\n");
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
