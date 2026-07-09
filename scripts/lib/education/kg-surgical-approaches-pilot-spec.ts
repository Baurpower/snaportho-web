/**
 * Surgical Approaches canonical knowledge neighborhood.
 *
 * Pure data consumed by the existing Knowledge Factory. All clinical content
 * remains generated draft material until it passes the factory review gates.
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

type Approach = { slug: string; label: string; region: string };
const region = (slug: string, label: string, approaches: Array<[string, string]>) =>
  approaches.map(([approachSlug, approachLabel]) => ({ slug: approachSlug, label: approachLabel, region: slug }))
    .concat([] as Approach[]);

const APPROACHES: Approach[] = [
  ...region("shoulder", "Shoulder", [["deltopectoral-approach", "Deltopectoral Approach"], ["anterosuperior-shoulder-approach", "Anterosuperior Shoulder Approach"], ["superior-shoulder-approach", "Superior Shoulder Approach"], ["posterior-shoulder-approach", "Posterior Shoulder Approach"]]),
  ...region("humerus-elbow", "Humerus and Elbow", [["anterior-humerus-approach", "Anterior Humerus Approach"], ["anterolateral-humerus-approach", "Anterolateral Humerus Approach"], ["posterior-humerus-approach", "Posterior Humerus Approach"], ["kocher-approach", "Kocher Approach"], ["kaplan-approach", "Kaplan Approach"], ["bryan-morrey-approach", "Bryan-Morrey Approach"], ["olecranon-osteotomy-approach", "Olecranon Osteotomy Approach"]]),
  ...region("forearm-wrist", "Forearm and Wrist", [["volar-henry-approach", "Volar Henry Approach"], ["dorsal-wrist-approach", "Dorsal Wrist Approach"], ["extended-fcr-approach", "Extended FCR Approach"], ["dorsal-spanning-approach", "Dorsal Spanning Approach"], ["radius-approach", "Radius Approach"], ["ulna-approach", "Ulna Approach"]]),
  ...region("hand", "Hand", [["carpal-tunnel-approach", "Carpal Tunnel Approach"], ["trigger-finger-approach", "Trigger Finger Approach"], ["thumb-ucl-approach", "Thumb UCL Approach"], ["finger-approach", "Finger Approach"]]),
  ...region("pelvis-acetabulum", "Pelvis and Acetabulum", [["pfannenstiel-approach", "Pfannenstiel Approach"], ["stoppa-approach", "Stoppa Approach"], ["ilioinguinal-approach", "Ilioinguinal Approach"], ["kocher-langenbeck-approach", "Kocher-Langenbeck Approach"], ["smith-petersen-approach", "Smith-Petersen Approach"]]),
  ...region("hip", "Hip", [["posterior-hip-approach", "Posterior Hip Approach"], ["direct-anterior-hip-approach", "Direct Anterior Hip Approach"], ["direct-lateral-hip-approach", "Direct Lateral Hip Approach"], ["anterolateral-hip-approach", "Anterolateral Hip Approach"], ["surgical-hip-dislocation-approach", "Surgical Hip Dislocation"]]),
  ...region("femur-knee", "Femur and Knee", [["lateral-femur-approach", "Lateral Femur Approach"], ["distal-femur-approach", "Distal Femur Approach"], ["medial-parapatellar-approach", "Medial Parapatellar Approach"], ["subvastus-approach", "Subvastus Approach"], ["midvastus-approach", "Midvastus Approach"], ["posterior-knee-approach", "Posterior Knee Approach"]]),
  ...region("tibia-ankle", "Tibia and Ankle", [["anteromedial-tibia-approach", "Anteromedial Tibia Approach"], ["anterolateral-tibia-approach", "Anterolateral Tibia Approach"], ["posterolateral-tibia-approach", "Posterolateral Tibia Approach"], ["posteromedial-tibia-approach", "Posteromedial Tibia Approach"], ["anterior-ankle-approach", "Anterior Ankle Approach"], ["lateral-ankle-approach", "Lateral Ankle Approach"], ["posterior-ankle-approach", "Posterior Ankle Approach"]]),
  ...region("foot", "Foot", [["dorsal-foot-approach", "Dorsal Foot Approach"], ["medial-foot-approach", "Medial Foot Approach"], ["lateral-foot-approach", "Lateral Foot Approach"], ["plantar-foot-approach", "Plantar Foot Approach"]]),
  ...region("spine", "Spine", [["posterior-cervical-approach", "Posterior Cervical Approach"], ["acdf-approach", "Anterior Cervical Discectomy and Fusion Approach"], ["posterior-thoracic-approach", "Posterior Thoracic Approach"], ["posterior-lumbar-approach", "Posterior Lumbar Approach"], ["tlif-approach", "Transforaminal Lumbar Interbody Fusion Approach"], ["alif-approach", "Anterior Lumbar Interbody Fusion Approach"], ["xlif-approach", "Lateral Lumbar Interbody Fusion Approach"]]),
];

const REGIONS = [...new Map(APPROACHES.map((a) => [a.region, a.region])).keys()];
const COMPONENTS = [
  "indications", "contraindications", "surface-landmarks", "skin-incision-landmarks",
  "superficial-interval", "deep-interval", "internervous-plane", "intermuscular-plane",
  "muscles-encountered", "structures-requiring-release", "structures-requiring-protection",
  "neurovascular-structures-at-risk", "exposure-limits", "extensile-options",
  "bailout-options", "closure-layers", "postoperative-restrictions",
] as const;
const PRINCIPLES = [
  "patient-positioning", "room-setup-principles", "fluoroscopy-positioning",
  "c-arm-strategies", "prep-and-drape-regions", "tourniquet-principles",
  "extensile-exposure-principles", "surgical-windows", "safe-dissection-zones",
  "closure-principles",
] as const;

const title = (slug: string) => slug.split("-").map((w) => w.toUpperCase() === "Fcr" ? "FCR" : w[0].toUpperCase() + w.slice(1)).join(" ");
const entity = (slug: string, entityType: string, preferredLabel: string, description: string, metadata = {}): PilotEntitySpec => ({
  slug, entityType, preferredLabel, description,
  metadata: { pilot: SURGICAL_APPROACHES_PILOT_KEY, neighborhood: "surgical-approaches", ...metadata },
});

export const SURGICAL_APPROACHES_ENTITIES: PilotEntitySpec[] = [
  entity("operative-anatomy-backbone", "anatomy_structure", "Operative Anatomy Backbone", "Parent anatomy hub for reusable orthopaedic operative exposures.", { anatomy_kind: "composite", hierarchy_level: "system", region: "whole-body" }),
  entity("surgical-approaches", "anatomy_structure", "Surgical Approaches", "Reusable operative anatomy, exposure, positioning, safety, and closure backbone for orthopaedic surgery.", { clinical_kind: "operative_backbone", maturity_target: 7, anatomy_kind: "composite", hierarchy_level: "neighborhood", region: "whole-body" }),
  ...REGIONS.map((r) => entity(`approach-region-${r}`, "anatomy_structure", title(r), `Regional hub for ${title(r).toLowerCase()} surgical approaches.`, { region: r })),
  ...PRINCIPLES.map((p) => entity(`operative-${p}`, "treatment_principle", title(p), `General operative principle for ${title(p).toLowerCase()}.`)),
  ...COMPONENTS.map((c) => entity(`approach-component-${c}`, "treatment_principle", title(c), `Canonical surgical-approach component describing ${title(c).toLowerCase()}.`)),
  ...APPROACHES.map((a) => entity(a.slug, "surgical_approach", a.label, `Operative exposure in the ${title(a.region).toLowerCase()} region.`, { region: a.region, clinical_kind: "surgical_approach", component_schema: [...COMPONENTS] })),
];

const rel = (subjectSlug: string, predicate: string, objectSlug: string, metadata = {}): PilotRelationshipSpec => ({
  subjectSlug, predicate, objectSlug,
  metadata: { relevance_reason: "operative_planning", context_relevance: ["or", "call", "oite"], ...metadata },
});
export const SURGICAL_APPROACHES_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("surgical-approaches", "part_of", "operative-anatomy-backbone"),
  ...REGIONS.map((r) => rel(`approach-region-${r}`, "part_of", "surgical-approaches")),
  ...PRINCIPLES.map((p) => rel(`operative-${p}`, "prerequisite_for", "surgical-approaches")),
  ...COMPONENTS.map((c) => rel(`approach-component-${c}`, "prerequisite_for", "surgical-approaches")),
  ...APPROACHES.flatMap((a) => [
    rel(`approach-region-${a.region}`, "prerequisite_for", a.slug, { anatomy_role: "essential" }),
    rel(a.slug, "prerequisite_for", "surgical-approaches"),
    ...COMPONENTS.map((c) => rel(`approach-component-${c}`, "prerequisite_for", a.slug)),
  ]),
];
export const activeSurgicalApproachesRelationships = () => SURGICAL_APPROACHES_RELATIONSHIPS;

const claim = (id: string, text: string, slug: string, type = "fact"): PilotClaimDraft => ({
  draftId: id, claimType: type, claimText: text, primaryEntitySlug: slug,
  importanceLevel: "L1", contentSource: "generated_draft", reviewStatus: "needs_review",
  sourceNote: "Surgical Approaches manufacture scope; evidence packet required",
  contextRelevance: ["or", "call", "oite"],
});
export const SURGICAL_APPROACHES_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-sa-plan", "Approach selection begins with the required exposure, patient factors, prior incisions, soft-tissue condition, and structures at risk.", "surgical-approaches"),
  claim("claim-sa-position", "Positioning must permit the planned exposure, imaging, anesthesia access, and a safe extensile or bailout option.", "operative-patient-positioning"),
  claim("claim-sa-fluoro", "Fluoroscopic views should be reproducibly obtainable before preparation and draping obscure repositioning landmarks.", "operative-fluoroscopy-positioning"),
  claim("claim-sa-carm", "The C-arm trajectory, sterile entry path, monitor position, and personnel movement should be planned before incision.", "operative-c-arm-strategies"),
  claim("claim-sa-tourniquet", "Tourniquet use requires an explicit indication, safe placement, pressure strategy, and time awareness.", "operative-tourniquet-principles"),
  claim("claim-sa-interval", "A named approach is defined by its surface landmarks, incision, superficial and deep intervals, exposure limits, and at-risk structures.", "surgical-approaches"),
  claim("claim-sa-nv", "Neurovascular structures at risk are identified before incision and protected throughout retraction, instrumentation, and closure.", "approach-component-neurovascular-structures-at-risk"),
  claim("claim-sa-extensile", "Extending an exposure should follow the approach's defined extensile pathway rather than an improvised dissection.", "operative-extensile-exposure-principles"),
  claim("claim-sa-windows", "Separate surgical windows preserve intervening soft-tissue and neurovascular structures and should not be connected blindly.", "operative-surgical-windows"),
  claim("claim-sa-closure", "Closure restores released layers without entrapping protected structures and accounts for swelling, drains, and postoperative restrictions.", "operative-closure-principles"),
  ...APPROACHES.map((a) => claim(`claim-sa-${a.slug}`, `${a.label} operative planning requires explicit documentation of indication, landmarks, intervals, structures at risk, exposure limits, extensile options, closure, and postoperative restrictions.`, a.slug, "clinical_script")),
];

const decision = (id: string, slug: string, trigger: string, action: string, urgency: PilotDecisionPointDraft["urgency"] = "routine", criticality: PilotDecisionPointDraft["safetyCriticality"] = "high"): PilotDecisionPointDraft => ({
  draftId: id, subjectEntitySlug: slug, patternType: "operative_safety",
  trigger, action, urgency, safetyCriticality: criticality, contentSource: "generated_draft",
  reviewStatus: "needs_review", sourceNote: "Surgical Approaches manufacture scope; evidence packet required",
  requiresAttendingReview: true,
});
export const SURGICAL_APPROACHES_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  decision("dp-sa-select", "surgical-approaches", "The planned procedure requires operative exposure", "Select the approach whose safe window reaches the target while accounting for patient, injury, imaging, and extensile needs."),
  decision("dp-sa-position", "operative-patient-positioning", "Positioning does not permit safe imaging, anesthesia access, or bailout exposure", "Reposition and verify all required access before preparation and incision.", "urgent"),
  decision("dp-sa-nerve", "approach-component-neurovascular-structures-at-risk", "A protected neurovascular structure cannot be identified or safely mobilized", "Stop blind progression, restore landmarks, extend the exposure safely, or change the approach.", "urgent", "emergency"),
  decision("dp-sa-window", "operative-surgical-windows", "Exposure is inadequate through the planned window", "Use the defined extensile option or a separate safe window while preserving intervening structures.", "urgent"),
  decision("dp-sa-closure", "operative-closure-principles", "Swelling, tissue viability, or tension makes primary closure unsafe", "Use the defined bailout closure strategy and postoperative soft-tissue plan.", "urgent"),
];
