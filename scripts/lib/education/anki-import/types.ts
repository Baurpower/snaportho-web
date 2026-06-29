export type JsonRecord = Record<string, unknown>;

export type ImportFileType = "apkg" | "tsv";

export type MediaKind = "image" | "audio" | "other";

export type TrainingLevel =
  | "M3"
  | "M4"
  | "PGY1"
  | "PGY2"
  | "PGY3"
  | "PGY4"
  | "PGY5"
  | "Fellow"
  | "Attending";

export type ParsedAnkiField = {
  ordinal: number;
  name: string;
  rawValue: string;
  plainText: string;
};

export type ParsedAnkiDeck = {
  sourceDeckId: string;
  fullName: string;
  deckName: string;
  deckPath: string[];
  metadata: JsonRecord;
};

export type ParsedAnkiModel = {
  sourceModelId: string;
  modelName: string;
  fieldNames: string[];
  templates: unknown[];
  css: string | null;
  latexPre: string | null;
  latexPost: string | null;
  metadata: JsonRecord;
};

export type ParsedAnkiNote = {
  sourceNoteKey: string;
  ankiNoteId: string | null;
  ankiNoteGuid: string | null;
  sourceModelId: string | null;
  primaryDeckSourceId: string | null;
  sortField: string | null;
  tagsRaw: string | null;
  tagNames: string[];
  fields: ParsedAnkiField[];
  rawHtmlByField: Record<string, string>;
  sourceContentHash: string;
  noteIdentityHash: string;
  metadata: JsonRecord;
};

export type ParsedAnkiCard = {
  sourceCardKey: string;
  ankiCardId: string | null;
  sourceNoteKey: string;
  sourceDeckId: string | null;
  cardOrd: number;
  cardType: number | null;
  queue: number | null;
  due: number | null;
  interval: number | null;
  easeFactor: number | null;
  reps: number | null;
  lapses: number | null;
  leftCount: number | null;
  originalDue: number | null;
  originalDeckId: string | null;
  flags: number | null;
  schedulingData: string | null;
  sourceContentHash: string;
  schedulingHash: string | null;
  metadata: JsonRecord;
};

export type ParsedAnkiTag = {
  rawName: string;
  slug: string;
  metadata: JsonRecord;
};

export type ParsedAnkiMediaRef = {
  sourceNoteKey: string;
  sourceCardKey: string | null;
  fieldName: string;
  mediaKind: MediaKind;
  mediaSrc: string;
  packageEntryName: string | null;
  mediaSha256: string | null;
  existsInPackage: boolean;
  metadata: JsonRecord;
};

export type ParsedAnkiImport = {
  filePath: string;
  fileName: string;
  fileType: ImportFileType;
  fileSha256: string;
  sourceSlug: "anki";
  sourceName: "Anki";
  warnings: string[];
  decks: ParsedAnkiDeck[];
  models: ParsedAnkiModel[];
  notes: ParsedAnkiNote[];
  cards: ParsedAnkiCard[];
  tags: ParsedAnkiTag[];
  mediaRefs: ParsedAnkiMediaRef[];
  metadata: JsonRecord;
};

export type ImportSummary = {
  importBatchId: string | null;
  fileType: ImportFileType;
  fileName: string;
  deckCount: number;
  modelCount: number;
  noteCount: number;
  cardCount: number;
  tagCount: number;
  mediaRefCount: number;
  canonicalCardCount: number;
  qualityReviewCount: number;
  warnings: string[];
};

export type ImportOptions = {
  dryRun: boolean;
};
