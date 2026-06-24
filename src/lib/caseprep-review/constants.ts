/**
 * Frontend mirror of caseprep/registry/constants.py.
 * Keep in sync with the Python source.
 */

export const REQUIRED_SECTIONS = new Set([
  "indications",
  "setup_positioning",
  "approach_landmarks",
  "surgical_layers",
  "structures_at_risk",
  "pitfalls",
  "attending_pimp_questions",
  "postop_plan",
]);

// Sections whose content is a flat bullet list (supports Move Bullet).
export const BULLET_SECTIONS = new Set([
  "indications",
  "setup_positioning",
  "approach_landmarks",
  "implant_strategy",
  "reduction_or_fluoro_checkpoints",
  "pitfalls",
  "postop_plan",
]);

export const CERTIFIER_ROLES = new Set([
  "attending_reviewer",
  "certifier",
  "content_admin",
]);

export const EDITOR_ROLES = new Set([
  "resident_reviewer",
  "attending_reviewer",
  "certifier",
  "content_admin",
]);
