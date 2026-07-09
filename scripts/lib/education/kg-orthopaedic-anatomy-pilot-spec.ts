/**
 * Canonical Orthopaedic Anatomy knowledge neighborhood.
 *
 * Manufacturing seed consumed by the existing Knowledge Factory. It consolidates
 * the factory's shared anatomy inventories and adds the spine, surgical-access,
 * developmental, imaging, and surface-anatomy backbone needed across specialties.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";
import { UE_SHARED_ANATOMY_ENTITIES, UE_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-upper-extremity-shared-anatomy.ts";
import { LE_SHARED_ANATOMY_ENTITIES, LE_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-lower-extremity-shared-anatomy.ts";
import { HAND_WRIST_SHARED_ANATOMY_ENTITIES, HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-hand-wrist-shared-anatomy.ts";
import { SPORTS_SHARED_ANATOMY_ENTITIES, SPORTS_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-sports-medicine-shared-anatomy.ts";
import { HIP_SHARED_ANATOMY_ENTITIES, HIP_SHARED_ANATOMY_RELATIONSHIPS } from "./kg-hip-shared-anatomy.ts";

export const ORTHOPAEDIC_ANATOMY_PILOT_KEY = "orthopaedic-anatomy-neighborhood" as const;
export const ORTHOPAEDIC_ANATOMY_SOURCE_IDS = {
  curriculumNodeSlug: "orthopaedic-anatomy",
  prepareTopicId: "orthopaedic-anatomy",
  casePrepSlug: "orthopaedic-anatomy",
} as const;
export const ORTHOPAEDIC_ANATOMY_ASSET_COUNTS = {
  ankiCardMappings: 0,
  orthobulletsQuestionMappings: 0,
} as const;

const anatomy = (
  slug: string,
  preferredLabel: string,
  anatomyKind: string,
  region: string,
  description: string,
  metadata: Record<string, unknown> = {}
): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel,
  description,
  metadata: {
    pilot: ORTHOPAEDIC_ANATOMY_PILOT_KEY,
    neighborhood: "orthopaedic-anatomy",
    anatomy_kind: anatomyKind,
    hierarchy_level: "structure",
    region,
    reusable: true,
    ...metadata,
  },
});

const SUPPLEMENTAL_ENTITIES: PilotEntitySpec[] = [
  anatomy("orthopaedic-anatomy", "Orthopaedic Anatomy", "composite", "whole_body", "Canonical structural backbone spanning appendicular, axial, neurovascular, developmental, imaging, and surgical anatomy."),
  anatomy("upper-extremity-anatomy", "Upper Extremity Anatomy", "regional_module", "upper_extremity", "Canonical shoulder-to-hand regional anatomy module."),
  anatomy("lower-extremity-anatomy", "Lower Extremity Anatomy", "regional_module", "lower_extremity", "Canonical pelvis-to-foot regional anatomy module."),
  anatomy("spine-anatomy", "Spine Anatomy", "regional_module", "spine", "Canonical cervical, thoracic, lumbar, sacral, neural, and stabilizing anatomy module."),
  anatomy("pelvis-anatomy", "Pelvis Anatomy", "regional_module", "pelvis", "Canonical osseous, ligamentous, muscular, and neurovascular pelvic anatomy module."),
  anatomy("neurovascular-anatomy", "Neurovascular Anatomy", "regional_module", "whole_body", "Canonical peripheral nerve, plexus, arterial, venous, and vascular-territory module."),
  anatomy("surgical-anatomy", "Surgical Anatomy", "regional_module", "whole_body", "Canonical intervals, internervous planes, safe zones, and surface landmarks."),
  anatomy("developmental-anatomy", "Developmental Anatomy", "regional_module", "whole_body", "Canonical physes, ossification centers, and age-dependent skeletal anatomy."),
  anatomy("cervical-spine", "Cervical Spine", "bone", "spine", "Seven mobile vertebrae supporting the head and protecting the cervical spinal cord."),
  anatomy("thoracic-spine", "Thoracic Spine", "bone", "spine", "Twelve rib-bearing vertebrae forming the thoracic spinal column."),
  anatomy("lumbar-spine", "Lumbar Spine", "bone", "spine", "Five load-bearing vertebrae between the thoracic spine and sacrum."),
  anatomy("sacrum", "Sacrum", "bone", "pelvis", "Fused sacral vertebrae transmitting axial load to the pelvic ring."),
  anatomy("vertebral-body", "Vertebral Body", "bone", "spine", "Anterior load-bearing component of a vertebra."),
  anatomy("pedicle", "Pedicle", "bone", "spine", "Bridge between vertebral body and posterior elements; key screw corridor."),
  anatomy("lamina", "Lamina", "bone", "spine", "Posterior element forming the dorsal wall of the spinal canal."),
  anatomy("facet-joint", "Facet Joint", "joint", "spine", "Paired zygapophyseal articulation guiding segmental motion."),
  anatomy("intervertebral-disc", "Intervertebral Disc", "cartilage", "spine", "Fibrocartilaginous motion-segment structure comprising annulus and nucleus."),
  anatomy("annulus-fibrosus", "Annulus Fibrosus", "cartilage", "spine", "Lamellar outer portion of an intervertebral disc."),
  anatomy("nucleus-pulposus", "Nucleus Pulposus", "cartilage", "spine", "Gelatinous central portion of an intervertebral disc."),
  anatomy("spinal-canal", "Spinal Canal", "safe_zone", "spine", "Osseoligamentous canal containing the spinal cord and cauda equina."),
  anatomy("spinal-cord", "Spinal Cord", "nerve", "spine", "Central neural structure extending from the brainstem to the conus medullaris."),
  anatomy("conus-medullaris", "Conus Medullaris", "nerve", "spine", "Tapered caudal end of the spinal cord."),
  anatomy("cauda-equina", "Cauda Equina", "nerve", "spine", "Lumbar and sacral nerve roots descending below the conus."),
  anatomy("exiting-nerve-root", "Exiting Nerve Root", "nerve", "spine", "Root leaving through the corresponding neural foramen."),
  anatomy("traversing-nerve-root", "Traversing Nerve Root", "nerve", "spine", "Root crossing the lateral recess before exiting at the next level."),
  anatomy("anterior-longitudinal-ligament", "Anterior Longitudinal Ligament", "ligament", "spine", "Longitudinal stabilizer along anterior vertebral bodies."),
  anatomy("posterior-longitudinal-ligament", "Posterior Longitudinal Ligament", "ligament", "spine", "Longitudinal stabilizer along posterior vertebral bodies."),
  anatomy("ligamentum-flavum", "Ligamentum Flavum", "ligament", "spine", "Elastic ligament connecting adjacent laminae."),
  anatomy("vertebral-artery", "Vertebral Artery", "vessel", "spine", "Artery traversing cervical transverse foramina toward the posterior circulation."),
  anatomy("brachial-plexus", "Brachial Plexus", "nerve", "upper_extremity", "C5-T1 neural network supplying the upper extremity."),
  anatomy("lumbosacral-plexus", "Lumbosacral Plexus", "nerve", "pelvis", "Lumbar and sacral neural network supplying the pelvis and lower extremity."),
  anatomy("femoral-triangle", "Femoral Triangle", "safe_zone", "hip", "Anterior thigh interval containing femoral nerve, artery, vein, and lymphatics."),
  anatomy("popliteal-fossa", "Popliteal Fossa", "safe_zone", "knee", "Posterior knee space containing tibial nerve and popliteal vessels."),
  anatomy("carpal-tunnel", "Carpal Tunnel", "compartment", "wrist", "Volar fibro-osseous canal containing median nerve and flexor tendons."),
  anatomy("cubital-tunnel", "Cubital Tunnel", "compartment", "elbow", "Posteromedial elbow tunnel transmitting the ulnar nerve."),
  anatomy("leg-anterior-compartment", "Anterior Compartment of Leg", "compartment", "leg", "Dorsiflexor compartment supplied by deep fibular nerve and anterior tibial artery."),
  anatomy("leg-lateral-compartment", "Lateral Compartment of Leg", "compartment", "leg", "Evertor compartment supplied by superficial fibular nerve."),
  anatomy("leg-superficial-posterior-compartment", "Superficial Posterior Compartment of Leg", "compartment", "leg", "Plantarflexor compartment containing gastrocnemius and soleus."),
  anatomy("leg-deep-posterior-compartment", "Deep Posterior Compartment of Leg", "compartment", "leg", "Deep flexor compartment containing tibial nerve and posterior tibial vessels."),
  anatomy("hand-thenar-compartment", "Thenar Compartment", "compartment", "hand", "Fascial compartment containing thenar musculature."),
  anatomy("hand-midpalmar-compartment", "Midpalmar Compartment", "compartment", "hand", "Central deep hand fascial compartment."),
  anatomy("deltopectoral-interval", "Deltopectoral Interval", "surgical_interval", "shoulder", "Anterior shoulder interval between deltoid and pectoralis major."),
  anatomy("henry-interval", "Henry Interval", "internervous_plane", "forearm", "Volar forearm approach plane using radial and median nerve territories."),
  anatomy("kocher-interval", "Kocher Interval", "internervous_plane", "elbow", "Lateral elbow interval between anconeus and extensor carpi ulnaris."),
  anatomy("kaplan-interval", "Kaplan Interval", "internervous_plane", "elbow", "Lateral elbow interval between extensor digitorum communis and extensor carpi radialis brevis."),
  anatomy("smith-petersen-interval", "Smith-Petersen Interval", "internervous_plane", "hip", "Anterior hip interval between sartorius and tensor fasciae latae."),
  anatomy("watson-jones-interval", "Watson-Jones Interval", "internervous_plane", "hip", "Anterolateral hip interval between tensor fasciae latae and gluteus medius."),
  anatomy("knee-medial-parapatellar-interval", "Medial Parapatellar Interval", "surgical_interval", "knee", "Common knee arthrotomy along the medial patella and quadriceps tendon."),
  anatomy("safe-zone-radial-nerve-humerus", "Radial Nerve Humeral Safe Zone", "safe_zone", "arm", "Operative corridor defined by predictable radial nerve relationships to the humerus."),
  anatomy("safe-zone-common-fibular-nerve", "Common Fibular Nerve Safe Zone", "safe_zone", "knee", "Operative corridor protecting the common fibular nerve around the fibular neck."),
  anatomy("quadrilateral-space", "Quadrilateral Space", "safe_zone", "shoulder", "Space transmitting axillary nerve and posterior circumflex humeral artery."),
  anatomy("femoral-head-blood-supply", "Femoral Head Blood Supply", "vascular_territory", "hip", "Predominantly retinacular perfusion from the medial femoral circumflex artery."),
  anatomy("talus-blood-supply", "Talus Blood Supply", "vascular_territory", "ankle", "Anastomotic talar perfusion vulnerable to neck displacement."),
  anatomy("scaphoid-blood-supply", "Scaphoid Blood Supply", "vascular_territory", "wrist", "Predominantly retrograde dorsal carpal perfusion of the proximal pole."),
  anatomy("humeral-head-blood-supply", "Humeral Head Blood Supply", "vascular_territory", "shoulder", "Circumflex humeral arterial contributions to the proximal humerus."),
  anatomy("physis", "Physis", "physis", "developmental", "Cartilaginous growth plate between epiphysis and metaphysis."),
  anatomy("epiphysis", "Epiphysis", "bone", "developmental", "End segment of a developing long bone adjacent to the physis."),
  anatomy("metaphysis", "Metaphysis", "bone", "developmental", "Flared long-bone segment between physis and diaphysis."),
  anatomy("primary-ossification-center", "Primary Ossification Center", "ossification_center", "developmental", "Initial diaphyseal site of endochondral ossification."),
  anatomy("secondary-ossification-center", "Secondary Ossification Center", "ossification_center", "developmental", "Epiphyseal or apophyseal site of postnatal ossification."),
  anatomy("elbow-ossification-centers", "Elbow Ossification Centers", "ossification_center", "elbow", "Capitellum, radial head, medial epicondyle, trochlea, olecranon, and lateral epicondyle sequence."),
  anatomy("triradiate-cartilage", "Triradiate Cartilage", "physis", "pelvis", "Y-shaped acetabular growth cartilage joining ilium, ischium, and pubis."),
  anatomy("articular-cartilage", "Articular Cartilage", "cartilage", "joint", "Hyaline cartilage covering synovial joint surfaces."),
  anatomy("subchondral-bone", "Subchondral Bone", "bone", "joint", "Bone plate and trabecular region immediately deep to articular cartilage."),
  anatomy("joint-capsule", "Joint Capsule", "ligament", "joint", "Fibrous and synovial enclosure of a synovial joint."),
  anatomy("deforming-forces", "Deforming Forces", "biomechanics", "whole_body", "Muscle and soft-tissue vectors that predict displacement of fractures or reconstructions."),
  anatomy("surface-anatomy-landmarks", "Surface Anatomy Landmarks", "surface_landmark", "whole_body", "Palpable landmarks used for examination, imaging localization, and surgical access."),
  anatomy("radiographic-anatomy-landmarks", "Imaging Anatomy Landmarks", "imaging_landmark", "whole_body", "Canonical radiographic, CT, MRI, and ultrasound landmarks."),
];

const canonicalBySlug = new Map<string, PilotEntitySpec>();
for (const item of [
  ...SUPPLEMENTAL_ENTITIES,
  ...UE_SHARED_ANATOMY_ENTITIES,
  ...LE_SHARED_ANATOMY_ENTITIES,
  ...HAND_WRIST_SHARED_ANATOMY_ENTITIES,
  ...SPORTS_SHARED_ANATOMY_ENTITIES,
  ...HIP_SHARED_ANATOMY_ENTITIES,
]) {
  if (!canonicalBySlug.has(item.slug)) {
    canonicalBySlug.set(item.slug, {
      ...item,
      metadata: { ...item.metadata, canonical_owner: ORTHOPAEDIC_ANATOMY_PILOT_KEY, reusable: true },
    });
  }
}
export const ORTHOPAEDIC_ANATOMY_ENTITIES = [...canonicalBySlug.values()];

const rel = (subjectSlug: string, predicate: string, objectSlug: string, metadata: Record<string, unknown> = {}): PilotRelationshipSpec => ({
  subjectSlug,
  predicate,
  objectSlug,
  metadata: { context_relevance: ["clinic", "or", "oite", "caseprep", "brobot"], reusable: true, ...metadata },
});

const MODULE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("upper-extremity-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("lower-extremity-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("spine-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("pelvis-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("neurovascular-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("surgical-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("developmental-anatomy", "part_of", "orthopaedic-anatomy"),
  rel("cervical-spine", "part_of", "spine-anatomy"),
  rel("thoracic-spine", "part_of", "spine-anatomy"),
  rel("lumbar-spine", "part_of", "spine-anatomy"),
  rel("sacrum", "part_of", "pelvis-anatomy"),
  rel("vertebral-body", "part_of", "spine-anatomy"),
  rel("pedicle", "part_of", "spine-anatomy"),
  rel("lamina", "part_of", "spine-anatomy"),
  rel("facet-joint", "part_of", "spine-anatomy"),
  rel("annulus-fibrosus", "part_of", "intervertebral-disc"),
  rel("nucleus-pulposus", "part_of", "intervertebral-disc"),
  rel("spinal-cord", "part_of", "spine-anatomy"),
  rel("cauda-equina", "part_of", "neurovascular-anatomy"),
  rel("brachial-plexus", "part_of", "neurovascular-anatomy"),
  rel("lumbosacral-plexus", "part_of", "neurovascular-anatomy"),
  rel("deltopectoral-interval", "part_of", "surgical-anatomy"),
  rel("henry-interval", "part_of", "surgical-anatomy"),
  rel("kocher-interval", "part_of", "surgical-anatomy"),
  rel("kaplan-interval", "part_of", "surgical-anatomy"),
  rel("smith-petersen-interval", "part_of", "surgical-anatomy"),
  rel("watson-jones-interval", "part_of", "surgical-anatomy"),
  rel("physis", "part_of", "developmental-anatomy"),
  rel("primary-ossification-center", "part_of", "developmental-anatomy"),
  rel("secondary-ossification-center", "part_of", "developmental-anatomy"),
  rel("articular-cartilage", "part_of", "orthopaedic-anatomy"),
  rel("radiographic-anatomy-landmarks", "part_of", "orthopaedic-anatomy"),
  rel("surface-anatomy-landmarks", "part_of", "orthopaedic-anatomy"),
  rel("deforming-forces", "part_of", "orthopaedic-anatomy"),
];

const relationshipByKey = new Map<string, PilotRelationshipSpec>();
for (const item of [
  ...MODULE_RELATIONSHIPS,
  ...UE_SHARED_ANATOMY_RELATIONSHIPS,
  ...LE_SHARED_ANATOMY_RELATIONSHIPS,
  ...HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS,
  ...SPORTS_SHARED_ANATOMY_RELATIONSHIPS,
  ...HIP_SHARED_ANATOMY_RELATIONSHIPS,
]) {
  const key = `${item.subjectSlug}|${item.predicate}|${item.objectSlug}`;
  if (!relationshipByKey.has(key)) relationshipByKey.set(key, item);
}
export const ORTHOPAEDIC_ANATOMY_RELATIONSHIPS = [...relationshipByKey.values()];
export function activeOrthopaedicAnatomyRelationships() {
  return ORTHOPAEDIC_ANATOMY_RELATIONSHIPS.filter((item) => !item.metadata?.disabled);
}

const CLAIM_TOPICS = [
  ["spinal-cord", "The spinal cord usually terminates as the conus near L1-L2 in adults; level variation must be respected during neuraxial and spine procedures."],
  ["femoral-head-blood-supply", "The medial femoral circumflex retinacular system is the dominant blood supply to the adult femoral head."],
  ["talus-blood-supply", "Talar perfusion enters largely through the neck and body; displaced neck injuries threaten the body blood supply."],
  ["scaphoid-blood-supply", "The scaphoid proximal pole depends predominantly on retrograde intraosseous flow from dorsal vessels."],
  ["physis", "The physis is mechanically weaker than adjacent pediatric ligaments and is vulnerable to injury."],
  ["deltopectoral-interval", "The cephalic vein marks the deltopectoral interval and may be mobilized medially or laterally."],
  ["kocher-interval", "Forearm pronation moves the posterior interosseous nerve away from the lateral elbow operative field."],
  ["safe-zone-common-fibular-nerve", "The common fibular nerve must be identified and protected where it wraps around the fibular neck."],
  ["deforming-forces", "Predictable muscle vectors explain fracture displacement and guide reduction maneuvers."],
  ["articular-cartilage", "Articular cartilage restoration requires attention to joint congruity and the supporting subchondral bone."],
] as const;

export const ORTHOPAEDIC_ANATOMY_CLAIM_DRAFTS: PilotClaimDraft[] = CLAIM_TOPICS.map(([slug, text], index) => ({
  draftId: `ortho-anatomy-claim-${String(index + 1).padStart(3, "0")}`,
  claimType: "anatomy_pearl",
  claimText: text,
  primaryEntitySlug: slug,
  importanceLevel: index < 5 ? "high" : "medium",
  contentSource: "generated_draft",
  reviewStatus: "needs_review",
  sourceNote: "Orthopaedic Anatomy manufacturing evidence packet",
  contextRelevance: ["clinic", "or", "oite", "caseprep", "brobot"],
}));

export const ORTHOPAEDIC_ANATOMY_DECISION_POINT_DRAFTS: PilotDecisionPointDraft[] = [
  {
    draftId: "ortho-anatomy-dp-001",
    subjectEntitySlug: "safe-zone-radial-nerve-humerus",
    patternType: "safety_escalation",
    trigger: "Operative exposure or implant placement approaches the posterior humeral cortex.",
    action: "Localize and protect the radial nerve using the selected approach and patient-specific anatomy.",
    urgency: "immediate",
    safetyCriticality: "critical",
    requiresAttendingReview: true,
  },
  {
    draftId: "ortho-anatomy-dp-002",
    subjectEntitySlug: "vertebral-artery",
    patternType: "safety_escalation",
    trigger: "Cervical instrumentation or exposure approaches the transverse foramen.",
    action: "Confirm level-specific vascular anatomy and maintain the validated safe corridor.",
    urgency: "immediate",
    safetyCriticality: "critical",
    requiresAttendingReview: true,
  },
  {
    draftId: "ortho-anatomy-dp-003",
    subjectEntitySlug: "physis",
    patternType: "safety_escalation",
    trigger: "Fixation trajectory crosses or approaches an open physis.",
    action: "Use age- and physis-specific fixation strategy with attending confirmation.",
    urgency: "before_procedure",
    safetyCriticality: "high",
    requiresAttendingReview: true,
  },
];
