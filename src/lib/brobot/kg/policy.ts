import type { BroBotKgDecision, BroBotKgDecisionInput } from "./contracts";

export const BROBOT_KG_DECISION_THRESHOLDS = {
  retrieve: 0.55,
  lightweightResolve: 0.35,
} as const;

const BYPASS_PATTERNS: Array<[RegExp, string]> = [
  [/\b(subscription|billing|charge|refund|quota|free uses?|account|password|login)\b/i, "account_or_billing"],
  [/\b(schedule|calendar|rotation request|shift|meeting|appointment)\b/i, "administrative_or_scheduling"],
  [/\b(personal statement|cover letter|cv|resume|proofread|rewrite this)\b/i, "writing_review"],
  [/\b(burnout|anxious|anxiety|overwhelmed|sad|depressed|emotional support)\b/i, "emotional_support"],
  [/^\s*(hi|hello|hey|thanks|thank you|good morning|good evening)[!. ]*$/i, "social_turn"],
  [/\b(feature request|bug report|product feedback|brobot app)\b/i, "product_feedback"],
];

const CLINICAL_PATTERN =
  /\b(fracture|dislocation|arthritis|tendon|ligament|nerve|anatomy|approach|exposure|orif|arthroplasty|implant|plate|nail|screw|classification|weber|garden|schatzker|imaging|x-?ray|ct|mri|biomechanic|complication|rehab|oite|orthop|joint|bone|syndrome)\b/i;

export function decideBroBotKgRetrieval(input: BroBotKgDecisionInput): BroBotKgDecision {
  const reasons: string[] = [];
  for (const [pattern, bypassReason] of BYPASS_PATTERNS) {
    if (pattern.test(input.query)) {
      return { eligible: false, action: "bypass", score: 0, reasons: [`bypass:${bypassReason}`], bypassReason };
    }
  }

  const hasDetectedEntity = Object.values(input.clinicalContext.entities).some(Boolean);
  const hasTaskFacets = input.clinicalContext.taskFacets.length > 0;
  const hasClinicalLanguage = CLINICAL_PATTERN.test(`${input.query} ${input.intent.procedureOrTopic}`);
  const genericStudyPlanning =
    /\b(what should i study|study plan|study tonight|how should i study)\b/i.test(input.query) &&
    !hasDetectedEntity &&
    !hasClinicalLanguage;
  const clarificationOnly =
    Boolean(input.intent.requiresBranchSelection) &&
    input.intent.ambiguity === "high" &&
    !hasDetectedEntity &&
    !hasClinicalLanguage;

  if (genericStudyPlanning || clarificationOnly) {
    const bypassReason = genericStudyPlanning ? "generic_study_planning" : "unresolved_clarification";
    return { eligible: false, action: "bypass", score: 0.1, reasons: [`bypass:${bypassReason}`], bypassReason };
  }

  let score = 0;
  if (hasDetectedEntity) {
    score += 0.34;
    reasons.push("detected_clinical_entity");
  }
  if (hasClinicalLanguage) {
    score += 0.24;
    reasons.push("clinical_language");
  }
  if (hasTaskFacets) {
    score += 0.12;
    reasons.push("clinical_task_facets");
  }
  if (input.mode !== "general") {
    score += input.mode === "research" ? 0.06 : 0.15;
    reasons.push(`mode:${input.mode}`);
  }
  if (input.selectedBranch?.label) {
    score += 0.08;
    reasons.push("selected_branch");
  }
  if (input.conversationTopic) {
    score += 0.06;
    reasons.push("conversation_topic_continuity");
  }
  if (input.intent.ambiguity === "high") {
    score -= 0.2;
    reasons.push("penalty:high_ambiguity");
  } else if (input.intent.ambiguity === "moderate") {
    score -= 0.05;
  }
  if (input.clinicalContext.missingCriticalSlots.length > 0 && input.mode === "consult") {
    score -= 0.08;
    reasons.push("patient_specificity_guard");
  }

  score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  if (score >= BROBOT_KG_DECISION_THRESHOLDS.retrieve) {
    return { eligible: true, action: "retrieve", score, reasons };
  }
  if (score >= BROBOT_KG_DECISION_THRESHOLDS.lightweightResolve) {
    return { eligible: true, action: "lightweight_resolve", score, reasons };
  }
  return {
    eligible: false,
    action: "bypass",
    score,
    reasons: [...reasons, "bypass:low_expected_utility"],
    bypassReason: "low_expected_utility",
  };
}
