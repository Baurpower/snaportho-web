import type {
  BroBotChatIntent,
  BroBotClinicalContext,
  BroBotClinicalTaskFacet,
} from "@/lib/brobot/chat/types";
import { HAND_ABBREVIATION_LEXICON } from "@/lib/brobot/chat/entity-resolution";
import { findAbbreviations } from "./abbreviations";
// Cycle note: qualifiers.ts imports normalization helpers from this module;
// both directions are used only inside functions (never at module eval),
// so the ESM live bindings resolve safely.
import { containsOrthoStructure } from "./qualifiers";

export const BROBOT_QUERY_UNDERSTANDING_VERSION = "brobot-query-understanding.v2" as const;

export type BroBotSupportLevel = "supported" | "partially_supported" | "unsupported";

export type BroBotSupportAssessment = {
  level: BroBotSupportLevel;
  categories: string[];
};

export const MAX_QUERY_VARIANTS = 12;
export const MAX_QUERY_TERMS = 24;
export const MAX_QUERY_LENGTH = 500;

/** Retrieval facet vocabulary shared with the v3 SQL policy. */
export type BroBotRetrievalFacet =
  | "diagnosis"
  | "classification"
  | "indication"
  | "threshold"
  | "imaging"
  | "anatomy"
  | "exposure"
  | "complication"
  | "treatment"
  | "prognosis"
  | "technique";

export type BroBotQueryUnderstanding = {
  version: typeof BROBOT_QUERY_UNDERSTANDING_VERSION;
  /** Original user wording, trimmed and bounded. Never replaced by a label. */
  primaryQuery: string;
  /** Deterministic variants: normalized, expanded, singular/plural. */
  variants: string[];
  /** Content terms for token-coverage channels (lowercased, stop-word stripped). */
  terms: string[];
  /** Requested facets derived from mode/subintent/task facets. */
  facets: BroBotRetrievalFacet[];
  /** Abbreviations detected and expanded. */
  expansions: Array<{ abbreviation: string; expansion: string }>;
  /** True when conversational context contributed query material. */
  usedContext: boolean;
  /** Non-clinical topic requiring abstention, when detected. */
  unsupportedTopic: string | null;
  /** Corpus support assessment: full, partial, or unsupported. */
  support: BroBotSupportAssessment;
};

/** Function words with no retrieval value. Clinical words stay. */
export const MEDICAL_STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "and", "or", "but", "of", "for", "with", "without",
  "in", "on", "at", "to", "from", "by", "about", "into", "over", "after",
  "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
  "is", "are", "was", "were", "be", "been", "being", "do", "does", "did",
  "can", "could", "should", "would", "will", "shall", "may", "might", "must",
  "i", "me", "my", "we", "us", "our", "you", "your", "he", "him", "his",
  "she", "her", "it", "its", "they", "them", "their", "this", "that",
  "these", "those", "there", "here", "than", "then", "so", "such", "as",
  "if", "else", "not", "no", "yes", "just", "very", "much", "more", "most",
  "please", "tell", "explain", "describe", "give", "show", "need", "want",
  "like", "know", "think", "tomorrow", "today", "tonight", "vs",
  // Setting/procedure words ("ankle fracture consult", "what changes
  // urgency") carry no topic: as terms they dilute coverage and inflate
  // hapax-weighted miss denominators.
  "consult", "changes",
]);

const SUBINTENT_FACETS: Readonly<Record<string, readonly BroBotRetrievalFacet[]>> = {
  landmarks: ["anatomy", "exposure"],
  surgical_steps: ["technique", "exposure", "anatomy", "complication"],
  surgical_approach: ["exposure", "anatomy", "technique", "complication"],
  diagnostic_sequence: ["technique", "diagnosis"],
  implant_options: ["treatment", "technique"],
  brand_comparison: ["treatment"],
  anatomy_at_risk: ["anatomy", "complication"],
  attending_questions: ["technique", "anatomy", "complication"],
  treatment_algorithm: ["treatment", "indication", "threshold", "complication"],
  classification: ["classification"],
  indications: ["indication"],
  operative_indications: ["indication"],
  patient_explanation: ["diagnosis", "treatment", "prognosis"],
  quiz: ["diagnosis", "classification"],
  oite_traps: ["diagnosis", "classification", "threshold"],
  workup: ["diagnosis", "imaging"],
  evidence_critique: ["prognosis", "treatment"],
  initial_consult: ["diagnosis", "imaging", "treatment", "threshold", "complication"],
  presentation_help: ["diagnosis", "treatment"],
  imaging_review: ["imaging", "diagnosis"],
  differential: ["diagnosis"],
  treatment_plan: ["treatment", "indication", "prognosis", "complication"],
  complication: ["complication", "prognosis"],
  postop_problem: ["complication", "treatment"],
  fracture: ["classification", "diagnosis", "imaging", "treatment", "threshold", "complication"],
  infection: ["diagnosis", "treatment", "complication"],
  urgent_red_flags: ["diagnosis", "complication", "threshold"],
  overview: [],
  other: [],
};

const TASK_FACET_MAP: Readonly<Record<BroBotClinicalTaskFacet, BroBotRetrievalFacet | null>> = {
  anatomy: "anatomy",
  classification: "classification",
  workup: "diagnosis",
  imaging: "imaging",
  indications: "indication",
  treatmentAlgorithm: "treatment",
  exposure: "exposure",
  steps: "technique",
  implants: "treatment",
  complications: "complication",
  pitfalls: "complication",
  testTraps: "classification",
  distractors: "diagnosis",
  disposition: "treatment",
};

const MODE_FACETS: Readonly<Record<string, readonly BroBotRetrievalFacet[]>> = {
  or_prep: ["exposure", "anatomy", "technique", "complication"],
  oite: ["classification", "threshold", "diagnosis", "treatment"],
  clinic: ["diagnosis", "imaging", "indication", "treatment", "prognosis"],
  consult: ["diagnosis", "imaging", "threshold", "treatment", "complication"],
  fracture_call: ["diagnosis", "imaging", "threshold", "treatment", "complication"],
  research: ["prognosis", "treatment"],
  general: [],
};

/**
 * Facet keyword lexicon shared by query understanding (task-facet evidence)
 * and reranking (claim-facet inference). Substring matching on normalized
 * text; keep entries specific enough to avoid cross-facet noise.
 */
export const FACET_KEYWORDS: Readonly<Record<BroBotRetrievalFacet, readonly string[]>> = {
  diagnosis: ["diagnos", "exam", "finding", "present", "common", "risk factor", "maneuver", "sign", "palpat", "test", "tear"],
  classification: ["classifi", "grade", "staging", "garden", "schatzker", "southwick", "meyerding", "gustilo", "salter", " type ", " types "],
  // Keep indication tight: warrant/consider/require appear in workup and
  // technique claims ("warrants workup", "requires anatomic reduction") and
  // would mark them indication-compatible, defeating abstention.
  indication: ["indicat", "recommend"],
  threshold: [],
  imaging: ["mri", "arthrogram", "mortise", "radiograph", "x ray", "xray", "klein", "shenton", " ct ", "ultrasound", "fluoroscop"],
  anatomy: ["nerve", "artery", "vein", "muscle", "tendon", "ligament", "branch", "insertion", "origin", "innervat", "blood supply"],
  exposure: ["approach", "incision", "exposure", "interval"],
  complication: ["complicat", "palsy", "necrosis", "nonunion", "malunion", "infection", "stiffness", "arthrofibrosis", "sequela", "risk"],
  treatment: ["treat", "manag", "surg", "operat", "fixation", "arthroplasty", "reconstruct", "fasciotomy", "osteotomy", "fusion", "repair", "graft", "antibiotic", "release"],
  prognosis: ["prognosis", "mortality", "survival", "outcome", "return to"],
  technique: ["tunnel", "technique", "placed", "placement", "portal", "reduction", "pin", "screw", "plate"],
};

/**
 * Task-facet evidence lexicon. Topic words in the question ("reconstruction",
 * "fixation") name the subject, not the ask, so procedure nouns must not
 * evidence a treatment facet ("indications for ACL reconstruction" is not a
 * treatment question). Conversely "need" evidences an indications ask even
 * though it is too noisy for claim-side inference.
 */
const TASK_EVIDENCE_KEYWORDS: Readonly<Record<BroBotRetrievalFacet, readonly string[]>> = {
  ...FACET_KEYWORDS,
  indication: [...FACET_KEYWORDS.indication, "need"],
  treatment: ["treat", "manag", "surg", "operat", "antibiotic"],
};

export function normalizeRetrievalText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeRetrievalText(value: string): string[] {
  return normalizeRetrievalText(value).split(" ").filter(Boolean);
}

function singularPluralVariants(token: string): string[] {
  const out = new Set<string>([token]);
  if (token.length > 4 && token.endsWith("ies")) out.add(`${token.slice(0, -3)}y`);
  else if (token.length > 4 && token.endsWith("es") && /(s|x|z|ch|sh)es$/.test(token)) out.add(token.slice(0, -2));
  else if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) out.add(token.slice(0, -1));
  else if (token.length > 2 && !token.endsWith("s")) out.add(`${token}s`);
  return [...out];
}

/** Hand abbreviations that collide with English words: expand only when uppercase. */
const CASE_SENSITIVE_HAND_ABBREVS: ReadonlySet<string> = new Set(["PIN", "AIN", "IP"]);

function expandHandAbbreviations(text: string): Array<{ abbreviation: string; expansion: string }> {
  const out: Array<{ abbreviation: string; expansion: string }> = [];
  for (const abbrev of Object.keys(HAND_ABBREVIATION_LEXICON)) {
    const pattern = CASE_SENSITIVE_HAND_ABBREVS.has(abbrev)
      ? new RegExp(`\\b${abbrev}\\b`)
      : new RegExp(`\\b${abbrev}\\b`, "i");
    if (!pattern.test(text)) continue;
    const entry = HAND_ABBREVIATION_LEXICON[abbrev][0];
    if (entry) out.push({ abbreviation: abbrev, expansion: entry.expansion });
  }
  return out;
}

/**
 * Non-clinical topics the knowledge graph will never cover. Matched against
 * the user question for abstention (answering these from KG claims would be
 * fabrication). Clinical-but-uncovered topics (rare diseases, novel
 * therapies) are NOT listed here; they abstain via the relevance threshold.
 */
export const UNSUPPORTED_TOPIC_PATTERNS: ReadonlyArray<{ topic: string; pattern: RegExp }> = [
  { topic: "billing", pattern: /\b(cpt|icd[-\s]?10|rvu|billing|reimbursement|prior auth\w*|coding\b.{0,20}(bill|charge|cpt|icd))/i },
  { topic: "billing", pattern: /\b(code|codes)\b.{0,30}\b(bill|charge|cpt|reimbursement)\b/i },
  { topic: "billing", pattern: /\b(bill|charge)\b.{0,30}\b(code| codes|cpt)\b/i },
  { topic: "legal", pattern: /\b(malpractice|medicolegal|lawyer|attorney|lawsuit|litigation|expert witness)\b/i },
  { topic: "cost", pattern: /\b(how much (does|is|will)|cost of|price of|self[-\s]?pay|copay|out of pocket)\b/i },
  { topic: "paperwork", pattern: /\b(work note|sick note|doctor'?s note|disability (paperwork|form|claim)|fmla|time off work)\b/i },
  { topic: "administrative", pattern: /\b(appointment|insurance|medical records?|referral (letter|form|paperwork))\b|\bschedul\w+\b.{0,25}\b(appointment|visit|follow[\s-]?up|consult(ation)?|clinic)\b|\b(appointment|visit|follow[\s-]?up)\b.{0,25}\bschedul\w+\b/i },
  { topic: "imaging", pattern: /\b(read|interpret)\b.{0,30}\b(this|that|attached|my)\b.{0,30}\b(x-?ray|xray|mri|ct|cat[-\s]?scan|film|images?|radiograph)\b/i },
  { topic: "imaging", pattern: /\b(this|that|attached)\b.{0,20}\b(x-?ray|xray|mri|ct|film|images?|radiograph)\b.{0,20}\bshows?\b/i },
  { topic: "veterinary", pattern: /\b(dog(?![-\s]+bite)|horse|equine|canine|feline|veterinar\w+|my pet|puppy|kitten)\b|\bcat\b(?![-\s]+scan)/i },
];

/** Partially supported: serve only high-confidence claims addressing the supported part. */
export const PARTIALLY_SUPPORTED_PATTERNS: ReadonlyArray<{ category: string; pattern: RegExp }> = [
  { category: "procedural-sequence", pattern: /\bstep[\s-]?by[\s-]?step\b|\bsteps of (the )?(operation|procedure|surgery|orif|fixation)\b|\bwalk me through\b|\bhow do i perform\b|\boperative steps\b|\border of steps\b/i },
  { category: "patient-specific-context", pattern: /\b(my patient|this patient)\b.{0,60}\b(anticoagulat|eliquis|xarelto|warfarin|heparin|dementia|pregnan|dialysis|transplant|immunocompromis|hospice|allerg|palliative|chemotherapy)\b/i },
  { category: "evidence-synthesis", pattern: /\bsystematic review\b|\bmeta[-\s]?analysis\b|\bcochrane\b/i },
];

const NON_ORTHO_MEDICINE = /\b(heart attack|myocardial|stroke|pneumonia|asthma|copd|uti|urinary tract|rash|hives|cough|sore throat|headache|migraine|seizure|chest (pain|pressure|tightness)|shortness of breath|\bsob\b|abdominal|nausea|vomit|diarrhea|dizz|vertigo|hypertension|hyperglycemia|fever|depression|anxiety)\b/i;

export function detectUnsupportedTopic(message: string): string | null {
  const assessment = assessSupport(message);
  if (assessment.level !== "unsupported") return null;
  return assessment.categories[0] ?? "an unsupported topic";
}

/**
 * Corpus support assessment. Unsupported categories dominate; vague
 * semantic overlap never upgrades a question (billing + "ankle" stays
 * billing). Non-orthopaedic medicine requires the ABSENCE of any
 * orthopaedic structure, so "fever after TKA" stays supported.
 */
export function assessSupport(message: string): BroBotSupportAssessment {
  const unsupported: string[] = [];
  for (const entry of UNSUPPORTED_TOPIC_PATTERNS) {
    if (entry.pattern.test(message)) unsupported.push(entry.topic);
  }
  if (NON_ORTHO_MEDICINE.test(message) && !containsOrthoStructure(message)) {
    unsupported.push("non-orthopaedic medicine");
  }
  if (unsupported.length > 0) {
    return { level: "unsupported", categories: [...new Set(unsupported)] };
  }
  const partial: string[] = [];
  for (const entry of PARTIALLY_SUPPORTED_PATTERNS) {
    if (entry.pattern.test(message)) partial.push(entry.category);
  }
  if (partial.length > 0) {
    return { level: "partially_supported", categories: [...new Set(partial)] };
  }
  return { level: "supported", categories: [] };
}

function deriveFacets(input: {
  intent: BroBotChatIntent;
  clinicalContext: BroBotClinicalContext;
  message: string;
}): BroBotRetrievalFacet[] {
  const facets: BroBotRetrievalFacet[] = [];
  const push = (facet: BroBotRetrievalFacet | null | undefined) => {
    if (facet && !facets.includes(facet)) facets.push(facet);
  };
  for (const facet of SUBINTENT_FACETS[input.intent.subintent] ?? []) push(facet);
  // Task facets come from keyword rules that over-fire (an indications
  // question spuriously gains workup/imaging task facets). Keep a task facet
  // only when the message itself evidences that facet's vocabulary.
  const normalized = ` ${normalizeRetrievalText(input.message)} `;
  for (const taskFacet of input.clinicalContext.taskFacets ?? []) {
    const mapped = TASK_FACET_MAP[taskFacet];
    if (!mapped || facets.includes(mapped)) continue;
    const keywords = TASK_EVIDENCE_KEYWORDS[mapped] ?? [];
    const evidenced =
      mapped === "threshold"
        ? /\d/.test(normalized)
        : keywords.some((keyword) => normalized.includes(keyword));
    if (evidenced) push(mapped);
  }
  // Explicit ask-words add facets even when the mode's task template lacks
  // them (OR/clinic templates have no indications or classification task, so
  // "when does the ulna need ORIF" and "how are fractures classified" would
  // otherwise lose their facet entirely).
  if (normalized.includes("classifi")) push("classification");
  if (normalized.includes("need")) push("indication");
  // Directional and bone-part asks ("which way does the metaphysis slip")
  // need anatomy-faceted evidence; no task template covers this.
  if (
    normalized.includes("direction") ||
    normalized.includes("orientation") ||
    normalized.includes("which way") ||
    normalized.includes("metaphysis") ||
    normalized.includes("epiphysis") ||
    normalized.includes("diaphysis") ||
    normalized.includes("physis")
  ) {
    push("anatomy");
  }
  // Mode facets are a fallback for vague questions only. When the subintent
  // or task facets already pin the ask (indications, classification), broad
  // mode defaults would erase facet precision and defeat mismatch penalties.
  if (facets.length === 0) {
    for (const facet of MODE_FACETS[input.intent.mode] ?? []) push(facet);
  }
  return facets.slice(0, 8);
}

export function buildQueryUnderstanding(input: {
  message: string;
  intent: BroBotChatIntent;
  clinicalContext: BroBotClinicalContext;
  selectedBranch?: { id?: string; label?: string };
  conversationContext?: string | null;
}): BroBotQueryUnderstanding {
  const primaryQuery = input.message.trim().slice(0, MAX_QUERY_LENGTH);
  const contextText = [
    input.intent.procedureOrTopic,
    input.selectedBranch?.label,
    input.conversationContext,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(" ");
  const usedContext = contextText.trim().length > 0;

  const combined = [primaryQuery, contextText].filter(Boolean).join(" ");
  const normalized = normalizeRetrievalText(combined).slice(0, MAX_QUERY_LENGTH);
  const variants = new Set<string>();
  if (normalized) variants.add(normalized);

  const expansions = [
    ...expandHandAbbreviations(combined),
    ...findAbbreviations(combined),
  ];
  const seenExpansions = new Set<string>();
  const dedupedExpansions = expansions.filter((entry) => {
    const key = entry.abbreviation.toUpperCase();
    if (seenExpansions.has(key)) return false;
    seenExpansions.add(key);
    return true;
  });

  for (const entry of dedupedExpansions) {
    const expanded = normalizeRetrievalText(
      combined.replace(new RegExp(`\\b${entry.abbreviation}\\b`, "gi"), entry.expansion)
    ).slice(0, MAX_QUERY_LENGTH);
    if (expanded && expanded !== normalized) variants.add(expanded);
    variants.add(normalizeRetrievalText(entry.expansion));
  }

  if (input.intent.procedureOrTopic) {
    const topic = normalizeRetrievalText(input.intent.procedureOrTopic);
    if (topic) variants.add(topic);
  }

  const contentTokens = tokenizeRetrievalText(combined).filter(
    (token) => token.length >= 2 && !MEDICAL_STOP_WORDS.has(token)
  );
  const singularized = contentTokens
    .flatMap((token) => singularPluralVariants(token).slice(0, 1))
    .join(" ");
  if (singularized && singularized !== normalized) variants.add(singularized.slice(0, MAX_QUERY_LENGTH));

  const terms = [...new Set(contentTokens)].slice(0, MAX_QUERY_TERMS);

  return {
    version: BROBOT_QUERY_UNDERSTANDING_VERSION,
    primaryQuery,
    variants: [...variants].slice(0, MAX_QUERY_VARIANTS),
    terms,
    facets: deriveFacets({ ...input, message: primaryQuery }),
    expansions: dedupedExpansions,
    usedContext,
    unsupportedTopic: detectUnsupportedTopic(primaryQuery),
    support: assessSupport(combined),
  };
}
