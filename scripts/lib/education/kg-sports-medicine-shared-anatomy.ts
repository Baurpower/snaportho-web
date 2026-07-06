/**
 * Shared sports medicine anatomy for the Sports Medicine Prepare cluster.
 * Owned by acl-tear pilot; siblings reference these slugs only.
 *
 * Cross-cluster reuse: LE trauma (knee/foot), UE trauma (shoulder/elbow),
 * and ankle-fracture pilot (syndesmosis, deltoid) are referenced — never duplicated.
 */

import type { PilotEntitySpec, PilotRelationshipSpec } from "./kg-ankle-pilot-spec.ts";

export const SPORTS_SHARED_ANATOMY_PILOT_KEY = "sports-medicine-cluster-shared" as const;

export const SPORTS_SHARED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "sports-medicine-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Sports Medicine Anatomy Hub",
    description: "Composite sports medicine model linking knee, shoulder, elbow, and foot-ankle regional hubs.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "sports_medicine",
      pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY,
      cluster: "sports-medicine",
    },
  },
  {
    slug: "sports-knee-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Sports Knee Anatomy Hub",
    description: "Knee ligament, meniscus, extensor, and articular structures for sports knee conditions.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "mcl",
    entityType: "anatomy_structure",
    preferredLabel: "Medial Collateral Ligament",
    description: "Primary medial knee stabilizer resisting valgus stress.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "lcl",
    entityType: "anatomy_structure",
    preferredLabel: "Lateral Collateral Ligament",
    description: "Primary lateral knee stabilizer resisting varus stress.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "posterolateral-corner",
    entityType: "anatomy_structure",
    preferredLabel: "Posterolateral Corner",
    description: "Posterolateral knee stabilizing complex including LCL, popliteus, and arcuate ligaments.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "medial-meniscus",
    entityType: "anatomy_structure",
    preferredLabel: "Medial Meniscus",
    description: "C-shaped medial meniscus distributing load and resisting shear at the medial compartment.",
    metadata: { anatomy_kind: "meniscus", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "lateral-meniscus",
    entityType: "anatomy_structure",
    preferredLabel: "Lateral Meniscus",
    description: "More mobile lateral meniscus with popliteus hiatus; commonly torn with ACL injuries.",
    metadata: { anatomy_kind: "meniscus", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "articular-cartilage",
    entityType: "anatomy_structure",
    preferredLabel: "Knee Articular Cartilage",
    description: "Hyaline cartilage covering femoral condyles and tibial plateau.",
    metadata: { anatomy_kind: "cartilage", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femoral-condyles",
    entityType: "anatomy_structure",
    preferredLabel: "Femoral Condyles",
    description: "Medial and lateral femoral condyles forming the proximal tibiofemoral articulation.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sports-shoulder-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Sports Shoulder Anatomy Hub",
    description: "Glenohumeral stabilizers, rotator cuff, and biceps anchor for shoulder sports conditions.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "glenoid",
    entityType: "anatomy_structure",
    preferredLabel: "Glenoid",
    description: "Scapular articular surface forming the socket of the glenohumeral joint.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "labrum",
    entityType: "anatomy_structure",
    preferredLabel: "Glenoid Labrum",
    description: "Fibrocartilaginous rim deepening the glenoid and anchoring capsulolabral structures.",
    metadata: { anatomy_kind: "labrum", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "rotator-cuff",
    entityType: "anatomy_structure",
    preferredLabel: "Rotator Cuff",
    description: "Supraspinatus, infraspinatus, subscapularis, and teres minor force-couple complex.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "supraspinatus",
    entityType: "anatomy_structure",
    preferredLabel: "Supraspinatus",
    description: "Superior rotator cuff tendon initiating abduction and commonly torn in cuff pathology.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "infraspinatus",
    entityType: "anatomy_structure",
    preferredLabel: "Infraspinatus",
    description: "Posterior cuff tendon providing external rotation strength.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "subscapularis",
    entityType: "anatomy_structure",
    preferredLabel: "Subscapularis",
    description: "Anterior cuff tendon providing internal rotation and anterior stability.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "teres-minor",
    entityType: "anatomy_structure",
    preferredLabel: "Teres Minor",
    description: "Inferior posterior cuff muscle contributing to external rotation.",
    metadata: { anatomy_kind: "muscle", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "biceps-anchor",
    entityType: "anatomy_structure",
    preferredLabel: "Proximal Biceps Anchor",
    description: "Superior labrum and biceps anchor complex at the glenoid origin.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "shoulder", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sports-elbow-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Sports Elbow Anatomy Hub",
    description: "Elbow ligament and tendon structures relevant to throwing and flexion injuries.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "elbow", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "ucl",
    entityType: "anatomy_structure",
    preferredLabel: "Ulnar Collateral Ligament",
    description: "Medial elbow stabilizer critical in throwing athletes.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "elbow", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "radial-collateral-ligament",
    entityType: "anatomy_structure",
    preferredLabel: "Radial Collateral Ligament",
    description: "Lateral elbow stabilizer resisting varus stress.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "elbow", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "distal-biceps-tendon",
    entityType: "anatomy_structure",
    preferredLabel: "Distal Biceps Tendon",
    description: "Distal biceps insertion on the radial tuberosity enabling elbow flexion and supination.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "elbow", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sports-foot-ankle-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Sports Foot & Ankle Anatomy Hub",
    description: "Lateral ankle ligaments, syndesmosis, Achilles, and hindfoot structures for sports foot-ankle conditions.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "foot_ankle", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "atfl",
    entityType: "anatomy_structure",
    preferredLabel: "Anterior Talofibular Ligament",
    description: "Primary lateral ankle stabilizer injured in inversion sprains.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "ankle", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "cfl",
    entityType: "anatomy_structure",
    preferredLabel: "Calcaneofibular Ligament",
    description: "Lateral ankle ligament stabilizing subtalar motion after inversion injury.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "ankle", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "achilles-tendon",
    entityType: "anatomy_structure",
    preferredLabel: "Achilles Tendon",
    description: "Conjoined gastrocnemius-soleus tendon inserting on the calcaneus.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "ankle", pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const SPORTS_SHARED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("sports-knee-anatomy-hub", "part_of", "sports-medicine-anatomy-hub", { anatomy_role: "essential", relevance_reason: "knee" }),
  rel("sports-shoulder-anatomy-hub", "part_of", "sports-medicine-anatomy-hub", { anatomy_role: "essential", relevance_reason: "shoulder" }),
  rel("sports-elbow-anatomy-hub", "part_of", "sports-medicine-anatomy-hub", { anatomy_role: "essential", relevance_reason: "elbow" }),
  rel("sports-foot-ankle-anatomy-hub", "part_of", "sports-medicine-anatomy-hub", { anatomy_role: "essential", relevance_reason: "foot_ankle" }),
  rel("mcl", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "medial_stability" }),
  rel("lcl", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "lateral_stability" }),
  rel("posterolateral-corner", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "rotational_stability" }),
  rel("medial-meniscus", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "meniscus" }),
  rel("lateral-meniscus", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "meniscus" }),
  rel("articular-cartilage", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cartilage" }),
  rel("femoral-condyles", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "articular" }),
  rel("glenoid", "part_of", "sports-shoulder-anatomy-hub", { anatomy_role: "essential", relevance_reason: "socket" }),
  rel("labrum", "part_of", "sports-shoulder-anatomy-hub", { anatomy_role: "essential", relevance_reason: "stability" }),
  rel("rotator-cuff", "part_of", "sports-shoulder-anatomy-hub", { anatomy_role: "essential", relevance_reason: "dynamic_stability" }),
  rel("supraspinatus", "part_of", "rotator-cuff", { anatomy_role: "essential", relevance_reason: "abduction" }),
  rel("infraspinatus", "part_of", "rotator-cuff", { anatomy_role: "essential", relevance_reason: "external_rotation" }),
  rel("subscapularis", "part_of", "rotator-cuff", { anatomy_role: "essential", relevance_reason: "internal_rotation" }),
  rel("teres-minor", "part_of", "rotator-cuff", { anatomy_role: "essential", relevance_reason: "external_rotation" }),
  rel("biceps-anchor", "part_of", "sports-shoulder-anatomy-hub", { anatomy_role: "essential", relevance_reason: "biceps_labrum" }),
  rel("ucl", "part_of", "sports-elbow-anatomy-hub", { anatomy_role: "essential", relevance_reason: "medial_elbow" }),
  rel("radial-collateral-ligament", "part_of", "sports-elbow-anatomy-hub", { anatomy_role: "essential", relevance_reason: "lateral_elbow" }),
  rel("distal-biceps-tendon", "part_of", "sports-elbow-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexion_supination" }),
  rel("atfl", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "lateral_ankle" }),
  rel("cfl", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "lateral_ankle" }),
  rel("achilles-tendon", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "plantarflexion" }),
];

/** Sibling sports pilots reference owned shared anatomy without re-creating entities. */
export function sharedSportsAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  return SPORTS_SHARED_ANATOMY_ENTITIES.map((entity) => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      shared_reference: true,
      owner_pilot: SPORTS_SHARED_ANATOMY_PILOT_KEY,
      pilot: pilotKey,
    },
  }));
}

/** Reuse LE trauma knee anatomy slugs without duplication. */
const LE_KNEE_REFERENCE_SLUGS = [
  "lower-extremity-trauma-anatomy-hub",
  "acl",
  "pcl",
  "patella",
  "tibial-plateau",
  "extensor-mechanism",
  "distal-femur",
  "popliteal-artery",
  "common-peroneal-nerve",
] as const;

export function sharedLeKneeAnatomyForSportsSibling(pilotKey: string): PilotEntitySpec[] {
  const ownerPilot = "lower-extremity-trauma-cluster-shared";
  const labels: Record<string, { preferredLabel: string; description: string }> = {
    "lower-extremity-trauma-anatomy-hub": {
      preferredLabel: "Lower Extremity Trauma Anatomy Hub",
      description: "Cross-cluster LE trauma anatomy hub reused for sports knee conditions.",
    },
    acl: { preferredLabel: "Anterior Cruciate Ligament", description: "Primary knee stabilizer in ACL tear and multiligament injuries." },
    pcl: { preferredLabel: "Posterior Cruciate Ligament", description: "Posterior knee stabilizer in PCL and multiligament injuries." },
    patella: { preferredLabel: "Patella", description: "Sesamoid in extensor mechanism relevant to patellar instability." },
    "tibial-plateau": { preferredLabel: "Tibial Plateau", description: "Proximal tibial articular surface shared with tibial plateau fracture neighborhood." },
    "extensor-mechanism": { preferredLabel: "Knee Extensor Mechanism", description: "Quadriceps-patella-tibial tubercle linkage in patellar instability." },
    "distal-femur": { preferredLabel: "Distal Femur", description: "Distal femoral condylar region shared with trauma neighborhoods." },
    "popliteal-artery": { preferredLabel: "Popliteal Artery", description: "Vascular structure at risk in knee dislocation and multiligament injury." },
    "common-peroneal-nerve": { preferredLabel: "Common Peroneal Nerve", description: "Lateral knee nerve at risk in multiligament and posterolateral injuries." },
  };
  return LE_KNEE_REFERENCE_SLUGS.map((slug) => ({
    slug,
    entityType: "anatomy_structure" as const,
    preferredLabel: labels[slug]?.preferredLabel ?? slug,
    description: labels[slug]?.description ?? "",
    metadata: {
      shared_reference: true,
      owner_pilot: ownerPilot,
      cross_cluster: "lower-extremity-trauma",
      pilot: pilotKey,
    },
  }));
}

/** Reuse UE trauma shoulder/elbow anatomy slugs. */
const UE_SHOULDER_ELBOW_REFERENCE_SLUGS = [
  "upper-extremity-trauma-anatomy-hub",
  "clavicle",
  "humeral-head",
  "proximal-humerus",
  "axillary-nerve",
  "ac-joint",
  "elbow-joint",
  "median-nerve",
  "ulnar-nerve",
  "radial-nerve",
] as const;

export function sharedUeShoulderElbowAnatomyForSportsSibling(pilotKey: string): PilotEntitySpec[] {
  const ownerPilot = "upper-extremity-trauma-cluster-shared";
  return UE_SHOULDER_ELBOW_REFERENCE_SLUGS.map((slug) => ({
    slug,
    entityType: "anatomy_structure" as const,
    preferredLabel: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Cross-cluster UE trauma anatomy reference for sports medicine (${slug}).`,
    metadata: {
      shared_reference: true,
      owner_pilot: ownerPilot,
      cross_cluster: "upper-extremity-trauma",
      pilot: pilotKey,
    },
  }));
}

/** Reuse LE trauma + ankle pilot foot-ankle anatomy slugs. */
const FOOT_ANKLE_REFERENCE_SLUGS = [
  "talus",
  "calcaneus",
  "syndesmosis",
  "deltoid-ligament",
  "lateral-malleolus",
  "medial-malleolus",
] as const;

export function sharedFootAnkleAnatomyForSportsSibling(pilotKey: string): PilotEntitySpec[] {
  const ownerPilot = "lower-extremity-trauma-cluster-shared";
  const ankleOwner = "ankle-fracture-neighborhood";
  return FOOT_ANKLE_REFERENCE_SLUGS.map((slug) => ({
    slug,
    entityType: "anatomy_structure" as const,
    preferredLabel: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Cross-cluster foot-ankle anatomy reference for sports medicine (${slug}).`,
    metadata: {
      shared_reference: true,
      owner_pilot: ["syndesmosis", "deltoid-ligament", "lateral-malleolus", "medial-malleolus"].includes(slug)
        ? ankleOwner
        : ownerPilot,
      cross_cluster: ["syndesmosis", "deltoid-ligament", "lateral-malleolus", "medial-malleolus"].includes(slug)
        ? "ankle-fracture"
        : "lower-extremity-trauma",
      pilot: pilotKey,
    },
  }));
}

export const LE_KNEE_REFERENCE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("acl", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
  rel("pcl", "part_of", "sports-knee-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
  rel("patella", "part_of", "extensor-mechanism", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
];

export const UE_SHOULDER_REFERENCE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("humeral-head", "part_of", "sports-shoulder-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
  rel("glenoid", "articulates_with", "humeral-head", { anatomy_role: "essential", relevance_reason: "glenohumeral" }),
];

export const FOOT_ANKLE_REFERENCE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("atfl", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "lateral_ankle" }),
  rel("talus", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
  rel("calcaneus", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
  rel("syndesmosis", "part_of", "sports-foot-ankle-anatomy-hub", { anatomy_role: "essential", relevance_reason: "cross_cluster", shared_reference: true }),
];