/**
 * Atomic multi-claim extraction for versioned Anki cards.
 *
 * A CARD IS NOT A CLAIM. A card is a teaching artifact; a claim is one atomic
 * proposition. This module decomposes one card version into 0..N extraction
 * units (one per separable cloze-bearing block/item), rewrites each into a
 * declarative assertion, and validates atomicity — deterministically, with no
 * model calls. A future model-assisted stage may add units; it must emit this
 * same contract and pass the same validators.
 *
 * Pipeline position (entity resolution NEVER blocks claim creation):
 *   CARD -> CLAIM ASSERTION -> CLAIM IDENTITY -> ENTITY RESOLUTION
 */

export const ATOMIC_EXTRACTOR_VERSION = "snaportho-atomic-extractor.v1" as const;

/**
 * Safety ceiling: corpus evidence is p95=4, p99=6 cloze occurrences per card
 * with max 25. Above 12 units the card becomes needs_review (candidates are
 * still recorded for review; nothing auto-emits).
 */
export const ATOMIC_MAX_CLAIMS_PER_CARD = 12 as const;

export type AtomicExtractionStatus =
  | "claims_extracted"
  | "no_claim"
  | "needs_review"
  | "insufficient_context"
  | "image_dependent"
  | "extraction_error";

export type AtomicQualityFlag =
  | "atomic"
  | "compound_conjunction"
  | "multi_threshold"
  | "list_like"
  | "question_shaped"
  | "context_dependent"
  | "image_deictic"
  | "explicit_deictic"
  | "context_prefixed"
  | "short_answer_only"
  | "low_confidence"
  | "vignette_context";

export type AtomicClozeAnswer = {
  number: number;
  answer: string;
};

export type AtomicExtractionUnit = {
  unitId: string;
  fieldName: string;
  blockIndex: number;
  clozeNumbers: number[];
  /**
   * Cloze answers in this unit's block, in document order. Units from the
   * same block share this list; consumers disambiguate repeats by
   * occurrenceIndex (sub-unit position within the block).
   */
  clozeAnswers: AtomicClozeAnswer[];
  occurrenceIndex: number;
  /** Raw cloze answer(s) joined for this unit. */
  answer: string;
  /** Block text with every cloze filled and markup stripped. */
  filledBlock: string;
  /** Header/context block text (no cloze), may be "". */
  contextHeader: string;
  hasImage: boolean;
  evidenceLocator: string;
  /**
   * True when the block asks a question but carries no answer after "?" and
   * no cloze after "?" (any cloze is part of the question itself, e.g. "What
   * do the following letters stand for"). Such units are unusable as claims.
   */
  questionWithoutAnswer: boolean;
};

export type AtomicClaimCandidate = {
  unitId: string;
  assertion: string;
  rewriteMethod: string;
  atomic: boolean;
  qualityFlags: AtomicQualityFlag[];
  confidence: number;
  sourceEvidence: {
    field: string;
    locator: string;
  };
};

export type AtomicCardExtraction = {
  sourceCardId: string;
  sourceCardVersionId: string;
  extractionStatus: AtomicExtractionStatus;
  reasonCodes: string[];
  candidates: AtomicClaimCandidate[];
  units: AtomicExtractionUnit[];
};

const CLOZE_RE = /\{\{c(\d+)::([^{}]*?)(?:::[^{}]*?)?\}\}/gi;
const BLOCK_SPLIT_RE = /<(?:div|p|br|li|tr|h[1-6])\b[^>]*>/gi;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&deg;/gi, "°")
    .replace(/&amp;/gi, "&")
    .replace(/&([a-z]+);/gi, " ");
}

function stripTags(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/\[sound:[^\]]+\]/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

/** Split raw field HTML into ordered content blocks. */
export function splitHtmlBlocks(rawHtml: string): string[] {
  return rawHtml
    .split(BLOCK_SPLIT_RE)
    .map((part) => decodeEntities(stripTags(part)).replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0);
}

function fillClozes(text: string): string {
  return text.replace(CLOZE_RE, (_match, _num: string, answer: string) => answer);
}

function clozeNumbersIn(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(/\{\{c(\d+)::/gi)) out.push(Number(match[1]));
  return out;
}

function clozeAnswersIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(CLOZE_RE)) out.push((match[2] ?? "").trim());
  return out;
}

function clozePairsIn(text: string): AtomicClozeAnswer[] {
  const out: AtomicClozeAnswer[] = [];
  for (const match of text.matchAll(CLOZE_RE)) {
    out.push({ number: Number(match[1]), answer: (match[2] ?? "").trim() });
  }
  return out;
}

function hasImageMarkup(rawHtml: string): boolean {
  return /<img\b/i.test(rawHtml);
}

const IMAGE_TERM = String.raw`radiographs?|radiographic|x-?rays?|\bxrs?\b|images?|imaging|pictures?|films?|\bscans?\b|\bmri\b|\bct\b|angiograms?|fluoroscop\w*|photographs?`;
const IMAGE_DEICTIC_RE = new RegExp(
  String.raw`(?:${IMAGE_TERM})[^.?!]{0,40}(?:shown|below|above|demonstrated|pictured|provided|seen|reveals?|shows?)|(?:shown|below|above|demonstrated|pictured)\s+(?:the\s+)?(?:${IMAGE_TERM})|what\s+(?:is|are)\s+(?:shown|demonstrated|pictured)`,
  "i",
);
// Short image terms are word-bounded so "ct" cannot match inside "fracture".
function isImageDeictic(text: string): boolean {
  return IMAGE_DEICTIC_RE.test(text);
}

// Explicit deixis points at THIS card's attached image ("below", "shown");
// generic visibility ("x-ray will show", "may be seen following") stays a
// review flag but must not suppress the claim. Evidential "shown to"
// ("has been shown to correlate") is not deixis.
const EXPLICIT_DEICTIC_RE = /\b(below|above|this|these|those|shown(?!\s+to)|pictured|demonstrated|provided|attached)\b/i;

function isExplicitDeictic(text: string): boolean {
  return EXPLICIT_DEICTIC_RE.test(text);
}

function stripLeadingArticle(value: string): string {
  return value.replace(/^(a|an)\s+/i, "");
}

/** "two physical exam maneuvers" -> "physical exam maneuver" (apposition form). */
function singularizeNounPhrase(value: string): string {
  const stripped = value.replace(/^(two|three|four|five|six|\d+)\s+/i, "").trim();
  if (/s$/i.test(stripped) && !/(ss|us|is)$/i.test(stripped)) return stripped.slice(0, -1);
  return stripped;
}

function ensureThe(value: string): string {
  const trimmed = value.trim();
  if (/^the\s+/i.test(trimmed)) return trimmed;
  return `the ${trimmed}`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Join leading context: sentence-initial lowercases after a comma prefix but
 * stays capitalized after a sentence boundary.
 */
function joinLeading(leading: string, sentence: string): string {
  if (!leading) return sentence;
  const trimmed = sentence.trim();
  if (leading.trim().endsWith(".")) return `${leading}${trimmed}`;
  return `${leading}${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function finishSentence(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

// ---------------------------------------------------------------------------
// Unit extraction: one unit per separable cloze-bearing block/item.
// ---------------------------------------------------------------------------

export type ExtractorCardInput = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  fields: Array<{ name: string; rawValue: string; plainText?: string }>;
};

const TEXT_FIELD_NAMES = new Set(["text", "front"]);

function teachingField(card: ExtractorCardInput): { name: string; rawValue: string } | null {
  const preferred = card.fields.find((field) => TEXT_FIELD_NAMES.has(field.name.toLowerCase()))
    ?? card.fields.find((field) => field.rawValue.includes("{{c"))
    ?? card.fields[0];
  if (!preferred) return null;
  return { name: preferred.name, rawValue: preferred.rawValue };
}

/** Answer-only blocks ("{{c1::Velpeau}}") merge into the previous block. */
function blockWithoutClozeLength(block: string): number {
  return block.replace(CLOZE_RE, "").replace(/\s+/g, " ").trim().length;
}

/**
 * Rebalance blocks split inside cloze markup ("{{c1::<div>Conoid</div>...")
 * joining inner parts with "; " so item structure survives tag stripping.
 */
export function rebalanceClozeBlocks(blocks: string[]): string[] {
  const out: string[] = [];
  let pending = "";
  let depth = 0;
  const push = (text: string): void => {
    if (pending) {
      pending = `${pending}; ${text}`;
    } else {
      pending = text;
    }
    depth += (text.match(/\{\{/g) ?? []).length - (text.match(/\}\}/g) ?? []).length;
    if (depth <= 0) {
      out.push(pending);
      pending = "";
      depth = 0;
    }
  };
  for (const block of blocks) push(block);
  if (pending) out.push(pending);
  return out;
}

function splitAnswerItems(answerSide: string): string[] {
  const valid = (parts: string[]): string[] | null => {
    const cleaned = parts.map((part) => part.trim().replace(/^[.,;:\s]+|[.,;\s]+$/g, "").trim()).filter(Boolean);
    // Two characters admit real items ("AP"); single letters never split.
    return cleaned.length >= 2 && cleaned.every((part) => part.length >= 2) ? cleaned : null;
  };
  // Classification markers: "Type A: X Type B: Y".
  const markers = answerSide.match(/\b(Type|Stage|Grade)\s+[A-Z0-9]+\s*:/g) ?? [];
  if (markers.length >= 2) {
    const split = valid(answerSide.split(/(?=\b(?:Type|Stage|Grade)\s+[A-Z0-9]+\s*:)/));
    if (split) return split;
  }
  // Numbered lists: "1) X 2) Y" or "(1) X (2) Y".
  const numbered = answerSide.match(/(?:\(\d+\)|\d+\))/g) ?? [];
  if (numbered.length >= 2) {
    const split = valid(answerSide.split(/\s*(?:\(\d+\)|\d+\))\s*/));
    if (split) return split;
  }
  // Semicolons.
  const semi = valid(answerSide.split(/\s*;\s*/));
  if (semi) return semi;
  // "&"/"and" only when every segment is multi-word ("Latissimus dorsi &
  // Teres major" splits; "L2 and L3" and "Anterior and Posterior" stay whole).
  // Comma-coordinated series ("Medial 3rd, 4th, and 5th MTs") never split on
  // the final "and": the head noun belongs to every item.
  if (/\s*(?:&|\band\b)\s*/i.test(answerSide)) {
    const parts = answerSide.split(/\s*(?:&|\band\b)\s*/i);
    if (!parts.some((part) => part.includes(",")) && parts.length >= 2 && parts.every((part) => part.trim().split(/\s+/).length >= 2)) {
      const split = valid(parts);
      if (split) return split;
    }
  }
  return [answerSide.trim()].filter(Boolean);
}

/**
 * Mid-field section header ("Dorsal interossei", "Deep head"): short,
 * cloze-free, no question, no trailing colon, and not a sibling item label
 * ("Grade I:", "Type 2:"). Sibling labels must never hijack the header.
 */
function isSectionHeader(block: string): boolean {
  const text = block.trim();
  return text.length > 0
    && text.length <= 80
    && !text.includes("?")
    && !/:\s*$/.test(text)
    && !/\.\s*$/.test(text)
    && !/^(grade|type|stage|step|zone|layer|group|part|phase|class|level|number|no)\b/i.test(text);
}

export function extractAtomicUnits(card: ExtractorCardInput): {
  units: AtomicExtractionUnit[];
  contextHeader: string;
  hasImage: boolean;
  reasonCodes: string[];
} {
  const field = teachingField(card);
  if (!field) return { units: [], contextHeader: "", hasImage: false, reasonCodes: ["no_teaching_field"] };
  const hasImage = hasImageMarkup(field.rawValue);
  const rawBlocks = splitHtmlBlocks(field.rawValue);
  if (rawBlocks.length === 0) {
    return { units: [], contextHeader: "", hasImage, reasonCodes: ["empty_teaching_field"] };
  }
  // Rejoin cloze markup split across divs before answer-only merging.
  const balanced = rebalanceClozeBlocks(rawBlocks);
  // Merge answer-only blocks into their predecessor — except list items
  // ("1) {{c1::...}}"), which are independent atomic units.
  const blocks: string[] = [];
  for (const block of balanced) {
    const numbers = clozeNumbersIn(block);
    const isListItem = /^\s*(?:\d+[.)]|\([0-9a-z]+\)|[a-z][.)]|[-•])\s*\{\{c\d+::/i.test(block);
    if (numbers.length > 0 && blockWithoutClozeLength(block) < 3 && blocks.length > 0 && !isListItem) {
      blocks[blocks.length - 1] = `${blocks[blocks.length - 1]} ${block}`.trim();
    } else {
      blocks.push(block);
    }
  }
  // Header = first block with neither cloze nor "?" (a bare question is a
  // pending stem, never a context subject).
  const contextHeader = blocks.length > 1
      && clozeNumbersIn(blocks[0]).length === 0
      && !blocks[0].includes("?")
    ? fillClozes(blocks[0])
    : "";
  const units: AtomicExtractionUnit[] = [];
  let pendingQuestion = "";
  // Multi-section cards ("Plantar interossei ... Dorsal interossei") switch
  // the active header at each section break so later units are not
  // misattributed to the first section's subject.
  let activeHeader = contextHeader;
  blocks.forEach((block, blockIndex) => {
    const numbers = clozeNumbersIn(block);
    if (numbers.length === 0) {
      // Pure question blocks attach to subsequent answer blocks.
      if (block.includes("?")) {
        pendingQuestion = fillClozes(block).replace(/\s+/g, " ").trim();
      } else if (blockIndex > 0 && isSectionHeader(block)) {
        activeHeader = block;
        pendingQuestion = "";
      }
      return;
    }
    const answers = clozeAnswersIn(block);
    const clozePairs = clozePairsIn(block);
    let filled = fillClozes(block).replace(/\s+/g, " ").trim();
    if (!filled.includes("?") && pendingQuestion) filled = `${pendingQuestion} ${filled}`.trim();
    const questionPos = block.indexOf("?");
    const afterQuestion = questionPos >= 0 ? block.slice(questionPos + 1) : "";
    const questionWithoutAnswer = questionPos >= 0
      && !/\{\{c\d+::/.test(afterQuestion)
      && afterQuestion.replace(CLOZE_RE, "").trim().length === 0;
    // Split multi-item answer sides ("...? A - x; B - y") into sub-units that
    // share the question stem. Declarative "Label: item; item" blocks split
    // the same way with the label distributed to each item.
    const questionMark = filled.indexOf("?");
    const answerSide = questionMark >= 0 ? filled.slice(questionMark + 1).trim() : "";
    // "Answer: description, description" blocks look splittable but are not:
    // the items after the colon describe the tested answer instead of
    // listing more answers. Splitting them detaches descriptions from their
    // answer ("The compartments ... is fourth webspaces").
    const answerLedLabel = (label: string): boolean => {
      if (!label.includes(":")) return false;
      const head = label.slice(0, label.indexOf(":")).toLowerCase();
      return answers.some((entry) => entry.length > 0 && head.includes(entry.toLowerCase()));
    };
    const answerSideHead = answerSide ? answerSide.split(/[;,]/)[0] ?? "" : "";
    let items = answerSide && !answerLedLabel(answerSideHead)
      ? splitAnswerItems(answerSide)
      : [""];
    let sharedStem = questionMark >= 0 ? filled.slice(0, questionMark + 1).trim() : filled;
    if (!answerSide) {
      const labeledList = filled.match(/^([^?]{1,80}?):\s*(.+)$/s);
      if (labeledList && !answerLedLabel(`${labeledList[1]}:`)) {
        const listItems = splitAnswerItems(labeledList[2]);
        if (listItems.length > 1) {
          items = listItems;
          sharedStem = `${labeledList[1].trim()}:`;
        }
      }
    }
    items.forEach((item, itemIndex) => {
      const filledBlock = items.length > 1 ? `${sharedStem} ${item}`.trim() : filled;
      const occurrenceIndex = units.filter((u) => u.blockIndex === blockIndex).length;
      units.push({
        unitId: `${card.canonicalCardVersionId}|${field.name}|b${blockIndex}|c${[...numbers].sort((a, b) => a - b).join("+")}|${occurrenceIndex}`,
        fieldName: field.name,
        blockIndex,
        clozeNumbers: [...new Set(numbers)].sort((a, b) => a - b),
        clozeAnswers: clozePairs,
        occurrenceIndex,
        answer: item || answers.join("; "),
        filledBlock,
        contextHeader: activeHeader,
        hasImage,
        evidenceLocator:
          items.length > 1
            ? `${field.name}:b${blockIndex}:c${numbers[0]}:i${itemIndex}`
            : `${field.name}:b${blockIndex}:c${numbers[0]}`,
        questionWithoutAnswer,
      });
    });
  });
  return { units, contextHeader, hasImage, reasonCodes: units.length === 0 ? ["no_cloze_extracted"] : [] };
}

// ---------------------------------------------------------------------------
// Declarative rewrite: knowledge, not quiz format.
// Narrow patterns only; unknown shapes fall back flagged, never hallucinated.
// ---------------------------------------------------------------------------

export type RewriteResult = {
  assertion: string;
  method: string;
  confidence: number;
  flags: AtomicQualityFlag[];
};

function pluralSubject(subject: string): boolean {
  // Head noun precedes any prepositional tail ("causes of back pain",
  // "Extension type supracondylar fractures"). Possessive 's is stripped so
  // "Hilgrenreiner's line" stays singular.
  const head = subject.trim().replace(/^(the|a|an)\s+/i, "").split(/\s+(?:of|in|for|with|on|at|from|by|between|among|during|after|before|without|within|through|under|over)\b/i)[0] ?? "";
  const words = head.split(/\s+/).filter(Boolean).map((word) => word.replace(/'s$/i, ""));
  return words.some((word) => /s$/i.test(word) && !/(ss|us|is)$/i.test(word));
}

function agreeBe(subject: string): string {
  return pluralSubject(subject) ? "are" : "is";
}

function agreeVerb(base: string, subject: string): string {
  // Agree the verb head, preserving any particle ("stand for" -> "stands for").
  const [head, ...particles] = base.split(/\s+/);
  const tail = particles.length > 0 ? ` ${particles.join(" ")}` : "";
  if (pluralSubject(subject)) return `${(head ?? "").toLowerCase()}${tail.toLowerCase()}`;
  const lower = (head ?? "").toLowerCase();
  if (lower === "lie") return `lies${tail}`;
  if (/[^aeiou]y$/.test(lower)) return `${lower.slice(0, -1)}ies${tail}`;
  if (/(s|x|z|ch|sh)$/.test(lower)) return `${lower}es${tail}`;
  return `${lower}s${tail}`;
}

/** Reduce a conjugated Q-verb to its base for re-agreement with the answer. */
function baseVerb(conjugated: string): string {
  const lower = conjugated.toLowerCase().replace(/\s+to$/, "");
  const trailingTo = /\s+to$/i.test(conjugated) ? " to" : "";
  if (lower === "lies") return `lie${trailingTo}`;
  if (/[^aeiou]ies$/.test(lower)) return `${lower.slice(0, -3)}y${trailingTo}`;
  if (/(ches|shes|sses|xes|zes)$/.test(lower)) return `${lower.slice(0, -2)}${trailingTo}`;
  if (/s$/.test(lower) && !/ss$/.test(lower)) return `${lower.slice(0, -1)}${trailingTo}`;
  return conjugated.toLowerCase();
}

const IS_USED_TO_VERBS: Record<string, string> = {
  evaluates: "evaluate",
  assesses: "assess",
  visualizes: "visualize",
  measures: "measure",
};

// Start-anchored question patterns. Tried on the full question first, then on
// the post-comma core when a leading context split applies.
function tryStartPatterns(core: string, leading: string, answerClean: string, suffix: string): RewriteResult | null {
  let match: RegExpMatchArray | null;

  // P1: What/Which X is/are Y? A  ->  The Y is/are A (agreement recomputed).
  match = core.match(/^(what|which)\b(.+?)\b(is|are)\b(.+)$/i);
  if (match && !/(may|can|should|would|could|must)\b/i.test(match[4])) {
    // Prepositional complement ("What types of patients are at higher risk?")
    // cannot stand as the subject alone: keep the questioned NP with it.
    // Same for passive participial complements ("What muscles are innervated
    // by X?"), which otherwise yield "The innervated ...". Plain adjective +
    // noun complements ("common causes of back pain") stand alone.
    const complement = match[4].trim();
    const needsQuestionedNp = /^(at|in|on|for|with|of|to|from|by|during|after|before|without|within|between|among|through|under|over)\b/i.test(complement)
      || /^\w+(?:ed|en|able|ible)\s+(?:by|for|with|in|to|of|from|on|at)\b/i.test(complement)
      || /^(?:made|done|known|shown|given|taken|found)\s+(?:by|for|with|in|to|of|from|on|at|as)\b/i.test(complement);
    const subject = needsQuestionedNp
      ? capitalize(ensureThe(`${match[2].trim()} ${complement}`.trim()))
      : capitalize(ensureThe(stripLeadingArticle(complement)));
    const be = agreeBe(subject);
    const subjectComma = subject.includes(",") ? `${subject},` : subject;
    return {
      assertion: finishSentence(joinLeading(leading, `${subjectComma} ${be} ${answerClean}${suffix}`)),
      method: "qa_inversion_be",
      confidence: 0.85,
      flags: [],
    };
  }
  // P2: What/Which NP modal VP? A  ->  The NP that modal VP is/are A.
  match = core.match(/^(what|which)\b(.+?)\b(may|can|should|would|could|must)\b(.+)$/i);
  if (match) {
    const subject = ensureThe(match[2].trim());
    const beModal = agreeBe(subject);
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(subject)} that ${match[3].toLowerCase()} ${match[4].trim()} ${beModal} ${answerClean}${suffix}`),
      ),
      method: "qa_inversion_modal",
      confidence: 0.85,
      flags: [],
    };
  }
  // P12: What makes a perfect/ideal/... X? A  ->  The X includes A.
  match = core.match(/^what\s+makes\s+((?:a|an|the)\s+(?:perfect|ideal|normal|adequate|anatomic)\b.+)$/i);
  if (match) {
    const subject = capitalize(ensureThe(stripLeadingArticle(match[1].trim())));
    return {
      assertion: finishSentence(joinLeading(leading, `${subject} includes ${answerClean}${suffix}`)),
      method: "qa_criteria_includes",
      confidence: 0.85,
      flags: [],
    };
  }
  // P17: What/Which NP make/comprise/... X? A  ->  A is one of the NP that ... X.
  match = core.match(/^(what|which)\b(.+?)\b(make|makes|comprise|comprises|include|includes|form|forms)\b(.+)$/i);
  if (match) {
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)} is one of the ${match[2].trim()} that ${match[3].toLowerCase()} ${match[4].trim()}${suffix}`),
      ),
      method: "qa_member_of",
      confidence: 0.8,
      flags: [],
    };
  }
  // P19: What/Which NP has/have rest? A  ->  A has/have rest (agreed).
  match = core.match(/^(what|which)\b(.+?)\b(has|have)\b(.+)$/i);
  if (match) {
    void match[2];
    const have = pluralSubject(answerClean) ? "have" : "has";
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)} ${have} ${match[4].trim()}${suffix}`),
      ),
      method: "qa_has_have",
      confidence: 0.8,
      flags: [],
    };
  }
  // P16a: What/Which NP <subject-verb> rest? A  ->  A, NP, verb rest.
  // Dash-pair answers ("Thigh adduction - obturator") invert to passive.
  match = core.match(
    /^(what|which)\b(.+?)\b(suggests?|indicates?|confirms?|predicts?|reveals?|demonstrates?|shows?|causes?|develops?|occurs?|covers?|separates?|provides?|defines?|helps?|allows?|controls?|supply|supplies|innervates?|stabilizes?|stabilize|maintains?|maintain|correlates?|correlate|crosses?|cross|influences?|influence|leads?\s+to)\b(.+)$/i,
  );
  if (match) {
    const nounPhrase = singularizeNounPhrase(stripLeadingArticle(match[2].trim()));
    const base = baseVerb(match[3]);
    if (suffix && (base === "control" || base === "supply" || base === "innervate")) {
      const inner = suffix.trim().replace(/^\(|\)$/g, "").trim();
      const passive = base === "control" ? "controlled" : base === "supply" ? "supplied" : "innervated";
      return {
        assertion: finishSentence(
          joinLeading(leading, `${capitalize(inner)} is ${passive} by the ${answerClean} ${nounPhrase}`),
        ),
        method: "qa_passive_pair",
        confidence: 0.8,
        flags: [],
      };
    }
    const verb = agreeVerb(base, answerClean);
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)}, ${nounPhrase}, ${verb} ${match[4].trim()}${suffix}`),
      ),
      method: "qa_answer_subject",
      confidence: 0.8,
      flags: [],
    };
  }
  // P16b: What/Which NP <use-verb> rest? A  ->  A, NP, is used to ... rest.
  match = core.match(/^(what|which)\b(.+?)\b(evaluates|assesses|visualizes|measures)\b(.+)$/i);
  if (match) {
    const nounPhrase = stripLeadingArticle(match[2].trim());
    const base = IS_USED_TO_VERBS[match[3].toLowerCase()] ?? match[3].toLowerCase();
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)}, ${nounPhrase}, is used to ${base} ${match[4].trim()}${suffix}`),
      ),
      method: "qa_is_used_to",
      confidence: 0.8,
      flags: [],
    };
  }
  // P16c: What/Which NP <position-verb> rest? A  ->  A verbs rest (agreed).
  match = core.match(
    /^(what|which)\b(.+?)\b(inserts?|attach|attaches|originates?|lie|lies|runs?|courses?|drains?|supply|supplies)\b(.+)$/i,
  );
  if (match) {
    void match[2];
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)} ${agreeVerb(baseVerb(match[3]), answerClean)} ${match[4].trim()}${suffix}`),
      ),
      method: "qa_position_verb",
      confidence: 0.8,
      flags: [],
    };
  }
  // P4: Where does X originate/insert/attach? A  ->  The origin/... of X is A.
  match = core.match(/^where\s+(do|does)\s+(.+?)\s+(originate|insert|attach)\b(.*?)$/i);
  if (match) {
    const noun = match[3].toLowerCase() === "originate"
      ? "origin"
      : match[3].toLowerCase() === "insert"
        ? "insertion"
        : "attachment";
    return {
      assertion: finishSentence(joinLeading(leading, `The ${noun} of ${match[2].trim()}${match[4] ?? ""} is ${answerClean}${suffix}`)),
      method: "qa_where_anatomy",
      confidence: 0.85,
      flags: [],
    };
  }
  // P5: Where is/are X located ...? A  ->  The location of X ... is A.
  match = core.match(/^where\s+(is|are)\s+(.+?)\s+located\b(.*?)$/i);
  if (match) {
    return {
      assertion: finishSentence(joinLeading(leading, `The location of ${match[2].trim()}${match[3] ?? ""} is ${answerClean}${suffix}`)),
      method: "qa_where_location",
      confidence: 0.85,
      flags: [],
    };
  }
  // P-where-be: Where PP is/are S VP? A  ->  S is/are VP A PP.
  match = core.match(/^where\s+(.+?)\s+(is|are|was|were)\s+(.+?)\s+(found|located|seen|observed|performed|done|measured)\b(.*?)$/i);
  if (match) {
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[3].trim())} ${match[2].toLowerCase()} ${match[4].toLowerCase()}${match[5] ?? ""} ${answerClean} ${match[1].trim()}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_where_be",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-where-modal: Where should S be VP? A  ->  S should be VP: A (colon
  // form: answers are often imperative fragments like "Medialize").
  match = core.match(/^where\s+(should|can|must|is|are)\s+(.+?)\s+be\s+(.+)$/i);
  if (match) {
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[2].trim())} ${match[1].toLowerCase()} be ${match[3].trim()}: ${answerClean}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_where_modal",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-where-PP-does: Where PP does S verb? A  ->  S verbs PP: A.
  match = core.match(/^where\s+(.+?)\s+(does|do|did)\s+(.+?)\s+(occur|take place|lie|course|run|divide|branch|insert|originate|attach|end)\b(.*?)$/i);
  if (match) {
    const verb = agreeVerb(match[4], match[3]);
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[3].trim())} ${verb} ${match[1].trim()}${match[5] ?? ""}: ${answerClean}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_where_pp_does",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-where-does: Where does S occur/...? A  ->  S occurs ... A.
  match = core.match(/^where\s+(does|do|did)\s+(.+?)\s+(occur|take place|lie|course|run|divide|branch|insert|end)\b(.*?)$/i);
  if (match) {
    const verb = agreeVerb(match[3], match[2]);
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[2].trim())} ${verb}${match[4] ?? ""} ${answerClean}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_where_does",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-when: When is S VP? A  ->  S is VP A.
  match = core.match(
    /^when\s+(is|are|was|were)\s+(.+?)\s+(determined|performed|done|obtained|indicated|required|recommended|used|seen|observed|highest|greatest|removed|started|stopped|initiated|discontinued)\b(.*?)$/i,
  );
  if (match) {
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[2].trim())} ${match[1].toLowerCase()} ${match[3].toLowerCase()}${match[4] ?? ""} ${answerClean}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_when",
      confidence: 0.8,
      flags: [],
    };
  }
  // P6a: How is X obtained/.../classified? A  ->  X is ... by A.
  match = core.match(
    /^how\s+(is|are)\s+(.+?)\s+(obtained|done|performed|classified|subclassified|staged|graded|diagnosed)\b(.*?)$/i,
  );
  if (match) {
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[2].trim())} ${match[1].toLowerCase()} ${match[3].toLowerCase()}${match[4] ?? ""} by ${answerClean}${suffix}`),
      ),
      method: "qa_how_passive",
      confidence: 0.85,
      flags: [],
    };
  }
  // P6b: How aux X treated/managed ...? A  ->  X aux ...: A (colon form;
  // imperative answers cannot take "by" + gerund safely).
  match = core.match(/^how\s+(should|can|must|is|are)\s+(.+?)\s+(treated|managed|positioned|placed|described)\b(.*?)$/i);
  if (match) {
    // "How should X be positioned" swallows the passive "be" into the
    // subject; restore it after modal auxiliaries.
    const subject = match[2].trim().replace(/\s+be$/i, "");
    const aux = match[1].toLowerCase();
    const passiveBe = aux === "is" || aux === "are" ? "" : " be";
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(subject)} ${aux}${passiveBe} ${match[3].toLowerCase()}${match[4] ?? ""}: ${answerClean}${suffix}`),
      ),
      method: "qa_how_managed",
      confidence: 0.8,
      flags: [],
    };
  }
  // P6c: How aux S change/vary/... ...? A  ->  S verbs ...: A.
  match = core.match(
    /^how\s+(does|do|did|is|are|can)\s+(.+?)\s+(change|vary|differ|progress|present|appear|occur|effect|affect|work|influence)\b(.*?)$/i,
  );
  if (match) {
    const verb = agreeVerb(match[3], match[2]);
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[2].trim())} ${verb}${match[4] ?? ""}: ${answerClean}${suffix}`),
      ),
      method: "qa_how_change",
      confidence: 0.8,
      flags: [],
    };
  }
  // P7: How do you obtain/do/perform X? A  ->  X is ... using A.
  match = core.match(/^how\s+(can|do|does)\s+(you|one)\s+(obtain|do|perform|measure|assess|evaluate|determine)\s+(.+)$/i);
  if (match) {
    const pastMap: Record<string, string> = {
      obtain: "obtained", do: "done", perform: "performed", measure: "measured",
      assess: "assessed", evaluate: "evaluated", determine: "determined",
    };
    const past = pastMap[match[3].toLowerCase()] ?? "done";
    const aux = match[1].toLowerCase() === "can" ? "can be" : "is";
    return {
      assertion: finishSentence(joinLeading(leading, `${capitalize(match[4].trim())} ${aux} ${past} using ${answerClean}${suffix}`)),
      method: "qa_how_method",
      confidence: 0.8,
      flags: [],
    };
  }
  // P14c: How far/long is X prep ...? N  ->  X is N prep ....
  match = core.match(/^how\s+(far|long)\s+(is|are|was|were)\s+(.+)$/i);
  if (match) {
    const be = match[2].toLowerCase();
    const parts = match[3].split(/\b(from|to|between|below|above|distal to|proximal to)\b/i);
    if (parts.length >= 3) {
      const subject = parts[0].trim();
      const prep = `${parts[1].trim()}${parts.slice(2).join(" ").trim() ? ` ${parts.slice(2).join(" ").trim()}` : ""}`;
      return {
        assertion: finishSentence(
          joinLeading(leading, `${capitalize(subject)} ${be} ${answerClean} ${prep}${suffix}`.replace(/\s+/g, " ")),
        ),
        method: "qa_how_far",
        confidence: 0.8,
        flags: [],
      };
    }
    // No prepositional tail and a participle present ("crutches used"):
    // skip to the duration pattern below instead of substituting here.
    if (!/\b(used|held|followed|continued|given|kept|done|made|worn|taken)\b/i.test(match[3])) {
      return {
        assertion: finishSentence(
          joinLeading(leading, `${capitalize(match[3].trim())} ${be} ${answerClean}${suffix}`),
        ),
        method: "qa_how_far",
        confidence: 0.75,
        flags: [],
      };
    }
  }
  // P14a: How many/much NP VP? N  ->  N NP VP (numeric agreement fixed).
  match = core.match(/^how\s+(many|much)\s+(.+)$/i);
  if (match) {
    let rest = match[2].trim();
    // How-many answers are quantities (plural) unless they denote one.
    if (!/^(1|one)(\s|$)/i.test(answerClean)) {
      rest = rest.replace(
        /\b(suggests|indicates|is|means|causes|shows|predicts|has|was)\b/i,
        (verb) => {
          const map: Record<string, string> = {
            suggests: "suggest", indicates: "indicate", is: "are", means: "mean",
            causes: "cause", shows: "show", predicts: "predict", has: "have", was: "were",
          };
          return map[verb.toLowerCase()] ?? verb;
        },
      );
    }
    return {
      assertion: finishSentence(joinLeading(leading, `${capitalize(answerClean)} ${rest}${suffix}`)),
      method: "qa_how_many",
      confidence: 0.8,
      flags: [],
    };
  }
  // P14b: How long aux S ...? N  ->  take-pattern or held-pattern, else skip.
  match = core.match(/^how\s+long\s+(should|can|must|do|does|is|are)\s+(.+)$/i);
  if (match) {
    const aux = match[1].toLowerCase();
    const rest = match[2].trim();
    const take = rest.match(/^(.+?)\s+take\b(.*)$/i);
    if ((aux === "do" || aux === "does") && take) {
      return {
        assertion: finishSentence(
          joinLeading(leading, `${capitalize(take[1].trim())} takes ${answerClean}${take[2] ?? ""}${suffix}`),
        ),
        method: "qa_how_long",
        confidence: 0.8,
        flags: [],
      };
    }
    const held = rest.match(/^(.+?)\s+be\s+(held|used|followed|observed|continued|maintained|immobilized|kept|given)\b(.*)$/i);
    if (held && (aux === "should" || aux === "must" || aux === "can" || aux === "is" || aux === "are")) {
      return {
        assertion: finishSentence(
          joinLeading(leading, `${capitalize(held[1].trim())} ${aux} be ${held[2].toLowerCase()}${held[3] ?? ""} for ${answerClean}${suffix}`),
        ),
        method: "qa_how_long",
        confidence: 0.8,
        flags: [],
      };
    }
    // "How long are crutches used?" (aux already consumed the be-verb).
    const worn = (aux === "is" || aux === "are")
      ? rest.match(/^(.+?)\s+(held|used|followed|observed|continued|maintained|immobilized|kept|given|worn)\b(.*)$/i)
      : null;
    if (worn) {
      return {
        assertion: finishSentence(
          joinLeading(leading, `${capitalize(worn[1].trim())} ${aux} ${worn[2].toLowerCase()}${worn[3] ?? ""} for ${answerClean}${suffix}`),
        ),
        method: "qa_how_long",
        confidence: 0.8,
        flags: [],
      };
    }
  }
  // P8: Name/Identify/List/Describe the X ...? A  ->  The X ... is A.
  match = core.match(/^(name|identify|list|describe)\s+(.+)$/i);
  if (match) {
    const subject = ensureThe(match[2].trim());
    return {
      assertion: finishSentence(joinLeading(leading, `${capitalize(subject)} is ${answerClean}${suffix}`)),
      method: "qa_imperative",
      confidence: 0.8,
      flags: [],
    };
  }
  // P9: Does S VP? not/never/no  ->  S does not VP.
  match = core.match(
    /^does\s+(.+?)\s+(suggest|indicate|show|have|cause|require|mean|predict|imply|necessitate|warrant|need|reveal)\b(.*?)$/i,
  );
  if (match && /^(not|never|no)\b/i.test(answerClean)) {
    const negated = answerClean.replace(/^not\s+/i, "").trim();
    const aux = pluralSubject(match[1]) ? "do" : "does";
    const tail = /^(necessarily|always|usually|routinely)\b/i.test(negated)
      ? ` ${negated}`
      : negated.toLowerCase() === "no" || negated === ""
        ? ""
        : ` ${negated}`;
    const verbPhrase = `${match[2].toLowerCase()}${match[3] ?? ""}`.trim();
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[1].trim())} ${aux} not${tail} ${verbPhrase}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_negation",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-should-you: Should you VP? No/not  ->  You should not VP.
  match = core.match(/^should\s+you\s+(.+)$/i);
  if (match && /^(no|not|never)\b/i.test(answerClean)) {
    const negated = answerClean.replace(/^not\s+/i, "").trim();
    const tail = negated.toLowerCase() === "no" || negated === "" ? "" : ` ${negated}`;
    return {
      assertion: finishSentence(
        joinLeading(leading, `You should not ${match[1].trim()}${tail}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_should_you",
      confidence: 0.75,
      flags: [],
    };
  }
  // P-stand-for: What do X stand for/represent? A (+label)  ->  Label stands for A.
  // Requires the dash/colon label (suffix) so the abbreviation is explicit.
  match = core.match(/^(what|which)\b(.+?)\b(stand for|stands for|represent|represents|mean|means|abbreviate)\b(.*)$/i);
  if (match && suffix) {
    const inner = suffix.trim().replace(/^\(|\)$/g, "").trim();
    const verb = agreeVerb(baseVerb(match[3]), inner);
    void match[2];
    void match[4];
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(inner)} ${verb} ${answerClean}`),
      ),
      method: "qa_stand_for",
      confidence: 0.8,
      flags: [],
    };
  }
  // P15: Which/What NP do/does/did (not) VP? A  ->  A aux (not) VP.
  match = core.match(/^(which|what)\b(.+?)\b(do|does|did)\s+(not\b)?(.+)$/i);
  if (match) {
    // Object reading: "What does the Q-angle represent? A" answers with the
    // object (the aux comes first, so match[2] is empty), and the subject
    // stays put: "The Q-angle represents A."
    const subjectNp = match[2].trim();
    const auxLower = match[3].toLowerCase();
    // Bare "which does X" (no NP anywhere) stays subject-reading: the
    // answer IS the subject. Only an article-led tail ("does the Q-angle
    // represent") proves the object reading.
    if (!subjectNp && (auxLower === "does" || auxLower === "do")
      && /^(the|a|an|this|that|these|those)\b/i.test(match[5].trim())) {
      const tailWords = match[5].trim().split(/\s+/).filter(Boolean);
      const tailPrep = tailWords.length > 2
        && /^(for|to|of|in|on|with|at|from|by|as)\b/i.test(tailWords[tailWords.length - 1] ?? "")
        ? ` ${tailWords[tailWords.length - 1]}`
        : "";
      const coreWords = tailPrep ? tailWords.slice(0, -1) : tailWords;
      const verbWord = (coreWords[coreWords.length - 1] ?? "").toLowerCase();
      const subjectWords = coreWords.slice(0, -1).join(" ");
      if (coreWords.length >= 2 && subjectWords && verbWord && !/^(you|we|they)\b/i.test(subjectWords)) {
        const verb = agreeVerb(verbWord, subjectWords);
        const neg = match[4] ? "not " : "";
        return {
          assertion: finishSentence(
            joinLeading(leading, `${capitalize(subjectWords)} ${neg}${verb}${tailPrep} ${answerClean}${suffix}`.replace(/\s+/g, " ")),
          ),
          method: "qa_do_object",
          confidence: 0.8,
          flags: [],
        };
      }
    }
    let aux = match[3].toLowerCase();
    if (aux === "does" && pluralSubject(answerClean)) aux = "do";
    const not = match[4] ? "not " : "";
    void match[2];
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)} ${aux} ${not}${match[5].trim()}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_do_support",
      confidence: 0.8,
      flags: [],
    };
  }
  // P18: verbless fragments ("Best test to evaluate X? A") -> The Q is A.
  // Never fires when a mid-sentence interrogative belongs to phase 3.
  if (
    !/^(what|which|where|when|how|are|is|does|do|did|can|should|must|name|identify|list|describe)\b/i.test(core)
    && !/\b(is|are|was|were|does|do|did|has|have|can|should|must|will|would)\b/i.test(core)
    && !/\b(what|which)\b/i.test(core)
    && !/\bhow\s+(far|long|many|much)\b/i.test(core)
  ) {
    const fragment = core.replace(/^(the|a|an)\s+/i, "").trim();
    if (fragment) {
      const be = agreeBe(fragment);
      return {
        assertion: finishSentence(joinLeading(leading, `The ${fragment} ${be} ${answerClean}${suffix}`)),
        method: "qa_fragment",
        confidence: 0.75,
        flags: [],
      };
    }
  }
  // P-vignette: clinical vignette + "Most likely diagnosis?" A.
  // The vignette IS the evidence: keep it whole with the conclusion.
  match = core.match(/^(.*)\s*\.\s*(most likely\s+(?:diagnosis|treatment|management|cause|organism|injury|fracture)|differential diagnosis|best next step|treatment of choice)\s*$/is);
  if (match && match[1].trim().length >= 30) {
    const label = match[2].trim().replace(/\s+/g, " ");
    return {
      assertion: finishSentence(
        joinLeading(leading, `${match[1].trim()}. ${capitalize(label)}: ${answerClean}${suffix}`),
      ),
      method: "qa_vignette",
      confidence: 0.8,
      flags: ["vignette_context"],
    };
  }
  // P-complication-if: "Complication if X is Y? A" -> A is a complication if X is Y.
  match = core.match(/^(complication|prognosis|treatment|management|finding|diagnosis)\s+if\b(.+)$/i);
  if (match) {
    const article = /^(treatment|management|diagnosis|finding)$/i.test(match[1]) ? "the" : "a";
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)} is ${article} ${match[1].toLowerCase()} if ${match[2].trim()}${suffix}`),
      ),
      method: "qa_if_fragment",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-modal-neg: What NP modal not be VP? A  ->  A, NP, modal-not be VP.
  match = core.match(/^(what|which)\b(.+?)\b(can|could|may|might|should|must|will)\s+(not|never)\s+(be\s+)?(.+)$/i);
  if (match) {
    const nounPhrase = singularizeNounPhrase(stripLeadingArticle(match[2].trim()));
    const modalNeg = match[3].toLowerCase() === "can" && match[4].toLowerCase() === "not"
      ? "cannot"
      : `${match[3].toLowerCase()} ${match[4].toLowerCase()}`;
    const be = match[5] ?? "";
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(answerClean)}, ${nounPhrase}, ${modalNeg} ${be}${match[6].trim()}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_modal_negation",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-why-be: Why is S ADJ? A  ->  S is ADJ: A.
  match = core.match(/^(why)\s+(is|are|was|were)\s+(.+?)\s+(important|necessary|required|preferred|better|worse|contraindicated|indicated|recommended|essential|critical)\b(.*?)$/i);
  if (match) {
    void match[1];
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[3].trim())} ${match[2].toLowerCase()} ${match[4].toLowerCase()}${match[5] ?? ""}: ${answerClean}${suffix}`),
      ),
      method: "qa_why",
      confidence: 0.75,
      flags: [],
    };
  }
  // P-how-will: How will S VP? A  ->  S will VP A rest.
  match = core.match(/^how\s+(will|would)\s+(.+?)\s+(appear|present|look|change|heal|recover)\b(.*?)$/i);
  if (match) {
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(match[2].trim())} ${match[1].toLowerCase()} ${match[3].toLowerCase()} ${answerClean}${match[4] ?? ""}${suffix}`.replace(/\s+/g, " ")),
      ),
      method: "qa_how_will",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-or-in: Is S more/less ADJ in A or B? W  ->  S is ... in W than in L.
  match = core.match(/^is\s+(.+?)\s+((?:more|less)\s+\w+|(?!(?:never|ever|over|under|other|either)\b)\w+er)\s+in\s+(.+?)\s+or\s+(.+)$/i);
  if (match) {
    const [, subject, comparative, sideA, sideB] = match;
    const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const firstA = sideA.trim().split(/\s+/)[0] ?? "";
    const winnerIsA = firstA ? new RegExp(`\\b${escapeRegExp(firstA)}`, "i").test(answerClean) : false;
    const win = (winnerIsA ? sideA : sideB).trim();
    const lose = (winnerIsA ? sideB : sideA).trim();
    const be = agreeBe(subject);
    return {
      assertion: finishSentence(
        joinLeading(leading, `${capitalize(subject.trim())} ${be} ${comparative.trim()} in ${win} than in ${lose}${suffix}`),
      ),
      method: "qa_or_in",
      confidence: 0.8,
      flags: [],
    };
  }
  // P-yesno: Is S pred? No/Yes  ->  S is (not) pred (last-article split).
  if (/^(no|not|never|yes|always)\b/i.test(answerClean)) {
    match = core.match(/^(is|are)\s+(.+)$/i);
    if (match) {
      const parts = match[2].split(/\s+(a|an|the)\s+/i);
      if (parts.length >= 3) {
        const articleIndex = parts.length - 2;
        const subject = parts.slice(0, articleIndex).join(" ").trim();
        const pred = `${parts[articleIndex]} ${parts.slice(articleIndex + 1).join(" ")}`.trim();
        if (subject && pred) {
          const be = agreeBe(subject);
          const negative = /^(no|not|never)\b/i.test(answerClean);
          return {
            assertion: finishSentence(
              joinLeading(leading, `${capitalize(subject)} ${be}${negative ? " not" : ""} ${pred}${suffix}`),
            ),
            method: "qa_yesno",
            confidence: 0.75,
            flags: [],
          };
        }
      }
    }
  }
  // P10: Are/Is A or B pred? Winner  ->  Winner be pred than Loser.
  match = core.match(/^(are|is)\s+(.+)\s+or\s+(.+)$/i);
  if (match) {
    const left = match[2].trim();
    const words = match[3].trim().split(/\s+/);
    if (words.length >= 2) {
      const predWords = words.length >= 2 && /^(more|less|most|least)$/i.test(words[words.length - 2] ?? "") ? 2 : 1;
      const pred = words.slice(-predWords).join(" ");
      const right = words.slice(0, -predWords).join(" ").trim();
      if (left && right && pred) {
        const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const winner = new RegExp(`\\b${escapeRegExp(left.split(/\s+/)[0] ?? "")}`, "i").test(answerClean)
          ? { win: left, lose: right }
          : { win: right, lose: left };
        const be = agreeBe(winner.win);
        let winnerSuffix = ` (${answerClean})`;
        const firstWord = winner.win.split(/\s+/)[0] ?? "";
        if (firstWord && new RegExp(`^${escapeRegExp(firstWord)}\\b`, "i").test(answerClean)) {
          const remainder = answerClean.replace(new RegExp(`^${escapeRegExp(firstWord)}\\b\\s*`, "i"), "").trim();
          const stat = remainder.match(/^\(([^()]*)\)$/);
          winnerSuffix = stat ? ` (${stat[1]})` : remainder ? ` (${remainder})` : "";
        }
        return {
          assertion: finishSentence(
            joinLeading(leading, `${capitalize(winner.win)} ${be} ${pred.trim()} than ${winner.lose}${winnerSuffix}${suffix}`),
          ),
          method: "qa_comparison",
          confidence: 0.75,
          flags: [],
        };
      }
    }
  }
  return null;
}

function rewriteQuestion(filled: string, _contextHeader: string): RewriteResult | null {
  void _contextHeader;
  const questionMark = filled.indexOf("?");
  if (questionMark < 0) return null;
  const question = filled.slice(0, questionMark).trim();
  let answer = filled.slice(questionMark + 1).trim().replace(/\s+/g, " ");
  if (!answer) return null;
  // Short-label strip: "Type A: X" / "Cross table: X" -> X + " (label)".
  // Dash form ("Aging - Decreases") requires a letter-led label and spaced
  // dash so ranges ("3-5 mm") never strip.
  let suffix = "";
  const labelStrip = answer.match(/^(?=.*[A-Za-z])(.{1,24}?)\s*:\s*(.+)$/s);
  if (labelStrip) {
    suffix = ` (${labelStrip[1].trim()})`;
    answer = labelStrip[2].trim();
  } else {
    const dashStrip = answer.match(/^([A-Za-z][A-Za-z0-9 /-]{0,19}?)\s+[-–]\s+(.+)$/s);
    if (dashStrip) {
      suffix = ` (${dashStrip[1].trim()})`;
      answer = dashStrip[2].trim();
    }
  }
  let answerClean = answer.replace(/[.?]+$/, "").trim();
  // "X is Y" strip when X names part of the question.
  const isStrip = answerClean.match(/^(.{4,}?)\s+is\s+(.+)$/i);
  if (isStrip && question.toLowerCase().includes(isStrip[1].toLowerCase())) answerClean = isStrip[2].trim();
  if (!answerClean) return null;

  // Phase 1: start-anchored patterns on the full question.
  const direct = tryStartPatterns(question, "", answerClean, suffix);
  if (direct) return direct;
  // Phase 2: leading-context split (comma or sentence boundary), patterns on
  // the terminal interrogative core. A greedy where/when retry catches
  // multi-clause leads ("When ..., following THA where should ...").
  const split = question.match(/^(.*?,)\s*(what|which|where|when|how|are|is|does|do|should|name|identify)\b(.*)$/is)
    ?? question.match(/^(.*\.)\s*(what|which|where|when|how|are|is|does|do|should)\b(.*)$/is);
  if (split) {
    const retry = tryStartPatterns(`${split[2]}${split[3]}`.trim(), `${split[1].trim()} `, answerClean, suffix);
    if (retry) return retry;
  }
  const lateSplit = question.match(/^(.*\S)\s+(where|when)\b(.*)$/is);
  if (lateSplit && !/^(where|when)\b/i.test(question)) {
    const rawLeading = lateSplit[1].trim();
    const leadingText = /[.,:;!?]$/.test(rawLeading) ? `${rawLeading} ` : `${rawLeading}, `;
    const retry = tryStartPatterns(`${lateSplit[2]}${lateSplit[3]}`.trim(), leadingText, answerClean, suffix);
    if (retry) return retry;
  }
  // Phase 3b: mid-sentence how-far/long/many/much substitution.
  if (!/^how\s+(far|long|many|much)\b/i.test(question)) {
    const howMid = question.match(/^(.*?)\bhow\s+(far|long|many|much)\b(.*)$/is);
    if (howMid && howMid[1].trim()) {
      return {
        assertion: finishSentence(
          capitalize(`${howMid[1].trim()} ${answerClean} ${howMid[3].trim()}${suffix}`.replace(/\s+/g, " ")),
        ),
        method: "qa_mid_substitution",
        confidence: 0.8,
        flags: [],
      };
    }
  }
  // Phase 3: mid-sentence what/which substitution (never for start position).
  if (!/^(what|which)\b/i.test(question)) {
    const mid = question.match(/^(.*?)\b(what|which)\b\s*(.*?)$/is);
    if (mid) {
      const prefix = mid[1].trim();
      const tail = mid[3].trim();
      const verbSplit = tail.match(/^(.*?)\b(is|are|was|were|indicates|indicate|shows|show|suggests|suggest|means|mean|adds|add|provides|provide|carries|carry|requires|require|predicts|predict|confirms|confirm|makes|make)\b(.*)$/is);
      if (verbSplit) {
        const rest = `${verbSplit[2].toLowerCase()}${verbSplit[3] ?? ""}`.trim();
        return {
          assertion: finishSentence(capitalize(`${prefix} ${answerClean} ${rest}${suffix}`.replace(/\s+/g, " "))),
          method: "qa_mid_substitution",
          confidence: 0.8,
          flags: [],
        };
      }
      if (prefix) {
        return {
          assertion: finishSentence(capitalize(`${prefix} ${answerClean}${suffix}`.replace(/\s+/g, " "))),
          method: "qa_mid_substitution",
          confidence: 0.8,
          flags: [],
        };
      }
    }
  }
  return null;
}

const ANATOMY_VERBS: Array<{ pattern: RegExp; build: (subject: string, value: string) => string }> = [
  { pattern: /^(origin|origins)$/i, build: (subject, value) => `${subject} originates from ${value}` },
  { pattern: /^(innervation|nerve supply|nerve)$/i, build: (subject, value) => `${subject} is innervated by ${value}` },
  { pattern: /^(blood supply|vascularity)$/i, build: (subject, value) => `${subject} is supplied by ${value}` },
];

function isShortNounPhrase(contextHeader: string): boolean {
  const words = contextHeader.trim().split(/\s+/);
  return words.length <= 5
    && !/\b(is|are|was|were|there|has|have|shows?|indicates?)\b/i.test(contextHeader)
    && !/[,?]/.test(contextHeader);
}

/** Leading scope ("Within the metaphysis") from a longer context clause. */
function extractContextScope(contextHeader: string): string {
  const match = contextHeader.match(/^(within|in|during|after|for)\b[^,.]{1,60}/i);
  if (match) return match[0].trim();
  if (contextHeader.length <= 40 && !/[?]/.test(contextHeader)) {
    return contextHeader.replace(/[.:]+$/, "").trim();
  }
  return "";
}

const TOPIC_VALUE_VERBS = /\b(make|makes|are|is|was|were|remodel|remodels|form|forms|contain|contains|show|shows|have|has|do|does|lay|lays|undergo|undergoes)\b/i;

function rewriteDeclarativeBlock(filled: string, contextHeader: string): RewriteResult {
  // D0: numbered/bulleted list items ("1) Attachment for muscles") attach to
  // a short header; long headers cannot become subjects, so the item stands
  // alone flagged.
  // Dash bullets require a following letter so negative numbers ("-5 mm")
  // never match.
  const listItem = filled.match(/^\s*(?:(?:\d+[.)]|\(\d+\)|[a-z][.)]|•)\s+|-\s+(?=[A-Za-z]))(.+)$/is);
  if (listItem) {
    const item = (listItem[1] ?? "").trim();
    if (contextHeader && contextHeader.length <= 60 && !/[?]/.test(contextHeader)) {
      return {
        assertion: finishSentence(`${capitalize(contextHeader.replace(/[.:]+$/, "").trim())} includes ${item}`),
        method: "numbered_item_list",
        confidence: 0.8,
        flags: ["context_prefixed"],
      };
    }
    return {
      assertion: finishSentence(item),
      method: "numbered_item_bare",
      confidence: 0.65,
      flags: contextHeader ? ["context_dependent"] : [],
    };
  }
  // D3: nerve-level pairs ("Hip flexion - L2, L3") with nerve context.
  const nervePair = filled.match(/^(.+?)\s*[-–:]\s*([CLST]\d(?:\s*,\s*[CLST]?\d)*)\.?$/i);
  if (nervePair && /nerve|root|myotome|dermatome/i.test(contextHeader)) {
    return {
      assertion: finishSentence(`${capitalize(nervePair[1].trim())} is supplied by spinal nerves ${nervePair[2].trim()}`),
      method: "anatomy_nerve_levels",
      confidence: 0.85,
      flags: [],
    };
  }
  // D2: classification stages ("Type IIA: ...") with classification context.
  const stage = filled.match(/^(type|stage|grade)\s+([A-Za-z0-9]+)\s*[:–-]\s*(.+)$/i);
  if (stage && contextHeader) {
    const kind = stage[1].charAt(0).toUpperCase() + stage[1].slice(1).toLowerCase();
    return {
      assertion: finishSentence(`In ${contextHeader.replace(/[.:]+$/, "")}, ${kind} ${stage[2]} is ${stage[3].trim()}`),
      method: "classification_stage",
      confidence: 0.85,
      flags: [],
    };
  }
  // D1b: topic-comment pairs ("Primary spongiosa - osteoblasts make ..."):
  // the value already states the proposition, so keep topic + scope without
  // inventing a subject. Intra-word hyphens ("x-ray") never split.
  const labeled = filled.match(/^([A-Za-z][A-Za-z /-]{1,40}?)(?:\s*[:–]\s*|\s+-\s+)(.+)$/);
  if (labeled && TOPIC_VALUE_VERBS.test(labeled[2])) {
    const scope = contextHeader ? extractContextScope(contextHeader) : "";
    return {
      assertion: finishSentence(
        scope
          ? `${capitalize(labeled[1].trim())} (${scope}): ${labeled[2].trim()}`
          : `${capitalize(labeled[1].trim())}: ${labeled[2].trim()}`,
      ),
      method: "topic_comment",
      confidence: 0.8,
      flags: contextHeader && !scope ? ["context_dependent"] : [],
    };
  }
  // D1: anatomy label:value with a SHORT subject header ("Origin: ..." +
  // "Plantaris"). Clause contexts use the scope form instead.
  if (labeled && contextHeader) {
    const label = labeled[1].trim();
    const value = labeled[2].trim();
    if (isShortNounPhrase(contextHeader)) {
      const subject = ensureThe(capitalize(contextHeader.replace(/[.:]+$/, "").trim()));
      const verb = ANATOMY_VERBS.find((entry) => entry.pattern.test(label));
      if (verb) {
        return {
          assertion: finishSentence(verb.build(capitalize(subject), value)),
          method: "anatomy_verb",
          confidence: 0.85,
          flags: [],
        };
      }
      return {
        assertion: finishSentence(`${capitalize(subject)} ${label.toLowerCase()} is ${value}`),
        method: "anatomy_neutral",
        confidence: 0.8,
        flags: ["context_prefixed"],
      };
    }
    const scope = extractContextScope(contextHeader);
    return {
      assertion: finishSentence(
        scope
          ? `${capitalize(label)} (${scope}) is ${value}`
          : `${capitalize(label)} is ${value}`,
      ),
      method: "anatomy_scoped",
      confidence: 0.75,
      flags: scope ? [] : ["context_dependent"],
    };
  }
  // D4: threshold items with context ("CRP >10 ..." + "Acute PJI ...").
  const threshold = filled.match(/^(.+?)\s*(>=|<=|>|<)\s*([\d.,]+)\s*([A-Za-z/%]*)\.?$/);
  if (threshold && contextHeader) {
    const scope = isShortNounPhrase(contextHeader)
      ? contextHeader.replace(/[.:]+$/, "")
      : extractContextScope(contextHeader);
    return {
      assertion: finishSentence(
        scope
          ? `For ${scope}, ${threshold[1].trim()} ${threshold[2]} ${threshold[3]}${threshold[4] ? ` ${threshold[4].trim()}` : ""}`
          : `${threshold[1].trim()} ${threshold[2]} ${threshold[3]}${threshold[4] ? ` ${threshold[4].trim()}` : ""}`,
      ),
      method: "threshold_context",
      confidence: 0.85,
      flags: scope ? [] : ["context_dependent"],
    };
  }
  // D5: generic label/value pairs.
  if (labeled) {
    if (contextHeader && !isShortNounPhrase(contextHeader)) {
      const scope = extractContextScope(contextHeader);
      return {
        assertion: finishSentence(
          scope
            ? `${capitalize(labeled[1].trim())} is ${labeled[2].trim()} (${scope})`
            : `${capitalize(labeled[1].trim())} is ${labeled[2].trim()}`,
        ),
        method: "generic_label_value",
        confidence: 0.7,
        flags: scope ? [] : ["context_dependent"],
      };
    }
    return {
      assertion: finishSentence(
        contextHeader
          ? `${capitalize(contextHeader.replace(/[.:]+$/, "").trim())}: ${labeled[1].trim()} is ${labeled[2].trim()}`
          : `${capitalize(labeled[1].trim())} is ${labeled[2].trim()}`,
      ),
      method: "generic_label_value",
      confidence: 0.75,
      flags: contextHeader ? ["context_prefixed"] : [],
    };
  }
  // D6: passthrough for already-declarative filled text.
  return {
    assertion: finishSentence(filled),
    method: "declarative_passthrough",
    confidence: 0.7,
    flags: [],
  };
}

export function rewriteUnit(unit: AtomicExtractionUnit): RewriteResult {
  if (unit.questionWithoutAnswer) {
    return { assertion: "", method: "unusable_interrogative", confidence: 0, flags: [] };
  }
  const filled = unit.filledBlock.replace(/\s+/g, " ").trim();
  const rewritten = rewriteQuestion(filled, unit.contextHeader);
  if (rewritten) return rewritten;
  // P8b: imperative prompt without "?" ("Name the special test: Lift off.").
  const imperative = filled.match(/^(name|identify|list|describe)\s+(the\s+)?(.+?)\s*[:–-]\s*(.+)$/i);
  if (imperative && !filled.includes("?")) {
    return {
      assertion: finishSentence(`The ${imperative[3].trim()} is ${imperative[4].trim()}`),
      method: "qa_imperative",
      confidence: 0.8,
      flags: [],
    };
  }
  if (filled.includes("?")) {
    // Unknown interrogative shape: preserve content, flag loudly, low
    // confidence. Never invent a predicate to force declarative form.
    return {
      assertion: finishSentence(filled.replace(/\?/g, "").trim()),
      method: "interrogative_fallback",
      confidence: 0.55,
      flags: ["question_shaped"],
    };
  }
  return rewriteDeclarativeBlock(filled, unit.contextHeader);
}

// ---------------------------------------------------------------------------
// Atomicity validation.
// ---------------------------------------------------------------------------

// "causes" excluded: in this deck it is usually a noun ("common causes of").
// "leads" only counts in the phrase "leads to" (bare "leads" = EKG leads).
const ATOMIC_VERBS = [
  "is", "are", "was", "were", "be", "increases", "decreases", "leads to",
  "originates", "inserts", "supplies", "indicates", "suggests", "requires",
  "shows", "treats", "carries", "associates", "involves", "affects",
  "worsens", "improves", "reduces", "prevents", "predicts", "presents",
  "contains", "includes", "equals", "exceeds", "reveals", "demonstrates",
  "lay", "lays", "makes", "made",
];

export function validateAtomicity(assertion: string): { atomic: boolean; flags: AtomicQualityFlag[] } {
  const flags: AtomicQualityFlag[] = [];
  const clauses = assertion.split(/\band\b/i);
  if (clauses.length >= 2) {
    const verbClauses = clauses.filter((clause) =>
      new RegExp(`\\b(${ATOMIC_VERBS.join("|")})\\b`, "i").test(clause),
    );
    if (verbClauses.length >= 2) flags.push("compound_conjunction");
  }
  const thresholds = assertion.match(/(>=|<=|>|<)\s*[\d.,]+/g) ?? [];
  if (thresholds.length >= 2) flags.push("multi_threshold");
  // "(2)" alone is a count ("compartments (2)"); lists need 2+ markers.
  // Unsplittable comma-coordinations ("A, B, and C") are flagged so the
  // conjunction is reviewable instead of silently passing as atomic.
  // Subordinate clauses ("X, which ..., Y") are stripped first so relative
  // clauses never read as coordination.
  const listMarkers = assertion.match(/\(\d+\)|\d+\)/g) ?? [];
  const deSubordinated = assertion.replace(/,\s*(which|who|that|where|when|because|although|while|if|as|since)\b[^,?]*/gi, "");
  const bareCoordination = /,\s*[^,?]+,/.test(deSubordinated) || /,\s*[^,?]+\band\b/i.test(deSubordinated);
  if (/;\s*\S+;\s*\S/.test(assertion) || listMarkers.length >= 2 || bareCoordination) flags.push("list_like");
  if (assertion.includes("?") || /^(what|which|where|when|how|name|identify|list|describe)\b/i.test(assertion)) {
    flags.push("question_shaped");
  }
  if (/\b(this|these|those)\b/i.test(assertion) && !/:/.test(assertion)) flags.push("context_dependent");
  if (isImageDeictic(assertion)) {
    flags.push("image_deictic");
    if (isExplicitDeictic(assertion)) flags.push("explicit_deictic");
  }
  const compound = flags.some((flag) =>
    flag === "compound_conjunction" || flag === "multi_threshold" || flag === "list_like",
  );
  return { atomic: !compound, flags };
}

// ---------------------------------------------------------------------------
// Per-card orchestration.
// ---------------------------------------------------------------------------

export function extractCardClaims(card: ExtractorCardInput): AtomicCardExtraction {
  const { units, contextHeader, hasImage, reasonCodes } = extractAtomicUnits(card);
  void contextHeader;
  const base = {
    sourceCardId: card.canonicalCardId,
    sourceCardVersionId: card.canonicalCardVersionId,
  };
  if (units.length === 0) {
    if (hasImage) {
      return { ...base, extractionStatus: "image_dependent", reasonCodes: ["image_dependent_no_textual_proposition"], candidates: [], units };
    }
    const field = teachingField(card);
    const plainLength = field ? splitHtmlBlocks(field.rawValue).join(" ").length : 0;
    if (plainLength < 15) {
      return { ...base, extractionStatus: "insufficient_context", reasonCodes: ["insufficient_textual_content"], candidates: [], units };
    }
    return { ...base, extractionStatus: "no_claim", reasonCodes: [...reasonCodes, "no_cloze_extracted"], candidates: [], units };
  }
  if (units.length > ATOMIC_MAX_CLAIMS_PER_CARD) {
    // Record candidates for review; emit none automatically.
    const candidates = units.map((unit) => toCandidate(unit));
    return {
      ...base,
      extractionStatus: "needs_review",
      reasonCodes: ["claim_ceiling_exceeded", `units_${units.length}`],
      candidates,
      units,
    };
  }
  const candidates = units.map((unit) => toCandidate(unit));
  const usable = candidates.filter((candidate) => candidate.assertion.trim().length > 0);
  const dropped = candidates.length - usable.length;
  // Image-dependent only when every usable candidate is EXPLICITLY deictic
  // AND short: generic visibility statements ("x-ray will show X") are
  // emitted with an image_deictic review flag instead of being suppressed.
  if (
    usable.length > 0
    && usable.every((candidate) => candidate.qualityFlags.includes("explicit_deictic"))
    && usable.every((candidate) => candidate.assertion.length < 150)
  ) {
    return { ...base, extractionStatus: "image_dependent", reasonCodes: ["image_deictic_claims_only"], candidates, units };
  }
  if (usable.length === 0) {
    if (hasImage) {
      return {
        ...base,
        extractionStatus: "image_dependent",
        reasonCodes: ["image_only_answer", `dropped_empty_answer_${dropped}`],
        candidates: [],
        units,
      };
    }
    return {
      ...base,
      extractionStatus: "insufficient_context",
      reasonCodes: ["answers_not_clozed", `dropped_empty_answer_${dropped}`],
      candidates: [],
      units,
    };
  }
  if (dropped > 0) {
    return { ...base, extractionStatus: "claims_extracted", reasonCodes: [`dropped_empty_answer_${dropped}`], candidates: usable, units };
  }
  return { ...base, extractionStatus: "claims_extracted", reasonCodes: [], candidates, units };
}

function toCandidate(unit: AtomicExtractionUnit): AtomicClaimCandidate {
  // Image-only cloze answers ("{{c1::<img ...>}}") strip to nothing: the unit
  // carries no textual proposition.
  if (!unit.answer.replace(/<[^>]+>/g, "").trim()) {
    return {
      unitId: unit.unitId,
      assertion: "",
      rewriteMethod: "unusable_empty_answer",
      atomic: false,
      qualityFlags: [],
      confidence: 0,
      sourceEvidence: { field: unit.fieldName, locator: unit.evidenceLocator },
    };
  }
  const rewritten = rewriteUnit(unit);
  const validation = validateAtomicity(rewritten.assertion);
  const flags = [...new Set([...rewritten.flags, ...validation.flags])];
  if (validation.atomic && !flags.includes("compound_conjunction")) flags.unshift("atomic");
  // Short answers ("C5", "II") are fine when the assertion carries context.
  if (unit.answer.trim().length < 3 && rewritten.assertion.length < 60) flags.push("short_answer_only");
  let confidence = rewritten.confidence;
  if (flags.includes("question_shaped") || flags.includes("image_deictic")) confidence = Math.min(confidence, 0.55);
  if (flags.includes("context_dependent")) confidence = Math.min(confidence, 0.65);
  if (!validation.atomic) confidence = Math.min(confidence, 0.6);
  return {
    unitId: unit.unitId,
    assertion: rewritten.assertion,
    rewriteMethod: rewritten.method,
    atomic: validation.atomic,
    qualityFlags: flags,
    confidence: Number(confidence.toFixed(3)),
    sourceEvidence: { field: unit.fieldName, locator: unit.evidenceLocator },
  };
}
