/**
 * Factory for Hand & Wrist cluster pilot specifications.
 * Manufacturing seeds only — manufactured neighborhoods are the pipeline outputs.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import type { HandWristNeighborhoodDef } from "./kg-hand-wrist-cluster-definitions.ts";
import {
  COMPARTMENT_SYNDROME_REFERENCE_RELATIONSHIPS,
  HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
  HAND_WRIST_SHARED_ANATOMY_ENTITIES,
  sharedCompartmentSyndromeReference,
  sharedHandWristAnatomyEntitiesForSibling,
} from "./kg-hand-wrist-shared-anatomy.ts";

export type HandWristPilotSpec = {
  pilotKey: string;
  sourceIds: {
    curriculumNodeSlug: string;
    prepareTopicId: string;
    casePrepSlug?: string;
    legacyRetargetProposalKey: string;
  };
  assetCounts: { ankiCardMappings: number; orthobulletsQuestionMappings: number };
  entities: PilotEntitySpec[];
  relationships: PilotRelationshipSpec[];
  claimDrafts: PilotClaimDraft[];
  decisionPointDrafts: PilotDecisionPointDraft[];
};

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

function pilotKeyFor(def: HandWristNeighborhoodDef): string {
  return `${def.topicKey}-neighborhood`;
}

function buildExtraEntities(def: HandWristNeighborhoodDef, pilotKey: string): PilotEntitySpec[] {
  const slug = def.topicKey;
  const extras: PilotEntitySpec[] = [];
  const kinds = def.extraEntityKinds ?? [];

  if (kinds.includes("classification")) {
    extras.push({
      slug: `${slug}-classification`,
      entityType: "classification_system",
      preferredLabel: `${def.displayName} Classification`,
      description: `Classification framework for ${def.displayName.toLowerCase()} pattern recognition and management planning.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("imaging")) {
    extras.push({
      slug: `${slug}-key-imaging-finding`,
      entityType: "imaging_finding",
      preferredLabel: `${def.displayName} Key Imaging Finding`,
      description: `Characteristic imaging finding for ${def.displayName.toLowerCase()}.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("procedure")) {
    extras.push({
      slug: `${slug}-operative-treatment`,
      entityType: "procedure",
      preferredLabel: `${def.displayName} Operative Treatment`,
      description: `Operative management pathway for ${def.displayName.toLowerCase()} when nonoperative care is insufficient.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("complication")) {
    extras.push({
      slug: `${slug}-key-complication`,
      entityType: "complication",
      preferredLabel: `${def.displayName} Key Complication`,
      description: `Important complication to recognize after ${def.displayName.toLowerCase()}.`,
      metadata: { pilot: pilotKey },
    });
  }
  if (kinds.includes("treatment_principle")) {
    extras.push({
      slug: `${slug}-nonoperative-principle`,
      entityType: "treatment_principle",
      preferredLabel: `${def.displayName} Nonoperative Principle`,
      description: `Nonoperative management principle for ${def.displayName.toLowerCase()}.`,
      metadata: { pilot: pilotKey },
    });
  }

  return extras;
}

function crossNeighborhoodReferenceEntities(relatedKeys: string[], pilotKey: string): PilotEntitySpec[] {
  return relatedKeys.map((key) => ({
    slug: key,
    entityType: "condition",
    preferredLabel: key
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    description: `Cross-neighborhood reference stub for ${key} (owner: ${key}-neighborhood).`,
    metadata: {
      shared_reference: true,
      cross_neighborhood: true,
      owner_pilot: `${key}-neighborhood`,
      pilot: pilotKey,
    },
  }));
}

function buildConditionEntity(def: HandWristNeighborhoodDef, pilotKey: string): PilotEntitySpec {
  return {
    slug: def.topicKey,
    entityType: "condition",
    preferredLabel: def.displayName,
    description: `Prepare Hand rotation neighborhood for ${def.displayName} — ${def.categoryLabel}.`,
    metadata: { clinical_kind: def.clinicalKind, pilot: pilotKey, maturity_target: 6, cluster: "hand-wrist" },
  };
}

function buildAnatomyRelationships(def: HandWristNeighborhoodDef): PilotRelationshipSpec[] {
  const rels: PilotRelationshipSpec[] = [
    rel("hand-wrist-anatomy-hub", "prerequisite_for", def.topicKey, {
      anatomy_role: "essential",
      relevance_reason: "diagnosis",
      educational_importance: "high",
      context_relevance: ["clinic", "or", "call"],
    }),
  ];

  for (const anatomySlug of def.primaryAnatomySlugs) {
    rels.push(
      rel(def.topicKey, "involves_anatomy", anatomySlug, {
        anatomy_role: "essential",
        relevance_reason: "diagnosis",
        relationship_strength: "core",
        clinical_importance: "high",
      }),
      rel(def.topicKey, "injured_in", anatomySlug, {
        anatomy_role: "essential",
        relevance_reason: "anatomic_focus",
        clinical_importance: "high",
      })
    );
  }

  return rels;
}

function buildCrossNeighborhoodRelationships(def: HandWristNeighborhoodDef): PilotRelationshipSpec[] {
  return def.relatedTopicKeys.map((relatedKey) =>
    rel(def.topicKey, "differential_for", relatedKey, {
      cross_neighborhood: true,
      cluster: "hand-wrist",
      relevance_reason: "clinical_association",
      educational_importance: "high",
    })
  );
}

function buildClaims(def: HandWristNeighborhoodDef): PilotClaimDraft[] {
  const slug = def.topicKey;
  const anatomyList = def.primaryAnatomySlugs.slice(0, 3).join(", ");

  if (slug === "carpal-tunnel-syndrome") {
    return [
      {
        draftId: `claim-${slug}-clinical-pattern`,
        claimType: "fact",
        claimText:
          "Carpal tunnel syndrome evaluation combines the symptom pattern, focused median nerve examination, and selective diagnostic testing rather than relying on routine imaging.",
        primaryEntitySlug: slug,
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; source before manufacture",
        contextRelevance: ["clinic", "oite"],
      },
      {
        draftId: `claim-${slug}-anatomy`,
        claimType: "anatomy_pearl",
        claimText:
          "Carpal tunnel syndrome localizes to the median nerve within the carpal tunnel; release planning also requires review of median nerve branch anatomy.",
        primaryEntitySlug: "median-nerve",
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending anatomy review required",
        contextRelevance: ["clinic", "or", "oite"],
      },
      {
        draftId: `claim-${slug}-exam`,
        claimType: "clinical_script",
        claimText:
          "Document sensory distribution, thenar motor findings, and provocative maneuvers while considering proximal median neuropathy, cervical radiculopathy, and other mimics.",
        primaryEntitySlug: slug,
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; source before manufacture",
        contextRelevance: ["clinic", "oite"],
      },
      {
        draftId: `claim-${slug}-testing`,
        claimType: "diagnostic_point",
        claimText:
          "Electrodiagnostic testing is a selective diagnostic and severity tool; MRI and repeat radiographs are not routine CTS follow-up tests.",
        primaryEntitySlug: slug,
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; EDX specialist review required",
        contextRelevance: ["clinic", "oite"],
      },
      {
        draftId: `claim-${slug}-treatment-options`,
        claimType: "clinical_script",
        claimText:
          "CTS treatment planning distinguishes neutral-position night splinting and corticosteroid injection from named open and endoscopic release procedures.",
        primaryEntitySlug: slug,
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        contextRelevance: ["clinic", "or"],
      },
      {
        draftId: `claim-${slug}-complications`,
        claimType: "cognitive_trap",
        claimText:
          "Persistent symptoms, recurrent symptoms, incomplete release, pillar pain, and iatrogenic nerve injury are distinct concepts and should not be collapsed into a generic complication.",
        primaryEntitySlug: slug,
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        contextRelevance: ["clinic", "or", "oite"],
      },
      {
        draftId: `claim-${slug}-postoperative`,
        claimType: "rehab_pearl",
        claimText:
          "Post-release activity, therapy, and return-to-work guidance should be individualized; routine fracture-style immobilization and repeat radiographs do not apply.",
        primaryEntitySlug: slug,
        importanceLevel: "L2",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending and rehabilitation review required",
        contextRelevance: ["clinic"],
      },
      {
        draftId: `claim-${slug}-oite-trap`,
        claimType: "board_trap",
        claimText:
          "OITE content should distinguish palmar cutaneous and recurrent motor branch anatomy, selective test use, and persistent symptoms from recurrent disease and incomplete release.",
        primaryEntitySlug: slug,
        importanceLevel: "L1",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; educator and domain review required",
        contextRelevance: ["oite"],
      },
    ];
  }

  return [
    {
      draftId: `claim-${slug}-mechanism`,
      claimType: "fact",
      claimText: `${def.displayName} evaluation should anchor on mechanism, focused exam, and the anatomic structures most at risk (${anatomyList}).`,
      primaryEntitySlug: slug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `hand-wrist-cluster-definitions.ts / ${def.category}`,
      contextRelevance: ["clinic", "call"],
    },
    {
      draftId: `claim-${slug}-board-trap`,
      claimType: "board_trap",
      claimText: `Missing ${def.primaryAnatomySlugs[0] ?? "key anatomy"} assessment in ${def.displayName.toLowerCase()} is a common board and OITE trap.`,
      primaryEntitySlug: def.primaryAnatomySlugs[0] ?? slug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "hand-wrist manufacturing seed",
      contextRelevance: ["oite", "clinic"],
    },
    {
      draftId: `claim-${slug}-anatomy-pearl`,
      claimType: "anatomy_pearl",
      claimText: `Shared hand-wrist anatomy (${anatomyList}) links ${def.displayName} to adjacent Prepare neighborhoods in the cluster graph.`,
      primaryEntitySlug: "hand-wrist-anatomy-hub",
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "hand-wrist-shared-anatomy.ts",
      contextRelevance: ["clinic", "or"],
    },
    {
      draftId: `claim-${slug}-cognitive-trap`,
      claimType: "cognitive_trap",
      claimText: `Treating ${def.displayName.toLowerCase()} in isolation without checking related wrist, tendon, or nerve neighborhoods in the cluster.`,
      primaryEntitySlug: slug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "cross-neighborhood connectivity requirement",
      contextRelevance: ["clinic", "oite"],
    },
    {
      draftId: `claim-${slug}-clinical-script`,
      claimType: "clinical_script",
      claimText: `Document neurovascular status, key anatomic structures (${anatomyList}), stability assessment, and escalation plan for ${def.displayName.toLowerCase()}.`,
      primaryEntitySlug: slug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "Prepare Hand rotation script",
      contextRelevance: ["clinic", "call"],
    },
    {
      draftId: `claim-${slug}-imaging`,
      claimType: "imaging_point",
      claimText: `Obtain appropriate hand/wrist imaging for ${def.displayName.toLowerCase()} and explicitly comment on articular alignment and adjacent joint stability.`,
      primaryEntitySlug: slug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "hand-wrist manufacturing seed",
      contextRelevance: ["clinic"],
    },
    {
      draftId: `claim-${slug}-rehab`,
      claimType: "rehab_pearl",
      claimText: `Early protected motion and therapy goals for ${def.displayName.toLowerCase()} should align with tendon, ligament, and joint stability constraints.`,
      primaryEntitySlug: slug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "Prepare Hand rehabilitation concept",
      contextRelevance: ["clinic"],
    },
  ];
}

function buildDecisionPoints(def: HandWristNeighborhoodDef): PilotDecisionPointDraft[] {
  const slug = def.topicKey;

  if (slug === "carpal-tunnel-syndrome") {
    return [
      {
        draftId: `dp-${slug}-testing`,
        subjectEntitySlug: slug,
        patternType: "diagnostic_escalation",
        trigger:
          "Atypical presentation, uncertain localization or severity, competing diagnosis, or a result expected to change management",
        action:
          "Consider targeted electrodiagnostic or other supported testing; do not default to routine radiographs or MRI",
        urgency: "routine",
        safetyCriticality: "moderate",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; EDX specialist review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-nonoperative`,
        subjectEntitySlug: slug,
        patternType: "nonoperative_eligible",
        trigger:
          "Presentation appropriate for an initial nonoperative pathway without an attending-reviewed escalation indication",
        action:
          "Discuss education, neutral-position night splinting, and/or corticosteroid injection with source-specific expectations and follow-up",
        urgency: "routine",
        safetyCriticality: "moderate",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-operative`,
        subjectEntitySlug: slug,
        patternType: "operative_indication",
        trigger:
          "Persistent function-limiting symptoms after appropriate care, severe disease, or objective motor or denervation findings",
        action:
          "Discuss a named carpal tunnel release option after confirming diagnosis, severity, patient factors, and goals",
        urgency: "urgent",
        safetyCriticality: "moderate",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-approach-choice`,
        subjectEntitySlug: slug,
        patternType: "operative_approach",
        trigger:
          "A reviewed surgical indication is present and open versus endoscopic technique is being selected",
        action:
          "Use shared decision-making informed by anatomy, prior surgery, risks, resources, patient preference, and surgeon expertise",
        urgency: "routine",
        safetyCriticality: "moderate",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-endoscopic-bailout`,
        subjectEntitySlug: "endoscopic-carpal-tunnel-release",
        patternType: "operative_bailout",
        trigger:
          "Inadequate visualization, anomalous anatomy, bleeding, or another safety concern during endoscopic release",
        action: "Stop or convert according to an attending-approved bailout protocol",
        urgency: "urgent",
        safetyCriticality: "high",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-persistent-symptoms`,
        subjectEntitySlug: "persistent-carpal-tunnel-syndrome-after-release",
        patternType: "revision_evaluation",
        trigger: "Symptoms do not adequately improve after carpal tunnel release",
        action:
          "Reassess diagnosis, localization, severity, and release completeness before considering revision",
        urgency: "routine",
        safetyCriticality: "moderate",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-recurrent-symptoms`,
        subjectEntitySlug: "recurrent-carpal-tunnel-syndrome",
        patternType: "revision_evaluation",
        trigger: "CTS symptoms return after a period of improvement following release",
        action: "Evaluate recurrent compression and alternative causes before considering revision",
        urgency: "routine",
        safetyCriticality: "moderate",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending review required",
        requiresAttendingReview: true,
      },
      {
        draftId: `dp-${slug}-postoperative-escalation`,
        subjectEntitySlug: "carpal-tunnel-release-postoperative-protocol",
        patternType: "postoperative_escalation",
        trigger:
          "Progressive neurologic deficit, vascular concern, wound concern, or severe unexpected postoperative pain",
        action: "Obtain prompt surgical assessment under the treating team's protocol",
        urgency: "urgent",
        safetyCriticality: "high",
        contentSource: "generated_draft",
        reviewStatus: "needs_review",
        sourceNote: "CTS vertical preparation; attending and rehabilitation review required",
        requiresAttendingReview: true,
      },
    ];
  }

  const isEmergency =
    def.category === "infection-emergency" ||
    def.clinicalKind === "emergency" ||
    def.clinicalKind === "infection";
  const isOperative =
    def.extraEntityKinds?.includes("procedure") ||
    def.clinicalKind === "fracture" ||
    def.clinicalKind === "fracture_dislocation" ||
    def.clinicalKind === "dislocation" ||
    def.clinicalKind === "tendon_injury";

  const dps: PilotDecisionPointDraft[] = [];

  if (isEmergency) {
    dps.push({
      draftId: `dp-${slug}-emergency`,
      subjectEntitySlug: slug,
      patternType: "emergency_treatment",
      trigger: `Kanavel signs, rapidly progressive swelling, neurovascular compromise, or systemic toxicity in ${def.displayName.toLowerCase()}`,
      action: "Urgent operative drainage, escalation, and broad-spectrum antibiotics per attending protocol; document neurovascular status serially",
      urgency: "emergent",
      safetyCriticality: "emergency",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "infection-emergency routing → ATTENDING_REVIEW",
      requiresAttendingReview: true,
    });
  }

  if (isOperative) {
    dps.push({
      draftId: `dp-${slug}-operative`,
      subjectEntitySlug: slug,
      patternType: "operative_indication",
      trigger: `Unstable pattern, displacement, failed closed treatment, or functional deficit in ${def.displayName.toLowerCase()}`,
      action: "Proceed with operative pathway when indicated; document fixation strategy, tendon/nerve protection, and postoperative plan",
      urgency: "urgent",
      safetyCriticality: "moderate",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "operative routing → ATTENDING_REVIEW",
      requiresAttendingReview: true,
    });
  }

  dps.push({
    draftId: `dp-${slug}-nonoperative`,
    subjectEntitySlug: slug,
    patternType: "nonoperative_eligible",
    trigger: `Stable pattern with acceptable alignment and intact neurovascular exam for ${def.displayName.toLowerCase()}`,
    action: "Splint/immobilize with therapy plan, repeat exam and imaging, and clear return precautions",
    urgency: "routine",
    safetyCriticality: "none",
    contentSource: "generated_draft",
    reviewStatus: "needs_review",
    sourceNote: "Prepare Hand nonoperative pathway",
    requiresAttendingReview: true,
  });

  return dps;
}

export function buildHandWristPilotSpec(def: HandWristNeighborhoodDef): HandWristPilotSpec {
  const pilotKey = pilotKeyFor(def);
  const condition = buildConditionEntity(def, pilotKey);
  const extras = buildExtraEntities(def, pilotKey);
  const crossRefs = crossNeighborhoodReferenceEntities(
    def.relatedTopicKeys.filter((k) => k !== def.topicKey),
    pilotKey
  );

  let entities: PilotEntitySpec[];
  let relationships: PilotRelationshipSpec[];

  if (def.isSharedAnatomyOwner) {
    entities = [
      ...HAND_WRIST_SHARED_ANATOMY_ENTITIES.map((e) => ({
        ...e,
        metadata: { ...e.metadata, cluster_owner: pilotKey },
      })),
      condition,
      ...extras,
      ...crossRefs,
    ];
    relationships = [
      ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
      ...buildAnatomyRelationships(def),
      ...buildCrossNeighborhoodRelationships(def),
    ];
  } else {
    entities = [...sharedHandWristAnatomyEntitiesForSibling(pilotKey), condition, ...extras, ...crossRefs];
    if (def.crossClusterRefs?.includes("compartment-syndrome")) {
      entities.push(...sharedCompartmentSyndromeReference(pilotKey));
    }
    relationships = [
      ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
      ...buildAnatomyRelationships(def),
      ...buildCrossNeighborhoodRelationships(def),
    ];
    if (def.crossClusterRefs?.includes("compartment-syndrome")) {
      relationships.push(...COMPARTMENT_SYNDROME_REFERENCE_RELATIONSHIPS);
    }
  }

  if (def.topicKey === "carpal-tunnel-syndrome") {
    entities.push(
      {
        slug: "recurrent-motor-branch-median-nerve",
        entityType: "anatomy_structure",
        preferredLabel: "Recurrent Motor Branch of the Median Nerve",
        description: "Median nerve motor branch relevant to thenar function and carpal tunnel release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "palmar-cutaneous-branch-median-nerve",
        entityType: "anatomy_structure",
        preferredLabel: "Palmar Cutaneous Branch of the Median Nerve",
        description: "Median nerve sensory branch relevant to localization and operative exposure.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "abductor-pollicis-brevis",
        entityType: "anatomy_structure",
        preferredLabel: "Abductor Pollicis Brevis",
        description: "Thenar muscle used in focused median motor examination and electrodiagnostic assessment.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "phalen-test",
        entityType: "exam_maneuver",
        preferredLabel: "Phalen Test",
        description: "Provocative wrist-flexion maneuver used as one component of CTS assessment.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "tinel-sign-carpal-tunnel",
        entityType: "exam_maneuver",
        preferredLabel: "Tinel Sign at the Carpal Tunnel",
        description: "Median nerve percussion maneuver used as one component of CTS assessment.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "durkan-carpal-compression-test",
        entityType: "exam_maneuver",
        preferredLabel: "Durkan Carpal Compression Test",
        description: "Direct carpal tunnel compression maneuver used as one component of CTS assessment.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "electrodiagnostic-testing-carpal-tunnel-syndrome",
        entityType: "diagnostic_test",
        preferredLabel: "Electrodiagnostic Testing for Carpal Tunnel Syndrome",
        description: "Combined electrodiagnostic evaluation used selectively for CTS diagnosis, localization, and severity assessment.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "EDX_SPECIALIST_REVIEW" },
      },
      {
        slug: "nerve-conduction-study",
        entityType: "diagnostic_test",
        preferredLabel: "Nerve Conduction Study",
        description: "Electrodiagnostic test measuring peripheral nerve conduction.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "EDX_SPECIALIST_REVIEW" },
      },
      {
        slug: "needle-electromyography",
        entityType: "diagnostic_test",
        preferredLabel: "Needle Electromyography",
        description: "Needle examination of muscle electrical activity used as a component of electrodiagnostic evaluation.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "EDX_SPECIALIST_REVIEW" },
      },
      {
        slug: "neutral-wrist-night-orthosis-for-cts",
        entityType: "treatment_principle",
        preferredLabel: "Neutral Wrist Night Orthosis for CTS",
        description: "CTS-specific nonoperative night orthosis principle, distinct from fracture immobilization.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "corticosteroid-injection-for-cts",
        entityType: "procedure",
        preferredLabel: "Corticosteroid Injection for CTS",
        description: "Local corticosteroid injection used for selected patients with CTS.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "open-carpal-tunnel-release",
        entityType: "procedure",
        preferredLabel: "Open Carpal Tunnel Release",
        description: "Open operative decompression procedure for CTS.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "endoscopic-carpal-tunnel-release",
        entityType: "procedure",
        preferredLabel: "Endoscopic Carpal Tunnel Release",
        description: "Endoscopic operative decompression procedure for CTS.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "open-carpal-tunnel-approach",
        entityType: "surgical_approach",
        preferredLabel: "Open Carpal Tunnel Approach",
        description: "Open palmar exposure for carpal tunnel release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "endoscopic-carpal-tunnel-approach",
        entityType: "surgical_approach",
        preferredLabel: "Endoscopic Carpal Tunnel Approach",
        description: "Endoscopic portal exposure for carpal tunnel release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "carpal-tunnel-release-instrument-set",
        entityType: "implant",
        preferredLabel: "Carpal Tunnel Release Instrument Set",
        description: "Technique-dependent instrument set for open or endoscopic carpal tunnel release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "pillar-pain-after-carpal-tunnel-release",
        entityType: "complication",
        preferredLabel: "Pillar Pain After Carpal Tunnel Release",
        description: "Postoperative pain localized around the carpal tunnel pillars after release.",
        metadata: { pilot: pilotKey, review_status: "needs_review" },
      },
      {
        slug: "incomplete-transverse-carpal-ligament-release",
        entityType: "complication",
        preferredLabel: "Incomplete Carpal Tunnel Release",
        description: "Incomplete operative decompression considered during evaluation of persistent symptoms.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "persistent-carpal-tunnel-syndrome-after-release",
        entityType: "condition",
        preferredLabel: "Persistent Carpal Tunnel Syndrome After Release",
        description: "CTS symptoms that do not adequately improve after release; distinct from recurrence after improvement.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "recurrent-carpal-tunnel-syndrome",
        entityType: "condition",
        preferredLabel: "Recurrent Carpal Tunnel Syndrome",
        description: "Return of CTS symptoms after a period of improvement following release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "revision-carpal-tunnel-release",
        entityType: "procedure",
        preferredLabel: "Revision Carpal Tunnel Release",
        description: "Revision decompression procedure considered after source-supported evaluation of failed release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "ATTENDING_REVIEW" },
      },
      {
        slug: "carpal-tunnel-release-postoperative-protocol",
        entityType: "treatment_principle",
        preferredLabel: "Carpal Tunnel Release Postoperative Protocol",
        description: "Individualized postoperative care and rehabilitation framework after carpal tunnel release.",
        metadata: { pilot: pilotKey, review_status: "needs_review", curation_route: "REHAB_REVIEW" },
      }
    );

    relationships.push(
      rel("recurrent-motor-branch-median-nerve", "part_of", "median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("palmar-cutaneous-branch-median-nerve", "part_of", "median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("carpal-tunnel-syndrome", "tested_by", "phalen-test", { review_status: "needs_review" }),
      rel("carpal-tunnel-syndrome", "tested_by", "tinel-sign-carpal-tunnel", { review_status: "needs_review" }),
      rel("carpal-tunnel-syndrome", "tested_by", "durkan-carpal-compression-test", { review_status: "needs_review" }),
      rel("carpal-tunnel-syndrome", "tested_by", "electrodiagnostic-testing-carpal-tunnel-syndrome", {
        review_status: "needs_review",
        curation_route: "EDX_SPECIALIST_REVIEW",
      }),
      rel("carpal-tunnel-syndrome", "tested_by", "nerve-conduction-study", {
        review_status: "needs_review",
        curation_route: "EDX_SPECIALIST_REVIEW",
      }),
      rel("carpal-tunnel-syndrome", "tested_by", "needle-electromyography", {
        review_status: "needs_review",
        curation_route: "EDX_SPECIALIST_REVIEW",
      }),
      rel("carpal-tunnel-syndrome", "treated_by", "neutral-wrist-night-orthosis-for-cts", {
        review_status: "needs_review",
      }),
      rel("carpal-tunnel-syndrome", "treated_by", "corticosteroid-injection-for-cts", {
        review_status: "needs_review",
      }),
      rel("corticosteroid-injection-for-cts", "involves_anatomy", "carpal-tunnel", {
        review_status: "needs_review",
      }),
      rel("corticosteroid-injection-for-cts", "at_risk_structure", "median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("carpal-tunnel-syndrome", "treated_by", "open-carpal-tunnel-release", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("carpal-tunnel-syndrome", "treated_by", "endoscopic-carpal-tunnel-release", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "uses_approach", "open-carpal-tunnel-approach", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("endoscopic-carpal-tunnel-release", "uses_approach", "endoscopic-carpal-tunnel-approach", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "uses_implant", "carpal-tunnel-release-instrument-set", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("endoscopic-carpal-tunnel-release", "uses_implant", "carpal-tunnel-release-instrument-set", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "at_risk_structure", "median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "at_risk_structure", "recurrent-motor-branch-median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "at_risk_structure", "palmar-cutaneous-branch-median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("endoscopic-carpal-tunnel-release", "at_risk_structure", "median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("endoscopic-carpal-tunnel-release", "at_risk_structure", "recurrent-motor-branch-median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "has_complication", "pillar-pain-after-carpal-tunnel-release", {
        review_status: "needs_review",
      }),
      rel("open-carpal-tunnel-release", "has_complication", "incomplete-transverse-carpal-ligament-release", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("endoscopic-carpal-tunnel-release", "has_complication", "incomplete-transverse-carpal-ligament-release", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("persistent-carpal-tunnel-syndrome-after-release", "treated_by", "revision-carpal-tunnel-release", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("recurrent-carpal-tunnel-syndrome", "treated_by", "revision-carpal-tunnel-release", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("open-carpal-tunnel-release", "involves_anatomy", "carpal-tunnel", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("endoscopic-carpal-tunnel-release", "involves_anatomy", "carpal-tunnel", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("revision-carpal-tunnel-release", "involves_anatomy", "carpal-tunnel", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      }),
      rel("revision-carpal-tunnel-release", "at_risk_structure", "median-nerve", {
        review_status: "needs_review",
        curation_route: "ATTENDING_REVIEW",
      })
    );
  }

  // Link extras to condition
  for (const extra of extras) {
    if (extra.entityType === "imaging_finding") {
      relationships.push(
        rel(def.topicKey, "has_imaging_finding", extra.slug, {
          relevance_reason: "imaging",
          management_importance: "high",
        })
      );
    }
    if (extra.entityType === "procedure") {
      relationships.push(
        rel(def.topicKey, "treated_by", extra.slug, {
          management_importance: "high",
          context_relevance: ["or"],
          review_status: "needs_review",
        })
      );
      if (def.extraEntityKinds?.includes("imaging")) {
        relationships.push(
          rel(`${def.topicKey}-key-imaging-finding`, "indicates_treatment", extra.slug, {
            management_importance: "high",
            confidence: 0.78,
            review_status: "needs_review",
          })
        );
      }
    }
    if (extra.entityType === "complication") {
      relationships.push(rel(def.topicKey, "has_complication", extra.slug));
    }
  }

  // At-risk nerve structures for nerve compression topics
  if (def.clinicalKind === "nerve_compression") {
    for (const nerveSlug of def.primaryAnatomySlugs.filter((s) => s.includes("nerve") || s === "carpal-tunnel" || s === "guyon-canal")) {
      relationships.push(
        rel(def.topicKey, "at_risk_structure", nerveSlug.includes("nerve") ? nerveSlug : "median-nerve", {
          anatomy_role: "essential",
          relevance_reason: "neurovascular_risk",
          clinical_importance: "high",
          context_relevance: ["clinic", "or"],
        })
      );
    }
  }

  return {
    pilotKey,
    sourceIds: {
      curriculumNodeSlug: def.curriculumNodeSlug,
      prepareTopicId: def.prepareTopicId,
      casePrepSlug: def.casePrepSlug,
      legacyRetargetProposalKey: `retarget:${def.curriculumNodeSlug}`,
    },
    assetCounts: {
      ankiCardMappings: def.ankiCardMappings,
      orthobulletsQuestionMappings: def.orthobulletsQuestionMappings,
    },
    entities,
    relationships: relationships.filter((r) => !r.metadata?.disabled),
    claimDrafts: buildClaims(def),
    decisionPointDrafts: buildDecisionPoints(def),
  };
}

export function activeHandWristRelationships(spec: HandWristPilotSpec): PilotRelationshipSpec[] {
  return spec.relationships.filter((r) => !r.metadata?.disabled);
}
