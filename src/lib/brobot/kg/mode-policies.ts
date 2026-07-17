import type { BroBotChatMode } from "@/lib/brobot/chat/types";
import type { BroBotKgModePolicy } from "./contracts";

const limits = {
  maxAnchorsByDepth: { quick: 1, standard: 2, deep: 3 },
  maxEntitiesByDepth: { quick: 4, standard: 6, deep: 8 },
  maxRelationshipsByDepth: { quick: 6, standard: 10, deep: 14 },
  maxNeighborhoodsByDepth: { quick: 1, standard: 2, deep: 2 },
  tokenBudgetByDepth: { quick: 450, standard: 800, deep: 1200 },
} as const;

const policies: Record<string, BroBotKgModePolicy> = {
  or_prep: {
    ...limits,
    entityTypes: ["procedure", "anatomy_structure", "implant", "fixation_method", "complication", "imaging_finding"],
    predicateFamilies: ["uses_approach", "involves_anatomy", "at_risk_structure", "uses_implant", "uses_fixation", "requires_imaging", "has_complication", "indicated_for"],
  },
  oite: {
    ...limits,
    entityTypes: ["condition", "classification_system", "classification_grade", "biomechanics_concept", "imaging_finding", "treatment_principle", "complication"],
    predicateFamilies: ["has_classification", "has_grade", "explains_instability", "has_imaging_finding", "requires_imaging", "indicates_treatment", "treated_by", "has_complication", "commonly_confused_with"],
  },
  clinic: {
    ...limits,
    entityTypes: ["condition", "exam_maneuver", "diagnostic_test", "imaging_finding", "treatment_principle", "complication"],
    predicateFamilies: ["tested_by", "examines", "requires_imaging", "has_imaging_finding", "differential_for", "treated_by", "has_complication"],
  },
  consult: {
    ...limits,
    entityTypes: ["condition", "anatomy_structure", "diagnostic_test", "imaging_finding", "treatment_principle", "complication"],
    predicateFamilies: ["involves_anatomy", "at_risk_structure", "requires_imaging", "has_imaging_finding", "treated_by", "has_complication", "indicates_treatment"],
  },
  research: {
    ...limits,
    maxRelationshipsByDepth: { quick: 3, standard: 5, deep: 6 },
    tokenBudgetByDepth: { quick: 250, standard: 400, deep: 500 },
    entityTypes: ["condition", "procedure", "implant", "treatment_principle"],
    predicateFamilies: ["treated_by", "treats", "commonly_confused_with", "differential_for", "uses_implant"],
  },
  general: {
    ...limits,
    maxRelationshipsByDepth: { quick: 4, standard: 7, deep: 10 },
    entityTypes: ["condition", "procedure", "anatomy_structure", "classification_system", "implant", "diagnostic_test", "imaging_finding", "biomechanics_concept", "complication"],
    predicateFamilies: ["involves_anatomy", "has_classification", "requires_imaging", "has_imaging_finding", "tested_by", "treated_by", "has_complication", "uses_implant"],
  },
};

export function getBroBotKgModePolicy(mode: BroBotChatMode): BroBotKgModePolicy {
  const normalized = mode === "fracture_call" ? "consult" : mode === "auto" ? "general" : mode;
  return policies[normalized] ?? policies.general;
}
