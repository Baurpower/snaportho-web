/**
 * Adult Reconstruction cluster topic catalog — manufacturing seeds for 20 neighborhoods.
 */

import type { PilotClaimDraft, PilotDecisionPointDraft, PilotEntitySpec } from "./kg-ankle-pilot-spec.ts";

export type ReconTopicCatalogEntry = {
  topicKey: string;
  displayName: string;
  primaryEntitySlug: string;
  curriculumNodeSlug: string;
  prepareTopicId: string;
  casePrepSlug?: string;
  clusterGroup: "hip" | "knee" | "principles";
  anki: number;
  ob: number;
  maturityTarget: number;
  oneLiner: string;
  specificEntities: PilotEntitySpec[];
  extraRelationships: Array<{
    subjectSlug: string;
    predicate: string;
    objectSlug: string;
    metadata?: Record<string, unknown>;
  }>;
  claims: PilotClaimDraft[];
  decisionPoints: PilotDecisionPointDraft[];
};

function condition(slug: string, label: string, pilotKey: string, desc: string): PilotEntitySpec {
  return {
    slug,
    entityType: "condition",
    preferredLabel: label,
    description: desc,
    metadata: { clinical_kind: "arthroplasty", pilot: pilotKey, maturity_target: 6 },
  };
}

function classification(slug: string, label: string, pilotKey: string, desc: string): PilotEntitySpec {
  return { slug, entityType: "classification_system", preferredLabel: label, description: desc, metadata: { pilot: pilotKey } };
}

function procedure(slug: string, label: string, pilotKey: string, desc: string): PilotEntitySpec {
  return { slug, entityType: "procedure", preferredLabel: label, description: desc, metadata: { pilot: pilotKey } };
}

function complication(slug: string, label: string, pilotKey: string, desc: string): PilotEntitySpec {
  return { slug, entityType: "complication", preferredLabel: label, description: desc, metadata: { pilot: pilotKey } };
}

function imaging(slug: string, label: string, pilotKey: string, desc: string): PilotEntitySpec {
  return { slug, entityType: "imaging_finding", preferredLabel: label, description: desc, metadata: { pilot: pilotKey } };
}

function concept(slug: string, label: string, pilotKey: string, desc: string): PilotEntitySpec {
  return { slug, entityType: "biomechanics_concept", preferredLabel: label, description: desc, metadata: { pilot: pilotKey } };
}

function baseClaims(topicKey: string, primarySlug: string, oneLiner: string): PilotClaimDraft[] {
  return [
    {
      draftId: `claim-${topicKey}-core`,
      claimType: "fact",
      claimText: oneLiner,
      primaryEntitySlug: primarySlug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "curriculum-data.ts + adult-reconstruction cluster seed",
      contextRelevance: ["clinic", "call"],
    },
    {
      draftId: `claim-${topicKey}-board-trap`,
      claimType: "board_trap",
      claimText: `Board trap: oversimplifying ${topicKey.replace(/-/g, " ")} without attending-level implant, fixation, or infection context.`,
      primaryEntitySlug: primarySlug,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "adult-reconstruction cluster manufacturing seed",
      contextRelevance: ["oite"],
    },
    {
      draftId: `claim-${topicKey}-pearl`,
      claimType: "anatomy_pearl",
      claimText: `Attending pearl: connect ${topicKey.replace(/-/g, " ")} anatomy, implant interfaces, and shared trauma neighborhoods before operative planning.`,
      primaryEntitySlug: primarySlug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "adult-reconstruction cluster manufacturing seed",
      contextRelevance: ["or", "clinic"],
    },
    {
      draftId: `claim-${topicKey}-script`,
      claimType: "clinical_script",
      claimText: `Present indication, relevant imaging, implant/fixation concepts, and escalation pathway for ${topicKey.replace(/-/g, " ")}.`,
      primaryEntitySlug: primarySlug,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "adult-reconstruction cluster manufacturing seed",
      contextRelevance: ["call", "clinic"],
    },
  ];
}

function baseDecisionPoints(topicKey: string, primarySlug: string, trigger: string, action: string): PilotDecisionPointDraft[] {
  return [
    {
      draftId: `dp-${topicKey}-operative`,
      subjectEntitySlug: primarySlug,
      patternType: "operative_indication",
      trigger,
      action,
      urgency: "routine",
      safetyCriticality: "moderate",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: "adult-reconstruction cluster manufacturing seed",
      requiresAttendingReview: true,
    },
  ];
}

function pilotKey(topicKey: string): string {
  return `${topicKey}-neighborhood`;
}

export const ADULT_RECONSTRUCTION_TOPIC_CATALOG: ReconTopicCatalogEntry[] = [
  {
    topicKey: "hip-osteoarthritis",
    displayName: "Hip Osteoarthritis",
    primaryEntitySlug: "hip-osteoarthritis",
    curriculumNodeSlug: "adult-recon-hip-osteoarthritis",
    prepareTopicId: "hip-osteoarthritis",
    clusterGroup: "hip",
    anki: 18,
    ob: 72,
    maturityTarget: 7,
    oneLiner: "Hip OA is a clinical-plus-radiographic diagnosis where loss of function matters as much as imaging.",
    specificEntities: [
      condition("hip-osteoarthritis", "Hip Osteoarthritis", pilotKey("hip-osteoarthritis"), "Degenerative hip disease with groin pain and limited internal rotation."),
      imaging("joint-space-narrowing-hip", "Hip Joint Space Narrowing", pilotKey("hip-osteoarthritis"), "Radiographic osteoarthritic change with superior joint space loss."),
      classification("kellgren-lawrence-hip", "Kellgren-Lawrence Hip OA", pilotKey("hip-osteoarthritis"), "Descriptive radiographic osteoarthritis severity framework."),
      concept("hip-abductor-mechanics", "Hip Abductor Mechanics", pilotKey("hip-osteoarthritis"), "Gluteus-mediated pelvic control relevant to THA candidacy and gait."),
      procedure("total-hip-arthroplasty", "Total Hip Arthroplasty", pilotKey("hip-osteoarthritis"), "Primary hip replacement restoring acetabular and femoral surfaces."),
      procedure("total-knee-arthroplasty", "Total Knee Arthroplasty", pilotKey("hip-osteoarthritis"), "Primary knee replacement restoring alignment and joint surfaces."),
      procedure("revision-arthroplasty", "Revision Arthroplasty", pilotKey("hip-osteoarthritis"), "Reoperation for failed or infected arthroplasty with component exchange."),
    ],
    extraRelationships: [
      { subjectSlug: "hip-osteoarthritis", predicate: "involves_anatomy", objectSlug: "acetabulum", metadata: { anatomy_role: "essential" } },
      { subjectSlug: "hip-osteoarthritis", predicate: "involves_anatomy", objectSlug: "femoral-head", metadata: { anatomy_role: "essential", cross_cluster: "hip-fracture-cluster-shared" } },
      { subjectSlug: "hip-osteoarthritis", predicate: "has_imaging_finding", objectSlug: "joint-space-narrowing-hip" },
      { subjectSlug: "femoral-neck-fracture", predicate: "prerequisite_for", objectSlug: "hip-osteoarthritis", metadata: { cross_neighborhood: "trauma", relevance_reason: "arthroplasty_pathway" } },
      { subjectSlug: "intertrochanteric-fracture", predicate: "prerequisite_for", objectSlug: "hip-osteoarthritis", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "subtrochanteric-fracture", predicate: "prerequisite_for", objectSlug: "hip-osteoarthritis", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "hip-osteoarthritis", predicate: "indicates_treatment", objectSlug: "total-hip-arthroplasty", metadata: { management_importance: "high", review_status: "needs_review" } },
    ],
    claims: baseClaims("hip-osteoarthritis", "hip-osteoarthritis", "Hip OA is a clinical-plus-radiographic diagnosis where loss of function matters as much as imaging."),
    decisionPoints: baseDecisionPoints("hip-osteoarthritis", "hip-osteoarthritis", "End-stage hip OA with failed conservative care and acceptable surgical risk", "Discuss primary THA candidacy with attending; review acetabular bone and abductor status"),
  },
  {
    topicKey: "femoral-neck-fracture-adult-recon",
    displayName: "Femoral Neck Fracture (Adult Recon Perspective)",
    primaryEntitySlug: "femoral-neck-fracture-adult-recon",
    curriculumNodeSlug: "adult-recon-femoral-neck-fracture",
    prepareTopicId: "femoral-neck-fracture",
    clusterGroup: "hip",
    anki: 9,
    ob: 64,
    maturityTarget: 7,
    oneLiner: "From an adult reconstruction lens, femoral neck fracture management centers on head viability versus arthroplasty pathway selection.",
    specificEntities: [
      condition("femoral-neck-fracture-adult-recon", "Femoral Neck Fracture (Adult Recon)", pilotKey("femoral-neck-fracture-adult-recon"), "Intracapsular neck fracture evaluated for fixation versus hemi/THA from reconstruction perspective."),
      procedure("total-hip-arthroplasty", "Total Hip Arthroplasty", pilotKey("femoral-neck-fracture-adult-recon"), "Full hip replacement option for displaced neck fractures in select patients."),
      procedure("hip-hemiarthroplasty", "Hip Hemiarthroplasty", pilotKey("femoral-neck-fracture-adult-recon"), "Partial hip replacement for displaced femoral neck fractures in older adults."),
      imaging("displaced-femoral-neck-fracture", "Displaced Femoral Neck Fracture", pilotKey("femoral-neck-fracture-adult-recon"), "Displacement pattern shifting management toward arthroplasty."),
    ],
    extraRelationships: [
      { subjectSlug: "femoral-neck-fracture", predicate: "prerequisite_for", objectSlug: "femoral-neck-fracture-adult-recon", metadata: { cross_neighborhood: "trauma", relationship_strength: "core" } },
      { subjectSlug: "femoral-neck-fracture-adult-recon", predicate: "involves_anatomy", objectSlug: "femoral-neck", metadata: { cross_cluster: "hip-fracture-cluster-shared" } },
      { subjectSlug: "femoral-neck-fracture-adult-recon", predicate: "indicates_treatment", objectSlug: "hip-hemiarthroplasty", metadata: { management_importance: "high", review_status: "needs_review" } },
      { subjectSlug: "femoral-neck-fracture-adult-recon", predicate: "indicates_treatment", objectSlug: "total-hip-arthroplasty", metadata: { management_importance: "high", review_status: "needs_review" } },
      { subjectSlug: "displaced-femoral-neck-fracture", predicate: "indicates_treatment", objectSlug: "hip-hemiarthroplasty", metadata: { management_importance: "high" } },
    ],
    claims: baseClaims("femoral-neck-fracture-adult-recon", "femoral-neck-fracture-adult-recon", "Displaced femoral neck fractures in older adults are often arthroplasty problems rather than screw fixation problems."),
    decisionPoints: baseDecisionPoints("femoral-neck-fracture-adult-recon", "femoral-neck-fracture-adult-recon", "Displaced femoral neck fracture in older adult with low healing potential", "Discuss hemiarthroplasty versus THA with attending; document optimization and DVT prophylaxis"),
  },
  {
    topicKey: "periprosthetic-femur-fracture",
    displayName: "Periprosthetic Femur Fracture",
    primaryEntitySlug: "periprosthetic-femur-fracture",
    curriculumNodeSlug: "adult-recon-periprosthetic-femur-fracture",
    prepareTopicId: "periprosthetic-fracture",
    clusterGroup: "hip",
    anki: 6,
    ob: 28,
    maturityTarget: 7,
    oneLiner: "Periprosthetic femur fractures require Vancouver-style thinking about implant stability and fracture location.",
    specificEntities: [
      condition("periprosthetic-femur-fracture", "Periprosthetic Femur Fracture", pilotKey("periprosthetic-femur-fracture"), "Femur fracture adjacent to THA stem with implant stability implications."),
      classification("vancouver-classification", "Vancouver Classification", pilotKey("periprosthetic-femur-fracture"), "Periprosthetic femur fracture classification by location and stem stability."),
      complication("stem-loosening", "Femoral Stem Loosening", pilotKey("periprosthetic-femur-fracture"), "Unstable stem requiring revision in select Vancouver patterns."),
    ],
    extraRelationships: [
      { subjectSlug: "femoral-shaft-fracture", predicate: "prerequisite_for", objectSlug: "periprosthetic-femur-fracture", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "femoral-stem", predicate: "prerequisite_for", objectSlug: "periprosthetic-femur-fracture" },
      { subjectSlug: "periprosthetic-femur-fracture", predicate: "involves_anatomy", objectSlug: "femoral-diaphysis", metadata: { cross_cluster: "lower-extremity-trauma-cluster-shared" } },
      { subjectSlug: "periprosthetic-femur-fracture", predicate: "has_classification", objectSlug: "vancouver-classification" },
      { subjectSlug: "total-hip-arthroplasty", predicate: "prerequisite_for", objectSlug: "periprosthetic-femur-fracture" },
    ],
    claims: baseClaims("periprosthetic-femur-fracture", "periprosthetic-femur-fracture", "Periprosthetic femur fracture management hinges on Vancouver pattern and stem stability."),
    decisionPoints: baseDecisionPoints("periprosthetic-femur-fracture", "periprosthetic-femur-fracture", "Periprosthetic femur fracture with unstable THA stem", "Discuss stem revision versus ORIF with attending using Vancouver framework"),
  },
  {
    topicKey: "hip-prosthetic-joint-infection",
    displayName: "Hip Prosthetic Joint Infection",
    primaryEntitySlug: "hip-prosthetic-joint-infection",
    curriculumNodeSlug: "adult-recon-hip-pji",
    prepareTopicId: "periprosthetic-joint-infection",
    clusterGroup: "hip",
    anki: 8,
    ob: 42,
    maturityTarget: 7,
    oneLiner: "Hip PJI workup requires structured labs, aspiration, and timeline-based treatment planning.",
    specificEntities: [
      condition("hip-prosthetic-joint-infection", "Hip Prosthetic Joint Infection", pilotKey("hip-prosthetic-joint-infection"), "Infection involving THA components with biofilm and implant retention implications."),
      concept("biofilm-concept", "Biofilm Concept", pilotKey("hip-prosthetic-joint-infection"), "Bacterial biofilm limiting antibiotic penetration on implant surfaces."),
      procedure("hip-irrigation-debridement", "Hip Irrigation and Debridement", pilotKey("hip-prosthetic-joint-infection"), "Debridement with implant retention in select acute hip PJI."),
    ],
    extraRelationships: [
      { subjectSlug: "periprosthetic-joint-infection", predicate: "prerequisite_for", objectSlug: "hip-prosthetic-joint-infection", metadata: { relationship_strength: "core" } },
      { subjectSlug: "compartment-syndrome", predicate: "prerequisite_for", objectSlug: "hip-prosthetic-joint-infection", metadata: { cross_neighborhood: "trauma", relevance_reason: "limb_threat_differential" } },
      { subjectSlug: "acetabular-component", predicate: "prerequisite_for", objectSlug: "hip-prosthetic-joint-infection" },
      { subjectSlug: "femoral-stem", predicate: "prerequisite_for", objectSlug: "hip-prosthetic-joint-infection" },
      { subjectSlug: "hip-prosthetic-joint-infection", predicate: "treated_by", objectSlug: "hip-irrigation-debridement", metadata: { management_importance: "high", review_status: "needs_review" } },
    ],
    claims: baseClaims("hip-prosthetic-joint-infection", "hip-prosthetic-joint-infection", "Hip PJI is not cellulitis — aspiration and timeline drive implant retention versus revision."),
    decisionPoints: baseDecisionPoints("hip-prosthetic-joint-infection", "hip-prosthetic-joint-infection", "Acute postoperative hip drainage with elevated inflammatory markers", "Coordinate aspiration, cultures, and discuss I&D versus staged revision with attending"),
  },
  {
    topicKey: "aseptic-loosening-tha",
    displayName: "Aseptic Loosening of THA",
    primaryEntitySlug: "aseptic-loosening-tha",
    curriculumNodeSlug: "adult-recon-aseptic-loosening-tha",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "hip",
    anki: 5,
    ob: 22,
    maturityTarget: 7,
    oneLiner: "Aseptic THA loosening presents as progressive pain with radiographic lucency and component migration.",
    specificEntities: [
      condition("aseptic-loosening-tha", "Aseptic Loosening of THA", pilotKey("aseptic-loosening-tha"), "Mechanical failure of THA fixation without infection."),
      imaging("periprosthetic-radiolucency", "Periprosthetic Radiolucency", pilotKey("aseptic-loosening-tha"), "Progressive lucent lines at bone-implant interface."),
      complication("osteolysis", "Periprosthetic Osteolysis", pilotKey("aseptic-loosening-tha"), "Particle-induced bone loss around THA components."),
    ],
    extraRelationships: [
      { subjectSlug: "acetabular-component", predicate: "prerequisite_for", objectSlug: "aseptic-loosening-tha" },
      { subjectSlug: "femoral-stem", predicate: "prerequisite_for", objectSlug: "aseptic-loosening-tha" },
      { subjectSlug: "aseptic-loosening-tha", predicate: "has_imaging_finding", objectSlug: "periprosthetic-radiolucency" },
      { subjectSlug: "aseptic-loosening-tha", predicate: "has_complication", objectSlug: "osteolysis" },
      { subjectSlug: "revision-arthroplasty", predicate: "prerequisite_for", objectSlug: "aseptic-loosening-tha" },
    ],
    claims: baseClaims("aseptic-loosening-tha", "aseptic-loosening-tha", "Rule out infection before attributing painful THA to aseptic loosening."),
    decisionPoints: baseDecisionPoints("aseptic-loosening-tha", "aseptic-loosening-tha", "Painful THA with progressive lucency and excluded infection", "Discuss revision THA with attending including bone loss and fixation strategy"),
  },
  {
    topicKey: "hip-instability-after-tha",
    displayName: "Hip Instability After THA",
    primaryEntitySlug: "hip-instability-after-tha",
    curriculumNodeSlug: "adult-recon-hip-instability",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "hip",
    anki: 7,
    ob: 36,
    maturityTarget: 7,
    oneLiner: "Post-THA instability reflects component position, soft tissue tension, and patient factors.",
    specificEntities: [
      condition("hip-instability-after-tha", "Hip Instability After THA", pilotKey("hip-instability-after-tha"), "Recurrent THA dislocation from malposition, soft tissue, or bearing issues."),
      concept("hip-center-of-rotation", "Hip Center of Rotation", pilotKey("hip-instability-after-tha"), "Acetabular positioning determinant of THA stability and leg length."),
      imaging("malpositioned-acetabular-component", "Malpositioned Acetabular Component", pilotKey("hip-instability-after-tha"), "Cup position outside safe zone contributing to dislocation."),
    ],
    extraRelationships: [
      { subjectSlug: "hip-instability-after-tha", predicate: "involves_anatomy", objectSlug: "hip-capsule" },
      { subjectSlug: "hip-instability-after-tha", predicate: "involves_anatomy", objectSlug: "short-external-rotators" },
      { subjectSlug: "hip-instability-after-tha", predicate: "has_imaging_finding", objectSlug: "malpositioned-acetabular-component" },
      { subjectSlug: "total-hip-arthroplasty", predicate: "prerequisite_for", objectSlug: "hip-instability-after-tha" },
    ],
    claims: baseClaims("hip-instability-after-tha", "hip-instability-after-tha", "THA instability workup must assess component position, soft tissues, and infection."),
    decisionPoints: baseDecisionPoints("hip-instability-after-tha", "hip-instability-after-tha", "Recurrent THA dislocation after index procedure", "Review component position and discuss revision options with attending"),
  },
  {
    topicKey: "polyethylene-wear-osteolysis",
    displayName: "Polyethylene Wear and Osteolysis",
    primaryEntitySlug: "polyethylene-wear-osteolysis",
    curriculumNodeSlug: "adult-recon-polyethylene-wear",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "hip",
    anki: 4,
    ob: 18,
    maturityTarget: 7,
    oneLiner: "Polyethylene wear generates particulate debris driving periprosthetic osteolysis and loosening.",
    specificEntities: [
      condition("polyethylene-wear-osteolysis", "Polyethylene Wear and Osteolysis", pilotKey("polyethylene-wear-osteolysis"), "Bearing surface wear with particle-induced bone loss."),
      concept("particulate-debris", "Particulate Debris", pilotKey("polyethylene-wear-osteolysis"), "Wear particles activating macrophage-mediated osteolysis."),
      imaging("focal-osteolysis", "Focal Periprosthetic Osteolysis", pilotKey("polyethylene-wear-osteolysis"), "Localized bone loss adjacent to polyethylene bearing."),
    ],
    extraRelationships: [
      { subjectSlug: "polyethylene-liner", predicate: "prerequisite_for", objectSlug: "polyethylene-wear-osteolysis" },
      { subjectSlug: "polyethylene-wear-osteolysis", predicate: "has_imaging_finding", objectSlug: "focal-osteolysis" },
      { subjectSlug: "bearing-surface-selection", predicate: "prerequisite_for", objectSlug: "polyethylene-wear-osteolysis" },
      { subjectSlug: "revision-arthroplasty", predicate: "prerequisite_for", objectSlug: "polyethylene-wear-osteolysis" },
    ],
    claims: baseClaims("polyethylene-wear-osteolysis", "polyethylene-wear-osteolysis", "Polyethylene wear is a silent driver of late arthroplasty failure through osteolysis."),
    decisionPoints: baseDecisionPoints("polyethylene-wear-osteolysis", "polyethylene-wear-osteolysis", "Progressive osteolysis around polyethylene bearing", "Discuss liner exchange or revision with attending and assess bone loss"),
  },
  {
    topicKey: "adverse-local-tissue-reaction",
    displayName: "Adverse Local Tissue Reaction (Metal Reaction)",
    primaryEntitySlug: "adverse-local-tissue-reaction",
    curriculumNodeSlug: "adult-recon-altr",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "hip",
    anki: 3,
    ob: 14,
    maturityTarget: 7,
    oneLiner: "ALTR from metal-on-metal bearings presents with pain, elevated ions, and soft tissue pseudotumor risk.",
    specificEntities: [
      condition("adverse-local-tissue-reaction", "Adverse Local Tissue Reaction", pilotKey("adverse-local-tissue-reaction"), "Metal ion-driven local soft tissue destruction around MoM bearings."),
      imaging("pseudotumor-mom", "Pseudotumor (MoM)", pilotKey("adverse-local-tissue-reaction"), "MRI/MARS finding of periarticular soft tissue mass in metal reaction."),
      concept("metal-ion-elevation", "Metal Ion Elevation", pilotKey("adverse-local-tissue-reaction"), "Elevated cobalt/chromium suggesting bearing corrosion or trunnionosis."),
    ],
    extraRelationships: [
      { subjectSlug: "polyethylene-liner", predicate: "prerequisite_for", objectSlug: "adverse-local-tissue-reaction", metadata: { note: "cross-ref MoM bearing" } },
      { subjectSlug: "adverse-local-tissue-reaction", predicate: "has_imaging_finding", objectSlug: "pseudotumor-mom" },
      { subjectSlug: "bearing-surface-selection", predicate: "prerequisite_for", objectSlug: "adverse-local-tissue-reaction" },
      { subjectSlug: "revision-arthroplasty", predicate: "prerequisite_for", objectSlug: "adverse-local-tissue-reaction" },
    ],
    claims: baseClaims("adverse-local-tissue-reaction", "adverse-local-tissue-reaction", "ALTR requires metal ion workup and soft tissue assessment before revision planning."),
    decisionPoints: baseDecisionPoints("adverse-local-tissue-reaction", "adverse-local-tissue-reaction", "Painful MoM THA with elevated metal ions or pseudotumor", "Discuss revision to alternate bearing with attending and assess soft tissue destruction"),
  },
  {
    topicKey: "knee-osteoarthritis",
    displayName: "Knee Osteoarthritis",
    primaryEntitySlug: "knee-osteoarthritis",
    curriculumNodeSlug: "adult-recon-knee-osteoarthritis",
    prepareTopicId: "knee-osteoarthritis",
    clusterGroup: "knee",
    anki: 16,
    ob: 68,
    maturityTarget: 7,
    oneLiner: "Knee OA is compartmental wear that becomes a TKA problem when pain and function fail conservative treatment.",
    specificEntities: [
      condition("knee-osteoarthritis", "Knee Osteoarthritis", pilotKey("knee-osteoarthritis"), "Degenerative knee disease with compartment-specific wear and alignment deformity."),
      imaging("medial-compartment-narrowing", "Medial Compartment Narrowing", pilotKey("knee-osteoarthritis"), "Standing radiograph varus pattern with medial joint space loss."),
      concept("mechanical-axis-knee", "Knee Mechanical Axis", pilotKey("knee-osteoarthritis"), "Hip-knee-ankle alignment influencing unicompartmental versus TKA candidacy."),
    ],
    extraRelationships: [
      { subjectSlug: "knee-osteoarthritis", predicate: "involves_anatomy", objectSlug: "tibial-plateau", metadata: { cross_cluster: "lower-extremity-trauma-cluster-shared" } },
      { subjectSlug: "knee-osteoarthritis", predicate: "involves_anatomy", objectSlug: "femoral-condyles" },
      { subjectSlug: "knee-osteoarthritis", predicate: "has_imaging_finding", objectSlug: "medial-compartment-narrowing" },
      { subjectSlug: "knee-osteoarthritis", predicate: "indicates_treatment", objectSlug: "total-knee-arthroplasty", metadata: { management_importance: "high", review_status: "needs_review" } },
      { subjectSlug: "knee-osteoarthritis", predicate: "indicates_treatment", objectSlug: "unicompartmental-knee-arthroplasty", metadata: { management_importance: "moderate" } },
    ],
    claims: baseClaims("knee-osteoarthritis", "knee-osteoarthritis", "Standing films reveal knee OA severity that non-weight-bearing views may understate."),
    decisionPoints: baseDecisionPoints("knee-osteoarthritis", "knee-osteoarthritis", "Tricompartmental knee OA with failed conservative care", "Discuss primary TKA candidacy with attending including alignment and ROM"),
  },
  {
    topicKey: "periprosthetic-knee-fracture",
    displayName: "Periprosthetic Knee Fracture",
    primaryEntitySlug: "periprosthetic-knee-fracture",
    curriculumNodeSlug: "adult-recon-periprosthetic-knee-fracture",
    prepareTopicId: "periprosthetic-fracture",
    clusterGroup: "knee",
    anki: 5,
    ob: 16,
    maturityTarget: 7,
    oneLiner: "Periprosthetic knee fractures require Rorabeck/Su classification thinking about component stability.",
    specificEntities: [
      condition("periprosthetic-knee-fracture", "Periprosthetic Knee Fracture", pilotKey("periprosthetic-knee-fracture"), "Fracture adjacent to TKA components with extensor and stability concerns."),
      classification("rorabeck-classification", "Rorabeck Classification", pilotKey("periprosthetic-knee-fracture"), "Supracondylar periprosthetic knee fracture classification framework."),
    ],
    extraRelationships: [
      { subjectSlug: "distal-femur-fracture", predicate: "prerequisite_for", objectSlug: "periprosthetic-knee-fracture", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "tibial-shaft-fracture", predicate: "prerequisite_for", objectSlug: "periprosthetic-knee-fracture", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "femoral-component", predicate: "prerequisite_for", objectSlug: "periprosthetic-knee-fracture" },
      { subjectSlug: "tibial-baseplate", predicate: "prerequisite_for", objectSlug: "periprosthetic-knee-fracture" },
      { subjectSlug: "periprosthetic-knee-fracture", predicate: "has_classification", objectSlug: "rorabeck-classification" },
    ],
    claims: baseClaims("periprosthetic-knee-fracture", "periprosthetic-knee-fracture", "Periprosthetic knee fracture management depends on fracture location and implant stability."),
    decisionPoints: baseDecisionPoints("periprosthetic-knee-fracture", "periprosthetic-knee-fracture", "Periprosthetic knee fracture with unstable TKA components", "Discuss component revision versus ORIF with attending"),
  },
  {
    topicKey: "knee-prosthetic-joint-infection",
    displayName: "Knee Prosthetic Joint Infection",
    primaryEntitySlug: "knee-prosthetic-joint-infection",
    curriculumNodeSlug: "adult-recon-knee-pji",
    prepareTopicId: "periprosthetic-joint-infection",
    clusterGroup: "knee",
    anki: 8,
    ob: 42,
    maturityTarget: 7,
    oneLiner: "Knee PJI demands aspiration, culture data, and timeline-based implant retention versus revision planning.",
    specificEntities: [
      condition("knee-prosthetic-joint-infection", "Knee Prosthetic Joint Infection", pilotKey("knee-prosthetic-joint-infection"), "Infection involving TKA components with biofilm implications."),
      procedure("knee-irrigation-debridement", "Knee Irrigation and Debridement", pilotKey("knee-prosthetic-joint-infection"), "Debridement with polyethylene exchange in select acute knee PJI."),
    ],
    extraRelationships: [
      { subjectSlug: "periprosthetic-joint-infection", predicate: "prerequisite_for", objectSlug: "knee-prosthetic-joint-infection", metadata: { relationship_strength: "core" } },
      { subjectSlug: "compartment-syndrome", predicate: "prerequisite_for", objectSlug: "knee-prosthetic-joint-infection", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "tibial-baseplate", predicate: "prerequisite_for", objectSlug: "knee-prosthetic-joint-infection" },
      { subjectSlug: "knee-prosthetic-joint-infection", predicate: "treated_by", objectSlug: "knee-irrigation-debridement", metadata: { management_importance: "high", review_status: "needs_review" } },
    ],
    claims: baseClaims("knee-prosthetic-joint-infection", "knee-prosthetic-joint-infection", "Knee PJI workup parallels hip PJI but adds ROM and extensor integrity assessment."),
    decisionPoints: baseDecisionPoints("knee-prosthetic-joint-infection", "knee-prosthetic-joint-infection", "Acute postoperative knee wound drainage with elevated inflammatory markers", "Coordinate aspiration and discuss I&D with liner exchange versus staged revision"),
  },
  {
    topicKey: "aseptic-loosening-tka",
    displayName: "Aseptic Loosening of TKA",
    primaryEntitySlug: "aseptic-loosening-tka",
    curriculumNodeSlug: "adult-recon-aseptic-loosening-tka",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "knee",
    anki: 5,
    ob: 20,
    maturityTarget: 7,
    oneLiner: "Aseptic TKA loosening presents with progressive pain and radiographic component migration.",
    specificEntities: [
      condition("aseptic-loosening-tka", "Aseptic Loosening of TKA", pilotKey("aseptic-loosening-tka"), "Mechanical failure of TKA fixation without infection."),
      imaging("tibial-component-subsidence", "Tibial Component Subsidence", pilotKey("aseptic-loosening-tka"), "Progressive tibial tray settling indicating loosening."),
    ],
    extraRelationships: [
      { subjectSlug: "tibial-baseplate", predicate: "prerequisite_for", objectSlug: "aseptic-loosening-tka" },
      { subjectSlug: "femoral-component", predicate: "prerequisite_for", objectSlug: "aseptic-loosening-tka" },
      { subjectSlug: "aseptic-loosening-tka", predicate: "has_imaging_finding", objectSlug: "tibial-component-subsidence" },
      { subjectSlug: "revision-arthroplasty", predicate: "prerequisite_for", objectSlug: "aseptic-loosening-tka" },
    ],
    claims: baseClaims("aseptic-loosening-tka", "aseptic-loosening-tka", "Exclude infection before diagnosing aseptic TKA loosening."),
    decisionPoints: baseDecisionPoints("aseptic-loosening-tka", "aseptic-loosening-tka", "Painful TKA with progressive subsidence and excluded infection", "Discuss revision TKA with attending including constraint and bone loss"),
  },
  {
    topicKey: "knee-instability-after-tka",
    displayName: "Knee Instability After TKA",
    primaryEntitySlug: "knee-instability-after-tka",
    curriculumNodeSlug: "adult-recon-knee-instability",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "knee",
    anki: 6,
    ob: 30,
    maturityTarget: 7,
    oneLiner: "Post-TKA instability reflects ligament imbalance, component malposition, or excessive constraint mismatch.",
    specificEntities: [
      condition("knee-instability-after-tka", "Knee Instability After TKA", pilotKey("knee-instability-after-tka"), "Persistent instability after TKA from balancing or constraint issues."),
      concept("flexion-extension-gap-balance", "Flexion-Extension Gap Balance", pilotKey("knee-instability-after-tka"), "Soft tissue and bone resection balance determining TKA stability."),
    ],
    extraRelationships: [
      { subjectSlug: "knee-instability-after-tka", predicate: "involves_anatomy", objectSlug: "collateral-ligaments" },
      { subjectSlug: "knee-instability-after-tka", predicate: "involves_anatomy", objectSlug: "cruciate-ligaments" },
      { subjectSlug: "total-knee-arthroplasty", predicate: "prerequisite_for", objectSlug: "knee-instability-after-tka" },
    ],
    claims: baseClaims("knee-instability-after-tka", "knee-instability-after-tka", "TKA instability requires gap balance and component position review before revision."),
    decisionPoints: baseDecisionPoints("knee-instability-after-tka", "knee-instability-after-tka", "Persistent TKA instability despite appropriate rehab", "Review balancing and discuss constrained implant or revision with attending"),
  },
  {
    topicKey: "extensor-mechanism-failure",
    displayName: "Extensor Mechanism Failure",
    primaryEntitySlug: "extensor-mechanism-failure",
    curriculumNodeSlug: "adult-recon-extensor-mechanism-failure",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "knee",
    anki: 4,
    ob: 18,
    maturityTarget: 7,
    oneLiner: "Extensor mechanism failure after TKA is a functional catastrophe requiring urgent surgical planning.",
    specificEntities: [
      condition("extensor-mechanism-failure", "Extensor Mechanism Failure", pilotKey("extensor-mechanism-failure"), "Quadriceps or patellar tendon disruption compromising active extension."),
      imaging("patellar-tendon-rupture-tka", "Patellar Tendon Rupture After TKA", pilotKey("extensor-mechanism-failure"), "Discontinuity of patellar tendon with extensor lag."),
    ],
    extraRelationships: [
      { subjectSlug: "extensor-mechanism-failure", predicate: "involves_anatomy", objectSlug: "extensor-mechanism", metadata: { cross_cluster: "lower-extremity-trauma-cluster-shared" } },
      { subjectSlug: "extensor-mechanism-failure", predicate: "involves_anatomy", objectSlug: "quadriceps-tendon" },
      { subjectSlug: "extensor-mechanism-failure", predicate: "involves_anatomy", objectSlug: "patellar-tendon" },
      { subjectSlug: "extensor-mechanism-failure", predicate: "involves_anatomy", objectSlug: "patella", metadata: { cross_cluster: "lower-extremity-trauma-cluster-shared" } },
      { subjectSlug: "extensor-mechanism-failure", predicate: "has_imaging_finding", objectSlug: "patellar-tendon-rupture-tka" },
    ],
    claims: baseClaims("extensor-mechanism-failure", "extensor-mechanism-failure", "Extensor lag after TKA demands extensor mechanism integrity assessment, not passive rehab alone."),
    decisionPoints: baseDecisionPoints("extensor-mechanism-failure", "extensor-mechanism-failure", "Extensor lag after TKA with suspected tendon disruption", "Urgent surgical consultation for extensor mechanism repair or reconstruction"),
  },
  {
    topicKey: "patellofemoral-arthroplasty",
    displayName: "Patellofemoral Arthroplasty",
    primaryEntitySlug: "patellofemoral-arthroplasty",
    curriculumNodeSlug: "adult-recon-patellofemoral-arthroplasty",
    prepareTopicId: "knee-osteoarthritis",
    clusterGroup: "knee",
    anki: 3,
    ob: 12,
    maturityTarget: 6,
    oneLiner: "Patellofemoral arthroplasty targets isolated anterior knee OA in carefully selected patients.",
    specificEntities: [
      procedure("patellofemoral-arthroplasty", "Patellofemoral Arthroplasty", pilotKey("patellofemoral-arthroplasty"), "Isolated patellofemoral resurfacing for select anterior knee OA."),
      concept("patellofemoral-tracking", "Patellofemoral Tracking", pilotKey("patellofemoral-arthroplasty"), "Patella alignment and trochlear engagement determining PFA candidacy."),
    ],
    extraRelationships: [
      { subjectSlug: "patellofemoral-arthroplasty", predicate: "involves_anatomy", objectSlug: "patella", metadata: { cross_cluster: "lower-extremity-trauma-cluster-shared" } },
      { subjectSlug: "patellar-component", predicate: "prerequisite_for", objectSlug: "patellofemoral-arthroplasty" },
      { subjectSlug: "knee-osteoarthritis", predicate: "prerequisite_for", objectSlug: "patellofemoral-arthroplasty" },
    ],
    claims: baseClaims("patellofemoral-arthroplasty", "patellofemoral-arthroplasty", "PFA requires isolated patellofemoral disease without significant tibiofemoral OA."),
    decisionPoints: baseDecisionPoints("patellofemoral-arthroplasty", "patellofemoral-arthroplasty", "Isolated patellofemoral OA with failed conservative care", "Confirm no significant tibiofemoral disease before PFA discussion with attending"),
  },
  {
    topicKey: "unicompartmental-knee-arthritis",
    displayName: "Unicompartmental Knee Arthritis",
    primaryEntitySlug: "unicompartmental-knee-arthritis",
    curriculumNodeSlug: "adult-recon-unicompartmental-knee",
    prepareTopicId: "knee-osteoarthritis",
    clusterGroup: "knee",
    anki: 6,
    ob: 24,
    maturityTarget: 7,
    oneLiner: "Unicompartmental knee arthritis may be treated with UKA when disease is isolated and ligaments are intact.",
    specificEntities: [
      condition("unicompartmental-knee-arthritis", "Unicompartmental Knee Arthritis", pilotKey("unicompartmental-knee-arthritis"), "Single-compartment knee OA potentially amenable to UKA."),
      procedure("unicompartmental-knee-arthroplasty", "Unicompartmental Knee Arthroplasty", pilotKey("unicompartmental-knee-arthritis"), "Partial knee replacement preserving cruciates in select patients."),
    ],
    extraRelationships: [
      { subjectSlug: "unicompartmental-knee-arthritis", predicate: "involves_anatomy", objectSlug: "tibial-plateau", metadata: { cross_cluster: "lower-extremity-trauma-cluster-shared" } },
      { subjectSlug: "unicompartmental-knee-arthritis", predicate: "involves_anatomy", objectSlug: "cruciate-ligaments" },
      { subjectSlug: "unicompartmental-knee-arthritis", predicate: "indicates_treatment", objectSlug: "unicompartmental-knee-arthroplasty", metadata: { management_importance: "high", review_status: "needs_review" } },
      { subjectSlug: "knee-osteoarthritis", predicate: "prerequisite_for", objectSlug: "unicompartmental-knee-arthritis" },
    ],
    claims: baseClaims("unicompartmental-knee-arthritis", "unicompartmental-knee-arthritis", "UKA candidacy requires isolated compartment disease, intact ligaments, and correctable deformity."),
    decisionPoints: baseDecisionPoints("unicompartmental-knee-arthritis", "unicompartmental-knee-arthritis", "Medial compartment OA with intact ACL and correctable varus", "Discuss UKA versus TKA with attending using compartment-specific criteria"),
  },
  {
    topicKey: "periprosthetic-joint-infection",
    displayName: "Periprosthetic Joint Infection",
    primaryEntitySlug: "periprosthetic-joint-infection",
    curriculumNodeSlug: "adult-recon-periprosthetic-joint-infection",
    prepareTopicId: "periprosthetic-joint-infection",
    clusterGroup: "principles",
    anki: 12,
    ob: 56,
    maturityTarget: 8,
    oneLiner: "PJI workup is a structured infection pathway where timing and aspiration data shape whether implants can be retained.",
    specificEntities: [
      condition("periprosthetic-joint-infection", "Periprosthetic Joint Infection", pilotKey("periprosthetic-joint-infection"), "Prosthetic joint infection requiring structured workup and staged treatment."),
      classification("pji-timeline-classification", "PJI Timeline Classification", pilotKey("periprosthetic-joint-infection"), "Acute postoperative, acute hematogenous, and chronic infection categories."),
      procedure("two-stage-revision-arthroplasty", "Two-Stage Revision Arthroplasty", pilotKey("periprosthetic-joint-infection"), "Spacer placement followed by reimplantation after infection control."),
      concept("biofilm-concept", "Biofilm Concept", pilotKey("periprosthetic-joint-infection"), "Bacterial biofilm limiting antibiotic penetration on implant surfaces."),
    ],
    extraRelationships: [
      { subjectSlug: "hip-prosthetic-joint-infection", predicate: "prerequisite_for", objectSlug: "periprosthetic-joint-infection" },
      { subjectSlug: "knee-prosthetic-joint-infection", predicate: "prerequisite_for", objectSlug: "periprosthetic-joint-infection" },
      { subjectSlug: "compartment-syndrome", predicate: "prerequisite_for", objectSlug: "periprosthetic-joint-infection", metadata: { cross_neighborhood: "trauma" } },
      { subjectSlug: "periprosthetic-joint-infection", predicate: "has_classification", objectSlug: "pji-timeline-classification" },
      { subjectSlug: "periprosthetic-joint-infection", predicate: "treated_by", objectSlug: "two-stage-revision-arthroplasty", metadata: { management_importance: "high", review_status: "needs_review" } },
    ],
    claims: baseClaims("periprosthetic-joint-infection", "periprosthetic-joint-infection", "PJI workup is a structured infection pathway where timing and aspiration data shape whether implants can be retained."),
    decisionPoints: baseDecisionPoints("periprosthetic-joint-infection", "periprosthetic-joint-infection", "Suspected PJI with elevated inflammatory markers and positive aspiration", "Discuss implant retention versus staged revision with attending using timeline classification"),
  },
  {
    topicKey: "bone-loss-revision-arthroplasty",
    displayName: "Bone Loss in Revision Arthroplasty",
    primaryEntitySlug: "bone-loss-revision-arthroplasty",
    curriculumNodeSlug: "adult-recon-bone-loss-revision",
    prepareTopicId: "revision-arthroplasty",
    clusterGroup: "principles",
    anki: 7,
    ob: 32,
    maturityTarget: 8,
    oneLiner: "Revision arthroplasty bone loss requires Paprosky/AORI classification and reconstruction ladder planning.",
    specificEntities: [
      condition("bone-loss-revision-arthroplasty", "Bone Loss in Revision Arthroplasty", pilotKey("bone-loss-revision-arthroplasty"), "Periprosthetic bone deficiency complicating revision implant fixation."),
      classification("paprosky-classification", "Paprosky Classification", pilotKey("bone-loss-revision-arthroplasty"), "Acetabular bone loss classification for revision THA."),
      classification("aori-classification", "AORI Classification", pilotKey("bone-loss-revision-arthroplasty"), "Femoral and tibial metaphyseal bone loss classification for revision TKA."),
    ],
    extraRelationships: [
      { subjectSlug: "bone-loss-revision-arthroplasty", predicate: "has_classification", objectSlug: "paprosky-classification" },
      { subjectSlug: "bone-loss-revision-arthroplasty", predicate: "has_classification", objectSlug: "aori-classification" },
      { subjectSlug: "revision-arthroplasty", predicate: "prerequisite_for", objectSlug: "bone-loss-revision-arthroplasty" },
      { subjectSlug: "polyethylene-wear-osteolysis", predicate: "prerequisite_for", objectSlug: "bone-loss-revision-arthroplasty" },
    ],
    claims: baseClaims("bone-loss-revision-arthroplasty", "bone-loss-revision-arthroplasty", "Bone loss classification drives revision implant selection and augmentation strategy."),
    decisionPoints: baseDecisionPoints("bone-loss-revision-arthroplasty", "bone-loss-revision-arthroplasty", "Revision arthroplasty with significant acetabular or metaphyseal bone loss", "Classify bone loss with Paprosky/AORI and discuss augmentation options with attending"),
  },
  {
    topicKey: "implant-fixation-principles",
    displayName: "Implant Fixation Principles",
    primaryEntitySlug: "implant-fixation-principles",
    curriculumNodeSlug: "adult-recon-implant-fixation",
    prepareTopicId: "total-hip-arthroplasty",
    clusterGroup: "principles",
    anki: 10,
    ob: 38,
    maturityTarget: 8,
    oneLiner: "Implant fixation balances immediate stability with long-term biological ingrowth or cement interlock.",
    specificEntities: [
      concept("implant-fixation-principles", "Implant Fixation Principles", pilotKey("implant-fixation-principles"), "Cemented versus cementless fixation strategies in primary and revision arthroplasty."),
      concept("primary-stability", "Primary Stability", pilotKey("implant-fixation-principles"), "Initial implant stability required before biological fixation matures."),
      concept("bone-ingrowth", "Bone Ingrowth", pilotKey("implant-fixation-principles"), "Cementless porous coating osseointegration over time."),
    ],
    extraRelationships: [
      { subjectSlug: "press-fit-fixation", predicate: "prerequisite_for", objectSlug: "implant-fixation-principles" },
      { subjectSlug: "cemented-fixation", predicate: "prerequisite_for", objectSlug: "implant-fixation-principles" },
      { subjectSlug: "cement-mantle", predicate: "prerequisite_for", objectSlug: "implant-fixation-principles" },
      { subjectSlug: "tibial-shaft-fracture", predicate: "prerequisite_for", objectSlug: "implant-fixation-principles", metadata: { cross_neighborhood: "trauma", relevance_reason: "im_nail_fixation_concepts" } },
      { subjectSlug: "total-hip-arthroplasty", predicate: "prerequisite_for", objectSlug: "implant-fixation-principles" },
      { subjectSlug: "total-knee-arthroplasty", predicate: "prerequisite_for", objectSlug: "implant-fixation-principles" },
    ],
    claims: baseClaims("implant-fixation-principles", "implant-fixation-principles", "Cementless fixation requires primary stability; cemented fixation relies on interlock and mantle quality."),
    decisionPoints: baseDecisionPoints("implant-fixation-principles", "implant-fixation-principles", "Primary arthroplasty with poor bone quality or revision context", "Discuss cemented versus cementless fixation strategy with attending"),
  },
  {
    topicKey: "bearing-surface-selection",
    displayName: "Bearing Surface Selection",
    primaryEntitySlug: "bearing-surface-selection",
    curriculumNodeSlug: "adult-recon-bearing-surfaces",
    prepareTopicId: "total-hip-arthroplasty",
    clusterGroup: "principles",
    anki: 6,
    ob: 26,
    maturityTarget: 8,
    oneLiner: "Bearing surface selection balances wear, stability, and patient activity in hip and knee arthroplasty.",
    specificEntities: [
      concept("bearing-surface-selection", "Bearing Surface Selection", pilotKey("bearing-surface-selection"), "Choice among polyethylene, ceramic, and metal bearing couples."),
      concept("cross-linked-polyethylene", "Cross-Linked Polyethylene", pilotKey("bearing-surface-selection"), "Highly cross-linked PE reducing volumetric wear in arthroplasty."),
      concept("ceramic-on-ceramic-bearing", "Ceramic-on-Ceramic Bearing", pilotKey("bearing-surface-selection"), "Low-wear ceramic couple with fracture and squeak considerations."),
    ],
    extraRelationships: [
      { subjectSlug: "polyethylene-liner", predicate: "prerequisite_for", objectSlug: "bearing-surface-selection" },
      { subjectSlug: "polyethylene-wear-osteolysis", predicate: "prerequisite_for", objectSlug: "bearing-surface-selection" },
      { subjectSlug: "adverse-local-tissue-reaction", predicate: "prerequisite_for", objectSlug: "bearing-surface-selection" },
      { subjectSlug: "total-hip-arthroplasty", predicate: "prerequisite_for", objectSlug: "bearing-surface-selection" },
      { subjectSlug: "total-knee-arthroplasty", predicate: "prerequisite_for", objectSlug: "bearing-surface-selection" },
    ],
    claims: baseClaims("bearing-surface-selection", "bearing-surface-selection", "Bearing choice must account for wear, stability, patient age, and revision consequences."),
    decisionPoints: baseDecisionPoints("bearing-surface-selection", "bearing-surface-selection", "Primary arthroplasty in young active patient", "Discuss bearing surface options with attending weighing wear versus complications"),
  },
];

export const ADULT_RECONSTRUCTION_TOPIC_KEYS = ADULT_RECONSTRUCTION_TOPIC_CATALOG.map((t) => t.topicKey);