import { createHash } from "node:crypto";
import {
  analyzeKgCardEvidence,
  type KgCardEvidence,
} from "./anki-kg-draft";
import { normalizeClinicalText } from "./deck-semantic-mapping";

export const KG_IMPROVEMENT_CONTRACT =
  "snaportho-anki-kg-improvement.v1" as const;

export type ImprovementEntity = {
  id: string;
  preferredLabel: string;
  normalizedLabel: string;
  entityType: string;
  aliases: string[];
  description?: string;
};

export type ExistingClaim = {
  id: string;
  primaryEntityId: string;
  claimText: string;
  claimType: string;
  reviewStatus: string;
};

export type HierarchyNode = {
  id: string;
  label: string;
  entityType: string;
};

export type GraphOperation =
  | {
      id: string;
      kind: "add_asset_mapping";
      risk: "low";
      entityId: string;
      entityLabel: string;
      mappingRole: "teaches";
      statement: string;
      evidence: string;
    }
  | {
      id: string;
      kind: "propose_entity";
      risk: "high";
      proposedLabel: string;
      entityType: string;
      statement: string;
      evidence: string;
    }
  | {
      id: string;
      kind: "propose_claim";
      risk: "medium";
      primaryEntityId: string | null;
      primaryEntityLabel: string;
      claimText: string;
      claimType: "fact";
      statement: string;
      evidence: string;
    };

export type QualityGate = {
  gate:
    | "subject_resolution"
    | "hierarchy_attachment"
    | "answer_entity_separation"
    | "claim_atomicity"
    | "duplicate_check"
    | "evidence_present";
  decision: "pass" | "review" | "block";
  reason: string;
};

export type KgImprovement = {
  contractVersion: typeof KG_IMPROVEMENT_CONTRACT;
  improvementId: string;
  title: string;
  summary: string;
  subject: {
    label: string;
    entityId: string | null;
    entityType: string | null;
    resolution: "existing" | "proposed" | "unresolved";
    hierarchyPath: HierarchyNode[];
    hierarchyStatus: "anchored" | "needs_parent" | "unresolved";
  };
  operations: GraphOperation[];
  qualityGates: QualityGate[];
  reviewTier: "streamlined" | "clinical_review" | "ontology_review";
  canSubmit: boolean;
  noChangeReason: string | null;
  nextRequiredLayer: {
    kind: "resolve_subject" | "select_parent";
    label: string;
    reason: string;
  } | null;
  evidence: KgCardEvidence;
  algorithmVersion: "graph_diff_v2_hierarchy";
};

function stableId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 20);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function extractSubjectLabel(stem: string): string {
  const sentences = stem
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length > 1) {
    const allMentionBone = sentences.every((sentence) => /\bbones?\b/i.test(sentence));
    return allMentionBone ? "Bone" : "";
  }
  const clean = normalizeClinicalText(stem)
    .replace(/\b(one|two|three|four|five|six|main|key|primary)\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const ofMatch = clean.match(
    /\b(?:functions?|features?|properties|complications?|treatments?|indications?) of (.+)$/,
  );
  if (ofMatch?.[1]) return titleCase(ofMatch[1].trim());
  const whatMatch = clean.match(
    /^(?:what is|what are|define|describe|name|list) (?:the )?(.+)$/,
  );
  if (whatMatch?.[1]) return titleCase(whatMatch[1].trim());
  const beforeColon = stem.split(":")[0]?.trim() ?? "";
  if (beforeColon && beforeColon.length <= 80) return titleCase(beforeColon);
  return "";
}

function inferSafeEntityType(label: string): string | null {
  const value = normalizeClinicalText(label);
  if (
    /\b(bone|joint|nerve|artery|vein|muscle|tendon|ligament|cartilage|fascia|bursa|marrow)\b/.test(
      value,
    )
  )
    return "anatomy_structure";
  if (/\b(fracture|tear|syndrome|disease|arthritis|infection|necrosis)\b/.test(value))
    return "condition";
  if (/\b(approach|repair|fixation|arthroplasty|osteotomy|fusion)\b/.test(value))
    return "procedure";
  if (/\b(classification|grade|staging)\b/.test(value))
    return "classification_system";
  return null;
}

function resolveSubject(
  label: string,
  entities: ImprovementEntity[],
): { entity: ImprovementEntity | null; ambiguous: boolean } {
  const normalized = normalizeClinicalText(label);
  const exact = entities.filter((entity) =>
    [entity.normalizedLabel, ...entity.aliases.map(normalizeClinicalText)].includes(
      normalized,
    ),
  );
  return {
    entity: exact.length === 1 ? exact[0]! : null,
    ambiguous: exact.length > 1,
  };
}

function normalizeContextualClaim(context: string): string {
  const clean = context
    .replace(/\s*::\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]+$/, "");
  const ossification = clean.match(
    /^(.+?\bbones?)\s+are formed by ossification\s*:?\s*(endochondral|intramembranous)$/i,
  );
  if (ossification) {
    const subject = ossification[1]!.toLowerCase();
    return `${subject[0]!.toUpperCase()}${subject.slice(1)} are formed by ${ossification[2]!.toLowerCase()} ossification.`;
  }
  if (clean.split(/\s+/).length >= 4)
    return `${clean[0]!.toUpperCase()}${clean.slice(1)}.`;
  return "";
}

function normalizeClaim(subject: string, answer: string, context = ""): string {
  const contextual = normalizeContextualClaim(context);
  if (contextual) return contextual;
  const clean = answer.trim().replace(/[.;]+$/, "");
  const lower = normalizeClinicalText(clean);
  const subjectText = subject || "The subject";
  if (/\battachment (?:site|sites)? for muscles\b/.test(lower))
    return `${subjectText} provides attachment sites for muscles.`;
  if (/\bprotect(?:s|ion)? (?:of )?organs\b/.test(lower))
    return `${subjectText} protects organs.`;
  if (/\bmineral (?:reservoir|storage)\b/.test(lower))
    return `${subjectText} stores minerals.`;
  if (lower === "hematopoiesis" || lower === "haematopoiesis")
    return `${subjectText} supports hematopoiesis.`;
  if (/^[a-z][a-z -]{2,80}$/i.test(clean))
    return `${subjectText}: ${clean}.`;
  return "";
}

function isAtomicClaim(claim: string): boolean {
  const withoutFinalPeriod = claim.trim().replace(/[.!?]$/, "");
  if (!withoutFinalPeriod || /[.!?;]/.test(withoutFinalPeriod)) return false;
  return !/\b(?:and|but)\s+(?:the\s+)?[a-z][a-z -]+\s+(?:is|are|has|have|does|do)\b/i.test(
    withoutFinalPeriod,
  );
}

function claimFingerprint(value: string): string {
  return normalizeClinicalText(value)
    .replace(/\b(provides?|supports?|serves? as|site of|site for)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicateClaim(claim: string, existing: ExistingClaim[]): boolean {
  const fingerprint = claimFingerprint(claim);
  return existing.some((item) => {
    const candidate = claimFingerprint(item.claimText);
    return candidate === fingerprint || candidate.includes(fingerprint) || fingerprint.includes(candidate);
  });
}

export function buildKgImprovement(input: {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  fields: Array<{
    name: string;
    rawValue?: string;
    value?: string;
    plainText?: string;
  }>;
  entities: ImprovementEntity[];
  existingClaims: ExistingClaim[];
  existingEntityIds: string[];
  hierarchyPaths?: Record<string, HierarchyNode[]>;
}): KgImprovement {
  const evidence = analyzeKgCardEvidence(input.fields);
  const extractedSubjectLabel = extractSubjectLabel(evidence.stem);
  const exactResolution = resolveSubject(extractedSubjectLabel, input.entities);
  const linkedEntities = input.entities.filter((entity) =>
    input.existingEntityIds.includes(entity.id),
  );
  const resolution =
    exactResolution.entity || exactResolution.ambiguous || linkedEntities.length !== 1
      ? exactResolution
      : { entity: linkedEntities[0]!, ambiguous: false };
  const subjectLabel =
    resolution.entity?.preferredLabel ?? extractedSubjectLabel;
  const safeEntityType = inferSafeEntityType(subjectLabel);
  const subjectResolution = resolution.entity
    ? "existing"
    : subjectLabel && safeEntityType && !resolution.ambiguous
      ? "proposed"
      : "unresolved";
  const operations: GraphOperation[] = [];
  const gates: QualityGate[] = [];
  const hierarchyPath = resolution.entity
    ? input.hierarchyPaths?.[resolution.entity.id] ?? [
        {
          id: resolution.entity.id,
          label: resolution.entity.preferredLabel,
          entityType: resolution.entity.entityType,
        },
      ]
    : [];
  const hierarchyStatus = resolution.entity
    ? "anchored"
    : subjectResolution === "proposed"
      ? "needs_parent"
      : "unresolved";

  if (resolution.entity) {
    gates.push({
      gate: "subject_resolution",
      decision: "pass",
      reason: `Resolved exactly to ${resolution.entity.preferredLabel}.`,
    });
    if (!input.existingEntityIds.includes(resolution.entity.id)) {
      operations.push({
        id: stableId(`map|${input.canonicalCardVersionId}|${resolution.entity.id}`),
        kind: "add_asset_mapping",
        risk: "low",
        entityId: resolution.entity.id,
        entityLabel: resolution.entity.preferredLabel,
        mappingRole: "teaches",
        statement: `Connect this card to ${resolution.entity.preferredLabel}.`,
        evidence: evidence.stem,
      });
    }
  } else if (subjectResolution === "proposed") {
    gates.push({
      gate: "subject_resolution",
      decision: "review",
      reason: `${subjectLabel} has no exact governed entity match and requires ontology review.`,
    });
  } else {
    gates.push({
      gate: "subject_resolution",
      decision: "block",
      reason: resolution.ambiguous
        ? "The card subject matches multiple canonical entities."
        : "The card subject could not be resolved safely.",
    });
  }

  if (hierarchyStatus === "anchored") {
    gates.push({
      gate: "hierarchy_attachment",
      decision: "pass",
      reason: `Governed path: ${hierarchyPath.map((node) => node.label).join(" → ")}.`,
    });
  } else if (hierarchyStatus === "needs_parent") {
    gates.push({
      gate: "hierarchy_attachment",
      decision: "block",
      reason: `Choose a governed parent for ${subjectLabel} before proposing the entity or any leaf facts.`,
    });
  } else {
    gates.push({
      gate: "hierarchy_attachment",
      decision: "block",
      reason: "Resolve the card's top-level subject, then choose its governed parent before adding detailed facts.",
    });
  }

  gates.push({
    gate: "answer_entity_separation",
    decision: "pass",
    reason: "Cloze answers are modeled as claims, not canonical entities.",
  });

  const primaryEntityId = resolution.entity?.id ?? null;
  let atomicClaims = 0;
  let duplicates = 0;
  const claimEvidence = evidence.clozeClaims.length
    ? evidence.clozeClaims
    : evidence.answerConcepts.map((answer) => ({ answer, context: "" }));
  for (const item of claimEvidence) {
    const claim = normalizeClaim(subjectLabel, item.answer, item.context);
    if (!claim || !isAtomicClaim(claim)) continue;
    atomicClaims += 1;
    // A fact without a governed primary entity becomes an orphaned leaf. Keep
    // the evidence, but defer the graph operation until the hierarchy exists.
    if (!resolution.entity || hierarchyStatus !== "anchored") continue;
    if (isDuplicateClaim(claim, input.existingClaims)) {
      duplicates += 1;
      continue;
    }
    operations.push({
      id: stableId(`claim|${claim}|${input.canonicalCardVersionId}`),
      kind: "propose_claim",
      risk: "medium",
      primaryEntityId,
      primaryEntityLabel: subjectLabel,
      claimText: claim,
      claimType: "fact",
      statement: `Add the verified teaching fact: “${claim}”`,
      evidence: item.answer,
    });
  }

  gates.push({
    gate: "claim_atomicity",
    decision:
      !resolution.entity || hierarchyStatus !== "anchored"
        ? "review"
        : atomicClaims === claimEvidence.length
          ? "pass"
          : "review",
    reason:
      !resolution.entity || hierarchyStatus !== "anchored"
        ? `${atomicClaims} atomic fact(s) were retained as evidence but deferred until the subject hierarchy is anchored.`
        : `${atomicClaims} of ${claimEvidence.length} cloze facts were reconstructed as atomic claims.`,
  });
  gates.push({
    gate: "duplicate_check",
    decision: "pass",
    reason: duplicates
      ? `${duplicates} existing equivalent claim(s) were suppressed.`
      : "No equivalent reviewed claims were found.",
  });
  gates.push({
    gate: "evidence_present",
    decision: evidence.answerConcepts.length ? "pass" : "block",
    reason: evidence.answerConcepts.length
      ? "Every proposed claim retains its exact cloze-answer evidence."
      : "No answer evidence was available.",
  });

  const blocked = gates.some((gate) => gate.decision === "block");
  const hasHighRisk = operations.some((operation) => operation.risk === "high");
  const hasMediumRisk = operations.some((operation) => operation.risk === "medium");
  const reviewTier = hierarchyStatus !== "anchored" || hasHighRisk
    ? "ontology_review"
    : hasMediumRisk
      ? "clinical_review"
      : "streamlined";
  const claimCount = operations.filter((operation) => operation.kind === "propose_claim").length;
  const mappingCount = operations.filter(
    (operation) => operation.kind === "add_asset_mapping",
  ).length;
  const entityCount = operations.filter((operation) => operation.kind === "propose_entity").length;
  const pieces = [
    mappingCount ? `connect this card to ${subjectLabel}` : "",
    claimCount ? `add ${claimCount} teaching fact${claimCount === 1 ? "" : "s"}` : "",
    entityCount ? `send ${subjectLabel} for ontology review` : "",
  ].filter(Boolean);
  const summary = pieces.length
    ? `${pieces.join(" and ")}.`
    : duplicates
      ? "The graph already represents the supported knowledge from this card."
      : hierarchyStatus === "needs_parent"
        ? `Start with ${subjectLabel}: select a governed parent before adding detailed teaching facts.`
        : hierarchyStatus === "unresolved"
          ? "Start at the top: resolve the card subject and its governed parent before adding detailed teaching facts."
          : "No safe graph improvement could be produced.";
  const nextRequiredLayer =
    hierarchyStatus === "needs_parent"
      ? {
          kind: "select_parent" as const,
          label: subjectLabel,
          reason: `A new ${safeEntityType?.replaceAll("_", " ") ?? "concept"} must attach to an existing governed parent.`,
        }
      : hierarchyStatus === "unresolved"
        ? {
            kind: "resolve_subject" as const,
            label: "Card subject",
            reason: "Identify the broad subject first; then build downward through parent concepts to claims.",
          }
        : null;

  return {
    contractVersion: KG_IMPROVEMENT_CONTRACT,
    improvementId: stableId(
      `${input.canonicalCardVersionId}|${subjectLabel}|${operations.map((operation) => operation.id).join(",")}`,
    ),
    title: subjectLabel ? `Improve knowledge about ${subjectLabel}` : "No safe improvement",
    summary: summary[0]!.toUpperCase() + summary.slice(1),
    subject: {
      label: subjectLabel,
      entityId: primaryEntityId,
      entityType: resolution.entity?.entityType ?? safeEntityType,
      resolution: subjectResolution,
      hierarchyPath,
      hierarchyStatus,
    },
    operations,
    qualityGates: gates,
    reviewTier,
    canSubmit: !blocked && operations.length > 0,
    noChangeReason:
      operations.length === 0
        ? duplicates
          ? "already_represented"
          : "no_safe_graph_delta"
        : null,
    nextRequiredLayer,
    evidence,
    algorithmVersion: "graph_diff_v2_hierarchy",
  };
}
