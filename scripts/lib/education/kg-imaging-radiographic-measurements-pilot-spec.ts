/**
 * Imaging & Radiographic Measurements canonical knowledge neighborhood.
 *
 * Reusable diagnostic and measurement backbone for Trauma, Sports, Hand & Wrist,
 * Adult Reconstruction, Foot & Ankle, Pediatrics, Spine, CasePrep, BroBot,
 * curriculum progression, and OITE preparation.
 *
 * Pure data consumed by the existing Knowledge Factory. Claims, decision points,
 * and numeric thresholds remain generated drafts until review gates approve them.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import {
  UE_SHARED_ANATOMY_ENTITIES,
  UE_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-upper-extremity-shared-anatomy.ts";
import {
  LE_SHARED_ANATOMY_ENTITIES,
  LE_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-lower-extremity-shared-anatomy.ts";
import {
  HIP_SHARED_ANATOMY_ENTITIES,
  HIP_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-hip-shared-anatomy.ts";
import { SPORTS_SHARED_ANATOMY_ENTITIES } from "./kg-sports-medicine-shared-anatomy.ts";
import {
  HAND_WRIST_SHARED_ANATOMY_ENTITIES,
  HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
} from "./kg-hand-wrist-shared-anatomy.ts";

export const IMAGING_MEASUREMENTS_PILOT_KEY = "imaging-radiographic-measurements-neighborhood" as const;

export const IMAGING_MEASUREMENTS_SOURCE_IDS = {
  curriculumNodeSlug: "imaging-radiographic-measurements",
  prepareTopicId: "imaging-radiographic-measurements",
  casePrepSlug: "imaging-radiographic-measurements",
} as const;

export const IMAGING_MEASUREMENTS_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 0,
} as const;

const PILOT = IMAGING_MEASUREMENTS_PILOT_KEY;
const NEIGHBORHOOD = "imaging-radiographic-measurements";

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
    pilot: PILOT,
    neighborhood: NEIGHBORHOOD,
    reusable: true,
    ...metadata,
  },
});

const measure = (
  slug: string,
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown>
): PilotEntitySpec =>
  entity(slug, "biomechanics_concept", preferredLabel, description, {
    clinical_kind: "radiographic_measurement",
    requires_human_review: true,
    quantitative: true,
    source_version: "imaging_measurements_spec_v1",
    ...metadata,
  });

const test = (
  slug: string,
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec =>
  entity(slug, "diagnostic_test", preferredLabel, description, {
    clinical_kind: "imaging_study",
    ...metadata,
  });

const finding = (
  slug: string,
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec =>
  entity(slug, "imaging_finding", preferredLabel, description, {
    clinical_kind: "measurement_related_finding",
    ...metadata,
  });

const principle = (
  slug: string,
  preferredLabel: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec =>
  entity(slug, "treatment_principle", preferredLabel, description, {
    clinical_kind: "imaging_principle",
    ...metadata,
  });

/** Imaging-specific entities (new canonical objects for this neighborhood). */
const IMAGING_SPECIFIC_ENTITIES: PilotEntitySpec[] = [
  // Root + modules
  principle(
    "imaging-radiographic-measurements",
    "Imaging & Radiographic Measurements",
    "Reusable diagnostic and radiographic measurement backbone spanning views, modalities, quantitative parameters, reliability, and imaging-to-treatment relationships.",
    { clinical_kind: "foundational_backbone", maturity_target: 7 }
  ),
  principle("imaging-foundations", "Imaging Foundations", "Foundational principles for radiographic views, special studies, modality selection, and escalation pathways."),
  principle("trauma-radiographic-measurements", "Trauma Radiographic Measurements", "Reusable trauma measurement set for alignment, articular relationships, and fracture decision thresholds."),
  principle("sports-medicine-radiographic-measurements", "Sports Medicine Radiographic Measurements", "Reusable sports measurement set for patellofemoral, hip femoroacetabular, and shoulder metrics."),
  principle("adult-reconstruction-radiographic-measurements", "Adult Reconstruction Radiographic Measurements", "Reusable arthroplasty measurement set for alignment, offset, component position, and joint-line restoration."),
  principle("spine-radiographic-measurements", "Spine Radiographic Measurements", "Reusable spine measurement set for coronal deformity and sagittal alignment parameters."),
  principle("pediatric-radiographic-measurements", "Pediatric Radiographic Measurements", "Reusable pediatric measurement set for hip dysplasia, SCFE screening lines, and growth-plate relationships."),
  principle("imaging-measurement-reliability", "Imaging Measurement Reliability", "Cross-cutting concepts of observer variability, population norms, pitfalls, and decision-threshold governance."),

  // Imaging foundations — modalities and view classes
  test("standard-radiographic-views", "Standard Radiographic Views", "Core orthogonal and regional radiographic projections used as first-line musculoskeletal imaging."),
  test("additional-special-radiographic-views", "Additional and Special Radiographic Views", "Supplemental projections chosen for specific joints, injury patterns, or occult pathology."),
  test("fluoroscopic-views", "Fluoroscopic Views", "Intraoperative or procedural fluoroscopic projections used to guide reduction and implant placement."),
  test("weight-bearing-radiographs", "Weight-Bearing Radiographs", "Standing or loaded radiographs that demonstrate functional alignment under physiologic load."),
  test("non-weight-bearing-radiographs", "Non-Weight-Bearing Radiographs", "Unloaded radiographs used when standing is unsafe or not required for the clinical question."),
  test("comparison-views", "Comparison Views", "Contralateral or serial comparison radiographs used to establish patient-specific normals or interval change."),
  test("stress-radiographs", "Stress Radiographs", "Radiographs obtained under directed stress to demonstrate dynamic instability or occult diastasis."),
  test("ct-musculoskeletal-imaging", "CT Musculoskeletal Imaging", "Cross-sectional CT for fracture mapping, osseous detail, and multiplanar measurement."),
  test("mri-musculoskeletal-imaging", "MRI Musculoskeletal Imaging", "MRI for soft tissue, cartilage, marrow, neural, and occult injury evaluation."),
  test("ultrasound-musculoskeletal-imaging", "Musculoskeletal Ultrasound", "Dynamic ultrasound for soft-tissue, tendon, joint fluid, and guided procedures."),
  test("nuclear-musculoskeletal-imaging", "Nuclear Musculoskeletal Imaging", "Bone scan, SPECT, or PET pathways for infection, occult lesions, and metabolic activity."),
  principle("imaging-escalation-pathway", "Imaging Escalation Pathway", "Ordered progression from radiographs to advanced modalities based on clinical question and instability risk."),
  principle("population-specific-imaging-norms", "Population-Specific Imaging Norms", "Age-, sex-, laterality-, and population-context adjustments for normal ranges and thresholds."),
  principle("measurement-pitfalls", "Measurement Pitfalls", "Technical and interpretive errors that invalidate radiographic measurements."),
  principle("imaging-to-treatment-relationship", "Imaging-to-Treatment Relationship", "How imaging findings and measurement thresholds change management decisions."),
  principle("observer-variability-imaging", "Observer Variability in Imaging Measurements", "Intra- and inter-observer reliability considerations for quantitative imaging parameters."),

  // Standard regional views (diagnostic tests)
  test("ap-radiograph", "AP Radiograph", "Anteroposterior projection providing frontal osseous alignment."),
  test("lateral-radiograph", "Lateral Radiograph", "Lateral projection providing sagittal osseous alignment."),
  test("oblique-radiograph", "Oblique Radiograph", "Oblique projection used to profile articular surfaces or overlapping structures."),
  test("mortise-view-ankle", "Ankle Mortise View", "Approximately 15-degree internal rotation ankle view assessing mortise symmetry."),
  test("scapular-y-view", "Scapular Y View", "Lateral scapular projection used for shoulder dislocation and acromial relationships."),
  test("axillary-lateral-shoulder", "Axillary Lateral Shoulder View", "Axillary projection defining glenohumeral centering and anterior/posterior dislocation."),
  test("inlet-outlet-pelvis-views", "Pelvic Inlet and Outlet Views", "Special pelvic projections assessing AP and vertical pelvic ring displacement."),
  test("judet-views", "Judet Views", "Obturator and iliac oblique views for acetabular columns and walls."),
  test("sunrise-merchant-patellar-view", "Sunrise/Merchant Patellar View", "Axial patellofemoral projection for tracking and trochlear relationships."),
  test("full-length-alignment-radiographs", "Full-Length Alignment Radiographs", "Standing hip-to-ankle films for mechanical axis and coronal alignment planning."),
  test("standing-spine-radiographs", "Standing Spine Radiographs", "Weight-bearing spine films for coronal balance and sagittal contour."),

  // Trauma measurements
  measure("bohler-angle", "Böhler Angle", "Angle formed by lines from the highest point of the anterior process and posterior tuberosity of the calcaneus through the posterior facet.", {
    units: "degrees",
    population_context: "adult_hindfoot",
    normal_range_text: "approximately 20-40 degrees (source-version dependent)",
    decision_threshold_text: "decreased angle suggests calcaneal compression/collapse",
    requires_specialist_review: false,
    numeric_threshold_review_required: true,
  }),
  measure("gissane-angle", "Gissane Angle", "Critical angle of Gissane at the intersection of the anterior and posterior facets of the calcaneus.", {
    units: "degrees",
    population_context: "adult_hindfoot",
    normal_range_text: "approximately 120-145 degrees (source-version dependent)",
    decision_threshold_text: "abnormal angle supports articular calcaneal injury",
    numeric_threshold_review_required: true,
  }),
  measure("baumann-angle", "Baumann Angle", "Angle between the humeral shaft axis and the capitellar physeal line on AP elbow radiograph.", {
    units: "degrees",
    population_context: "pediatric_elbow",
    normal_range_text: "approximately 64-81 degrees with side-to-side comparison preferred",
    decision_threshold_text: "asymmetric Baumann angle suggests coronal malalignment after supracondylar injury",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("anterior-humeral-line", "Anterior Humeral Line", "Line drawn along the anterior humeral cortex on lateral elbow radiograph relating to the capitellum.", {
    units: "categorical_relationship",
    population_context: "pediatric_elbow",
    normal_range_text: "intersects middle third of capitellum in most children (age-dependent)",
    decision_threshold_text: "anterior translation relative to capitellum suggests extension-type supracondylar displacement",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("radiocapitellar-line", "Radiocapitellar Line", "Line along the radial shaft/neck that should intersect the capitellum on orthogonal elbow views.", {
    units: "categorical_relationship",
    population_context: "pediatric_and_adult_elbow",
    normal_range_text: "intersects capitellum on AP and lateral views",
    decision_threshold_text: "failure to intersect capitellum indicates radiocapitellar dislocation/subluxation",
    numeric_threshold_review_required: true,
  }),
  measure("ulnar-variance", "Ulnar Variance", "Relative length of the distal ulna compared with the distal radius articular surface.", {
    units: "millimeters",
    population_context: "adult_wrist_neutral_rotation",
    normal_range_text: "near-neutral variance is common; population and technique dependent",
    decision_threshold_text: "positive or negative variance alters ulnar-sided load and DRUJ interpretation",
    numeric_threshold_review_required: true,
  }),
  measure("volar-tilt", "Volar Tilt", "Sagittal inclination of the distal radial articular surface relative to the radial shaft.", {
    units: "degrees",
    population_context: "adult_wrist",
    normal_range_text: "approximately 11 degrees volar (source-version dependent)",
    decision_threshold_text: "dorsal angulation beyond accepted thresholds influences instability and fixation goals",
    numeric_threshold_review_required: true,
  }),
  measure("radial-inclination", "Radial Inclination", "Frontal inclination of the distal radial articular surface relative to the radial shaft.", {
    units: "degrees",
    population_context: "adult_wrist",
    normal_range_text: "approximately 22-23 degrees (source-version dependent)",
    decision_threshold_text: "loss of inclination contributes to radial deformity assessment",
    numeric_threshold_review_required: true,
  }),
  measure("radial-height", "Radial Height", "Vertical distance from ulnar articular surface to radial styloid tip on PA wrist radiograph.", {
    units: "millimeters",
    population_context: "adult_wrist",
    normal_range_text: "approximately 11-12 mm (source-version dependent)",
    decision_threshold_text: "shortening is a key distal radius instability and outcome parameter",
    numeric_threshold_review_required: true,
  }),
  measure("tibiofibular-overlap", "Tibiofibular Overlap", "Horizontal overlap of tibia and fibula on AP or mortise ankle radiograph at the syndesmosis.", {
    units: "millimeters",
    population_context: "adult_ankle",
    normal_range_text: "technique- and view-specific minimum overlap thresholds",
    decision_threshold_text: "reduced overlap raises concern for syndesmotic injury",
    numeric_threshold_review_required: true,
  }),
  measure("tibiofibular-clear-space", "Tibiofibular Clear Space", "Distance between medial fibular border and incisural surface of the tibia at a defined level above the plafond.", {
    units: "millimeters",
    population_context: "adult_ankle",
    normal_range_text: "commonly cited upper bounds near 6 mm (view- and method-dependent)",
    decision_threshold_text: "widened clear space supports syndesmotic diastasis evaluation",
    numeric_threshold_review_required: true,
  }),
  measure("medial-clear-space", "Medial Clear Space", "Distance between medial malleolus and medial talus on mortise radiograph.", {
    units: "millimeters",
    population_context: "adult_ankle",
    normal_range_text: "commonly compared with superior clear space; absolute cutoffs are source-version dependent",
    decision_threshold_text: "widening suggests deltoid incompetence or mortise instability",
    numeric_threshold_review_required: true,
  }),
  measure("mechanical-axis", "Mechanical Axis", "Weight-bearing limb axis from hip center through knee to ankle center used for coronal alignment assessment.", {
    units: "degrees_or_millimeters_offset",
    population_context: "standing_lower_extremity",
    normal_range_text: "near-neutral mechanical axis with population-specific ranges",
    decision_threshold_text: "deviation guides osteotomy, arthroplasty, and deformity planning",
    numeric_threshold_review_required: true,
  }),
  measure("alignment-measurements", "Alignment Measurements", "Family of coronal and sagittal alignment parameters used across trauma and reconstruction.", {
    units: "mixed",
    population_context: "region_specific",
    normal_range_text: "region- and modality-specific",
    decision_threshold_text: "alignment thresholds change reduction and construct goals",
    numeric_threshold_review_required: true,
  }),

  // Sports measurements
  measure("insall-salvati-ratio", "Insall-Salvati Ratio", "Ratio of patellar tendon length to patellar length on lateral knee radiograph.", {
    units: "ratio",
    population_context: "adult_knee_lateral",
    normal_range_text: "approximately 0.8-1.2 (method-dependent)",
    decision_threshold_text: "elevated ratio suggests patella alta; reduced ratio suggests patella baja",
    numeric_threshold_review_required: true,
  }),
  measure("caton-deschamps-index", "Caton-Deschamps Index", "Ratio of articular patellar surface distance to tibial plateau over patellar articular length.", {
    units: "ratio",
    population_context: "adult_knee_lateral_flexion",
    normal_range_text: "approximately 0.6-1.3 (source-version dependent)",
    decision_threshold_text: "used for patellar height assessment independent of patellar morphology",
    numeric_threshold_review_required: true,
  }),
  measure("tt-tg-distance", "TT-TG Distance", "Tibial tubercle to trochlear groove distance measured on axial CT or MRI.", {
    units: "millimeters",
    population_context: "adolescent_adult_patellofemoral",
    normal_range_text: "commonly cited risk thresholds near 15-20 mm are method- and population-dependent",
    decision_threshold_text: "increased TT-TG contributes to lateralization risk assessment",
    numeric_threshold_review_required: true,
  }),
  measure("alpha-angle-hip", "Alpha Angle", "Angle between femoral neck axis and the point where femoral head-neck asphericity begins on oblique axial imaging.", {
    units: "degrees",
    population_context: "adult_hip_cam_morphology",
    normal_range_text: "commonly cited thresholds near 50-55 degrees are source- and plane-dependent",
    decision_threshold_text: "elevated alpha angle supports cam-type femoroacetabular impingement morphology",
    numeric_threshold_review_required: true,
  }),
  measure("lateral-center-edge-angle", "Lateral Center-Edge Angle", "Angle between vertical line through femoral head center and line to lateral acetabular sourcil.", {
    units: "degrees",
    population_context: "adult_hip_ap_pelvis",
    normal_range_text: "commonly >25 degrees normal; 20-25 borderline; <20 dysplasia (source-version dependent)",
    decision_threshold_text: "reduced LCEA supports undercoverage/dysplasia evaluation",
    numeric_threshold_review_required: true,
  }),
  measure("tonnis-angle", "Tönnis Angle", "Acetabular inclination angle of the weight-bearing sourcil relative to horizontal.", {
    units: "degrees",
    population_context: "adult_hip_ap_pelvis",
    normal_range_text: "commonly <10 degrees (source-version dependent)",
    decision_threshold_text: "elevated Tönnis angle supports acetabular dysplasia morphology",
    numeric_threshold_review_required: true,
  }),
  measure("acromiohumeral-interval", "Acromiohumeral Interval", "Superior distance between acromion and humeral head on AP or outlet shoulder radiograph.", {
    units: "millimeters",
    population_context: "adult_shoulder",
    normal_range_text: "commonly >7 mm; reduced values raise concern for rotator cuff deficiency (source-version dependent)",
    decision_threshold_text: "narrow AHI suggests superior migration from massive cuff pathology",
    numeric_threshold_review_required: true,
  }),
  measure("critical-shoulder-angle", "Critical Shoulder Angle", "Angle between glenoid plane and line from inferior glenoid to lateral acromial edge.", {
    units: "degrees",
    population_context: "adult_shoulder_true_ap",
    normal_range_text: "commonly cited mid-range near 30-35 degrees with higher values linked to cuff risk (source-version dependent)",
    decision_threshold_text: "extreme CSA values associate with cuff tear versus osteoarthritis patterns",
    numeric_threshold_review_required: true,
  }),

  // Adult reconstruction measurements
  measure("leg-length-discrepancy-radiographic", "Leg Length Discrepancy (Radiographic)", "Radiographic comparison of limb lengths using pelvic reference lines and lesser trochanters or full-length films.", {
    units: "millimeters",
    population_context: "standing_pelvis_or_full_length",
    normal_range_text: "side-to-side difference near zero; clinical tolerance is goal- and patient-specific",
    decision_threshold_text: "unplanned LLD after arthroplasty is a key reconstruction quality metric",
    numeric_threshold_review_required: true,
  }),
  measure("femoral-offset", "Femoral Offset", "Perpendicular distance from femoral head center to femoral shaft axis.", {
    units: "millimeters",
    population_context: "adult_hip_ap",
    normal_range_text: "patient-specific; restoration relative to native or contralateral side",
    decision_threshold_text: "under- or over-restoration affects abductor tension and stability",
    numeric_threshold_review_required: true,
  }),
  measure("cup-inclination", "Acetabular Cup Inclination", "Abduction angle of the acetabular component relative to the transverse pelvic axis.", {
    units: "degrees",
    population_context: "postoperative_tha_ap_pelvis",
    normal_range_text: "commonly discussed safe zones near 30-50 degrees are contested and source-version dependent",
    decision_threshold_text: "extreme inclination contributes to instability and wear risk assessment",
    numeric_threshold_review_required: true,
  }),
  measure("cup-anteversion", "Acetabular Cup Anteversion", "Forward opening of the acetabular component measured on cross-table lateral, CT, or calculated methods.", {
    units: "degrees",
    population_context: "postoperative_tha",
    normal_range_text: "method-dependent; commonly discussed mid-range values are contested",
    decision_threshold_text: "version extremes contribute to dislocation and impingement risk",
    numeric_threshold_review_required: true,
  }),
  measure("hip-center-restoration", "Hip Center Restoration", "Restoration of the reconstructed femoral head center relative to native or planned hip center.", {
    units: "millimeters",
    population_context: "tha_templating_and_postop",
    normal_range_text: "goal is anatomic or planned restoration within reconstruction constraints",
    decision_threshold_text: "superior/lateralization alters offset, length, and joint reaction force",
    numeric_threshold_review_required: true,
  }),
  measure("mechanical-alignment-arthroplasty", "Mechanical Alignment (Arthroplasty)", "Coronal arthroplasty alignment strategy targeting neutral mechanical axis relationships.", {
    units: "degrees",
    population_context: "tka_tha_planning",
    normal_range_text: "target corridors are construct- and philosophy-specific",
    decision_threshold_text: "outliers from planned mechanical targets alter load distribution",
    numeric_threshold_review_required: true,
  }),
  measure("joint-line-restoration", "Joint Line Restoration", "Restoration of native or planned joint line height after knee or hip reconstruction.", {
    units: "millimeters",
    population_context: "arthroplasty_radiographs",
    normal_range_text: "patient-specific native joint line references",
    decision_threshold_text: "joint-line elevation or depression affects kinematics and extensor mechanism",
    numeric_threshold_review_required: true,
  }),
  measure("coronal-alignment-measurements", "Coronal Alignment Measurements", "Family of hip-knee-ankle and component coronal parameters used in reconstruction.", {
    units: "degrees",
    population_context: "standing_lower_extremity",
    normal_range_text: "philosophy- and patient-specific corridors",
    decision_threshold_text: "coronal outliers influence polyethylene load and longevity discussions",
    numeric_threshold_review_required: true,
  }),

  // Spine measurements
  measure("cobb-angle", "Cobb Angle", "Angle between endplates of the most tilted proximal and distal vertebrae of a curve.", {
    units: "degrees",
    population_context: "standing_spine_coronal",
    normal_range_text: "curve magnitude thresholds for observation versus treatment are age- and etiology-specific",
    decision_threshold_text: "Cobb magnitude drives scoliosis surveillance and treatment thresholds",
    requires_specialist_review: true,
    specialist_domains: ["spine", "pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("pelvic-incidence", "Pelvic Incidence", "Angle between perpendicular to sacral endplate at its midpoint and line to femoral head axis.", {
    units: "degrees",
    population_context: "standing_spinopelvic",
    normal_range_text: "morphologic constant with wide population range",
    decision_threshold_text: "PI sets the target framework for PT and SS relationships",
    requires_specialist_review: true,
    specialist_domains: ["spine"],
    numeric_threshold_review_required: true,
  }),
  measure("pelvic-tilt-spinopelvic", "Pelvic Tilt (Spinopelvic)", "Angle between vertical and the line from sacral endplate midpoint to femoral head axis.", {
    units: "degrees",
    population_context: "standing_spinopelvic",
    normal_range_text: "compensatory ranges are age- and deformity-specific",
    decision_threshold_text: "elevated PT indicates pelvic retroversion compensation",
    requires_specialist_review: true,
    specialist_domains: ["spine"],
    numeric_threshold_review_required: true,
  }),
  measure("sacral-slope", "Sacral Slope", "Angle between sacral endplate and horizontal reference.", {
    units: "degrees",
    population_context: "standing_spinopelvic",
    normal_range_text: "related to PI and PT by PI ≈ PT + SS",
    decision_threshold_text: "abnormal SS contributes to sagittal imbalance analysis",
    requires_specialist_review: true,
    specialist_domains: ["spine"],
    numeric_threshold_review_required: true,
  }),
  measure("sagittal-vertical-axis", "Sagittal Vertical Axis", "Horizontal offset of C7 plumb line from the posterosuperior sacral corner.", {
    units: "millimeters",
    population_context: "standing_full_spine",
    normal_range_text: "near-neutral to small positive offset; thresholds are age-dependent",
    decision_threshold_text: "increased positive SVA indicates global sagittal malalignment",
    requires_specialist_review: true,
    specialist_domains: ["spine"],
    numeric_threshold_review_required: true,
  }),
  measure("cervical-sagittal-alignment", "Cervical Sagittal Alignment", "Family of cervical parameters including lordosis and chin-brow / C2-C7 relationships.", {
    units: "degrees_or_millimeters",
    population_context: "standing_cervical_spine",
    normal_range_text: "age- and method-specific",
    decision_threshold_text: "cervical malalignment affects horizontal gaze and myelopathy planning",
    requires_specialist_review: true,
    specialist_domains: ["spine"],
    numeric_threshold_review_required: true,
  }),
  measure("coronal-balance-spine", "Coronal Balance (Spine)", "Horizontal offset of C7 plumb line from the central sacral vertical line.", {
    units: "millimeters",
    population_context: "standing_spine_coronal",
    normal_range_text: "near-neutral coronal balance preferred",
    decision_threshold_text: "coronal imbalance influences deformity correction goals",
    requires_specialist_review: true,
    specialist_domains: ["spine"],
    numeric_threshold_review_required: true,
  }),

  // Pediatric measurements
  measure("klein-line", "Klein Line", "Line along the superior femoral neck that should intersect the lateral femoral epiphysis on AP pelvis.", {
    units: "categorical_relationship",
    population_context: "pediatric_adolescent_hip",
    normal_range_text: "intersects epiphysis; comparison with contralateral side recommended",
    decision_threshold_text: "failure to intersect epiphysis raises concern for SCFE",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("migration-percentage", "Migration Percentage (Reimers)", "Percent of femoral head lateral to Perkins line on AP pelvis.", {
    units: "percent",
    population_context: "pediatric_hip_dysplasia_neuromuscular",
    normal_range_text: "age- and condition-specific surveillance thresholds",
    decision_threshold_text: "progressive migration guides hip surveillance and intervention timing",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("acetabular-index", "Acetabular Index", "Angle between Hilgenreiner line and the acetabular roof on pediatric AP pelvis.", {
    units: "degrees",
    population_context: "infant_child_hip",
    normal_range_text: "age-dependent norms with progressive decrease after birth",
    decision_threshold_text: "elevated AI supports DDH monitoring and treatment thresholds",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("center-edge-angle-pediatric", "Center-Edge Angle (Pediatric Context)", "Lateral femoral head coverage angle used in older children and adolescents with age-adjusted norms.", {
    units: "degrees",
    population_context: "pediatric_adolescent_hip",
    normal_range_text: "age-dependent; not interchangeable with adult thresholds without adjustment",
    decision_threshold_text: "reduced coverage supports residual dysplasia evaluation",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),
  measure("growth-plate-relationships", "Growth Plate Relationships", "Radiographic relationships of physis, epiphysis, and metaphysis used to detect injury and deformity risk.", {
    units: "mixed",
    population_context: "open_physis_pediatric",
    normal_range_text: "age- and site-specific ossification and alignment norms",
    decision_threshold_text: "physeal irregularity or displacement changes pediatric management urgency",
    requires_specialist_review: true,
    specialist_domains: ["pediatrics"],
    numeric_threshold_review_required: true,
  }),

  // Cross-cutting findings that are measurement outcomes (not condition-owned anatomy/findings)
  finding("decreased-bohler-angle", "Decreased Böhler Angle", "Radiographic finding of reduced Böhler angle suggesting calcaneal compression."),
  finding("widened-medial-clear-space", "Widened Medial Clear Space", "Mortise finding of increased medial clear space suggesting deltoid/mortise incompetence."),
  finding("widened-tibiofibular-clear-space", "Widened Tibiofibular Clear Space", "Syndesmotic finding of increased tibiofibular clear space."),
  finding("positive-ulnar-variance", "Positive Ulnar Variance", "Ulna projects distal relative to radius articular surface."),
  finding("dorsal-angulation-distal-radius", "Dorsal Angulation of Distal Radius", "Loss of normal volar tilt with dorsal articular angulation."),
  finding("patella-alta", "Patella Alta", "Elevated patellar height by accepted ratio thresholds."),
  finding("cam-morphology-alpha-angle", "Cam Morphology (Elevated Alpha Angle)", "Head-neck asphericity suggested by elevated alpha angle."),
  finding("acetabular-undercoverage", "Acetabular Undercoverage", "Reduced lateral center-edge coverage suggesting dysplasia morphology."),
  finding("superior-humeral-migration", "Superior Humeral Migration", "Reduced acromiohumeral interval with superior humeral head position."),
  finding("spinopelvic-mismatch", "Spinopelvic Mismatch", "Discordance among PI, PT, SS, and lumbar parameters."),
  finding("positive-klein-line", "Positive Klein Line (Trethowan)", "Klein line fails to intersect the lateral femoral epiphysis."),

  // Reused identities already present in other neighborhoods (same slug; no replacement objects)
  finding("radial-height-loss", "Radial Height Loss", "Loss of radial length on wrist radiographs affecting alignment goals.", {
    reused_from: "distal-radius-fracture-neighborhood",
  }),
  entity("mechanical-axis-knee", "biomechanics_concept", "Knee Mechanical Axis", "Hip-knee-ankle alignment influencing unicompartmental versus TKA candidacy.", {
    reused_from: "knee-osteoarthritis-neighborhood",
    clinical_kind: "radiographic_measurement",
    quantitative: true,
    units: "degrees_or_millimeters_offset",
    population_context: "standing_lower_extremity",
    numeric_threshold_review_required: true,
    source_version: "imaging_measurements_spec_v1",
  }),
  test("post-reduction-radiographs", "Post-Reduction Radiographs", "Imaging used to document alignment after reduction and immobilization.", {
    reused_from: "trauma-fundamentals-neighborhood",
  }),
  entity("radiographic-anatomy-landmarks", "anatomy_structure", "Imaging Anatomy Landmarks", "Canonical radiographic, CT, MRI, and ultrasound landmarks.", {
    reused_from: "orthopaedic-anatomy-neighborhood",
    anatomy_kind: "imaging_landmark",
    region: "whole_body",
  }),
];

/** Reuse canonical anatomy identities needed for measurement localization. */
const REUSED_ANATOMY_SLUGS = new Set([
  "calcaneus",
  "patella",
  "acetabulum",
  "distal-femur",
  "proximal-humerus",
  "distal-humerus",
  "femoral-head",
  "femoral-neck",
  "hip-joint",
  "pelvis",
  "hand-wrist-anatomy-hub",
  // Parent hubs required by anatomy hierarchy gaps (reused identities only)
  "upper-extremity-trauma-anatomy-hub",
  "lower-extremity-trauma-anatomy-hub",
  "proximal-femur-anatomy-hub",
  "extensor-mechanism",
  "iliac-wing",
]);

const SHARED_ANATOMY_POOL = [
  ...UE_SHARED_ANATOMY_ENTITIES,
  ...LE_SHARED_ANATOMY_ENTITIES,
  ...HIP_SHARED_ANATOMY_ENTITIES,
  ...SPORTS_SHARED_ANATOMY_ENTITIES,
  ...HAND_WRIST_SHARED_ANATOMY_ENTITIES,
];

const REUSED_ANATOMY_ENTITIES: PilotEntitySpec[] = SHARED_ANATOMY_POOL.filter((item) =>
  REUSED_ANATOMY_SLUGS.has(item.slug)
).map((item) => ({
  ...item,
  metadata: {
    ...item.metadata,
    pilot: PILOT,
    neighborhood: NEIGHBORHOOD,
    reusable: true,
    reused_anatomy_identity: true,
    canonical_owner: "orthopaedic-anatomy-neighborhood",
  },
}));

const bySlug = new Map<string, PilotEntitySpec>();
for (const item of [...IMAGING_SPECIFIC_ENTITIES, ...REUSED_ANATOMY_ENTITIES]) {
  if (!bySlug.has(item.slug)) bySlug.set(item.slug, item);
}
export const IMAGING_MEASUREMENTS_ENTITIES = [...bySlug.values()];

const SHARED_ANATOMY_RELATIONSHIP_POOL = [
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
  ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
];

const REUSED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = SHARED_ANATOMY_RELATIONSHIP_POOL.filter(
  (item) =>
    item.predicate === "part_of" &&
    bySlug.has(item.subjectSlug) &&
    bySlug.has(item.objectSlug)
).map((item) => ({
  ...item,
  metadata: {
    ...item.metadata,
    relevance_reason: "reused_anatomy_hierarchy",
    reusable: true,
    context_relevance: ["clinic", "or", "oite", "caseprep", "brobot"],
  },
}));

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
    relevance_reason: "imaging_radiographic_measurements",
    context_relevance: ["clinic", "or", "oite", "caseprep", "brobot", "trauma", "sports", "recon", "peds", "spine"],
    reusable: true,
    ...metadata,
  },
});

const IMAGING_SPECIFIC_RELATIONSHIPS: PilotRelationshipSpec[] = [
  // Module graph
  rel("imaging-foundations", "prerequisite_for", "imaging-radiographic-measurements"),
  rel("trauma-radiographic-measurements", "prerequisite_for", "imaging-radiographic-measurements"),
  rel("sports-medicine-radiographic-measurements", "prerequisite_for", "imaging-radiographic-measurements"),
  rel("adult-reconstruction-radiographic-measurements", "prerequisite_for", "imaging-radiographic-measurements"),
  rel("spine-radiographic-measurements", "prerequisite_for", "imaging-radiographic-measurements"),
  rel("pediatric-radiographic-measurements", "prerequisite_for", "imaging-radiographic-measurements"),
  rel("imaging-measurement-reliability", "prerequisite_for", "imaging-radiographic-measurements"),

  // Foundations
  rel("standard-radiographic-views", "prerequisite_for", "imaging-foundations"),
  rel("additional-special-radiographic-views", "prerequisite_for", "imaging-foundations"),
  rel("fluoroscopic-views", "prerequisite_for", "imaging-foundations"),
  rel("weight-bearing-radiographs", "prerequisite_for", "imaging-foundations"),
  rel("non-weight-bearing-radiographs", "prerequisite_for", "imaging-foundations"),
  rel("comparison-views", "prerequisite_for", "imaging-foundations"),
  rel("stress-radiographs", "prerequisite_for", "imaging-foundations"),
  rel("ct-musculoskeletal-imaging", "prerequisite_for", "imaging-foundations"),
  rel("mri-musculoskeletal-imaging", "prerequisite_for", "imaging-foundations"),
  rel("ultrasound-musculoskeletal-imaging", "prerequisite_for", "imaging-foundations"),
  rel("nuclear-musculoskeletal-imaging", "prerequisite_for", "imaging-foundations"),
  rel("imaging-escalation-pathway", "prerequisite_for", "imaging-foundations"),
  rel("ap-radiograph", "prerequisite_for", "standard-radiographic-views"),
  rel("lateral-radiograph", "prerequisite_for", "standard-radiographic-views"),
  rel("oblique-radiograph", "prerequisite_for", "standard-radiographic-views"),
  rel("mortise-view-ankle", "prerequisite_for", "additional-special-radiographic-views"),
  rel("scapular-y-view", "prerequisite_for", "additional-special-radiographic-views"),
  rel("axillary-lateral-shoulder", "prerequisite_for", "additional-special-radiographic-views"),
  rel("inlet-outlet-pelvis-views", "prerequisite_for", "additional-special-radiographic-views"),
  rel("judet-views", "prerequisite_for", "additional-special-radiographic-views"),
  rel("sunrise-merchant-patellar-view", "prerequisite_for", "additional-special-radiographic-views"),
  rel("full-length-alignment-radiographs", "prerequisite_for", "weight-bearing-radiographs"),
  rel("standing-spine-radiographs", "prerequisite_for", "weight-bearing-radiographs"),
  rel("weight-bearing-radiographs", "commonly_confused_with", "non-weight-bearing-radiographs"),
  rel("non-weight-bearing-radiographs", "commonly_confused_with", "weight-bearing-radiographs"),
  rel("standard-radiographic-views", "prerequisite_for", "imaging-escalation-pathway"),
  rel("imaging-escalation-pathway", "prerequisite_for", "ct-musculoskeletal-imaging"),
  rel("imaging-escalation-pathway", "prerequisite_for", "mri-musculoskeletal-imaging"),
  rel("imaging-escalation-pathway", "prerequisite_for", "ultrasound-musculoskeletal-imaging"),
  rel("imaging-escalation-pathway", "prerequisite_for", "nuclear-musculoskeletal-imaging"),
  rel("post-reduction-radiographs", "prerequisite_for", "imaging-foundations"),
  rel("radiographic-anatomy-landmarks", "prerequisite_for", "imaging-foundations"),
  rel("population-specific-imaging-norms", "prerequisite_for", "imaging-measurement-reliability"),
  rel("measurement-pitfalls", "prerequisite_for", "imaging-measurement-reliability"),
  rel("observer-variability-imaging", "prerequisite_for", "imaging-measurement-reliability"),
  rel("imaging-to-treatment-relationship", "prerequisite_for", "imaging-measurement-reliability"),

  // Trauma measurements
  rel("bohler-angle", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("gissane-angle", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("baumann-angle", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("anterior-humeral-line", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("radiocapitellar-line", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("ulnar-variance", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("volar-tilt", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("radial-inclination", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("radial-height", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("tibiofibular-overlap", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("tibiofibular-clear-space", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("medial-clear-space", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("mechanical-axis", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("alignment-measurements", "prerequisite_for", "trauma-radiographic-measurements"),
  rel("bohler-angle", "involves_anatomy", "calcaneus"),
  rel("gissane-angle", "involves_anatomy", "calcaneus"),
  rel("baumann-angle", "involves_anatomy", "distal-humerus"),
  rel("anterior-humeral-line", "involves_anatomy", "distal-humerus"),
  rel("radiocapitellar-line", "involves_anatomy", "distal-humerus"),
  rel("ulnar-variance", "involves_anatomy", "hand-wrist-anatomy-hub"),
  rel("volar-tilt", "involves_anatomy", "hand-wrist-anatomy-hub"),
  rel("radial-inclination", "involves_anatomy", "hand-wrist-anatomy-hub"),
  rel("radial-height", "involves_anatomy", "hand-wrist-anatomy-hub"),
  rel("mechanical-axis", "involves_anatomy", "hip-joint"),
  rel("mechanical-axis", "involves_anatomy", "distal-femur"),
  rel("mechanical-axis-knee", "prerequisite_for", "mechanical-axis"),
  rel("lateral-radiograph", "prerequisite_for", "bohler-angle"),
  rel("lateral-radiograph", "prerequisite_for", "volar-tilt"),
  rel("mortise-view-ankle", "prerequisite_for", "medial-clear-space"),
  rel("mortise-view-ankle", "prerequisite_for", "tibiofibular-clear-space"),
  rel("ap-radiograph", "prerequisite_for", "tibiofibular-overlap"),
  rel("full-length-alignment-radiographs", "prerequisite_for", "mechanical-axis"),
  rel("bohler-angle", "commonly_confused_with", "gissane-angle"),
  rel("gissane-angle", "commonly_confused_with", "bohler-angle"),
  rel("tibiofibular-overlap", "commonly_confused_with", "tibiofibular-clear-space"),
  rel("tibiofibular-clear-space", "commonly_confused_with", "tibiofibular-overlap"),
  rel("radial-height", "commonly_confused_with", "radial-height-loss"),
  rel("decreased-bohler-angle", "explains_instability", "bohler-angle"),
  rel("widened-medial-clear-space", "explains_instability", "medial-clear-space"),
  rel("widened-tibiofibular-clear-space", "explains_instability", "tibiofibular-clear-space"),
  rel("dorsal-angulation-distal-radius", "explains_instability", "volar-tilt"),

  // Sports
  rel("insall-salvati-ratio", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("caton-deschamps-index", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("tt-tg-distance", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("alpha-angle-hip", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("lateral-center-edge-angle", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("tonnis-angle", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("acromiohumeral-interval", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("critical-shoulder-angle", "prerequisite_for", "sports-medicine-radiographic-measurements"),
  rel("insall-salvati-ratio", "involves_anatomy", "patella"),
  rel("caton-deschamps-index", "involves_anatomy", "patella"),
  rel("tt-tg-distance", "involves_anatomy", "patella"),
  rel("tt-tg-distance", "involves_anatomy", "distal-femur"),
  rel("alpha-angle-hip", "involves_anatomy", "femoral-neck"),
  rel("alpha-angle-hip", "involves_anatomy", "femoral-head"),
  rel("lateral-center-edge-angle", "involves_anatomy", "acetabulum"),
  rel("lateral-center-edge-angle", "involves_anatomy", "femoral-head"),
  rel("tonnis-angle", "involves_anatomy", "acetabulum"),
  rel("acromiohumeral-interval", "involves_anatomy", "proximal-humerus"),
  rel("critical-shoulder-angle", "involves_anatomy", "proximal-humerus"),
  rel("lateral-radiograph", "prerequisite_for", "insall-salvati-ratio"),
  rel("lateral-radiograph", "prerequisite_for", "caton-deschamps-index"),
  rel("ct-musculoskeletal-imaging", "prerequisite_for", "tt-tg-distance"),
  rel("mri-musculoskeletal-imaging", "prerequisite_for", "tt-tg-distance"),
  rel("mri-musculoskeletal-imaging", "prerequisite_for", "alpha-angle-hip"),
  rel("ap-radiograph", "prerequisite_for", "lateral-center-edge-angle"),
  rel("ap-radiograph", "prerequisite_for", "tonnis-angle"),
  rel("ap-radiograph", "prerequisite_for", "acromiohumeral-interval"),
  rel("ap-radiograph", "prerequisite_for", "critical-shoulder-angle"),
  rel("insall-salvati-ratio", "commonly_confused_with", "caton-deschamps-index"),
  rel("caton-deschamps-index", "commonly_confused_with", "insall-salvati-ratio"),
  rel("patella-alta", "explains_instability", "insall-salvati-ratio"),
  rel("cam-morphology-alpha-angle", "explains_instability", "alpha-angle-hip"),
  rel("acetabular-undercoverage", "explains_instability", "lateral-center-edge-angle"),
  rel("superior-humeral-migration", "explains_instability", "acromiohumeral-interval"),

  // Adult reconstruction
  rel("leg-length-discrepancy-radiographic", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("femoral-offset", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("cup-inclination", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("cup-anteversion", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("hip-center-restoration", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("mechanical-alignment-arthroplasty", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("joint-line-restoration", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("coronal-alignment-measurements", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("mechanical-axis", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("mechanical-axis-knee", "prerequisite_for", "adult-reconstruction-radiographic-measurements"),
  rel("leg-length-discrepancy-radiographic", "involves_anatomy", "pelvis"),
  rel("femoral-offset", "involves_anatomy", "femoral-head"),
  rel("femoral-offset", "involves_anatomy", "femoral-neck"),
  rel("cup-inclination", "involves_anatomy", "acetabulum"),
  rel("cup-anteversion", "involves_anatomy", "acetabulum"),
  rel("hip-center-restoration", "involves_anatomy", "hip-joint"),
  rel("joint-line-restoration", "involves_anatomy", "distal-femur"),
  rel("full-length-alignment-radiographs", "prerequisite_for", "coronal-alignment-measurements"),
  rel("full-length-alignment-radiographs", "prerequisite_for", "mechanical-alignment-arthroplasty"),
  rel("ct-musculoskeletal-imaging", "prerequisite_for", "cup-anteversion"),

  // Spine
  rel("cobb-angle", "prerequisite_for", "spine-radiographic-measurements"),
  rel("pelvic-incidence", "prerequisite_for", "spine-radiographic-measurements"),
  rel("pelvic-tilt-spinopelvic", "prerequisite_for", "spine-radiographic-measurements"),
  rel("sacral-slope", "prerequisite_for", "spine-radiographic-measurements"),
  rel("sagittal-vertical-axis", "prerequisite_for", "spine-radiographic-measurements"),
  rel("cervical-sagittal-alignment", "prerequisite_for", "spine-radiographic-measurements"),
  rel("coronal-balance-spine", "prerequisite_for", "spine-radiographic-measurements"),
  rel("pelvic-incidence", "involves_anatomy", "pelvis"),
  rel("pelvic-tilt-spinopelvic", "involves_anatomy", "pelvis"),
  rel("sacral-slope", "involves_anatomy", "pelvis"),
  rel("standing-spine-radiographs", "prerequisite_for", "cobb-angle"),
  rel("standing-spine-radiographs", "prerequisite_for", "sagittal-vertical-axis"),
  rel("standing-spine-radiographs", "prerequisite_for", "coronal-balance-spine"),
  rel("standing-spine-radiographs", "prerequisite_for", "pelvic-incidence"),
  rel("pelvic-incidence", "commonly_confused_with", "pelvic-tilt-spinopelvic"),
  rel("pelvic-tilt-spinopelvic", "commonly_confused_with", "pelvic-incidence"),
  rel("sacral-slope", "commonly_confused_with", "pelvic-tilt-spinopelvic"),
  rel("spinopelvic-mismatch", "explains_instability", "pelvic-incidence"),

  // Pediatrics
  rel("klein-line", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("migration-percentage", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("acetabular-index", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("center-edge-angle-pediatric", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("growth-plate-relationships", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("baumann-angle", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("anterior-humeral-line", "prerequisite_for", "pediatric-radiographic-measurements"),
  rel("klein-line", "involves_anatomy", "femoral-neck"),
  rel("klein-line", "involves_anatomy", "femoral-head"),
  rel("migration-percentage", "involves_anatomy", "femoral-head"),
  rel("migration-percentage", "involves_anatomy", "acetabulum"),
  rel("acetabular-index", "involves_anatomy", "acetabulum"),
  rel("acetabular-index", "involves_anatomy", "pelvis"),
  rel("center-edge-angle-pediatric", "involves_anatomy", "acetabulum"),
  rel("center-edge-angle-pediatric", "involves_anatomy", "femoral-head"),
  rel("growth-plate-relationships", "involves_anatomy", "distal-humerus"),
  rel("ap-radiograph", "prerequisite_for", "klein-line"),
  rel("ap-radiograph", "prerequisite_for", "migration-percentage"),
  rel("ap-radiograph", "prerequisite_for", "acetabular-index"),
  rel("lateral-center-edge-angle", "commonly_confused_with", "center-edge-angle-pediatric"),
  rel("center-edge-angle-pediatric", "commonly_confused_with", "lateral-center-edge-angle"),
  rel("positive-klein-line", "explains_instability", "klein-line"),
  rel("comparison-views", "prerequisite_for", "baumann-angle"),
  rel("comparison-views", "prerequisite_for", "klein-line"),
];

const relationshipByKey = new Map<string, PilotRelationshipSpec>();
for (const item of [...REUSED_ANATOMY_RELATIONSHIPS, ...IMAGING_SPECIFIC_RELATIONSHIPS]) {
  const key = `${item.subjectSlug}|${item.predicate}|${item.objectSlug}`;
  if (!relationshipByKey.has(key)) relationshipByKey.set(key, item);
}
export const IMAGING_MEASUREMENTS_RELATIONSHIPS = [...relationshipByKey.values()];

export function activeImagingMeasurementsRelationships(): PilotRelationshipSpec[] {
  return IMAGING_MEASUREMENTS_RELATIONSHIPS.filter((relationship) => !relationship.metadata?.disabled);
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
  sourceNote: "Imaging & Radiographic Measurements manufacture; numeric thresholds require human review; pediatric/spine thresholds require specialist review",
  contextRelevance,
});

export const IMAGING_MEASUREMENTS_CLAIM_DRAFTS: PilotClaimDraft[] = [
  claim("claim-irm-orthogonal", "imaging_point", "Obtain adequate orthogonal radiographs before escalating to advanced imaging when the clinical question is osseous alignment or fracture pattern.", "standard-radiographic-views", "L1", ["call", "clinic", "oite"]),
  claim("claim-irm-weight-bearing", "imaging_point", "Weight-bearing radiographs answer functional alignment questions that non-weight-bearing studies can understate.", "weight-bearing-radiographs", "L1", ["clinic", "oite", "recon"]),
  claim("claim-irm-stress", "imaging_point", "Stress radiographs are reserved for dynamic instability questions not answered by static views.", "stress-radiographs", "L2", ["call", "sports"]),
  claim("claim-irm-escalation", "fact", "Imaging escalation is driven by the unresolved clinical question, not by modality availability alone.", "imaging-escalation-pathway", "L1", ["call", "clinic", "oite"]),
  claim("claim-irm-ct", "fact", "CT is used for multiplanar osseous mapping and measurement when radiographs incompletely define articular or complex fracture morphology.", "ct-musculoskeletal-imaging", "L1", ["call", "or", "oite"]),
  claim("claim-irm-mri", "fact", "MRI is preferred when soft-tissue, cartilage, marrow, or neural integrity changes management.", "mri-musculoskeletal-imaging", "L1", ["clinic", "sports", "oite"]),
  claim("claim-irm-bohler", "imaging_point", "Böhler angle is measured on a true lateral hindfoot radiograph and reduced values support calcaneal compression assessment.", "bohler-angle", "L1", ["trauma", "oite", "caseprep"]),
  claim("claim-irm-gissane", "imaging_point", "Gissane angle complements Böhler angle for posterior facet geometry and should not be used interchangeably.", "gissane-angle", "L2", ["trauma", "oite"]),
  claim("claim-irm-ahl", "imaging_point", "On a true lateral pediatric elbow radiograph, the anterior humeral line relationship to the capitellum screens extension-type supracondylar displacement.", "anterior-humeral-line", "L1", ["peds", "call", "oite"]),
  claim("claim-irm-rcl", "board_trap", "The radiocapitellar line should intersect the capitellum on both AP and lateral views; a normal relationship on one view does not exclude dislocation.", "radiocapitellar-line", "L1", ["peds", "call", "oite"]),
  claim("claim-irm-dr-params", "imaging_point", "Distal radius radiographic assessment includes volar tilt, radial inclination, radial height, and ulnar variance with technique-matched normals.", "volar-tilt", "L1", ["trauma", "hand", "oite"]),
  claim("claim-irm-mortise", "imaging_point", "Ankle mortise interpretation includes medial clear space, tibiofibular clear space, and tibiofibular overlap using consistent landmarks.", "medial-clear-space", "L1", ["trauma", "call", "oite"]),
  claim("claim-irm-is-cd", "imaging_point", "Patellar height ratios are method-specific; Insall-Salvati and Caton-Deschamps are not interchangeable without stating the method.", "insall-salvati-ratio", "L1", ["sports", "oite"]),
  claim("claim-irm-tttg", "imaging_point", "TT-TG distance requires standardized axial landmarks and should be interpreted with trochlear morphology and soft-tissue stabilizers.", "tt-tg-distance", "L1", ["sports", "oite"]),
  claim("claim-irm-alpha", "imaging_point", "Alpha angle thresholds are plane- and source-dependent; report the imaging plane with the numeric value.", "alpha-angle-hip", "L1", ["sports", "oite"]),
  claim("claim-irm-lcea", "imaging_point", "Lateral center-edge and Tönnis angles describe acetabular coverage and inclination and must use a standardized AP pelvis.", "lateral-center-edge-angle", "L1", ["sports", "recon", "oite"]),
  claim("claim-irm-ahi", "imaging_point", "Reduced acromiohumeral interval supports superior humeral migration and massive cuff deficiency assessment, not isolated impingement diagnosis.", "acromiohumeral-interval", "L2", ["sports", "oite"]),
  claim("claim-irm-tha", "imaging_point", "THA radiographic quality metrics include cup inclination, cup anteversion, offset, hip center, and leg-length relationships.", "cup-inclination", "L1", ["recon", "oite"]),
  claim("claim-irm-tka-align", "imaging_point", "Mechanical alignment targets are planning philosophies; report the reference axis and component corridor used.", "mechanical-alignment-arthroplasty", "L1", ["recon", "oite"]),
  claim("claim-irm-cobb", "imaging_point", "Cobb angle requires identifiable end vertebrae on a standing radiograph and remains a draft threshold until specialist review.", "cobb-angle", "L1", ["spine", "peds", "oite"]),
  claim("claim-irm-pi", "fact", "Pelvic incidence is a morphologic constant that frames pelvic tilt and sacral slope relationships in sagittal analysis.", "pelvic-incidence", "L1", ["spine", "oite"]),
  claim("claim-irm-sva", "imaging_point", "Sagittal vertical axis quantifies global sagittal alignment and must be age-contextualized before treatment thresholds are applied.", "sagittal-vertical-axis", "L1", ["spine", "oite"]),
  claim("claim-irm-klein", "board_trap", "A Klein line that misses the epiphysis is concerning for SCFE, but a normal Klein line does not exclude mild slip; use frog-lateral comparison.", "klein-line", "L1", ["peds", "call", "oite"]),
  claim("claim-irm-ai", "imaging_point", "Acetabular index norms are age-dependent; adult center-edge thresholds must not be applied to infants without adjustment.", "acetabular-index", "L1", ["peds", "oite"]),
  claim("claim-irm-reliability", "fact", "Quantitative thresholds require units, population context, measurement method, and source version before publication.", "imaging-measurement-reliability", "L1", ["oite", "brobot", "caseprep"]),
  claim("claim-irm-pitfalls", "cognitive_trap", "Projection error, rotation, and nonstandard landmarks are common causes of false-positive measurement abnormalities.", "measurement-pitfalls", "L1", ["call", "oite", "caseprep"]),
  claim("claim-irm-treatment", "clinical_script", "State how each abnormal measurement changes the immediate plan: observe, protect, reduce, image further, or operate.", "imaging-to-treatment-relationship", "L1", ["call", "caseprep", "brobot"]),
  claim("claim-irm-comparison", "fact", "Comparison views establish patient-specific normals for pediatric angles and subtle side-to-side asymmetry.", "comparison-views", "L2", ["peds", "call"]),
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
  sourceNote: "Imaging & Radiographic Measurements manufacture; thresholds and pediatric/spine routes require specialist/human review",
  requiresAttendingReview,
});

export const IMAGING_MEASUREMENTS_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  decisionPoint(
    "dp-irm-inadequate-views",
    "standard-radiographic-views",
    "imaging_adequacy",
    "Key anatomy is rotated, truncated, or not profiled on the initial radiographs",
    "Repeat orthogonal or indicated special views before definitive measurement or disposition",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-escalate-ct",
    "imaging-escalation-pathway",
    "modality_escalation",
    "Radiographs leave articular surface, column, or multiplanar morphology unresolved and management depends on that detail",
    "Escalate to CT with multiplanar reconstruction and document the unanswered clinical question",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-escalate-mri",
    "mri-musculoskeletal-imaging",
    "modality_escalation",
    "Soft-tissue, cartilage, neural, or occult injury findings would change immobilization, surgery, or clearance",
    "Obtain MRI when safe and available; do not delay limb- or cord-threatening care for elective advanced imaging",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-bohler",
    "bohler-angle",
    "measurement_threshold",
    "True lateral hindfoot radiograph shows a decreased Böhler angle after calcaneal injury",
    "Treat as evidence of calcaneal compression; complete hindfoot series/CT as indicated and route numeric threshold confirmation to human review",
    "urgent",
    "moderate"
  ),
  decisionPoint(
    "dp-irm-mortise",
    "medial-clear-space",
    "measurement_threshold",
    "Mortise radiograph shows widened medial clear space or syndesmotic parameters outside method-specific norms",
    "Protect the ankle, consider stress views or advanced imaging, and escalate for instability management after threshold review",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-dr-instability",
    "volar-tilt",
    "measurement_threshold",
    "Distal radius parameters show dorsal angulation, height loss, or inclination change beyond accepted draft thresholds",
    "Assess stability criteria, obtain comparison/post-reduction films, and route numeric cutoffs to human review before publication",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-ahl",
    "anterior-humeral-line",
    "pediatric_threshold",
    "Pediatric lateral elbow radiograph shows anterior humeral line not intersecting the expected capitellar third",
    "Treat as potential extension-type displacement, obtain adequate orthogonal views, and route to pediatric specialist review for threshold confirmation",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-klein",
    "klein-line",
    "pediatric_threshold",
    "Klein line fails to intersect the lateral femoral epiphysis or frog-lateral comparison is concerning for SCFE",
    "Make the patient non-weight-bearing, obtain indicated orthogonal/frog-lateral imaging, and escalate urgently with pediatric specialist review",
    "emergent",
    "emergency"
  ),
  decisionPoint(
    "dp-irm-ddh",
    "acetabular-index",
    "pediatric_threshold",
    "Age-adjusted acetabular index or migration percentage exceeds draft surveillance thresholds",
    "Continue hip surveillance pathway and route all pediatric numeric thresholds to specialist review before treatment decisions are published",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-irm-tttg",
    "tt-tg-distance",
    "measurement_threshold",
    "Axial CT/MRI TT-TG exceeds draft method-specific risk thresholds in a patellar instability evaluation",
    "Interpret with trochlear dysplasia and soft-tissue factors; keep numeric cutoff under human review",
    "routine",
    "moderate"
  ),
  decisionPoint(
    "dp-irm-lcea",
    "lateral-center-edge-angle",
    "measurement_threshold",
    "AP pelvis shows reduced lateral center-edge angle or elevated Tönnis angle suggesting undercoverage",
    "Correlate with clinical impingement/instability exam and keep coverage thresholds under human review",
    "routine",
    "moderate"
  ),
  decisionPoint(
    "dp-irm-cup",
    "cup-inclination",
    "measurement_threshold",
    "Postoperative THA radiographs show cup inclination or anteversion outside the planned corridor",
    "Assess dislocation risk factors, obtain dedicated version imaging if needed, and keep safe-zone numbers under attending review",
    "urgent",
    "high"
  ),
  decisionPoint(
    "dp-irm-cobb",
    "cobb-angle",
    "spine_threshold",
    "Standing spine radiograph demonstrates a curve magnitude near observation-versus-treatment draft thresholds",
    "Confirm end vertebrae, technique, and age context; route all spine thresholds to specialist review",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-irm-sva",
    "sagittal-vertical-axis",
    "spine_threshold",
    "Global sagittal parameters show positive sagittal imbalance relevant to reconstructive planning",
    "Complete spinopelvic set (PI, PT, SS, SVA) and require spine specialist review before publishing numeric targets",
    "routine",
    "high"
  ),
  decisionPoint(
    "dp-irm-pitfall",
    "measurement-pitfalls",
    "measurement_validity",
    "Measurement appears abnormal but projection, rotation, or landmark selection is nonstandard",
    "Reject the numeric result, repeat standardized imaging, and document why the measurement is invalid",
    "urgent",
    "moderate"
  ),
];
