import type { ProposalRecord } from "../../kg-automation-common.ts";
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
  TRAUMA_FUNDAMENTALS_ASSET_COUNTS,
  TRAUMA_FUNDAMENTALS_CLAIM_DRAFTS,
  TRAUMA_FUNDAMENTALS_DECISION_POINT_DRAFTS,
  TRAUMA_FUNDAMENTALS_ENTITIES,
  TRAUMA_FUNDAMENTALS_PILOT_KEY,
  TRAUMA_FUNDAMENTALS_SOURCE_IDS,
  activeTraumaFundamentalsRelationships,
} from "../kg-trauma-fundamentals-pilot-spec.ts";
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
import { getHandWristPilotSpec, activeHandWristRelationshipsForTopic } from "../kg-hand-wrist-pilot-spec.ts";
import { getSportsPilotSpec, activeSportsRelationships } from "../kg-sports-medicine-pilot-spec.ts";
import { getAdultReconstructionPilotSpec } from "../kg-adult-reconstruction-pilot-loader.ts";
import { ADULT_RECONSTRUCTION_TOPIC_CATALOG } from "../kg-adult-reconstruction-topic-catalog.ts";
import { buildPilotProposalPacket } from "./pilot-proposal-builder.ts";
import {
  ORTHOPAEDIC_ANATOMY_ASSET_COUNTS,
  ORTHOPAEDIC_ANATOMY_CLAIM_DRAFTS,
  ORTHOPAEDIC_ANATOMY_DECISION_POINT_DRAFTS,
  ORTHOPAEDIC_ANATOMY_ENTITIES,
  ORTHOPAEDIC_ANATOMY_PILOT_KEY,
  ORTHOPAEDIC_ANATOMY_SOURCE_IDS,
  activeOrthopaedicAnatomyRelationships,
} from "../kg-orthopaedic-anatomy-pilot-spec.ts";

export function buildOrthopaedicAnatomyProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: ORTHOPAEDIC_ANATOMY_PILOT_KEY,
    pilotPacketKey: "pilot:orthopaedic-anatomy-neighborhood",
    pilotPacketLabel: "Orthopaedic Anatomy Neighborhood",
    specVersion: "orthopaedic_anatomy_spec_v1",
    primaryEntitySlug: "orthopaedic-anatomy",
    sourceIds: ORTHOPAEDIC_ANATOMY_SOURCE_IDS,
    assetCounts: ORTHOPAEDIC_ANATOMY_ASSET_COUNTS,
    entities: ORTHOPAEDIC_ANATOMY_ENTITIES,
    relationships: activeOrthopaedicAnatomyRelationships(),
    claimDrafts: ORTHOPAEDIC_ANATOMY_CLAIM_DRAFTS,
    decisionPointDrafts: ORTHOPAEDIC_ANATOMY_DECISION_POINT_DRAFTS,
  });
}

export function buildAnkleProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: ANKLE_PILOT_KEY,
    pilotPacketKey: "pilot:ankle-fracture-neighborhood",
    pilotPacketLabel: "Ankle Fracture Neighborhood",
    specVersion: "ankle_pilot_spec_v1",
    primaryEntitySlug: "ankle-fracture",
    sourceIds: ANKLE_SOURCE_IDS,
    assetCounts: ANKLE_ASSET_COUNTS,
    entities: ANKLE_ENTITIES,
    relationships: activeAnkleRelationships(),
    claimDrafts: ANKLE_CLAIM_DRAFTS,
    decisionPointDrafts: ANKLE_DECISION_POINT_DRAFTS,
  });
}

export function buildSurgicalApproachesProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: SURGICAL_APPROACHES_PILOT_KEY,
    pilotPacketKey: "pilot:surgical-approaches-neighborhood",
    pilotPacketLabel: "Surgical Approaches Neighborhood",
    specVersion: "surgical_approaches_pilot_spec_v1",
    primaryEntitySlug: "surgical-approaches",
    sourceIds: SURGICAL_APPROACHES_SOURCE_IDS,
    assetCounts: SURGICAL_APPROACHES_ASSET_COUNTS,
    entities: SURGICAL_APPROACHES_ENTITIES,
    relationships: activeSurgicalApproachesRelationships(),
    claimDrafts: SURGICAL_APPROACHES_CLAIM_DRAFTS,
    decisionPointDrafts: SURGICAL_APPROACHES_DECISION_POINT_DRAFTS,
  });
}

export function buildTraumaFundamentalsProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: TRAUMA_FUNDAMENTALS_PILOT_KEY,
    pilotPacketKey: "pilot:trauma-fundamentals-neighborhood",
    pilotPacketLabel: "Trauma Fundamentals Neighborhood",
    specVersion: "trauma_fundamentals_pilot_spec_v1",
    primaryEntitySlug: "trauma-fundamentals",
    sourceIds: TRAUMA_FUNDAMENTALS_SOURCE_IDS,
    assetCounts: TRAUMA_FUNDAMENTALS_ASSET_COUNTS,
    entities: TRAUMA_FUNDAMENTALS_ENTITIES,
    relationships: activeTraumaFundamentalsRelationships(),
    claimDrafts: TRAUMA_FUNDAMENTALS_CLAIM_DRAFTS,
    decisionPointDrafts: TRAUMA_FUNDAMENTALS_DECISION_POINT_DRAFTS,
  });
}

export function buildCompartmentSyndromeProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: COMPARTMENT_SYNDROME_PILOT_KEY,
    pilotPacketKey: "pilot:compartment-syndrome-neighborhood",
    pilotPacketLabel: "Compartment Syndrome Neighborhood",
    specVersion: "compartment_syndrome_pilot_spec_v1",
    primaryEntitySlug: "compartment-syndrome",
    sourceIds: COMPARTMENT_SYNDROME_SOURCE_IDS,
    assetCounts: COMPARTMENT_SYNDROME_ASSET_COUNTS,
    entities: COMPARTMENT_SYNDROME_ENTITIES,
    relationships: activeCompartmentSyndromeRelationships(),
    claimDrafts: COMPARTMENT_SYNDROME_CLAIM_DRAFTS,
    decisionPointDrafts: COMPARTMENT_SYNDROME_DECISION_POINT_DRAFTS,
  });
}

export function buildDistalRadiusProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: DISTAL_RADIUS_PILOT_KEY,
    pilotPacketKey: "pilot:distal-radius-fracture-neighborhood",
    pilotPacketLabel: "Distal Radius Fracture Neighborhood",
    specVersion: "distal_radius_pilot_spec_v1",
    primaryEntitySlug: "distal-radius-fracture",
    sourceIds: DISTAL_RADIUS_SOURCE_IDS,
    assetCounts: DISTAL_RADIUS_ASSET_COUNTS,
    entities: DISTAL_RADIUS_ENTITIES,
    relationships: activeDistalRadiusRelationships(),
    claimDrafts: DISTAL_RADIUS_CLAIM_DRAFTS,
    decisionPointDrafts: DISTAL_RADIUS_DECISION_POINT_DRAFTS,
  });
}

export function buildTibialShaftProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: TIBIAL_SHAFT_PILOT_KEY,
    pilotPacketKey: "pilot:tibial-shaft-fracture-neighborhood",
    pilotPacketLabel: "Tibial Shaft Fracture Neighborhood",
    specVersion: "tibial_shaft_pilot_spec_v1",
    primaryEntitySlug: "tibial-shaft-fracture",
    sourceIds: TIBIAL_SHAFT_SOURCE_IDS,
    assetCounts: TIBIAL_SHAFT_ASSET_COUNTS,
    entities: TIBIAL_SHAFT_ENTITIES,
    relationships: activeTibialShaftRelationships(),
    claimDrafts: TIBIAL_SHAFT_CLAIM_DRAFTS,
    decisionPointDrafts: TIBIAL_SHAFT_DECISION_POINT_DRAFTS,
  });
}

export function buildFemoralNeckProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: FEMORAL_NECK_PILOT_KEY,
    pilotPacketKey: "pilot:femoral-neck-fracture-neighborhood",
    pilotPacketLabel: "Femoral Neck Fracture Neighborhood",
    specVersion: "femoral_neck_pilot_spec_v1",
    primaryEntitySlug: "femoral-neck-fracture",
    sourceIds: FEMORAL_NECK_SOURCE_IDS,
    assetCounts: FEMORAL_NECK_ASSET_COUNTS,
    entities: FEMORAL_NECK_ENTITIES,
    relationships: activeFemoralNeckRelationships(),
    claimDrafts: FEMORAL_NECK_CLAIM_DRAFTS,
    decisionPointDrafts: FEMORAL_NECK_DECISION_POINT_DRAFTS,
  });
}

export function buildIntertrochantericProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: INTERTROCHANTERIC_PILOT_KEY,
    pilotPacketKey: "pilot:intertrochanteric-fracture-neighborhood",
    pilotPacketLabel: "Intertrochanteric Fracture Neighborhood",
    specVersion: "intertrochanteric_pilot_spec_v1",
    primaryEntitySlug: "intertrochanteric-fracture",
    sourceIds: INTERTROCHANTERIC_SOURCE_IDS,
    assetCounts: INTERTROCHANTERIC_ASSET_COUNTS,
    entities: INTERTROCHANTERIC_ENTITIES,
    relationships: activeIntertrochantericRelationships(),
    claimDrafts: INTERTROCHANTERIC_CLAIM_DRAFTS,
    decisionPointDrafts: INTERTROCHANTERIC_DECISION_POINT_DRAFTS,
  });
}

export function buildSubtrochantericProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: SUBTROCHANTERIC_PILOT_KEY,
    pilotPacketKey: "pilot:subtrochanteric-fracture-neighborhood",
    pilotPacketLabel: "Subtrochanteric Fracture Neighborhood",
    specVersion: "subtrochanteric_pilot_spec_v1",
    primaryEntitySlug: "subtrochanteric-fracture",
    sourceIds: SUBTROCHANTERIC_SOURCE_IDS,
    assetCounts: SUBTROCHANTERIC_ASSET_COUNTS,
    entities: SUBTROCHANTERIC_ENTITIES,
    relationships: activeSubtrochantericRelationships(),
    claimDrafts: SUBTROCHANTERIC_CLAIM_DRAFTS,
    decisionPointDrafts: SUBTROCHANTERIC_DECISION_POINT_DRAFTS,
  });
}

export function buildClavicleProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: CLAVICLE_PILOT_KEY,
    pilotPacketKey: "pilot:clavicle-fracture-neighborhood",
    pilotPacketLabel: "Clavicle Fracture Neighborhood",
    specVersion: "clavicle_pilot_spec_v1",
    primaryEntitySlug: "clavicle-fracture",
    sourceIds: CLAVICLE_SOURCE_IDS,
    assetCounts: CLAVICLE_ASSET_COUNTS,
    entities: CLAVICLE_ENTITIES,
    relationships: activeClavicleRelationships(),
    claimDrafts: CLAVICLE_CLAIM_DRAFTS,
    decisionPointDrafts: CLAVICLE_DECISION_POINT_DRAFTS,
  });
}

export function buildProximalHumerusProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: PROXIMAL_HUMERUS_PILOT_KEY,
    pilotPacketKey: "pilot:proximal-humerus-fracture-neighborhood",
    pilotPacketLabel: "Proximal Humerus Fracture Neighborhood",
    specVersion: "proximal_humerus_pilot_spec_v1",
    primaryEntitySlug: "proximal-humerus-fracture",
    sourceIds: PROXIMAL_HUMERUS_SOURCE_IDS,
    assetCounts: PROXIMAL_HUMERUS_ASSET_COUNTS,
    entities: PROXIMAL_HUMERUS_ENTITIES,
    relationships: activeProximalHumerusRelationships(),
    claimDrafts: PROXIMAL_HUMERUS_CLAIM_DRAFTS,
    decisionPointDrafts: PROXIMAL_HUMERUS_DECISION_POINT_DRAFTS,
  });
}

export function buildHumeralShaftProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: HUMERAL_SHAFT_PILOT_KEY,
    pilotPacketKey: "pilot:humeral-shaft-fracture-neighborhood",
    pilotPacketLabel: "Humeral Shaft Fracture Neighborhood",
    specVersion: "humeral_shaft_pilot_spec_v1",
    primaryEntitySlug: "humeral-shaft-fracture",
    sourceIds: HUMERAL_SHAFT_SOURCE_IDS,
    assetCounts: HUMERAL_SHAFT_ASSET_COUNTS,
    entities: HUMERAL_SHAFT_ENTITIES,
    relationships: activeHumeralShaftRelationships(),
    claimDrafts: HUMERAL_SHAFT_CLAIM_DRAFTS,
    decisionPointDrafts: HUMERAL_SHAFT_DECISION_POINT_DRAFTS,
  });
}

export function buildDistalHumerusProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: DISTAL_HUMERUS_PILOT_KEY,
    pilotPacketKey: "pilot:distal-humerus-fracture-neighborhood",
    pilotPacketLabel: "Distal Humerus Fracture Neighborhood",
    specVersion: "distal_humerus_pilot_spec_v1",
    primaryEntitySlug: "distal-humerus-fracture",
    sourceIds: DISTAL_HUMERUS_SOURCE_IDS,
    assetCounts: DISTAL_HUMERUS_ASSET_COUNTS,
    entities: DISTAL_HUMERUS_ENTITIES,
    relationships: activeDistalHumerusRelationships(),
    claimDrafts: DISTAL_HUMERUS_CLAIM_DRAFTS,
    decisionPointDrafts: DISTAL_HUMERUS_DECISION_POINT_DRAFTS,
  });
}

export function buildSupracondylarProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: SUPRACONDYLAR_PILOT_KEY,
    pilotPacketKey: "pilot:supracondylar-humerus-fracture-neighborhood",
    pilotPacketLabel: "Supracondylar Humerus Fracture Neighborhood",
    specVersion: "supracondylar_pilot_spec_v1",
    primaryEntitySlug: "supracondylar-humerus-fracture",
    sourceIds: SUPRACONDYLAR_SOURCE_IDS,
    assetCounts: SUPRACONDYLAR_ASSET_COUNTS,
    entities: SUPRACONDYLAR_ENTITIES,
    relationships: activeSupracondylarRelationships(),
    claimDrafts: SUPRACONDYLAR_CLAIM_DRAFTS,
    decisionPointDrafts: SUPRACONDYLAR_DECISION_POINT_DRAFTS,
  });
}

export function buildPelvicRingProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: PELVIC_RING_PILOT_KEY,
    pilotPacketKey: "pilot:pelvic-ring-injury-neighborhood",
    pilotPacketLabel: "Pelvic Ring Injury Neighborhood",
    specVersion: "pelvic_ring_pilot_spec_v1",
    primaryEntitySlug: "pelvic-ring-injury",
    sourceIds: PELVIC_RING_SOURCE_IDS,
    assetCounts: PELVIC_RING_ASSET_COUNTS,
    entities: PELVIC_RING_ENTITIES,
    relationships: activePelvicRingRelationships(),
    claimDrafts: PELVIC_RING_CLAIM_DRAFTS,
    decisionPointDrafts: PELVIC_RING_DECISION_POINT_DRAFTS,
  });
}

export function buildAcetabularFractureProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: ACETABULAR_FRACTURE_PILOT_KEY,
    pilotPacketKey: "pilot:acetabular-fracture-neighborhood",
    pilotPacketLabel: "Acetabular Fracture Neighborhood",
    specVersion: "acetabular_fracture_pilot_spec_v1",
    primaryEntitySlug: "acetabular-fracture",
    sourceIds: ACETABULAR_FRACTURE_SOURCE_IDS,
    assetCounts: ACETABULAR_FRACTURE_ASSET_COUNTS,
    entities: ACETABULAR_FRACTURE_ENTITIES,
    relationships: activeAcetabularFractureRelationships(),
    claimDrafts: ACETABULAR_FRACTURE_CLAIM_DRAFTS,
    decisionPointDrafts: ACETABULAR_FRACTURE_DECISION_POINT_DRAFTS,
  });
}

export function buildFemoralShaftProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: FEMORAL_SHAFT_PILOT_KEY,
    pilotPacketKey: "pilot:femoral-shaft-fracture-neighborhood",
    pilotPacketLabel: "Femoral Shaft Fracture Neighborhood",
    specVersion: "femoral_shaft_pilot_spec_v1",
    primaryEntitySlug: "femoral-shaft-fracture",
    sourceIds: FEMORAL_SHAFT_SOURCE_IDS,
    assetCounts: FEMORAL_SHAFT_ASSET_COUNTS,
    entities: FEMORAL_SHAFT_ENTITIES,
    relationships: activeFemoralShaftRelationships(),
    claimDrafts: FEMORAL_SHAFT_CLAIM_DRAFTS,
    decisionPointDrafts: FEMORAL_SHAFT_DECISION_POINT_DRAFTS,
  });
}

export function buildDistalFemurProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: DISTAL_FEMUR_PILOT_KEY,
    pilotPacketKey: "pilot:distal-femur-fracture-neighborhood",
    pilotPacketLabel: "Distal Femur Fracture Neighborhood",
    specVersion: "distal_femur_pilot_spec_v1",
    primaryEntitySlug: "distal-femur-fracture",
    sourceIds: DISTAL_FEMUR_SOURCE_IDS,
    assetCounts: DISTAL_FEMUR_ASSET_COUNTS,
    entities: DISTAL_FEMUR_ENTITIES,
    relationships: activeDistalFemurRelationships(),
    claimDrafts: DISTAL_FEMUR_CLAIM_DRAFTS,
    decisionPointDrafts: DISTAL_FEMUR_DECISION_POINT_DRAFTS,
  });
}

export function buildPatellaProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: PATELLA_PILOT_KEY,
    pilotPacketKey: "pilot:patella-fracture-neighborhood",
    pilotPacketLabel: "Patella Fracture Neighborhood",
    specVersion: "patella_pilot_spec_v1",
    primaryEntitySlug: "patella-fracture",
    sourceIds: PATELLA_SOURCE_IDS,
    assetCounts: PATELLA_ASSET_COUNTS,
    entities: PATELLA_ENTITIES,
    relationships: activePatellaRelationships(),
    claimDrafts: PATELLA_CLAIM_DRAFTS,
    decisionPointDrafts: PATELLA_DECISION_POINT_DRAFTS,
  });
}

export function buildTibialPlateauProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: TIBIAL_PLATEAU_PILOT_KEY,
    pilotPacketKey: "pilot:tibial-plateau-fracture-neighborhood",
    pilotPacketLabel: "Tibial Plateau Fracture Neighborhood",
    specVersion: "tibial_plateau_pilot_spec_v1",
    primaryEntitySlug: "tibial-plateau-fracture",
    sourceIds: TIBIAL_PLATEAU_SOURCE_IDS,
    assetCounts: TIBIAL_PLATEAU_ASSET_COUNTS,
    entities: TIBIAL_PLATEAU_ENTITIES,
    relationships: activeTibialPlateauRelationships(),
    claimDrafts: TIBIAL_PLATEAU_CLAIM_DRAFTS,
    decisionPointDrafts: TIBIAL_PLATEAU_DECISION_POINT_DRAFTS,
  });
}

export function buildPilonProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: PILON_PILOT_KEY,
    pilotPacketKey: "pilot:pilon-fracture-neighborhood",
    pilotPacketLabel: "Pilon Fracture Neighborhood",
    specVersion: "pilon_pilot_spec_v1",
    primaryEntitySlug: "pilon-fracture",
    sourceIds: PILON_SOURCE_IDS,
    assetCounts: PILON_ASSET_COUNTS,
    entities: PILON_ENTITIES,
    relationships: activePilonRelationships(),
    claimDrafts: PILON_CLAIM_DRAFTS,
    decisionPointDrafts: PILON_DECISION_POINT_DRAFTS,
  });
}

export function buildCalcaneusProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: CALCANEUS_PILOT_KEY,
    pilotPacketKey: "pilot:calcaneus-fracture-neighborhood",
    pilotPacketLabel: "Calcaneus Fracture Neighborhood",
    specVersion: "calcaneus_pilot_spec_v1",
    primaryEntitySlug: "calcaneus-fracture",
    sourceIds: CALCANEUS_SOURCE_IDS,
    assetCounts: CALCANEUS_ASSET_COUNTS,
    entities: CALCANEUS_ENTITIES,
    relationships: activeCalcaneusRelationships(),
    claimDrafts: CALCANEUS_CLAIM_DRAFTS,
    decisionPointDrafts: CALCANEUS_DECISION_POINT_DRAFTS,
  });
}

export function buildTalusProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: TALUS_PILOT_KEY,
    pilotPacketKey: "pilot:talus-fracture-neighborhood",
    pilotPacketLabel: "Talus Fracture Neighborhood",
    specVersion: "talus_pilot_spec_v1",
    primaryEntitySlug: "talus-fracture",
    sourceIds: TALUS_SOURCE_IDS,
    assetCounts: TALUS_ASSET_COUNTS,
    entities: TALUS_ENTITIES,
    relationships: activeTalusRelationships(),
    claimDrafts: TALUS_CLAIM_DRAFTS,
    decisionPointDrafts: TALUS_DECISION_POINT_DRAFTS,
  });
}

export function buildLisfrancProposalPacket() {
  return buildPilotProposalPacket({
    pilotKey: LISFRANC_PILOT_KEY,
    pilotPacketKey: "pilot:lisfranc-injury-neighborhood",
    pilotPacketLabel: "Lisfranc Injury Neighborhood",
    specVersion: "lisfranc_pilot_spec_v1",
    primaryEntitySlug: "lisfranc-injury",
    sourceIds: LISFRANC_SOURCE_IDS,
    assetCounts: LISFRANC_ASSET_COUNTS,
    entities: LISFRANC_ENTITIES,
    relationships: activeLisfrancRelationships(),
    claimDrafts: LISFRANC_CLAIM_DRAFTS,
    decisionPointDrafts: LISFRANC_DECISION_POINT_DRAFTS,
  });
}

export function buildHandWristProposalPacket(topicKey: string) {
  const spec = getHandWristPilotSpec(topicKey);
  if (!spec) {
    throw new Error(`No hand-wrist pilot spec for topic ${topicKey}`);
  }
  return buildPilotProposalPacket({
    pilotKey: spec.pilotKey,
    pilotPacketKey: `pilot:${spec.pilotKey}`,
    pilotPacketLabel: `${spec.entities.find((e) => e.slug === topicKey)?.preferredLabel ?? topicKey} Neighborhood`,
    specVersion: `hand_wrist_${topicKey}_v1`,
    primaryEntitySlug: topicKey,
    sourceIds: spec.sourceIds,
    assetCounts: spec.assetCounts,
    entities: spec.entities,
    relationships: activeHandWristRelationshipsForTopic(topicKey),
    claimDrafts: spec.claimDrafts,
    decisionPointDrafts: spec.decisionPointDrafts,
  });
}

export function buildAdultReconstructionProposalPacket(topicKey: string) {
  const spec = getAdultReconstructionPilotSpec(topicKey);
  if (!spec) {
    throw new Error(`No adult reconstruction pilot spec for topic ${topicKey}`);
  }
  const entry = ADULT_RECONSTRUCTION_TOPIC_CATALOG.find((t) => t.topicKey === topicKey);
  if (!entry) {
    throw new Error(`No adult reconstruction catalog entry for topic ${topicKey}`);
  }
  return buildPilotProposalPacket({
    pilotKey: spec.pilotKey,
    pilotPacketKey: `pilot:${spec.pilotKey}`,
    pilotPacketLabel: `${entry.displayName} Neighborhood`,
    specVersion: `adult_reconstruction_${topicKey}_v1`,
    primaryEntitySlug: entry.primaryEntitySlug,
    sourceIds: spec.sourceIds,
    assetCounts: spec.assetCounts,
    entities: spec.entities,
    relationships: spec.relationships,
    claimDrafts: spec.claimDrafts,
    decisionPointDrafts: spec.decisionPointDrafts,
  });
}

export function buildSportsMedicineProposalPacket(topicKey: string) {
  const spec = getSportsPilotSpec(topicKey);
  if (!spec) {
    throw new Error(`No sports medicine pilot spec for topic ${topicKey}`);
  }
  return buildPilotProposalPacket({
    pilotKey: spec.pilotKey,
    pilotPacketKey: `pilot:${spec.pilotKey}`,
    pilotPacketLabel: `${spec.seed.displayName} Neighborhood`,
    specVersion: `sports_medicine_${spec.seed.topicKey}_v1`,
    primaryEntitySlug: spec.seed.primaryEntitySlug,
    sourceIds: spec.sourceIds,
    assetCounts: spec.assetCounts,
    entities: spec.entities,
    relationships: activeSportsRelationships(topicKey),
    claimDrafts: spec.claimDrafts,
    decisionPointDrafts: spec.decisionPointDrafts,
  });
}
