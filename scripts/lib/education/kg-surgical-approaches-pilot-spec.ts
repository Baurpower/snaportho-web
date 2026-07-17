/**
 * Surgical Approaches canonical knowledge neighborhood.
 *
 * Reusable operative exposure backbone. Consumes anatomy and complication
 * identities rather than recreating them. Claims and decision points remain
 * generated drafts until factory review gates approve them.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export const SURGICAL_APPROACHES_PILOT_KEY = "surgical-approaches-neighborhood" as const;

export const SURGICAL_APPROACHES_SOURCE_IDS = {
  curriculumNodeSlug: "surgical-approaches",
  prepareTopicId: "surgical-approaches",
  legacyRetargetProposalKey: "retarget:surgical-approaches",
} as const;

export const SURGICAL_APPROACHES_ASSET_COUNTS = {
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
    pilot: SURGICAL_APPROACHES_PILOT_KEY,
    neighborhood: "surgical-approaches",
    ...metadata,
  },
});

type ApproachDef = {
  slug: string;
  label: string;
  region: string;
  interval?: string;
  atRisk: string[];
  complications?: string[];
  positioning?: string;
};

/** Regional approach catalog — priority manufacturing scope. */
const APPROACHES: ApproachDef[] = [
  // Shoulder
  { slug: "deltopectoral-approach", label: "Deltopectoral Approach", region: "shoulder", interval: "deltopectoral-interval", atRisk: ["axillary-nerve", "humeral-head", "brachial-artery"], complications: ["neurovascular-injury", "wound-complication"], positioning: "beach-chair-positioning" },
  { slug: "anterosuperior-shoulder-approach", label: "Anterosuperior Shoulder Approach", region: "shoulder", atRisk: ["axillary-nerve", "humeral-head"], complications: ["neurovascular-injury"], positioning: "beach-chair-positioning" },
  { slug: "superior-shoulder-approach", label: "Superior Shoulder Approach", region: "shoulder", atRisk: ["axillary-nerve"], complications: ["neurovascular-injury"], positioning: "beach-chair-positioning" },
  { slug: "posterior-shoulder-approach", label: "Posterior Shoulder Approach", region: "shoulder", atRisk: ["axillary-nerve", "radial-nerve"], complications: ["neurovascular-injury"], positioning: "lateral-decubitus-positioning" },
  // Humerus and elbow
  { slug: "anterior-humerus-approach", label: "Anterior Humerus Approach", region: "humerus-elbow", atRisk: ["radial-nerve", "brachial-artery", "median-nerve"], complications: ["radial-nerve-palsy", "neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "anterolateral-humerus-approach", label: "Anterolateral Humerus Approach", region: "humerus-elbow", atRisk: ["radial-nerve", "safe-zone-radial-nerve-humerus"], complications: ["radial-nerve-palsy"], positioning: "supine-positioning" },
  { slug: "posterior-humerus-approach", label: "Posterior Humerus Approach", region: "humerus-elbow", atRisk: ["radial-nerve", "ulnar-nerve", "safe-zone-radial-nerve-humerus"], complications: ["radial-nerve-palsy"], positioning: "lateral-decubitus-positioning" },
  { slug: "kocher-approach", label: "Kocher Approach", region: "humerus-elbow", interval: "kocher-interval", atRisk: ["radial-nerve", "elbow-joint"], complications: ["neurovascular-injury", "arthrofibrosis"], positioning: "supine-positioning" },
  { slug: "kaplan-approach", label: "Kaplan Approach", region: "humerus-elbow", interval: "kaplan-interval", atRisk: ["radial-nerve", "elbow-joint"], complications: ["neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "bryan-morrey-approach", label: "Bryan-Morrey Approach", region: "humerus-elbow", atRisk: ["ulnar-nerve", "elbow-joint"], complications: ["neurovascular-injury", "arthrofibrosis"], positioning: "supine-positioning" },
  { slug: "olecranon-osteotomy-approach", label: "Olecranon Osteotomy Approach", region: "humerus-elbow", atRisk: ["ulnar-nerve", "elbow-joint"], complications: ["hardware-failure", "nonunion-risk-olecranon-osteotomy", "arthrofibrosis"], positioning: "lateral-decubitus-positioning" },
  // Forearm and wrist
  { slug: "volar-henry-approach", label: "Volar Henry Approach", region: "forearm-wrist", interval: "henry-interval", atRisk: ["median-nerve", "radial-artery", "radial-nerve"], complications: ["median-neuropathy", "neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "extended-fcr-approach", label: "Extended FCR Approach", region: "forearm-wrist", atRisk: ["median-nerve", "radial-artery"], complications: ["median-neuropathy", "tendon-irritation"], positioning: "supine-positioning" },
  { slug: "dorsal-distal-radius-approach", label: "Dorsal Distal Radius Approach", region: "forearm-wrist", atRisk: ["extensor-tendon-zones", "radial-nerve"], complications: ["tendon-irritation", "implant-prominence"], positioning: "supine-positioning" },
  { slug: "thompson-approach", label: "Thompson Approach", region: "forearm-wrist", atRisk: ["radial-nerve", "posterior-interosseous-nerve-at-risk"], complications: ["radial-nerve-palsy"], positioning: "supine-positioning" },
  { slug: "dorsal-forearm-approach", label: "Dorsal Forearm Approach", region: "forearm-wrist", atRisk: ["radial-nerve", "ulnar-nerve"], complications: ["neurovascular-injury"], positioning: "supine-positioning" },
  // Hand
  { slug: "carpal-tunnel-approach", label: "Carpal Tunnel Approach", region: "hand", atRisk: ["median-nerve", "ulnar-nerve", "digital-nerves"], complications: ["median-neuropathy", "wound-complication"], positioning: "supine-positioning" },
  { slug: "trigger-finger-release-approach", label: "Trigger Finger Release Approach", region: "hand", atRisk: ["digital-nerves"], complications: ["neurovascular-injury", "wound-complication"], positioning: "supine-positioning" },
  { slug: "thumb-ucl-approach", label: "Thumb UCL Approach", region: "hand", atRisk: ["digital-nerves", "cmc-joint"], complications: ["neurovascular-injury", "recurrent-instability"], positioning: "supine-positioning" },
  { slug: "dorsal-hand-approach", label: "Dorsal Hand Approach", region: "hand", atRisk: ["extensor-tendon-zones", "digital-nerves"], complications: ["wound-complication"], positioning: "supine-positioning" },
  { slug: "finger-approach", label: "Finger Approach", region: "hand", atRisk: ["digital-nerves", "pip-joint", "dip-joint"], complications: ["neurovascular-injury", "joint-stiffness"], positioning: "supine-positioning" },
  // Pelvis and acetabulum
  { slug: "pfannenstiel-approach", label: "Pfannenstiel Approach", region: "pelvis-acetabulum", atRisk: ["bladder-at-risk-pelvis", "iliac-wing"], complications: ["neurovascular-injury", "wound-complication"], positioning: "supine-positioning" },
  { slug: "modified-stoppa-approach", label: "Modified Stoppa Approach", region: "pelvis-acetabulum", atRisk: ["obturator-neurovascular-at-risk", "iliac-wing", "acetabulum"], complications: ["neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "ilioinguinal-approach", label: "Ilioinguinal Approach", region: "pelvis-acetabulum", atRisk: ["femoral-triangle", "iliac-wing", "acetabulum"], complications: ["neurovascular-injury", "hernia-risk-after-ilioinguinal"], positioning: "supine-positioning" },
  { slug: "kocher-langenbeck-approach", label: "Kocher-Langenbeck Approach", region: "pelvis-acetabulum", atRisk: ["sciatic-nerve", "medial-femoral-circumflex-artery", "acetabulum"], complications: ["sciatic-nerve-injury-after-kl", "avascular-necrosis", "heterotopic-ossification"], positioning: "lateral-decubitus-positioning" },
  { slug: "smith-petersen-approach", label: "Smith-Petersen Approach", region: "pelvis-acetabulum", interval: "smith-petersen-interval", atRisk: ["lateral-femoral-cutaneous-at-risk", "hip-joint", "acetabulum"], complications: ["neurovascular-injury", "heterotopic-ossification"], positioning: "supine-positioning" },
  // Hip
  { slug: "posterior-hip-approach", label: "Posterior Hip Approach", region: "hip", atRisk: ["sciatic-nerve", "hip-joint", "medial-femoral-circumflex-artery"], complications: ["neurovascular-injury", "prosthetic-instability", "heterotopic-ossification"], positioning: "lateral-decubitus-positioning" },
  { slug: "direct-anterior-hip-approach", label: "Direct Anterior Hip Approach", region: "hip", interval: "smith-petersen-interval", atRisk: ["lateral-femoral-cutaneous-at-risk", "hip-joint", "femoral-nerve-at-risk"], complications: ["neurovascular-injury", "wound-complication", "periprosthetic-fracture"], positioning: "supine-positioning" },
  { slug: "direct-lateral-hip-approach", label: "Direct Lateral Hip Approach", region: "hip", atRisk: ["hip-joint", "superior-gluteal-at-risk"], complications: ["abductor-dysfunction-after-lateral-hip", "heterotopic-ossification"], positioning: "lateral-decubitus-positioning" },
  { slug: "anterolateral-hip-approach", label: "Anterolateral Hip Approach", region: "hip", interval: "watson-jones-interval", atRisk: ["hip-joint", "superior-gluteal-at-risk"], complications: ["abductor-dysfunction-after-lateral-hip", "heterotopic-ossification"], positioning: "lateral-decubitus-positioning" },
  { slug: "surgical-hip-dislocation-approach", label: "Surgical Hip Dislocation", region: "hip", atRisk: ["medial-femoral-circumflex-artery", "hip-joint", "sciatic-nerve"], complications: ["avascular-necrosis", "heterotopic-ossification"], positioning: "lateral-decubitus-positioning" },
  // Femur and knee
  { slug: "lateral-femur-approach", label: "Lateral Femur Approach", region: "femur-knee", atRisk: ["femoral-diaphysis", "common-peroneal-nerve"], complications: ["neurovascular-injury", "wound-complication"], positioning: "supine-positioning" },
  { slug: "medial-distal-femur-approach", label: "Medial Distal Femur Approach", region: "femur-knee", atRisk: ["femoral-condyles", "saphenous-at-risk"], complications: ["neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "medial-parapatellar-approach", label: "Medial Parapatellar Approach", region: "femur-knee", interval: "knee-medial-parapatellar-interval", atRisk: ["extensor-mechanism", "femoral-condyles"], complications: ["extensor-mechanism-failure", "arthrofibrosis"], positioning: "supine-positioning" },
  { slug: "subvastus-approach", label: "Subvastus Approach", region: "femur-knee", atRisk: ["extensor-mechanism", "femoral-condyles"], complications: ["arthrofibrosis"], positioning: "supine-positioning" },
  { slug: "midvastus-approach", label: "Midvastus Approach", region: "femur-knee", atRisk: ["extensor-mechanism", "femoral-condyles"], complications: ["arthrofibrosis"], positioning: "supine-positioning" },
  { slug: "posterior-knee-approach", label: "Posterior Knee Approach", region: "femur-knee", atRisk: ["popliteal-artery", "common-peroneal-nerve", "popliteal-fossa"], complications: ["neurovascular-injury"], positioning: "prone-positioning" },
  // Tibia and ankle
  { slug: "anteromedial-tibia-approach", label: "Anteromedial Tibia Approach", region: "tibia-ankle", atRisk: ["saphenous-at-risk", "leg-anterior-compartment"], complications: ["wound-complication", "surgical-site-infection"], positioning: "supine-positioning" },
  { slug: "anterolateral-tibia-approach", label: "Anterolateral Tibia Approach", region: "tibia-ankle", atRisk: ["common-peroneal-nerve", "leg-anterior-compartment", "safe-zone-common-fibular-nerve"], complications: ["neurovascular-injury", "wound-complication"], positioning: "supine-positioning" },
  { slug: "posteromedial-tibia-approach", label: "Posteromedial Tibia Approach", region: "tibia-ankle", atRisk: ["leg-deep-posterior-compartment", "saphenous-at-risk"], complications: ["neurovascular-injury", "wound-complication"], positioning: "supine-positioning" },
  { slug: "posterolateral-tibia-approach", label: "Posterolateral Tibia Approach", region: "tibia-ankle", atRisk: ["common-peroneal-nerve", "leg-lateral-compartment", "safe-zone-common-fibular-nerve"], complications: ["neurovascular-injury"], positioning: "prone-positioning" },
  { slug: "anterior-ankle-approach", label: "Anterior Ankle Approach", region: "tibia-ankle", atRisk: ["leg-anterior-compartment", "extensor-tendon-zones"], complications: ["wound-complication", "neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "lateral-ankle-approach", label: "Lateral Ankle Approach", region: "tibia-ankle", atRisk: ["common-peroneal-nerve", "subtalar-joint"], complications: ["wound-complication", "sural-nerve-injury-lateral-ankle"], positioning: "supine-positioning" },
  { slug: "posterior-ankle-approach", label: "Posterior Ankle Approach", region: "tibia-ankle", atRisk: ["leg-deep-posterior-compartment", "subtalar-joint"], complications: ["wound-complication", "neurovascular-injury"], positioning: "prone-positioning" },
  // Foot
  { slug: "dorsal-foot-approach", label: "Dorsal Foot Approach", region: "foot", atRisk: ["lisfranc-joint", "extensor-tendon-zones", "digital-nerves"], complications: ["wound-complication", "neurovascular-injury"], positioning: "supine-positioning" },
  { slug: "medial-foot-approach", label: "Medial Foot Approach", region: "foot", atRisk: ["saphenous-at-risk", "lisfranc-joint"], complications: ["wound-complication"], positioning: "supine-positioning" },
  { slug: "lateral-foot-approach", label: "Lateral Foot Approach", region: "foot", atRisk: ["sural-nerve-lateral-foot", "subtalar-joint"], complications: ["wound-complication", "sural-nerve-injury-lateral-ankle"], positioning: "supine-positioning" },
  { slug: "plantar-foot-approach", label: "Plantar Foot Approach", region: "foot", atRisk: ["digital-nerves", "lisfranc-joint"], complications: ["wound-complication", "chronic-pain"], positioning: "supine-positioning" },
  // Spine
  { slug: "posterior-cervical-approach", label: "Posterior Cervical Approach", region: "spine", atRisk: ["spinal-cord", "exiting-nerve-root", "vertebral-artery"], complications: ["neurologic-injury", "durotomy"], positioning: "prone-positioning" },
  { slug: "acdf-approach", label: "ACDF Approach", region: "spine", atRisk: ["spinal-cord", "vertebral-artery", "exiting-nerve-root"], complications: ["neurologic-injury", "dysphagia-after-acdf", "durotomy"], positioning: "supine-positioning" },
  { slug: "posterior-thoracic-approach", label: "Posterior Thoracic Approach", region: "spine", atRisk: ["spinal-cord", "exiting-nerve-root"], complications: ["neurologic-injury", "durotomy"], positioning: "prone-positioning" },
  { slug: "posterior-lumbar-approach", label: "Posterior Lumbar Approach", region: "spine", atRisk: ["spinal-cord", "exiting-nerve-root", "traversing-nerve-root"], complications: ["neurologic-injury", "durotomy"], positioning: "prone-positioning" },
  { slug: "tlif-approach", label: "TLIF Approach", region: "spine", atRisk: ["exiting-nerve-root", "traversing-nerve-root", "spinal-cord"], complications: ["neurologic-injury", "durotomy", "pseudarthrosis"], positioning: "prone-positioning" },
  { slug: "alif-approach", label: "ALIF Approach", region: "spine", atRisk: ["spinal-cord", "great-vessel-at-risk-alif"], complications: ["neurovascular-injury", "pseudarthrosis"], positioning: "supine-positioning" },
  { slug: "xlif-approach", label: "XLIF Approach", region: "spine", atRisk: ["exiting-nerve-root", "psoas-plexus-at-risk"], complications: ["neurologic-injury", "hip-flexor-weakness-after-xlif"], positioning: "lateral-decubitus-positioning" },
];

const REGIONS = [
  ["shoulder", "Shoulder"],
  ["humerus-elbow", "Humerus and Elbow"],
  ["forearm-wrist", "Forearm and Wrist"],
  ["hand", "Hand"],
  ["pelvis-acetabulum", "Pelvis and Acetabulum"],
  ["hip", "Hip"],
  ["femur-knee", "Femur and Knee"],
  ["tibia-ankle", "Tibia and Ankle"],
  ["foot", "Foot"],
  ["spine", "Spine"],
] as const;

/** Universal approach concepts (independent of surgeon preference/implant system). */
const UNIVERSAL_CONCEPTS: PilotEntitySpec[] = [
  entity("surgical-approaches", "treatment_principle", "Surgical Approaches", "Reusable operative exposure, positioning, safety, and closure backbone for orthopaedic surgery.", { clinical_kind: "foundational_backbone", maturity_target: 7 }),
  entity("approach-selection-principles", "treatment_principle", "Approach Selection Principles", "Generic criteria for selecting an operative exposure independent of implant system."),
  entity("patient-positioning-principles", "treatment_principle", "Patient Positioning Principles", "Principles governing safe operative positioning for exposure, imaging, and bailout."),
  entity("prep-and-drape-principles", "treatment_principle", "Prep and Drape Principles", "Sterile preparation and draping of operative regions with imaging access preserved."),
  entity("c-arm-positioning-principles", "treatment_principle", "C-arm Positioning Principles", "Planning of fluoroscopic trajectories, sterile entry, and monitor placement before incision."),
  entity("surface-landmark-principles", "treatment_principle", "Surface Landmark Principles", "Palpable and radiographic surface landmarks used for incision planning."),
  entity("skin-incision-planning", "treatment_principle", "Skin Incision Planning", "Planning incision length, orientation, prior scars, and extensile continuity."),
  entity("internervous-plane-principles", "treatment_principle", "Internervous Plane Principles", "Reusable concept of dissection between nerve territories to reduce denervation risk."),
  entity("intermuscular-plane-principles", "treatment_principle", "Intermuscular Plane Principles", "Reusable concept of intermuscular intervals as defined exposure pathways."),
  entity("deep-interval-principles", "treatment_principle", "Deep Interval Principles", "Deep fascial and muscular intervals that complete exposure after the superficial plane."),
  entity("exposure-limit-principles", "treatment_principle", "Exposure Limit Principles", "Defined safe limits of a named approach before extension or bailout is required."),
  entity("structures-requiring-release", "treatment_principle", "Structures Requiring Release", "Soft-tissue structures intentionally released to complete a planned exposure."),
  entity("structures-requiring-protection", "treatment_principle", "Structures Requiring Protection", "Soft-tissue and neurovascular structures that must be identified and protected."),
  entity("neurovascular-structures-at-risk", "treatment_principle", "Neurovascular Structures at Risk", "Canonical catalog concept for nerves and vessels endangered by a given approach."),
  entity("extensile-exposure-principles", "treatment_principle", "Extensile Exposure Principles", "Independent principles for extending a standard exposure along defined pathways."),
  entity("bailout-strategy-principles", "treatment_principle", "Bailout Strategy Principles", "Independent alternative exposure or exit strategies when the planned approach fails."),
  entity("closure-principles", "treatment_principle", "Closure Principles", "Layered closure restoring released structures without entrapping protected anatomy."),
  entity("postoperative-approach-considerations", "treatment_principle", "Postoperative Approach Considerations", "Approach-specific postoperative restrictions, wound care, and surveillance."),
  entity("revision-exposure-principles", "treatment_principle", "Revision Exposure Principles", "Principles for re-entry, scar navigation, and prior-incision utilization in revision surgery."),
  entity("exposure-escalation-strategies", "treatment_principle", "Exposure Escalation Strategies", "Staged progression from limited to extensile or alternate windows when exposure is inadequate."),
  entity("safe-zone-principles", "treatment_principle", "Safe Zone Principles", "Anatomic safe corridors for implants, pins, and dissection relative to neurovascular structures."),
  entity("approach-specific-complication-principles", "treatment_principle", "Approach-Specific Complication Principles", "How operative approach selection links to characteristic failure modes and complications."),
];

/** Positioning objects — surgical_positioning type; single identity each (no duplicates). */
const POSITIONING: PilotEntitySpec[] = [
  entity("supine-positioning", "surgical_positioning", "Supine Positioning", "Patient supine for anterior and many extremity exposures with C-arm access.", { positioning_kind: "standard" }),
  entity("prone-positioning", "surgical_positioning", "Prone Positioning", "Patient prone for posterior spine and selected posterior extremity exposures.", { positioning_kind: "standard" }),
  entity("lateral-decubitus-positioning", "surgical_positioning", "Lateral Decubitus Positioning", "Patient lateral for hip, shoulder, and selected acetabular or spine exposures.", { positioning_kind: "standard" }),
  entity("beach-chair-positioning", "surgical_positioning", "Beach-Chair Positioning", "Semi-sitting shoulder positioning supporting deltopectoral and superior shoulder exposures.", { positioning_kind: "regional" }),
  entity("traction-table-positioning", "surgical_positioning", "Traction Table Positioning", "Fracture-table positioning for hip and femoral nailing exposures with controlled traction.", { positioning_kind: "specialty" }),
];

/** Internervous / intermuscular planes recorded separately so they can be reused across approaches. */
const PLANE_ENTITIES: PilotEntitySpec[] = [
  entity("deltopectoral-interval", "anatomy_structure", "Deltopectoral Interval", "Internervous interval between deltoid (axillary) and pectoralis major (lateral/medial pectoral).", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "internervous", anatomy_kind: "interval", hierarchy_level: "structure", region: "shoulder" }),
  entity("henry-interval", "anatomy_structure", "Henry Interval", "Volar forearm interval used in the Henry approach to the radius.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "internervous", anatomy_kind: "interval", hierarchy_level: "structure", region: "forearm" }),
  entity("kocher-interval", "anatomy_structure", "Kocher Interval", "Lateral elbow interval between anconeus and ECU used in the Kocher approach.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "internervous", anatomy_kind: "interval", hierarchy_level: "structure", region: "elbow" }),
  entity("kaplan-interval", "anatomy_structure", "Kaplan Interval", "Lateral elbow interval between ECRB and EDC used in the Kaplan approach.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "internervous", anatomy_kind: "interval", hierarchy_level: "structure", region: "elbow" }),
  entity("smith-petersen-interval", "anatomy_structure", "Smith-Petersen Interval", "Anterior hip interval between sartorius/TFL superficially and rectus/gluteus medius deeply.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "internervous", anatomy_kind: "interval", hierarchy_level: "structure", region: "hip" }),
  entity("watson-jones-interval", "anatomy_structure", "Watson-Jones Interval", "Anterolateral hip interval between TFL and gluteus medius.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "internervous", anatomy_kind: "interval", hierarchy_level: "structure", region: "hip" }),
  entity("knee-medial-parapatellar-interval", "anatomy_structure", "Medial Parapatellar Interval", "Medial parapatellar interval used for extensile knee arthrotomy.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", plane_kind: "intermuscular", anatomy_kind: "interval", hierarchy_level: "structure", region: "knee" }),
  // Named reusable internervous-plane concept nodes (not approach-specific)
  entity("internervous-plane-catalog", "treatment_principle", "Internervous Plane Catalog", "Catalog of reusable internervous planes independent of named approaches."),
  entity("intermuscular-plane-catalog", "treatment_principle", "Intermuscular Plane Catalog", "Catalog of reusable intermuscular planes independent of named approaches."),
];

/** Reused anatomy for at-risk and landmark relationships (consume, do not redefine ownership). */
const REUSED_ANATOMY: PilotEntitySpec[] = [
  entity("orthopaedic-anatomy", "anatomy_structure", "Orthopaedic Anatomy", "Reusable anatomy backbone consumed by operative exposures.", {
    reused_identity: true,
    source_neighborhood: "orthopaedic-anatomy",
    anatomy_kind: "composite",
    hierarchy_level: "system",
    region: "whole-body",
  }),
  entity("axillary-nerve", "anatomy_structure", "Axillary Nerve", "Peripheral nerve at risk in shoulder approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy", anatomy_kind: "nerve", hierarchy_level: "structure", region: "upper-extremity" }),
  entity("radial-nerve", "anatomy_structure", "Radial Nerve", "Peripheral nerve at risk in humeral and forearm approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("median-nerve", "anatomy_structure", "Median Nerve", "Peripheral nerve at risk in volar forearm and carpal tunnel approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("ulnar-nerve", "anatomy_structure", "Ulnar Nerve", "Peripheral nerve at risk in medial elbow and medial hand approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("sciatic-nerve", "anatomy_structure", "Sciatic Nerve", "Peripheral nerve at risk in posterior hip and acetabular approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("common-peroneal-nerve", "anatomy_structure", "Common Peroneal Nerve", "Peripheral nerve at risk about the fibular neck and lateral knee/leg.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("brachial-artery", "anatomy_structure", "Brachial Artery", "Major upper-extremity artery at risk in anterior arm approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("radial-artery", "anatomy_structure", "Radial Artery", "Artery at risk in volar distal radius approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("ulnar-artery", "anatomy_structure", "Ulnar Artery", "Artery at risk in medial forearm and hand approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("popliteal-artery", "anatomy_structure", "Popliteal Artery", "Artery at risk in posterior knee approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("popliteal-fossa", "anatomy_structure", "Popliteal Fossa", "Posterior knee region containing neurovascular structures.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("medial-femoral-circumflex-artery", "anatomy_structure", "Medial Femoral Circumflex Artery", "Critical femoral-head blood supply at risk in posterior hip approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("humeral-head", "anatomy_structure", "Humeral Head", "Proximal humeral articular head.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("hip-joint", "anatomy_structure", "Hip Joint", "Ball-and-socket joint of proximal femur and acetabulum.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("acetabulum", "anatomy_structure", "Acetabulum", "Pelvic socket of the hip joint.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("iliac-wing", "anatomy_structure", "Iliac Wing", "Iliac bony region relevant to pelvic approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("femoral-triangle", "anatomy_structure", "Femoral Triangle", "Anterior hip/groin region containing femoral neurovascular structures.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("femoral-diaphysis", "anatomy_structure", "Femoral Diaphysis", "Femoral shaft.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("femoral-condyles", "anatomy_structure", "Femoral Condyles", "Distal femoral articular condyles.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("extensor-mechanism", "anatomy_structure", "Extensor Mechanism", "Quadriceps-patella-tendon apparatus of the knee.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("elbow-joint", "anatomy_structure", "Elbow Joint", "Hinge joint of distal humerus, radius, and ulna.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("leg-anterior-compartment", "anatomy_structure", "Anterior Compartment of the Leg", "Anterior leg compartment.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("leg-lateral-compartment", "anatomy_structure", "Lateral Compartment of the Leg", "Lateral leg compartment.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("leg-deep-posterior-compartment", "anatomy_structure", "Deep Posterior Compartment of the Leg", "Deep posterior leg compartment.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("safe-zone-radial-nerve-humerus", "anatomy_structure", "Radial Nerve Safe Zone (Humerus)", "Safe corridor relative to the radial nerve about the humerus.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("safe-zone-common-fibular-nerve", "anatomy_structure", "Common Fibular Nerve Safe Zone", "Safe corridor relative to the common fibular nerve.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("spinal-cord", "anatomy_structure", "Spinal Cord", "Neural structure at risk in spine approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("exiting-nerve-root", "anatomy_structure", "Exiting Nerve Root", "Spinal nerve root at risk during decompression and interbody work.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("traversing-nerve-root", "anatomy_structure", "Traversing Nerve Root", "Traversing nerve root at risk in lumbar approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("vertebral-artery", "anatomy_structure", "Vertebral Artery", "Artery at risk in cervical spine approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("subtalar-joint", "anatomy_structure", "Subtalar Joint", "Hindfoot joint accessed by lateral and posterior foot/ankle approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("lisfranc-joint", "anatomy_structure", "Lisfranc Joint", "Tarsometatarsal complex accessed by dorsal foot approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("extensor-tendon-zones", "anatomy_structure", "Extensor Tendon Zones", "Dorsal hand/wrist extensor apparatus zones.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("digital-nerves", "anatomy_structure", "Digital Nerves", "Digital neurovascular bundles at risk in hand approaches.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("cmc-joint", "anatomy_structure", "CMC Joint", "Carpometacarpal joint.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("pip-joint", "anatomy_structure", "PIP Joint", "Proximal interphalangeal joint.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  entity("dip-joint", "anatomy_structure", "DIP Joint", "Distal interphalangeal joint.", { reused_identity: true, source_neighborhood: "orthopaedic-anatomy" }),
  // Local anatomy labels for at-risk concepts not yet separate anatomy roots — treatment_principle placeholders reused as risk concepts
  entity("posterior-interosseous-nerve-at-risk", "treatment_principle", "Posterior Interosseous Nerve at Risk", "PIN risk concept for dorsal forearm approaches; consumes radial-nerve territory without minting a duplicate anatomy root."),
  entity("lateral-femoral-cutaneous-at-risk", "treatment_principle", "Lateral Femoral Cutaneous Nerve at Risk", "LFCN risk concept for anterior hip approaches."),
  entity("femoral-nerve-at-risk", "treatment_principle", "Femoral Nerve at Risk", "Femoral nerve risk concept for anterior hip and pelvic approaches."),
  entity("obturator-neurovascular-at-risk", "treatment_principle", "Obturator Neurovascular Bundle at Risk", "Obturator NV risk concept for Stoppa and medial pelvic approaches."),
  entity("bladder-at-risk-pelvis", "treatment_principle", "Bladder at Risk (Pelvic Approaches)", "Bladder protection concept for Pfannenstiel and Stoppa exposures."),
  entity("superior-gluteal-at-risk", "treatment_principle", "Superior Gluteal Neurovascular Bundle at Risk", "Superior gluteal risk concept for lateral hip approaches."),
  entity("saphenous-at-risk", "treatment_principle", "Saphenous Nerve at Risk", "Saphenous nerve risk concept for medial knee/leg approaches."),
  entity("sural-nerve-lateral-foot", "treatment_principle", "Sural Nerve (Lateral Foot) at Risk", "Sural nerve risk concept for lateral foot and ankle approaches."),
  entity("great-vessel-at-risk-alif", "treatment_principle", "Great Vessels at Risk (ALIF)", "Aortoiliac/venous risk concept for anterior lumbar approaches."),
  entity("psoas-plexus-at-risk", "treatment_principle", "Psoas/Lumbar Plexus at Risk", "Psoas and lumbar plexus risk concept for lateral lumbar approaches."),
];

/** Reused complications — consume Complications backbone identities. */
const REUSED_COMPLICATIONS: PilotEntitySpec[] = [
  entity("neurovascular-injury", "complication", "Neurovascular Injury", "Iatrogenic or traumatic nerve or vessel injury.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("wound-complication", "complication", "Wound Complication", "Wound-healing failure after surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("surgical-site-infection", "complication", "Surgical Site Infection", "Postoperative surgical site infection.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("radial-nerve-palsy", "complication", "Radial Nerve Palsy", "Radial nerve deficit after injury or surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("median-neuropathy", "complication", "Median Neuropathy", "Median nerve dysfunction after injury or surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("arthrofibrosis", "complication", "Arthrofibrosis", "Excessive periarticular fibrosis with stiffness.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("heterotopic-ossification", "complication", "Heterotopic Ossification", "Ectopic bone formation after trauma or surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("avascular-necrosis", "complication", "Avascular Necrosis", "Ischemic bone death after vascular disruption.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("hardware-failure", "complication", "Hardware Failure", "Mechanical implant construct failure.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("implant-prominence", "complication", "Implant Prominence", "Painful hardware prominence.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("tendon-irritation", "complication", "Tendon Irritation", "Tendon irritation by implants or exposure.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("prosthetic-instability", "complication", "Prosthetic Instability", "Arthroplasty instability or dislocation.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("periprosthetic-fracture", "complication", "Periprosthetic Fracture", "Fracture around an arthroplasty implant.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("extensor-mechanism-failure", "complication", "Extensor Mechanism Failure", "Extensor mechanism disruption after knee surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("joint-stiffness", "complication", "Joint Stiffness", "Restricted range of motion after injury or surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("recurrent-instability", "complication", "Recurrent Instability", "Return of joint instability after repair.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("chronic-pain", "complication", "Chronic Pain", "Pain persisting beyond expected recovery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("durotomy", "complication", "Durotomy", "Dural opening during spine surgery.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("neurologic-injury", "complication", "Neurologic Injury", "New or worsened neurologic deficit.", { reused_identity: true, source_neighborhood: "complications" }),
  entity("pseudarthrosis", "complication", "Pseudarthrosis", "Failure of intended spinal fusion.", { reused_identity: true, source_neighborhood: "complications" }),
];

/** Approach-local complication concepts not owned elsewhere (minimal new set). */
const APPROACH_LOCAL_COMPLICATIONS: PilotEntitySpec[] = [
  entity("nonunion-risk-olecranon-osteotomy", "complication", "Olecranon Osteotomy Nonunion Risk", "Nonunion risk specific to olecranon osteotomy exposures.", { domain: "approach_specific" }),
  entity("hernia-risk-after-ilioinguinal", "complication", "Hernia Risk After Ilioinguinal Approach", "Abdominal wall hernia risk after ilioinguinal exposure.", { domain: "approach_specific" }),
  entity("sciatic-nerve-injury-after-kl", "complication", "Sciatic Nerve Injury After Kocher-Langenbeck", "Sciatic nerve injury associated with KL acetabular exposure.", { domain: "approach_specific" }),
  entity("abductor-dysfunction-after-lateral-hip", "complication", "Abductor Dysfunction After Lateral Hip Approach", "Abductor weakness after lateral or anterolateral hip exposure.", { domain: "approach_specific" }),
  entity("sural-nerve-injury-lateral-ankle", "complication", "Sural Nerve Injury (Lateral Ankle/Foot)", "Sural nerve injury after lateral ankle or foot approaches.", { domain: "approach_specific" }),
  entity("dysphagia-after-acdf", "complication", "Dysphagia After ACDF", "Swallowing dysfunction after anterior cervical approach.", { domain: "approach_specific" }),
  entity("hip-flexor-weakness-after-xlif", "complication", "Hip Flexor Weakness After XLIF", "Transient or persistent hip flexor weakness after lateral lumbar approach.", { domain: "approach_specific" }),
];

/** Extensile options and bailouts as independent entities (not embedded only as approach metadata). */
const EXTENSILE_AND_BAILOUT: PilotEntitySpec[] = [
  entity("extensile-deltopectoral-option", "treatment_principle", "Extensile Deltopectoral Option", "Defined proximal/distal extension of the deltopectoral approach."),
  entity("extensile-henry-option", "treatment_principle", "Extensile Henry Option", "Defined proximal/distal extension of the volar Henry approach."),
  entity("extensile-ilioinguinal-option", "treatment_principle", "Extensile Ilioinguinal Option", "Defined multi-window extension of the ilioinguinal approach."),
  entity("extensile-medial-parapatellar-option", "treatment_principle", "Extensile Medial Parapatellar Option", "Defined proximal extension of the medial parapatellar arthrotomy."),
  entity("bailout-alternate-window", "treatment_principle", "Bailout Alternate Window", "Independent alternate surgical window when the primary exposure fails."),
  entity("bailout-staged-exposure", "treatment_principle", "Bailout Staged Exposure", "Independent staged exposure strategy when soft tissues or physiology preclude single-stage full exposure."),
  entity("bailout-change-approach", "treatment_principle", "Bailout Change of Approach", "Independent decision to abandon the planned approach for a safer alternative."),
];

const REGION_ENTITIES: PilotEntitySpec[] = REGIONS.map(([slug, label]) =>
  entity(`approach-region-${slug}`, "treatment_principle", `${label} Approaches`, `Regional hub for ${label.toLowerCase()} surgical approaches.`, { region: slug })
);

const APPROACH_ENTITIES: PilotEntitySpec[] = APPROACHES.map((a) =>
  entity(a.slug, "surgical_approach", a.label, `Operative exposure in the ${a.region.replace(/-/g, " ")} region.`, {
    region: a.region,
    clinical_kind: "surgical_approach",
  })
);

export const SURGICAL_APPROACHES_ENTITIES: PilotEntitySpec[] = [
  ...UNIVERSAL_CONCEPTS,
  ...POSITIONING,
  ...PLANE_ENTITIES,
  ...REUSED_ANATOMY,
  ...REUSED_COMPLICATIONS,
  ...APPROACH_LOCAL_COMPLICATIONS,
  ...EXTENSILE_AND_BAILOUT,
  ...REGION_ENTITIES,
  ...APPROACH_ENTITIES,
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
    relevance_reason: "operative_planning",
    context_relevance: ["or", "call", "oite"],
    ...metadata,
  },
});

const UNIVERSAL_SLUGS = UNIVERSAL_CONCEPTS.map((e) => e.slug).filter((s) => s !== "surgical-approaches");

export const SURGICAL_APPROACHES_RELATIONSHIPS: PilotRelationshipSpec[] = [
  // Universal concepts → backbone
  ...UNIVERSAL_SLUGS.map((s) => rel(s, "prerequisite_for", "surgical-approaches", { clinical_importance: "high" })),
  ...POSITIONING.map((p) => rel(p.slug, "prerequisite_for", "patient-positioning-principles")),
  ...POSITIONING.map((p) => rel(p.slug, "prerequisite_for", "surgical-approaches")),
  rel("internervous-plane-catalog", "prerequisite_for", "internervous-plane-principles"),
  rel("intermuscular-plane-catalog", "prerequisite_for", "intermuscular-plane-principles"),
  rel("extensile-exposure-principles", "prerequisite_for", "exposure-escalation-strategies"),
  rel("bailout-strategy-principles", "prerequisite_for", "exposure-escalation-strategies"),
  rel("approach-selection-principles", "prerequisite_for", "revision-exposure-principles"),
  rel("neurovascular-structures-at-risk", "prerequisite_for", "structures-requiring-protection"),
  rel("safe-zone-principles", "prerequisite_for", "neurovascular-structures-at-risk"),
  rel("approach-specific-complication-principles", "prerequisite_for", "approach-selection-principles"),

  // Independent extensile/bailout entities
  rel("extensile-deltopectoral-option", "prerequisite_for", "extensile-exposure-principles"),
  rel("extensile-henry-option", "prerequisite_for", "extensile-exposure-principles"),
  rel("extensile-ilioinguinal-option", "prerequisite_for", "extensile-exposure-principles"),
  rel("extensile-medial-parapatellar-option", "prerequisite_for", "extensile-exposure-principles"),
  rel("bailout-alternate-window", "prerequisite_for", "bailout-strategy-principles"),
  rel("bailout-staged-exposure", "prerequisite_for", "bailout-strategy-principles"),
  rel("bailout-change-approach", "prerequisite_for", "bailout-strategy-principles"),
  rel("extensile-deltopectoral-option", "prerequisite_for", "deltopectoral-approach"),
  rel("extensile-henry-option", "prerequisite_for", "volar-henry-approach"),
  rel("extensile-ilioinguinal-option", "prerequisite_for", "ilioinguinal-approach"),
  rel("extensile-medial-parapatellar-option", "prerequisite_for", "medial-parapatellar-approach"),

  // Region hubs
  ...REGIONS.map(([slug]) => rel(`approach-region-${slug}`, "prerequisite_for", "surgical-approaches")),

  // Internervous/intermuscular planes catalogued separately + hierarchy for reused anatomy
  rel("deltopectoral-interval", "prerequisite_for", "internervous-plane-catalog", { plane_kind: "internervous" }),
  rel("henry-interval", "prerequisite_for", "internervous-plane-catalog", { plane_kind: "internervous" }),
  rel("kocher-interval", "prerequisite_for", "internervous-plane-catalog", { plane_kind: "internervous" }),
  rel("kaplan-interval", "prerequisite_for", "internervous-plane-catalog", { plane_kind: "internervous" }),
  rel("smith-petersen-interval", "prerequisite_for", "internervous-plane-catalog", { plane_kind: "internervous" }),
  rel("watson-jones-interval", "prerequisite_for", "internervous-plane-catalog", { plane_kind: "internervous" }),
  rel("knee-medial-parapatellar-interval", "prerequisite_for", "intermuscular-plane-catalog", { plane_kind: "intermuscular" }),
  // Anatomy hierarchy: consume orthopaedic-anatomy as parent (single root gap only)
  ...[
    "deltopectoral-interval",
    "henry-interval",
    "kocher-interval",
    "kaplan-interval",
    "smith-petersen-interval",
    "watson-jones-interval",
    "knee-medial-parapatellar-interval",
    "axillary-nerve",
    "radial-nerve",
    "median-nerve",
    "ulnar-nerve",
    "sciatic-nerve",
    "common-peroneal-nerve",
    "brachial-artery",
    "radial-artery",
    "ulnar-artery",
    "popliteal-artery",
    "popliteal-fossa",
    "medial-femoral-circumflex-artery",
    "humeral-head",
    "hip-joint",
    "acetabulum",
    "iliac-wing",
    "femoral-triangle",
    "femoral-diaphysis",
    "femoral-condyles",
    "extensor-mechanism",
    "elbow-joint",
    "leg-anterior-compartment",
    "leg-lateral-compartment",
    "leg-deep-posterior-compartment",
    "safe-zone-radial-nerve-humerus",
    "safe-zone-common-fibular-nerve",
    "spinal-cord",
    "exiting-nerve-root",
    "traversing-nerve-root",
    "vertebral-artery",
    "subtalar-joint",
    "lisfranc-joint",
    "extensor-tendon-zones",
    "digital-nerves",
    "cmc-joint",
    "pip-joint",
    "dip-joint",
  ].map((slug) => rel(slug, "part_of", "orthopaedic-anatomy", { hierarchy: true })),
  // Root self-anchor via contains inverse pattern: orthopaedic-anatomy part_of orthopaedic-anatomy is invalid;
  // use contains from root to a sentinel plane catalog proxy only if needed. Root gap accepted if any.

  // Safe zones
  rel("safe-zone-radial-nerve-humerus", "prerequisite_for", "safe-zone-principles"),
  rel("safe-zone-common-fibular-nerve", "prerequisite_for", "safe-zone-principles"),

  // Per-approach structure
  ...APPROACHES.flatMap((a) => {
    const edges: PilotRelationshipSpec[] = [
      rel(`approach-region-${a.region}`, "prerequisite_for", a.slug, { anatomy_role: "essential" }),
      rel(a.slug, "prerequisite_for", "surgical-approaches"),
      rel("approach-selection-principles", "prerequisite_for", a.slug, { requires_human_review: true }),
      rel("neurovascular-structures-at-risk", "prerequisite_for", a.slug, { requires_attending_review: true }),
      rel("exposure-limit-principles", "prerequisite_for", a.slug),
      rel("extensile-exposure-principles", "prerequisite_for", a.slug),
      rel("bailout-strategy-principles", "prerequisite_for", a.slug),
      rel("closure-principles", "prerequisite_for", a.slug),
      rel("postoperative-approach-considerations", "prerequisite_for", a.slug),
    ];
    if (a.positioning) {
      edges.push(rel(a.positioning, "prerequisite_for", a.slug, { positioning_role: "standard" }));
    }
    if (a.interval) {
      edges.push(
        rel(a.interval, "prerequisite_for", a.slug, {
          anatomy_role: "interval",
          plane_link: true,
          clinical_importance: "critical",
        })
      );
    }
    for (const anat of a.atRisk) {
      edges.push(
        rel(anat, "prerequisite_for", a.slug, {
          anatomy_role: "at_risk",
          requires_attending_review: true,
          clinical_importance: "critical",
          safety_critical: true,
        })
      );
    }
    for (const c of a.complications ?? []) {
      edges.push(
        rel(c, "prerequisite_for", a.slug, {
          complication_role: "approach_specific",
          relevance_reason: "approach_complication",
        })
      );
      edges.push(
        rel(c, "prerequisite_for", "approach-specific-complication-principles", {
          complication_role: "approach_specific",
        })
      );
    }
    return edges;
  }),
];

// Deduplicate relationship triples (prevents duplicate anatomy-at-risk and positioning edges)
function dedupeRelationships(rels: PilotRelationshipSpec[]): PilotRelationshipSpec[] {
  const seen = new Set<string>();
  const out: PilotRelationshipSpec[] = [];
  for (const r of rels) {
    const key = `${r.subjectSlug}|${r.predicate}|${r.objectSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

const DEDUPED_RELATIONSHIPS = dedupeRelationships(SURGICAL_APPROACHES_RELATIONSHIPS);

export function activeSurgicalApproachesRelationships(): PilotRelationshipSpec[] {
  return DEDUPED_RELATIONSHIPS.filter((r) => !r.metadata?.disabled);
}

// Re-export deduped as the canonical list for consumers that import the array name
export { DEDUPED_RELATIONSHIPS as SURGICAL_APPROACHES_RELATIONSHIPS_ACTIVE };

const claim = (
  draftId: string,
  claimType: PilotClaimDraft["claimType"],
  claimText: string,
  primaryEntitySlug: string,
  importanceLevel: PilotClaimDraft["importanceLevel"] = "L1",
  contextRelevance: string[] = ["or", "call", "oite"]
): PilotClaimDraft => ({
  draftId,
  claimType,
  claimText,
  primaryEntitySlug,
  importanceLevel,
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote: "Surgical Approaches manufacture; approach-selection claims require human review",
  contextRelevance,
});

export const SURGICAL_APPROACHES_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-sa-backbone", "fact", "Surgical approaches form a reusable operative exposure backbone that links positioning, landmarks, intervals, protection, extensile options, bailout, and closure across specialties.", "surgical-approaches"),
  claim("claim-sa-select", "fact", "Approach selection is driven by the required target, soft-tissue condition, prior incisions, imaging needs, and defined extensile or bailout pathways—not implant brand preference.", "approach-selection-principles"),
  claim("claim-sa-position", "fact", "Positioning must permit the planned exposure, fluoroscopy, anesthesia access, and a safe extensile or bailout option before prep and drape.", "patient-positioning-principles"),
  claim("claim-sa-carm", "fact", "C-arm trajectory, sterile entry path, and monitor position should be verified before incision so imaging is not obstructed by drapes or equipment.", "c-arm-positioning-principles"),
  claim("claim-sa-landmarks", "fact", "Surface landmarks define incision placement and must be confirmed after positioning because landmarks shift with limb rotation and traction.", "surface-landmark-principles"),
  claim("claim-sa-incision", "fact", "Skin incision planning accounts for prior scars, extensile continuity, soft-tissue envelopes, and anticipated implant or reduction needs.", "skin-incision-planning"),
  claim("claim-sa-internervous", "fact", "Internervous planes reduce denervation risk and should be recorded as reusable anatomy objects independent of any single named approach.", "internervous-plane-principles"),
  claim("claim-sa-intermuscular", "fact", "Intermuscular planes define standard intervals and must be distinguished from improvised muscle-splitting paths.", "intermuscular-plane-principles"),
  claim("claim-sa-deep", "fact", "Deep intervals complete exposure after the superficial plane and often determine whether the target is safely reached.", "deep-interval-principles"),
  claim("claim-sa-limits", "fact", "Every named approach has exposure limits; exceeding them without a defined extensile pathway increases neurovascular and soft-tissue risk.", "exposure-limit-principles"),
  claim("claim-sa-protect", "fact", "Structures requiring protection are identified before incision and rechecked during retraction, instrumentation, and closure.", "structures-requiring-protection"),
  claim("claim-sa-nv", "red_flag", "Neurovascular structures at risk are approach-defining safety objects; loss of identification is a stop signal.", "neurovascular-structures-at-risk"),
  claim("claim-sa-extensile", "fact", "Extensile options are planned independently of the standard exposure so extension follows a defined pathway rather than ad hoc dissection.", "extensile-exposure-principles"),
  claim("claim-sa-bailout", "fact", "Bailout strategies—alternate windows, staged exposure, or change of approach—are selected before incision when risk is high.", "bailout-strategy-principles"),
  claim("claim-sa-closure", "fact", "Closure restores released layers without entrapping protected structures and accounts for swelling, drains, and postoperative restrictions.", "closure-principles"),
  claim("claim-sa-postop", "fact", "Postoperative approach considerations include wound surveillance, motion or weight-bearing limits linked to the exposure, and approach-specific complication watch-outs.", "postoperative-approach-considerations"),
  claim("claim-sa-revision", "fact", "Revision exposure reuses prior incisions when safe, but may require alternate windows when soft-tissue or neurovascular risk is elevated.", "revision-exposure-principles"),
  claim("claim-sa-escalation", "clinical_script", "If exposure is inadequate, escalate along defined extensile or bailout pathways rather than forcing the original window.", "exposure-escalation-strategies"),
  claim("claim-sa-safezone", "fact", "Safe zones constrain implant and instrument trajectories relative to known neurovascular anatomy and should be treated as first-class operative objects.", "safe-zone-principles"),
  claim("claim-sa-complications", "fact", "Approach-specific complications are linked to the exposure pathway and inform selection, counseling, and intraoperative protection priorities.", "approach-specific-complication-principles"),
  claim("claim-sa-deltopectoral", "operative_pearl", "The deltopectoral approach uses the deltopectoral interval and prioritizes axillary nerve and cephalic vein protection.", "deltopectoral-approach"),
  claim("claim-sa-henry", "operative_pearl", "The volar Henry approach follows the Henry interval with continuous protection of the radial artery and median nerve territories.", "volar-henry-approach"),
  claim("claim-sa-kl", "operative_pearl", "Kocher-Langenbeck exposure prioritizes sciatic nerve protection and medial femoral circumflex preservation for femoral head blood supply.", "kocher-langenbeck-approach"),
  claim("claim-sa-daa", "operative_pearl", "Direct anterior hip exposure uses the Smith-Petersen interval and requires attention to the lateral femoral cutaneous nerve and proximal femoral anatomy.", "direct-anterior-hip-approach"),
  claim("claim-sa-mpp", "operative_pearl", "The medial parapatellar approach provides extensile knee exposure while protecting the extensor mechanism and planning for staged extension if needed.", "medial-parapatellar-approach"),
  claim("claim-sa-spine-post", "red_flag", "Posterior spine approaches require continuous orientation to the cord and nerve roots; unintended durotomy or neural injury is a stop-and-repair event.", "posterior-lumbar-approach"),
  claim("claim-sa-xlif", "fact", "Lateral lumbar approaches traverse the psoas corridor and require neuromonitoring attention to plexus risk.", "xlif-approach"),
  claim("claim-sa-position-dup", "cognitive_trap", "Positioning objects are shared; do not mint approach-specific duplicate positioning identities for the same standard position.", "patient-positioning-principles"),
];

const decision = (
  draftId: string,
  subjectEntitySlug: string,
  patternType: string,
  trigger: string,
  action: string,
  urgency: PilotDecisionPointDraft["urgency"] = "routine",
  safetyCriticality: PilotDecisionPointDraft["safetyCriticality"] = "high"
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
  sourceNote: "Surgical Approaches manufacture; approach-selection and at-risk anatomy decisions require attending review",
  requiresAttendingReview: true,
});

export const SURGICAL_APPROACHES_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  decision("dp-sa-select", "approach-selection-principles", "approach_selection", "Procedure requires operative exposure and multiple approaches are plausible", "Select the approach whose safe window reaches the target while accounting for soft tissue, prior incisions, imaging, and extensile/bailout needs", "routine", "high"),
  decision("dp-sa-position", "patient-positioning-principles", "positioning_safety", "Positioning does not permit safe imaging, anesthesia access, or bailout exposure", "Reposition and verify all required access before preparation and incision", "urgent", "high"),
  decision("dp-sa-carm", "c-arm-positioning-principles", "imaging_access", "Required fluoroscopic views cannot be obtained after positioning", "Adjust table, C-arm, or patient position before prep rather than accepting inadequate imaging", "urgent", "moderate"),
  decision("dp-sa-landmark", "surface-landmark-principles", "incision_planning", "Surface landmarks are distorted by swelling, deformity, or obesity", "Confirm landmarks with imaging and extensile incision planning before committing the skin cut", "routine", "moderate"),
  decision("dp-sa-nv", "neurovascular-structures-at-risk", "operative_safety", "A protected neurovascular structure cannot be identified or safely mobilized", "Stop blind progression, restore landmarks, extend along a defined pathway, or change approach", "urgent", "emergency"),
  decision("dp-sa-interval", "internervous-plane-principles", "plane_identification", "The planned internervous or intermuscular interval is not clearly identified", "Re-establish landmarks and interval identity before deep dissection", "urgent", "high"),
  decision("dp-sa-limits", "exposure-limit-principles", "exposure_adequacy", "Target anatomy cannot be reached within the approach exposure limits", "Invoke the predefined extensile option or bailout strategy rather than improvising", "urgent", "high"),
  decision("dp-sa-extensile", "extensile-exposure-principles", "exposure_escalation", "Additional exposure is required beyond the standard window", "Extend only along the defined extensile pathway while rechecking protected structures", "urgent", "high"),
  decision("dp-sa-bailout", "bailout-strategy-principles", "bailout", "The planned approach is unsafe or inadequate despite defined extension", "Execute the preplanned bailout: alternate window, staged exposure, or change of approach", "urgent", "emergency"),
  decision("dp-sa-revision", "revision-exposure-principles", "revision_exposure", "Prior incisions, implants, or scarring alter standard intervals", "Choose re-entry versus alternate window with attending-level plan for neurovascular protection", "routine", "high"),
  decision("dp-sa-closure", "closure-principles", "closure_safety", "Swelling, tissue viability, or tension makes layered primary closure unsafe", "Use defined bailout soft-tissue strategy and postoperative protection plan", "urgent", "high"),
  decision("dp-sa-deltopectoral", "deltopectoral-approach", "approach_selection", "Anterior shoulder or proximal humerus exposure is required", "Use deltopectoral interval with axillary nerve protection and planned extensile option", "routine", "high"),
  decision("dp-sa-kl", "kocher-langenbeck-approach", "approach_selection", "Posterior acetabular column or wall exposure is required", "Use KL pathway with sciatic protection and MFCA-aware dissection; escalate if visualization is inadequate", "routine", "high"),
  decision("dp-sa-daa", "direct-anterior-hip-approach", "approach_selection", "Anterior hip arthroplasty or anterior hip exposure is planned", "Confirm table/positioning strategy and LFCN/femoral nerve protection before incision", "routine", "high"),
  decision("dp-sa-spine", "posterior-lumbar-approach", "operative_safety", "Neural elements are not clearly visualized or protected during lumbar exposure", "Stop, reorient, improve exposure, and protect cord/roots before continuing instrumentation", "urgent", "emergency"),
  decision("dp-sa-post-knee", "posterior-knee-approach", "operative_safety", "Popliteal neurovascular structures are not controlled during posterior knee exposure", "Stop deep progression until popliteal vessels and nerves are identified and protected", "urgent", "emergency"),
];
