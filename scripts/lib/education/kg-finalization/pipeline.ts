import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BackboneCoverageAgent } from "./backbone-coverage-agent.ts";
import { ConnectivityAgent } from "./connectivity-agent.ts";
import { CrossNeighborhoodLinkingAgent } from "./cross-neighborhood-linking-agent.ts";
import { IdentityReuseAgent } from "./identity-reuse-agent.ts";
import { OntologyConstraintAgent } from "./ontology-constraint-agent.ts";
import { PublicationReadinessAgent } from "./publication-readiness-agent.ts";
import { RelationshipNormalizationAgent } from "./relationship-normalization-agent.ts";
import { ReviewBurdenReductionAgent } from "./review-burden-reduction-agent.ts";
import { SourceProvenanceAgent } from "./source-provenance-agent.ts";
import type {
  FinalizationMetrics,
  GraphFinalizationAgent,
  GraphFinalizationAgentReport,
  GraphFinalizationContext,
  GraphFinalizationInput,
} from "./types.ts";
import { mergeResults } from "./utils.ts";

const AGENT_OUTPUT_FILES: Record<string, Record<string, string>> = {
  IdentityReuseAgent: {
    reuse_map: "reuse_map.json",
    alias_candidates: "alias_candidates.json",
    merge_candidates: "merge_candidates.json",
    identity_escalations: "identity_escalations.json",
  },
  OntologyConstraintAgent: {
    illegal_triples: "illegal_triples.json",
    type_violations: "type_violations.json",
    predicate_violations: "predicate_violations.json",
  },
  RelationshipNormalizationAgent: {
    relationship_revisions: "relationship_revisions.json",
    decision_point_conversions: "decision_point_conversions.json",
    rejected_relationships: "rejected_relationships.json",
  },
  SourceProvenanceAgent: {
    unsupported_objects: "unsupported_objects.json",
    provenance_report: "provenance_report.json",
    orphan_evidence: "orphan_evidence.json",
    lost_mapping_report: "lost_mapping_report.json",
  },
  ConnectivityAgent: {
    orphan_report: "orphan_report.json",
    low_degree_report: "low_degree_report.json",
    connectivity_repairs: "connectivity_repairs.json",
  },
  CrossNeighborhoodLinkingAgent: {
    ownership_map: "ownership_map.json",
    cross_neighborhood_links: "cross_neighborhood_links.json",
    duplicate_prevention_report: "duplicate_prevention_report.json",
  },
  ReviewBurdenReductionAgent: {
    decision_inheritance: "decision_inheritance.json",
    review_delta_report: "review_delta_report.json",
  },
  BackboneCoverageAgent: {
    coverage_report: "coverage_report.json",
    missing_domains: "missing_domains.json",
    weak_domains: "weak_domains.json",
  },
  PublicationReadinessAgent: {
    publication_readiness: "publication_readiness.json",
    blocker_report: "blocker_report.json",
    maturity_report: "maturity_report.json",
    staging_readiness: "staging_readiness.json",
    blocker_root_causes: "blocker_root_causes.json",
  },
};

export const FINALIZATION_AGENT_ORDER: GraphFinalizationAgent[] = [
  IdentityReuseAgent,
  OntologyConstraintAgent,
  RelationshipNormalizationAgent,
  SourceProvenanceAgent,
  ConnectivityAgent,
  CrossNeighborhoodLinkingAgent,
  ReviewBurdenReductionAgent,
  BackboneCoverageAgent,
  PublicationReadinessAgent,
];

export type GraphFinalizationPipelineResult = {
  input: GraphFinalizationInput;
  reports: GraphFinalizationAgentReport[];
  summary: Record<string, unknown>;
};

export class GraphFinalizationPipeline {
  private readonly agents: GraphFinalizationAgent[];

  constructor(agents: GraphFinalizationAgent[] = FINALIZATION_AGENT_ORDER) {
    this.agents = agents;
  }

  run(input: GraphFinalizationInput): GraphFinalizationPipelineResult {
    const context: GraphFinalizationContext = {
      startedAt: new Date().toISOString(),
      reports: [],
      fatal: false,
    };

    for (const agent of this.agents) {
      const report = agent.run(input, context);
      context.reports.push(report);
      if (report.result.escalations.some((escalation) => escalation.severity === "CRITICAL")) {
        context.fatal = true;
        break;
      }
    }

    const merged = mergeResults(context.reports);
    const summary = buildFinalizationSummary(input, context.reports, merged.metrics);
    return { input, reports: context.reports, summary };
  }

  async writeReports(result: GraphFinalizationPipelineResult, outputDirectory: string): Promise<void> {
    await mkdir(outputDirectory, { recursive: true });
    for (const report of result.reports) {
      const fileMap = AGENT_OUTPUT_FILES[report.agent] ?? {};
      for (const [artifactKey, filename] of Object.entries(fileMap)) {
        await writeJson(path.join(outputDirectory, filename), report.artifacts[artifactKey]);
      }
      await writeJson(path.join(outputDirectory, `${kebabCase(report.agent)}.json`), report);
    }
    await writeJson(path.join(outputDirectory, "finalization_summary.json"), result.summary);
    await writeJson(path.join(outputDirectory, "finalization-summary.json"), result.summary);
    const publicationReport = result.reports.find((report) => report.agent === "PublicationReadinessAgent");
    if (publicationReport) {
      await writeJson(path.join(outputDirectory, "staging-readiness.json"), publicationReport.artifacts.staging_readiness);
      await writeJson(path.join(outputDirectory, "publication-readiness.json"), publicationReport.artifacts.publication_readiness);
      await writeJson(path.join(outputDirectory, "blocker-root-causes.json"), publicationReport.artifacts.blocker_root_causes);
    }
    const sourceReport = result.reports.find((report) => report.agent === "SourceProvenanceAgent");
    if (sourceReport) await writeJson(path.join(outputDirectory, "provenance-requirements-report.json"), sourceReport.artifacts.provenance_report);
    const reviewReport = result.reports.find((report) => report.agent === "ReviewBurdenReductionAgent");
    if (reviewReport) await writeJson(path.join(outputDirectory, "review-inheritance-report.json"), reviewReport.artifacts.review_delta_report);
    const connectivityReport = result.reports.find((report) => report.agent === "ConnectivityAgent");
    if (connectivityReport) await writeJson(path.join(outputDirectory, "orphan-dispositions.json"), renderOrphanDispositions(connectivityReport.artifacts.orphan_report as Array<Record<string, unknown>> | undefined));
    const apbResolution = renderApbResolution(result, connectivityReport?.artifacts.orphan_report as Array<Record<string, unknown>> | undefined);
    if (apbResolution) await writeJson(path.join(outputDirectory, "apb-resolution.json"), apbResolution);
    await writeFile(path.join(outputDirectory, "finalization_summary.md"), renderSummaryMarkdown(result), "utf8");
    await writeFile(path.join(outputDirectory, "finalization-summary.md"), renderSummaryMarkdown(result), "utf8");
  }
}

function renderOrphanDispositions(orphans: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  return orphans.map((orphan) => {
    const slug = String(orphan.slug ?? "");
    const label = String(orphan.label ?? slug);
    const type = String(orphan.entityType ?? "");
    const placeholder = /instrument|placeholder|failed-release-evaluation|confirmed-recurrent/i.test(`${slug} ${label}`);
    return {
      entity: label,
      slug,
      current_type: type,
      why_orphaned: orphan.issue ?? "No generated relationship connects this entity to the graph.",
      final_disposition: orphan.finalDisposition ?? (placeholder ? "remove_or_convert_to_metadata" : "action_required_link_or_defer"),
      canonical_owner: orphan.canonicalOwner ?? null,
      canonical_slug: orphan.canonicalSlug ?? slug,
      staging_blocker: orphan.stagingBlocker ?? !placeholder,
      publication_blocker: orphan.publicationBlocker ?? true,
      proposed_linkage_or_removal: orphan.suggestedFix ?? (placeholder
        ? "Do not create arbitrary edges; remove from staging or represent as metadata until vocabulary exists."
        : "Resolve by safe linkage, removal, metadata conversion, or explicit deferral."),
    };
  });
}

function renderApbResolution(
  result: GraphFinalizationPipelineResult,
  orphans: Array<Record<string, unknown>> = []
): Record<string, unknown> | undefined {
  const apb = result.input.entities.find((entity) => entity.slug === "abductor-pollicis-brevis");
  if (!apb) return undefined;
  const orphan = orphans.find((item) => item.slug === "abductor-pollicis-brevis");
  const claims = result.input.claims.filter((claim) => /thenar|motor|median|electrodiagnostic|apb|abductor/i.test(claim.claimText));
  const decisionPoints = result.input.decisionPoints.filter((point) => /thenar|motor|denervation|electrodiagnostic|apb|abductor/i.test(`${point.trigger} ${point.action}`));
  return {
    field_resolution: {
      current_slug: apb.slug,
      canonical_slug: String(orphan?.canonicalSlug ?? apb.slug),
      entity_type: apb.entityType,
      owner_neighborhood: String(orphan?.canonicalOwner ?? "canonical-hand-anatomy-backbone"),
      disposition: "CROSS_NEIGHBORHOOD_REFERENCE",
      canonical_relationships: [
        {
          subject: apb.slug,
          predicate: "part_of",
          object: "canonical-hand-anatomy-backbone",
          status: "deferred_to_hand_anatomy_backbone",
        },
      ],
      cts_local_reference:
        "CTS may reference APB through thenar motor examination, thenar weakness/atrophy, denervation, and EDX teaching; no direct CTS disease-to-muscle edge is created.",
      staging_effect: "Satisfies staging connectivity as an explicit cross-neighborhood shared anatomy reference.",
      publication_effect: "Publication remains deferred until Hand anatomy backbone identity/provenance reconciliation is complete.",
    },
    audit: {
      why_generated: apb.description,
      referenced_by_claims: claims.map((claim) => claim.draftId),
      referenced_by_decision_points: decisionPoints.map((point) => point.draftId),
      local_relationship_references: result.input.relationships.filter((relationship) => relationship.subjectSlug === apb.slug || relationship.objectSlug === apb.slug),
      equivalent_canonical_identity: {
        found: false,
        note: "No alternate canonical slug was present in the supplied registry; current slug is retained as the proposed canonical Hand anatomy identity.",
      },
    },
  };
}

function buildFinalizationSummary(
  input: GraphFinalizationInput,
  reports: GraphFinalizationAgentReport[],
  metrics: FinalizationMetrics
): Record<string, unknown> {
  const publicationReport = reports.find((report) => report.agent === "PublicationReadinessAgent");
  const publicationReadiness = publicationReport?.artifacts.publication_readiness ?? {};
  const stagingReadiness = publicationReport?.artifacts.staging_readiness ?? {};
  const blockerRootCauses = (publicationReport?.artifacts.blocker_root_causes as unknown[] | undefined) ?? [];
  const reviewDelta = reports.find((report) => report.agent === "ReviewBurdenReductionAgent")?.artifacts.review_delta_report ?? {};
  const sourceReport = reports.find((report) => report.agent === "SourceProvenanceAgent")?.artifacts.provenance_report ?? {};
  const blockerReport = (publicationReport?.artifacts.blocker_report as unknown[] | undefined) ?? [];
  const warnings = reports.flatMap((report) => report.result.warnings);

  return {
    neighborhoodId: input.neighborhoodId,
    generatedAt: new Date().toISOString(),
    mode: "report_only_finalization",
    sourceArtifactsPreserved: true,
    agentOrder: reports.map((report) => report.agent),
    counts: {
      entities: input.entities.length,
      relationships: input.relationships.length,
      claims: input.claims.length,
      decisionPoints: input.decisionPoints.length,
      priorReviewDecisions: input.priorReviewDecisions.length,
    },
    metrics,
    decisionReadyCounts: {
      draftObjectsInspected: input.entities.length + input.relationships.length + input.claims.length + input.decisionPoints.length,
      issuesAutoResolved: metrics.relationshipsNormalized + metrics.duplicatesPrevented + metrics.orphanEntitiesRepaired,
      priorDecisionsInherited: metrics.reviewDecisionsInherited,
      semanticDecisionsInherited: Number((reviewDelta as Record<string, unknown>).semantic_inheritance_count ?? 0),
      relationshipsNormalized: metrics.relationshipsNormalized,
      objectsRequiringClinicalReview: reports.flatMap((report) => report.result.escalations).filter((item) =>
        ["clinical_expert", "attending", "rehabilitation", "electrodiagnostic_specialist"].includes(item.reviewer)
      ).length,
      objectsRequiringOntologyReview: reports.flatMap((report) => report.result.escalations).filter((item) => item.reviewer === "curator").length,
      systemBlockers: blockerReport.filter((item) => (item as Record<string, unknown>).category === "SYSTEM_BLOCKER").length,
      uniqueStagingBlockers: (stagingReadiness as Record<string, unknown>).unique_staging_blockers ?? 0,
      uniquePublicationBlockers: (publicationReadiness as Record<string, unknown>).unique_publication_blockers ?? 0,
      warnings: warnings.filter((warning) => warning.disposition !== "VALID_DEFER").length,
      validDeferrals: warnings.filter((warning) => warning.disposition === "VALID_DEFER").length,
    },
    publicationReadiness,
    stagingReadiness,
    blockerRootCauses,
    provenanceReport: sourceReport,
    reviewDelta,
    warnings: warnings.length,
    escalations: reports.flatMap((report) => report.result.escalations).length,
  };
}

function renderSummaryMarkdown(result: GraphFinalizationPipelineResult): string {
  const summary = result.summary as Record<string, unknown>;
  const metrics = summary.metrics as FinalizationMetrics;
  const publication = (summary.publicationReadiness ?? {}) as Record<string, unknown>;
  const staging = (summary.stagingReadiness ?? {}) as Record<string, unknown>;
  const reviewDelta = (summary.reviewDelta ?? {}) as Record<string, unknown>;
  const decisionCounts = (summary.decisionReadyCounts ?? {}) as Record<string, unknown>;
  return [
    `# KG Finalization Summary — ${result.input.neighborhoodId}`,
    "",
    "Mode: report-only finalization. No staging, persistence, publication, certification, database writes, or production KG mutation performed.",
    "",
    "## Agent order",
    "",
    ...result.reports.map((report, index) => `${index + 1}. ${report.agent}`),
    "",
    "## Metrics",
    "",
    `- Duplicates prevented: ${metrics.duplicatesPrevented}`,
    `- Relationships normalized: ${metrics.relationshipsNormalized}`,
    `- Unsupported edges removed/rejected: ${metrics.unsupportedEdgesRemoved}`,
    `- Review decisions inherited: ${metrics.reviewDecisionsInherited}`,
    `- Orphan entities repaired/recommended: ${metrics.orphanEntitiesRepaired}`,
    `- Publication blockers detected: ${metrics.publicationBlockersDetected}`,
    "",
    "## Decision-ready counts",
    "",
    `- Draft objects inspected: ${String(decisionCounts.draftObjectsInspected ?? "unknown")}`,
    `- Prior decisions inherited: ${String(decisionCounts.priorDecisionsInherited ?? 0)}`,
    `- Semantic decisions inherited: ${String(decisionCounts.semanticDecisionsInherited ?? 0)}`,
    `- Relationships normalized: ${String(decisionCounts.relationshipsNormalized ?? 0)}`,
    `- Unique staging blockers: ${String(decisionCounts.uniqueStagingBlockers ?? 0)}`,
    `- Unique publication blockers: ${String(decisionCounts.uniquePublicationBlockers ?? 0)}`,
    `- Warnings: ${String(decisionCounts.warnings ?? 0)}`,
    `- Valid deferrals: ${String(decisionCounts.validDeferrals ?? 0)}`,
    "",
    "## Staging readiness",
    "",
    `- Ready for staged manufacture: ${String(staging.ready_for_staged_manufacturing ?? false)}`,
    `- Unique staging blockers: ${String(staging.unique_staging_blockers ?? "unknown")}`,
    "",
    "## Publication readiness",
    "",
    `- Ready for publication: ${String(publication.ready_for_publication ?? false)}`,
    `- Unique publication blockers: ${String(publication.unique_publication_blockers ?? "unknown")}`,
    "",
    "## Review burden",
    "",
    `- Prior decisions: ${String(reviewDelta.priorReviewDecisions ?? 0)}`,
    `- Exact inherited decisions: ${String(reviewDelta.exact_inheritance_count ?? reviewDelta.exactFingerprintMatches ?? 0)}`,
    `- Semantic inherited decisions: ${String(reviewDelta.semantic_inheritance_count ?? 0)}`,
    `- Estimated review items avoided: ${String(reviewDelta.estimatedHumanReviewItemsAvoided ?? 0)}`,
    "",
  ].join("\n");
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function kebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}
