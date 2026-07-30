import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

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

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function main() {
  const releaseKey = arg("--metadata-release-key");
  const manifestKey = arg("--manifest-key");
  if (!releaseKey || !manifestKey) throw new Error("--metadata-release-key and --manifest-key are required");
  const e = env();
  const db = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  async function pages(table: string, select: string, filter: (q: any) => any) {
    const rows: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await filter(db.from(table).select(select).range(from, from + 999));
      if (error) throw new Error(`${table}:${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }

  const { data: release, error: releaseError } = await db.from("metadata_releases")
    .select("*").eq("release_key", releaseKey).single();
  if (releaseError) throw releaseError;
  const { data: manifest, error: manifestError } = await db.from("rendered_anki_tag_manifests")
    .select("*").eq("manifest_key", manifestKey).eq("metadata_release_id", release.id).single();
  if (manifestError) throw manifestError;

  const [members, cards, deckCards] = await Promise.all([
    pages("metadata_release_assertions", "assertion_id", (q) => q.eq("metadata_release_id", release.id)),
    pages("rendered_anki_tag_manifest_cards",
      "id,canonical_card_id,canonical_card_version_id,rendered_tags,output_checksum",
      (q) => q.eq("manifest_id", manifest.id)),
    pages("anki_deck_release_cards", "canonical_card_id,canonical_card_version_id,inclusion_status",
      (q) => q.eq("deck_release_id", release.deck_release_id).eq("inclusion_status", "included")),
  ]);

  const assertions: Row[] = [];
  const memberIds = members.map((row) => row.assertion_id);
  for (let i = 0; i < memberIds.length; i += 100) {
    const { data, error } = await db.from("card_metadata_assertions")
      .select("id,canonical_card_id,canonical_card_version_id,facet,canonical_entity_id,metadata_concept_id,confidence,decision,decision_policy_version,evidence_spans,rationale_codes,taxonomy_version_id")
      .in("id", memberIds.slice(i, i + 100));
    if (error) throw error;
    assertions.push(...(data ?? []));
  }
  const sources: Row[] = [];
  const cardIds = cards.map((row) => row.id);
  for (let i = 0; i < cardIds.length; i += 100) {
    const { data, error } = await db.from("rendered_anki_tag_sources")
      .select("manifest_card_id,rendered_tag,source_kind,assertion_id")
      .in("manifest_card_id", cardIds.slice(i, i + 100));
    if (error) throw error;
    sources.push(...(data ?? []));
  }

  const deckPairs = new Set(deckCards.map((row) => `${row.canonical_card_id}:${row.canonical_card_version_id}`));
  const memberSet = new Set(memberIds);
  const assertionKeys = new Set<string>();
  const assertionCardIds = new Set<string>();
  const duplicateAssertions: string[] = [];
  for (const row of assertions) {
    assertionCardIds.add(row.canonical_card_version_id);
    const key = `${row.canonical_card_version_id}:${row.facet}:${row.canonical_entity_id ?? row.metadata_concept_id}`;
    if (assertionKeys.has(key)) duplicateAssertions.push(key);
    assertionKeys.add(key);
  }
  const tagPattern = /^SnapOrtho(::[A-Za-z0-9][A-Za-z0-9_]*)+$/;
  const malformedTags = [...new Set(cards.flatMap((card) => card.rendered_tags)
    .filter((tag: string) => !tagPattern.test(tag)))];
  const duplicateTags = cards.filter((card) =>
    new Set(card.rendered_tags).size !== card.rendered_tags.length).map((card) => card.canonical_card_version_id);
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const sourcePairs = new Set(sources.map((row) => `${row.manifest_card_id}:${row.rendered_tag}`));
  const missingTagSources = cards.flatMap((card) => card.rendered_tags
    .filter((tag: string) => !sourcePairs.has(`${card.id}:${tag}`))
    .map((tag: string) => `${card.canonical_card_version_id}:${tag}`));
  const extraneousSources = sources.filter((row) =>
    !cardById.get(row.manifest_card_id)?.rendered_tags.includes(row.rendered_tag));
  const assertionSourcesOutsideRelease = sources.filter((row) =>
    row.assertion_id && !memberSet.has(row.assertion_id));
  const facetCounts = Object.fromEntries(["anatomy", "diagnosis", "treatment", "specialty"].map((facet) => [
    facet, assertions.filter((row) => row.facet === facet).length,
  ]));
  const taggedFacetCoverage = Object.fromEntries(["Anatomy", "Diagnosis", "Treatment", "Specialty"].map((facet) => [
    facet, cards.filter((card) => card.rendered_tags.some((tag: string) =>
      tag.startsWith(`SnapOrtho::${facet}::`))).length,
  ]));

  const blockers = {
    missingAssertions: members.length - assertions.length,
    nonAccepted: assertions.filter((row) => row.decision !== "accepted").length,
    confidenceBelow098: assertions.filter((row) => Number(row.confidence) < 0.98).length,
    invalidTargetCardinality: assertions.filter((row) =>
      Number(Boolean(row.canonical_entity_id)) + Number(Boolean(row.metadata_concept_id)) !== 1).length,
    missingEvidence: assertions.filter((row) => !Array.isArray(row.evidence_spans) || !row.evidence_spans.length).length,
    missingRationale: assertions.filter((row) => !Array.isArray(row.rationale_codes) || !row.rationale_codes.length).length,
    taxonomyMismatch: assertions.filter((row) => row.taxonomy_version_id !== release.taxonomy_version_id).length,
    duplicateAssertions: duplicateAssertions.length,
    manifestCardsOutsideDeck: cards.filter((card) =>
      !deckPairs.has(`${card.canonical_card_id}:${card.canonical_card_version_id}`)).length,
    malformedTags: malformedTags.length,
    duplicateTags: duplicateTags.length,
    missingTagSources: missingTagSources.length,
    extraneousSources: extraneousSources.length,
    assertionSourcesOutsideRelease: assertionSourcesOutsideRelease.length,
  };
  const passed = Object.values(blockers).every((value) => value === 0);
  console.log(JSON.stringify({
    passed,
    release: {
      id: release.id, key: release.release_key, status: release.status,
      deckReleaseId: release.deck_release_id, manifestChecksum: release.manifest_checksum,
    },
    manifest: {
      id: manifest.id, key: manifest.manifest_key, status: manifest.status,
      outputChecksum: manifest.output_checksum, transitionMode: manifest.transition_mode,
    },
    counts: {
      deckCards: deckCards.length, assertions: assertions.length, assertionCards: assertionCardIds.size,
      renderedCards: cards.length, renderedTags: cards.reduce((n, card) => n + card.rendered_tags.length, 0),
      sources: sources.length, facetAssertions: facetCounts, taggedFacetCoverage,
    },
    blockers,
    examples: {
      malformedTags: malformedTags.slice(0, 10),
      duplicateAssertions: duplicateAssertions.slice(0, 10),
      missingTagSources: missingTagSources.slice(0, 10),
    },
  }, null, 2));
  if (!passed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
