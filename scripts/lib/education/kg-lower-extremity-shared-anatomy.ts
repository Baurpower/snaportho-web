/**
 * Shared lower-extremity trauma anatomy for the LE trauma cluster.
 * Owned by pelvic-ring-injury pilot; siblings reference these slugs only.
 *
 * Cross-cluster reuse: hip anatomy (kg-hip-shared-anatomy) and leg anatomy
 * (tibial-shaft-fracture pilot) are referenced via sibling helpers — never duplicated.
 */

import type { PilotEntitySpec, PilotRelationshipSpec } from "./kg-ankle-pilot-spec.ts";
import { sharedAnatomyEntitiesForSibling as sharedHipAnatomyEntitiesForSibling } from "./kg-hip-shared-anatomy.ts";

export const LE_SHARED_ANATOMY_PILOT_KEY = "lower-extremity-trauma-cluster-shared" as const;

export const LE_SHARED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "lower-extremity-trauma-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Lower Extremity Trauma Anatomy Hub",
    description: "Composite pelvis-to-foot model linking pelvic ring, knee, leg, and hindfoot structures for trauma neighborhoods.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "lower_extremity",
      pilot: LE_SHARED_ANATOMY_PILOT_KEY,
      cluster: "lower-extremity-trauma",
    },
  },
  {
    slug: "pelvis",
    entityType: "anatomy_structure",
    preferredLabel: "Pelvis",
    description: "Bony pelvic ring formed by ilium, ischium, pubis, and sacrum.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "pelvis", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sacrum",
    entityType: "anatomy_structure",
    preferredLabel: "Sacrum",
    description: "Posterior pelvic anchor articulating with ilia at the sacroiliac joints.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "pelvis", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sacroiliac-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Sacroiliac Joint",
    description: "Posterior pelvic articulation between sacrum and ilium; key pelvic ring stability structure.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "pelvis", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "pubic-symphysis",
    entityType: "anatomy_structure",
    preferredLabel: "Pubic Symphysis",
    description: "Anterior midline pelvic articulation; disruption indicates pelvic ring instability.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "pelvis", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "iliac-wing",
    entityType: "anatomy_structure",
    preferredLabel: "Iliac Wing",
    description: "Lateral pelvic ilium region relevant to acetabular column and pelvic ring injuries.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "pelvis", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "acetabulum",
    entityType: "anatomy_structure",
    preferredLabel: "Acetabulum",
    description: "Hip socket formed by ilium, ischium, and pubis; injured in acetabular fractures.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femoral-diaphysis",
    entityType: "anatomy_structure",
    preferredLabel: "Femoral Diaphysis",
    description: "Femoral shaft between proximal and distal metaphyseal regions.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "thigh", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "distal-femur",
    entityType: "anatomy_structure",
    preferredLabel: "Distal Femur",
    description: "Distal femoral metaphysis and condylar region forming the proximal knee.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "tibial-plateau",
    entityType: "anatomy_structure",
    preferredLabel: "Tibial Plateau",
    description: "Proximal tibial articular surface bearing medial and lateral condylar load.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "patella",
    entityType: "anatomy_structure",
    preferredLabel: "Patella",
    description: "Sesamoid bone within the extensor mechanism at the anterior knee.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "extensor-mechanism",
    entityType: "anatomy_structure",
    preferredLabel: "Knee Extensor Mechanism",
    description: "Quadriceps-patella-tibial tubercle linkage enabling knee extension.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "acl",
    entityType: "anatomy_structure",
    preferredLabel: "Anterior Cruciate Ligament",
    description: "Primary knee stabilizer commonly injured with tibial plateau and knee trauma.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "pcl",
    entityType: "anatomy_structure",
    preferredLabel: "Posterior Cruciate Ligament",
    description: "Posterior knee stabilizer relevant in high-energy knee and plateau injuries.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "popliteal-artery",
    entityType: "anatomy_structure",
    preferredLabel: "Popliteal Artery",
    description: "Major knee-region artery at risk in tibial plateau, distal femur, and knee dislocation trauma.",
    metadata: { anatomy_kind: "vessel", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "common-peroneal-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Common Peroneal Nerve",
    description: "Lateral knee nerve at risk in tibial plateau and proximal fibular injuries.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "knee", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "talus",
    entityType: "anatomy_structure",
    preferredLabel: "Talus",
    description: "Tibiotalar and subtalar articular bone with limited vascular supply.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "ankle", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "calcaneus",
    entityType: "anatomy_structure",
    preferredLabel: "Calcaneus",
    description: "Hindfoot bone articulating with talus at the subtalar joint.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "foot", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "subtalar-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Subtalar Joint",
    description: "Talocalcaneal articulation governing hindfoot alignment after calcaneus and talus injuries.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "foot", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "lisfranc-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Lisfranc Joint",
    description: "Tarsometatarsal articulation complex; instability defines Lisfranc injury.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "foot", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "midfoot",
    entityType: "anatomy_structure",
    preferredLabel: "Midfoot",
    description: "Central foot region including navicular, cuneiforms, and cuboid linking hindfoot to forefoot.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "foot", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "plantar-soft-tissues",
    entityType: "anatomy_structure",
    preferredLabel: "Plantar Soft Tissues",
    description: "Plantar fascia and soft-tissue envelope relevant to calcaneus fracture swelling and wound risk.",
    metadata: { anatomy_kind: "soft_tissue", hierarchy_level: "structure", region: "foot", pilot: LE_SHARED_ANATOMY_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const LE_SHARED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("pelvis", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "pelvic_ring" }),
  rel("sacrum", "part_of", "pelvis", { anatomy_role: "essential", relevance_reason: "posterior_ring" }),
  rel("sacroiliac-joint", "part_of", "pelvis", { anatomy_role: "essential", relevance_reason: "posterior_stability" }),
  rel("pubic-symphysis", "part_of", "pelvis", { anatomy_role: "essential", relevance_reason: "anterior_stability" }),
  rel("iliac-wing", "part_of", "pelvis", { anatomy_role: "essential", relevance_reason: "lateral_pelvis" }),
  rel("acetabulum", "part_of", "iliac-wing", { anatomy_role: "essential", relevance_reason: "hip_socket" }),
  rel("femoral-diaphysis", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "femoral_shaft" }),
  rel("distal-femur", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "knee" }),
  rel("tibial-plateau", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "knee" }),
  rel("patella", "part_of", "extensor-mechanism", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("extensor-mechanism", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "knee" }),
  rel("acl", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "knee_stability" }),
  rel("pcl", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "knee_stability" }),
  rel("popliteal-artery", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "vascular" }),
  rel("common-peroneal-nerve", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("talus", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "ankle" }),
  rel("calcaneus", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "hindfoot" }),
  rel("subtalar-joint", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "hindfoot" }),
  rel("lisfranc-joint", "part_of", "midfoot", { anatomy_role: "essential", relevance_reason: "midfoot_stability" }),
  rel("midfoot", "part_of", "lower-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "foot" }),
  rel("plantar-soft-tissues", "part_of", "calcaneus", { anatomy_role: "supporting", relevance_reason: "soft_tissue_envelope" }),
  rel("talus", "articulates_with", "calcaneus", { anatomy_role: "essential", relevance_reason: "subtalar" }),
  rel("calcaneus", "articulates_with", "subtalar-joint", { anatomy_role: "essential", relevance_reason: "hindfoot" }),
  rel("distal-femur", "articulates_with", "tibial-plateau", { anatomy_role: "essential", relevance_reason: "tibiofemoral" }),
  rel("patella", "articulates_with", "distal-femur", { anatomy_role: "essential", relevance_reason: "patellofemoral" }),
];

/** Sibling LE cluster pilots reference owned shared anatomy without re-creating entities. */
export function sharedLeAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  return LE_SHARED_ANATOMY_ENTITIES.map((entity) => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      shared_reference: true,
      owner_pilot: LE_SHARED_ANATOMY_PILOT_KEY,
      pilot: pilotKey,
    },
  }));
}

/** Reuse hip cluster anatomy slugs (femoral head, neck, trochanters, etc.). */
export function sharedHipAnatomyForLeSibling(pilotKey: string): PilotEntitySpec[] {
  return sharedHipAnatomyEntitiesForSibling(pilotKey);
}

/** Reuse tibial-shaft-fracture pilot leg anatomy slugs without duplication. */
const LEG_REFERENCE_SLUGS = ["tibial-shaft", "fibula", "leg-compartment-complex", "anterior-compartment"] as const;

export function sharedLegAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  const ownerPilot = "tibial-shaft-fracture-neighborhood";
  const defs: Record<string, Partial<PilotEntitySpec>> = {
    "tibial-shaft": {
      preferredLabel: "Tibial Shaft",
      description: "Subcutaneous tibial diaphysis with limited soft-tissue envelope.",
      metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "leg" },
    },
    fibula: {
      preferredLabel: "Fibula",
      description: "Lateral leg bone influencing alignment and length in leg injuries.",
      metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "leg" },
    },
    "leg-compartment-complex": {
      preferredLabel: "Leg Compartment Complex",
      description: "Four-compartment osteofascial model shared with compartment syndrome neighborhood.",
      metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "leg" },
    },
    "anterior-compartment": {
      preferredLabel: "Anterior Compartment",
      description: "Anterior leg compartment at risk after tibial and pilon injuries.",
      metadata: { anatomy_kind: "compartment", hierarchy_level: "structure", region: "leg" },
    },
  };
  return LEG_REFERENCE_SLUGS.map((slug) => ({
    slug,
    entityType: "anatomy_structure" as const,
    preferredLabel: defs[slug].preferredLabel ?? slug,
    description: defs[slug].description ?? "",
    metadata: {
      ...defs[slug].metadata,
      shared_reference: true,
      owner_pilot: ownerPilot,
      cross_cluster: "tibial-shaft-fracture",
      pilot: pilotKey,
    },
  }));
}

export const LEG_REFERENCE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("tibial-shaft", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "diaphysis" }),
  rel("fibula", "part_of", "leg-compartment-complex", { anatomy_role: "supporting", relevance_reason: "lateral_malleolus" }),
  rel("anterior-compartment", "part_of", "leg-compartment-complex", { anatomy_role: "essential", relevance_reason: "compartment" }),
];