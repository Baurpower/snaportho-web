import type {
  NeighborhoodClaim,
  NeighborhoodDecisionPoint,
  NeighborhoodEntity,
  NeighborhoodRelationship,
} from "../kg-compiler/types.ts";
import type {
  FinalizationMetrics,
  GraphFinalizationAgentReport,
  GraphFinalizationInput,
  GraphFinalizationResult,
} from "./types.ts";
import { emptyMetrics } from "./types.ts";

export function normalizeText(value: string | undefined | null): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenJaccard(a: string, b: string): number {
  const left = new Set(normalizeText(a).split(" ").filter(Boolean));
  const right = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (left.size === 0 && right.size === 0) return 1;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

export function similarity(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.86;
  return tokenJaccard(left, right);
}

export function entityFingerprint(entity: Pick<NeighborhoodEntity, "slug" | "entityType">): string {
  return `entity|${entity.entityType}|${entity.slug}`;
}

export function relationshipFingerprint(relationship: NeighborhoodRelationship): string {
  return `relationship|${relationship.subjectSlug}|${relationship.predicate}|${relationship.objectSlug}`;
}

export function claimFingerprint(claim: NeighborhoodClaim): string {
  return `claim|${claim.draftId}|${claim.primaryEntitySlug}|${normalizeText(claim.claimText).slice(0, 96)}`;
}

export function decisionPointFingerprint(decisionPoint: NeighborhoodDecisionPoint): string {
  return `decision_point|${decisionPoint.draftId}|${decisionPoint.subjectEntitySlug}|${normalizeText(decisionPoint.trigger).slice(0, 64)}`;
}

export function findEntity(input: GraphFinalizationInput, slug: string): NeighborhoodEntity | undefined {
  return input.entities.find((entity) => entity.slug === slug);
}

export function entityLabel(input: GraphFinalizationInput, slug: string): string {
  return findEntity(input, slug)?.preferredLabel ?? slug;
}

export function objectFingerprint(kind: string, object: unknown): string {
  if (kind === "entity") return entityFingerprint(object as NeighborhoodEntity);
  if (kind === "relationship") return relationshipFingerprint(object as NeighborhoodRelationship);
  if (kind === "claim") return claimFingerprint(object as NeighborhoodClaim);
  if (kind === "decision_point") return decisionPointFingerprint(object as NeighborhoodDecisionPoint);
  return `${kind}|${JSON.stringify(object)}`;
}

export function buildDegreeMap(relationships: NeighborhoodRelationship[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const relationship of relationships) {
    degree.set(relationship.subjectSlug, (degree.get(relationship.subjectSlug) ?? 0) + 1);
    degree.set(relationship.objectSlug, (degree.get(relationship.objectSlug) ?? 0) + 1);
  }
  return degree;
}

export function mergeMetrics(...metrics: FinalizationMetrics[]): FinalizationMetrics {
  const merged = emptyMetrics();
  for (const metricSet of metrics) {
    for (const [key, value] of Object.entries(metricSet)) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

export function mergeResults(reports: GraphFinalizationAgentReport[]): GraphFinalizationResult {
  return {
    approved: reports.flatMap((report) => report.result.approved),
    modified: reports.flatMap((report) => report.result.modified),
    rejected: reports.flatMap((report) => report.result.rejected),
    escalations: reports.flatMap((report) => report.result.escalations),
    warnings: reports.flatMap((report) => report.result.warnings),
    metrics: mergeMetrics(...reports.map((report) => report.result.metrics)),
  };
}

export function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const marker = key(value);
    if (seen.has(marker)) return false;
    seen.add(marker);
    return true;
  });
}

export function readObjectValue(object: unknown, path: string[]): unknown {
  let current: unknown = object;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
