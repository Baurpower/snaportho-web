import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

function loadEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}

function countBy(rows: Row[], key: (row: Row) => string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = key(row) || "(missing)";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function pct(numerator: number, denominator: number) {
  return denominator ? Number(((100 * numerator) / denominator).toFixed(1)) : 0;
}

function topEntries(input: Record<string, number>, limit = 30) {
  return Object.fromEntries(Object.entries(input).slice(0, limit));
}

async function main() {
  const env = loadEnv();
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  async function pages(
    table: string,
    select: string,
    filter: (query: any) => any = (query) => query,
  ): Promise<Row[]> {
    const rows: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await filter(
        db.from(table).select(select).range(from, from + 999),
      );
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }

  const [
    taxonomyVersions,
    pipelineRuns,
    batches,
    stageResults,
    assertions,
    metadataReleases,
    tagManifests,
    dispositions,
    sourceTags,
    sourceNoteTags,
  ] = await Promise.all([
    pages("metadata_taxonomy_versions", "id,version,lifecycle_status,created_at,activated_at"),
    pages("metadata_pipeline_runs", "id,run_key,status,cohort_kind,created_at,started_at,completed_at,deck_release_id,taxonomy_version_id"),
    pages("metadata_pipeline_batches", "id,pipeline_run_id,status,current_stage,ordered_card_version_ids,attempt_count"),
    pages("metadata_pipeline_stage_results", "id,pipeline_run_id,canonical_card_version_id,facet,stage,agent_name,status,warnings,failure_codes"),
    pages("card_metadata_assertions", "id,canonical_card_id,canonical_card_version_id,facet,assertion_role,polarity,confidence,decision,decision_method,provenance,pipeline_run_id,rationale_codes,review_reason_codes,canonical_entity_id,metadata_concept_id"),
    pages("metadata_releases", "id,release_key,release_version,status,pipeline_run_id,deck_release_id,taxonomy_version_id,published_at"),
    pages("rendered_anki_tag_manifests", "id,manifest_key,status,metadata_release_id,deck_release_id,transition_mode,published_at"),
    pages("anki_tag_dispositions", "id,anki_tag_id,disposition,review_status,normalized_form"),
    pages("anki_tags", "id,raw_name,slug,is_active"),
    pages("anki_note_tags", "note_id,tag_id,is_active"),
  ]);

  const publishedMetadataRelease = metadataReleases
    .filter((row) => row.status === "published")
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
  const publishedManifest = tagManifests
    .filter((row) => row.status === "published")
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];

  const [releaseAssertions, manifestCards, manifestSources, syncReleases] =
    await Promise.all([
      publishedMetadataRelease
        ? pages(
            "metadata_release_assertions",
            "metadata_release_id,assertion_id",
            (query) => query.eq("metadata_release_id", publishedMetadataRelease.id),
          )
        : [],
      publishedManifest
        ? pages(
            "rendered_anki_tag_manifest_cards",
            "id,canonical_card_id,canonical_card_version_id,rendered_tags,added_tags,removed_tags,unchanged_tags",
            (query) => query.eq("manifest_id", publishedManifest.id),
          )
        : [],
      publishedManifest
        ? pages(
            "rendered_anki_tag_sources",
            "manifest_card_id,rendered_tag,source_kind,assertion_id,disposition_id,metadata_concept_id,canonical_entity_id",
          )
        : [],
      pages(
        "anki_sync_v2_releases",
        "id,release_version,release_sequence,status,expected_note_count,expected_card_count,expected_media_count,published_at",
      ),
    ]);

  const publishedSyncRelease = syncReleases
    .filter((row) => row.status === "published")
    .sort((a, b) => Number(b.release_sequence) - Number(a.release_sequence))[0];
  const releaseNotes = publishedSyncRelease
    ? await pages(
        "anki_sync_v2_release_notes",
        "note_id,note_version_id,ordering_key",
        (query) => query.eq("release_id", publishedSyncRelease.id),
      )
    : [];
  const noteVersionIds = releaseNotes.map((row) => row.note_version_id);
  const noteVersions: Row[] = [];
  for (let offset = 0; offset < noteVersionIds.length; offset += 100) {
    const { data, error } = await db
      .from("anki_sync_v2_note_versions")
      .select("id,note_id,governed_tags,deck_path,content_checksum,tags_checksum")
      .in("id", noteVersionIds.slice(offset, offset + 100));
    if (error) throw new Error(`anki_sync_v2_note_versions: ${error.message}`);
    noteVersions.push(...(data ?? []));
  }

  const requiredFacets = ["Anatomy", "Diagnosis", "Treatment", "Specialty"];
  const tagPattern = /^(SnapOrtho|Legacy)(::[A-Za-z0-9][A-Za-z0-9_]*)+$/;
  const allGovernedTags = noteVersions.flatMap((row) =>
    Array.isArray(row.governed_tags) ? row.governed_tags.map(String) : [],
  );
  const tagFrequency = countBy(allGovernedTags.map((tag) => ({ tag })), (row) => row.tag);
  const rootFrequency = countBy(
    allGovernedTags.map((tag) => ({ tag })),
    (row) => row.tag.split("::").slice(0, 2).join("::"),
  );
  const malformedTags = [...new Set(allGovernedTags.filter((tag) => !tagPattern.test(tag)))].sort();
  const normalizedGroups = new Map<string, Set<string>>();
  for (const tag of allGovernedTags) {
    const normalized = tag.toLowerCase();
    if (!normalizedGroups.has(normalized)) normalizedGroups.set(normalized, new Set());
    normalizedGroups.get(normalized)!.add(tag);
  }
  const caseCollisions = [...normalizedGroups.values()]
    .filter((values) => values.size > 1)
    .map((values) => [...values].sort());

  const noteTagMetrics = noteVersions.map((row) => {
    const tags: string[] = Array.isArray(row.governed_tags)
      ? row.governed_tags.map(String)
      : [];
    const coverage = Object.fromEntries(
      requiredFacets.map((facet) => [
        facet,
        tags.some((tag) => tag === `SnapOrtho::${facet}` || tag.startsWith(`SnapOrtho::${facet}::`)),
      ]),
    );
    return { noteId: row.note_id, tags, coverage };
  });
  const completeRequiredFacetNotes = noteTagMetrics.filter((row) =>
    requiredFacets.every((facet) => row.coverage[facet]),
  ).length;
  const noGovernedTagNotes = noteTagMetrics.filter((row) => row.tags.length === 0).length;
  const facetCoverage = Object.fromEntries(
    requiredFacets.map((facet) => {
      const covered = noteTagMetrics.filter((row) => row.coverage[facet]).length;
      return [facet, { covered, total: noteTagMetrics.length, pct: pct(covered, noteTagMetrics.length) }];
    }),
  );
  const tagCountsPerNote = noteTagMetrics.map((row) => row.tags.length).sort((a, b) => a - b);
  const percentile = (p: number) =>
    tagCountsPerNote.length
      ? tagCountsPerNote[Math.min(tagCountsPerNote.length - 1, Math.floor(p * tagCountsPerNote.length))]
      : 0;

  const releaseAssertionIds = new Set(releaseAssertions.map((row) => row.assertion_id));
  const publishedAssertions = assertions.filter((row) => releaseAssertionIds.has(row.id));
  const acceptedAssertions = assertions.filter((row) => row.decision === "accepted");
  const acceptedCardIds = new Set(acceptedAssertions.map((row) => row.canonical_card_version_id));
  const manifestCardIds = new Set(manifestCards.map((row) => row.canonical_card_version_id));
  const sourceTagMap = new Map(sourceTags.map((row) => [row.id, row]));
  const dispositionTagIds = new Set(dispositions.map((row) => row.anki_tag_id));
  const activeSourceTags = sourceTags.filter((row) => row.is_active);
  const undispositionedTags = activeSourceTags.filter((row) => !dispositionTagIds.has(row.id));
  const activeSourceTagIds = new Set(activeSourceTags.map((row) => row.id));
  const activeSourceAssignments = sourceNoteTags.filter(
    (row) => row.is_active && activeSourceTagIds.has(row.tag_id),
  );
  const sourceUsage = countBy(
    activeSourceAssignments,
    (row) => sourceTagMap.get(row.tag_id)?.raw_name ?? "(missing tag)",
  );
  const sourceNotes = new Set(activeSourceAssignments.map((row) => row.note_id));
  const sourceAssignmentsByNote = countBy(activeSourceAssignments, (row) => row.note_id);
  const sourceCountsPerNote = Object.values(sourceAssignmentsByNote).sort((a, b) => a - b);
  const sourcePercentile = (p: number) =>
    sourceCountsPerNote.length
      ? sourceCountsPerNote[
          Math.min(sourceCountsPerNote.length - 1, Math.floor(p * sourceCountsPerNote.length))
        ]
      : 0;
  const normalizedLegacy = new Map<string, Set<string>>();
  for (const tag of activeSourceTags.map((row) => String(row.raw_name))) {
    const normalized = tag
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (!normalizedLegacy.has(normalized)) normalizedLegacy.set(normalized, new Set());
    normalizedLegacy.get(normalized)!.add(tag);
  }
  const legacySemanticCollisions = [...normalizedLegacy.values()]
    .filter((values) => values.size > 1)
    .map((values) => [...values].sort())
    .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const governedDispositionAssignments = activeSourceAssignments.filter((row) =>
    dispositionTagIds.has(row.tag_id),
  ).length;
  const staleManifestSources = manifestSources.filter(
    (row) => publishedManifest && !manifestCards.some((card) => card.id === row.manifest_card_id),
  );

  const assertionsByFacet = countBy(assertions, (row) => `${row.facet}:${row.decision}`);
  const acceptedByFacet = countBy(acceptedAssertions, (row) => row.facet);
  const publishedByFacet = countBy(publishedAssertions, (row) => row.facet);
  const stageByStatus = countBy(stageResults, (row) => `${row.stage}:${row.status}`);
  const failedStages = stageResults.filter((row) => row.status === "failed");
  const warningStageCount = stageResults.filter(
    (row) => Array.isArray(row.warnings) && row.warnings.length > 0,
  ).length;
  const confidenceByFacet = Object.fromEntries(
    [...new Set(assertions.map((row) => row.facet))].sort().map((facet) => {
      const values = assertions
        .filter((row) => row.facet === facet)
        .map((row) => Number(row.confidence))
        .sort((a, b) => a - b);
      const average = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
      return [
        facet,
        {
          count: values.length,
          average: Number(average.toFixed(4)),
          below080: values.filter((value) => value < 0.8).length,
          below098: values.filter((value) => value < 0.98).length,
        },
      ];
    }),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    verdict: {
      publishedSyncRelease: publishedSyncRelease
        ? `${publishedSyncRelease.release_version} (#${publishedSyncRelease.release_sequence})`
        : null,
      releasedNotes: releaseNotes.length,
      pipelineCardCoverage: {
        acceptedAssertionCards: acceptedCardIds.size,
        releasedNotes: releaseNotes.length,
        pct: pct(acceptedCardIds.size, releaseNotes.length),
      },
      renderedManifestCoverage: {
        cards: manifestCardIds.size,
        releasedNotes: releaseNotes.length,
        pct: pct(manifestCardIds.size, releaseNotes.length),
      },
      allFourRequiredFacetCoverage: {
        notes: completeRequiredFacetNotes,
        total: noteTagMetrics.length,
        pct: pct(completeRequiredFacetNotes, noteTagMetrics.length),
      },
    },
    pipeline: {
      taxonomyVersions: taxonomyVersions.map((row) => ({
        version: row.version,
        status: row.lifecycle_status,
      })),
      runs: {
        total: pipelineRuns.length,
        byStatus: countBy(pipelineRuns, (row) => row.status),
        byCohort: countBy(pipelineRuns, (row) => row.cohort_kind),
        items: pipelineRuns.map((row) => ({
          runKey: row.run_key,
          status: row.status,
          cohortKind: row.cohort_kind,
          createdAt: row.created_at,
        })),
      },
      batches: {
        total: batches.length,
        cardsDeclared: batches.reduce(
          (sum, row) => sum + (Array.isArray(row.ordered_card_version_ids) ? row.ordered_card_version_ids.length : 0),
          0,
        ),
        byStatus: countBy(batches, (row) => row.status),
        byCurrentStage: countBy(batches, (row) => row.current_stage),
        retrying: batches.filter((row) => Number(row.attempt_count) > 1).length,
      },
      stages: {
        total: stageResults.length,
        failed: failedStages.length,
        withWarnings: warningStageCount,
        byStageAndStatus: stageByStatus,
        failureCodes: countBy(
          failedStages.flatMap((row) =>
            (row.failure_codes ?? []).map((code: string) => ({ code })),
          ),
          (row) => row.code,
        ),
      },
      assertions: {
        total: assertions.length,
        byFacetAndDecision: assertionsByFacet,
        acceptedByFacet,
        publishedByFacet,
        uniqueCardsWithAcceptedAssertions: acceptedCardIds.size,
        confidenceByFacet,
        byProvenance: countBy(assertions, (row) => row.provenance),
        byDecisionMethod: countBy(assertions, (row) => row.decision_method),
      },
      metadataReleases: metadataReleases.map((row) => ({
        key: row.release_key,
        version: row.release_version,
        status: row.status,
        publishedAt: row.published_at,
      })),
      publishedAssertionCount: publishedAssertions.length,
    },
    renderedManifest: {
      manifest: publishedManifest
        ? {
            key: publishedManifest.manifest_key,
            status: publishedManifest.status,
            transitionMode: publishedManifest.transition_mode,
            publishedAt: publishedManifest.published_at,
          }
        : null,
      cards: manifestCards.length,
      sources: manifestSources.length,
      sourceKinds: countBy(manifestSources, (row) => row.source_kind),
      staleSourceRows: staleManifestSources.length,
      cardsWithAddedTags: manifestCards.filter((row) => (row.added_tags ?? []).length > 0).length,
      cardsWithRemovedTags: manifestCards.filter((row) => (row.removed_tags ?? []).length > 0).length,
    },
    actualPublishedTags: {
      notes: noteVersions.length,
      totalAssignments: allGovernedTags.length,
      uniqueTags: Object.keys(tagFrequency).length,
      noGovernedTagNotes,
      completeRequiredFacetNotes,
      facets: facetCoverage,
      tagsPerNote: {
        min: tagCountsPerNote[0] ?? 0,
        median: percentile(0.5),
        p90: percentile(0.9),
        max: tagCountsPerNote.at(-1) ?? 0,
        average: noteTagMetrics.length
          ? Number((allGovernedTags.length / noteTagMetrics.length).toFixed(2))
          : 0,
      },
      malformedTags,
      caseCollisions,
      roots: rootFrequency,
      topTags: topEntries(tagFrequency, 50),
    },
    legacySourceTags: {
      activeUniqueTags: activeSourceTags.length,
      notesWithActiveTags: sourceNotes.size,
      activeAssignments: activeSourceAssignments.length,
      assignmentsPerTaggedNote: {
        average: sourceNotes.size
          ? Number((activeSourceAssignments.length / sourceNotes.size).toFixed(2))
          : 0,
        median: sourcePercentile(0.5),
        p90: sourcePercentile(0.9),
        max: sourceCountsPerNote.at(-1) ?? 0,
      },
      dispositionRows: dispositions.length,
      dispositionCoveragePct: pct(dispositionTagIds.size, activeSourceTags.length),
      assignmentWeightedDispositionCoveragePct: pct(
        governedDispositionAssignments,
        activeSourceAssignments.length,
      ),
      byDispositionAndReview: countBy(
        dispositions,
        (row) => `${row.disposition}:${row.review_status}`,
      ),
      undispositionedCount: undispositionedTags.length,
      semanticCollisionGroups: legacySemanticCollisions.slice(0, 50),
      topTagsByAssignment: topEntries(sourceUsage, 50),
      undispositionedExamples: undispositionedTags
        .slice(0, 50)
        .map((row) => sourceTagMap.get(row.id)?.raw_name),
    },
  };

  const outputDirectory = path.join(process.cwd(), "reports", "master-deck-tag-metadata-audit");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, "audit.json");
  const markdownPath = path.join(outputDirectory, "audit.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    "# Master Deck tag and metadata audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Executive scorecard",
    "",
    `- Published sync release: ${report.verdict.publishedSyncRelease ?? "none"}`,
    `- Released notes: ${report.verdict.releasedNotes}`,
    `- Cards with accepted pipeline assertions: ${report.verdict.pipelineCardCoverage.acceptedAssertionCards}/${report.verdict.pipelineCardCoverage.releasedNotes} (${report.verdict.pipelineCardCoverage.pct}%)`,
    `- Cards in published rendered-tag manifest: ${report.verdict.renderedManifestCoverage.cards}/${report.verdict.renderedManifestCoverage.releasedNotes} (${report.verdict.renderedManifestCoverage.pct}%)`,
    `- Notes with all four required facets: ${report.verdict.allFourRequiredFacetCoverage.notes}/${report.verdict.allFourRequiredFacetCoverage.total} (${report.verdict.allFourRequiredFacetCoverage.pct}%)`,
    "",
    "## Required facet coverage in actual published note tags",
    "",
    ...Object.entries(report.actualPublishedTags.facets).map(
      ([facet, value]: [string, any]) =>
        `- ${facet}: ${value.covered}/${value.total} (${value.pct}%)`,
    ),
    "",
    "## Tag hygiene",
    "",
    `- Total assignments: ${report.actualPublishedTags.totalAssignments}`,
    `- Unique tags: ${report.actualPublishedTags.uniqueTags}`,
    `- Notes with zero governed tags: ${report.actualPublishedTags.noGovernedTagNotes}`,
    `- Malformed tag paths: ${report.actualPublishedTags.malformedTags.length}`,
    `- Case-collision groups: ${report.actualPublishedTags.caseCollisions.length}`,
    `- Tags/note: average ${report.actualPublishedTags.tagsPerNote.average}, median ${report.actualPublishedTags.tagsPerNote.median}, p90 ${report.actualPublishedTags.tagsPerNote.p90}, max ${report.actualPublishedTags.tagsPerNote.max}`,
    "",
    "## Pipeline health",
    "",
    `- Runs: ${report.pipeline.runs.total} (${JSON.stringify(report.pipeline.runs.byStatus)})`,
    `- Batches: ${report.pipeline.batches.total}; declared card slots ${report.pipeline.batches.cardsDeclared}`,
    `- Stage results: ${report.pipeline.stages.total}; failed ${report.pipeline.stages.failed}; warning-bearing ${report.pipeline.stages.withWarnings}`,
    `- Assertions: ${report.pipeline.assertions.total}; published ${report.pipeline.publishedAssertionCount}`,
    "",
    "## Legacy-tag governance",
    "",
    `- Active source-native tags: ${report.legacySourceTags.activeUniqueTags}`,
    `- Active source assignments: ${report.legacySourceTags.activeAssignments} across ${report.legacySourceTags.notesWithActiveTags} notes`,
    `- Disposition rows: ${report.legacySourceTags.dispositionRows}`,
    `- Disposition coverage: ${report.legacySourceTags.dispositionCoveragePct}%`,
    `- Assignment-weighted disposition coverage: ${report.legacySourceTags.assignmentWeightedDispositionCoveragePct}%`,
    `- Undispositioned active tags: ${report.legacySourceTags.undispositionedCount}`,
    "",
    "See `audit.json` for distributions, top tags, confidence, provenance, and examples.",
    "",
  ];
  fs.writeFileSync(markdownPath, lines.join("\n"));
  console.log(JSON.stringify({ jsonPath, markdownPath, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
