export type ClaimType =
  | "fact"
  | "anatomy_pearl"
  | "imaging_point"
  | "board_trap"
  | "cognitive_trap"
  | "common_mistake"
  | "attending_pearl"
  | "clinical_script"
  | "red_flag";

export type SectionHint =
  | "fast.mustKnow"
  | "fast.anatomyFocus"
  | "fast.oneLiner"
  | "fast.pimpQuestions"
  | "fast.orSurvivalTips"
  | "fast.caseSteps"
  | "deep.anatomy"
  | "deep.classification"
  | "deep.imaging"
  | "deep.decisionMaking"
  | "deep.treatmentOptions"
  | "deep.boardPearls"
  | "deep.complications"
  | "learning_objectives"
  | "unknown";

const SECTION_DEFAULTS: Partial<Record<SectionHint, ClaimType>> = {
  "fast.mustKnow": "fact",
  "fast.anatomyFocus": "anatomy_pearl",
  "fast.orSurvivalTips": "cognitive_trap",
  "fast.caseSteps": "clinical_script",
  "deep.anatomy": "anatomy_pearl",
  "deep.classification": "fact",
  "deep.imaging": "imaging_point",
  "deep.boardPearls": "board_trap",
  "deep.complications": "fact",
};

export function classifyClaimType(
  text: string,
  section: SectionHint,
  gapClaimType?: string
): ClaimType | "reject_management" | "reject_question" {
  const lower = text.toLowerCase();

  if (section === "deep.decisionMaking" || section === "deep.treatmentOptions") {
    return "reject_management";
  }

  if (text.trim().endsWith("?")) {
    if (/\b(assume|forget|miss|ignore|without assessing)\b/i.test(text)) {
      return "cognitive_trap";
    }
    return "reject_question";
  }

  if (/\b(assume|forget|miss|ignore|trap|mistake|without assessing)\b/i.test(lower)) {
    return "cognitive_trap";
  }
  if (/\b(unstable|bimalleolar equivalent|do not miss|widening suggests)\b/i.test(lower)) {
    return "board_trap";
  }
  if (/\b(radiograph|imaging|stress view|ct |mortise view|clear space)\b/i.test(lower)) {
    return "imaging_point";
  }
  if (/\b(anatomy|ligament|syndesmos|malleol|ring concept|talus)\b/i.test(lower)) {
    return "anatomy_pearl";
  }
  if (/\b(on rounds|state whether|comment on|outline)\b/i.test(lower)) {
    return "clinical_script";
  }
  if (/\b(emergency|urgent|must not|never ignore|compartment)\b/i.test(lower)) {
    return "red_flag";
  }

  if (SECTION_DEFAULTS[section]) return SECTION_DEFAULTS[section]!;

  if (gapClaimType) {
    const preferred = gapClaimType.split("|").find((t) => isValidClaimType(t));
    if (preferred) return preferred as ClaimType;
  }

  return "fact";
}

function isValidClaimType(t: string): t is ClaimType {
  return [
    "fact",
    "anatomy_pearl",
    "imaging_point",
    "board_trap",
    "cognitive_trap",
    "common_mistake",
    "attending_pearl",
    "clinical_script",
    "red_flag",
  ].includes(t);
}

export function parseSectionHint(section: string): SectionHint {
  const known: SectionHint[] = [
    "fast.mustKnow",
    "fast.anatomyFocus",
    "fast.oneLiner",
    "fast.pimpQuestions",
    "fast.orSurvivalTips",
    "fast.caseSteps",
    "deep.anatomy",
    "deep.classification",
    "deep.imaging",
    "deep.decisionMaking",
    "deep.treatmentOptions",
    "deep.boardPearls",
    "deep.complications",
    "learning_objectives",
  ];
  return known.includes(section as SectionHint) ? (section as SectionHint) : "unknown";
}