import type { OntologyGap } from "../../kg-compiler/types.ts";
import type { ClaimType } from "./claim-type-classifier.ts";

export type LearnerStage = "preclinical" | "clerkship" | "intern" | "resident";

const ENTITY_KEYWORDS: Array<{ slug: string; patterns: RegExp[] }> = [
  { slug: "medial-clear-space-widening", patterns: [/medial clear space/i, /clear space widening/i] },
  { slug: "ankle-ring", patterns: [/ankle ring/i, /ring concept/i, /ring disruption/i] },
  { slug: "mortise-stability", patterns: [/mortise/i] },
  { slug: "deltoid-ligament", patterns: [/deltoid/i] },
  { slug: "syndesmosis", patterns: [/syndesmos/i] },
  { slug: "lateral-malleolus", patterns: [/lateral malleolus/i, /isolated fibula/i] },
  { slug: "medial-malleolus", patterns: [/medial malleolus/i] },
];

export function resolvePrimaryEntitySlug(
  text: string,
  defaultSlug: string,
  anchorFromGap?: string
): string {
  if (anchorFromGap) return anchorFromGap;
  for (const entry of ENTITY_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(text))) return entry.slug;
  }
  return defaultSlug;
}

export function inferImportanceLevel(
  claimType: ClaimType,
  section: string,
  gap?: OntologyGap
): "L1" | "L2" | "L3" | "L4" {
  if (gap?.priority === "critical" || gap?.priority === "high") {
    if (["board_trap", "cognitive_trap", "red_flag"].includes(claimType)) return "L1";
  }
  if (["board_trap", "cognitive_trap", "red_flag"].includes(claimType)) return "L1";
  if (claimType === "anatomy_pearl" || claimType === "imaging_point") {
    if (section.startsWith("fast.") || section === "deep.boardPearls") return "L1";
    return "L2";
  }
  if (section.startsWith("fast.")) return "L1";
  if (section.startsWith("deep.")) return "L2";
  return "L3";
}

export function inferWhyItMatters(text: string, claimType: ClaimType): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();

  if (/\b(unstable|instability|mortise|syndesmos|deltoid)\b/i.test(lower)) {
    tags.push("changes_management");
  }
  if (/\b(board|oite|trap|equivalent)\b/i.test(lower) || claimType === "board_trap") {
    tags.push("board_trap");
  }
  if (/\b(skin|nv |neurovascular|compartment|emergency)\b/i.test(lower)) {
    tags.push("patient_safety");
  }
  if (/\b(imaging|radiograph|stress view|ct )\b/i.test(lower)) {
    tags.push("imaging_decision");
  }
  if (/\b(anatomy|ligament|ring)\b/i.test(lower)) {
    tags.push("anatomical_reasoning");
  }
  if (tags.length === 0) {
    tags.push("clinical_reasoning");
  }
  return [...new Set(tags)];
}

export function inferContextRelevance(section: string, claimType: ClaimType): string[] {
  const contexts: string[] = [];
  if (section.startsWith("fast.") || claimType === "clinical_script") {
    contexts.push("clinic", "call");
  }
  if (claimType === "board_trap" || claimType === "cognitive_trap") {
    contexts.push("oite");
  }
  if (claimType === "imaging_point") {
    contexts.push("clinic");
  }
  if (section.includes("orSurvival") || section.includes("caseSteps")) {
    contexts.push("or");
  }
  if (contexts.length === 0) contexts.push("clinic");
  return [...new Set(contexts)];
}

export function inferLearnerStage(subspecialty?: string, trackId?: string): LearnerStage {
  if (trackId === "trauma" || subspecialty === "Trauma") return "clerkship";
  return "clerkship";
}

export function isSafetyClaim(claimType: ClaimType, text: string, whyTags: string[]): boolean {
  if (claimType === "red_flag") return true;
  if (whyTags.includes("patient_safety")) return true;
  return /\b(emergency|must not|never ignore|compartment|neurovascular|skin compromise)\b/i.test(text);
}

export function buildUncertaintyNote(section: string, evidenceCount: number): string | undefined {
  if (evidenceCount < 2) {
    return `Single-source internal draft (${section}); requires human verification before learner consumption.`;
  }
  return undefined;
}