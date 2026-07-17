import type { GraphFinalizationAgent, GraphFinalizationAgentReport } from "./types.ts";
import { emptyResult } from "./types.ts";
import { entityFingerprint, normalizeText, similarity, uniqueBy } from "./utils.ts";

type IdentityReuseArtifacts = {
  reuse_map: Array<Record<string, unknown>>;
  alias_candidates: Array<Record<string, unknown>>;
  merge_candidates: Array<Record<string, unknown>>;
  identity_escalations: Array<Record<string, unknown>>;
};

export const IdentityReuseAgent: GraphFinalizationAgent<IdentityReuseArtifacts> = {
  name: "IdentityReuseAgent",
  run(input): GraphFinalizationAgentReport<IdentityReuseArtifacts> {
    const result = emptyResult();
    const artifacts: IdentityReuseArtifacts = {
      reuse_map: [],
      alias_candidates: [],
      merge_candidates: [],
      identity_escalations: [],
    };

    const registry = input.canonicalRegistry;
    for (const entity of input.entities) {
      const fingerprint = entityFingerprint(entity);
      const candidates = registry
        .filter((entry) => entry.slug !== entity.slug)
        .map((entry) => {
          const labelScore = similarity(entity.preferredLabel, entry.preferredLabel);
          const slugScore = similarity(entity.slug.replace(/-/g, " "), entry.slug.replace(/-/g, " "));
          const aliasScore = Math.max(0, ...(entry.aliases ?? []).map((alias) => similarity(entity.preferredLabel, alias)));
          const score = Math.max(labelScore, slugScore, aliasScore);
          return { entry, score };
        })
        .filter(({ score }) => score >= 0.55)
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      if (!best) continue;

      const payload = {
        fingerprint,
        proposedSlug: entity.slug,
        proposedLabel: entity.preferredLabel,
        proposedType: entity.entityType,
        canonicalSlug: best.entry.slug,
        canonicalLabel: best.entry.preferredLabel,
        canonicalType: best.entry.entityType,
        confidence: Number(best.score.toFixed(3)),
      };

      if (best.score >= 0.92 && String(best.entry.entityType) === String(entity.entityType)) {
        artifacts.reuse_map.push({
          ...payload,
          action: "reuse_existing_identity",
        });
        result.modified.push({
          fingerprint,
          objectKind: "entity",
          agent: this.name,
          reason: "High-confidence canonical identity match; proposal should reuse the existing KG object.",
          before: entity,
          after: { canonicalSlug: best.entry.slug, preferredLabel: best.entry.preferredLabel },
          confidence: best.score,
        });
        result.metrics.duplicatesPrevented += 1;
      } else if (best.score >= 0.75) {
        artifacts.alias_candidates.push({
          ...payload,
          action: "curator_confirm_alias_or_distinct_identity",
        });
        result.escalations.push({
          id: `identity-alias-${entity.slug}`,
          fingerprint,
          objectKind: "entity",
          agent: this.name,
          severity: "MODERATE",
          reason: "Plausible alias or near-duplicate identity below auto-reuse threshold.",
          reviewer: "curator",
          suggestedAction: "Confirm alias mapping, merge, or keep as distinct identity.",
        });
      } else {
        artifacts.identity_escalations.push({
          ...payload,
          action: "curator_adjudication_required",
        });
        result.escalations.push({
          id: `identity-escalation-${entity.slug}`,
          fingerprint,
          objectKind: "entity",
          agent: this.name,
          severity: "MODERATE",
          reason: "Ambiguous identity match; finalization will not guess.",
          reviewer: "curator",
          suggestedAction: "Resolve identity before staging or publication.",
        });
      }
    }

    const byLabel = new Map<string, typeof input.entities>();
    for (const entity of input.entities) {
      const key = `${normalizeText(entity.preferredLabel)}|${entity.entityType}`;
      byLabel.set(key, [...(byLabel.get(key) ?? []), entity]);
    }
    for (const duplicates of byLabel.values()) {
      if (duplicates.length < 2) continue;
      artifacts.merge_candidates.push({
        reason: "Multiple generated entities share the same normalized label and entity type.",
        entities: duplicates.map((entity) => ({
          slug: entity.slug,
          label: entity.preferredLabel,
          entityType: entity.entityType,
          fingerprint: entityFingerprint(entity),
        })),
      });
      result.metrics.duplicatesPrevented += duplicates.length - 1;
    }

    artifacts.reuse_map = uniqueBy(artifacts.reuse_map, (item) => String(item.fingerprint));
    artifacts.alias_candidates = uniqueBy(artifacts.alias_candidates, (item) => `${item.fingerprint}|${item.canonicalSlug}`);
    artifacts.identity_escalations = uniqueBy(artifacts.identity_escalations, (item) => `${item.fingerprint}|${item.canonicalSlug}`);

    return { agent: this.name, generatedAt: new Date().toISOString(), result, artifacts };
  },
};
