/**
 * Trauma Fundamentals canonical knowledge neighborhood.
 *
 * Pure data consumed by the existing Knowledge Factory. Claims and decision
 * points remain generated drafts until the factory review gates approve them.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export const TRAUMA_FUNDAMENTALS_PILOT_KEY = "trauma-fundamentals-neighborhood" as const;

export const TRAUMA_FUNDAMENTALS_SOURCE_IDS = {
  curriculumNodeSlug: "trauma-fundamentals",
  prepareTopicId: "trauma-fundamentals",
  legacyRetargetProposalKey: "retarget:trauma-fundamentals",
} as const;

export const TRAUMA_FUNDAMENTALS_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 0,
} as const;

const entity = (
  slug: string,
  entityType: PilotEntitySpec["entityType"],
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec => ({
  slug,
  entityType,
  preferredLabel,
  description,
  metadata: {
    pilot: TRAUMA_FUNDAMENTALS_PILOT_KEY,
    neighborhood: "trauma-fundamentals",
    ...metadata,
  },
});

export const TRAUMA_FUNDAMENTALS_ENTITIES: PilotEntitySpec[] = [
  entity("trauma-fundamentals", "treatment_principle", "Trauma Fundamentals", "Reusable principles for safe initial evaluation and management of orthopaedic trauma.", { clinical_kind: "foundational_backbone", maturity_target: 7 }),
  entity("trauma-primary-survey", "exam_maneuver", "Trauma Primary Survey", "Structured identification and treatment of immediate life threats before limb-focused care."),
  entity("secondary-survey", "exam_maneuver", "Trauma Secondary Survey", "Head-to-toe evaluation after immediate life threats have been addressed."),
  entity("orthopaedic-trauma-resuscitation", "treatment_principle", "Orthopaedic Trauma Resuscitation", "Coordination of fracture care with physiologic stabilization and resuscitation."),
  entity("neurovascular-examination", "exam_maneuver", "Neurovascular Examination", "Documented motor, sensory, pulse, perfusion, and vascular assessment distal to an injury."),
  entity("serial-neurovascular-examinations", "exam_maneuver", "Serial Neurovascular Examinations", "Repeated neurovascular examinations used to detect interval deterioration."),
  entity("vascular-injury", "condition", "Traumatic Vascular Injury", "Arterial or venous injury associated with musculoskeletal trauma."),
  entity("peripheral-nerve-injury", "condition", "Traumatic Peripheral Nerve Injury", "Peripheral nerve dysfunction caused by trauma, traction, compression, or laceration."),
  entity("open-fracture", "condition", "Open Fracture", "A fracture communicating with the external environment through a traumatic wound."),
  entity("gustilo-anderson-classification", "classification_system", "Gustilo-Anderson Classification", "Classification system for open fractures based on wound, contamination, and soft-tissue injury."),
  entity("open-fracture-antibiotic-prophylaxis", "treatment_principle", "Open Fracture Antibiotic Prophylaxis", "Prompt antimicrobial prophylaxis selected for the open-fracture injury pattern and contamination context."),
  entity("tetanus-prophylaxis", "treatment_principle", "Tetanus Prophylaxis", "Assessment and treatment of tetanus immunization needs after traumatic wounds."),
  entity("irrigation-and-debridement-open-fracture", "procedure", "Open Fracture Irrigation and Debridement", "Operative removal of contamination and devitalized tissue with irrigation of an open fracture wound."),
  entity("fracture-related-infection", "complication", "Fracture-Related Infection", "Infection occurring in the setting of a fracture and its treatment."),
  entity("acute-compartment-syndrome", "condition", "Acute Compartment Syndrome", "Pathologic elevation of compartment pressure threatening tissue perfusion and viability."),
  entity("compartment-examination", "exam_maneuver", "Compartment Examination", "Serial clinical assessment for pain, passive-stretch pain, swelling, tension, and neurologic change."),
  entity("compartment-pressure-measurement", "diagnostic_test", "Compartment Pressure Measurement", "Adjunctive invasive pressure measurement when the clinical examination is unreliable or equivocal."),
  entity("emergent-fasciotomy", "procedure", "Emergent Fasciotomy", "Urgent surgical release of involved osteofascial compartments."),
  entity("closed-reduction", "procedure", "Closed Reduction", "Manipulative restoration of alignment without surgical exposure of the fracture or joint."),
  entity("traction-reduction-principle", "treatment_principle", "Traction and Countertraction", "Controlled force application used during reduction while protecting soft tissues."),
  entity("splint-immobilization", "procedure", "Splint Immobilization", "Noncircumferential immobilization that maintains alignment while accommodating swelling."),
  entity("post-reduction-assessment", "exam_maneuver", "Post-Reduction Assessment", "Repeat examination and imaging after reduction and immobilization."),
  entity("post-reduction-radiographs", "diagnostic_test", "Post-Reduction Radiographs", "Imaging used to document alignment after reduction and immobilization."),
  entity("soft-tissue-envelope", "anatomy_structure", "Soft-Tissue Envelope", "Skin, subcutaneous tissue, fascia, muscle, and neurovascular structures surrounding an injury."),
  entity("soft-tissue-management", "treatment_principle", "Soft-Tissue Management", "Protection, reassessment, and staged treatment of injured soft tissues."),
  entity("damage-control-orthopaedics", "treatment_principle", "Damage Control Orthopaedics", "Temporary stabilization strategy used when physiology or soft tissues make definitive fixation unsafe."),
  entity("temporary-external-fixation", "fixation_method", "Temporary External Fixation", "Percutaneous pin-and-frame stabilization used as a temporary trauma construct."),
  entity("early-appropriate-care", "treatment_principle", "Early Appropriate Care", "Definitive fixation strategy selected after adequate physiologic response to resuscitation."),
  entity("fracture-stability", "biomechanics_concept", "Fracture Stability", "Mechanical environment governing displacement and tissue strain at a fracture site."),
  entity("absolute-stability", "biomechanics_concept", "Absolute Stability", "Interfragmentary compression strategy minimizing motion at a simple fracture."),
  entity("relative-stability", "biomechanics_concept", "Relative Stability", "Construct strategy permitting controlled micromotion and callus formation."),
  entity("interfragmentary-strain", "biomechanics_concept", "Interfragmentary Strain", "Relative deformation across a fracture gap under load."),
  entity("primary-bone-healing", "biomechanics_concept", "Primary Bone Healing", "Direct bone healing under conditions of anatomic reduction and high stability."),
  entity("secondary-bone-healing", "biomechanics_concept", "Secondary Bone Healing", "Indirect healing through callus under relative stability."),
  entity("delayed-union", "complication", "Delayed Union", "Fracture healing that progresses more slowly than expected."),
  entity("fracture-nonunion", "complication", "Fracture Nonunion", "Failure of a fracture to progress to union without further intervention."),
  entity("fracture-malunion", "complication", "Fracture Malunion", "Fracture healing in unacceptable alignment."),
  entity("lag-screw-fixation", "fixation_method", "Lag Screw Fixation", "Interfragmentary compression achieved by screw technique or design."),
  entity("plate-fixation", "fixation_method", "Plate Fixation", "Internal fixation using a plate-and-screw construct."),
  entity("intramedullary-nail-fixation", "fixation_method", "Intramedullary Nail Fixation", "Load-sharing internal fixation placed within the medullary canal."),
  entity("early-postoperative-trauma-care", "treatment_principle", "Early Postoperative Trauma Care", "Immediate postoperative surveillance, mobilization, prophylaxis, and restriction planning after trauma surgery."),
  entity("postoperative-neurovascular-examination", "exam_maneuver", "Postoperative Neurovascular Examination", "Documented limb examination after trauma surgery."),
  entity("venous-thromboembolism", "complication", "Venous Thromboembolism", "Deep venous thrombosis or pulmonary embolism associated with injury and recovery."),
  entity("loss-of-reduction", "complication", "Loss of Reduction", "Failure to maintain achieved fracture or joint alignment."),
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({
  subjectSlug,
  predicate,
  objectSlug,
  metadata: {
    relevance_reason: "trauma_fundamentals",
    context_relevance: ["call", "or", "oite"],
    ...metadata,
  },
});

export const TRAUMA_FUNDAMENTALS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("trauma-primary-survey", "prerequisite_for", "secondary-survey", { clinical_importance: "critical" }),
  rel("secondary-survey", "prerequisite_for", "neurovascular-examination"),
  rel("orthopaedic-trauma-resuscitation", "prerequisite_for", "early-appropriate-care"),
  rel("neurovascular-examination", "examines", "vascular-injury", { clinical_importance: "critical" }),
  rel("neurovascular-examination", "examines", "peripheral-nerve-injury", { clinical_importance: "critical" }),
  rel("serial-neurovascular-examinations", "examines", "vascular-injury"),
  rel("serial-neurovascular-examinations", "examines", "peripheral-nerve-injury"),
  rel("open-fracture", "has_classification", "gustilo-anderson-classification"),
  rel("open-fracture", "treated_by", "open-fracture-antibiotic-prophylaxis", { management_importance: "critical" }),
  rel("open-fracture", "treated_by", "tetanus-prophylaxis", { management_importance: "high" }),
  rel("open-fracture", "treated_by", "irrigation-and-debridement-open-fracture", { management_importance: "critical" }),
  rel("open-fracture", "involves_anatomy", "soft-tissue-envelope"),
  rel("open-fracture", "has_complication", "fracture-related-infection"),
  rel("irrigation-and-debridement-open-fracture", "involves_anatomy", "soft-tissue-envelope"),
  rel("acute-compartment-syndrome", "tested_by", "compartment-examination", { clinical_importance: "critical" }),
  rel("acute-compartment-syndrome", "tested_by", "compartment-pressure-measurement"),
  rel("acute-compartment-syndrome", "treated_by", "emergent-fasciotomy", { management_importance: "critical" }),
  rel("closed-reduction", "involves_anatomy", "soft-tissue-envelope"),
  rel("closed-reduction", "prerequisite_for", "splint-immobilization"),
  rel("traction-reduction-principle", "prerequisite_for", "closed-reduction"),
  rel("closed-reduction", "prerequisite_for", "post-reduction-assessment"),
  rel("closed-reduction", "requires_imaging", "post-reduction-radiographs"),
  rel("post-reduction-assessment", "examines", "vascular-injury"),
  rel("post-reduction-assessment", "examines", "peripheral-nerve-injury"),
  rel("splint-immobilization", "has_complication", "loss-of-reduction"),
  rel("soft-tissue-envelope", "prerequisite_for", "soft-tissue-management"),
  rel("soft-tissue-management", "prerequisite_for", "early-appropriate-care"),
  rel("damage-control-orthopaedics", "prerequisite_for", "early-appropriate-care"),
  rel("temporary-external-fixation", "prerequisite_for", "early-appropriate-care"),
  rel("fracture-stability", "prerequisite_for", "absolute-stability"),
  rel("fracture-stability", "prerequisite_for", "relative-stability"),
  rel("interfragmentary-strain", "prerequisite_for", "primary-bone-healing"),
  rel("interfragmentary-strain", "prerequisite_for", "secondary-bone-healing"),
  rel("absolute-stability", "prerequisite_for", "primary-bone-healing"),
  rel("relative-stability", "prerequisite_for", "secondary-bone-healing"),
  rel("lag-screw-fixation", "prerequisite_for", "absolute-stability"),
  rel("plate-fixation", "prerequisite_for", "absolute-stability"),
  rel("intramedullary-nail-fixation", "prerequisite_for", "relative-stability"),
  rel("temporary-external-fixation", "prerequisite_for", "relative-stability"),
  rel("fracture-nonunion", "commonly_confused_with", "delayed-union"),
  rel("delayed-union", "commonly_confused_with", "fracture-nonunion"),
  rel("postoperative-neurovascular-examination", "prerequisite_for", "early-postoperative-trauma-care"),
  rel("irrigation-and-debridement-open-fracture", "has_complication", "fracture-related-infection"),
  rel("splint-immobilization", "has_complication", "venous-thromboembolism"),
];

export function activeTraumaFundamentalsRelationships(): PilotRelationshipSpec[] {
  return TRAUMA_FUNDAMENTALS_RELATIONSHIPS.filter((relationship) => !relationship.metadata?.disabled);
}

const claim = (
  draftId: string,
  claimType: PilotClaimDraft["claimType"],
  claimText: string,
  primaryEntitySlug: string,
  importanceLevel: PilotClaimDraft["importanceLevel"],
  contextRelevance: string[]
): PilotClaimDraft => ({
  draftId,
  claimType,
  claimText,
  primaryEntitySlug,
  importanceLevel,
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote: "Trauma Fundamentals manufacture scope; evidence packet required",
  contextRelevance,
});

export const TRAUMA_FUNDAMENTALS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-tf-life-before-limb", "fact", "Immediate life threats are addressed before definitive management of an extremity injury.", "trauma-primary-survey", "L1", ["call", "oite"]),
  claim("claim-tf-document-nv", "clinical_script", "Document motor, sensory, pulse, and perfusion findings before and after reduction, splinting, or surgery.", "neurovascular-examination", "L1", ["call", "or"]),
  claim("claim-tf-serial-nv", "fact", "A single normal neurovascular examination does not replace serial assessment when deterioration remains possible.", "serial-neurovascular-examinations", "L1", ["call"]),
  claim("claim-tf-open-until-proven", "cognitive_trap", "A wound near a fracture should be evaluated for communication with the fracture rather than dismissed by wound size.", "open-fracture", "L1", ["call", "oite"]),
  claim("claim-tf-antibiotic-priority", "fact", "Open-fracture antibiotic prophylaxis is a time-sensitive component of initial management.", "open-fracture-antibiotic-prophylaxis", "L1", ["call", "oite"]),
  claim("claim-tf-tetanus", "fact", "Traumatic wound care includes assessment of tetanus immunization and prophylaxis needs.", "tetanus-prophylaxis", "L2", ["call"]),
  claim("claim-tf-compartment-clinical", "board_trap", "Preserved pulses do not exclude acute compartment syndrome.", "acute-compartment-syndrome", "L1", ["call", "oite"]),
  claim("claim-tf-pressure-adjunct", "fact", "Compartment pressure measurement is an adjunct when the examination is unreliable or equivocal and should not delay treatment of a clear clinical syndrome.", "compartment-pressure-measurement", "L1", ["call", "oite"]),
  claim("claim-tf-reduction-nv", "fact", "Urgent reduction of a gross deformity is followed by repeat neurovascular examination and documentation.", "closed-reduction", "L1", ["call"]),
  claim("claim-tf-splint-swelling", "fact", "Initial splinting should maintain reduction while accommodating expected swelling and protecting skin.", "splint-immobilization", "L1", ["call"]),
  claim("claim-tf-post-reduction", "fact", "Post-reduction assessment includes alignment imaging and repeat skin and neurovascular examination.", "post-reduction-assessment", "L1", ["call", "oite"]),
  claim("claim-tf-soft-tissue-timing", "fact", "Definitive fixation timing is governed by both patient physiology and the condition of the soft-tissue envelope.", "soft-tissue-management", "L1", ["call", "or"]),
  claim("claim-tf-dco", "fact", "Damage control orthopaedics uses temporary stabilization when physiologic or soft-tissue conditions make definitive fixation unsafe.", "damage-control-orthopaedics", "L2", ["call", "oite"]),
  claim("claim-tf-absolute", "fact", "Absolute stability is paired with minimal interfragmentary motion and primary bone healing.", "absolute-stability", "L1", ["or", "oite"]),
  claim("claim-tf-relative", "fact", "Relative stability permits controlled motion and commonly produces secondary bone healing with callus.", "relative-stability", "L1", ["or", "oite"]),
  claim("claim-tf-strain", "fact", "Interfragmentary strain links fracture-gap mechanics to the tissue that can form during healing.", "interfragmentary-strain", "L2", ["or", "oite"]),
  claim("claim-tf-nonunion-factors", "fact", "Evaluation of impaired union considers mechanical stability, biology, infection, host factors, and time course.", "fracture-nonunion", "L1", ["clinic", "oite"]),
  claim("claim-tf-postop", "fact", "Early postoperative trauma care includes neurovascular surveillance, wound and compartment assessment, mobilization restrictions, and prophylaxis planning.", "early-postoperative-trauma-care", "L1", ["or", "floor"]),
];

const decisionPoint = (
  draftId: string,
  subjectEntitySlug: string,
  patternType: string,
  trigger: string,
  action: string,
  urgency: PilotDecisionPointDraft["urgency"],
  safetyCriticality: PilotDecisionPointDraft["safetyCriticality"]
): PilotDecisionPointDraft => ({
  draftId,
  subjectEntitySlug,
  patternType,
  trigger,
  action,
  urgency,
  safetyCriticality,
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote: "Trauma Fundamentals manufacture scope; evidence packet required",
  requiresAttendingReview: true,
});

export const TRAUMA_FUNDAMENTALS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  decisionPoint("dp-tf-unstable-patient", "orthopaedic-trauma-resuscitation", "resuscitation_priority", "Hemodynamic instability or unresolved life threat", "Prioritize resuscitation and life-saving intervention before definitive fracture fixation", "emergent", "emergency"),
  decisionPoint("dp-tf-vascular-compromise", "vascular-injury", "limb_threat", "Absent pulse, impaired perfusion, expanding hematoma, or evolving ischemia", "Reduce gross deformity when appropriate and escalate immediately for vascular evaluation and limb-saving management", "emergent", "emergency"),
  decisionPoint("dp-tf-open-fracture", "open-fracture", "initial_management", "Fracture with a communicating wound or high suspicion for communication", "Cover the wound, document neurovascular status, initiate indicated antibiotics and tetanus assessment, and arrange operative debridement", "urgent", "high"),
  decisionPoint("dp-tf-compartment", "acute-compartment-syndrome", "emergent_intervention", "Clinical findings concerning for evolving acute compartment syndrome", "Remove constriction, keep the limb appropriately positioned, perform serial examination, and escalate for emergent fasciotomy", "emergent", "emergency"),
  decisionPoint("dp-tf-pressure", "compartment-pressure-measurement", "diagnostic_adjunct", "Unreliable or equivocal examination with ongoing concern for compartment syndrome", "Use pressure measurement as an adjunct while maintaining serial assessment and urgent escalation", "urgent", "high"),
  decisionPoint("dp-tf-reduce", "closed-reduction", "urgent_reduction", "Gross deformity, threatened skin, dislocation, or neurovascular compromise", "Perform timely controlled reduction with appropriate analgesia or sedation and document post-reduction status", "urgent", "high"),
  decisionPoint("dp-tf-splint", "splint-immobilization", "immobilization", "Reduced or unstable acute injury requiring temporary support", "Apply a well-padded splint that maintains alignment and accommodates swelling, then repeat examination", "urgent", "moderate"),
  decisionPoint("dp-tf-dco", "damage-control-orthopaedics", "fixation_timing", "Physiologic instability, severe soft-tissue injury, or unsafe definitive operative conditions", "Choose temporary stabilization and defer definitive fixation until physiology and soft tissues permit", "urgent", "high"),
  decisionPoint("dp-tf-stability", "fracture-stability", "construct_selection", "Simple reconstructible pattern versus comminuted or biologically vulnerable pattern", "Select absolute or relative stability principles appropriate to fracture morphology and biology", "routine", "moderate"),
  decisionPoint("dp-tf-union", "fracture-nonunion", "healing_failure", "Failure of expected clinical or radiographic progression toward union", "Evaluate mechanical, biologic, infectious, and host contributors before selecting revision treatment", "routine", "high"),
  decisionPoint("dp-tf-postop-change", "early-postoperative-trauma-care", "postoperative_escalation", "New pain escalation, neurologic change, perfusion change, wound concern, or loss of alignment", "Repeat focused examination and imaging as indicated and escalate promptly for a limb- or construct-threatening complication", "urgent", "high"),
];
