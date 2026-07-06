/**
 * Scaffold Adult Reconstruction cluster pilot spec files.
 * Run: node --experimental-strip-types scripts/scaffold-adult-reconstruction-cluster.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ADULT_RECONSTRUCTION_TOPIC_CATALOG } from "./lib/education/kg-adult-reconstruction-topic-catalog.ts";

const EDU = path.join(process.cwd(), "scripts", "lib", "education");

function toConstPrefix(topicKey: string): string {
  return topicKey
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("")
    .replace(/[^A-Za-z0-9]/g, "");
}

function generatePilotSpec(entry: (typeof ADULT_RECONSTRUCTION_TOPIC_CATALOG)[number]): string {
  const prefix = toConstPrefix(entry.topicKey);
  const pilotKey = `${entry.topicKey}-neighborhood`;
  const isOwner = entry.topicKey === "hip-osteoarthritis";

  const entityImport = isOwner
    ? `import {
  RECON_SHARED_ANATOMY_ENTITIES,
  RECON_SHARED_ANATOMY_RELATIONSHIPS,
  crossRefEntitiesForReconSibling,
  sharedHipAnatomyForReconSibling,
  sharedLeAnatomyForReconSibling,
} from "./kg-adult-reconstruction-shared-anatomy.ts";`
    : `import {
  crossRefEntitiesForReconSibling,
  sharedReconAnatomyEntitiesForSibling,
  sharedHipAnatomyForReconSibling,
  sharedLeAnatomyForReconSibling,
} from "./kg-adult-reconstruction-shared-anatomy.ts";`;

  const entitiesBlock = isOwner
    ? `export const ${prefix}_ENTITIES: PilotEntitySpec[] = [
  ...RECON_SHARED_ANATOMY_ENTITIES.map((e) => ({
    ...e,
    metadata: { ...e.metadata, cluster_owner: ${prefix}_PILOT_KEY },
  })),
  ...sharedHipAnatomyForReconSibling(${prefix}_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(${prefix}_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(${prefix}_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];`
    : `export const ${prefix}_ENTITIES: PilotEntitySpec[] = [
  ...sharedReconAnatomyEntitiesForSibling(${prefix}_PILOT_KEY),
  ...sharedHipAnatomyForReconSibling(${prefix}_PILOT_KEY),
  ...sharedLeAnatomyForReconSibling(${prefix}_PILOT_KEY),
  ...crossRefEntitiesForReconSibling(${prefix}_PILOT_KEY),
  ...TOPIC_SPECIFIC_ENTITIES,
];`;

  const relBlock = isOwner
    ? `export const ${prefix}_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...RECON_SHARED_ANATOMY_RELATIONSHIPS,
  ...TOPIC_RELATIONSHIPS,
];`
    : `export const ${prefix}_RELATIONSHIPS: PilotRelationshipSpec[] = [
  ...TOPIC_RELATIONSHIPS,
];`;

  const specificEntities = entry.specificEntities
    .map((e) => {
      const metaParts = [`pilot: ${prefix}_PILOT_KEY`];
      if (e.metadata?.clinical_kind) metaParts.push(`clinical_kind: "${e.metadata.clinical_kind}"`);
      if (e.metadata?.maturity_target) metaParts.push(`maturity_target: ${e.metadata.maturity_target}`);
      return `  { slug: "${e.slug}", entityType: "${e.entityType}", preferredLabel: "${e.preferredLabel}", description: ${JSON.stringify(e.description)}, metadata: { ${metaParts.join(", ")} } },`;
    })
    .join("\n");

  const baseRels = [
    `  rel("adult-reconstruction-anatomy-hub", "prerequisite_for", "${entry.primaryEntitySlug}", { anatomy_role: "essential", relevance_reason: "diagnosis", educational_importance: "high", context_relevance: ["clinic", "or"] }),`,
    `  rel("${entry.primaryEntitySlug}", "involves_anatomy", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis", relationship_strength: "core" }),`,
    `  rel("implant-concepts-hub", "prerequisite_for", "${entry.primaryEntitySlug}", { implant_role: "essential", relevance_reason: "arthroplasty" }),`,
  ];

  const extraRels = entry.extraRelationships.map((r) => {
    const metaStr = r.metadata ? JSON.stringify(r.metadata) : "{}";
    return `  rel("${r.subjectSlug}", "${r.predicate}", "${r.objectSlug}", ${metaStr}),`;
  });

  const claims = entry.claims
    .map(
      (c) => `  {
    draftId: "${c.draftId}",
    claimType: "${c.claimType}",
    claimText: ${JSON.stringify(c.claimText)},
    primaryEntitySlug: "${c.primaryEntitySlug}",
    importanceLevel: "${c.importanceLevel}",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: ${JSON.stringify(c.sourceNote)},
    contextRelevance: ${JSON.stringify(c.contextRelevance ?? ["clinic"])},
  },`
    )
    .join("\n");

  const dps = entry.decisionPoints
    .map(
      (dp) => `  {
    draftId: "${dp.draftId}",
    subjectEntitySlug: "${dp.subjectEntitySlug}",
    patternType: "${dp.patternType}",
    trigger: ${JSON.stringify(dp.trigger)},
    action: ${JSON.stringify(dp.action)},
    urgency: "${dp.urgency}",
    safetyCriticality: "${dp.safetyCriticality}",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: ${JSON.stringify(dp.sourceNote)},
    requiresAttendingReview: ${dp.requiresAttendingReview},
  },`
    )
    .join("\n");

  return `/**
 * ${entry.displayName} knowledge neighborhood — manufacturing seed.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
${entityImport}

export const ${prefix}_PILOT_KEY = "${pilotKey}" as const;

export const ${prefix}_SOURCE_IDS = {
  curriculumNodeSlug: "${entry.curriculumNodeSlug}",
  prepareTopicId: "${entry.prepareTopicId}",
  legacyRetargetProposalKey: "retarget:${entry.curriculumNodeSlug}",
} as const;

export const ${prefix}_ASSET_COUNTS = {
  ankiCardMappings: ${entry.anki},
  orthobulletsQuestionMappings: ${entry.ob},
} as const;

const TOPIC_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
${specificEntities}
];

${entitiesBlock}

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

const TOPIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
${[...baseRels, ...extraRels].join("\n")}
];

${relBlock}

export function active${prefix}Relationships(): PilotRelationshipSpec[] {
  return ${prefix}_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

export const ${prefix}_CLAIM_DRAFTS: PilotClaimDraft[] = [
${claims}
];

export const ${prefix}_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
${dps}
];
`;
}

function main() {
  mkdirSync(EDU, { recursive: true });
  for (const entry of ADULT_RECONSTRUCTION_TOPIC_CATALOG) {
    const outPath = path.join(EDU, `kg-${entry.topicKey}-pilot-spec.ts`);
    writeFileSync(outPath, generatePilotSpec(entry));
    console.log(`wrote ${outPath}`);
  }
  console.log(JSON.stringify({ ok: true, topics: ADULT_RECONSTRUCTION_TOPIC_CATALOG.length }, null, 2));
}

main();