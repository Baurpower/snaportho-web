import type { AuditCategoryKey, AuditDeduction, CategoryAuditResult } from "./types.ts";

export const CATEGORY_LABELS: Record<AuditCategoryKey, string> = {
  ontology_completeness: "Ontology Completeness",
  evidence_quality: "Evidence Quality",
  graph_integrity: "Graph Integrity",
  shared_knowledge_reuse: "Shared Knowledge Reuse",
  relationship_quality: "Relationship Quality",
  claim_quality: "Claim Quality",
  decision_point_quality: "Decision Points",
  metadata_quality: "Metadata Quality",
  provenance_quality: "Provenance Quality",
  review_calibration: "Review Calibration",
  agent_performance: "Agent Performance",
  compiler_quality: "Compiler Quality",
  educational_quality: "Educational Quality",
  cross_neighborhood_consistency: "Cross-Neighborhood Consistency",
  publication_readiness: "Publication Readiness",
};

export const CATEGORY_WEIGHTS: Record<AuditCategoryKey, number> = {
  ontology_completeness: 0.1,
  evidence_quality: 0.08,
  graph_integrity: 0.08,
  shared_knowledge_reuse: 0.05,
  relationship_quality: 0.08,
  claim_quality: 0.08,
  decision_point_quality: 0.07,
  metadata_quality: 0.05,
  provenance_quality: 0.05,
  review_calibration: 0.06,
  agent_performance: 0.05,
  compiler_quality: 0.05,
  educational_quality: 0.15,
  cross_neighborhood_consistency: 0.05,
  publication_readiness: 0.05,
};

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreFromDeductions(
  category: AuditCategoryKey,
  deductions: AuditDeduction[],
  metrics: Record<string, number | string | boolean> = {}
): CategoryAuditResult {
  const totalImpact = deductions.reduce((sum, d) => sum + d.impact, 0);
  const score = clampScore(100 - totalImpact);
  const recommendations = deductions
    .filter((d) => d.severity === "critical" || d.severity === "high")
    .slice(0, 8)
    .map((d) => d.suggestedFix);

  return {
    category,
    label: CATEGORY_LABELS[category],
    score,
    deductions,
    metrics,
    recommendations: [...new Set(recommendations)],
  };
}

export function weightedOverallScore(categories: Record<AuditCategoryKey, number>): number {
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(CATEGORY_WEIGHTS) as Array<[AuditCategoryKey, number]>) {
    if (key === "publication_readiness") continue;
    total += categories[key] * weight;
    weightSum += weight;
  }
  return clampScore(total / weightSum);
}

export function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function makeDeduction(input: Omit<AuditDeduction, "impact"> & { impact?: number }): AuditDeduction {
  return {
    ...input,
    impact: input.impact ?? severityToImpact(input.severity),
  };
}

function severityToImpact(severity: AuditDeduction["severity"]): number {
  switch (severity) {
    case "critical":
      return 15;
    case "high":
      return 8;
    case "medium":
      return 4;
    case "low":
      return 2;
    case "info":
      return 0.5;
    default:
      return 2;
  }
}