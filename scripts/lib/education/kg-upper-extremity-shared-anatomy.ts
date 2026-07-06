/**
 * Shared upper-extremity trauma anatomy for the UE trauma cluster.
 * Owned by clavicle-fracture pilot; siblings reference these slugs only.
 */

import type { PilotEntitySpec, PilotRelationshipSpec } from "./kg-ankle-pilot-spec.ts";

export const UE_SHARED_ANATOMY_PILOT_KEY = "upper-extremity-trauma-cluster-shared" as const;

export const UE_SHARED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "upper-extremity-trauma-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Upper Extremity Trauma Anatomy Hub",
    description: "Composite shoulder-to-elbow model linking clavicle, proximal humerus, shaft, distal humerus, and neurovascular structures.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "upper_extremity",
      pilot: UE_SHARED_ANATOMY_PILOT_KEY,
      cluster: "upper-extremity-trauma",
    },
  },
  {
    slug: "clavicle",
    entityType: "anatomy_structure",
    preferredLabel: "Clavicle",
    description: "S-shaped strut connecting sternum and acromion; common fracture site in shoulder trauma.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "ac-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Acromioclavicular Joint",
    description: "Lateral clavicle articulation with acromion; stability relevant in clavicle and shoulder injuries.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sternoclavicular-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Sternoclavicular Joint",
    description: "Medial clavicle articulation with manubrium; posterior displacement can threaten mediastinal structures.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "proximal-humerus",
    entityType: "anatomy_structure",
    preferredLabel: "Proximal Humerus",
    description: "Humeral head, neck, and tuberosity region forming the shoulder articular unit.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "humeral-head",
    entityType: "anatomy_structure",
    preferredLabel: "Humeral Head",
    description: "Articular surface of the proximal humerus in the glenohumeral joint.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "surgical-neck",
    entityType: "anatomy_structure",
    preferredLabel: "Surgical Neck",
    description: "Metaphyseal region distal to humeral head where proximal humerus fractures commonly occur.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "axillary-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Axillary Nerve",
    description: "Circumflex nerve at risk in shoulder trauma and proximal humerus surgery.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "shoulder", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "humeral-shaft",
    entityType: "anatomy_structure",
    preferredLabel: "Humeral Shaft",
    description: "Humeral diaphysis between proximal and distal metaphyseal regions.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "arm", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "radial-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Radial Nerve",
    description: "Posterior spiral groove nerve at risk in humeral shaft and distal humerus trauma.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "arm", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "brachial-artery",
    entityType: "anatomy_structure",
    preferredLabel: "Brachial Artery",
    description: "Major arm artery coursing anteriorly; critical in supracondylar vascular exams.",
    metadata: { anatomy_kind: "vessel", hierarchy_level: "structure", region: "arm", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "distal-humerus",
    entityType: "anatomy_structure",
    preferredLabel: "Distal Humerus",
    description: "Distal metaphyseal and articular humerus forming the proximal elbow.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "medial-column",
    entityType: "anatomy_structure",
    preferredLabel: "Medial Column Distal Humerus",
    description: "Medial distal humeral column including trochlear region and medial epicondylar support.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "lateral-column",
    entityType: "anatomy_structure",
    preferredLabel: "Lateral Column Distal Humerus",
    description: "Lateral distal humeral column including capitellar articular support.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "olecranon-fossa",
    entityType: "anatomy_structure",
    preferredLabel: "Olecranon Fossa",
    description: "Posterior distal humerus recess accommodating olecranon in extension.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "capitellum",
    entityType: "anatomy_structure",
    preferredLabel: "Capitellum",
    description: "Lateral distal humeral articular surface for radial head articulation.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "trochlea",
    entityType: "anatomy_structure",
    preferredLabel: "Trochlea",
    description: "Medial distal humeral articular surface for ulnar articulation.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "anterior-interosseous-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Anterior Interosseous Nerve",
    description: "Motor branch of median nerve tested by FPL/FDP index function; injured in supracondylar fractures.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "median-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Median Nerve",
    description: "Anterior elbow and forearm nerve at risk in distal humerus and supracondylar injuries.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "ulnar-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Ulnar Nerve",
    description: "Posteromedial elbow nerve at risk in distal humerus and elbow trauma.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "elbow-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Elbow Joint",
    description: "Hinge joint between distal humerus, radius, and ulna.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "elbow", pilot: UE_SHARED_ANATOMY_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const UE_SHARED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("clavicle", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "shoulder_girdle" }),
  rel("ac-joint", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "shoulder_girdle" }),
  rel("sternoclavicular-joint", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "shoulder_girdle" }),
  rel("proximal-humerus", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "shoulder" }),
  rel("humeral-head", "part_of", "proximal-humerus", { anatomy_role: "essential", relevance_reason: "articular" }),
  rel("surgical-neck", "part_of", "proximal-humerus", { anatomy_role: "essential", relevance_reason: "fracture_zone" }),
  rel("axillary-nerve", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("humeral-shaft", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diaphysis" }),
  rel("radial-nerve", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("brachial-artery", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "vascular" }),
  rel("distal-humerus", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "elbow" }),
  rel("medial-column", "part_of", "distal-humerus", { anatomy_role: "essential", relevance_reason: "column" }),
  rel("lateral-column", "part_of", "distal-humerus", { anatomy_role: "essential", relevance_reason: "column" }),
  rel("olecranon-fossa", "part_of", "distal-humerus", { anatomy_role: "supporting", relevance_reason: "posterior" }),
  rel("capitellum", "part_of", "lateral-column", { anatomy_role: "essential", relevance_reason: "articular" }),
  rel("trochlea", "part_of", "medial-column", { anatomy_role: "essential", relevance_reason: "articular" }),
  rel("anterior-interosseous-nerve", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("median-nerve", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("ulnar-nerve", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("elbow-joint", "part_of", "upper-extremity-trauma-anatomy-hub", { anatomy_role: "essential", relevance_reason: "elbow" }),
  rel("capitellum", "articulates_with", "elbow-joint", { anatomy_role: "essential", relevance_reason: "radiocapitellar" }),
  rel("trochlea", "articulates_with", "elbow-joint", { anatomy_role: "essential", relevance_reason: "ulnohumeral" }),
  rel("clavicle", "articulates_with", "ac-joint", { anatomy_role: "essential", relevance_reason: "lateral_clavicle" }),
  rel("clavicle", "articulates_with", "sternoclavicular-joint", { anatomy_role: "essential", relevance_reason: "medial_clavicle" }),
];

export function sharedUeAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  return UE_SHARED_ANATOMY_ENTITIES.map((entity) => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      shared_reference: true,
      owner_pilot: UE_SHARED_ANATOMY_PILOT_KEY,
      pilot: pilotKey,
    },
  }));
}