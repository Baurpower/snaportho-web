/**
 * Shared hand & wrist anatomy for the Hand & Wrist Prepare Curriculum Cluster.
 * Owned by distal-radius-fracture pilot; siblings reference these slugs only.
 *
 * Cross-cluster reuse: UE trauma anatomy (radius, ulna, median nerve) referenced
 * via sibling helpers — never duplicated.
 */

import type { PilotEntitySpec, PilotRelationshipSpec } from "./kg-ankle-pilot-spec.ts";
import { sharedUeAnatomyEntitiesForSibling } from "./kg-upper-extremity-shared-anatomy.ts";

export const HAND_WRIST_SHARED_ANATOMY_PILOT_KEY = "hand-wrist-cluster-shared" as const;

const bone = (slug: string, label: string, description: string, region: string): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description,
  metadata: { anatomy_kind: "bone", hierarchy_level: "structure", region, pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

const joint = (slug: string, label: string, description: string, region: string): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description,
  metadata: { anatomy_kind: "joint", hierarchy_level: "structure", region, pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

const lig = (slug: string, label: string, description: string): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description,
  metadata: { anatomy_kind: "ligament", hierarchy_level: "structure", region: "hand", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

const tendon = (slug: string, label: string, description: string): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description,
  metadata: { anatomy_kind: "tendon", hierarchy_level: "structure", region: "hand", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

const nerve = (slug: string, label: string, description: string, region = "hand"): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description,
  metadata: { anatomy_kind: "nerve", hierarchy_level: "structure", region, pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

const vessel = (slug: string, label: string, description: string): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description,
  metadata: { anatomy_kind: "vessel", hierarchy_level: "structure", region: "hand", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

const pulley = (slug: string, label: string): PilotEntitySpec => ({
  slug,
  entityType: "anatomy_structure",
  preferredLabel: label,
  description: `Flexor tendon pulley ${label} restraining flexor tendons against the phalanges.`,
  metadata: { anatomy_kind: "pulley", hierarchy_level: "structure", region: "finger", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
});

export const HAND_WRIST_SHARED_ANATOMY_ENTITIES: PilotEntitySpec[] = [
  {
    slug: "hand-wrist-anatomy-hub",
    entityType: "anatomy_structure",
    preferredLabel: "Hand & Wrist Anatomy Hub",
    description:
      "Composite forearm-to-fingertip model linking radius, ulna, carpus, metacarpals, digits, tendons, ligaments, nerves, and vessels for Prepare Hand rotation.",
    metadata: {
      anatomy_kind: "composite",
      hierarchy_level: "structure",
      region: "hand_wrist",
      pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY,
      cluster: "hand-wrist",
    },
  },
  // Forearm
  bone("radius", "Radius", "Lateral forearm bone forming the radial side of the wrist and radiocarpal articulation.", "forearm"),
  bone("ulna", "Ulna", "Medial forearm bone with distal ulnar head and styloid contributing to DRUJ stability.", "forearm"),
  {
    slug: "interosseous-membrane",
    entityType: "anatomy_structure",
    preferredLabel: "Interosseous Membrane",
    description: "Forearm longitudinal fibrous linkage transmitting axial load between radius and ulna.",
    metadata: { anatomy_kind: "membrane", hierarchy_level: "structure", region: "forearm", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
  },
  joint("druj", "DRUJ", "Distal radioulnar joint stabilizers and ulnar-sided wrist linkage.", "wrist"),
  joint("pruj", "PRUJ", "Proximal radioulnar joint enabling forearm rotation.", "forearm"),
  bone("distal-radius", "Distal Radius", "Distal radial metaphysis and articular surface at the wrist.", "wrist"),
  bone("distal-ulna", "Distal Ulna", "Ulnar head and styloid region at the ulnar wrist.", "wrist"),
  // Carpus
  bone("scaphoid", "Scaphoid", "Radial-sided carpal bone with retrograde blood supply and snuffbox tenderness landmark.", "carpus"),
  bone("lunate", "Lunate", "Central proximal carpal bone in perilunate and lunate dislocation patterns.", "carpus"),
  bone("triquetrum", "Triquetrum", "Ulnar-sided proximal carpal bone articulating with the lunate and TFCC.", "carpus"),
  bone("pisiform", "Pisiform", "Sesamoid bone within FCU tendon at the ulnar wrist.", "carpus"),
  bone("trapezium", "Trapezium", "Radial-sided distal carpal bone articulating with the thumb metacarpal.", "carpus"),
  bone("trapezoid", "Trapezoid", "Distal carpal bone between trapezium and capitate.", "carpus"),
  bone("capitate", "Capitate", "Central distal carpal bone linking proximal and distal carpal rows.", "carpus"),
  bone("hamate", "Hamate", "Ulnar-sided distal carpal bone with hook for flexor tendon passage.", "carpus"),
  // Metacarpals
  bone("first-metacarpal", "First Metacarpal", "Thumb metacarpal articulating with trapezium at the CMC joint.", "metacarpal"),
  bone("second-metacarpal", "Second Metacarpal", "Index metacarpal with stable CMC articulation.", "metacarpal"),
  bone("third-metacarpal", "Third Metacarpal", "Middle finger metacarpal forming the central hand column.", "metacarpal"),
  bone("fourth-metacarpal", "Fourth Metacarpal", "Ring finger metacarpal.", "metacarpal"),
  bone("fifth-metacarpal", "Fifth Metacarpal", "Small finger metacarpal; common site of boxer fractures.", "metacarpal"),
  // Digits
  bone("proximal-phalanx", "Proximal Phalanx", "Proximal segment of each digit articulating at MCP and PIP.", "digit"),
  bone("middle-phalanx", "Middle Phalanx", "Middle segment of digits 2–5 between PIP and DIP.", "digit"),
  bone("distal-phalanx", "Distal Phalanx", "Terminal phalangeal segment bearing the nail bed.", "digit"),
  joint("dip-joint", "DIP Joint", "Distal interphalangeal articulation of digits 2–5 and IP of the thumb.", "digit"),
  joint("pip-joint", "PIP Joint", "Proximal interphalangeal articulation governing finger flexion cascade.", "digit"),
  joint("mcp-joint", "MCP Joint", "Metacarpophalangeal articulation linking metacarpal to proximal phalanx.", "digit"),
  joint("cmc-joint", "CMC Joint", "Carpometacarpal articulation; thumb CMC is saddle-shaped and highly mobile.", "digit"),
  // Ligaments
  lig("scapholunate-ligament", "Scapholunate Ligament", "Intrinsic ligament between scaphoid and lunate; SL injury drives carpal instability."),
  lig("lunotriquetral-ligament", "Lunotriquetral Ligament", "Intrinsic ligament between lunate and triquetrum; LT injury contributes to ulnar-sided instability."),
  lig("tfcc", "TFCC", "Triangular fibrocartilage complex stabilizing the ulnar wrist and DRUJ."),
  lig("thumb-ucl", "Thumb UCL", "Ulnar collateral ligament of the thumb MCP joint; injured in skier/gamekeeper thumb."),
  lig("volar-plate", "Volar Plate", "Fibrocartilaginous volar restraint at PIP preventing hyperextension."),
  lig("collateral-ligaments", "Collateral Ligaments", "Radial and ulnar collateral ligaments stabilizing MCP and IP joints."),
  // Tendons
  tendon("fpl", "FPL", "Flexor pollicis longus tendon flexing the thumb IP joint."),
  tendon("fdp", "FDP", "Flexor digitorum profundus tendons flexing DIP joints; zone II no-man's land."),
  tendon("fds", "FDS", "Flexor digitorum superficialis tendons flexing PIP joints."),
  tendon("epl", "EPL", "Extensor pollicis longus tendon extending the thumb IP joint."),
  tendon("epb", "EPB", "Extensor pollicis brevis tendon extending the thumb MCP joint."),
  tendon("apl", "APL", "Abductor pollicis longus tendon abducting and extending the thumb."),
  tendon("edc", "EDC", "Extensor digitorum communis tendons extending MCP and IP joints."),
  tendon("ecu", "ECU", "Extensor carpi ulnaris tendon depressor and ulnar deviator at the wrist."),
  tendon("fcr", "FCR", "Flexor carpi radialis tendon; volar wrist approach interval landmark."),
  tendon("fcu", "FCU", "Flexor carpi ulnaris tendon inserting on pisiform and stabilizing ulnar wrist."),
  // Pulleys
  pulley("a1-pulley", "A1 Pulley"),
  pulley("a2-pulley", "A2 Pulley"),
  pulley("a3-pulley", "A3 Pulley"),
  pulley("a4-pulley", "A4 Pulley"),
  pulley("a5-pulley", "A5 Pulley"),
  pulley("c1-pulley", "C1 Pulley"),
  pulley("c2-pulley", "C2 Pulley"),
  pulley("c3-pulley", "C3 Pulley"),
  {
    slug: "flexor-pulley-system",
    entityType: "anatomy_structure",
    preferredLabel: "Flexor Pulley System",
    description: "Annular (A1–A5) and cruciate (C1–C3) pulleys preventing bowstringing of flexor tendons.",
    metadata: { anatomy_kind: "composite", hierarchy_level: "structure", region: "finger", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "flexor-tendon-zones",
    entityType: "anatomy_structure",
    preferredLabel: "Flexor Tendon Zones",
    description: "Zone I–V flexor tendon anatomic divisions governing repair strategy and prognosis.",
    metadata: { anatomy_kind: "classification", hierarchy_level: "structure", region: "hand", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "extensor-tendon-zones",
    entityType: "anatomy_structure",
    preferredLabel: "Extensor Tendon Zones",
    description: "Zone I–VIII extensor tendon anatomic divisions governing repair and splinting strategy.",
    metadata: { anatomy_kind: "classification", hierarchy_level: "structure", region: "hand", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
  },
  // Nerves
  nerve("median-nerve", "Median Nerve", "Median nerve at risk in carpal tunnel and volar wrist surgery.", "wrist"),
  nerve("ulnar-nerve", "Ulnar Nerve", "Ulnar nerve at Guyon canal and cubital tunnel; digital branches in the hand."),
  nerve("radial-nerve", "Radial Nerve", "Radial nerve and branches at the wrist and dorsum of the hand."),
  nerve("ain", "AIN", "Anterior interosseous nerve branch of median nerve; motor to FPL and index FDP."),
  nerve("pin", "PIN", "Posterior interosseous nerve branch of radial nerve at the proximal forearm."),
  nerve("digital-nerves", "Digital Nerves", "Proper digital nerves supplying sensibility to the fingers."),
  // Vessels
  vessel("radial-artery", "Radial Artery", "Radial artery at the wrist forming part of the deep arch."),
  vessel("ulnar-artery", "Ulnar Artery", "Ulnar artery at Guyon canal contributing to palmar arches."),
  vessel("superficial-palmar-arch", "Superficial Palmar Arch", "Palmar arterial arcade primarily from ulnar artery."),
  vessel("deep-palmar-arch", "Deep Palmar Arch", "Deep palmar arterial arcade primarily from radial artery."),
  {
    slug: "carpal-tunnel",
    entityType: "anatomy_structure",
    preferredLabel: "Carpal Tunnel",
    description: "Osteofibrous canal containing median nerve and flexor tendons beneath the transverse carpal ligament.",
    metadata: { anatomy_kind: "canal", hierarchy_level: "structure", region: "wrist", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
  },
  {
    slug: "guyon-canal",
    entityType: "anatomy_structure",
    preferredLabel: "Guyon Canal",
    description: "Ulnar tunnel at the wrist containing ulnar nerve and artery.",
    metadata: { anatomy_kind: "canal", hierarchy_level: "structure", region: "wrist", pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY },
  },
];

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

export const HAND_WRIST_SHARED_ANATOMY_RELATIONSHIPS: PilotRelationshipSpec[] = [
  // Hub hierarchy
  rel("radius", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "forearm" }),
  rel("ulna", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "forearm" }),
  rel("interosseous-membrane", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "forearm_load" }),
  rel("druj", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "wrist_stability" }),
  rel("pruj", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "rotation" }),
  rel("distal-radius", "part_of", "radius", { anatomy_role: "essential", relevance_reason: "wrist_articular" }),
  rel("distal-ulna", "part_of", "ulna", { anatomy_role: "essential", relevance_reason: "ulnar_wrist" }),
  // Carpus
  rel("scaphoid", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "carpus" }),
  rel("lunate", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "carpus" }),
  rel("triquetrum", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "carpus" }),
  rel("pisiform", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "ulnar_wrist" }),
  rel("trapezium", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "thumb_column" }),
  rel("trapezoid", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "supporting", relevance_reason: "carpus" }),
  rel("capitate", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "carpus" }),
  rel("hamate", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "carpus" }),
  rel("scaphoid", "articulates_with", "lunate", { anatomy_role: "essential", relevance_reason: "proximal_row" }),
  rel("lunate", "articulates_with", "triquetrum", { anatomy_role: "essential", relevance_reason: "proximal_row" }),
  rel("scapholunate-ligament", "inserts_on", "scaphoid", { anatomy_role: "essential", relevance_reason: "sl_instability" }),
  rel("scapholunate-ligament", "inserts_on", "lunate", { anatomy_role: "essential", relevance_reason: "sl_instability" }),
  rel("lunotriquetral-ligament", "inserts_on", "lunate", { anatomy_role: "essential", relevance_reason: "lt_instability" }),
  rel("lunotriquetral-ligament", "inserts_on", "triquetrum", { anatomy_role: "essential", relevance_reason: "lt_instability" }),
  rel("tfcc", "inserts_on", "triquetrum", { anatomy_role: "essential", relevance_reason: "ulnar_wrist" }),
  rel("triquetrum", "articulates_with", "druj", { anatomy_role: "essential", relevance_reason: "ulnar_wrist" }),
  // Metacarpals & digits
  rel("first-metacarpal", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "thumb" }),
  rel("second-metacarpal", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("third-metacarpal", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("fourth-metacarpal", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("fifth-metacarpal", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("proximal-phalanx", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("middle-phalanx", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("distal-phalanx", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("mcp-joint", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("pip-joint", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("dip-joint", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "digit" }),
  rel("cmc-joint", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "thumb" }),
  rel("first-metacarpal", "articulates_with", "trapezium", { anatomy_role: "essential", relevance_reason: "thumb_cmc" }),
  rel("thumb-ucl", "inserts_on", "proximal-phalanx", { anatomy_role: "essential", relevance_reason: "thumb_stability" }),
  rel("volar-plate", "inserts_on", "proximal-phalanx", { anatomy_role: "essential", relevance_reason: "pip_stability" }),
  // Tendons
  rel("fpl", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("fdp", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("fds", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("epl", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("epb", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("apl", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("edc", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("ecu", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "extensor" }),
  rel("fcr", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("fcu", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("flexor-pulley-system", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("flexor-tendon-zones", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "tendon_repair" }),
  rel("extensor-tendon-zones", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "tendon_repair" }),
  rel("a1-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "essential", relevance_reason: "pulley" }),
  rel("a2-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "essential", relevance_reason: "pulley" }),
  rel("a3-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "supporting", relevance_reason: "pulley" }),
  rel("a4-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "essential", relevance_reason: "pulley" }),
  rel("a5-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "supporting", relevance_reason: "pulley" }),
  rel("c1-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "supporting", relevance_reason: "pulley" }),
  rel("c2-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "supporting", relevance_reason: "pulley" }),
  rel("c3-pulley", "part_of", "flexor-pulley-system", { anatomy_role: "supporting", relevance_reason: "pulley" }),
  rel("flexor-pulley-system", "contains", "fdp", { anatomy_role: "essential", relevance_reason: "zone_ii" }),
  rel("flexor-pulley-system", "contains", "fds", { anatomy_role: "essential", relevance_reason: "zone_ii" }),
  // Nerves & vessels
  rel("median-nerve", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("ulnar-nerve", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("radial-nerve", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "neurovascular" }),
  rel("ain", "part_of", "median-nerve", { anatomy_role: "supporting", relevance_reason: "motor_branch" }),
  rel("pin", "part_of", "radial-nerve", { anatomy_role: "supporting", relevance_reason: "motor_branch" }),
  rel("digital-nerves", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "sensibility" }),
  rel("radial-artery", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "vascular" }),
  rel("ulnar-artery", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "vascular" }),
  rel("superficial-palmar-arch", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "vascular" }),
  rel("deep-palmar-arch", "part_of", "hand-wrist-anatomy-hub", { anatomy_role: "essential", relevance_reason: "vascular" }),
  rel("carpal-tunnel", "contains", "median-nerve", { anatomy_role: "essential", relevance_reason: "compression" }),
  rel("carpal-tunnel", "contains", "fds", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("carpal-tunnel", "contains", "fdp", { anatomy_role: "essential", relevance_reason: "flexor" }),
  rel("guyon-canal", "contains", "ulnar-nerve", { anatomy_role: "essential", relevance_reason: "compression" }),
  rel("guyon-canal", "contains", "ulnar-artery", { anatomy_role: "essential", relevance_reason: "vascular" }),
  // Wrist articulations
  rel("distal-radius", "articulates_with", "scaphoid", { anatomy_role: "essential", relevance_reason: "radiocarpal" }),
  rel("distal-radius", "articulates_with", "lunate", { anatomy_role: "essential", relevance_reason: "radiocarpal" }),
  rel("distal-radius", "articulates_with", "druj", { anatomy_role: "essential", relevance_reason: "instability" }),
  rel("distal-ulna", "articulates_with", "druj", { anatomy_role: "essential", relevance_reason: "ulnar_wrist" }),
];

/** Sibling hand-wrist pilots reference owned shared anatomy without re-creating entities. */
export function sharedHandWristAnatomyEntitiesForSibling(pilotKey: string): PilotEntitySpec[] {
  return HAND_WRIST_SHARED_ANATOMY_ENTITIES.map((entity) => ({
    ...entity,
    metadata: {
      ...entity.metadata,
      shared_reference: true,
      owner_pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY,
      pilot: pilotKey,
    },
  }));
}

/** Reuse UE trauma cluster anatomy slugs (humeral shaft radial nerve, etc.) without duplication. */
const UE_REFERENCE_SLUGS = ["radial-nerve", "median-nerve", "ulnar-nerve"] as const;

export function sharedUeAnatomyForHandWristSibling(pilotKey: string): PilotEntitySpec[] {
  const ueEntities = sharedUeAnatomyEntitiesForSibling(pilotKey);
  return ueEntities.filter((e) => (UE_REFERENCE_SLUGS as readonly string[]).includes(e.slug));
}

/** Reference compartment syndrome neighborhood without duplicating entities. */
export function sharedCompartmentSyndromeReference(pilotKey: string): PilotEntitySpec[] {
  return [
    {
      slug: "compartment-syndrome",
      entityType: "condition",
      preferredLabel: "Compartment Syndrome",
      description: "Cross-cluster reference to leg/hand compartment syndrome neighborhood.",
      metadata: {
        shared_reference: true,
        owner_pilot: "compartment-syndrome-neighborhood",
        cross_cluster: "compartment-syndrome",
        pilot: pilotKey,
      },
    },
    {
      slug: "hand-compartment-complex",
      entityType: "anatomy_structure",
      preferredLabel: "Hand Compartment Complex",
      description: "Ten interosseous and thenar/hypothenar compartments of the hand.",
      metadata: {
        anatomy_kind: "composite",
        hierarchy_level: "structure",
        region: "hand",
        shared_reference: true,
        owner_pilot: HAND_WRIST_SHARED_ANATOMY_PILOT_KEY,
        pilot: pilotKey,
      },
    },
  ];
}

export const COMPARTMENT_SYNDROME_REFERENCE_RELATIONSHIPS: PilotRelationshipSpec[] = [
  rel("compartment-syndrome-hand", "differential_for", "compartment-syndrome", {
    cross_neighborhood: true,
    relevance_reason: "emergency",
    clinical_importance: "high",
  }),
  rel("hand-compartment-complex", "part_of", "hand-wrist-anatomy-hub", {
    anatomy_role: "essential",
    relevance_reason: "compartment_syndrome",
  }),
];