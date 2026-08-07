/**
 * Smart-token parsing for sign-out card bodies. Pure and dependency-free so it
 * can be unit-tested and shared. The body stays freeform text; these helpers let
 * the UI render recognized tokens as chips and checkboxes, and derive filter tags.
 */

export type SignoutTokenType = "text" | "wb" | "pod" | "tag";

export type SignoutToken = { type: SignoutTokenType; value: string };

export type SignoutCheckbox = "none" | "unchecked" | "checked";

export type SignoutLine = {
  index: number;
  checkbox: SignoutCheckbox;
  tokens: SignoutToken[];
};

/** Weight-bearing shorthand rendered as pills. */
export const WB_TERMS = ["NWB", "TTWB", "PWB", "WBAT", "FWB"] as const;
const WB_SET = new Set<string>(WB_TERMS);

const TOKEN_RE = /(\bPOD\s?\d+\b|\b(?:NWB|TTWB|PWB|WBAT|FWB)\b|#[A-Za-z][\w-]*)/gi;
const CHECKBOX_RE = /^(\s*)\[([ xX])\]\s?(.*)$/;

function classify(piece: string): SignoutTokenType {
  if (piece.startsWith("#")) return "tag";
  if (/^POD/i.test(piece)) return "pod";
  if (WB_SET.has(piece.toUpperCase())) return "wb";
  return "text";
}

/**
 * Break one line of content into ordered text/wb/pod/tag tokens. Only true regex
 * matches become chips; everything else is text — so `## Subjective` (a header, not a
 * `#tag`) stays plain text rather than being misread as a tag.
 */
export function tokenizeLine(content: string): SignoutToken[] {
  if (!content) return [];
  const tokens: SignoutToken[] = [];
  let last = 0;
  for (const match of content.matchAll(TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) tokens.push({ type: "text", value: content.slice(last, idx) });
    tokens.push({ type: classify(match[0]), value: match[0] });
    last = idx + match[0].length;
  }
  if (last < content.length) tokens.push({ type: "text", value: content.slice(last) });
  return tokens;
}

const HEADER_RE = /^#{1,3}\s+(.+?)\s*$/;

/** Default clinical section titles offered by the insert toolbar. */
export const SECTION_TITLES = [
  "Subjective",
  "Objective",
  "Vitals",
  "Labs",
  "Imaging",
  "Assessment & Plan",
] as const;

function lineFromRaw(raw: string, index: number): SignoutLine {
  const match = CHECKBOX_RE.exec(raw);
  if (match) {
    const checkbox: SignoutCheckbox = match[2] === " " ? "unchecked" : "checked";
    return { index, checkbox, tokens: tokenizeLine(match[3]) };
  }
  return { index, checkbox: "none", tokens: tokenizeLine(raw) };
}

/** True when a raw line is a section header (`## Subjective`). */
export function sectionTitle(raw: string): string | null {
  const m = HEADER_RE.exec(raw);
  return m ? m[1] : null;
}

/** Parse a full body into renderable lines (checkbox state + tokens per line). */
export function parseBody(text: string): SignoutLine[] {
  return text.split("\n").map((raw, index) => lineFromRaw(raw, index));
}

export type SignoutSection = { title: string; headerIndex: number; lines: SignoutLine[] };

/**
 * Group a body into a lead block (one-liner + inline items before any header) and
 * ordered clinical sections. Absolute line indices are preserved so checkbox
 * toggles keep working across the whole body.
 */
export function parseSections(text: string): {
  lead: SignoutLine[];
  sections: SignoutSection[];
} {
  const lead: SignoutLine[] = [];
  const sections: SignoutSection[] = [];
  let current: SignoutSection | null = null;

  text.split("\n").forEach((raw, index) => {
    const title = sectionTitle(raw);
    if (title !== null) {
      current = { title, headerIndex: index, lines: [] };
      sections.push(current);
      return;
    }
    (current ? current.lines : lead).push(lineFromRaw(raw, index));
  });

  return { lead, sections };
}

/** Flip `[ ]` ↔ `[x]` on one line, leaving everything else untouched. */
export function toggleCheckboxAt(text: string, lineIndex: number): string {
  const lines = text.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return text;
  const match = CHECKBOX_RE.exec(line);
  if (!match) return text;
  const [, indent, mark, rest] = match;
  const nextMark = mark === " " ? "x" : " ";
  lines[lineIndex] = `${indent}[${nextMark}] ${rest}`;
  return lines.join("\n");
}

/** Count checkbox action items in a body, split by open/done. For dense views. */
export function countTodos(text: string): { open: number; done: number } {
  let open = 0;
  let done = 0;
  for (const line of parseBody(text)) {
    if (line.checkbox === "unchecked") open += 1;
    else if (line.checkbox === "checked") done += 1;
  }
  return { open, done };
}

/** Unique lowercased #tags across a body (without the leading #), for filters. */
export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const line of parseBody(text)) {
    for (const token of line.tokens) {
      if (token.type === "tag") tags.add(token.value.slice(1).toLowerCase());
    }
  }
  return [...tags];
}
