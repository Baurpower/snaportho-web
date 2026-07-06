/**
 * Loader mapping adult reconstruction topic keys to pilot spec exports.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import { ADULT_RECONSTRUCTION_TOPIC_KEYS } from "./kg-adult-reconstruction-topic-catalog.ts";
import {
  HipOsteoarthritis_ASSET_COUNTS,
  HipOsteoarthritis_CLAIM_DRAFTS,
  HipOsteoarthritis_DECISION_POINT_DRAFTS,
  HipOsteoarthritis_ENTITIES,
  HipOsteoarthritis_PILOT_KEY,
  HipOsteoarthritis_SOURCE_IDS,
  activeHipOsteoarthritisRelationships,
} from "./kg-hip-osteoarthritis-pilot-spec.ts";
import {
  FemoralNeckFractureAdultRecon_ASSET_COUNTS,
  FemoralNeckFractureAdultRecon_CLAIM_DRAFTS,
  FemoralNeckFractureAdultRecon_DECISION_POINT_DRAFTS,
  FemoralNeckFractureAdultRecon_ENTITIES,
  FemoralNeckFractureAdultRecon_PILOT_KEY,
  FemoralNeckFractureAdultRecon_SOURCE_IDS,
  activeFemoralNeckFractureAdultReconRelationships,
} from "./kg-femoral-neck-fracture-adult-recon-pilot-spec.ts";
import {
  PeriprostheticFemurFracture_ASSET_COUNTS,
  PeriprostheticFemurFracture_CLAIM_DRAFTS,
  PeriprostheticFemurFracture_DECISION_POINT_DRAFTS,
  PeriprostheticFemurFracture_ENTITIES,
  PeriprostheticFemurFracture_PILOT_KEY,
  PeriprostheticFemurFracture_SOURCE_IDS,
  activePeriprostheticFemurFractureRelationships,
} from "./kg-periprosthetic-femur-fracture-pilot-spec.ts";
import {
  HipProstheticJointInfection_ASSET_COUNTS,
  HipProstheticJointInfection_CLAIM_DRAFTS,
  HipProstheticJointInfection_DECISION_POINT_DRAFTS,
  HipProstheticJointInfection_ENTITIES,
  HipProstheticJointInfection_PILOT_KEY,
  HipProstheticJointInfection_SOURCE_IDS,
  activeHipProstheticJointInfectionRelationships,
} from "./kg-hip-prosthetic-joint-infection-pilot-spec.ts";
import {
  AsepticLooseningTha_ASSET_COUNTS,
  AsepticLooseningTha_CLAIM_DRAFTS,
  AsepticLooseningTha_DECISION_POINT_DRAFTS,
  AsepticLooseningTha_ENTITIES,
  AsepticLooseningTha_PILOT_KEY,
  AsepticLooseningTha_SOURCE_IDS,
  activeAsepticLooseningThaRelationships,
} from "./kg-aseptic-loosening-tha-pilot-spec.ts";
import {
  HipInstabilityAfterTha_ASSET_COUNTS,
  HipInstabilityAfterTha_CLAIM_DRAFTS,
  HipInstabilityAfterTha_DECISION_POINT_DRAFTS,
  HipInstabilityAfterTha_ENTITIES,
  HipInstabilityAfterTha_PILOT_KEY,
  HipInstabilityAfterTha_SOURCE_IDS,
  activeHipInstabilityAfterThaRelationships,
} from "./kg-hip-instability-after-tha-pilot-spec.ts";
import {
  PolyethyleneWearOsteolysis_ASSET_COUNTS,
  PolyethyleneWearOsteolysis_CLAIM_DRAFTS,
  PolyethyleneWearOsteolysis_DECISION_POINT_DRAFTS,
  PolyethyleneWearOsteolysis_ENTITIES,
  PolyethyleneWearOsteolysis_PILOT_KEY,
  PolyethyleneWearOsteolysis_SOURCE_IDS,
  activePolyethyleneWearOsteolysisRelationships,
} from "./kg-polyethylene-wear-osteolysis-pilot-spec.ts";
import {
  AdverseLocalTissueReaction_ASSET_COUNTS,
  AdverseLocalTissueReaction_CLAIM_DRAFTS,
  AdverseLocalTissueReaction_DECISION_POINT_DRAFTS,
  AdverseLocalTissueReaction_ENTITIES,
  AdverseLocalTissueReaction_PILOT_KEY,
  AdverseLocalTissueReaction_SOURCE_IDS,
  activeAdverseLocalTissueReactionRelationships,
} from "./kg-adverse-local-tissue-reaction-pilot-spec.ts";
import {
  KneeOsteoarthritis_ASSET_COUNTS,
  KneeOsteoarthritis_CLAIM_DRAFTS,
  KneeOsteoarthritis_DECISION_POINT_DRAFTS,
  KneeOsteoarthritis_ENTITIES,
  KneeOsteoarthritis_PILOT_KEY,
  KneeOsteoarthritis_SOURCE_IDS,
  activeKneeOsteoarthritisRelationships,
} from "./kg-knee-osteoarthritis-pilot-spec.ts";
import {
  PeriprostheticKneeFracture_ASSET_COUNTS,
  PeriprostheticKneeFracture_CLAIM_DRAFTS,
  PeriprostheticKneeFracture_DECISION_POINT_DRAFTS,
  PeriprostheticKneeFracture_ENTITIES,
  PeriprostheticKneeFracture_PILOT_KEY,
  PeriprostheticKneeFracture_SOURCE_IDS,
  activePeriprostheticKneeFractureRelationships,
} from "./kg-periprosthetic-knee-fracture-pilot-spec.ts";
import {
  KneeProstheticJointInfection_ASSET_COUNTS,
  KneeProstheticJointInfection_CLAIM_DRAFTS,
  KneeProstheticJointInfection_DECISION_POINT_DRAFTS,
  KneeProstheticJointInfection_ENTITIES,
  KneeProstheticJointInfection_PILOT_KEY,
  KneeProstheticJointInfection_SOURCE_IDS,
  activeKneeProstheticJointInfectionRelationships,
} from "./kg-knee-prosthetic-joint-infection-pilot-spec.ts";
import {
  AsepticLooseningTka_ASSET_COUNTS,
  AsepticLooseningTka_CLAIM_DRAFTS,
  AsepticLooseningTka_DECISION_POINT_DRAFTS,
  AsepticLooseningTka_ENTITIES,
  AsepticLooseningTka_PILOT_KEY,
  AsepticLooseningTka_SOURCE_IDS,
  activeAsepticLooseningTkaRelationships,
} from "./kg-aseptic-loosening-tka-pilot-spec.ts";
import {
  KneeInstabilityAfterTka_ASSET_COUNTS,
  KneeInstabilityAfterTka_CLAIM_DRAFTS,
  KneeInstabilityAfterTka_DECISION_POINT_DRAFTS,
  KneeInstabilityAfterTka_ENTITIES,
  KneeInstabilityAfterTka_PILOT_KEY,
  KneeInstabilityAfterTka_SOURCE_IDS,
  activeKneeInstabilityAfterTkaRelationships,
} from "./kg-knee-instability-after-tka-pilot-spec.ts";
import {
  ExtensorMechanismFailure_ASSET_COUNTS,
  ExtensorMechanismFailure_CLAIM_DRAFTS,
  ExtensorMechanismFailure_DECISION_POINT_DRAFTS,
  ExtensorMechanismFailure_ENTITIES,
  ExtensorMechanismFailure_PILOT_KEY,
  ExtensorMechanismFailure_SOURCE_IDS,
  activeExtensorMechanismFailureRelationships,
} from "./kg-extensor-mechanism-failure-pilot-spec.ts";
import {
  PatellofemoralArthroplasty_ASSET_COUNTS,
  PatellofemoralArthroplasty_CLAIM_DRAFTS,
  PatellofemoralArthroplasty_DECISION_POINT_DRAFTS,
  PatellofemoralArthroplasty_ENTITIES,
  PatellofemoralArthroplasty_PILOT_KEY,
  PatellofemoralArthroplasty_SOURCE_IDS,
  activePatellofemoralArthroplastyRelationships,
} from "./kg-patellofemoral-arthroplasty-pilot-spec.ts";
import {
  UnicompartmentalKneeArthritis_ASSET_COUNTS,
  UnicompartmentalKneeArthritis_CLAIM_DRAFTS,
  UnicompartmentalKneeArthritis_DECISION_POINT_DRAFTS,
  UnicompartmentalKneeArthritis_ENTITIES,
  UnicompartmentalKneeArthritis_PILOT_KEY,
  UnicompartmentalKneeArthritis_SOURCE_IDS,
  activeUnicompartmentalKneeArthritisRelationships,
} from "./kg-unicompartmental-knee-arthritis-pilot-spec.ts";
import {
  PeriprostheticJointInfection_ASSET_COUNTS,
  PeriprostheticJointInfection_CLAIM_DRAFTS,
  PeriprostheticJointInfection_DECISION_POINT_DRAFTS,
  PeriprostheticJointInfection_ENTITIES,
  PeriprostheticJointInfection_PILOT_KEY,
  PeriprostheticJointInfection_SOURCE_IDS,
  activePeriprostheticJointInfectionRelationships,
} from "./kg-periprosthetic-joint-infection-pilot-spec.ts";
import {
  BoneLossRevisionArthroplasty_ASSET_COUNTS,
  BoneLossRevisionArthroplasty_CLAIM_DRAFTS,
  BoneLossRevisionArthroplasty_DECISION_POINT_DRAFTS,
  BoneLossRevisionArthroplasty_ENTITIES,
  BoneLossRevisionArthroplasty_PILOT_KEY,
  BoneLossRevisionArthroplasty_SOURCE_IDS,
  activeBoneLossRevisionArthroplastyRelationships,
} from "./kg-bone-loss-revision-arthroplasty-pilot-spec.ts";
import {
  ImplantFixationPrinciples_ASSET_COUNTS,
  ImplantFixationPrinciples_CLAIM_DRAFTS,
  ImplantFixationPrinciples_DECISION_POINT_DRAFTS,
  ImplantFixationPrinciples_ENTITIES,
  ImplantFixationPrinciples_PILOT_KEY,
  ImplantFixationPrinciples_SOURCE_IDS,
  activeImplantFixationPrinciplesRelationships,
} from "./kg-implant-fixation-principles-pilot-spec.ts";
import {
  BearingSurfaceSelection_ASSET_COUNTS,
  BearingSurfaceSelection_CLAIM_DRAFTS,
  BearingSurfaceSelection_DECISION_POINT_DRAFTS,
  BearingSurfaceSelection_ENTITIES,
  BearingSurfaceSelection_PILOT_KEY,
  BearingSurfaceSelection_SOURCE_IDS,
  activeBearingSurfaceSelectionRelationships,
} from "./kg-bearing-surface-selection-pilot-spec.ts";

export type AdultReconstructionPilotSpec = {
  pilotKey: string;
  sourceIds: {
    curriculumNodeSlug: string;
    prepareTopicId: string;
    legacyRetargetProposalKey: string;
  };
  assetCounts: { ankiCardMappings: number; orthobulletsQuestionMappings: number };
  entities: PilotEntitySpec[];
  relationships: PilotRelationshipSpec[];
  claimDrafts: PilotClaimDraft[];
  decisionPointDrafts: PilotDecisionPointDraft[];
};

const SPEC_MAP: Record<string, AdultReconstructionPilotSpec> = {
  "hip-osteoarthritis": {
    pilotKey: HipOsteoarthritis_PILOT_KEY,
    sourceIds: HipOsteoarthritis_SOURCE_IDS,
    assetCounts: HipOsteoarthritis_ASSET_COUNTS,
    entities: HipOsteoarthritis_ENTITIES,
    relationships: activeHipOsteoarthritisRelationships(),
    claimDrafts: HipOsteoarthritis_CLAIM_DRAFTS,
    decisionPointDrafts: HipOsteoarthritis_DECISION_POINT_DRAFTS,
  },
  "femoral-neck-fracture-adult-recon": {
    pilotKey: FemoralNeckFractureAdultRecon_PILOT_KEY,
    sourceIds: FemoralNeckFractureAdultRecon_SOURCE_IDS,
    assetCounts: FemoralNeckFractureAdultRecon_ASSET_COUNTS,
    entities: FemoralNeckFractureAdultRecon_ENTITIES,
    relationships: activeFemoralNeckFractureAdultReconRelationships(),
    claimDrafts: FemoralNeckFractureAdultRecon_CLAIM_DRAFTS,
    decisionPointDrafts: FemoralNeckFractureAdultRecon_DECISION_POINT_DRAFTS,
  },
  "periprosthetic-femur-fracture": {
    pilotKey: PeriprostheticFemurFracture_PILOT_KEY,
    sourceIds: PeriprostheticFemurFracture_SOURCE_IDS,
    assetCounts: PeriprostheticFemurFracture_ASSET_COUNTS,
    entities: PeriprostheticFemurFracture_ENTITIES,
    relationships: activePeriprostheticFemurFractureRelationships(),
    claimDrafts: PeriprostheticFemurFracture_CLAIM_DRAFTS,
    decisionPointDrafts: PeriprostheticFemurFracture_DECISION_POINT_DRAFTS,
  },
  "hip-prosthetic-joint-infection": {
    pilotKey: HipProstheticJointInfection_PILOT_KEY,
    sourceIds: HipProstheticJointInfection_SOURCE_IDS,
    assetCounts: HipProstheticJointInfection_ASSET_COUNTS,
    entities: HipProstheticJointInfection_ENTITIES,
    relationships: activeHipProstheticJointInfectionRelationships(),
    claimDrafts: HipProstheticJointInfection_CLAIM_DRAFTS,
    decisionPointDrafts: HipProstheticJointInfection_DECISION_POINT_DRAFTS,
  },
  "aseptic-loosening-tha": {
    pilotKey: AsepticLooseningTha_PILOT_KEY,
    sourceIds: AsepticLooseningTha_SOURCE_IDS,
    assetCounts: AsepticLooseningTha_ASSET_COUNTS,
    entities: AsepticLooseningTha_ENTITIES,
    relationships: activeAsepticLooseningThaRelationships(),
    claimDrafts: AsepticLooseningTha_CLAIM_DRAFTS,
    decisionPointDrafts: AsepticLooseningTha_DECISION_POINT_DRAFTS,
  },
  "hip-instability-after-tha": {
    pilotKey: HipInstabilityAfterTha_PILOT_KEY,
    sourceIds: HipInstabilityAfterTha_SOURCE_IDS,
    assetCounts: HipInstabilityAfterTha_ASSET_COUNTS,
    entities: HipInstabilityAfterTha_ENTITIES,
    relationships: activeHipInstabilityAfterThaRelationships(),
    claimDrafts: HipInstabilityAfterTha_CLAIM_DRAFTS,
    decisionPointDrafts: HipInstabilityAfterTha_DECISION_POINT_DRAFTS,
  },
  "polyethylene-wear-osteolysis": {
    pilotKey: PolyethyleneWearOsteolysis_PILOT_KEY,
    sourceIds: PolyethyleneWearOsteolysis_SOURCE_IDS,
    assetCounts: PolyethyleneWearOsteolysis_ASSET_COUNTS,
    entities: PolyethyleneWearOsteolysis_ENTITIES,
    relationships: activePolyethyleneWearOsteolysisRelationships(),
    claimDrafts: PolyethyleneWearOsteolysis_CLAIM_DRAFTS,
    decisionPointDrafts: PolyethyleneWearOsteolysis_DECISION_POINT_DRAFTS,
  },
  "adverse-local-tissue-reaction": {
    pilotKey: AdverseLocalTissueReaction_PILOT_KEY,
    sourceIds: AdverseLocalTissueReaction_SOURCE_IDS,
    assetCounts: AdverseLocalTissueReaction_ASSET_COUNTS,
    entities: AdverseLocalTissueReaction_ENTITIES,
    relationships: activeAdverseLocalTissueReactionRelationships(),
    claimDrafts: AdverseLocalTissueReaction_CLAIM_DRAFTS,
    decisionPointDrafts: AdverseLocalTissueReaction_DECISION_POINT_DRAFTS,
  },
  "knee-osteoarthritis": {
    pilotKey: KneeOsteoarthritis_PILOT_KEY,
    sourceIds: KneeOsteoarthritis_SOURCE_IDS,
    assetCounts: KneeOsteoarthritis_ASSET_COUNTS,
    entities: KneeOsteoarthritis_ENTITIES,
    relationships: activeKneeOsteoarthritisRelationships(),
    claimDrafts: KneeOsteoarthritis_CLAIM_DRAFTS,
    decisionPointDrafts: KneeOsteoarthritis_DECISION_POINT_DRAFTS,
  },
  "periprosthetic-knee-fracture": {
    pilotKey: PeriprostheticKneeFracture_PILOT_KEY,
    sourceIds: PeriprostheticKneeFracture_SOURCE_IDS,
    assetCounts: PeriprostheticKneeFracture_ASSET_COUNTS,
    entities: PeriprostheticKneeFracture_ENTITIES,
    relationships: activePeriprostheticKneeFractureRelationships(),
    claimDrafts: PeriprostheticKneeFracture_CLAIM_DRAFTS,
    decisionPointDrafts: PeriprostheticKneeFracture_DECISION_POINT_DRAFTS,
  },
  "knee-prosthetic-joint-infection": {
    pilotKey: KneeProstheticJointInfection_PILOT_KEY,
    sourceIds: KneeProstheticJointInfection_SOURCE_IDS,
    assetCounts: KneeProstheticJointInfection_ASSET_COUNTS,
    entities: KneeProstheticJointInfection_ENTITIES,
    relationships: activeKneeProstheticJointInfectionRelationships(),
    claimDrafts: KneeProstheticJointInfection_CLAIM_DRAFTS,
    decisionPointDrafts: KneeProstheticJointInfection_DECISION_POINT_DRAFTS,
  },
  "aseptic-loosening-tka": {
    pilotKey: AsepticLooseningTka_PILOT_KEY,
    sourceIds: AsepticLooseningTka_SOURCE_IDS,
    assetCounts: AsepticLooseningTka_ASSET_COUNTS,
    entities: AsepticLooseningTka_ENTITIES,
    relationships: activeAsepticLooseningTkaRelationships(),
    claimDrafts: AsepticLooseningTka_CLAIM_DRAFTS,
    decisionPointDrafts: AsepticLooseningTka_DECISION_POINT_DRAFTS,
  },
  "knee-instability-after-tka": {
    pilotKey: KneeInstabilityAfterTka_PILOT_KEY,
    sourceIds: KneeInstabilityAfterTka_SOURCE_IDS,
    assetCounts: KneeInstabilityAfterTka_ASSET_COUNTS,
    entities: KneeInstabilityAfterTka_ENTITIES,
    relationships: activeKneeInstabilityAfterTkaRelationships(),
    claimDrafts: KneeInstabilityAfterTka_CLAIM_DRAFTS,
    decisionPointDrafts: KneeInstabilityAfterTka_DECISION_POINT_DRAFTS,
  },
  "extensor-mechanism-failure": {
    pilotKey: ExtensorMechanismFailure_PILOT_KEY,
    sourceIds: ExtensorMechanismFailure_SOURCE_IDS,
    assetCounts: ExtensorMechanismFailure_ASSET_COUNTS,
    entities: ExtensorMechanismFailure_ENTITIES,
    relationships: activeExtensorMechanismFailureRelationships(),
    claimDrafts: ExtensorMechanismFailure_CLAIM_DRAFTS,
    decisionPointDrafts: ExtensorMechanismFailure_DECISION_POINT_DRAFTS,
  },
  "patellofemoral-arthroplasty": {
    pilotKey: PatellofemoralArthroplasty_PILOT_KEY,
    sourceIds: PatellofemoralArthroplasty_SOURCE_IDS,
    assetCounts: PatellofemoralArthroplasty_ASSET_COUNTS,
    entities: PatellofemoralArthroplasty_ENTITIES,
    relationships: activePatellofemoralArthroplastyRelationships(),
    claimDrafts: PatellofemoralArthroplasty_CLAIM_DRAFTS,
    decisionPointDrafts: PatellofemoralArthroplasty_DECISION_POINT_DRAFTS,
  },
  "unicompartmental-knee-arthritis": {
    pilotKey: UnicompartmentalKneeArthritis_PILOT_KEY,
    sourceIds: UnicompartmentalKneeArthritis_SOURCE_IDS,
    assetCounts: UnicompartmentalKneeArthritis_ASSET_COUNTS,
    entities: UnicompartmentalKneeArthritis_ENTITIES,
    relationships: activeUnicompartmentalKneeArthritisRelationships(),
    claimDrafts: UnicompartmentalKneeArthritis_CLAIM_DRAFTS,
    decisionPointDrafts: UnicompartmentalKneeArthritis_DECISION_POINT_DRAFTS,
  },
  "periprosthetic-joint-infection": {
    pilotKey: PeriprostheticJointInfection_PILOT_KEY,
    sourceIds: PeriprostheticJointInfection_SOURCE_IDS,
    assetCounts: PeriprostheticJointInfection_ASSET_COUNTS,
    entities: PeriprostheticJointInfection_ENTITIES,
    relationships: activePeriprostheticJointInfectionRelationships(),
    claimDrafts: PeriprostheticJointInfection_CLAIM_DRAFTS,
    decisionPointDrafts: PeriprostheticJointInfection_DECISION_POINT_DRAFTS,
  },
  "bone-loss-revision-arthroplasty": {
    pilotKey: BoneLossRevisionArthroplasty_PILOT_KEY,
    sourceIds: BoneLossRevisionArthroplasty_SOURCE_IDS,
    assetCounts: BoneLossRevisionArthroplasty_ASSET_COUNTS,
    entities: BoneLossRevisionArthroplasty_ENTITIES,
    relationships: activeBoneLossRevisionArthroplastyRelationships(),
    claimDrafts: BoneLossRevisionArthroplasty_CLAIM_DRAFTS,
    decisionPointDrafts: BoneLossRevisionArthroplasty_DECISION_POINT_DRAFTS,
  },
  "implant-fixation-principles": {
    pilotKey: ImplantFixationPrinciples_PILOT_KEY,
    sourceIds: ImplantFixationPrinciples_SOURCE_IDS,
    assetCounts: ImplantFixationPrinciples_ASSET_COUNTS,
    entities: ImplantFixationPrinciples_ENTITIES,
    relationships: activeImplantFixationPrinciplesRelationships(),
    claimDrafts: ImplantFixationPrinciples_CLAIM_DRAFTS,
    decisionPointDrafts: ImplantFixationPrinciples_DECISION_POINT_DRAFTS,
  },
  "bearing-surface-selection": {
    pilotKey: BearingSurfaceSelection_PILOT_KEY,
    sourceIds: BearingSurfaceSelection_SOURCE_IDS,
    assetCounts: BearingSurfaceSelection_ASSET_COUNTS,
    entities: BearingSurfaceSelection_ENTITIES,
    relationships: activeBearingSurfaceSelectionRelationships(),
    claimDrafts: BearingSurfaceSelection_CLAIM_DRAFTS,
    decisionPointDrafts: BearingSurfaceSelection_DECISION_POINT_DRAFTS,
  },
};

export function getAdultReconstructionPilotSpec(topicKey: string): AdultReconstructionPilotSpec | undefined {
  return SPEC_MAP[topicKey];
}

export function listAdultReconstructionPilotTopicKeys(): string[] {
  return ADULT_RECONSTRUCTION_TOPIC_KEYS;
}