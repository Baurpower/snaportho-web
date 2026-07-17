export type HandWristOwnershipDisposition =
  | "LINK_CANONICALLY"
  | "CROSS_NEIGHBORHOOD_REFERENCE"
  | "VALID_STAGING_DEFER"
  | "REMOVE_UNUSED_PROPOSAL"
  | "MERGE_WITH_EXISTING_IDENTITY"
  | "ACTION_REQUIRED";

export type HandWristOwnershipRule = {
  slugPattern: RegExp;
  entityType: string;
  canonicalOwner: string;
  disposition: HandWristOwnershipDisposition;
  stagingConnected: boolean;
  publicationDeferred: boolean;
  rationale: string;
};

export const HAND_WRIST_CANONICAL_ANATOMY_OWNER = "canonical-hand-anatomy-backbone";
export const HAND_WRIST_EDX_OWNER = "hand-electrodiagnostics";
export const HAND_WRIST_EXAM_OWNER = "hand-exam-and-functional-assessment";
export const HAND_WRIST_OPERATIVE_OWNER = "shared-hand-operative-technique";

export const HAND_WRIST_TOPIC_ARCHETYPES = [
  "compressive_neuropathy",
  "tendon_and_pulley",
  "fracture_dislocation",
  "ligament_instability",
  "arthritis",
  "infection",
  "tumor_or_mass",
  "procedure",
] as const;

export const HAND_WRIST_OWNERSHIP_RULES: HandWristOwnershipRule[] = [
  {
    slugPattern: /abductor-pollicis-brevis|thenar|lumbrical|interossei|opponens|adductor-pollicis/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "CROSS_NEIGHBORHOOD_REFERENCE",
    stagingConnected: true,
    publicationDeferred: true,
    rationale:
      "Intrinsic hand muscles are real canonical anatomy owned by the Hand anatomy backbone. Condition topics may reference them for exam/EDX concepts without owning their full hierarchy.",
  },
  {
    slugPattern: /fpl|fdp|fds|epl|epb|apl|edc|ecu|fcr|fcu|tendon|tendon-zone/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Tendons and tendon zones are shared hand anatomy backbone nodes unless the local topic adds a valid procedure/exposure relationship.",
  },
  {
    slugPattern: /a[1-5]-pulley|c[1-3]-pulley|pulley/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Pulley identity and core anatomy are owned by the Hand anatomy backbone.",
  },
  {
    slugPattern: /median-nerve|ulnar-nerve|radial-nerve|ain|pin|digital-nerves|recurrent-motor-branch|palmar-cutaneous-branch/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Nerves and branches are shared anatomy; procedure neighborhoods add risk relationships and exam neighborhoods add assessment relationships.",
  },
  {
    slugPattern: /radial-artery|ulnar-artery|palmar-arch|vessel/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Vascular anatomy identity is shared across hand topics.",
  },
  {
    slugPattern: /radius|ulna|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|metacarpal|phalanx/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Bones are canonical hand/wrist anatomy identities reused by condition and procedure topics.",
  },
  {
    slugPattern: /mcp|pip|dip|cmc|druj|pruj|joint/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Joint identities and core articulations are owned by the Hand anatomy backbone.",
  },
  {
    slugPattern: /ligament|tfcc|volar-plate/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Ligament identities are shared anatomy. Local topics add injury, instability, or at-risk semantics only with valid predicates.",
  },
  {
    slugPattern: /carpal-tunnel|guyon-canal|compartment/i,
    entityType: "anatomy_structure",
    canonicalOwner: HAND_WRIST_CANONICAL_ANATOMY_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "Compartments/canals are shared anatomy containers imported by condition and procedure neighborhoods.",
  },
  {
    slugPattern: /electromyography|nerve-conduction|electrodiagnostic/i,
    entityType: "diagnostic_test",
    canonicalOwner: HAND_WRIST_EDX_OWNER,
    disposition: "VALID_STAGING_DEFER",
    stagingConnected: true,
    publicationDeferred: true,
    rationale: "EDX tests are shared diagnostic assets; condition topics reference them but do not own complete EDX vocabulary.",
  },
];

export const HAND_WRIST_CONNECTIVITY_EXPECTATIONS = {
  classification: "Classification systems require a has_classification edge to a condition before staging.",
  procedure: "Procedures require an indication, pathway, approach, complication, or anatomy relationship before staging.",
  sharedAnatomy:
    "A shared anatomy entity can satisfy staging connectivity through a recognized ownership rule and explicit valid staging defer/cross-neighborhood reference.",
  placeholder: "Unexplained placeholders remain staging blockers.",
};

export const HAND_WRIST_INSTRUMENTATION_RULES = {
  instrumentsAreNotImplants: true,
  stagingAction: "Instrument/tool sets should be omitted or represented as metadata until instrument vocabulary exists.",
};

export function resolveHandWristOwnership(slug: string, label: string, entityType: string): HandWristOwnershipRule | undefined {
  const text = `${slug} ${label}`;
  return HAND_WRIST_OWNERSHIP_RULES.find((rule) => rule.entityType === entityType && rule.slugPattern.test(text));
}

export function isRecognizedHandSharedBackboneEntity(slug: string, label: string, entityType: string): boolean {
  return Boolean(resolveHandWristOwnership(slug, label, entityType));
}
