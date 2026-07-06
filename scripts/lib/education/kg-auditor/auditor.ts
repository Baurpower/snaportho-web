import type { AuditInputBundle, BatchSummary, OverallDashboard, TopicAuditArtifacts, TopicScorecard } from "./types.ts";
import { AUDITOR_VERSION } from "./types.ts";
import {
  evaluateAgentPerformance,
  evaluateClaimQuality,
  evaluateCompilerQuality,
  evaluateCrossNeighborhoodConsistency,
  evaluateDecisionPointQuality,
  evaluateEducationalQuality,
  evaluateEvidenceQuality,
  evaluateGraphIntegrity,
  evaluateMetadataQuality,
  evaluateOntologyCompleteness,
  evaluateProvenanceQuality,
  evaluatePublicationReadiness,
  evaluateRelationshipQuality,
  evaluateReviewCalibration,
  evaluateSharedKnowledgeReuse,
} from "./evaluators.ts";
import { weightedOverallScore } from "./scoring.ts";

export function auditNeighborhood(
  input: AuditInputBundle,
  crossNeighborhoodInputs?: AuditInputBundle[]
): TopicAuditArtifacts {
  const ontologyAudit = evaluateOntologyCompleteness(input);
  const evidenceQuality = evaluateEvidenceQuality(input);
  const graphIntegrity = evaluateGraphIntegrity(input);
  const sharedReuse = evaluateSharedKnowledgeReuse(input);
  const relationshipAudit = evaluateRelationshipQuality(input);
  const claimAudit = evaluateClaimQuality(input);
  const decisionPointAudit = evaluateDecisionPointQuality(input);
  const metadataQuality = evaluateMetadataQuality(input);
  const provenanceQuality = evaluateProvenanceQuality(input);
  const reviewCalibration = evaluateReviewCalibration(input);
  const agentPerf = evaluateAgentPerformance(input);
  const compilerReportCard = evaluateCompilerQuality(input);
  const educationalQuality = evaluateEducationalQuality(input);
  const publicationAudit = evaluatePublicationReadiness(input);

  const crossNeighborhood =
    crossNeighborhoodInputs && crossNeighborhoodInputs.length > 1
      ? evaluateCrossNeighborhoodConsistency(crossNeighborhoodInputs)
      : evaluateCrossNeighborhoodConsistency([input]);

  const categoryResults = [
    ontologyAudit,
    evidenceQuality,
    graphIntegrity,
    sharedReuse,
    relationshipAudit,
    claimAudit,
    decisionPointAudit,
    metadataQuality,
    provenanceQuality,
    reviewCalibration,
    agentPerf.category,
    {
      category: "compiler_quality" as const,
      label: "Compiler Quality",
      score: compilerReportCard.overallScore,
      deductions: compilerReportCard.deductions,
      metrics: compilerReportCard.metrics,
      recommendations: compilerReportCard.deductions
        .filter((d) => d.severity === "critical" || d.severity === "high")
        .map((d) => d.suggestedFix),
    },
    educationalQuality,
    crossNeighborhood,
    {
      category: "publication_readiness" as const,
      label: "Publication Readiness",
      score: publicationAudit.score,
      deductions: publicationAudit.deductions,
      metrics: {
        status: publicationAudit.status,
        ready: publicationAudit.ready,
        blockerCount: publicationAudit.blockers.length,
      },
      recommendations: publicationAudit.blockers,
    },
  ];

  const categories = Object.fromEntries(
    categoryResults.map((c) => [c.category, c.score])
  ) as TopicScorecard["categories"];

  const allDeductions = categoryResults.flatMap((c) => c.deductions);
  const topFindings = [...allDeductions]
    .sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      return diff !== 0 ? diff : b.impact - a.impact;
    })
    .slice(0, 15);

  const prioritizedRecommendations = topFindings.slice(0, 10).map((d, i) => ({
    priority: i + 1,
    action: d.suggestedFix,
    category: d.category,
    impact: d.finding,
  }));

  const scorecard: TopicScorecard = {
    generatedAt: new Date().toISOString(),
    auditorVersion: AUDITOR_VERSION,
    topicKey: input.topicKey,
    pilotKey: input.pilotKey,
    displayName: input.displayName,
    dataSource: {
      neighborhood: input.dataSource,
      reportsLoaded: input.reportsLoaded,
      reportsMissing: input.reportsMissing,
    },
    overallScore: weightedOverallScore(categories),
    categories,
    publication: publicationAudit,
    topFindings,
    prioritizedRecommendations,
    databaseModified: false,
  };

  return {
    scorecard,
    categoryResults,
    ontologyAudit,
    graphIntegrity,
    relationshipAudit,
    claimAudit,
    decisionPointAudit,
    reviewCalibration,
    agentReportCards: agentPerf.reportCards,
    compilerReportCard,
    publicationAudit,
    crossNeighborhood,
  };
}

export function buildBatchSummary(
  batchKey: string,
  displayName: string,
  artifacts: TopicAuditArtifacts[]
): BatchSummary {
  const neighborhoods = artifacts.map((a) => ({
    topicKey: a.scorecard.topicKey,
    displayName: a.scorecard.displayName,
    overallScore: a.scorecard.overallScore,
    publicationStatus: a.publicationAudit.status,
    reviewBurden:
      Number(a.reviewCalibration.metrics.humanReviewPercent) ||
      Number(a.reviewCalibration.metrics.expertReviewCount) ||
      0,
    blockers: a.publicationAudit.blockers,
  }));

  const avgScore =
    neighborhoods.length === 0
      ? 0
      : Math.round(neighborhoods.reduce((s, n) => s + n.overallScore, 0) / neighborhoods.length);

  const maturityLevels = artifacts.map((a) => a.publicationAudit.currentLevel);
  const factoryMaturity =
    maturityLevels.length === 0
      ? 0
      : Math.round(maturityLevels.reduce((s, m) => s + m, 0) / maturityLevels.length);

  const categoryAvgs = new Map<string, { sum: number; count: number }>();
  for (const artifact of artifacts) {
    for (const [key, score] of Object.entries(artifact.scorecard.categories)) {
      const entry = categoryAvgs.get(key) ?? { sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      categoryAvgs.set(key, entry);
    }
  }

  let weakestCategory = "educational_quality";
  let strongestCategory = "graph_integrity";
  let weakestScore = 100;
  let strongestScore = 0;
  for (const [key, { sum, count }] of categoryAvgs.entries()) {
    const avg = sum / count;
    if (avg < weakestScore) {
      weakestScore = avg;
      weakestCategory = key;
    }
    if (avg > strongestScore) {
      strongestScore = avg;
      strongestCategory = key;
    }
  }

  const outstandingBlockers = [
    ...new Set(artifacts.flatMap((a) => a.publicationAudit.blockers)),
  ].slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    auditorVersion: AUDITOR_VERSION,
    batchKey,
    displayName,
    neighborhoods,
    aggregate: {
      averageOverallScore: avgScore,
      factoryMaturity,
      publicationReadyCount: neighborhoods.filter((n) => n.publicationStatus === "READY").length,
      publicationBlockedCount: neighborhoods.filter((n) => n.publicationStatus === "NOT_READY").length,
      totalReviewBurden: neighborhoods.reduce((s, n) => s + n.reviewBurden, 0),
      outstandingBlockers,
      weakestCategory: weakestCategory as BatchSummary["aggregate"]["weakestCategory"],
      strongestCategory: strongestCategory as BatchSummary["aggregate"]["strongestCategory"],
    },
    rankings: {
      byQuality: [...neighborhoods]
        .sort((a, b) => b.overallScore - a.overallScore)
        .map((n) => n.topicKey),
      byPublicationReadiness: [...neighborhoods]
        .sort((a, b) => {
          if (a.publicationStatus !== b.publicationStatus) {
            return a.publicationStatus === "READY" ? -1 : 1;
          }
          return b.overallScore - a.overallScore;
        })
        .map((n) => n.topicKey),
    },
    databaseModified: false,
  };
}

export function buildOverallDashboard(
  batchSummaries: BatchSummary[],
  allArtifacts: TopicAuditArtifacts[]
): OverallDashboard {
  const allNeighborhoods = allArtifacts.map((a) => ({
    topicKey: a.scorecard.topicKey,
    displayName: a.scorecard.displayName,
    score: a.scorecard.overallScore,
    ready: a.publicationAudit.ready,
  }));

  const categoryFrequency = new Map<string, { sum: number; count: number; example: string }>();
  for (const artifact of allArtifacts) {
    for (const result of artifact.categoryResults) {
      if (result.score >= 80) continue;
      const entry = categoryFrequency.get(result.category) ?? {
        sum: 0,
        count: 0,
        example: result.deductions[0]?.finding ?? "",
      };
      entry.sum += result.score;
      entry.count += 1;
      if (!entry.example && result.deductions[0]) {
        entry.example = result.deductions[0].finding;
      }
      categoryFrequency.set(result.category, entry);
    }
  }

  const systemicWeaknesses = [...categoryFrequency.entries()]
    .map(([category, { sum, count, example }]) => ({
      category: category as OverallDashboard["systemicWeaknesses"][0]["category"],
      averageScore: Math.round(sum / count),
      frequency: count,
      exampleFinding: example,
    }))
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 8);

  const ontologyRules = new Map<string, number>();
  for (const artifact of allArtifacts) {
    for (const gap of artifact.ontologyAudit.deductions) {
      const match = gap.evidence.match(/ontologyRule[:\s]+([\w.]+)/);
      if (match) ontologyRules.set(match[1], (ontologyRules.get(match[1]) ?? 0) + 1);
    }
  }

  const agentGrades = new Map<string, { grades: string[]; count: number }>();
  for (const artifact of allArtifacts) {
    for (const card of artifact.agentReportCards) {
      const entry = agentGrades.get(card.agentId) ?? { grades: [], count: 0 };
      entry.grades.push(card.grade);
      entry.count += 1;
      agentGrades.set(card.agentId, entry);
    }
  }

  const agentLeaderboard = [...agentGrades.entries()]
    .map(([agentId, { grades, count }]) => {
      const gradeValues = grades.map((g) =>
        g === "A" ? 4 : g === "B" ? 3 : g === "C" ? 2 : g === "D" ? 1 : 0
      );
      const avg = gradeValues.reduce((s, v) => s + v, 0) / gradeValues.length;
      const avgGrade = avg >= 3.5 ? "A" : avg >= 2.5 ? "B" : avg >= 1.5 ? "C" : avg >= 0.5 ? "D" : "F";
      return { agentId, averageGrade: avgGrade, topicsAudited: count };
    })
    .sort((a, b) => b.topicsAudited - a.topicsAudited);

  return {
    generatedAt: new Date().toISOString(),
    auditorVersion: AUDITOR_VERSION,
    neighborhoodCount: allArtifacts.length,
    batches: batchSummaries,
    globalRankings: {
      byQuality: [...allNeighborhoods].sort((a, b) => b.score - a.score),
      byPublicationReadiness: [...allNeighborhoods].sort((a, b) => {
        if (a.ready !== b.ready) return a.ready ? -1 : 1;
        return b.score - a.score;
      }),
    },
    systemicWeaknesses,
    agentLeaderboard,
    ontologyViolationFrequency: [...ontologyRules.entries()]
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    duplicateConceptHotspots: [],
    databaseModified: false,
  };
}