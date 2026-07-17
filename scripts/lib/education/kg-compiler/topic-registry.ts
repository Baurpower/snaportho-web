/**
 * Topic registry — maps canonical topic keys to neighborhood loaders.
 * Ontology-driven: new pilots register here; compiler logic stays generic.
 */

import {
  TRAUMA_FUNDAMENTALS_ASSET_COUNTS,
  TRAUMA_FUNDAMENTALS_CLAIM_DRAFTS,
  TRAUMA_FUNDAMENTALS_DECISION_POINT_DRAFTS,
  TRAUMA_FUNDAMENTALS_ENTITIES,
  TRAUMA_FUNDAMENTALS_PILOT_KEY,
  TRAUMA_FUNDAMENTALS_SOURCE_IDS,
  activeTraumaFundamentalsRelationships,
} from "../kg-trauma-fundamentals-pilot-spec.ts";
import {
  SURGICAL_APPROACHES_ASSET_COUNTS,
  SURGICAL_APPROACHES_CLAIM_DRAFTS,
  SURGICAL_APPROACHES_DECISION_POINT_DRAFTS,
  SURGICAL_APPROACHES_ENTITIES,
  SURGICAL_APPROACHES_PILOT_KEY,
  SURGICAL_APPROACHES_SOURCE_IDS,
  activeSurgicalApproachesRelationships,
} from "../kg-surgical-approaches-pilot-spec.ts";
import {
  CLAVICLE_ASSET_COUNTS,
  CLAVICLE_CLAIM_DRAFTS,
  CLAVICLE_DECISION_POINT_DRAFTS,
  CLAVICLE_ENTITIES,
  CLAVICLE_PILOT_KEY,
  CLAVICLE_SOURCE_IDS,
  activeClavicleRelationships,
} from "../kg-clavicle-fracture-pilot-spec.ts";
import {
  DISTAL_HUMERUS_ASSET_COUNTS,
  DISTAL_HUMERUS_CLAIM_DRAFTS,
  DISTAL_HUMERUS_DECISION_POINT_DRAFTS,
  DISTAL_HUMERUS_ENTITIES,
  DISTAL_HUMERUS_PILOT_KEY,
  DISTAL_HUMERUS_SOURCE_IDS,
  activeDistalHumerusRelationships,
} from "../kg-distal-humerus-fracture-pilot-spec.ts";
import {
  HUMERAL_SHAFT_ASSET_COUNTS,
  HUMERAL_SHAFT_CLAIM_DRAFTS,
  HUMERAL_SHAFT_DECISION_POINT_DRAFTS,
  HUMERAL_SHAFT_ENTITIES,
  HUMERAL_SHAFT_PILOT_KEY,
  HUMERAL_SHAFT_SOURCE_IDS,
  activeHumeralShaftRelationships,
} from "../kg-humeral-shaft-fracture-pilot-spec.ts";
import {
  PROXIMAL_HUMERUS_ASSET_COUNTS,
  PROXIMAL_HUMERUS_CLAIM_DRAFTS,
  PROXIMAL_HUMERUS_DECISION_POINT_DRAFTS,
  PROXIMAL_HUMERUS_ENTITIES,
  PROXIMAL_HUMERUS_PILOT_KEY,
  PROXIMAL_HUMERUS_SOURCE_IDS,
  activeProximalHumerusRelationships,
} from "../kg-proximal-humerus-fracture-pilot-spec.ts";
import {
  SUPRACONDYLAR_ASSET_COUNTS,
  SUPRACONDYLAR_CLAIM_DRAFTS,
  SUPRACONDYLAR_DECISION_POINT_DRAFTS,
  SUPRACONDYLAR_ENTITIES,
  SUPRACONDYLAR_PILOT_KEY,
  SUPRACONDYLAR_SOURCE_IDS,
  activeSupracondylarRelationships,
} from "../kg-supracondylar-humerus-fracture-pilot-spec.ts";
import {
  ANKLE_ASSET_COUNTS,
  ANKLE_CLAIM_DRAFTS,
  ANKLE_DECISION_POINT_DRAFTS,
  ANKLE_ENTITIES,
  ANKLE_PILOT_KEY,
  ANKLE_SOURCE_IDS,
  activeAnkleRelationships,
} from "../kg-ankle-pilot-spec.ts";
import {
  COMPARTMENT_SYNDROME_ASSET_COUNTS,
  COMPARTMENT_SYNDROME_CLAIM_DRAFTS,
  COMPARTMENT_SYNDROME_DECISION_POINT_DRAFTS,
  COMPARTMENT_SYNDROME_ENTITIES,
  COMPARTMENT_SYNDROME_PILOT_KEY,
  COMPARTMENT_SYNDROME_SOURCE_IDS,
  activeCompartmentSyndromeRelationships,
} from "../kg-compartment-syndrome-pilot-spec.ts";
import {
  DISTAL_RADIUS_ASSET_COUNTS,
  DISTAL_RADIUS_CLAIM_DRAFTS,
  DISTAL_RADIUS_DECISION_POINT_DRAFTS,
  DISTAL_RADIUS_ENTITIES,
  DISTAL_RADIUS_PILOT_KEY,
  DISTAL_RADIUS_SOURCE_IDS,
  activeDistalRadiusRelationships,
} from "../kg-distal-radius-pilot-spec.ts";
import {
  FEMORAL_NECK_ASSET_COUNTS,
  FEMORAL_NECK_CLAIM_DRAFTS,
  FEMORAL_NECK_DECISION_POINT_DRAFTS,
  FEMORAL_NECK_ENTITIES,
  FEMORAL_NECK_PILOT_KEY,
  FEMORAL_NECK_SOURCE_IDS,
  activeFemoralNeckRelationships,
} from "../kg-femoral-neck-fracture-pilot-spec.ts";
import {
  INTERTROCHANTERIC_ASSET_COUNTS,
  INTERTROCHANTERIC_CLAIM_DRAFTS,
  INTERTROCHANTERIC_DECISION_POINT_DRAFTS,
  INTERTROCHANTERIC_ENTITIES,
  INTERTROCHANTERIC_PILOT_KEY,
  INTERTROCHANTERIC_SOURCE_IDS,
  activeIntertrochantericRelationships,
} from "../kg-intertrochanteric-fracture-pilot-spec.ts";
import {
  SUBTROCHANTERIC_ASSET_COUNTS,
  SUBTROCHANTERIC_CLAIM_DRAFTS,
  SUBTROCHANTERIC_DECISION_POINT_DRAFTS,
  SUBTROCHANTERIC_ENTITIES,
  SUBTROCHANTERIC_PILOT_KEY,
  SUBTROCHANTERIC_SOURCE_IDS,
  activeSubtrochantericRelationships,
} from "../kg-subtrochanteric-fracture-pilot-spec.ts";
import {
  TIBIAL_SHAFT_ASSET_COUNTS,
  TIBIAL_SHAFT_CLAIM_DRAFTS,
  TIBIAL_SHAFT_DECISION_POINT_DRAFTS,
  TIBIAL_SHAFT_ENTITIES,
  TIBIAL_SHAFT_PILOT_KEY,
  TIBIAL_SHAFT_SOURCE_IDS,
  activeTibialShaftRelationships,
} from "../kg-tibial-shaft-fracture-pilot-spec.ts";
import {
  ACETABULAR_FRACTURE_ASSET_COUNTS,
  ACETABULAR_FRACTURE_CLAIM_DRAFTS,
  ACETABULAR_FRACTURE_DECISION_POINT_DRAFTS,
  ACETABULAR_FRACTURE_ENTITIES,
  ACETABULAR_FRACTURE_PILOT_KEY,
  ACETABULAR_FRACTURE_SOURCE_IDS,
  activeAcetabularFractureRelationships,
} from "../kg-acetabular-fracture-pilot-spec.ts";
import {
  CALCANEUS_ASSET_COUNTS,
  CALCANEUS_CLAIM_DRAFTS,
  CALCANEUS_DECISION_POINT_DRAFTS,
  CALCANEUS_ENTITIES,
  CALCANEUS_PILOT_KEY,
  CALCANEUS_SOURCE_IDS,
  activeCalcaneusRelationships,
} from "../kg-calcaneus-fracture-pilot-spec.ts";
import {
  DISTAL_FEMUR_ASSET_COUNTS,
  DISTAL_FEMUR_CLAIM_DRAFTS,
  DISTAL_FEMUR_DECISION_POINT_DRAFTS,
  DISTAL_FEMUR_ENTITIES,
  DISTAL_FEMUR_PILOT_KEY,
  DISTAL_FEMUR_SOURCE_IDS,
  activeDistalFemurRelationships,
} from "../kg-distal-femur-fracture-pilot-spec.ts";
import {
  FEMORAL_SHAFT_ASSET_COUNTS,
  FEMORAL_SHAFT_CLAIM_DRAFTS,
  FEMORAL_SHAFT_DECISION_POINT_DRAFTS,
  FEMORAL_SHAFT_ENTITIES,
  FEMORAL_SHAFT_PILOT_KEY,
  FEMORAL_SHAFT_SOURCE_IDS,
  activeFemoralShaftRelationships,
} from "../kg-femoral-shaft-fracture-pilot-spec.ts";
import {
  LISFRANC_ASSET_COUNTS,
  LISFRANC_CLAIM_DRAFTS,
  LISFRANC_DECISION_POINT_DRAFTS,
  LISFRANC_ENTITIES,
  LISFRANC_PILOT_KEY,
  LISFRANC_SOURCE_IDS,
  activeLisfrancRelationships,
} from "../kg-lisfranc-injury-pilot-spec.ts";
import {
  PATELLA_ASSET_COUNTS,
  PATELLA_CLAIM_DRAFTS,
  PATELLA_DECISION_POINT_DRAFTS,
  PATELLA_ENTITIES,
  PATELLA_PILOT_KEY,
  PATELLA_SOURCE_IDS,
  activePatellaRelationships,
} from "../kg-patella-fracture-pilot-spec.ts";
import {
  PELVIC_RING_ASSET_COUNTS,
  PELVIC_RING_CLAIM_DRAFTS,
  PELVIC_RING_DECISION_POINT_DRAFTS,
  PELVIC_RING_ENTITIES,
  PELVIC_RING_PILOT_KEY,
  PELVIC_RING_SOURCE_IDS,
  activePelvicRingRelationships,
} from "../kg-pelvic-ring-injury-pilot-spec.ts";
import {
  PILON_ASSET_COUNTS,
  PILON_CLAIM_DRAFTS,
  PILON_DECISION_POINT_DRAFTS,
  PILON_ENTITIES,
  PILON_PILOT_KEY,
  PILON_SOURCE_IDS,
  activePilonRelationships,
} from "../kg-pilon-fracture-pilot-spec.ts";
import {
  TALUS_ASSET_COUNTS,
  TALUS_CLAIM_DRAFTS,
  TALUS_DECISION_POINT_DRAFTS,
  TALUS_ENTITIES,
  TALUS_PILOT_KEY,
  TALUS_SOURCE_IDS,
  activeTalusRelationships,
} from "../kg-talus-fracture-pilot-spec.ts";
import {
  TIBIAL_PLATEAU_ASSET_COUNTS,
  TIBIAL_PLATEAU_CLAIM_DRAFTS,
  TIBIAL_PLATEAU_DECISION_POINT_DRAFTS,
  TIBIAL_PLATEAU_ENTITIES,
  TIBIAL_PLATEAU_PILOT_KEY,
  TIBIAL_PLATEAU_SOURCE_IDS,
  activeTibialPlateauRelationships,
} from "../kg-tibial-plateau-fracture-pilot-spec.ts";
import { buildHandWristTopicDefinitions } from "../kg-hand-wrist-topic-registry.ts";
import { buildAdultReconstructionTopicDefinitions } from "../kg-adult-reconstruction-topic-registry.ts";
import { buildSportsMedicineTopicDefinitions } from "../kg-sports-medicine-topic-registry.ts";
import type { NeighborhoodSnapshot } from "./types.ts";
import {
  ORTHOPAEDIC_ANATOMY_ASSET_COUNTS,
  ORTHOPAEDIC_ANATOMY_CLAIM_DRAFTS,
  ORTHOPAEDIC_ANATOMY_DECISION_POINT_DRAFTS,
  ORTHOPAEDIC_ANATOMY_ENTITIES,
  ORTHOPAEDIC_ANATOMY_PILOT_KEY,
  ORTHOPAEDIC_ANATOMY_SOURCE_IDS,
  activeOrthopaedicAnatomyRelationships,
} from "../kg-orthopaedic-anatomy-pilot-spec.ts";
import {
  IMAGING_MEASUREMENTS_ASSET_COUNTS,
  IMAGING_MEASUREMENTS_CLAIM_DRAFTS,
  IMAGING_MEASUREMENTS_DECISION_POINT_DRAFTS,
  IMAGING_MEASUREMENTS_ENTITIES,
  IMAGING_MEASUREMENTS_PILOT_KEY,
  IMAGING_MEASUREMENTS_SOURCE_IDS,
  activeImagingMeasurementsRelationships,
} from "../kg-imaging-radiographic-measurements-pilot-spec.ts";
import {
  IMPLANTS_INSTRUMENTS_ASSET_COUNTS,
  IMPLANTS_INSTRUMENTS_CLAIM_DRAFTS,
  IMPLANTS_INSTRUMENTS_DECISION_POINT_DRAFTS,
  IMPLANTS_INSTRUMENTS_ENTITIES,
  IMPLANTS_INSTRUMENTS_PILOT_KEY,
  IMPLANTS_INSTRUMENTS_SOURCE_IDS,
  activeImplantsInstrumentsRelationships,
} from "../kg-implants-instruments-pilot-spec.ts";
import {
  COMPLICATIONS_ASSET_COUNTS,
  COMPLICATIONS_CLAIM_DRAFTS,
  COMPLICATIONS_DECISION_POINT_DRAFTS,
  COMPLICATIONS_ENTITIES,
  COMPLICATIONS_PILOT_KEY,
  COMPLICATIONS_SOURCE_IDS,
  activeComplicationsRelationships,
} from "../kg-complications-pilot-spec.ts";
import {
  POSTOPERATIVE_PROTOCOLS_ASSET_COUNTS,
  POSTOPERATIVE_PROTOCOLS_CLAIM_DRAFTS,
  POSTOPERATIVE_PROTOCOLS_DECISION_POINT_DRAFTS,
  POSTOPERATIVE_PROTOCOLS_ENTITIES,
  POSTOPERATIVE_PROTOCOLS_PILOT_KEY,
  POSTOPERATIVE_PROTOCOLS_SOURCE_IDS,
  activePostoperativeProtocolsRelationships,
} from "../kg-postoperative-protocols-pilot-spec.ts";

export type TopicDefinition = {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  aliases: string[];
  sources: Record<string, string>;
  loadSnapshot: () => NeighborhoodSnapshot;
  buildProposals: () => import("../../../kg-automation-common.ts").ProposalRecord[];
};

function buildSnapshotFromSpec(input: {
  topicKey: string;
  pilotKey: string;
  displayName: string;
  primaryEntitySlug: string;
  targetMaturityLevel: number;
  entities: typeof ANKLE_ENTITIES;
  relationships: ReturnType<typeof activeAnkleRelationships>;
  claims: typeof ANKLE_CLAIM_DRAFTS;
  decisionPoints: typeof ANKLE_DECISION_POINT_DRAFTS;
  assetCounts: { ankiCardMappings: number; orthobulletsQuestionMappings: number };
  sources: Record<string, string>;
}): NeighborhoodSnapshot {
  return {
    topicKey: input.topicKey,
    pilotKey: input.pilotKey,
    displayName: input.displayName,
    primaryEntitySlug: input.primaryEntitySlug,
    targetMaturityLevel: input.targetMaturityLevel,
    entities: input.entities.map((e) => ({
      slug: e.slug,
      entityType: e.entityType,
      preferredLabel: e.preferredLabel,
      description: e.description,
      metadata: e.metadata ?? {},
      source: "spec" as const,
    })),
    relationships: input.relationships.map((r) => ({
      subjectSlug: r.subjectSlug,
      predicate: r.predicate,
      objectSlug: r.objectSlug,
      metadata: r.metadata,
      source: "spec" as const,
    })),
    claims: input.claims.map((c) => ({
      draftId: c.draftId,
      claimType: c.claimType,
      claimText: c.claimText,
      primaryEntitySlug: c.primaryEntitySlug,
      importanceLevel: c.importanceLevel,
      contentSource: c.contentSource,
      reviewStatus: c.reviewStatus,
      metadata: {
        contextRelevance: c.contextRelevance,
        sourceNote: c.sourceNote,
      },
    })),
    decisionPoints: input.decisionPoints.map((dp) => ({
      draftId: dp.draftId,
      subjectEntitySlug: dp.subjectEntitySlug,
      patternType: dp.patternType,
      trigger: dp.trigger,
      action: dp.action,
      urgency: dp.urgency,
      safetyCriticality: dp.safetyCriticality,
      requiresAttendingReview: dp.requiresAttendingReview,
    })),
    assets: {
      ankiCardMappings: input.assetCounts.ankiCardMappings,
      orthobulletsQuestionMappings: input.assetCounts.orthobulletsQuestionMappings,
      linkedCardProposals: 0,
      linkedQuestionProposals: 0,
    },
    sources: {
      curriculumNodeSlug: input.sources.curriculumNodeSlug,
      prepareTopicId: input.sources.prepareTopicId,
      casePrepSlug: input.sources.casePrepSlug,
    },
  };
}

const TOPIC_REGISTRY: TopicDefinition[] = [
  {
    topicKey: "surgical-approaches",
    pilotKey: SURGICAL_APPROACHES_PILOT_KEY,
    displayName: "Surgical Approaches",
    primaryEntitySlug: "surgical-approaches",
    targetMaturityLevel: 7,
    aliases: ["orthopaedic surgical approaches", "operative approaches", "approach backbone"],
    sources: SURGICAL_APPROACHES_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "surgical-approaches", pilotKey: SURGICAL_APPROACHES_PILOT_KEY,
        displayName: "Surgical Approaches", primaryEntitySlug: "surgical-approaches",
        targetMaturityLevel: 7, entities: SURGICAL_APPROACHES_ENTITIES,
        relationships: activeSurgicalApproachesRelationships(),
        claims: SURGICAL_APPROACHES_CLAIM_DRAFTS,
        decisionPoints: SURGICAL_APPROACHES_DECISION_POINT_DRAFTS,
        assetCounts: SURGICAL_APPROACHES_ASSET_COUNTS, sources: SURGICAL_APPROACHES_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildSurgicalApproachesProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildSurgicalApproachesProposalPacket().proposals;
    },
  },
  {
    topicKey: "orthopaedic-anatomy",
    pilotKey: ORTHOPAEDIC_ANATOMY_PILOT_KEY,
    displayName: "Orthopaedic Anatomy",
    primaryEntitySlug: "orthopaedic-anatomy",
    targetMaturityLevel: 7,
    aliases: ["orthopedic anatomy", "anatomy", "canonical orthopaedic anatomy"],
    sources: ORTHOPAEDIC_ANATOMY_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "orthopaedic-anatomy",
        pilotKey: ORTHOPAEDIC_ANATOMY_PILOT_KEY,
        displayName: "Orthopaedic Anatomy",
        primaryEntitySlug: "orthopaedic-anatomy",
        targetMaturityLevel: 7,
        entities: ORTHOPAEDIC_ANATOMY_ENTITIES,
        relationships: activeOrthopaedicAnatomyRelationships(),
        claims: ORTHOPAEDIC_ANATOMY_CLAIM_DRAFTS,
        decisionPoints: ORTHOPAEDIC_ANATOMY_DECISION_POINT_DRAFTS,
        assetCounts: ORTHOPAEDIC_ANATOMY_ASSET_COUNTS,
        sources: ORTHOPAEDIC_ANATOMY_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildOrthopaedicAnatomyProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildOrthopaedicAnatomyProposalPacket().proposals;
    },
  },
  {
    topicKey: "trauma-fundamentals",
    pilotKey: TRAUMA_FUNDAMENTALS_PILOT_KEY,
    displayName: "Trauma Fundamentals",
    primaryEntitySlug: "trauma-fundamentals",
    targetMaturityLevel: 7,
    aliases: ["orthopaedic trauma fundamentals", "fracture fundamentals", "trauma backbone"],
    sources: TRAUMA_FUNDAMENTALS_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "trauma-fundamentals",
        pilotKey: TRAUMA_FUNDAMENTALS_PILOT_KEY,
        displayName: "Trauma Fundamentals",
        primaryEntitySlug: "trauma-fundamentals",
        targetMaturityLevel: 7,
        entities: TRAUMA_FUNDAMENTALS_ENTITIES,
        relationships: activeTraumaFundamentalsRelationships(),
        claims: TRAUMA_FUNDAMENTALS_CLAIM_DRAFTS,
        decisionPoints: TRAUMA_FUNDAMENTALS_DECISION_POINT_DRAFTS,
        assetCounts: TRAUMA_FUNDAMENTALS_ASSET_COUNTS,
        sources: TRAUMA_FUNDAMENTALS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildTraumaFundamentalsProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildTraumaFundamentalsProposalPacket().proposals;
    },
  },
  {
    topicKey: "imaging-radiographic-measurements",
    pilotKey: IMAGING_MEASUREMENTS_PILOT_KEY,
    displayName: "Imaging & Radiographic Measurements",
    primaryEntitySlug: "imaging-radiographic-measurements",
    targetMaturityLevel: 7,
    aliases: [
      "imaging measurements",
      "radiographic measurements",
      "orthopaedic imaging backbone",
      "imaging and radiographic measurements",
    ],
    sources: IMAGING_MEASUREMENTS_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "imaging-radiographic-measurements",
        pilotKey: IMAGING_MEASUREMENTS_PILOT_KEY,
        displayName: "Imaging & Radiographic Measurements",
        primaryEntitySlug: "imaging-radiographic-measurements",
        targetMaturityLevel: 7,
        entities: IMAGING_MEASUREMENTS_ENTITIES,
        relationships: activeImagingMeasurementsRelationships(),
        claims: IMAGING_MEASUREMENTS_CLAIM_DRAFTS,
        decisionPoints: IMAGING_MEASUREMENTS_DECISION_POINT_DRAFTS,
        assetCounts: IMAGING_MEASUREMENTS_ASSET_COUNTS,
        sources: IMAGING_MEASUREMENTS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildImagingMeasurementsProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildImagingMeasurementsProposalPacket().proposals;
    },
  },
  {
    topicKey: "implants-instruments",
    pilotKey: IMPLANTS_INSTRUMENTS_PILOT_KEY,
    displayName: "Implants & Instruments",
    primaryEntitySlug: "implants-instruments",
    targetMaturityLevel: 7,
    aliases: [
      "implants and instruments",
      "fixation constructs",
      "orthopaedic implants",
      "instrumentation backbone",
    ],
    sources: IMPLANTS_INSTRUMENTS_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "implants-instruments",
        pilotKey: IMPLANTS_INSTRUMENTS_PILOT_KEY,
        displayName: "Implants & Instruments",
        primaryEntitySlug: "implants-instruments",
        targetMaturityLevel: 7,
        entities: IMPLANTS_INSTRUMENTS_ENTITIES,
        relationships: activeImplantsInstrumentsRelationships(),
        claims: IMPLANTS_INSTRUMENTS_CLAIM_DRAFTS,
        decisionPoints: IMPLANTS_INSTRUMENTS_DECISION_POINT_DRAFTS,
        assetCounts: IMPLANTS_INSTRUMENTS_ASSET_COUNTS,
        sources: IMPLANTS_INSTRUMENTS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildImplantsInstrumentsProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildImplantsInstrumentsProposalPacket().proposals;
    },
  },
  {
    topicKey: "complications",
    pilotKey: COMPLICATIONS_PILOT_KEY,
    displayName: "Complications",
    primaryEntitySlug: "orthopaedic-complications",
    targetMaturityLevel: 7,
    aliases: [
      "orthopaedic complications",
      "complication backbone",
      "failure modes",
      "orthopaedic failure modes",
    ],
    sources: COMPLICATIONS_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "complications",
        pilotKey: COMPLICATIONS_PILOT_KEY,
        displayName: "Complications",
        primaryEntitySlug: "orthopaedic-complications",
        targetMaturityLevel: 7,
        entities: COMPLICATIONS_ENTITIES,
        relationships: activeComplicationsRelationships(),
        claims: COMPLICATIONS_CLAIM_DRAFTS,
        decisionPoints: COMPLICATIONS_DECISION_POINT_DRAFTS,
        assetCounts: COMPLICATIONS_ASSET_COUNTS,
        sources: COMPLICATIONS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildComplicationsProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildComplicationsProposalPacket().proposals;
    },
  },
  {
    topicKey: "postoperative-protocols",
    pilotKey: POSTOPERATIVE_PROTOCOLS_PILOT_KEY,
    displayName: "Postoperative Protocols",
    primaryEntitySlug: "postoperative-protocols",
    targetMaturityLevel: 7,
    aliases: ["post-op protocols", "postoperative recovery", "rehabilitation protocols", "postoperative surveillance"],
    sources: POSTOPERATIVE_PROTOCOLS_SOURCE_IDS,
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "postoperative-protocols",
        pilotKey: POSTOPERATIVE_PROTOCOLS_PILOT_KEY,
        displayName: "Postoperative Protocols",
        primaryEntitySlug: "postoperative-protocols",
        targetMaturityLevel: 7,
        entities: POSTOPERATIVE_PROTOCOLS_ENTITIES,
        relationships: activePostoperativeProtocolsRelationships(),
        claims: POSTOPERATIVE_PROTOCOLS_CLAIM_DRAFTS,
        decisionPoints: POSTOPERATIVE_PROTOCOLS_DECISION_POINT_DRAFTS,
        assetCounts: POSTOPERATIVE_PROTOCOLS_ASSET_COUNTS,
        sources: POSTOPERATIVE_PROTOCOLS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildPostoperativeProtocolsProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildPostoperativeProtocolsProposalPacket().proposals;
    },
  },
  {
    topicKey: "ankle-fracture",
    pilotKey: ANKLE_PILOT_KEY,
    displayName: "Ankle Fracture",
    primaryEntitySlug: "ankle-fracture",
    targetMaturityLevel: 7,
    aliases: ["ankle fracture", "trauma-ankle-fractures", "ankle-fracture-neighborhood"],
    sources: {
      curriculumNodeSlug: ANKLE_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: ANKLE_SOURCE_IDS.prepareTopicId,
      casePrepSlug: ANKLE_SOURCE_IDS.casePrepSlug,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "ankle-fracture",
        pilotKey: ANKLE_PILOT_KEY,
        displayName: "Ankle Fracture",
        primaryEntitySlug: "ankle-fracture",
        targetMaturityLevel: 7,
        entities: ANKLE_ENTITIES,
        relationships: activeAnkleRelationships(),
        claims: ANKLE_CLAIM_DRAFTS,
        decisionPoints: ANKLE_DECISION_POINT_DRAFTS,
        assetCounts: ANKLE_ASSET_COUNTS,
        sources: ANKLE_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildAnkleProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildAnkleProposalPacket().proposals;
    },
  },
  {
    topicKey: "compartment-syndrome",
    pilotKey: COMPARTMENT_SYNDROME_PILOT_KEY,
    displayName: "Compartment Syndrome",
    primaryEntitySlug: "compartment-syndrome",
    targetMaturityLevel: 7,
    aliases: [
      "compartment syndrome",
      "leg compartment syndrome",
      "trauma-leg-compartment-syndrome",
      "compartment-syndrome-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: COMPARTMENT_SYNDROME_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: COMPARTMENT_SYNDROME_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: COMPARTMENT_SYNDROME_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "compartment-syndrome",
        pilotKey: COMPARTMENT_SYNDROME_PILOT_KEY,
        displayName: "Compartment Syndrome",
        primaryEntitySlug: "compartment-syndrome",
        targetMaturityLevel: 7,
        entities: COMPARTMENT_SYNDROME_ENTITIES,
        relationships: activeCompartmentSyndromeRelationships(),
        claims: COMPARTMENT_SYNDROME_CLAIM_DRAFTS,
        decisionPoints: COMPARTMENT_SYNDROME_DECISION_POINT_DRAFTS,
        assetCounts: COMPARTMENT_SYNDROME_ASSET_COUNTS,
        sources: COMPARTMENT_SYNDROME_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildCompartmentSyndromeProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildCompartmentSyndromeProposalPacket().proposals;
    },
  },
  {
    topicKey: "distal-radius-fracture",
    pilotKey: DISTAL_RADIUS_PILOT_KEY,
    displayName: "Distal Radius Fracture",
    primaryEntitySlug: "distal-radius-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "distal radius fracture",
      "distal radius fractures",
      "trauma-distal-radius-fractures",
      "distal-radius-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: DISTAL_RADIUS_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: DISTAL_RADIUS_SOURCE_IDS.prepareTopicId,
      casePrepSlug: DISTAL_RADIUS_SOURCE_IDS.casePrepSlug,
      legacyRetargetProposalKey: DISTAL_RADIUS_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "distal-radius-fracture",
        pilotKey: DISTAL_RADIUS_PILOT_KEY,
        displayName: "Distal Radius Fracture",
        primaryEntitySlug: "distal-radius-fracture",
        targetMaturityLevel: 7,
        entities: DISTAL_RADIUS_ENTITIES,
        relationships: activeDistalRadiusRelationships(),
        claims: DISTAL_RADIUS_CLAIM_DRAFTS,
        decisionPoints: DISTAL_RADIUS_DECISION_POINT_DRAFTS,
        assetCounts: DISTAL_RADIUS_ASSET_COUNTS,
        sources: DISTAL_RADIUS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildDistalRadiusProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildDistalRadiusProposalPacket().proposals;
    },
  },
  {
    topicKey: "tibial-shaft-fracture",
    pilotKey: TIBIAL_SHAFT_PILOT_KEY,
    displayName: "Tibial Shaft Fracture",
    primaryEntitySlug: "tibial-shaft-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "tibial shaft fracture",
      "tibia fracture",
      "trauma-tibial-shaft-fractures",
      "tibial-shaft-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: TIBIAL_SHAFT_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: TIBIAL_SHAFT_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: TIBIAL_SHAFT_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "tibial-shaft-fracture",
        pilotKey: TIBIAL_SHAFT_PILOT_KEY,
        displayName: "Tibial Shaft Fracture",
        primaryEntitySlug: "tibial-shaft-fracture",
        targetMaturityLevel: 7,
        entities: TIBIAL_SHAFT_ENTITIES,
        relationships: activeTibialShaftRelationships(),
        claims: TIBIAL_SHAFT_CLAIM_DRAFTS,
        decisionPoints: TIBIAL_SHAFT_DECISION_POINT_DRAFTS,
        assetCounts: TIBIAL_SHAFT_ASSET_COUNTS,
        sources: TIBIAL_SHAFT_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildTibialShaftProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildTibialShaftProposalPacket().proposals;
    },
  },
  {
    topicKey: "femoral-neck-fracture",
    pilotKey: FEMORAL_NECK_PILOT_KEY,
    displayName: "Femoral Neck Fracture",
    primaryEntitySlug: "femoral-neck-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "femoral neck fracture",
      "femoral-neck-fracture",
      "trauma-femoral-neck-fractures",
      "femoral-neck-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: FEMORAL_NECK_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: FEMORAL_NECK_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: FEMORAL_NECK_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "femoral-neck-fracture",
        pilotKey: FEMORAL_NECK_PILOT_KEY,
        displayName: "Femoral Neck Fracture",
        primaryEntitySlug: "femoral-neck-fracture",
        targetMaturityLevel: 7,
        entities: FEMORAL_NECK_ENTITIES,
        relationships: activeFemoralNeckRelationships(),
        claims: FEMORAL_NECK_CLAIM_DRAFTS,
        decisionPoints: FEMORAL_NECK_DECISION_POINT_DRAFTS,
        assetCounts: FEMORAL_NECK_ASSET_COUNTS,
        sources: FEMORAL_NECK_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildFemoralNeckProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildFemoralNeckProposalPacket().proposals;
    },
  },
  {
    topicKey: "intertrochanteric-fracture",
    pilotKey: INTERTROCHANTERIC_PILOT_KEY,
    displayName: "Intertrochanteric Fracture",
    primaryEntitySlug: "intertrochanteric-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "intertrochanteric fracture",
      "intertrochanteric femur fracture",
      "trauma-intertrochanteric-fractures",
      "intertrochanteric-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: INTERTROCHANTERIC_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: INTERTROCHANTERIC_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: INTERTROCHANTERIC_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "intertrochanteric-fracture",
        pilotKey: INTERTROCHANTERIC_PILOT_KEY,
        displayName: "Intertrochanteric Fracture",
        primaryEntitySlug: "intertrochanteric-fracture",
        targetMaturityLevel: 7,
        entities: INTERTROCHANTERIC_ENTITIES,
        relationships: activeIntertrochantericRelationships(),
        claims: INTERTROCHANTERIC_CLAIM_DRAFTS,
        decisionPoints: INTERTROCHANTERIC_DECISION_POINT_DRAFTS,
        assetCounts: INTERTROCHANTERIC_ASSET_COUNTS,
        sources: INTERTROCHANTERIC_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildIntertrochantericProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildIntertrochantericProposalPacket().proposals;
    },
  },
  {
    topicKey: "subtrochanteric-fracture",
    pilotKey: SUBTROCHANTERIC_PILOT_KEY,
    displayName: "Subtrochanteric Fracture",
    primaryEntitySlug: "subtrochanteric-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "subtrochanteric fracture",
      "subtrochanteric femur fracture",
      "trauma-subtrochanteric-fractures",
      "subtrochanteric-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: SUBTROCHANTERIC_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: SUBTROCHANTERIC_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: SUBTROCHANTERIC_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "subtrochanteric-fracture",
        pilotKey: SUBTROCHANTERIC_PILOT_KEY,
        displayName: "Subtrochanteric Fracture",
        primaryEntitySlug: "subtrochanteric-fracture",
        targetMaturityLevel: 7,
        entities: SUBTROCHANTERIC_ENTITIES,
        relationships: activeSubtrochantericRelationships(),
        claims: SUBTROCHANTERIC_CLAIM_DRAFTS,
        decisionPoints: SUBTROCHANTERIC_DECISION_POINT_DRAFTS,
        assetCounts: SUBTROCHANTERIC_ASSET_COUNTS,
        sources: SUBTROCHANTERIC_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildSubtrochantericProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildSubtrochantericProposalPacket().proposals;
    },
  },
  {
    topicKey: "clavicle-fracture",
    pilotKey: CLAVICLE_PILOT_KEY,
    displayName: "Clavicle Fracture",
    primaryEntitySlug: "clavicle-fracture",
    targetMaturityLevel: 7,
    aliases: ["clavicle fracture", "midshaft clavicle fracture", "trauma-clavicle-fractures-midshaft", "clavicle-fracture-neighborhood"],
    sources: {
      curriculumNodeSlug: CLAVICLE_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: CLAVICLE_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: CLAVICLE_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "clavicle-fracture",
        pilotKey: CLAVICLE_PILOT_KEY,
        displayName: "Clavicle Fracture",
        primaryEntitySlug: "clavicle-fracture",
        targetMaturityLevel: 7,
        entities: CLAVICLE_ENTITIES,
        relationships: activeClavicleRelationships(),
        claims: CLAVICLE_CLAIM_DRAFTS,
        decisionPoints: CLAVICLE_DECISION_POINT_DRAFTS,
        assetCounts: CLAVICLE_ASSET_COUNTS,
        sources: CLAVICLE_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildClavicleProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildClavicleProposalPacket().proposals;
    },
  },
  {
    topicKey: "proximal-humerus-fracture",
    pilotKey: PROXIMAL_HUMERUS_PILOT_KEY,
    displayName: "Proximal Humerus Fracture",
    primaryEntitySlug: "proximal-humerus-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "proximal humerus fracture",
      "prox humerus fracture",
      "trauma-proximal-humerus-fractures",
      "proximal-humerus-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: PROXIMAL_HUMERUS_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: PROXIMAL_HUMERUS_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: PROXIMAL_HUMERUS_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "proximal-humerus-fracture",
        pilotKey: PROXIMAL_HUMERUS_PILOT_KEY,
        displayName: "Proximal Humerus Fracture",
        primaryEntitySlug: "proximal-humerus-fracture",
        targetMaturityLevel: 7,
        entities: PROXIMAL_HUMERUS_ENTITIES,
        relationships: activeProximalHumerusRelationships(),
        claims: PROXIMAL_HUMERUS_CLAIM_DRAFTS,
        decisionPoints: PROXIMAL_HUMERUS_DECISION_POINT_DRAFTS,
        assetCounts: PROXIMAL_HUMERUS_ASSET_COUNTS,
        sources: PROXIMAL_HUMERUS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildProximalHumerusProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildProximalHumerusProposalPacket().proposals;
    },
  },
  {
    topicKey: "humeral-shaft-fracture",
    pilotKey: HUMERAL_SHAFT_PILOT_KEY,
    displayName: "Humeral Shaft Fracture",
    primaryEntitySlug: "humeral-shaft-fracture",
    targetMaturityLevel: 7,
    aliases: ["humeral shaft fracture", "humerus shaft fracture", "trauma-humeral-shaft-fractures", "humeral-shaft-fracture-neighborhood"],
    sources: {
      curriculumNodeSlug: HUMERAL_SHAFT_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: HUMERAL_SHAFT_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: HUMERAL_SHAFT_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "humeral-shaft-fracture",
        pilotKey: HUMERAL_SHAFT_PILOT_KEY,
        displayName: "Humeral Shaft Fracture",
        primaryEntitySlug: "humeral-shaft-fracture",
        targetMaturityLevel: 7,
        entities: HUMERAL_SHAFT_ENTITIES,
        relationships: activeHumeralShaftRelationships(),
        claims: HUMERAL_SHAFT_CLAIM_DRAFTS,
        decisionPoints: HUMERAL_SHAFT_DECISION_POINT_DRAFTS,
        assetCounts: HUMERAL_SHAFT_ASSET_COUNTS,
        sources: HUMERAL_SHAFT_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildHumeralShaftProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildHumeralShaftProposalPacket().proposals;
    },
  },
  {
    topicKey: "distal-humerus-fracture",
    pilotKey: DISTAL_HUMERUS_PILOT_KEY,
    displayName: "Distal Humerus Fracture",
    primaryEntitySlug: "distal-humerus-fracture",
    targetMaturityLevel: 7,
    aliases: ["distal humerus fracture", "trauma-distal-humerus-fractures", "distal-humerus-fracture-neighborhood"],
    sources: {
      curriculumNodeSlug: DISTAL_HUMERUS_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: DISTAL_HUMERUS_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: DISTAL_HUMERUS_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "distal-humerus-fracture",
        pilotKey: DISTAL_HUMERUS_PILOT_KEY,
        displayName: "Distal Humerus Fracture",
        primaryEntitySlug: "distal-humerus-fracture",
        targetMaturityLevel: 7,
        entities: DISTAL_HUMERUS_ENTITIES,
        relationships: activeDistalHumerusRelationships(),
        claims: DISTAL_HUMERUS_CLAIM_DRAFTS,
        decisionPoints: DISTAL_HUMERUS_DECISION_POINT_DRAFTS,
        assetCounts: DISTAL_HUMERUS_ASSET_COUNTS,
        sources: DISTAL_HUMERUS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildDistalHumerusProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildDistalHumerusProposalPacket().proposals;
    },
  },
  {
    topicKey: "supracondylar-humerus-fracture",
    pilotKey: SUPRACONDYLAR_PILOT_KEY,
    displayName: "Supracondylar Humerus Fracture",
    primaryEntitySlug: "supracondylar-humerus-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "supracondylar fracture",
      "pediatric supracondylar fracture",
      "pediatrics-supracondylar-fracture-pediatric",
      "supracondylar-humerus-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: SUPRACONDYLAR_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: SUPRACONDYLAR_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: SUPRACONDYLAR_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "supracondylar-humerus-fracture",
        pilotKey: SUPRACONDYLAR_PILOT_KEY,
        displayName: "Supracondylar Humerus Fracture",
        primaryEntitySlug: "supracondylar-humerus-fracture",
        targetMaturityLevel: 7,
        entities: SUPRACONDYLAR_ENTITIES,
        relationships: activeSupracondylarRelationships(),
        claims: SUPRACONDYLAR_CLAIM_DRAFTS,
        decisionPoints: SUPRACONDYLAR_DECISION_POINT_DRAFTS,
        assetCounts: SUPRACONDYLAR_ASSET_COUNTS,
        sources: SUPRACONDYLAR_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildSupracondylarProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildSupracondylarProposalPacket().proposals;
    },
  },
  {
    topicKey: "pelvic-ring-injury",
    pilotKey: PELVIC_RING_PILOT_KEY,
    displayName: "Pelvic Ring Injury",
    primaryEntitySlug: "pelvic-ring-injury",
    targetMaturityLevel: 7,
    aliases: [
      "pelvic ring injury",
      "pelvic ring fracture",
      "trauma-pelvic-ring-fractures",
      "pelvic-ring-injury-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: PELVIC_RING_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: PELVIC_RING_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: PELVIC_RING_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "pelvic-ring-injury",
        pilotKey: PELVIC_RING_PILOT_KEY,
        displayName: "Pelvic Ring Injury",
        primaryEntitySlug: "pelvic-ring-injury",
        targetMaturityLevel: 7,
        entities: PELVIC_RING_ENTITIES,
        relationships: activePelvicRingRelationships(),
        claims: PELVIC_RING_CLAIM_DRAFTS,
        decisionPoints: PELVIC_RING_DECISION_POINT_DRAFTS,
        assetCounts: PELVIC_RING_ASSET_COUNTS,
        sources: PELVIC_RING_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildPelvicRingProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildPelvicRingProposalPacket().proposals;
    },
  },
  {
    topicKey: "acetabular-fracture",
    pilotKey: ACETABULAR_FRACTURE_PILOT_KEY,
    displayName: "Acetabular Fracture",
    primaryEntitySlug: "acetabular-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "acetabular fracture",
      "acetabulum fracture",
      "trauma-acetabular-fractures",
      "acetabular-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: ACETABULAR_FRACTURE_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: ACETABULAR_FRACTURE_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: ACETABULAR_FRACTURE_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "acetabular-fracture",
        pilotKey: ACETABULAR_FRACTURE_PILOT_KEY,
        displayName: "Acetabular Fracture",
        primaryEntitySlug: "acetabular-fracture",
        targetMaturityLevel: 7,
        entities: ACETABULAR_FRACTURE_ENTITIES,
        relationships: activeAcetabularFractureRelationships(),
        claims: ACETABULAR_FRACTURE_CLAIM_DRAFTS,
        decisionPoints: ACETABULAR_FRACTURE_DECISION_POINT_DRAFTS,
        assetCounts: ACETABULAR_FRACTURE_ASSET_COUNTS,
        sources: ACETABULAR_FRACTURE_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildAcetabularFractureProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildAcetabularFractureProposalPacket().proposals;
    },
  },
  {
    topicKey: "femoral-shaft-fracture",
    pilotKey: FEMORAL_SHAFT_PILOT_KEY,
    displayName: "Femoral Shaft Fracture",
    primaryEntitySlug: "femoral-shaft-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "femoral shaft fracture",
      "femur shaft fracture",
      "trauma-femoral-shaft-fractures",
      "femoral-shaft-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: FEMORAL_SHAFT_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: FEMORAL_SHAFT_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: FEMORAL_SHAFT_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "femoral-shaft-fracture",
        pilotKey: FEMORAL_SHAFT_PILOT_KEY,
        displayName: "Femoral Shaft Fracture",
        primaryEntitySlug: "femoral-shaft-fracture",
        targetMaturityLevel: 7,
        entities: FEMORAL_SHAFT_ENTITIES,
        relationships: activeFemoralShaftRelationships(),
        claims: FEMORAL_SHAFT_CLAIM_DRAFTS,
        decisionPoints: FEMORAL_SHAFT_DECISION_POINT_DRAFTS,
        assetCounts: FEMORAL_SHAFT_ASSET_COUNTS,
        sources: FEMORAL_SHAFT_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildFemoralShaftProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildFemoralShaftProposalPacket().proposals;
    },
  },
  {
    topicKey: "distal-femur-fracture",
    pilotKey: DISTAL_FEMUR_PILOT_KEY,
    displayName: "Distal Femur Fracture",
    primaryEntitySlug: "distal-femur-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "distal femur fracture",
      "distal femoral fracture",
      "trauma-distal-femur-fractures",
      "distal-femur-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: DISTAL_FEMUR_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: DISTAL_FEMUR_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: DISTAL_FEMUR_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "distal-femur-fracture",
        pilotKey: DISTAL_FEMUR_PILOT_KEY,
        displayName: "Distal Femur Fracture",
        primaryEntitySlug: "distal-femur-fracture",
        targetMaturityLevel: 7,
        entities: DISTAL_FEMUR_ENTITIES,
        relationships: activeDistalFemurRelationships(),
        claims: DISTAL_FEMUR_CLAIM_DRAFTS,
        decisionPoints: DISTAL_FEMUR_DECISION_POINT_DRAFTS,
        assetCounts: DISTAL_FEMUR_ASSET_COUNTS,
        sources: DISTAL_FEMUR_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildDistalFemurProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildDistalFemurProposalPacket().proposals;
    },
  },
  {
    topicKey: "patella-fracture",
    pilotKey: PATELLA_PILOT_KEY,
    displayName: "Patella Fracture",
    primaryEntitySlug: "patella-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "patella fracture",
      "patellar fracture",
      "trauma-patella-fracture",
      "patella-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: PATELLA_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: PATELLA_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: PATELLA_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "patella-fracture",
        pilotKey: PATELLA_PILOT_KEY,
        displayName: "Patella Fracture",
        primaryEntitySlug: "patella-fracture",
        targetMaturityLevel: 7,
        entities: PATELLA_ENTITIES,
        relationships: activePatellaRelationships(),
        claims: PATELLA_CLAIM_DRAFTS,
        decisionPoints: PATELLA_DECISION_POINT_DRAFTS,
        assetCounts: PATELLA_ASSET_COUNTS,
        sources: PATELLA_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildPatellaProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildPatellaProposalPacket().proposals;
    },
  },
  {
    topicKey: "tibial-plateau-fracture",
    pilotKey: TIBIAL_PLATEAU_PILOT_KEY,
    displayName: "Tibial Plateau Fracture",
    primaryEntitySlug: "tibial-plateau-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "tibial plateau fracture",
      "tibial plateau fractures",
      "trauma-tibial-plateau-fractures",
      "tibial-plateau-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: TIBIAL_PLATEAU_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: TIBIAL_PLATEAU_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: TIBIAL_PLATEAU_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "tibial-plateau-fracture",
        pilotKey: TIBIAL_PLATEAU_PILOT_KEY,
        displayName: "Tibial Plateau Fracture",
        primaryEntitySlug: "tibial-plateau-fracture",
        targetMaturityLevel: 7,
        entities: TIBIAL_PLATEAU_ENTITIES,
        relationships: activeTibialPlateauRelationships(),
        claims: TIBIAL_PLATEAU_CLAIM_DRAFTS,
        decisionPoints: TIBIAL_PLATEAU_DECISION_POINT_DRAFTS,
        assetCounts: TIBIAL_PLATEAU_ASSET_COUNTS,
        sources: TIBIAL_PLATEAU_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildTibialPlateauProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildTibialPlateauProposalPacket().proposals;
    },
  },
  {
    topicKey: "pilon-fracture",
    pilotKey: PILON_PILOT_KEY,
    displayName: "Pilon Fracture",
    primaryEntitySlug: "pilon-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "pilon fracture",
      "tibial plafond fracture",
      "trauma-tibial-plafond-fractures",
      "pilon-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: PILON_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: PILON_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: PILON_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "pilon-fracture",
        pilotKey: PILON_PILOT_KEY,
        displayName: "Pilon Fracture",
        primaryEntitySlug: "pilon-fracture",
        targetMaturityLevel: 7,
        entities: PILON_ENTITIES,
        relationships: activePilonRelationships(),
        claims: PILON_CLAIM_DRAFTS,
        decisionPoints: PILON_DECISION_POINT_DRAFTS,
        assetCounts: PILON_ASSET_COUNTS,
        sources: PILON_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildPilonProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildPilonProposalPacket().proposals;
    },
  },
  {
    topicKey: "calcaneus-fracture",
    pilotKey: CALCANEUS_PILOT_KEY,
    displayName: "Calcaneus Fracture",
    primaryEntitySlug: "calcaneus-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "calcaneus fracture",
      "calcaneal fracture",
      "trauma-calcaneus-fractures",
      "calcaneus-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: CALCANEUS_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: CALCANEUS_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: CALCANEUS_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "calcaneus-fracture",
        pilotKey: CALCANEUS_PILOT_KEY,
        displayName: "Calcaneus Fracture",
        primaryEntitySlug: "calcaneus-fracture",
        targetMaturityLevel: 7,
        entities: CALCANEUS_ENTITIES,
        relationships: activeCalcaneusRelationships(),
        claims: CALCANEUS_CLAIM_DRAFTS,
        decisionPoints: CALCANEUS_DECISION_POINT_DRAFTS,
        assetCounts: CALCANEUS_ASSET_COUNTS,
        sources: CALCANEUS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildCalcaneusProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildCalcaneusProposalPacket().proposals;
    },
  },
  {
    topicKey: "talus-fracture",
    pilotKey: TALUS_PILOT_KEY,
    displayName: "Talus Fracture",
    primaryEntitySlug: "talus-fracture",
    targetMaturityLevel: 7,
    aliases: [
      "talus fracture",
      "talar neck fracture",
      "trauma-talar-neck-fractures",
      "talus-fracture-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: TALUS_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: TALUS_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: TALUS_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "talus-fracture",
        pilotKey: TALUS_PILOT_KEY,
        displayName: "Talus Fracture",
        primaryEntitySlug: "talus-fracture",
        targetMaturityLevel: 7,
        entities: TALUS_ENTITIES,
        relationships: activeTalusRelationships(),
        claims: TALUS_CLAIM_DRAFTS,
        decisionPoints: TALUS_DECISION_POINT_DRAFTS,
        assetCounts: TALUS_ASSET_COUNTS,
        sources: TALUS_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildTalusProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildTalusProposalPacket().proposals;
    },
  },
  {
    topicKey: "lisfranc-injury",
    pilotKey: LISFRANC_PILOT_KEY,
    displayName: "Lisfranc Injury",
    primaryEntitySlug: "lisfranc-injury",
    targetMaturityLevel: 7,
    aliases: [
      "lisfranc injury",
      "lisfranc fracture dislocation",
      "foot-ankle-lisfranc-injury",
      "lisfranc-injury-neighborhood",
    ],
    sources: {
      curriculumNodeSlug: LISFRANC_SOURCE_IDS.curriculumNodeSlug,
      prepareTopicId: LISFRANC_SOURCE_IDS.prepareTopicId,
      legacyRetargetProposalKey: LISFRANC_SOURCE_IDS.legacyRetargetProposalKey,
    },
    loadSnapshot: () =>
      buildSnapshotFromSpec({
        topicKey: "lisfranc-injury",
        pilotKey: LISFRANC_PILOT_KEY,
        displayName: "Lisfranc Injury",
        primaryEntitySlug: "lisfranc-injury",
        targetMaturityLevel: 7,
        entities: LISFRANC_ENTITIES,
        relationships: activeLisfrancRelationships(),
        claims: LISFRANC_CLAIM_DRAFTS,
        decisionPoints: LISFRANC_DECISION_POINT_DRAFTS,
        assetCounts: LISFRANC_ASSET_COUNTS,
        sources: LISFRANC_SOURCE_IDS,
      }),
    buildProposals: async () => {
      const { buildLisfrancProposalPacket } = await import("../kg-factory/proposal-builder.ts");
      return buildLisfrancProposalPacket().proposals;
    },
  },
  ...buildSportsMedicineTopicDefinitions(),
  ...buildHandWristTopicDefinitions(),
  ...buildAdultReconstructionTopicDefinitions(),
];

export function normalizeTopicKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

export function resolveTopic(input: string): TopicDefinition | undefined {
  const key = normalizeTopicKey(input);
  return TOPIC_REGISTRY.find(
    (t) =>
      t.topicKey === key ||
      t.pilotKey === key ||
      t.aliases.some((a) => normalizeTopicKey(a) === key)
  );
}

export function listRegisteredTopics(): Array<{
  topicKey: string;
  displayName: string;
  pilotKey: string;
}> {
  return TOPIC_REGISTRY.map((t) => ({
    topicKey: t.topicKey,
    displayName: t.displayName,
    pilotKey: t.pilotKey,
  }));
}
