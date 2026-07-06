/**
 * Shared adult reconstruction anatomy and implant concepts.
 * Owned by hip-osteoarthritis pilot; sibling neighborhoods reference these slugs only.
 *
 * Cross-cluster reuse: hip fracture cluster (kg-hip-shared-anatomy) and LE trauma
 * cluster (kg-lower-extremity-shared-anatomy) slugs are referenced — never duplicated.
 */

import type { PilotEntitySpec, PilotRelationshipSpec } from "./kg-ankle-pilot-spec.ts";
import { sharedAnatomyEntitiesForSibling as sharedHipAnatomyEntitiesForSibling } from "./kg-hip-shared-anatomy.ts";
import { sharedLeAnatomyEntitiesForSibling } from "./kg-lower-extremity-shared-anatomy.ts";

export const RECON_SHARED_ANATOMY_PILOT_KEY = "adult-reconstruction-cluster-shared" as const;

export const RECON_SHARED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "adult-reconstruction-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Adult Reconstruction Anatomy Hub",
    description: "Composite hip and knee arthroplasty model linking joint surfaces, soft tissues, and implant interfaces.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "arthroplasty",
      pilot: RECON_SHARED_ANATOMY_PILOT_KEY,
      cluster: "adult-reconstruction",
    },
  },
  {
    slug: "pelvis",
    entityType: "anatomy_structure",
    preferredLabel: "Pelvis",
    description: "Bony pelvic ring anchoring the acetabulum and hip center of rotation.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY, cross_cluster_owner: "lower-extremity-trauma-cluster-shared" },
  },
  {
    slug: "acetabulum",
    entityType: "anatomy_structure",
    preferredLabel: "Acetabulum",
    description: "Hip socket receiving the acetabular component; key for cup positioning and hip stability.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY, cross_cluster_owner: "lower-extremity-trauma-cluster-shared" },
  },
  {
    slug: "proximal-femur",
    entityType: "anatomy_structure",
    preferredLabel: "Proximal Femur",
    description: "Femoral head, neck, trochanters, and calcar region relevant to THA stem fixation and offset.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "hip-capsule",
    entityType: "anatomy_structure",
    preferredLabel: "Hip Capsule",
    description: "Periarticular soft tissue envelope influencing THA approach, stability, and dislocation risk.",
    metadata: { anatomy_kind: "soft_tissue", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "labrum",
    entityType: "anatomy_structure",
    preferredLabel: "Acetabular Labrum",
    description: "Fibrocartilaginous hip rim contributing to suction seal and joint stability.",
    metadata: { anatomy_kind: "soft_tissue", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "gluteus-medius",
    entityType: "anatomy_structure",
    preferredLabel: "Gluteus Medius",
    description: "Primary hip abductor; critical for gait and THA abductor repair integrity.",
    metadata: { anatomy_kind: "muscle", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "gluteus-minimus",
    entityType: "anatomy_structure",
    preferredLabel: "Gluteus Minimus",
    description: "Deep hip abductor contributing to pelvic stability during gait.",
    metadata: { anatomy_kind: "muscle", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "short-external-rotators",
    entityType: "anatomy_structure",
    preferredLabel: "Short External Rotators",
    description: "Posterior hip soft tissue sleeve repaired after posterior THA approach.",
    metadata: { anatomy_kind: "muscle", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femoral-nerve",
    entityType: "anatomy_structure",
    preferredLabel: "Femoral Nerve",
    description: "Anterior hip nerve at risk during anterior approach THA exposure.",
    metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femur",
    entityType: "anatomy_structure",
    preferredLabel: "Femur",
    description: "Thigh bone bearing femoral condyles and canal for arthroplasty stem fixation.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "tibia",
    entityType: "anatomy_structure",
    preferredLabel: "Tibia",
    description: "Proximal tibial plateau and metaphysis receiving tibial baseplate in TKA.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femoral-condyles",
    entityType: "anatomy_structure",
    preferredLabel: "Femoral Condyles",
    description: "Distal femoral articular surfaces resurfaced during TKA femoral component placement.",
    metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "collateral-ligaments",
    entityType: "anatomy_structure",
    preferredLabel: "Collateral Ligaments",
    description: "Medial and lateral knee stabilizers balanced during TKA soft-tissue releases.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "cruciate-ligaments",
    entityType: "anatomy_structure",
    preferredLabel: "Cruciate Ligaments",
    description: "ACL and PCL influencing TKA constraint selection and balancing strategy.",
    metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "quadriceps-tendon",
    entityType: "anatomy_structure",
    preferredLabel: "Quadriceps Tendon",
    description: "Proximal extensor mechanism linkage at risk in TKA exposure and extensor failure.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "patellar-tendon",
    entityType: "anatomy_structure",
    preferredLabel: "Patellar Tendon",
    description: "Distal extensor mechanism linkage vulnerable to rupture after TKA.",
    metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "implant-concepts-hub",
    entityType: "biomechanics_concept",
    preferredLabel: "Arthroplasty Implant Concepts Hub",
    description: "Composite model of reusable THA and TKA implant components and fixation strategies.",
    metadata: { implant_kind: "composite", region: "arthroplasty", pilot: RECON_SHARED_ANATOMY_PILOT_KEY, cluster: "adult-reconstruction" },
  },
  {
    slug: "femoral-component",
    entityType: "implant",
    preferredLabel: "Femoral Component",
    description: "TKA femoral resurfacing component restoring flexion-extension geometry.",
    metadata: { implant_kind: "component", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "acetabular-component",
    entityType: "implant",
    preferredLabel: "Acetabular Component",
    description: "THA cup restoring acetabular coverage and hip center of rotation.",
    metadata: { implant_kind: "component", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "polyethylene-liner",
    entityType: "implant",
    preferredLabel: "Polyethylene Liner",
    description: "Bearing insert articulating with femoral head or femoral component.",
    metadata: { implant_kind: "bearing", region: "arthroplasty", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "femoral-stem",
    entityType: "implant",
    preferredLabel: "Femoral Stem",
    description: "THA femoral canal implant transmitting load from head to diaphysis.",
    metadata: { implant_kind: "component", region: "hip", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "tibial-baseplate",
    entityType: "implant",
    preferredLabel: "Tibial Baseplate",
    description: "TKA tibial tray fixed to proximal tibia receiving polyethylene insert.",
    metadata: { implant_kind: "component", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "tibial-insert",
    entityType: "implant",
    preferredLabel: "Tibial Insert",
    description: "TKA polyethylene bearing surface articulating with femoral component.",
    metadata: { implant_kind: "bearing", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "patellar-component",
    entityType: "implant",
    preferredLabel: "Patellar Component",
    description: "Resurfaced patellar button in select TKA and patellofemoral arthroplasty cases.",
    metadata: { implant_kind: "component", region: "knee", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "cement-mantle",
    entityType: "fixation_method",
    preferredLabel: "Cement Mantle",
    description: "PMMA interphase distributing load between implant and bone.",
    metadata: { implant_kind: "fixation", region: "arthroplasty", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "press-fit-fixation",
    entityType: "fixation_method",
    preferredLabel: "Press-Fit Fixation",
    description: "Cementless implant stability achieved through interference fit and bone ingrowth.",
    metadata: { implant_kind: "fixation", region: "arthroplasty", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "cemented-fixation",
    entityType: "fixation_method",
    preferredLabel: "Cemented Fixation",
    description: "PMMA cement securing implant to bone for immediate stability.",
    metadata: { implant_kind: "fixation", region: "arthroplasty", pilot: RECON_SHARED_ANATOMY_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const RECON_SHARED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("pelvis", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "hip_socket" }),
  rel("acetabulum", "part_of", "pelvis", { anatomy_role: "essential", relevance_reason: "cup_positioning" }),
  rel("proximal-femur", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "tha" }),
  rel("hip-capsule", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "stability" }),
  rel("labrum", "part_of", "acetabulum", { anatomy_role: "supporting", relevance_reason: "stability" }),
  rel("gluteus-medius", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "abductor" }),
  rel("gluteus-minimus", "part_of", "gluteus-medius", { anatomy_role: "supporting", relevance_reason: "abductor" }),
  rel("short-external-rotators", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "posterior_approach" }),
  rel("femoral-nerve", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "anterior_approach" }),
  rel("femur", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "tka" }),
  rel("tibia", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "tka" }),
  rel("femoral-condyles", "part_of", "femur", { anatomy_role: "essential", relevance_reason: "resurfacing" }),
  rel("collateral-ligaments", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "balancing" }),
  rel("cruciate-ligaments", "part_of", "adult-reconstruction-anatomy-hub", { anatomy_role: "essential", relevance_reason: "constraint" }),
  rel("quadriceps-tendon", "part_of", "extensor-mechanism", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("patellar-tendon", "part_of", "extensor-mechanism", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("implant-concepts-hub", "prerequisite_for", "femoral-component", { implant_role: "essential", relevance_reason: "tka" }),
  rel("implant-concepts-hub", "prerequisite_for", "acetabular-component", { implant_role: "essential", relevance_reason: "tha" }),
  rel("implant-concepts-hub", "prerequisite_for", "polyethylene-liner", { implant_role: "essential", relevance_reason: "bearing" }),
  rel("implant-concepts-hub", "prerequisite_for", "femoral-stem", { implant_role: "essential", relevance_reason: "tha" }),
  rel("implant-concepts-hub", "prerequisite_for", "tibial-baseplate", { implant_role: "essential", relevance_reason: "tka" }),
  rel("implant-concepts-hub", "prerequisite_for", "tibial-insert", { implant_role: "essential", relevance_reason: "tka" }),
  rel("implant-concepts-hub", "prerequisite_for", "patellar-component", { implant_role: "essential", relevance_reason: "patella" }),
  rel("implant-concepts-hub", "prerequisite_for", "cement-mantle", { implant_role: "essential", relevance_reason: "fixation" }),
  rel("implant-concepts-hub", "prerequisite_for", "press-fit-fixation", { implant_role: "essential", relevance_reason: "cementless" }),
  rel("implant-concepts-hub", "prerequisite_for", "cemented-fixation", { implant_role: "essential", relevance_reason: "cemented" }),
];

/** Sibling recon pilots reference owned shared anatomy without re-creating entities. */
export function sharedReconAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  return RECON_SHARED_ANATOMY_ENTITIES.map((entity) => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      shared_reference: true,
      owner_pilot: RECON_SHARED_ANATOMY_PILOT_KEY,
      pilot: pilotKey,
    },
  }));
}

/** Reuse hip fracture cluster anatomy slugs (femoral head, neck, trochanters, etc.). */
export function sharedHipAnatomyForReconSibling(pilotKey: string): PilotEntitySpec[] {
  return sharedHipAnatomyEntitiesForSibling(pilotKey).map((e) => ({
    ...e,
    metadata: { ...e.metadata, cross_cluster: "hip-fracture-cluster-shared" },
  }));
}

/** Reuse LE trauma cluster knee/leg anatomy slugs (patella, plateau, extensor, etc.). */
export function sharedLeAnatomyForReconSibling(pilotKey: string): PilotEntitySpec[] {
  const leSlugs = new Set([
    "patella",
    "tibial-plateau",
    "extensor-mechanism",
    "distal-femur",
    "popliteal-artery",
    "common-peroneal-nerve",
    "femoral-diaphysis",
  ]);
  return sharedLeAnatomyEntitiesForSibling(pilotKey).filter((e) => leSlugs.has(e.slug));
}

/** Cross-neighborhood reference slugs to trauma neighborhoods (relationship targets only). */
/** Cross-neighborhood reference stubs for trauma and peer recon slugs. */
export const RECON_CROSS_REF_SLUGS = [
  "femoral-neck-fracture",
  "intertrochanteric-fracture",
  "subtrochanteric-fracture",
  "femoral-shaft-fracture",
  "distal-femur-fracture",
  "tibial-shaft-fracture",
  "compartment-syndrome",
  "total-hip-arthroplasty",
  "total-knee-arthroplasty",
  "revision-arthroplasty",
  "periprosthetic-joint-infection",
  "hip-prosthetic-joint-infection",
  "knee-prosthetic-joint-infection",
  "knee-osteoarthritis",
  "bearing-surface-selection",
  "polyethylene-wear-osteolysis",
  "adverse-local-tissue-reaction",
  "unicompartmental-knee-arthroplasty",
] as const;

export function crossRefEntitiesForReconSibling(pilotKey: string): PilotEntitySpec[] {
  return RECON_CROSS_REF_SLUGS.map((slug) => ({
    slug,
    entityType: slug.includes("fracture") || slug.includes("syndrome") || slug.includes("arthritis") || slug.includes("infection")
      ? "condition"
      : slug.includes("arthroplasty") || slug.includes("selection")
        ? slug === "revision-arthroplasty" || slug.endsWith("arthroplasty")
          ? "procedure"
          : "biomechanics_concept"
        : "procedure",
    preferredLabel: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    description: `Cross-neighborhood reference stub for ${slug}.`,
    metadata: {
      shared_reference: true,
      cross_neighborhood: true,
      owner_pilot: `${slug}-neighborhood`,
      pilot: pilotKey,
    },
  }));
}

export const TRAUMA_CROSS_LINK_SLUGS = {
  femoralNeckFracture: "femoral-neck-fracture",
  intertrochantericFracture: "intertrochanteric-fracture",
  subtrochantericFracture: "subtrochanteric-fracture",
  femoralShaftFracture: "femoral-shaft-fracture",
  distalFemurFracture: "distal-femur-fracture",
  tibialShaftFracture: "tibial-shaft-fracture",
  compartmentSyndrome: "compartment-syndrome",
  totalHipArthroplasty: "total-hip-arthroplasty",
  totalKneeArthroplasty: "total-knee-arthroplasty",
  periprostheticJointInfection: "periprosthetic-joint-infection",
} as const;