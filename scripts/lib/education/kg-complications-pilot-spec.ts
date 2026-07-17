/**
 * Complications canonical knowledge neighborhood.
 *
 * Reusable failure-mode backbone for trauma, sports, hand/wrist, adult recon,
 * foot/ankle, pediatrics, spine, CasePrep, BroBot, curriculum, and OITE.
 *
 * Reuses existing complication identities from specialty/trauma neighborhoods.
 * Claims and decision points remain generated drafts until factory review gates.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export const COMPLICATIONS_PILOT_KEY = "complications-neighborhood" as const;

export const COMPLICATIONS_SOURCE_IDS = {
  curriculumNodeSlug: "orthopaedic-complications",
  prepareTopicId: "complications",
  legacyRetargetProposalKey: "retarget:orthopaedic-complications",
} as const;

export const COMPLICATIONS_ASSET_COUNTS = {
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
    pilot: COMPLICATIONS_PILOT_KEY,
    neighborhood: "complications",
    ...metadata,
  },
});

/** Existing canonical complication identities reused (do not duplicate under new slugs). */
const REUSED_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("fracture-related-infection", "complication", "Fracture-Related Infection", "Infection occurring in the setting of a fracture and its treatment.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", domain: "trauma" }),
  entity("delayed-union", "complication", "Delayed Union", "Fracture healing that progresses more slowly than expected.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", domain: "general" }),
  entity("fracture-nonunion", "complication", "Fracture Nonunion", "Failure of a fracture to progress to union without further intervention.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", domain: "general" }),
  entity("fracture-malunion", "complication", "Fracture Malunion", "Fracture healing in unacceptable alignment.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", domain: "general" }),
  entity("venous-thromboembolism", "complication", "Venous Thromboembolism", "Deep venous thrombosis or pulmonary embolism associated with injury and recovery.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", domain: "medical" }),
  entity("loss-of-reduction", "complication", "Loss of Reduction", "Failure to maintain achieved fracture or joint alignment.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", domain: "general" }),
  entity("avascular-necrosis", "complication", "Avascular Necrosis", "Ischemic bone death after disruption of blood supply.", { reused_identity: true, source_neighborhood: "femoral-neck-fracture", domain: "trauma" }),
  entity("crps", "complication", "Complex Regional Pain Syndrome", "Disproportionate regional pain and autonomic dysfunction after injury or surgery.", { reused_identity: true, domain: "general" }),
  entity("osteolysis", "complication", "Periprosthetic Osteolysis", "Particle-induced bone loss around arthroplasty components.", { reused_identity: true, source_neighborhood: "aseptic-loosening-tha", domain: "adult_reconstruction" }),
  entity("fat-embolism", "complication", "Fat Embolism", "Embolization of fat to the pulmonary or systemic circulation after long-bone injury or instrumentation.", { reused_identity: true, domain: "trauma" }),
  entity("muscle-necrosis", "complication", "Muscle Necrosis", "Irreversible muscle death after prolonged ischemia or compartment syndrome.", { reused_identity: true, source_neighborhood: "compartment-syndrome", domain: "trauma" }),
  entity("rhabdomyolysis", "complication", "Rhabdomyolysis", "Skeletal muscle breakdown releasing myoglobin and risking renal injury.", { reused_identity: true, source_neighborhood: "compartment-syndrome", domain: "trauma" }),
  entity("limb-amputation", "complication", "Limb Amputation", "Surgical or traumatic loss of a limb as a salvage or endpoint of severe injury/complication.", { reused_identity: true, source_neighborhood: "compartment-syndrome", domain: "trauma" }),
  entity("radial-nerve-palsy", "complication", "Radial Nerve Palsy", "Radial nerve motor or sensory deficit associated with humeral injury or surgery.", { reused_identity: true, source_neighborhood: "humeral-shaft-fracture", domain: "trauma" }),
  entity("median-neuropathy", "complication", "Median Neuropathy", "Median nerve dysfunction after injury, compression, or surgery.", { reused_identity: true, source_neighborhood: "distal-radius-fracture", domain: "hand_wrist" }),
  entity("volkmann-contracture", "complication", "Volkmann Contracture", "Ischemic muscle contracture after untreated or delayed compartment syndrome.", { reused_identity: true, source_neighborhood: "compartment-syndrome", domain: "trauma" }),
  entity("extensor-mechanism-disruption", "complication", "Extensor Mechanism Disruption", "Failure of the knee extensor mechanism after trauma or arthroplasty.", { reused_identity: true, source_neighborhood: "patella-fracture", domain: "adult_reconstruction" }),
  entity("stem-loosening", "complication", "Femoral Stem Loosening", "Loss of fixation of a femoral arthroplasty stem.", { reused_identity: true, source_neighborhood: "periprosthetic-femur-fracture", domain: "adult_reconstruction" }),
  entity("post-traumatic-ankle-arthritis", "complication", "Post-traumatic Ankle Arthritis", "Degenerative ankle joint disease after fracture or ligament injury.", { reused_identity: true, source_neighborhood: "ankle-fracture", domain: "trauma" }),
  entity("talar-avn", "complication", "Talar Avascular Necrosis", "Avascular necrosis of the talus after talar neck or body injury.", { reused_identity: true, source_neighborhood: "talus-fracture", domain: "trauma" }),
  entity("humeral-head-avn", "complication", "Humeral Head AVN", "Avascular necrosis of the humeral head after proximal humerus injury or treatment.", { reused_identity: true, source_neighborhood: "proximal-humerus-fracture", domain: "trauma" }),
];

/** Cross-ref conditions/procedures already owned elsewhere — reuse only, do not redefine clinical ownership. */
const REUSED_CROSSREF_ENTITIES: PilotEntitySpec[] = [
  entity("open-fracture", "condition", "Open Fracture", "A fracture communicating with the external environment through a traumatic wound.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", role: "crossref" }),
  entity("acute-compartment-syndrome", "condition", "Acute Compartment Syndrome", "Pathologic elevation of compartment pressure threatening tissue perfusion and viability.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", role: "crossref" }),
  entity("periprosthetic-joint-infection", "condition", "Periprosthetic Joint Infection", "Infection involving a prosthetic joint and surrounding tissues.", { reused_identity: true, source_neighborhood: "periprosthetic-joint-infection", role: "crossref" }),
  entity("aseptic-loosening-tha", "condition", "Aseptic Loosening of THA", "Noninfectious loss of fixation of a total hip arthroplasty component.", { reused_identity: true, source_neighborhood: "aseptic-loosening-tha", role: "crossref" }),
  entity("aseptic-loosening-tka", "condition", "Aseptic Loosening of TKA", "Noninfectious loss of fixation of a total knee arthroplasty component.", { reused_identity: true, source_neighborhood: "aseptic-loosening-tka", role: "crossref" }),
  entity("total-hip-arthroplasty", "procedure", "Total Hip Arthroplasty", "Replacement of the femoral head and acetabulum with prosthetic components.", { reused_identity: true, role: "crossref" }),
  entity("total-knee-arthroplasty", "procedure", "Total Knee Arthroplasty", "Replacement of the tibiofemoral and often patellofemoral articulations with prosthetic components.", { reused_identity: true, role: "crossref" }),
  entity("emergent-fasciotomy", "procedure", "Emergent Fasciotomy", "Urgent surgical release of involved osteofascial compartments.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", role: "crossref" }),
  entity("irrigation-and-debridement-open-fracture", "procedure", "Open Fracture Irrigation and Debridement", "Operative removal of contamination and devitalized tissue with irrigation of an open fracture wound.", { reused_identity: true, source_neighborhood: "trauma-fundamentals", role: "crossref" }),
  entity("revision-total-hip-arthroplasty", "procedure", "Revision Total Hip Arthroplasty", "Reoperation to exchange one or more THA components.", { reused_identity: true, role: "crossref" }),
  entity("revision-total-knee-arthroplasty", "procedure", "Revision Total Knee Arthroplasty", "Reoperation to exchange one or more TKA components.", { reused_identity: true, role: "crossref" }),
];

/** Reused anatomy for injured_in localization of selected complications. */
const REUSED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  entity("femoral-head", "anatomy_structure", "Femoral Head", "Proximal femoral articular head at risk for avascular necrosis.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("femoral-head-blood-supply", "anatomy_structure", "Femoral Head Blood Supply", "Vascular supply of the femoral head including medial femoral circumflex contributions.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("humeral-head", "anatomy_structure", "Humeral Head", "Proximal humeral articular head.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("radial-nerve", "anatomy_structure", "Radial Nerve", "Peripheral nerve at risk in humeral shaft injury and lateral approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("median-nerve", "anatomy_structure", "Median Nerve", "Peripheral nerve at risk at the wrist and forearm.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("sciatic-nerve", "anatomy_structure", "Sciatic Nerve", "Peripheral nerve at risk in acetabular and hip surgery.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("spinal-cord", "anatomy_structure", "Spinal Cord", "Neural structure at risk in spine trauma and surgery.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("physis", "anatomy_structure", "Physis", "Growth plate whose injury can produce growth arrest and deformity.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("leg-anterior-compartment", "anatomy_structure", "Anterior Compartment of the Leg", "Osteofascial compartment commonly involved in acute compartment syndrome.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("leg-deep-posterior-compartment", "anatomy_structure", "Deep Posterior Compartment of the Leg", "Deep posterior leg compartment relevant to compartment syndrome and neurovascular risk.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("hip-joint", "anatomy_structure", "Hip Joint", "Ball-and-socket joint of the proximal femur and acetabulum.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("femoral-condyles", "anatomy_structure", "Femoral Condyles", "Distal femoral articular condyles of the knee.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("joint-capsule", "anatomy_structure", "Joint Capsule", "Fibrous capsule enclosing a synovial joint.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("common-peroneal-nerve", "anatomy_structure", "Common Peroneal Nerve", "Peripheral nerve at risk at the fibular neck and lateral knee.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
  entity("femoral-diaphysis", "anatomy_structure", "Femoral Diaphysis", "Shaft of the femur.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", role: "crossref" }),
];

const HUB_AND_CROSSCUTTING: PilotEntitySpec[] = [
  entity("orthopaedic-complications", "treatment_principle", "Orthopaedic Complications", "Canonical failure-mode backbone spanning infection, fixation failure, medical events, and specialty-specific complications.", { clinical_kind: "foundational_backbone", maturity_target: 7 }),
  entity("general-orthopaedic-complications", "treatment_principle", "General Orthopaedic Complications", "Cross-cutting surgical and healing complications applicable across orthopaedic domains."),
  entity("medical-complications", "treatment_principle", "Medical Complications", "Systemic perioperative medical events that alter orthopaedic outcomes and disposition."),
  entity("trauma-complications", "treatment_principle", "Trauma Complications", "Failure modes after fractures, open injuries, and soft-tissue trauma."),
  entity("sports-medicine-complications", "treatment_principle", "Sports Medicine Complications", "Failure modes after soft-tissue reconstruction and sports procedures."),
  entity("adult-reconstruction-complications", "treatment_principle", "Adult Reconstruction Complications", "Arthroplasty-specific infectious, mechanical, and soft-tissue failure modes."),
  entity("spine-complications", "treatment_principle", "Spine Complications", "Neural, fusion, and construct-related complications after spine care."),
  entity("pediatric-complications", "treatment_principle", "Pediatric Complications", "Growth-related and developmental complications unique to skeletally immature patients."),
  entity("complication-risk-factors", "treatment_principle", "Complication Risk Factors", "Host, injury, implant, and process factors that increase complication likelihood.", { provenance_required: true }),
  entity("complication-prevention", "treatment_principle", "Complication Prevention Strategies", "Prophylaxis and process measures that reduce complication incidence."),
  entity("early-recognition-of-complications", "treatment_principle", "Early Recognition of Complications", "Surveillance patterns and red flags enabling timely diagnosis."),
  entity("complication-diagnostic-workup", "treatment_principle", "Complication Diagnostic Workup", "Structured evaluation of suspected orthopaedic and medical complications."),
  entity("complication-management-principles", "treatment_principle", "Complication Management Principles", "First-line management principles for orthopaedic complications before salvage pathways."),
  entity("salvage-options-after-complications", "treatment_principle", "Salvage Options After Complications", "Revision, reconstruction, and endpoint options when primary management fails."),
  entity("long-term-complication-outcomes", "treatment_principle", "Long-term Complication Outcomes", "Functional, reoperation, and quality-of-life consequences of major complications."),
  entity("infection-prevention", "treatment_principle", "Infection Prevention", "Perioperative and injury-related measures that reduce surgical site and implant infection."),
  entity("vte-prophylaxis", "treatment_principle", "VTE Prophylaxis", "Pharmacologic and mechanical strategies to reduce venous thromboembolism after orthopaedic injury or surgery."),
  entity("neurovascular-surveillance", "treatment_principle", "Neurovascular Surveillance", "Serial examination and documentation to detect evolving neurovascular compromise."),
  entity("soft-tissue-protection", "treatment_principle", "Soft-Tissue Protection", "Techniques that protect skin, muscle, and envelope integrity to reduce wound and infection complications."),
  entity("construct-stability-principle", "treatment_principle", "Construct Stability Principle", "Mechanical stability needed to prevent loss of fixation, nonunion, and implant failure."),
];

const GENERAL_COMPLICATIONS: PilotEntitySpec[] = [
  entity("surgical-site-infection", "complication", "Surgical Site Infection", "Infection of the surgical wound or deep tissues after an orthopaedic procedure.", { domain: "general", incidence_provenance_required: true }),
  entity("wound-complication", "complication", "Wound Complication", "Delayed healing, dehiscence, drainage, necrosis, or other wound-healing failure.", { domain: "general" }),
  entity("hardware-failure", "complication", "Hardware Failure", "Mechanical failure of an implant construct including breakage, bending, or disengagement.", { domain: "general" }),
  entity("loss-of-fixation", "complication", "Loss of Fixation", "Failure of an implant-bone interface to maintain intended stability.", { domain: "general" }),
  entity("implant-loosening", "complication", "Implant Loosening", "Loss of implant fixation with motion at the bone-implant or cement interface.", { domain: "general" }),
  entity("implant-breakage", "complication", "Implant Breakage", "Fracture or fatigue failure of an implant component.", { domain: "general" }),
  entity("implant-prominence", "complication", "Implant Prominence", "Painful or functionally bothersome prominence of hardware under soft tissues.", { domain: "general" }),
  entity("arthrofibrosis", "complication", "Arthrofibrosis", "Excessive periarticular fibrosis producing joint stiffness and restricted motion.", { domain: "general" }),
  entity("heterotopic-ossification", "complication", "Heterotopic Ossification", "Ectopic bone formation in soft tissues after trauma or surgery.", { domain: "general" }),
  entity("neurovascular-injury", "complication", "Neurovascular Injury", "Iatrogenic or traumatic injury to nerves or vessels associated with orthopaedic injury or care.", { domain: "general" }),
  entity("chronic-pain", "complication", "Chronic Pain", "Pain persisting beyond expected recovery and impairing function.", { domain: "general" }),
  entity("reoperation", "complication", "Reoperation", "Return to the operating room related to the index injury, procedure, or complication.", { domain: "general", management_changing: true }),
  entity("revision-surgery", "complication", "Revision Surgery", "Reoperation to revise fixation, reconstruction, or arthroplasty after failure or complication.", { domain: "general", management_changing: true }),
];

const MEDICAL_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("deep-vein-thrombosis", "complication", "Deep Vein Thrombosis", "Thrombosis of deep veins, commonly of the lower extremity, after orthopaedic injury or surgery.", { domain: "medical", incidence_provenance_required: true }),
  entity("pulmonary-embolism", "complication", "Pulmonary Embolism", "Embolization of thrombus to the pulmonary arterial tree.", { domain: "medical", time_sensitive: true }),
  entity("postoperative-pneumonia", "complication", "Postoperative Pneumonia", "Lower respiratory infection in the perioperative period.", { domain: "medical" }),
  entity("urinary-tract-infection", "complication", "Urinary Tract Infection", "Infection of the urinary tract, often associated with catheterization or immobility.", { domain: "medical" }),
  entity("postoperative-delirium", "complication", "Postoperative Delirium", "Acute fluctuating disturbance of attention and cognition after surgery.", { domain: "medical" }),
  entity("acute-kidney-injury", "complication", "Acute Kidney Injury", "Acute decline in renal function in the perioperative or post-injury period.", { domain: "medical" }),
  entity("cardiac-complication", "complication", "Cardiac Complication", "Perioperative myocardial ischemia, arrhythmia, heart failure, or related cardiac event.", { domain: "medical", time_sensitive: true }),
  entity("hospital-readmission", "complication", "Hospital Readmission", "Unplanned return to hospital after discharge related to complications or medical events.", { domain: "medical" }),
  entity("perioperative-mortality", "complication", "Perioperative Mortality", "Death related to injury, surgery, or perioperative medical events.", { domain: "medical", time_sensitive: true }),
];

const TRAUMA_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("post-traumatic-arthritis", "complication", "Post-traumatic Arthritis", "Degenerative joint disease after articular injury or malreduction.", { domain: "trauma" }),
  entity("malalignment", "complication", "Malalignment", "Unacceptable angular, translational, or length deformity after fracture care.", { domain: "trauma" }),
  entity("limb-shortening", "complication", "Limb Shortening", "Loss of limb length after fracture, growth disturbance, or reconstruction.", { domain: "trauma" }),
  entity("rotational-deformity", "complication", "Rotational Deformity", "Unacceptable rotational malalignment after fracture healing or fixation.", { domain: "trauma" }),
];

const SPORTS_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("joint-stiffness", "complication", "Joint Stiffness", "Restricted range of motion after injury or sports surgery.", { domain: "sports" }),
  entity("recurrent-instability", "complication", "Recurrent Instability", "Return of joint instability after repair or reconstruction.", { domain: "sports" }),
  entity("graft-failure", "complication", "Graft Failure", "Structural or functional failure of a reconstruction graft.", { domain: "sports" }),
  entity("graft-retear", "complication", "Re-tear", "Recurrent tear of a repaired or reconstructed soft-tissue structure.", { domain: "sports" }),
  entity("persistent-pain", "complication", "Persistent Pain", "Pain that fails to resolve after expected sports-injury recovery.", { domain: "sports" }),
  entity("chondral-injury-progression", "complication", "Chondral Injury Progression", "Progression of articular cartilage damage after injury or incomplete treatment.", { domain: "sports" }),
];

const RECON_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("prosthetic-instability", "complication", "Prosthetic Instability", "Dislocation or instability of an arthroplasty construct.", { domain: "adult_reconstruction" }),
  entity("aseptic-loosening", "complication", "Aseptic Loosening", "Noninfectious loss of implant fixation around arthroplasty components.", { domain: "adult_reconstruction" }),
  entity("polyethylene-wear", "complication", "Polyethylene Wear", "Bearing-surface wear of polyethylene generating debris and secondary osteolysis.", { domain: "adult_reconstruction" }),
  entity("periprosthetic-fracture", "complication", "Periprosthetic Fracture", "Fracture around an arthroplasty implant.", { domain: "adult_reconstruction" }),
  entity("extensor-mechanism-failure", "complication", "Extensor Mechanism Failure", "Disruption or incompetence of the extensor mechanism after knee arthroplasty or trauma.", { domain: "adult_reconstruction" }),
];

const SPINE_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("durotomy", "complication", "Durotomy", "Incidental or intentional opening of the dura during spine surgery.", { domain: "spine" }),
  entity("neurologic-injury", "complication", "Neurologic Injury", "New or worsened neurologic deficit after spine injury or surgery.", { domain: "spine", time_sensitive: true }),
  entity("adjacent-segment-disease", "complication", "Adjacent Segment Disease", "Degeneration and symptoms at a level adjacent to prior fusion or instrumentation.", { domain: "spine" }),
  entity("pseudarthrosis", "complication", "Pseudarthrosis", "Failure of intended spinal fusion.", { domain: "spine" }),
  entity("junctional-failure", "complication", "Junctional Failure", "Failure or kyphosis at the junction of instrumented and non-instrumented spine.", { domain: "spine" }),
  entity("spine-hardware-failure", "complication", "Spine Hardware Failure", "Breakage, pullout, or disengagement of spinal instrumentation.", { domain: "spine" }),
];

const PEDIATRIC_COMPLICATION_ENTITIES: PilotEntitySpec[] = [
  entity("growth-arrest", "complication", "Growth Arrest", "Cessation of physeal growth after injury, infection, or surgery.", { domain: "pediatrics" }),
  entity("angular-deformity", "complication", "Angular Deformity", "Coronal or sagittal angular deformity from asymmetric growth or malunion.", { domain: "pediatrics" }),
  entity("leg-length-discrepancy", "complication", "Leg Length Discrepancy", "Inequality of lower extremity length after physeal injury or treatment.", { domain: "pediatrics" }),
  entity("physeal-bar-formation", "complication", "Physeal Bar Formation", "Bony bridge across the physis causing growth disturbance.", { domain: "pediatrics" }),
];

const DIAGNOSTIC_AND_PROCEDURE_SUPPORT: PilotEntitySpec[] = [
  entity("infection-workup", "diagnostic_test", "Infection Workup", "Laboratory, imaging, and sampling evaluation for orthopaedic infection."),
  entity("vte-diagnostic-workup", "diagnostic_test", "VTE Diagnostic Workup", "Clinical assessment and imaging used to diagnose DVT or PE."),
  entity("compartment-pressure-measurement", "diagnostic_test", "Compartment Pressure Measurement", "Adjunctive invasive pressure measurement when compartment examination is unreliable.", { reused_identity: true, source_neighborhood: "trauma-fundamentals" }),
  entity("serial-neurovascular-examinations", "exam_maneuver", "Serial Neurovascular Examinations", "Repeated neurovascular examinations used to detect interval deterioration.", { reused_identity: true, source_neighborhood: "trauma-fundamentals" }),
  entity("implant-removal", "procedure", "Implant Removal", "Surgical removal of prominent, failed, or infected hardware."),
  entity("revision-internal-fixation", "procedure", "Revision Internal Fixation", "Reoperation to restore stability after loss of fixation or nonunion."),
  entity("irrigation-and-debridement", "procedure", "Irrigation and Debridement", "Operative debridement and irrigation for infection or contaminated wounds."),
  entity("two-stage-revision-arthroplasty", "procedure", "Two-Stage Revision Arthroplasty", "Staged explant, spacer, and reimplantation pathway for prosthetic joint infection.", { reused_identity: true, source_neighborhood: "periprosthetic-joint-infection" }),
];

export const COMPLICATIONS_ENTITIES: PilotEntitySpec[] = [
  ...HUB_AND_CROSSCUTTING,
  ...REUSED_CROSSREF_ENTITIES,
  ...REUSED_ANATOMY_ENTITIES,
  ...REUSED_COMPLICATION_ENTITIES,
  ...GENERAL_COMPLICATIONS,
  ...MEDICAL_COMPLICATION_ENTITIES,
  ...TRAUMA_COMPLICATION_ENTITIES,
  ...SPORTS_COMPLICATION_ENTITIES,
  ...RECON_COMPLICATION_ENTITIES,
  ...SPINE_COMPLICATION_ENTITIES,
  ...PEDIATRIC_COMPLICATION_ENTITIES,
  ...DIAGNOSTIC_AND_PROCEDURE_SUPPORT,
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
    relevance_reason: "complications_backbone",
    context_relevance: ["call", "or", "clinic", "oite"],
    ...metadata,
  },
});

export const COMPLICATIONS_RELATIONSHIPS: PilotRelationshipSpec[] = [
  // Domain hierarchy under backbone hub
  rel("general-orthopaedic-complications", "prerequisite_for", "orthopaedic-complications", { clinical_importance: "critical" }),
  rel("medical-complications", "prerequisite_for", "orthopaedic-complications", { clinical_importance: "critical" }),
  rel("trauma-complications", "prerequisite_for", "orthopaedic-complications"),
  rel("sports-medicine-complications", "prerequisite_for", "orthopaedic-complications"),
  rel("adult-reconstruction-complications", "prerequisite_for", "orthopaedic-complications"),
  rel("spine-complications", "prerequisite_for", "orthopaedic-complications"),
  rel("pediatric-complications", "prerequisite_for", "orthopaedic-complications"),

  // Cross-cutting concept chain: risk → prevention → recognition → workup → management → salvage → outcomes
  rel("complication-risk-factors", "prerequisite_for", "complication-prevention", { clinical_importance: "critical", prevention_link: true }),
  rel("complication-prevention", "prerequisite_for", "early-recognition-of-complications", { prevention_link: true }),
  rel("early-recognition-of-complications", "prerequisite_for", "complication-diagnostic-workup"),
  rel("complication-diagnostic-workup", "prerequisite_for", "complication-management-principles"),
  rel("complication-management-principles", "prerequisite_for", "salvage-options-after-complications"),
  rel("salvage-options-after-complications", "prerequisite_for", "long-term-complication-outcomes"),
  rel("complication-prevention", "prerequisite_for", "orthopaedic-complications", { prevention_link: true }),
  rel("early-recognition-of-complications", "prerequisite_for", "orthopaedic-complications"),
  rel("complication-management-principles", "prerequisite_for", "orthopaedic-complications"),

  // Prevention strategy links (explicit prevention ↔ complication path)
  rel("infection-prevention", "prerequisite_for", "complication-prevention", { prevention_link: true }),
  rel("vte-prophylaxis", "prerequisite_for", "complication-prevention", { prevention_link: true }),
  rel("neurovascular-surveillance", "prerequisite_for", "early-recognition-of-complications", { prevention_link: true }),
  rel("soft-tissue-protection", "prerequisite_for", "complication-prevention", { prevention_link: true }),
  rel("construct-stability-principle", "prerequisite_for", "complication-prevention", { prevention_link: true }),
  rel("infection-prevention", "prerequisite_for", "surgical-site-infection", { prevention_link: true, clinical_importance: "critical" }),
  rel("infection-prevention", "prerequisite_for", "fracture-related-infection", { prevention_link: true }),
  rel("infection-prevention", "prerequisite_for", "periprosthetic-joint-infection", { prevention_link: true }),
  rel("vte-prophylaxis", "prerequisite_for", "deep-vein-thrombosis", { prevention_link: true }),
  rel("vte-prophylaxis", "prerequisite_for", "pulmonary-embolism", { prevention_link: true }),
  rel("vte-prophylaxis", "prerequisite_for", "venous-thromboembolism", { prevention_link: true }),
  rel("construct-stability-principle", "prerequisite_for", "loss-of-fixation", { prevention_link: true }),
  rel("construct-stability-principle", "prerequisite_for", "hardware-failure", { prevention_link: true }),
  rel("construct-stability-principle", "prerequisite_for", "fracture-nonunion", { prevention_link: true }),
  rel("soft-tissue-protection", "prerequisite_for", "wound-complication", { prevention_link: true }),
  rel("neurovascular-surveillance", "prerequisite_for", "neurovascular-injury", { prevention_link: true }),
  rel("neurovascular-surveillance", "prerequisite_for", "acute-compartment-syndrome", { prevention_link: true }),

  // General complications under domain hub
  rel("surgical-site-infection", "prerequisite_for", "general-orthopaedic-complications"),
  rel("wound-complication", "prerequisite_for", "general-orthopaedic-complications"),
  rel("delayed-union", "prerequisite_for", "general-orthopaedic-complications"),
  rel("fracture-nonunion", "prerequisite_for", "general-orthopaedic-complications"),
  rel("fracture-malunion", "prerequisite_for", "general-orthopaedic-complications"),
  rel("hardware-failure", "prerequisite_for", "general-orthopaedic-complications"),
  rel("loss-of-fixation", "prerequisite_for", "general-orthopaedic-complications"),
  rel("loss-of-reduction", "prerequisite_for", "general-orthopaedic-complications"),
  rel("implant-loosening", "prerequisite_for", "general-orthopaedic-complications"),
  rel("implant-breakage", "prerequisite_for", "general-orthopaedic-complications"),
  rel("implant-prominence", "prerequisite_for", "general-orthopaedic-complications"),
  rel("arthrofibrosis", "prerequisite_for", "general-orthopaedic-complications"),
  rel("heterotopic-ossification", "prerequisite_for", "general-orthopaedic-complications"),
  rel("neurovascular-injury", "prerequisite_for", "general-orthopaedic-complications"),
  rel("crps", "prerequisite_for", "general-orthopaedic-complications"),
  rel("chronic-pain", "prerequisite_for", "general-orthopaedic-complications"),
  rel("reoperation", "prerequisite_for", "general-orthopaedic-complications"),
  rel("revision-surgery", "prerequisite_for", "general-orthopaedic-complications"),

  // Medical
  rel("deep-vein-thrombosis", "prerequisite_for", "medical-complications"),
  rel("pulmonary-embolism", "prerequisite_for", "medical-complications"),
  rel("venous-thromboembolism", "prerequisite_for", "medical-complications"),
  rel("postoperative-pneumonia", "prerequisite_for", "medical-complications"),
  rel("urinary-tract-infection", "prerequisite_for", "medical-complications"),
  rel("postoperative-delirium", "prerequisite_for", "medical-complications"),
  rel("acute-kidney-injury", "prerequisite_for", "medical-complications"),
  rel("cardiac-complication", "prerequisite_for", "medical-complications"),
  rel("hospital-readmission", "prerequisite_for", "medical-complications"),
  rel("perioperative-mortality", "prerequisite_for", "medical-complications"),
  rel("deep-vein-thrombosis", "prerequisite_for", "venous-thromboembolism"),
  rel("pulmonary-embolism", "prerequisite_for", "venous-thromboembolism"),
  rel("deep-vein-thrombosis", "commonly_confused_with", "pulmonary-embolism"),

  // Trauma specialty
  rel("fracture-related-infection", "prerequisite_for", "trauma-complications"),
  rel("acute-compartment-syndrome", "prerequisite_for", "trauma-complications"),
  rel("post-traumatic-arthritis", "prerequisite_for", "trauma-complications"),
  rel("avascular-necrosis", "prerequisite_for", "trauma-complications"),
  rel("malalignment", "prerequisite_for", "trauma-complications"),
  rel("limb-shortening", "prerequisite_for", "trauma-complications"),
  rel("rotational-deformity", "prerequisite_for", "trauma-complications"),
  rel("fat-embolism", "prerequisite_for", "trauma-complications"),
  rel("muscle-necrosis", "prerequisite_for", "trauma-complications"),
  rel("volkmann-contracture", "prerequisite_for", "trauma-complications"),
  rel("post-traumatic-ankle-arthritis", "prerequisite_for", "post-traumatic-arthritis"),
  rel("talar-avn", "prerequisite_for", "avascular-necrosis"),
  rel("humeral-head-avn", "prerequisite_for", "avascular-necrosis"),
  rel("fracture-malunion", "commonly_confused_with", "malalignment"),
  rel("delayed-union", "commonly_confused_with", "fracture-nonunion"),
  rel("fracture-nonunion", "commonly_confused_with", "delayed-union"),

  // Sports
  rel("joint-stiffness", "prerequisite_for", "sports-medicine-complications"),
  rel("arthrofibrosis", "prerequisite_for", "sports-medicine-complications"),
  rel("recurrent-instability", "prerequisite_for", "sports-medicine-complications"),
  rel("graft-failure", "prerequisite_for", "sports-medicine-complications"),
  rel("graft-retear", "prerequisite_for", "sports-medicine-complications"),
  rel("persistent-pain", "prerequisite_for", "sports-medicine-complications"),
  rel("chondral-injury-progression", "prerequisite_for", "sports-medicine-complications"),
  rel("graft-failure", "commonly_confused_with", "graft-retear"),
  rel("joint-stiffness", "commonly_confused_with", "arthrofibrosis"),

  // Adult reconstruction
  rel("periprosthetic-joint-infection", "prerequisite_for", "adult-reconstruction-complications"),
  rel("prosthetic-instability", "prerequisite_for", "adult-reconstruction-complications"),
  rel("aseptic-loosening", "prerequisite_for", "adult-reconstruction-complications"),
  rel("polyethylene-wear", "prerequisite_for", "adult-reconstruction-complications"),
  rel("osteolysis", "prerequisite_for", "adult-reconstruction-complications"),
  rel("periprosthetic-fracture", "prerequisite_for", "adult-reconstruction-complications"),
  rel("extensor-mechanism-failure", "prerequisite_for", "adult-reconstruction-complications"),
  rel("stem-loosening", "prerequisite_for", "aseptic-loosening"),
  rel("aseptic-loosening-tha", "prerequisite_for", "aseptic-loosening"),
  rel("aseptic-loosening-tka", "prerequisite_for", "aseptic-loosening"),
  rel("polyethylene-wear", "prerequisite_for", "osteolysis"),
  rel("extensor-mechanism-disruption", "commonly_confused_with", "extensor-mechanism-failure"),
  rel("implant-loosening", "commonly_confused_with", "aseptic-loosening"),

  // Spine
  rel("durotomy", "prerequisite_for", "spine-complications"),
  rel("neurologic-injury", "prerequisite_for", "spine-complications"),
  rel("adjacent-segment-disease", "prerequisite_for", "spine-complications"),
  rel("pseudarthrosis", "prerequisite_for", "spine-complications"),
  rel("spine-hardware-failure", "prerequisite_for", "spine-complications"),
  rel("junctional-failure", "prerequisite_for", "spine-complications"),
  rel("spine-hardware-failure", "commonly_confused_with", "hardware-failure"),
  rel("pseudarthrosis", "commonly_confused_with", "fracture-nonunion"),

  // Pediatrics
  rel("growth-arrest", "prerequisite_for", "pediatric-complications"),
  rel("angular-deformity", "prerequisite_for", "pediatric-complications"),
  rel("leg-length-discrepancy", "prerequisite_for", "pediatric-complications"),
  rel("physeal-bar-formation", "prerequisite_for", "pediatric-complications"),
  rel("physeal-bar-formation", "prerequisite_for", "growth-arrest"),
  rel("growth-arrest", "prerequisite_for", "angular-deformity"),
  rel("growth-arrest", "prerequisite_for", "leg-length-discrepancy"),

  // Condition/procedure → has_complication (legal predicate endpoints)
  rel("open-fracture", "has_complication", "fracture-related-infection", { clinical_importance: "critical" }),
  rel("open-fracture", "has_complication", "wound-complication"),
  rel("open-fracture", "has_complication", "surgical-site-infection"),
  rel("acute-compartment-syndrome", "has_complication", "muscle-necrosis", { clinical_importance: "critical" }),
  rel("acute-compartment-syndrome", "has_complication", "volkmann-contracture"),
  rel("acute-compartment-syndrome", "has_complication", "rhabdomyolysis"),
  rel("acute-compartment-syndrome", "has_complication", "limb-amputation"),
  rel("total-hip-arthroplasty", "has_complication", "prosthetic-instability"),
  rel("total-hip-arthroplasty", "has_complication", "aseptic-loosening"),
  rel("total-hip-arthroplasty", "has_complication", "periprosthetic-fracture"),
  rel("total-hip-arthroplasty", "has_complication", "surgical-site-infection"),
  rel("total-knee-arthroplasty", "has_complication", "prosthetic-instability"),
  rel("total-knee-arthroplasty", "has_complication", "extensor-mechanism-failure"),
  rel("total-knee-arthroplasty", "has_complication", "arthrofibrosis"),
  rel("total-knee-arthroplasty", "has_complication", "periprosthetic-fracture"),
  rel("irrigation-and-debridement-open-fracture", "has_complication", "fracture-related-infection"),
  rel("periprosthetic-joint-infection", "treated_by", "irrigation-and-debridement", { management_importance: "critical", management_changing: true }),
  rel("periprosthetic-joint-infection", "treated_by", "two-stage-revision-arthroplasty", { management_importance: "critical", management_changing: true }),
  rel("acute-compartment-syndrome", "treated_by", "emergent-fasciotomy", { management_importance: "critical", time_sensitive: true }),
  rel("aseptic-loosening-tha", "treated_by", "revision-total-hip-arthroplasty", { management_changing: true }),
  rel("aseptic-loosening-tka", "treated_by", "revision-total-knee-arthroplasty", { management_changing: true }),

  // Diagnostic links
  rel("periprosthetic-joint-infection", "tested_by", "infection-workup", { clinical_importance: "critical" }),
  rel("surgical-site-infection", "prerequisite_for", "infection-workup"),
  rel("fracture-related-infection", "prerequisite_for", "infection-workup"),
  rel("deep-vein-thrombosis", "prerequisite_for", "vte-diagnostic-workup"),
  rel("pulmonary-embolism", "prerequisite_for", "vte-diagnostic-workup"),
  rel("venous-thromboembolism", "prerequisite_for", "vte-diagnostic-workup"),
  rel("acute-compartment-syndrome", "tested_by", "compartment-pressure-measurement"),
  rel("serial-neurovascular-examinations", "examines", "acute-compartment-syndrome"),
  rel("neurovascular-injury", "prerequisite_for", "serial-neurovascular-examinations"),

  // Salvage / reoperation pathways
  rel("hardware-failure", "prerequisite_for", "revision-internal-fixation"),
  rel("loss-of-fixation", "prerequisite_for", "revision-internal-fixation"),
  rel("fracture-nonunion", "prerequisite_for", "revision-internal-fixation"),
  rel("implant-prominence", "prerequisite_for", "implant-removal"),
  rel("implant-breakage", "prerequisite_for", "revision-surgery"),
  rel("reoperation", "commonly_confused_with", "revision-surgery"),
  rel("revision-surgery", "prerequisite_for", "salvage-options-after-complications"),
  rel("limb-amputation", "prerequisite_for", "salvage-options-after-complications"),

  // Anatomy localization for selected complications
  rel("avascular-necrosis", "injured_in", "femoral-head", { clinical_importance: "critical" }),
  rel("avascular-necrosis", "injured_in", "femoral-head-blood-supply"),
  rel("humeral-head-avn", "injured_in", "humeral-head"),
  rel("radial-nerve-palsy", "injured_in", "radial-nerve"),
  rel("median-neuropathy", "injured_in", "median-nerve"),
  rel("neurovascular-injury", "injured_in", "sciatic-nerve"),
  rel("neurologic-injury", "injured_in", "spinal-cord", { clinical_importance: "critical" }),
  rel("growth-arrest", "injured_in", "physis", { clinical_importance: "critical" }),
  rel("physeal-bar-formation", "injured_in", "physis"),
  rel("acute-compartment-syndrome", "injured_in", "leg-anterior-compartment"),
  rel("acute-compartment-syndrome", "injured_in", "leg-deep-posterior-compartment"),
  rel("muscle-necrosis", "injured_in", "leg-anterior-compartment"),

  // Cross-ref procedure anatomy coverage (closes procedure shape gaps without inventing new anatomy)
  rel("total-hip-arthroplasty", "involves_anatomy", "hip-joint", { clinical_importance: "critical" }),
  rel("total-hip-arthroplasty", "involves_anatomy", "femoral-head"),
  rel("total-hip-arthroplasty", "at_risk_structure", "sciatic-nerve", { clinical_importance: "high" }),
  rel("total-knee-arthroplasty", "involves_anatomy", "femoral-condyles", { clinical_importance: "critical" }),
  rel("total-knee-arthroplasty", "involves_anatomy", "joint-capsule"),
  rel("total-knee-arthroplasty", "at_risk_structure", "common-peroneal-nerve", { clinical_importance: "high" }),
  rel("emergent-fasciotomy", "involves_anatomy", "leg-anterior-compartment", { clinical_importance: "critical" }),
  rel("emergent-fasciotomy", "involves_anatomy", "leg-deep-posterior-compartment"),
  rel("emergent-fasciotomy", "at_risk_structure", "common-peroneal-nerve"),
  rel("irrigation-and-debridement-open-fracture", "involves_anatomy", "joint-capsule"),
  rel("irrigation-and-debridement-open-fracture", "involves_anatomy", "femoral-diaphysis"),
  rel("irrigation-and-debridement-open-fracture", "at_risk_structure", "radial-nerve"),
  rel("revision-total-hip-arthroplasty", "involves_anatomy", "hip-joint"),
  rel("revision-total-hip-arthroplasty", "involves_anatomy", "femoral-diaphysis"),
  rel("revision-total-hip-arthroplasty", "at_risk_structure", "sciatic-nerve"),
  rel("revision-total-knee-arthroplasty", "involves_anatomy", "femoral-condyles"),
  rel("revision-total-knee-arthroplasty", "involves_anatomy", "joint-capsule"),
  rel("revision-total-knee-arthroplasty", "at_risk_structure", "common-peroneal-nerve"),
  rel("implant-removal", "involves_anatomy", "joint-capsule"),
  rel("implant-removal", "involves_anatomy", "femoral-diaphysis"),
  rel("implant-removal", "at_risk_structure", "radial-nerve"),
  rel("revision-internal-fixation", "involves_anatomy", "femoral-diaphysis"),
  rel("revision-internal-fixation", "involves_anatomy", "joint-capsule"),
  rel("revision-internal-fixation", "at_risk_structure", "radial-nerve"),
  rel("irrigation-and-debridement", "involves_anatomy", "joint-capsule"),
  rel("irrigation-and-debridement", "involves_anatomy", "hip-joint"),
  rel("irrigation-and-debridement", "at_risk_structure", "sciatic-nerve"),
  rel("two-stage-revision-arthroplasty", "involves_anatomy", "hip-joint"),
  rel("two-stage-revision-arthroplasty", "involves_anatomy", "joint-capsule"),
  rel("two-stage-revision-arthroplasty", "at_risk_structure", "sciatic-nerve"),
];

export function activeComplicationsRelationships(): PilotRelationshipSpec[] {
  return COMPLICATIONS_RELATIONSHIPS.filter((relationship) => !relationship.metadata?.disabled);
}

const claim = (
  draftId: string,
  claimType: PilotClaimDraft["claimType"],
  claimText: string,
  primaryEntitySlug: string,
  importanceLevel: PilotClaimDraft["importanceLevel"],
  contextRelevance: string[],
  sourceNote = "Complications manufacture scope; incidence/threshold claims require provenance and human review"
): PilotClaimDraft => ({
  draftId,
  claimType,
  claimText,
  primaryEntitySlug,
  importanceLevel,
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote,
  contextRelevance,
});

export const COMPLICATIONS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-comp-backbone", "fact", "Orthopaedic complications form a reusable failure-mode backbone that links prevention, early recognition, workup, management, and salvage across specialties.", "orthopaedic-complications", "L1", ["oite", "clinic", "call"]),
  claim("claim-comp-prevention-chain", "fact", "Effective complication care starts with risk-factor recognition and prevention rather than reactive management alone.", "complication-prevention", "L1", ["or", "clinic", "oite"]),
  claim("claim-comp-infection-prevention", "fact", "Infection prevention combines host optimization, soft-tissue protection, timely antibiotics when indicated, and sterile technique.", "infection-prevention", "L1", ["or", "oite"]),
  claim("claim-comp-ssi-workup", "clinical_script", "Suspected surgical site or implant infection requires structured workup before escalating to reoperation or revision.", "infection-workup", "L1", ["clinic", "call"]),
  claim("claim-comp-open-fri", "fact", "Open fractures carry elevated risk of fracture-related infection and require early antibiotics, soft-tissue care, and debridement principles.", "fracture-related-infection", "L1", ["call", "oite"]),
  claim("claim-comp-nonunion-eval", "fact", "Nonunion evaluation addresses mechanical stability, biology, infection, host factors, and time course before revision fixation.", "fracture-nonunion", "L1", ["clinic", "oite"]),
  claim("claim-comp-delayed-vs-nonunion", "cognitive_trap", "Delayed union and nonunion are related but not interchangeable; progression timeline and intervention threshold matter.", "delayed-union", "L1", ["oite", "clinic"]),
  claim("claim-comp-loss-fixation", "fact", "Loss of fixation and hardware failure often reflect construct stability mismatch, bone quality, reduction quality, or load-sharing failure.", "loss-of-fixation", "L1", ["or", "oite"]),
  claim("claim-comp-compartment", "board_trap", "Preserved distal pulses do not exclude acute compartment syndrome; pain out of proportion and passive stretch pain remain central.", "acute-compartment-syndrome", "L1", ["call", "oite"]),
  claim("claim-comp-vte", "fact", "Venous thromboembolism risk after major orthopaedic injury or arthroplasty is mitigated by risk-stratified prophylaxis and early mobilization when safe.", "vte-prophylaxis", "L1", ["floor", "oite"], "Complications manufacture; incidence estimates require source provenance before publication"),
  claim("claim-comp-dvt-pe", "fact", "Deep vein thrombosis and pulmonary embolism are linked VTE events with distinct diagnostic urgency and treatment thresholds.", "pulmonary-embolism", "L1", ["call", "oite"]),
  claim("claim-comp-pji", "fact", "Prosthetic joint infection management depends on timing, organism, implant stability, and host status; options range from debridement to staged revision.", "periprosthetic-joint-infection", "L1", ["clinic", "oite"], "Management-changing claim; attending review required"),
  claim("claim-comp-aseptic-vs-septic", "cognitive_trap", "Aseptic loosening and periprosthetic infection can present similarly; infection must be excluded before revision for loosening.", "aseptic-loosening", "L1", ["clinic", "oite"]),
  claim("claim-comp-osteolysis", "fact", "Polyethylene wear debris can drive osteolysis and secondary implant loosening even when the patient is relatively asymptomatic.", "osteolysis", "L2", ["clinic", "oite"]),
  claim("claim-comp-avn", "fact", "Avascular necrosis risk tracks vascular disruption of the femoral head, talus, or humeral head after injury or treatment.", "avascular-necrosis", "L1", ["clinic", "oite"]),
  claim("claim-comp-arthrofibrosis", "fact", "Arthrofibrosis and joint stiffness require early recognition of motion loss and coordinated therapy before advanced salvage.", "arthrofibrosis", "L1", ["clinic", "sports"]),
  claim("claim-comp-graft-fail", "fact", "Graft failure and re-tear after soft-tissue reconstruction may reflect technical, biologic, rehabilitation, or re-injury factors.", "graft-failure", "L1", ["sports", "oite"]),
  claim("claim-comp-spine-neuro", "red_flag", "New or progressive neurologic deficit after spine injury or surgery is time-sensitive and requires immediate evaluation.", "neurologic-injury", "L1", ["call", "oite"]),
  claim("claim-comp-durotomy", "fact", "Durotomy management prioritizes watertight repair principles, posture/activity guidance, and monitoring for CSF leak sequelae.", "durotomy", "L2", ["or", "oite"]),
  claim("claim-comp-physeal", "fact", "Physeal bar formation can produce growth arrest, angular deformity, and leg-length discrepancy in skeletally immature patients.", "physeal-bar-formation", "L1", ["pediatrics", "oite"]),
  claim("claim-comp-crps", "fact", "Complex regional pain syndrome is a diagnosis of disproportionate regional pain with sensory, vasomotor, sudomotor, or motor/trophic features after injury or surgery.", "crps", "L2", ["clinic", "oite"]),
  claim("claim-comp-reoperation", "clinical_script", "Counsel that reoperation and revision surgery are management-changing endpoints requiring diagnosis of the failure mode before salvage selection.", "revision-surgery", "L1", ["clinic", "or"]),
  claim("claim-comp-readmission", "fact", "Hospital readmission after orthopaedic care often clusters around infection, VTE, wound problems, pain control failure, and medical decompensation.", "hospital-readmission", "L2", ["floor", "clinic"]),
  claim("claim-comp-early-recognition", "fact", "Early recognition of complications depends on serial examination, expected recovery trajectories, and explicit escalation thresholds.", "early-recognition-of-complications", "L1", ["call", "floor", "oite"]),
];

const decisionPoint = (
  draftId: string,
  subjectEntitySlug: string,
  patternType: string,
  trigger: string,
  action: string,
  urgency: PilotDecisionPointDraft["urgency"],
  safetyCriticality: PilotDecisionPointDraft["safetyCriticality"],
  requiresAttendingReview = true
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
  sourceNote: "Complications manufacture; management-changing and time-sensitive items require attending review",
  requiresAttendingReview,
});

export const COMPLICATIONS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  decisionPoint("dp-comp-ssi", "surgical-site-infection", "infection_escalation", "Wound erythema, drainage, fever, or rising inflammatory markers after orthopaedic surgery", "Initiate infection workup, hold nonessential antibiotics when cultures are planned, and escalate for possible operative debridement", "urgent", "high"),
  decisionPoint("dp-comp-fri", "fracture-related-infection", "infection_escalation", "Suspected infection after fracture fixation with wound issues, nonunion, or systemic signs", "Obtain targeted workup and plan debridement with implant retention versus removal based on stability and timing", "urgent", "high"),
  decisionPoint("dp-comp-compartment", "acute-compartment-syndrome", "emergent_intervention", "Clinical findings concerning for evolving acute compartment syndrome", "Remove constriction, perform serial examination, and escalate for emergent fasciotomy without delaying for imaging alone", "emergent", "emergency"),
  decisionPoint("dp-comp-pe", "pulmonary-embolism", "medical_emergency", "Acute dyspnea, hypoxia, chest pain, or hemodynamic change with VTE risk", "Activate urgent medical evaluation and diagnostic pathway for pulmonary embolism while supporting oxygenation and circulation", "emergent", "emergency"),
  decisionPoint("dp-comp-neuro", "neurologic-injury", "neurologic_deterioration", "New or progressive motor, sensory, or bowel/bladder deficit after spine injury or surgery", "Perform immediate neurologic examination, protect the spine as indicated, and escalate for urgent imaging and specialist intervention", "emergent", "emergency"),
  decisionPoint("dp-comp-nv-injury", "neurovascular-injury", "limb_threat", "Loss of pulse, expanding hematoma, progressive neurologic deficit, or threatened limb perfusion", "Document status, reduce gross deformity when appropriate, and escalate immediately for vascular or nerve evaluation", "emergent", "emergency"),
  decisionPoint("dp-comp-pji", "periprosthetic-joint-infection", "operative_indication", "Suspected prosthetic joint infection with pain, effusion, wound drainage, or abnormal labs", "Complete infection workup before revision and select DAIR, one-stage, or two-stage strategy with attending input", "urgent", "high"),
  decisionPoint("dp-comp-loosening", "aseptic-loosening", "revision_threshold", "Progressive pain, radiographic lucency, or implant migration after infection is excluded", "Plan revision arthroplasty strategy based on bone loss, implant track record, and host factors", "routine", "high"),
  decisionPoint("dp-comp-hardware", "hardware-failure", "fixation_failure", "Broken implant, loss of alignment, or construct failure on surveillance imaging", "Protect the limb, obtain comparison imaging, and plan revision fixation or alternative construct", "urgent", "high"),
  decisionPoint("dp-comp-nonunion", "fracture-nonunion", "healing_failure", "Failure of expected clinical or radiographic progression toward union", "Evaluate infection, stability, biology, and host factors before selecting revision or biologic augmentation", "routine", "high"),
  decisionPoint("dp-comp-malunion", "fracture-malunion", "deformity_threshold", "Healed fracture with functionally significant malalignment, shortening, or rotation", "Quantify deformity and discuss osteotomy, revision, or accept-and-adapt pathways with attending", "routine", "moderate"),
  decisionPoint("dp-comp-avn", "avascular-necrosis", "joint_preservation", "Suspected AVN after femoral neck, talar, or proximal humerus injury", "Obtain dedicated imaging and counsel joint-preservation versus arthroplasty options by stage and joint", "routine", "high"),
  decisionPoint("dp-comp-stiffness", "arthrofibrosis", "motion_loss", "Early progressive motion loss after fracture care or soft-tissue reconstruction", "Intensify supervised therapy, exclude infection or mechanical block, and escalate for lysis/MUA when indicated", "urgent", "moderate"),
  decisionPoint("dp-comp-graft", "graft-failure", "reconstruction_failure", "Recurrent instability or imaging evidence of graft failure after ligament reconstruction", "Assess tunnel position, graft integrity, alignment, and rehabilitation before revision reconstruction planning", "routine", "high"),
  decisionPoint("dp-comp-physeal", "physeal-bar-formation", "growth_disturbance", "Asymmetric growth, angular deformity, or LLD after physeal injury", "Image the physis, quantify bar and remaining growth, and plan bar resection versus guided growth/osteotomy", "routine", "high"),
  decisionPoint("dp-comp-cardiac", "cardiac-complication", "medical_emergency", "Chest pain, arrhythmia, hypotension, or suspected ACS after orthopaedic surgery", "Activate medical emergency response and stabilize while pausing nonessential orthopaedic progression", "emergent", "emergency"),
  decisionPoint("dp-comp-mortality", "perioperative-mortality", "goals_of_care", "Life-threatening decompensation or expected high mortality trajectory after major orthopaedic injury/surgery", "Escalate critical care, clarify goals of care, and coordinate multidisciplinary decision-making", "emergent", "emergency"),
  decisionPoint("dp-comp-readmit", "hospital-readmission", "disposition_risk", "Early post-discharge wound, VTE, infection, or medical warning signs", "Expedite evaluation, risk-stratify for ED/readmission, and address root cause before discharge planning", "urgent", "moderate", false),
];
