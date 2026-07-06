/**
 * Shared proximal hip / femur anatomy for the hip fracture cluster.
 * Owned by femoral-neck-fracture pilot; sibling neighborhoods reference these slugs only.
 */

import type { PilotEntitySpec, PilotRelationshipSpec } from "./kg-ankle-pilot-spec.ts";

export const HIP_SHARED_ANATOMY_PILOT_KEY = "hip-fracture-cluster-shared" as const;

export const HIP_SHARED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "proximal-femur-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Proximal Femur Anatomy Hub",
    description: "Composite proximal femur model linking head, neck, trochanters, calcar, and hip joint.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "hip",
      pilot: HIP_SHARED_ANATOMY_PILOT_KEY,
      cluster: "hip-fracture",
    },
  },
  {
    slug: "femoral-head",
    entityType: "anatomy_structure",
    preferredLabel: "Femoral Head",
    description: "Articular femoral head supplied largely by retinacular and circumflex vessels.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femoral-neck",
    entityType: "anatomy_structure",
    preferredLabel: "Femoral Neck",
    description: "Intracapsular segment between femoral head and intertrochanteric region.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "intertrochanteric-region",
    entityType: "anatomy_structure",
    preferredLabel: "Intertrochanteric Region",
    description: "Extracapsular metaphyseal zone between neck and subtrochanteric diaphysis.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "lesser-trochanter",
    entityType: "anatomy_structure",
    preferredLabel: "Lesser Trochanter",
    description: "Medial proximal femur attachment for iliopsoas; key subtrochanteric landmark.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "greater-trochanter",
    entityType: "anatomy_structure",
    preferredLabel: "Greater Trochanter",
    description: "Lateral proximal femur with abductor insertions; intertrochanteric fixation landmark.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "calcar",
    entityType: "anatomy_structure",
    preferredLabel: "Calcar",
    description: "Dense medial femoral neck cortical buttress supporting head-neck load transfer.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "medial-femoral-circumflex-artery",
    entityType: "anatomy_structure",
    preferredLabel: "Medial Femoral Circumflex Artery",
    description: "Dominant retinacular blood supply to the femoral head; vulnerable in neck fractures.",
    metadata: { anatomy_kind: "vessel", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "sciatic-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Sciatic Nerve",
    description: "Posterior hip nerve at risk during proximal femur exposure and reduction maneuvers.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "hip-joint",
    entityType: "anatomy_structure",
    preferredLabel: "Hip Joint",
    description: "Ball-and-socket articulation between femoral head and acetabulum.",
    metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region: "hip", pilot: HIP_SHARED_ANATOMY_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const HIP_SHARED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("femoral-head", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("femoral-neck", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("intertrochanteric-region", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("lesser-trochanter", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "landmark" }),
  rel("greater-trochanter", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "landmark" }),
  rel("calcar", "part_of", "femoral-neck", { anatomy_role: "essential", relevance_reason: "stability" }),
  rel("medial-femoral-circumflex-artery", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "blood_supply" }),
  rel("sciatic-nerve", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "safety" }),
  rel("hip-joint", "part_of", "proximal-femur-anatomy-hub", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
  rel("femoral-head", "articulates_with", "hip-joint", { anatomy_role: "essential", relevance_reason: "diagnosis" }),
];

export function sharedAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  return HIP_SHARED_ANATOMY_ENTITIES.map((entity) => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      shared_reference: true,
      owner_pilot: HIP_SHARED_ANATOMY_PILOT_KEY,
      pilot: pilotKey,
    },
  }));
}