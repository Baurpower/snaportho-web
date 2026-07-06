export type AtomicityResult = {
  atomic: boolean;
  sentenceCount: number;
  issues: string[];
  isManagementLogic: boolean;
  isQuestion: boolean;
  suggestDecisionPoint: boolean;
};

const MANAGEMENT_PATTERNS = [
  /\bif\b.+\b(then|proceed|fix|orif|operat|immobiliz|splint|cast)\b/i,
  /\bversus\b.+\b(requir\w*|fixat\w*|operat\w*)\b/i,
  /\bstable\b.+\bunstable\b.+\b(requir\w*|fixat\w*)\b/i,
  /\bwhen indicated\b/i,
  /\boperative (fixation|indication|pathway)\b/i,
  /\bnonoperative\b.+\boperative\b/i,
  /\b(requiring fixation|requiring operat)\b/i,
];

const QUESTION_PATTERN = /^\s*(what|how|when|why|which|where|who|does|do|is|are|can|should)\b.+\?\s*$/i;

export function validateAtomicity(text: string): AtomicityResult {
  const trimmed = text.trim();
  const issues: string[] = [];
  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = sentences.length;

  const isQuestion = QUESTION_PATTERN.test(trimmed) || trimmed.endsWith("?");
  const isManagementLogic = MANAGEMENT_PATTERNS.some((p) => p.test(trimmed));

  if (sentenceCount > 2) {
    issues.push("MULTI_SENTENCE: claim exceeds two sentences");
  }
  if (trimmed.length > 280) {
    issues.push("LENGTH_EXCEEDED: claim text exceeds 280 characters");
  }
  if (trimmed.includes(";") && sentenceCount > 1) {
    issues.push("COMPOUND_CLAUSE: semicolon-separated compound assertion");
  }
  if (isManagementLogic) {
    issues.push("MANAGEMENT_LOGIC: if/then or treatment pathway — route to Decision Point Builder");
  }
  if (isQuestion) {
    issues.push("QUESTION_FORM: phrased as question — reject or rephrase as attending_pearl");
  }

  const commaParts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length > 3 && sentenceCount <= 1) {
    issues.push("LIST_ASSERTION: multiple assertions in one claim");
  }

  const atomic =
    issues.filter((i) => !i.startsWith("QUESTION_FORM")).length === 0 ||
    (issues.length === 1 && issues[0].startsWith("QUESTION_FORM"));

  return {
    atomic: atomic && !isManagementLogic && sentenceCount <= 2 && trimmed.length <= 280,
    sentenceCount,
    issues,
    isManagementLogic,
    isQuestion,
    suggestDecisionPoint: isManagementLogic,
  };
}

export function splitListAssertions(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed.includes(",")) return [trimmed];
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [trimmed];
  return parts.map((p) => (p.endsWith(".") ? p : `${p}.`));
}