/**
 * Postoperative Protocols canonical knowledge neighborhood.
 *
 * Reusable recovery, surveillance, and progression backbone. Protocol objects
 * consume existing procedure, implant, anatomy, and complication identities.
 * Recommendations deliberately preserve surgeon/construct variability and are
 * generated drafts until the required clinical review is complete.
 */
import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export const POSTOPERATIVE_PROTOCOLS_PILOT_KEY = "postoperative-protocols-neighborhood" as const;
export const POSTOPERATIVE_PROTOCOLS_SOURCE_IDS = {
  curriculumNodeSlug: "postoperative-protocols",
  prepareTopicId: "postoperative-protocols",
  legacyRetargetProposalKey: "retarget:postoperative-protocols",
} as const;
export const POSTOPERATIVE_PROTOCOLS_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 0,
} as const;

const entity = (
  slug: string,
  entityType: string,
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec => ({
  slug, entityType, preferredLabel, description,
  metadata: { pilot: POSTOPERATIVE_PROTOCOLS_PILOT_KEY, neighborhood: "postoperative-protocols", ...metadata },
});

const protocol = (slug: string, label: string, domain: string, description: string) =>
  entity(slug, "treatment_principle", label, description, {
    domain, canonical_protocol: true, surgeon_variability: true,
    required_context: ["patient_population", "fixation_construct", "procedure_type", "clinical_context"],
  });

export const POSTOPERATIVE_PROTOCOLS_ENTITIES: PilotEntitySpec[] = [
  entity("postoperative-protocols", "treatment_principle", "Postoperative Protocols", "Canonical recovery, surveillance, and progression backbone for orthopaedic care."),
  protocol("non-weight-bearing", "Non-Weight Bearing", "weight_bearing", "Protocol prohibiting operative-extremity weight bearing."),
  protocol("toe-touch-weight-bearing", "Toe-Touch Weight Bearing", "weight_bearing", "Balance-only contact without meaningful limb loading."),
  protocol("partial-weight-bearing", "Partial Weight Bearing", "weight_bearing", "Restricted loading expressed by proportion or force limit."),
  protocol("weight-bearing-as-tolerated", "Weight Bearing as Tolerated", "weight_bearing", "Loading advanced within symptoms and construct-specific safety."),
  protocol("protected-weight-bearing", "Protected Weight Bearing", "weight_bearing", "Loading with an assistive device, orthosis, or other protection."),
  protocol("progressive-weight-bearing", "Progressive Weight Bearing", "weight_bearing", "Staged loading advanced by clinical and imaging milestones."),
  protocol("immediate-weight-bearing", "Immediate Weight Bearing", "weight_bearing", "Loading permitted immediately after treatment when the construct and patient permit."),
  protocol("construct-dependent-progression", "Construct-Dependent Progression", "weight_bearing", "Progression governed by fixation stability, biology, procedure, and patient context."),
  protocol("splinting-protocol", "Splinting Protocol", "immobilization", "Temporary noncircumferential immobilization and surveillance plan."),
  protocol("casting-protocol", "Casting Protocol", "immobilization", "Circumferential immobilization with skin, fit, and neurovascular surveillance."),
  protocol("bracing-protocol", "Bracing Protocol", "immobilization", "Orthosis selection, wear, removal, and progression plan."),
  protocol("hinged-bracing-protocol", "Hinged Bracing Protocol", "immobilization", "Brace protocol with staged motion limits."),
  protocol("range-of-motion-restriction", "Range-of-Motion Restriction", "immobilization", "Procedure- and repair-specific motion boundary."),
  protocol("motion-progression", "Motion Progression", "rehabilitation", "Milestone-based progression of active and passive motion."),
  protocol("protection-period", "Protection Period", "immobilization", "Biology- and construct-dependent interval protecting a repair or reconstruction."),
  protocol("postoperative-wound-management", "Postoperative Wound Management", "wound", "Dressing, drain, closure removal, incision, and infection-surveillance protocol."),
  protocol("dressing-change-protocol", "Dressing Change Protocol", "wound", "Timing and technique for postoperative dressing changes."),
  protocol("drain-management-protocol", "Drain Management Protocol", "wound", "Output surveillance and criteria-based drain removal."),
  protocol("closure-removal-protocol", "Suture and Staple Removal Protocol", "wound", "Wound-healing assessment before closure material removal."),
  protocol("incision-surveillance", "Incision Surveillance", "wound", "Serial evaluation for healing and wound complications."),
  protocol("postoperative-follow-up-schedule", "Postoperative Follow-Up Schedule", "surveillance", "Early, radiographic, healing, implant, and long-term follow-up framework."),
  protocol("radiographic-follow-up", "Radiographic Follow-Up", "surveillance", "Context-specific imaging intervals and comparison strategy."),
  protocol("fracture-healing-surveillance", "Fracture Healing Surveillance", "trauma", "Serial clinical and radiographic assessment of union progression."),
  protocol("implant-surveillance", "Implant Surveillance", "surveillance", "Monitoring alignment, migration, wear, loosening, and construct integrity."),
  protocol("arthroplasty-surveillance", "Arthroplasty Surveillance", "adult_reconstruction", "Longitudinal clinical and imaging review of joint replacement."),
  protocol("range-of-motion-milestones", "Range-of-Motion Milestones", "rehabilitation", "Time- and achievement-dependent motion targets."),
  protocol("strength-progression", "Strength Progression", "rehabilitation", "Staged activation, resistance, and kinetic-chain strengthening."),
  protocol("functional-milestones", "Functional Milestones", "rehabilitation", "Observable recovery achievements used to govern progression."),
  protocol("return-to-activity-progression", "Return-to-Activity Progression", "rehabilitation", "Criteria-based return to ADLs, work, sport, and unrestricted activity."),
  protocol("dvt-prophylaxis-protocol", "DVT Prophylaxis Protocol", "medication", "Risk-stratified mechanical and pharmacologic prophylaxis plan."),
  protocol("postoperative-antibiotic-protocol", "Postoperative Antibiotic Protocol", "medication", "Indication- and context-specific antimicrobial duration plan."),
  protocol("heterotopic-ossification-prophylaxis", "Heterotopic Ossification Prophylaxis", "medication", "Risk-based medication or radiation prophylaxis pathway."),
  protocol("multimodal-analgesia", "Multimodal Analgesia", "medication", "Opioid-sparing pain strategy using complementary modalities."),
  protocol("delayed-union-pathway", "Delayed Union Pathway", "trauma", "Escalation pathway when fracture healing progresses more slowly than expected."),
  protocol("nonunion-pathway", "Nonunion Pathway", "trauma", "Mechanical, biologic, infectious, and host evaluation before intervention."),
  protocol("dynamization-consideration", "Dynamization Consideration", "trauma", "Construct-specific consideration of controlled load transfer."),
  protocol("acl-rehabilitation-progression", "ACL Rehabilitation Progression", "sports", "Criteria-based recovery after ACL reconstruction."),
  protocol("rotator-cuff-progression", "Rotator Cuff Repair Progression", "sports", "Repair-size- and tissue-quality-dependent protection and motion progression."),
  protocol("meniscus-repair-restrictions", "Meniscus Repair Restrictions", "sports", "Tear- and repair-specific loading and motion restrictions."),
  protocol("tendon-repair-protection", "Tendon Repair Protection", "sports", "Repair-specific protection before graduated loading."),
  protocol("tha-precautions", "THA Precautions", "adult_reconstruction", "Approach-, stability-, and patient-specific dislocation precautions."),
  protocol("tka-rehabilitation-milestones", "TKA Rehabilitation Milestones", "adult_reconstruction", "Motion, strength, gait, and function milestones after TKA."),
  protocol("spine-fusion-surveillance", "Spine Fusion Surveillance", "spine", "Clinical and imaging assessment of fusion and hardware."),
  protocol("spine-return-to-work", "Spine Return-to-Work Progression", "spine", "Demand- and recovery-specific work progression after spine care."),
  protocol("pediatric-growth-surveillance", "Pediatric Growth Surveillance", "pediatrics", "Longitudinal monitoring after physeal injury or intervention."),
  protocol("physeal-monitoring", "Physeal Monitoring", "pediatrics", "Serial assessment for growth arrest, angular deformity, and length discrepancy."),
  protocol("hardware-removal-consideration", "Hardware Removal Consideration", "pediatrics", "Symptom-, growth-, implant-, and risk-specific removal decision."),
  protocol("failure-to-progress", "Failure to Progress", "cross_cutting", "Deviation from expected recovery prompting reassessment."),
  protocol("postoperative-red-flags", "Postoperative Red Flags", "cross_cutting", "Findings requiring urgent or emergent escalation."),
  protocol("reoperation-triggers", "Reoperation Triggers", "cross_cutting", "Clinical or imaging thresholds prompting operative reassessment."),
  protocol("patient-reported-outcome-surveillance", "Patient-Reported Outcome Surveillance", "cross_cutting", "Longitudinal symptom and function measurement."),
  protocol("shared-decision-checkpoint", "Shared Decision-Making Checkpoint", "cross_cutting", "Explicit point for aligning progression with risk, goals, and preferences."),
  // Reused canonical identities: references only.
  entity("fracture-nonunion", "complication", "Fracture Nonunion", "Existing canonical nonunion identity.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("delayed-union", "complication", "Delayed Union", "Existing canonical delayed-union identity.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("fracture-related-infection", "complication", "Fracture-Related Infection", "Existing canonical infection identity.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("venous-thromboembolism", "complication", "Venous Thromboembolism", "Existing canonical VTE identity.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("hardware-failure", "complication", "Hardware Failure", "Existing canonical hardware-failure identity.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("total-hip-arthroplasty", "procedure", "Total Hip Arthroplasty", "Existing canonical THA identity.", { reused_identity: true }),
  entity("total-knee-arthroplasty", "procedure", "Total Knee Arthroplasty", "Existing canonical TKA identity.", { reused_identity: true }),
  entity("acl-reconstruction", "procedure", "ACL Reconstruction", "Existing canonical ACL reconstruction identity.", { reused_identity: true, source_neighborhood: "acl-tear" }),
  entity("rotator-cuff-repair", "procedure", "Rotator Cuff Repair", "Existing canonical rotator cuff repair identity.", { reused_identity: true, source_neighborhood: "rotator-cuff-tear" }),
];

const rel = (subjectSlug: string, predicate: string, objectSlug: string, metadata: Record<string, unknown> = {}): PilotRelationshipSpec =>
  ({ subjectSlug, predicate, objectSlug, metadata: { pilot: POSTOPERATIVE_PROTOCOLS_PILOT_KEY, ...metadata } });

const RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("toe-touch-weight-bearing", "prerequisite_for", "partial-weight-bearing"),
  rel("partial-weight-bearing", "prerequisite_for", "progressive-weight-bearing"),
  rel("protected-weight-bearing", "prerequisite_for", "weight-bearing-as-tolerated"),
  rel("construct-dependent-progression", "prerequisite_for", "progressive-weight-bearing"),
  rel("range-of-motion-restriction", "prerequisite_for", "motion-progression"),
  rel("motion-progression", "prerequisite_for", "range-of-motion-milestones"),
  rel("range-of-motion-milestones", "prerequisite_for", "strength-progression"),
  rel("strength-progression", "prerequisite_for", "functional-milestones"),
  rel("functional-milestones", "prerequisite_for", "return-to-activity-progression"),
  rel("incision-surveillance", "prerequisite_for", "closure-removal-protocol"),
  rel("fracture-healing-surveillance", "prerequisite_for", "delayed-union-pathway"),
  rel("delayed-union-pathway", "prerequisite_for", "nonunion-pathway"),
  rel("implant-surveillance", "prerequisite_for", "hardware-removal-consideration"),
  rel("failure-to-progress", "prerequisite_for", "shared-decision-checkpoint"),
  rel("postoperative-red-flags", "prerequisite_for", "reoperation-triggers"),
  rel("patient-reported-outcome-surveillance", "prerequisite_for", "shared-decision-checkpoint"),
];
export function activePostoperativeProtocolsRelationships(): PilotRelationshipSpec[] { return RELATIONSHIPS; }

const context = "Population, fixation construct, procedure type, and clinical context must be recorded; preserve surgeon variability.";
const claim = (draftId: string, claimType: string, claimText: string, primaryEntitySlug: string, sourceNote: string): PilotClaimDraft => ({
  draftId, claimType, claimText, primaryEntitySlug, importanceLevel: "L1",
  contentSource: "generated_draft", reviewStatus: "needs_review",
  sourceNote: `${sourceNote} ${context}`, contextRelevance: ["clinic", "or", "floor", "caseprep", "oite"],
});
export const POSTOPERATIVE_PROTOCOLS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-pop-context", "fact", "A postoperative recommendation is incomplete without patient population, fixation construct, procedure type, and clinical context.", "postoperative-protocols", "Human review required."),
  claim("claim-wb-variable", "cognitive_trap", "Weight-bearing labels are not universal prescriptions; progression depends on construct stability, biology, procedure, soft tissues, and patient factors.", "construct-dependent-progression", "Weight-bearing recommendation: human review required."),
  claim("claim-wb-progression", "fact", "Progressive loading should be governed by explicit clinical, functional, and imaging milestones rather than time alone.", "progressive-weight-bearing", "Weight-bearing and time-dependent recommendation: human review required."),
  claim("claim-immobilization", "fact", "Immobilization balances protection against stiffness, skin injury, deconditioning, and thromboembolic risk.", "protection-period", "Time-dependent recommendation: human review required."),
  claim("claim-wound", "red_flag", "Persistent drainage, spreading erythema, dehiscence, fever, or increasing pain requires prompt wound and infection reassessment.", "incision-surveillance", "Human review required."),
  claim("claim-drain", "fact", "Drain removal should use the procedure-specific plan, output trend, wound status, and attending preference.", "drain-management-protocol", "Time-dependent recommendation: human review required."),
  claim("claim-follow-up", "fact", "Follow-up cadence should match the risk window for wound failure, loss of reduction, healing failure, and implant complications.", "postoperative-follow-up-schedule", "Time-dependent recommendation: human review required."),
  claim("claim-imaging", "fact", "Surveillance imaging is interpreted against prior studies and the expected trajectory for the procedure and construct.", "radiographic-follow-up", "Human review required."),
  claim("claim-rom", "fact", "Range-of-motion progression must respect tissue healing, repair security, fixation stability, and procedure-specific restrictions.", "motion-progression", "Time-dependent recommendation: human review required."),
  claim("claim-return", "fact", "Return to work and sport should be criteria-based and account for task demands, symptoms, strength, motion, confidence, and reinjury risk.", "return-to-activity-progression", "Time-dependent recommendation: human review required."),
  claim("claim-dvt", "fact", "DVT prophylaxis agent and duration require patient-, procedure-, mobility-, and bleeding-risk stratification.", "dvt-prophylaxis-protocol", "Medication-duration recommendation: attending review required."),
  claim("claim-antibiotic", "fact", "Postoperative antibiotic duration depends on indication, contamination, cultures, source control, and institutional practice.", "postoperative-antibiotic-protocol", "Medication-duration recommendation: attending review required."),
  claim("claim-ho", "fact", "Heterotopic ossification prophylaxis is reserved for context-specific risk and must consider medication or radiation harms.", "heterotopic-ossification-prophylaxis", "Medication-duration recommendation: attending review required."),
  claim("claim-trauma", "fact", "Failure of fracture healing progression prompts reassessment of mechanics, biology, infection, host factors, and adherence.", "failure-to-progress", "Attending review required."),
  claim("claim-dynamization", "fact", "Dynamization is a construct- and fracture-specific intervention, not a routine response to every slow-healing fracture.", "dynamization-consideration", "Weight-bearing/construct recommendation: attending review required."),
  claim("claim-acl", "fact", "ACL rehabilitation progression integrates effusion control, motion, strength, movement quality, and graft/meniscus constraints.", "acl-rehabilitation-progression", "Time-dependent recommendation: human review required."),
  claim("claim-cuff", "fact", "Rotator cuff progression varies with tear size, tissue quality, repair security, concomitant procedures, and patient factors.", "rotator-cuff-progression", "Time-dependent recommendation: human review required."),
  claim("claim-tha", "fact", "THA precautions vary with approach, stability, soft-tissue repair, component position, and patient risk.", "tha-precautions", "Time-dependent recommendation: human review required."),
  claim("claim-spine", "fact", "Fusion surveillance and activity progression account for symptoms, neurologic status, imaging, construct, bone health, and work demands.", "spine-fusion-surveillance", "Time-dependent recommendation: specialist review required."),
  claim("claim-peds", "fact", "Skeletally immature patients may need longitudinal growth and physeal surveillance beyond apparent injury healing.", "pediatric-growth-surveillance", "Pediatric growth/remodeling pathway: specialist review required."),
  claim("claim-shared", "clinical_script", "When evidence and surgeon preferences permit multiple safe pathways, document uncertainty and use shared decision-making.", "shared-decision-checkpoint", "Human review required."),
];

const dp = (draftId: string, subjectEntitySlug: string, patternType: string, trigger: string, action: string, reviewer: string, urgency: PilotDecisionPointDraft["urgency"] = "urgent"): PilotDecisionPointDraft => ({
  draftId, subjectEntitySlug, patternType, trigger, action, urgency,
  safetyCriticality: urgency === "emergent" ? "emergency" : "high",
  contentSource: "generated_draft", reviewStatus: "needs_review",
  sourceNote: `${reviewer}. ${context}`, requiresAttendingReview: reviewer !== "Human review required",
});
export const POSTOPERATIVE_PROTOCOLS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  dp("dp-wb-advance", "construct-dependent-progression", "milestone_progression", "Patient reaches planned clinical, imaging, and functional criteria for loading progression", "Confirm construct/procedure constraints and advance loading with explicit protection and regression instructions", "Human review required"),
  dp("dp-wb-fail", "failure-to-progress", "failure_to_progress", "Pain, swelling, function, or imaging fails to follow the expected trajectory", "Pause progression and reassess diagnosis, adherence, construct, biology, infection, and rehabilitation plan", "Attending review required"),
  dp("dp-wound", "postoperative-red-flags", "wound_escalation", "Persistent drainage, dehiscence, spreading erythema, systemic symptoms, or rapidly increasing pain", "Arrange urgent examination and infection workup; escalate for source control when indicated", "Attending review required"),
  dp("dp-neurovascular", "postoperative-red-flags", "limb_threat", "New motor/sensory deficit, loss of perfusion, uncontrolled pain, or compartment concern", "Remove external constriction as appropriate and obtain immediate surgical evaluation", "Attending review required", "emergent"),
  dp("dp-healing", "delayed-union-pathway", "healing_surveillance", "Serial assessment shows inadequate fracture-healing progression", "Evaluate mechanics, biology, infection, medications, nutrition, nicotine exposure, and construct before intervention", "Attending review required"),
  dp("dp-hardware", "implant-surveillance", "construct_failure", "Migration, breakage, loss of alignment, or symptomatic prominence is detected", "Protect the reconstruction and obtain attending review for observation, revision, or removal", "Attending review required"),
  dp("dp-return", "return-to-activity-progression", "functional_clearance", "Patient requests return to work, sport, or unrestricted activity", "Compare objective milestones and task demands, discuss residual risk, and document shared decision", "Human review required", "routine"),
  dp("dp-medication", "dvt-prophylaxis-protocol", "medication_duration", "Planned prophylaxis duration is reached or bleeding/thrombotic risk changes", "Reassess patient, procedure, mobility, and competing risks before stopping or extending prophylaxis", "Attending review required"),
  dp("dp-peds", "pediatric-growth-surveillance", "growth_disturbance", "Growth asymmetry, angular change, length discrepancy, or physeal bar is suspected", "Obtain longitudinal measurements and pediatric orthopaedic review for remaining-growth strategy", "Specialist review required"),
  dp("dp-spine", "spine-fusion-surveillance", "neurologic_escalation", "New neurologic deficit, bowel/bladder change, or rapidly worsening axial/radicular symptoms", "Initiate urgent spine evaluation and appropriate imaging", "Specialist review required", "emergent"),
];
