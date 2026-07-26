/* eslint-disable @typescript-eslint/no-explicit-any -- additive KG tables are not in generated Supabase types yet. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";
import { rankSearchCandidates } from "@/lib/education/anki-search-ranking";
import {
  RESOURCE_SEARCH_CONTRACT_VERSION,
  isResourceSearchRequestV1,
  normalizeResourceSearchNativeId,
  type ResourceSearchCardV1,
  type ResourceSearchEntityV1,
  type ResourceSearchResponseV1,
} from "@/lib/education/contracts/resource-search-v1";

const MIN_REVIEW_CONFIDENCE = 0.95;
const CARD_ROLES = ["tests", "teaches", "explains", "demonstrates"] as const;

function response(input: Omit<ResourceSearchResponseV1, "contractVersion" | "trace">) {
  return NextResponse.json({
    contractVersion: RESOURCE_SEARCH_CONTRACT_VERSION,
    ...input,
    trace: {
      searchId: randomUUID(),
      algorithmVersion: "direct_reviewed_then_latest_deck_concept.v2",
    },
  } satisfies ResourceSearchResponseV1);
}

const SEARCH_STOP_WORDS = new Set([
  "with", "from", "that", "this", "after", "before", "using", "which", "when",
  "what", "into", "following", "most", "likely", "normal", "abnormal", "patient",
  "patients", "injury", "injuries", "treatment", "management", "diagnosis",
  "examination", "would", "result",
]);

function conceptTerms(testedConcept?: string, summary?: string) {
  const terms: string[] = [];
  for (const token of `${testedConcept ?? ""} ${summary ?? ""}`.match(/[A-Za-z0-9]+/g) ?? []) {
    const normalized = token.toLowerCase();
    if (normalized.length >= 4 && !SEARCH_STOP_WORDS.has(normalized) && !terms.includes(normalized))
      terms.push(normalized);
  }
  return terms.slice(0, 10);
}

type SearchSpec = {
  terms: string[];
  limit: number;
  sectionId?: string;
  priority: number;
};

function normalizedTerms(values: string[], limit = 10) {
  const result: string[] = [];
  for (const token of values.join(" ").match(/[A-Za-z0-9]+/g) ?? []) {
    const value = token.toLowerCase();
    if (value.length >= 3 && !SEARCH_STOP_WORDS.has(value) && !result.includes(value)) result.push(value);
  }
  return result.slice(0, limit);
}

async function latestDeckConceptResults(db: any, input: any): Promise<ResourceSearchCardV1[]> {
  if (!input.scopes.includes("latest_deck_concept")) return [];
  const terms = conceptTerms(input.query.testedConcept, input.query.conceptSummary);
  const anchors = (input.query.searchKeywords ?? [])
    .map((value: string) => value.toLowerCase())
    .filter((value: string) => value.length >= 3 && !SEARCH_STOP_WORDS.has(value))
    .slice(0, 16);
  const searches: SearchSpec[] = input.query.kind === "topic_page"
    ? (input.query.sections ?? []).map((section: any) => ({
        terms: normalizedTerms([section.heading, ...(section.concepts ?? [])], 8),
        limit: 12,
        sectionId: section.id,
        priority: section.priority,
      })).filter((search: SearchSpec) => search.terms.length > 0)
    : [
        ...(terms.length >= 2 ? [{ terms, limit: Math.min(input.limit, 20), priority: 5 }] : []),
        ...anchors.map((anchor: string) => ({ terms: [anchor], limit: 6, priority: 3 })),
      ];
  if (!searches.length) return [];
  const batches = input.query.kind === "topic_page"
    ? await (async () => {
        const priorityBySection = new Map(searches.map((search) => [search.sectionId, search.priority]));
        const { data, error } = await db.rpc("search_latest_anki_deck_by_sections", {
          section_queries: searches.map((search) => ({ id: search.sectionId, terms: search.terms })),
          result_limit: Math.min(500, Math.max(input.limit * 6, 100)),
        });
        if (error) throw new Error(`latest_deck_page_search:${error.code ?? "unknown"}`);
        const rowsBySection = new Map<string, any[]>();
        for (const row of data ?? []) {
          const rows = rowsBySection.get(row.section_id) ?? [];
          if (rows.length < 12) rows.push(row);
          rowsBySection.set(row.section_id, rows);
        }
        return [...rowsBySection].map(([sectionId, rows]) => ({
          rows,
          search: {
            terms: [],
            limit: 12,
            sectionId,
            priority: priorityBySection.get(sectionId) ?? 3,
          },
        }));
      })()
    : await Promise.all(searches.map(async (search) => {
        const { data, error } = await db.rpc("search_latest_anki_deck_by_concept", {
          search_terms: search.terms,
          result_limit: search.limit,
        });
        if (error) throw new Error(`latest_deck_concept_search:${error.code ?? "unknown"}`);
        return { rows: data ?? [], search };
      }));
  const ranked = rankSearchCandidates<ResourceSearchCardV1>(
    batches.flatMap((batch) => batch.rows.map((row: any) => ({
      id: row.canonical_card_id,
      sectionId: batch.search.sectionId,
      priority: batch.search.priority,
      coverage: Number(row.term_coverage) || 0,
      textRank: Number(row.text_rank) || 0,
      value: {
        canonicalCardId: row.canonical_card_id,
        canonicalCardVersionId: row.canonical_card_version_id,
        contentHash: row.content_hash,
        noteGuid: row.note_guid,
        cardOrdinal: row.card_ordinal,
        tier: "latest_deck_concept",
        mappingRole: "teaches",
        sharedCanonicalEntityIds: [],
        reasonCodes: ["latest_deck_concept_coverage"],
        reviewConfidence: 0,
      } satisfies ResourceSearchCardV1,
    }))),
    input.query.kind === "topic_page"
      ? (input.query.sections ?? []).map((section: any) => section.id)
      : [],
    input.limit,
  );
  return ranked.map((candidate) => ({
    ...candidate.value,
    reviewConfidence: candidate.reviewConfidence,
    relevanceScore: candidate.relevanceScore,
    matchedSectionIds: candidate.matchedSectionIds,
  }));
}

export async function POST(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  if (auth.authMethod !== "device_token" || !auth.deviceTokenId) {
    return NextResponse.json({ error: "Anki device authentication required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!isResourceSearchRequestV1(raw))
    return NextResponse.json({ error: "invalid resource search request" }, { status: 400 });

  const input = raw;
  const normalizedNativeId = normalizeResourceSearchNativeId(
    input.query.provider,
    input.query.nativeId,
  );
  const db = auth.supabase;
  if (input.query.kind === "topic_page") {
    try {
      const results = await latestDeckConceptResults(db, input);
      return response({
        resolution: {
          provider: "orthobullets",
          nativeId: normalizedNativeId,
          externalQuestionId: null,
          canonicalEntities: [],
          status: results.length ? "concept_searched" : "not_registered",
        },
        results,
        discovery: results.length
          ? { status: "not_needed", reason: null }
          : { status: "review_required", reason: "card_mapping_missing" },
      });
    } catch {
      return NextResponse.json(
        { error: "concept search unavailable", code: "concept_search_unavailable" },
        { status: 503 },
      );
    }
  }
  const { data: source } = await db
    .from("external_sources")
    .select("id")
    .eq("slug", input.query.provider)
    .maybeSingle();
  const { data: question } = source
    ? await db
        .from("external_questions")
        .select("id,external_question_id")
        .eq("source_id", source.id)
        .eq("external_question_id", normalizedNativeId)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null };

  const baseResolution = {
    provider: "orthobullets" as const,
    nativeId: normalizedNativeId,
    externalQuestionId: question?.id ?? null,
    canonicalEntities: [] as ResourceSearchEntityV1[],
  };
  if (!question) {
    let semanticResults: ResourceSearchCardV1[];
    try {
      semanticResults = await latestDeckConceptResults(db, input);
    } catch {
      return NextResponse.json(
        { error: "concept search unavailable", code: "concept_search_unavailable" },
        { status: 503 },
      );
    }
    if (semanticResults.length)
      return response({
        resolution: { ...baseResolution, status: "concept_searched" },
        results: semanticResults,
        discovery: { status: "not_needed", reason: null },
      });
    return response({
      resolution: { ...baseResolution, status: "not_registered" },
      results: [],
      discovery: { status: "review_required", reason: "question_not_registered" },
    });
  }

  const { data: questionLinks, error: questionLinkError } = await db
    .from("question_canonical_entity_links")
    .select("id,canonical_entity_id,mapping_confidence")
    .eq("external_question_id", question.id)
    .eq("is_active", true)
    .eq("review_status", "approved")
    .gte("mapping_confidence", MIN_REVIEW_CONFIDENCE);
  if (questionLinkError)
    return NextResponse.json({ error: "question mapping lookup unavailable" }, { status: 500 });

  const questionLinkIds = (questionLinks ?? []).map((link: any) => link.id);
  const { data: questionAssertions } = questionLinkIds.length
    ? await db
        .from("educational_link_review_assertions")
        .select("question_link_id,confidence,mapping_role")
        .in("question_link_id", questionLinkIds)
        .eq("is_active", true)
        .eq("reviewer_decision", "approved")
        .eq("provenance_method", "direct_human_review")
        .eq("mapping_role", "tests")
        .gte("confidence", MIN_REVIEW_CONFIDENCE)
    : { data: [] };
  const assertionByQuestionLink = new Map(
    (questionAssertions ?? []).map((row: any) => [row.question_link_id, row]),
  );
  const eligibleQuestionLinks = (questionLinks ?? []).filter((row: any) =>
    assertionByQuestionLink.has(row.id),
  );
  const entityIds = [...new Set(eligibleQuestionLinks.map((row: any) => row.canonical_entity_id))];

  if (!entityIds.length) {
    let semanticResults: ResourceSearchCardV1[];
    try {
      semanticResults = await latestDeckConceptResults(db, input);
    } catch {
      return NextResponse.json(
        { error: "concept search unavailable", code: "concept_search_unavailable" },
        { status: 503 },
      );
    }
    if (semanticResults.length)
      return response({
        resolution: { ...baseResolution, externalQuestionId: question.id, status: "concept_searched" },
        results: semanticResults,
        discovery: { status: "not_needed", reason: null },
      });
    return response({
      resolution: { ...baseResolution, status: "unmapped" },
      results: [],
      discovery: { status: "review_required", reason: "question_mapping_missing" },
    });
  }

  const { data: entityRows } = await db
    .from("canonical_entities")
    .select("id,preferred_label")
    .in("id", entityIds)
    .eq("is_active", true)
    .eq("status", "canonical");
  const entityLabel = new Map((entityRows ?? []).map((row: any) => [row.id, row.preferred_label]));
  const canonicalEntities = eligibleQuestionLinks
    .filter((link: any) => entityLabel.has(link.canonical_entity_id))
    .map((link: any) => {
      const assertion: any = assertionByQuestionLink.get(link.id);
      return {
        canonicalEntityId: link.canonical_entity_id,
        label: entityLabel.get(link.canonical_entity_id),
        mappingRole: "tests",
        reviewConfidence: Number(assertion.confidence),
      } satisfies ResourceSearchEntityV1;
    });

  const { data: cardLinks, error: cardLinkError } = await db
    .from("card_canonical_entity_links")
    .select("id,canonical_card_id,canonical_entity_id,mapping_confidence")
    .in("canonical_entity_id", canonicalEntities.map((entity) => entity.canonicalEntityId))
    .eq("is_active", true)
    .eq("review_status", "approved")
    .gte("mapping_confidence", MIN_REVIEW_CONFIDENCE);
  if (cardLinkError)
    return NextResponse.json({ error: "card mapping lookup unavailable" }, { status: 500 });

  const cardLinkIds = (cardLinks ?? []).map((link: any) => link.id);
  const { data: cardAssertions } = cardLinkIds.length
    ? await db
        .from("educational_link_review_assertions")
        .select("card_link_id,confidence,mapping_role")
        .in("card_link_id", cardLinkIds)
        .eq("is_active", true)
        .eq("reviewer_decision", "approved")
        .eq("provenance_method", "direct_human_review")
        .in("mapping_role", [...CARD_ROLES])
        .gte("confidence", MIN_REVIEW_CONFIDENCE)
    : { data: [] };
  const assertionByCardLink = new Map(
    (cardAssertions ?? []).map((row: any) => [row.card_link_id, row]),
  );
  const eligibleCardLinks = (cardLinks ?? []).filter((row: any) =>
    assertionByCardLink.has(row.id),
  );
  const cardIds = [...new Set(eligibleCardLinks.map((row: any) => row.canonical_card_id))];

  const { data: latestRelease } = await db
    .from("anki_deck_releases")
    .select("id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: releaseCards } = latestRelease && cardIds.length
    ? await db
        .from("anki_deck_release_cards")
        .select("canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,content_hash")
        .eq("deck_release_id", latestRelease.id)
        .eq("inclusion_status", "included")
        .in("canonical_card_id", cardIds)
    : { data: [] };
  const identityByCard = new Map(
    (releaseCards ?? [])
      .map((card: any) => [
        card.canonical_card_id,
        {
          ...card,
          current_version_id: card.canonical_card_version_id,
          contentHash: card.content_hash,
          noteGuid: card.note_guid,
          cardOrdinal: card.card_ordinal,
        },
      ]),
  );
  const grouped = new Map<string, ResourceSearchCardV1>();
  for (const link of eligibleCardLinks) {
    const identity: any = identityByCard.get(link.canonical_card_id);
    const assertion: any = assertionByCardLink.get(link.id);
    if (!identity?.current_version_id || !identity.noteGuid) continue;
    const existing = grouped.get(link.canonical_card_id);
    if (existing) {
      existing.sharedCanonicalEntityIds.push(link.canonical_entity_id);
      existing.reviewConfidence = Math.min(existing.reviewConfidence, Number(assertion.confidence));
      continue;
    }
    grouped.set(link.canonical_card_id, {
      canonicalCardId: link.canonical_card_id,
      canonicalCardVersionId: identity.current_version_id,
      contentHash: identity.contentHash,
      noteGuid: identity.noteGuid,
      cardOrdinal: identity.cardOrdinal,
      tier: "direct_reviewed",
      mappingRole: assertion.mapping_role,
      sharedCanonicalEntityIds: [link.canonical_entity_id],
      reasonCodes: ["reviewed_exact_entity_overlap"],
      reviewConfidence: Number(assertion.confidence),
    });
  }
  const roleRank = { tests: 0, teaches: 1, explains: 2, demonstrates: 3 };
  const directResults = [...grouped.values()]
    .sort((left, right) =>
      roleRank[left.mappingRole] - roleRank[right.mappingRole]
      || right.sharedCanonicalEntityIds.length - left.sharedCanonicalEntityIds.length
      || right.reviewConfidence - left.reviewConfidence
      || left.canonicalCardId.localeCompare(right.canonicalCardId),
    )
    .slice(0, input.limit);
  let semanticResults: ResourceSearchCardV1[];
  try {
    semanticResults = await latestDeckConceptResults(db, input);
  } catch {
    semanticResults = [];
  }
  const resultById = new Map<string, ResourceSearchCardV1>();
  for (const card of [...directResults, ...semanticResults]) {
    if (!resultById.has(card.canonicalCardId)) resultById.set(card.canonicalCardId, card);
  }
  const results = [...resultById.values()].slice(0, input.limit);

  return response({
    resolution: { ...baseResolution, status: "resolved", canonicalEntities },
    results,
    discovery: results.length
      ? { status: "not_needed", reason: null }
      : { status: "review_required", reason: "card_mapping_missing" },
  });
}
