import { createStableHash } from "./hash";

export type ReviewGroupingInput = {
  deckName: string | null;
  modelName: string | null;
  tags: string[];
  fieldText: string | null;
  mediaRefCount: number;
  duplicateReason?: string | null;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/::/g, "--")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function suspectTopicWords(fieldText: string | null): string[] {
  if (!fieldText) {
    return [];
  }

  const tokens = fieldText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "what",
    "which",
    "when",
    "where",
    "into",
    "after",
    "before",
    "patient",
    "patients",
    "most",
    "least",
    "best",
    "used",
    "view",
    "xray",
    "x",
    "ray",
  ]);

  const scored = new Map<string, number>();
  for (const token of tokens) {
    if (token.length < 4 || stopwords.has(token)) {
      continue;
    }
    scored.set(token, (scored.get(token) ?? 0) + 1);
  }

  return [...scored.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([token]) => token);
}

export function buildReviewGroupKeys(input: ReviewGroupingInput): string[] {
  const keys = new Set<string>();

  if (input.deckName) {
    const branch = input.deckName
      .split("::")
      .slice(0, Math.min(3, input.deckName.split("::").length))
      .join("::");
    keys.add(`deck:${slugify(branch)}`);
  }

  if (input.modelName) {
    keys.add(`model:${slugify(input.modelName)}`);
  }

  for (const tag of input.tags) {
    keys.add(`tag:${slugify(tag)}`);
  }

  const topicWords = suspectTopicWords(input.fieldText);
  if (topicWords.length > 0) {
    keys.add(`topic:${slugify(topicWords.join("-"))}`);
  }

  if (input.mediaRefCount >= 3) {
    keys.add("media:heavy");
  } else if (input.mediaRefCount > 0) {
    keys.add("media:present");
  }

  if (input.duplicateReason) {
    keys.add(`duplicate:${slugify(input.duplicateReason)}`);
  }

  keys.add(
    `bundle:${createStableHash({
      deck: input.deckName ?? "",
      model: input.modelName ?? "",
      tags: [...input.tags].sort(),
      topicWords,
      mediaBucket: input.mediaRefCount >= 3 ? "heavy" : input.mediaRefCount > 0 ? "present" : "none",
      duplicateReason: input.duplicateReason ?? "",
    }).slice(0, 12)}`
  );

  return [...keys];
}
