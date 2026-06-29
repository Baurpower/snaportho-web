import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { inspect } from "node:util";
import { createClient } from "@supabase/supabase-js";
import {
  ORTHOBULLETS_REVIEWED_TOPIC_OVERRIDES,
  type OrthobulletsReviewedTopicOverride,
} from "./orthobullets-reviewed-topic-overrides.ts";

type JsonRecord = Record<string, unknown>;

type ReviewKind = "accepted" | "topic_review" | "source_anomaly";
type MappingMethod = "import_rule" | "reviewed";

type SourceAnomalyReason =
  | "missing-question-id"
  | "invalid-question-id"
  | "missing-specialty"
  | "missing-topic"
  | "merged-specialty-topic"
  | "garbled-topic";

type SpecialtyNormalizationMethod =
  | "exact"
  | "alias"
  | "topic-context"
  | "csv-normalized"
  | "unresolved";

type TopicNormalizationMethod =
  | "source-normalized"
  | "raw-cleanup"
  | "review-cleanup";

type DuplicateCandidateReason = "same-topic-across-specialties" | "high-token-overlap";

type CanonicalSpecialty = {
  slug:
    | "trauma"
    | "spine"
    | "shoulder-elbow"
    | "knee-sports"
    | "pediatrics"
    | "recon"
    | "hand"
    | "foot-ankle"
    | "pathology"
    | "basic-science"
    | "anatomy";
  name: string;
  aliases: string[];
};

type ValidatedSourceRow = {
  source: string;
  externalQuestionId: string;
  specialtyRaw: string;
  specialtyNormalizedCsv: string;
  topicRaw: string;
  topicNormalizedCsv: string;
  topicSlugCsv: string;
  needsConceptMappingCsv: string;
  statusCsv: string;
  rowNumber: number;
};

type SourceAnomalyRow = {
  external_question_id: string;
  raw_specialty: string;
  normalized_specialty_slug: string;
  normalized_specialty_title: string;
  raw_topic_label: string;
  normalized_topic_label: string;
  normalized_topic_slug: string;
  canonical_topic_node_slug: string;
  canonical_topic_node_id: string;
  mapping_confidence: string;
  review_reason: string;
  suggested_action: string;
  review_group_key: string;
  source_anomaly_reason: SourceAnomalyReason;
  row_number: string;
};

type SpecialtyNormalization = {
  specialtySlug: CanonicalSpecialty["slug"] | null;
  specialtyTitle: string | null;
  confidence: number;
  method: SpecialtyNormalizationMethod;
  needsReview: boolean;
  reviewReason: string;
};

type TopicNormalization = {
  topicDisplay: string;
  topicSlug: string;
  confidence: number;
  method: TopicNormalizationMethod;
  needsReview: boolean;
  reviewReason: string;
};

type RowResolution = {
  row: ValidatedSourceRow;
  specialty: SpecialtyNormalization;
  topic: TopicNormalization;
  reviewKind: ReviewKind;
  mappingConfidence: number;
  mappingConfidenceRounded: string;
  mappingReviewReason: string;
  suggestedAction: string;
  reviewGroupKey: string;
  canonicalTopicNodeSlug: string;
  allowTopicNodeCreation: boolean;
  shouldCreateTopicConcept: boolean;
  mappingMethod: MappingMethod;
  reviewOverrideReason: string;
  qualityScoreComponents: JsonRecord;
};

type AggregatedTopicTask = {
  reviewGroupKey: string;
  rawSpecialtyLabels: Set<string>;
  normalizedSpecialtySlug: string;
  normalizedSpecialtyTitle: string;
  rawTopicLabels: Set<string>;
  normalizedTopicLabel: string;
  normalizedTopicSlug: string;
  canonicalTopicNodeSlug: string;
  reviewReason: string;
  suggestedAction: string;
  mappingMethod: MappingMethod;
  reviewOverrideReason: string;
  reviewKind: Exclude<ReviewKind, "source_anomaly">;
  questionIds: string[];
  questionCount: number;
  mappingConfidence: number;
  qualityNotes: Set<string>;
};

export type MappingReviewRow = {
  external_question_id: string;
  specialty_raw: string;
  normalized_specialty_slug: string;
  normalized_specialty_title: string;
  topic_raw: string;
  normalized_topic_label: string;
  normalized_topic_slug: string;
  mapped_specialty_slug: string;
  mapped_curriculum_node_slug: string;
  canonical_topic_node_id: string;
  mapping_confidence: string;
  needs_review: string;
  review_reason: string;
  suggested_action: string;
  mapping_method: MappingMethod;
  review_override_reason: string;
  review_group_key: string;
  row_number: string;
};

export type TopicReviewTaskRow = {
  review_group_key: string;
  raw_specialty_labels: string;
  normalized_specialty_slug: string;
  normalized_specialty_title: string;
  raw_topic_labels: string;
  normalized_topic_label: string;
  normalized_topic_slug: string;
  canonical_topic_node_slug: string;
  canonical_topic_node_id: string;
  question_count: string;
  mapping_confidence: string;
  review_reason: string;
  suggested_action: string;
  mapping_method: MappingMethod;
  review_override_reason: string;
  representative_question_ids: string;
  quality_notes: string;
};

export type ConceptMappingTaskRow = TopicReviewTaskRow & {
  is_high_frequency_topic: string;
};

export type PotentialDuplicateRow = {
  duplicate_group_key: string;
  normalized_topic_label_a: string;
  normalized_topic_slug_a: string;
  specialty_a: string;
  question_count_a: string;
  normalized_topic_label_b: string;
  normalized_topic_slug_b: string;
  specialty_b: string;
  question_count_b: string;
  duplicate_reason: DuplicateCandidateReason;
  token_overlap_score: string;
};

export type ImportSummary = {
  inputPath: string;
  rowCount: number;
  uniqueExternalQuestions: number;
  duplicateQuestions: number;
  malformedRows: number;
  sourceAnomalies: number;
  uniqueRawSpecialties: number;
  normalizedSpecialties: string[];
  unresolvedSpecialtyMappings: number;
  uniqueRawTopics: number;
  uniqueNormalizedSpecialtyTopicPairs: number;
  acceptedCurriculumNodes: number;
  newDraftCurriculumNodes: number;
  existingMatchedCurriculumNodes: number;
  topicMappingsRequiringReview: number;
  potentialDuplicates: number;
  autoCreatedTopicConcepts: number;
  conceptMappingTasks: number;
  highFrequencyNeedsConceptMappingTopics: Array<{
    specialty: string;
    topic: string;
    count: number;
  }>;
  autoAcceptCount: number;
  manualReviewCount: number;
  autoAcceptPercent: number;
  topManualReviewReasons: Array<{ reason: string; count: number }>;
  topSourceAnomalies: Array<{ reason: string; count: number }>;
  topHighFrequencyAcceptedTopics: Array<{ specialty: string; topic: string; count: number }>;
  topBlockedTopicExamples: Array<{ specialty: string; topic: string; count: number; reason: string }>;
  newSpecialtyCount?: number;
  newSpecialtyNodeCount?: number;
  newTopicNodeCount?: number;
  existingSpecialtyNodeCount?: number;
  existingTopicNodeCount?: number;
};

export type ImportArtifacts = {
  rowAuditRows: MappingReviewRow[];
  topicReviewRows: TopicReviewTaskRow[];
  conceptTaskRows: ConceptMappingTaskRow[];
  sourceAnomalyRows: SourceAnomalyRow[];
  potentialDuplicateRows: PotentialDuplicateRow[];
  summary: ImportSummary;
};

type ApplyOptions = {
  dryRun: boolean;
  seedTopicConcepts: boolean;
};

function createDatabaseClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type DatabaseLike = ReturnType<typeof createDatabaseClient>;
type RestAdmin = {
  url: string;
  apiKey: string;
};

const CANONICAL_SPECIALTIES: CanonicalSpecialty[] = [
  { slug: "trauma", name: "Trauma", aliases: ["trauma"] },
  { slug: "spine", name: "Spine", aliases: ["spine"] },
  {
    slug: "shoulder-elbow",
    name: "Shoulder & Elbow",
    aliases: ["shoulder & elbow", "shoulder and elbow", "shoulder", "elbow"],
  },
  {
    slug: "knee-sports",
    name: "Knee & Sports",
    aliases: ["knee & sports", "knee and sports", "sports"],
  },
  { slug: "pediatrics", name: "Pediatrics", aliases: ["pediatrics", "pediatric", "peds"] },
  { slug: "recon", name: "Recon", aliases: ["recon", "adult reconstruction"] },
  { slug: "hand", name: "Hand", aliases: ["hand"] },
  {
    slug: "foot-ankle",
    name: "Foot & Ankle",
    aliases: ["foot & ankle", "foot and ankle", "f&a"],
  },
  { slug: "pathology", name: "Pathology", aliases: ["pathology", "tumor"] },
  { slug: "basic-science", name: "Basic Science", aliases: ["basic science"] },
  { slug: "anatomy", name: "Anatomy", aliases: ["anatomy"] },
];

const PHASE1_SEEDED_TOPIC_SLUGS = new Set(["trauma-hip-intertrochanteric-fracture"]);

const SOURCE_SPECIALTY_MERGE_PATTERNS = [
  "knee &",
  "shoulder &",
  "basic science hand",
  "basic science foot & ankle",
  "basic science shoulder &",
  "recon knee &",
  "recon shoulder &",
  "recon recon",
  "trauma knee &",
  "trauma pediatrics",
  "trauma shoulder &",
  "pediatrics basic",
  "spine knee &",
];

const SHOULDER_ELBOW_TOPIC_HINTS = [
  "rotator cuff",
  "shoulder",
  "elbow",
  "distal biceps",
  "ucl",
  "slap",
  "acromioclavicular",
  "glenohumeral",
  "instability",
  "latarjet",
  "scapula",
  "clavicle",
];

const KNEE_SPORTS_TOPIC_HINTS = [
  "acl",
  "pcl",
  "menisc",
  "mcl",
  "lcl",
  "mpfl",
  "patell",
  "sports",
  "cartilage",
  "fai",
  "labral tear",
  "posterolateral corner",
];

const PEDIATRICS_TOPIC_HINTS = [
  "scfe",
  "slipped capital",
  "perthes",
  "physeal",
  "pediatric",
  "ddh",
  "clubfoot",
  "ponseti",
  "blount",
  "sprengel",
];

const TRAUMA_TOPIC_HINTS = [
  "fracture",
  "dislocation",
  "trauma",
  "open fracture",
  "acetabular",
  "pelvic ring",
  "calcaneus",
  "distal radius",
  "shaft fractures",
];

const TOPIC_GARBLED_PATTERNS = [
  /[|]{2,}/,
  /[?]{2,}/,
  /[A-Za-z]{18,}[A-Z][a-z]{3,}/,
];

const TOPIC_REVIEW_PATTERNS = [
  /\bvisceral blunt trauma\b/i,
  /\btka postoperative rehabilitation and outpatient management reverse shoulder\b/i,
  /\bwear & osteolysis basic science\b/i,
];

const TOPIC_CONCEPT_SEED_WHITELIST = new Set([
  "pediatrics-slipped-capital-femoral-epiphysis-scfe",
  "foot-ankle-lisfranc-injury",
  "foot-ankle-hallux-valgus",
  "trauma-ankle-fractures",
]);

const REVIEWED_TOPIC_OVERRIDE_LOOKUP = new Map<
  string,
  OrthobulletsReviewedTopicOverride
>(
  ORTHOBULLETS_REVIEWED_TOPIC_OVERRIDES.map((override) => [
    `${override.specialtySlug}::${override.topicSlug}`,
    override,
  ])
);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForLookup(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['".]/g, "")
    .replace(/[-/]/g, " ");
}

export function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['".]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function normalizeQuestionId(value: string) {
  return normalizeWhitespace(value).toUpperCase();
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let index = 0;
  let inQuotes = false;

  while (index < text.length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }

    if (char === "\r") {
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function csvEscape(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function chunkItems<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function describeUnknownError(error: unknown) {
  if (error instanceof Error) {
    const ownProps = Object.fromEntries(
      Object.getOwnPropertyNames(error).map((key) => [key, (error as unknown as Record<string, unknown>)[key]])
    );
    return `${error.name}: ${error.message} :: ${inspect(ownProps, { depth: 5 })}`;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return inspect(error, { depth: 5 });
  } catch {
    return String(error);
  }
}

async function postgrestUpsertMinimal(
  restAdmin: RestAdmin,
  table: string,
  payload: unknown,
  onConflict?: string
) {
  const searchParams = new URLSearchParams();

  if (onConflict) {
    searchParams.set("on_conflict", onConflict);
  }

  const response = await fetch(
    `${restAdmin.url}/rest/v1/${table}${searchParams.size > 0 ? `?${searchParams}` : ""}`,
    {
      method: "POST",
      headers: {
        apikey: restAdmin.apiKey,
        Authorization: `Bearer ${restAdmin.apiKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(
      `PostgREST ${table} upsert failed with ${response.status} ${response.statusText}: ${await response.text()}`
    );
  }
}

async function postgrestInsertMinimal(restAdmin: RestAdmin, table: string, payload: unknown) {
  const response = await fetch(`${restAdmin.url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: restAdmin.apiKey,
      Authorization: `Bearer ${restAdmin.apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `PostgREST ${table} insert failed with ${response.status} ${response.statusText}: ${await response.text()}`
    );
  }
}

async function postgrestPatchMinimal(
  restAdmin: RestAdmin,
  table: string,
  payload: JsonRecord,
  filters: Record<string, string>
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    params.set(key, `eq.${value}`);
  }

  const response = await fetch(`${restAdmin.url}/rest/v1/${table}?${params}`, {
    method: "PATCH",
    headers: {
      apikey: restAdmin.apiKey,
      Authorization: `Bearer ${restAdmin.apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `PostgREST ${table} patch failed with ${response.status} ${response.statusText}: ${await response.text()}`
    );
  }
}

function rowsToCsv<T extends Record<string, string>>(rows: T[], header: string[]) {
  const lines = rows.map((row) => header.map((key) => csvEscape(row[key] ?? "")).join(","));
  return [header.join(","), ...lines].join("\n") + "\n";
}

export function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function titleToTagLabel(namespace: string, title: string) {
  const tagBody = normalizeWhitespace(title).replace(/[^A-Za-z0-9]+/g, "_");
  return `${namespace}::${tagBody.replace(/^_+|_+$/g, "")}`;
}

function conceptAliasCandidates(topicTitle: string) {
  const aliases: string[] = [];
  const acronymMatch = topicTitle.match(/\(([A-Z0-9]{2,})\)/);

  if (acronymMatch) {
    aliases.push(acronymMatch[1]);
  }

  return aliases;
}

function normalizeTopicDisplayLabel(value: string) {
  return normalizeWhitespace(value)
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\bthe Hip\b/i, "the Hip")
    .replace(/\bthe Knee\b/i, "the Knee")
    .replace(/\bthe Cervical Spine\b/i, "the Cervical Spine");
}

function isPlausibleQuestionId(value: string) {
  return /^(OBQ|SBQ)[A-Z0-9.-]+$/i.test(value);
}

function sourceRowLooksMerged(specialtyRaw: string, topicRaw: string) {
  const specialtyLookup = normalizeForLookup(specialtyRaw);

  if (SOURCE_SPECIALTY_MERGE_PATTERNS.some((pattern) => specialtyLookup.includes(pattern))) {
    return true;
  }

  if (!topicRaw) {
    return false;
  }

  return false;
}

function topicLooksGarbled(topicRaw: string) {
  if (!topicRaw) {
    return false;
  }

  return TOPIC_GARBLED_PATTERNS.some((pattern) => pattern.test(topicRaw));
}

function pass0ValidateRows(inputPath: string) {
  const rawText = readFileSync(inputPath, "utf8");
  const parsed = parseCsv(rawText);
  const header = parsed[0] ?? [];
  const headerIndex = new Map(header.map((key, index) => [key, index]));
  const validSourceRows: ValidatedSourceRow[] = [];
  const sourceAnomalyRows: SourceAnomalyRow[] = [];
  let malformedRows = 0;

  for (let index = 1; index < parsed.length; index += 1) {
    const values = parsed[index];

    if (values.length === 1 && values[0] === "") {
      continue;
    }

    if (values.length !== header.length) {
      malformedRows += 1;
      continue;
    }

    const row: ValidatedSourceRow = {
      source: values[headerIndex.get("source") ?? -1] ?? "",
      externalQuestionId: normalizeQuestionId(
        values[headerIndex.get("external_question_id") ?? -1] ?? ""
      ),
      specialtyRaw: normalizeWhitespace(values[headerIndex.get("specialty_raw") ?? -1] ?? ""),
      specialtyNormalizedCsv: normalizeWhitespace(
        values[headerIndex.get("specialty_normalized") ?? -1] ?? ""
      ),
      topicRaw: normalizeWhitespace(values[headerIndex.get("topic_raw") ?? -1] ?? ""),
      topicNormalizedCsv: normalizeWhitespace(
        values[headerIndex.get("topic_normalized") ?? -1] ?? ""
      ),
      topicSlugCsv: normalizeWhitespace(values[headerIndex.get("topic_slug") ?? -1] ?? ""),
      needsConceptMappingCsv: normalizeWhitespace(
        values[headerIndex.get("needs_concept_mapping") ?? -1] ?? ""
      ),
      statusCsv: normalizeWhitespace(values[headerIndex.get("status") ?? -1] ?? ""),
      rowNumber: index + 1,
    };

    let reason: SourceAnomalyReason | null = null;
    let reviewReason = "";
    let suggestedAction = "";

    if (!row.externalQuestionId) {
      reason = "missing-question-id";
      reviewReason = "Missing external question ID.";
      suggestedAction = "Repair the source row before importing.";
    } else if (!isPlausibleQuestionId(row.externalQuestionId)) {
      reason = "invalid-question-id";
      reviewReason = "External question ID format is not plausible.";
      suggestedAction = "Review the source row and repair the question ID if needed.";
    } else if (!row.specialtyRaw && !row.specialtyNormalizedCsv) {
      reason = "missing-specialty";
      reviewReason = "Missing specialty value in source CSV.";
      suggestedAction = "Review the row and assign a specialty manually.";
    } else if (!row.topicRaw && !row.topicNormalizedCsv) {
      reason = "missing-topic";
      reviewReason = "Missing topic value in source CSV.";
      suggestedAction = "Review the row and assign a topic manually.";
    } else if (sourceRowLooksMerged(row.specialtyRaw, row.topicRaw)) {
      reason = "merged-specialty-topic";
      reviewReason = "Specialty/topic fields appear merged or truncated.";
      suggestedAction = "Review the raw specialty/topic pair before mapping.";
    } else if (topicLooksGarbled(row.topicRaw || row.topicNormalizedCsv)) {
      reason = "garbled-topic";
      reviewReason = "Topic text appears garbled or malformed.";
      suggestedAction = "Review and repair the source topic label before mapping.";
    }

    if (reason) {
      sourceAnomalyRows.push({
        external_question_id: row.externalQuestionId,
        raw_specialty: row.specialtyRaw,
        normalized_specialty_slug: "",
        normalized_specialty_title: "",
        raw_topic_label: row.topicRaw,
        normalized_topic_label: row.topicNormalizedCsv || row.topicRaw,
        normalized_topic_slug: row.topicSlugCsv || slugify(row.topicNormalizedCsv || row.topicRaw),
        canonical_topic_node_slug: "",
        canonical_topic_node_id: "",
        mapping_confidence: "0.000",
        review_reason: reviewReason,
        suggested_action: suggestedAction,
        review_group_key: `orthobullets::source-anomaly::${reason}::${slugify(
          row.specialtyRaw || "unknown-specialty"
        )}::${slugify(row.topicRaw || row.topicNormalizedCsv || "unknown-topic")}`,
        source_anomaly_reason: reason,
        row_number: String(row.rowNumber),
      });
      continue;
    }

    validSourceRows.push(row);
  }

  return {
    validSourceRows,
    sourceAnomalyRows,
    malformedRows,
  };
}

function topicMatchesHints(topicText: string, hints: string[]) {
  const lookup = normalizeForLookup(topicText);
  return hints.some((hint) => lookup.includes(normalizeForLookup(hint)));
}

function pass1NormalizeSpecialty(row: ValidatedSourceRow): SpecialtyNormalization {
  const candidates = [row.specialtyRaw, row.specialtyNormalizedCsv].filter(Boolean);

  for (const candidateValue of candidates) {
    const normalized = normalizeForLookup(candidateValue);
    const match = CANONICAL_SPECIALTIES.find((specialty) =>
      specialty.aliases.some((alias) => normalizeForLookup(alias) === normalized)
    );

    if (match) {
      return {
        specialtySlug: match.slug,
        specialtyTitle: match.name,
        confidence: candidateValue === match.name ? 0.99 : 0.95,
        method: candidateValue === row.specialtyNormalizedCsv ? "csv-normalized" : "exact",
        needsReview: false,
        reviewReason: "",
      };
    }
  }

  const topicReference = row.topicNormalizedCsv || row.topicRaw;
  const specialtyRawLookup = normalizeForLookup(row.specialtyRaw || row.specialtyNormalizedCsv);

  if (specialtyRawLookup === "sports" && topicMatchesHints(topicReference, KNEE_SPORTS_TOPIC_HINTS)) {
    return {
      specialtySlug: "knee-sports",
      specialtyTitle: "Knee & Sports",
      confidence: 0.86,
      method: "topic-context",
      needsReview: false,
      reviewReason: "",
    };
  }

  if (specialtyRawLookup === "elbow" && topicMatchesHints(topicReference, SHOULDER_ELBOW_TOPIC_HINTS)) {
    return {
      specialtySlug: "shoulder-elbow",
      specialtyTitle: "Shoulder & Elbow",
      confidence: 0.86,
      method: "topic-context",
      needsReview: false,
      reviewReason: "",
    };
  }

  if (topicMatchesHints(topicReference, PEDIATRICS_TOPIC_HINTS)) {
    return {
      specialtySlug: "pediatrics",
      specialtyTitle: "Pediatrics",
      confidence: 0.78,
      method: "topic-context",
      needsReview: false,
      reviewReason: "",
    };
  }

  if (topicMatchesHints(topicReference, KNEE_SPORTS_TOPIC_HINTS)) {
    return {
      specialtySlug: "knee-sports",
      specialtyTitle: "Knee & Sports",
      confidence: 0.76,
      method: "topic-context",
      needsReview: false,
      reviewReason: "",
    };
  }

  if (topicMatchesHints(topicReference, SHOULDER_ELBOW_TOPIC_HINTS)) {
    return {
      specialtySlug: "shoulder-elbow",
      specialtyTitle: "Shoulder & Elbow",
      confidence: 0.76,
      method: "topic-context",
      needsReview: false,
      reviewReason: "",
    };
  }

  if (topicMatchesHints(topicReference, TRAUMA_TOPIC_HINTS)) {
    return {
      specialtySlug: "trauma",
      specialtyTitle: "Trauma",
      confidence: 0.74,
      method: "topic-context",
      needsReview: false,
      reviewReason: "",
    };
  }

  return {
    specialtySlug: null,
    specialtyTitle: null,
    confidence: 0.35,
    method: "unresolved",
    needsReview: true,
    reviewReason: "Specialty could not be normalized confidently.",
  };
}

function pass2NormalizeTopic(row: ValidatedSourceRow): TopicNormalization {
  const rawTopic = row.topicNormalizedCsv || row.topicRaw;
  const topicDisplay = normalizeTopicDisplayLabel(rawTopic);
  const topicSlug = row.topicSlugCsv || slugify(topicDisplay);
  const reviewPatterns = TOPIC_REVIEW_PATTERNS.some((pattern) => pattern.test(topicDisplay));

  return {
    topicDisplay,
    topicSlug,
    confidence: reviewPatterns ? 0.7 : 0.95,
    method: row.topicNormalizedCsv ? "source-normalized" : "raw-cleanup",
    needsReview: reviewPatterns,
    reviewReason: reviewPatterns
      ? "Topic label benefits from a deterministic review pass before auto-accept."
      : "",
  };
}

function buildPotentialDuplicates(
  topicTasks: AggregatedTopicTask[]
): PotentialDuplicateRow[] {
  const rows: PotentialDuplicateRow[] = [];

  for (let index = 0; index < topicTasks.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < topicTasks.length; compareIndex += 1) {
      const left = topicTasks[index];
      const right = topicTasks[compareIndex];

      if (left.normalizedSpecialtySlug === right.normalizedSpecialtySlug) {
        continue;
      }

      const leftTokens = new Set(left.normalizedTopicSlug.split("-").filter(Boolean));
      const rightTokens = new Set(right.normalizedTopicSlug.split("-").filter(Boolean));
      const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
      const unionSize = new Set([...leftTokens, ...rightTokens]).size || 1;
      const overlapScore = overlap.length / unionSize;

      let duplicateReason: DuplicateCandidateReason | null = null;

      if (left.normalizedTopicLabel === right.normalizedTopicLabel) {
        duplicateReason = "same-topic-across-specialties";
      } else if (overlapScore >= 0.75 && overlap.length >= 2) {
        duplicateReason = "high-token-overlap";
      }

      if (!duplicateReason) {
        continue;
      }

      rows.push({
        duplicate_group_key: `orthobullets::duplicates::${left.normalizedTopicSlug}::${right.normalizedTopicSlug}`,
        normalized_topic_label_a: left.normalizedTopicLabel,
        normalized_topic_slug_a: left.normalizedTopicSlug,
        specialty_a: left.normalizedSpecialtyTitle,
        question_count_a: String(left.questionCount),
        normalized_topic_label_b: right.normalizedTopicLabel,
        normalized_topic_slug_b: right.normalizedTopicSlug,
        specialty_b: right.normalizedSpecialtyTitle,
        question_count_b: String(right.questionCount),
        duplicate_reason: duplicateReason,
        token_overlap_score: overlapScore.toFixed(3),
      });
    }
  }

  return rows.sort((left, right) => Number(right.token_overlap_score) - Number(left.token_overlap_score));
}

function passes3to5ResolveRows(validRows: ValidatedSourceRow[]) {
  const topicFrequency = new Map<string, number>();
  const interimRows = validRows.map((row) => {
    const specialty = pass1NormalizeSpecialty(row);
    const topic = pass2NormalizeTopic(row);
    const key = `${specialty.specialtySlug ?? "unknown"}::${topic.topicSlug}`;
    topicFrequency.set(key, (topicFrequency.get(key) ?? 0) + 1);
    return { row, specialty, topic, key };
  });

  const resolvedRows: RowResolution[] = [];

  for (const item of interimRows) {
    const { row, specialty, topic, key } = item;
    const frequency = topicFrequency.get(key) ?? 1;
    const canonicalTopicNodeSlug =
      specialty.specialtySlug && topic.topicSlug
        ? `${specialty.specialtySlug}-${topic.topicSlug}`
        : "";
    const reviewedOverride =
      specialty.specialtySlug && topic.topicSlug
        ? REVIEWED_TOPIC_OVERRIDE_LOOKUP.get(`${specialty.specialtySlug}::${topic.topicSlug}`)
        : undefined;
    const topicReviewNeeded = topic.needsReview;
    const shouldCreateTopicConcept = false;

    let reviewKind: ReviewKind = "accepted";
    let allowTopicNodeCreation = true;
    let reviewReason = "";
    let suggestedAction = "Auto-accept topic mapping.";
    let mappingMethod: MappingMethod = "import_rule";
    let reviewOverrideReason = "";
    let score = 0;
    const scoreComponents: JsonRecord = {};

    score += 0.2;
    scoreComponents.validQuestionId = 0.2;

    if (specialty.specialtySlug) {
      const specialtyScore =
        specialty.method === "exact" || specialty.method === "csv-normalized"
          ? 0.25
          : specialty.method === "topic-context"
            ? 0.18
            : 0;
      score += specialtyScore;
      scoreComponents.specialtyNormalization = specialtyScore;
    } else {
      scoreComponents.specialtyNormalization = 0;
    }

    const topicBaseScore = topic.confidence >= 0.9 ? 0.22 : 0.14;
    score += topicBaseScore;
    scoreComponents.topicNormalization = topicBaseScore;

    const slugScore = topic.topicSlug ? 0.12 : 0;
    score += slugScore;
    scoreComponents.slugStability = slugScore;

    const frequencyScore = Math.min(0.12, Math.log2(frequency + 1) / 10);
    score += frequencyScore;
    scoreComponents.frequencySupport = Number(frequencyScore.toFixed(3));

    const clinicallyPlausible =
      /[A-Za-z]/.test(topic.topicDisplay) &&
      topic.topicDisplay.length >= 3 &&
      !topicLooksGarbled(topic.topicDisplay);
    const plausibilityScore = clinicallyPlausible ? 0.09 : 0;
    score += plausibilityScore;
    scoreComponents.medicalPlausibility = plausibilityScore;

    if (!specialty.specialtySlug) {
      reviewKind = "source_anomaly";
      allowTopicNodeCreation = false;
      reviewReason = specialty.reviewReason;
      suggestedAction = "Review specialty mapping manually.";
      score = Math.min(score, 0.59);
    } else if (reviewedOverride?.decision === "accept") {
      reviewKind = "accepted";
      allowTopicNodeCreation = true;
      reviewReason = "";
      suggestedAction = "Accepted via manual review override.";
      mappingMethod = "reviewed";
      reviewOverrideReason = reviewedOverride.reviewReason;
      score = Math.max(score, 0.97);
      scoreComponents.reviewOverride = reviewedOverride.reviewReason;
    } else if (topicReviewNeeded) {
      reviewKind = "topic_review";
      allowTopicNodeCreation = true;
      reviewReason = topic.reviewReason || "Topic label still needs deterministic cleanup.";
      suggestedAction = "Run a topic-label review before auto-accepting the curriculum node.";
      score = Math.min(score, 0.74);
    } else if (score >= 0.9) {
      reviewKind = "accepted";
      allowTopicNodeCreation = true;
      reviewReason = "";
      suggestedAction = "Auto-accept topic mapping.";
    } else if (score >= 0.75) {
      if (frequency >= 2) {
        reviewKind = "accepted";
        allowTopicNodeCreation = true;
        reviewReason = "";
        suggestedAction = "Auto-accept after deterministic improvement pass.";
      } else {
        reviewKind = "topic_review";
        allowTopicNodeCreation = true;
        reviewReason =
          "Mapping is plausible but low-frequency, so it remains in topic review.";
        suggestedAction = "Review this low-frequency topic before accepting.";
      }
    } else if (score >= 0.6) {
      reviewKind = "topic_review";
      allowTopicNodeCreation = true;
      reviewReason =
        "Mapping remained medium-confidence after deterministic improvement pass.";
      suggestedAction = "Review this topic mapping manually.";
    } else {
      reviewKind = "topic_review";
      allowTopicNodeCreation = true;
      reviewReason = "Mapping confidence is too low for auto-accept.";
      suggestedAction = "Review this topic mapping manually.";
    }

    const reviewGroupKey = `orthobullets::${specialty.specialtySlug ?? "unknown"}::${
      topic.topicSlug
    }::${reviewKind}`;

    resolvedRows.push({
      row,
      specialty,
      topic,
      reviewKind,
      mappingConfidence: Number(Math.min(1, Math.max(0, score)).toFixed(3)),
      mappingConfidenceRounded: Math.min(1, Math.max(0, score)).toFixed(3),
      mappingReviewReason: reviewReason,
      suggestedAction,
      mappingMethod,
      reviewOverrideReason,
      reviewGroupKey,
      canonicalTopicNodeSlug,
      allowTopicNodeCreation,
      shouldCreateTopicConcept,
      qualityScoreComponents: {
        ...scoreComponents,
        frequency,
        specialtyMethod: specialty.method,
        topicMethod: topic.method,
      },
    });
  }

  return {
    resolvedRows,
    topicFrequency,
  };
}

function aggregateResolvedRows(
  resolvedRows: RowResolution[],
  sourceAnomaliesFromPass0: SourceAnomalyRow[]
) {
  const rowAuditRows: MappingReviewRow[] = [];
  const sourceAnomalyRows = [...sourceAnomaliesFromPass0];
  const taskMap = new Map<string, AggregatedTopicTask>();
  const sourceAnomalyCounts = new Map<string, number>();
  const manualReviewReasonCounts = new Map<string, number>();

  for (const anomaly of sourceAnomalyRows) {
    sourceAnomalyCounts.set(
      anomaly.review_reason,
      (sourceAnomalyCounts.get(anomaly.review_reason) ?? 0) + 1
    );
  }

  for (const resolved of resolvedRows) {
    const { row, specialty, topic } = resolved;

    rowAuditRows.push({
      external_question_id: row.externalQuestionId,
      specialty_raw: row.specialtyRaw,
      normalized_specialty_slug: specialty.specialtySlug ?? "",
      normalized_specialty_title: specialty.specialtyTitle ?? "",
      topic_raw: row.topicRaw || row.topicNormalizedCsv,
      normalized_topic_label: topic.topicDisplay,
      normalized_topic_slug: topic.topicSlug,
      mapped_specialty_slug: specialty.specialtySlug ?? "",
      mapped_curriculum_node_slug: resolved.allowTopicNodeCreation
        ? resolved.canonicalTopicNodeSlug
        : "",
      canonical_topic_node_id: "",
      mapping_confidence: resolved.mappingConfidenceRounded,
      needs_review: resolved.reviewKind === "accepted" ? "FALSE" : "TRUE",
      review_reason: resolved.mappingReviewReason,
      suggested_action: resolved.suggestedAction,
      mapping_method: resolved.mappingMethod,
      review_override_reason: resolved.reviewOverrideReason,
      review_group_key: resolved.reviewGroupKey,
      row_number: String(row.rowNumber),
    });

    if (resolved.reviewKind === "source_anomaly") {
      const anomalyReason =
        specialty.reviewReason === "Specialty could not be normalized confidently."
          ? "merged-specialty-topic"
          : "missing-specialty";

      sourceAnomalyRows.push({
        external_question_id: row.externalQuestionId,
        raw_specialty: row.specialtyRaw,
        normalized_specialty_slug: specialty.specialtySlug ?? "",
        normalized_specialty_title: specialty.specialtyTitle ?? "",
        raw_topic_label: row.topicRaw || row.topicNormalizedCsv,
        normalized_topic_label: topic.topicDisplay,
        normalized_topic_slug: topic.topicSlug,
        canonical_topic_node_slug: "",
        canonical_topic_node_id: "",
        mapping_confidence: resolved.mappingConfidenceRounded,
        review_reason: resolved.mappingReviewReason,
        suggested_action: resolved.suggestedAction,
        review_group_key: resolved.reviewGroupKey,
        source_anomaly_reason: anomalyReason as SourceAnomalyReason,
        row_number: String(row.rowNumber),
      });

      sourceAnomalyCounts.set(
        resolved.mappingReviewReason,
        (sourceAnomalyCounts.get(resolved.mappingReviewReason) ?? 0) + 1
      );
      continue;
    }

    if (resolved.reviewKind !== "accepted") {
      manualReviewReasonCounts.set(
        resolved.mappingReviewReason,
        (manualReviewReasonCounts.get(resolved.mappingReviewReason) ?? 0) + 1
      );
    }

    if (!specialty.specialtySlug || !specialty.specialtyTitle) {
      continue;
    }

    const key = `${specialty.specialtySlug}::${topic.topicSlug}::${resolved.reviewKind}`;
    const existing = taskMap.get(key);

    if (!existing) {
      taskMap.set(key, {
        reviewGroupKey: resolved.reviewGroupKey,
        rawSpecialtyLabels: new Set(row.specialtyRaw ? [row.specialtyRaw] : []),
        normalizedSpecialtySlug: specialty.specialtySlug,
        normalizedSpecialtyTitle: specialty.specialtyTitle,
        rawTopicLabels: new Set((row.topicRaw || row.topicNormalizedCsv) ? [row.topicRaw || row.topicNormalizedCsv] : []),
        normalizedTopicLabel: topic.topicDisplay,
        normalizedTopicSlug: topic.topicSlug,
        canonicalTopicNodeSlug: resolved.allowTopicNodeCreation
          ? resolved.canonicalTopicNodeSlug
          : "",
        reviewReason: resolved.mappingReviewReason,
        suggestedAction: resolved.suggestedAction,
        mappingMethod: resolved.mappingMethod,
        reviewOverrideReason: resolved.reviewOverrideReason,
        reviewKind: resolved.reviewKind,
        questionIds: [row.externalQuestionId],
        questionCount: 1,
        mappingConfidence: resolved.mappingConfidence,
        qualityNotes: new Set([
          `specialty:${specialty.method}`,
          `topic:${topic.method}`,
          ...(resolved.reviewOverrideReason ? [`override:${resolved.reviewOverrideReason}`] : []),
        ]),
      });
      continue;
    }

    if (row.specialtyRaw) {
      existing.rawSpecialtyLabels.add(row.specialtyRaw);
    }

    if (row.topicRaw || row.topicNormalizedCsv) {
      existing.rawTopicLabels.add(row.topicRaw || row.topicNormalizedCsv);
    }

    existing.questionIds.push(row.externalQuestionId);
    existing.questionCount += 1;
  }

  const topicReviewRows: TopicReviewTaskRow[] = [];
  const conceptTaskRows: ConceptMappingTaskRow[] = [];

  const aggregatedTasks = [...taskMap.values()].sort(
    (left, right) =>
      right.questionCount - left.questionCount ||
      left.normalizedSpecialtyTitle.localeCompare(right.normalizedSpecialtyTitle) ||
      left.normalizedTopicLabel.localeCompare(right.normalizedTopicLabel)
  );

  for (const task of aggregatedTasks) {
    const baseRow: TopicReviewTaskRow = {
      review_group_key: task.reviewGroupKey,
      raw_specialty_labels: [...task.rawSpecialtyLabels].sort().join(" | "),
      normalized_specialty_slug: task.normalizedSpecialtySlug,
      normalized_specialty_title: task.normalizedSpecialtyTitle,
      raw_topic_labels: [...task.rawTopicLabels].sort().join(" | "),
      normalized_topic_label: task.normalizedTopicLabel,
      normalized_topic_slug: task.normalizedTopicSlug,
      canonical_topic_node_slug: task.canonicalTopicNodeSlug,
      canonical_topic_node_id: "",
      question_count: String(task.questionCount),
      mapping_confidence: task.mappingConfidence.toFixed(3),
      review_reason: task.reviewReason,
      suggested_action: task.suggestedAction,
      mapping_method: task.mappingMethod,
      review_override_reason: task.reviewOverrideReason,
      representative_question_ids: task.questionIds.slice(0, 10).join(" | "),
      quality_notes: [...task.qualityNotes].sort().join(" | "),
    };

    if (task.reviewKind === "topic_review") {
      topicReviewRows.push(baseRow);
    } else {
      conceptTaskRows.push({
        ...baseRow,
        is_high_frequency_topic: task.questionCount >= 20 ? "TRUE" : "FALSE",
      });
    }
  }

  return {
    rowAuditRows,
    topicReviewRows,
    conceptTaskRows,
    sourceAnomalyRows,
    potentialDuplicateRows: buildPotentialDuplicates(aggregatedTasks),
    sourceAnomalyCounts,
    manualReviewReasonCounts,
    aggregatedTasks,
  };
}

function computeSummary(params: {
  inputPath: string;
  validSourceRows: ValidatedSourceRow[];
  malformedRows: number;
  rowAuditRows: MappingReviewRow[];
  topicReviewRows: TopicReviewTaskRow[];
  conceptTaskRows: ConceptMappingTaskRow[];
  sourceAnomalyRows: SourceAnomalyRow[];
  potentialDuplicateRows: PotentialDuplicateRow[];
  sourceAnomalyCounts: Map<string, number>;
  manualReviewReasonCounts: Map<string, number>;
}) {
  const {
    inputPath,
    validSourceRows,
    malformedRows,
    rowAuditRows,
    topicReviewRows,
    conceptTaskRows,
    sourceAnomalyRows,
    potentialDuplicateRows,
    sourceAnomalyCounts,
    manualReviewReasonCounts,
  } = params;

  const uniqueQuestionIds = new Set(
    [
      ...rowAuditRows.map((row) => row.external_question_id),
      ...sourceAnomalyRows.map((row) => row.external_question_id),
    ].filter(Boolean)
  );
  const uniqueReviewedRowNumbers = new Set([
    ...rowAuditRows.map((row) => row.row_number),
    ...sourceAnomalyRows.map((row) => row.row_number),
  ]);
  const duplicateQuestions = uniqueReviewedRowNumbers.size - uniqueQuestionIds.size;
  const uniqueRawSpecialties = new Set(
    validSourceRows.map((row) => row.specialtyRaw || row.specialtyNormalizedCsv).filter(Boolean)
  );
  const uniqueRawTopics = new Set(
    validSourceRows.map((row) => row.topicRaw || row.topicNormalizedCsv).filter(Boolean)
  );
  const normalizedSpecialties = new Set(
    rowAuditRows.map((row) => row.normalized_specialty_slug).filter(Boolean)
  );
  const acceptedRows = rowAuditRows.filter((row) => row.needs_review === "FALSE");
  const acceptedTopicPairs = new Set(
    acceptedRows.map(
      (row) => `${row.normalized_specialty_slug}::${row.normalized_topic_slug}`
    )
  );
  const unresolvedSpecialtyMappings = rowAuditRows.filter(
    (row) => !row.normalized_specialty_slug
  ).length;
  const highFrequencyNeedsConceptMappingTopics = conceptTaskRows
    .slice()
    .sort((left, right) => Number(right.question_count) - Number(left.question_count))
    .slice(0, 15)
    .map((row) => ({
      specialty: row.normalized_specialty_title,
      topic: row.normalized_topic_label,
      count: Number(row.question_count),
    }));
  const topHighFrequencyAcceptedTopics = acceptedRows
    .reduce<Map<string, { specialty: string; topic: string; count: number }>>((map, row) => {
      const key = `${row.normalized_specialty_slug}::${row.normalized_topic_slug}`;
      const existing = map.get(key);
      map.set(key, {
        specialty: row.normalized_specialty_title,
        topic: row.normalized_topic_label,
        count: (existing?.count ?? 0) + 1,
      });
      return map;
    }, new Map())
    .values();

  return {
    inputPath,
    rowCount: uniqueReviewedRowNumbers.size + malformedRows,
    uniqueExternalQuestions: uniqueQuestionIds.size,
    duplicateQuestions,
    malformedRows,
    sourceAnomalies: sourceAnomalyRows.length,
    uniqueRawSpecialties: uniqueRawSpecialties.size,
    normalizedSpecialties: [...normalizedSpecialties].sort(),
    unresolvedSpecialtyMappings,
    uniqueRawTopics: uniqueRawTopics.size,
    uniqueNormalizedSpecialtyTopicPairs: new Set(
      rowAuditRows
        .filter((row) => row.normalized_specialty_slug && row.normalized_topic_slug)
        .map((row) => `${row.normalized_specialty_slug}::${row.normalized_topic_slug}`)
    ).size,
    acceptedCurriculumNodes: acceptedTopicPairs.size,
    newDraftCurriculumNodes: [...acceptedTopicPairs].filter(
      (slug) => !PHASE1_SEEDED_TOPIC_SLUGS.has(slug.split("::").join("-"))
    ).length,
    existingMatchedCurriculumNodes: [...acceptedTopicPairs].filter((slug) =>
      PHASE1_SEEDED_TOPIC_SLUGS.has(slug.split("::").join("-"))
    ).length,
    topicMappingsRequiringReview: topicReviewRows.length,
    potentialDuplicates: potentialDuplicateRows.length,
    autoCreatedTopicConcepts: 0,
    conceptMappingTasks: conceptTaskRows.length,
    highFrequencyNeedsConceptMappingTopics,
    autoAcceptCount: acceptedRows.length,
    manualReviewCount: topicReviewRows.length + sourceAnomalyRows.length,
    autoAcceptPercent:
      rowAuditRows.length === 0
        ? 0
        : Number(((acceptedRows.length / rowAuditRows.length) * 100).toFixed(1)),
    topManualReviewReasons: [...manualReviewReasonCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count })),
    topSourceAnomalies: [...sourceAnomalyCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count })),
    topHighFrequencyAcceptedTopics: [...topHighFrequencyAcceptedTopics]
      .sort((left, right) => right.count - left.count)
      .slice(0, 50),
    topBlockedTopicExamples: topicReviewRows
      .slice()
      .sort((left, right) => Number(right.question_count) - Number(left.question_count))
      .slice(0, 25)
      .map((row) => ({
        specialty: row.normalized_specialty_title,
        topic: row.normalized_topic_label,
        count: Number(row.question_count),
        reason: row.review_reason,
      })),
  } satisfies ImportSummary;
}

export function buildImportArtifacts(inputPath: string, seedTopicConcepts = false): ImportArtifacts {
  const { validSourceRows, sourceAnomalyRows: pass0Anomalies, malformedRows } =
    pass0ValidateRows(inputPath);
  const { resolvedRows } = passes3to5ResolveRows(validSourceRows);
  const aggregated = aggregateResolvedRows(resolvedRows, pass0Anomalies);
  const summary = computeSummary({
    inputPath,
    validSourceRows,
    malformedRows,
    rowAuditRows: aggregated.rowAuditRows,
    topicReviewRows: aggregated.topicReviewRows,
    conceptTaskRows: aggregated.conceptTaskRows,
    sourceAnomalyRows: aggregated.sourceAnomalyRows,
    potentialDuplicateRows: aggregated.potentialDuplicateRows,
    sourceAnomalyCounts: aggregated.sourceAnomalyCounts,
    manualReviewReasonCounts: aggregated.manualReviewReasonCounts,
  });

  void seedTopicConcepts;

  return {
    rowAuditRows: aggregated.rowAuditRows,
    topicReviewRows: aggregated.topicReviewRows,
    conceptTaskRows: aggregated.conceptTaskRows,
    sourceAnomalyRows: aggregated.sourceAnomalyRows,
    potentialDuplicateRows: aggregated.potentialDuplicateRows,
    summary,
  };
}

function markdownTable(
  rows: Array<Record<string, string | number>>,
  columns: Array<{ key: string; label: string }>
) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(row[column.key] ?? "")).join(" | ")} |`
  );
  return [header, divider, ...body].join("\n");
}

export function summaryToMarkdown(summary: ImportSummary) {
  return [
    "# Orthobullets Import Summary",
    "",
    "## Source Rows",
    "",
    `- Total rows: ${summary.rowCount}`,
    `- Unique external question IDs: ${summary.uniqueExternalQuestions}`,
    `- Duplicate question IDs: ${summary.duplicateQuestions}`,
    `- Source anomalies: ${summary.sourceAnomalies}`,
    `- Malformed rows skipped during CSV parse: ${summary.malformedRows}`,
    "",
    "## Specialties",
    "",
    `- Unique raw specialties: ${summary.uniqueRawSpecialties}`,
    `- Normalized specialties: ${summary.normalizedSpecialties.join(", ")}`,
    `- Unresolved specialty mappings: ${summary.unresolvedSpecialtyMappings}`,
    "",
    "## Topics",
    "",
    `- Unique raw topics: ${summary.uniqueRawTopics}`,
    `- Unique normalized specialty/topic pairs: ${summary.uniqueNormalizedSpecialtyTopicPairs}`,
    `- Accepted curriculum nodes: ${summary.acceptedCurriculumNodes}`,
    `- New draft curriculum nodes: ${summary.newDraftCurriculumNodes}`,
    `- Existing matched curriculum nodes: ${summary.existingMatchedCurriculumNodes}`,
    `- Topic mappings requiring review: ${summary.topicMappingsRequiringReview}`,
    `- Potential duplicates: ${summary.potentialDuplicates}`,
    "",
    "## Concepts",
    "",
    `- Auto-created topic concepts: ${summary.autoCreatedTopicConcepts}`,
    `- Concept mapping tasks: ${summary.conceptMappingTasks}`,
    "",
    "## Quality",
    "",
    `- Auto-accept count: ${summary.autoAcceptCount}`,
    `- Manual-review count: ${summary.manualReviewCount}`,
    `- Percent auto-accepted: ${summary.autoAcceptPercent}%`,
    "",
    "## Top Manual Review Reasons",
    "",
    markdownTable(summary.topManualReviewReasons, [
      { key: "reason", label: "Reason" },
      { key: "count", label: "Count" },
    ]),
    "",
    "## Top Source Anomalies",
    "",
    markdownTable(summary.topSourceAnomalies, [
      { key: "reason", label: "Reason" },
      { key: "count", label: "Count" },
    ]),
    "",
    "## Top High-Frequency Accepted Topics",
    "",
    markdownTable(summary.topHighFrequencyAcceptedTopics, [
      { key: "specialty", label: "Specialty" },
      { key: "topic", label: "Topic" },
      { key: "count", label: "Count" },
    ]),
    "",
    "## Top High-Frequency NeedsConceptMapping Topics",
    "",
    markdownTable(summary.highFrequencyNeedsConceptMappingTopics, [
      { key: "specialty", label: "Specialty" },
      { key: "topic", label: "Topic" },
      { key: "count", label: "Count" },
    ]),
    "",
    "## Top Blocked Topic Examples",
    "",
    markdownTable(summary.topBlockedTopicExamples, [
      { key: "specialty", label: "Specialty" },
      { key: "topic", label: "Topic" },
      { key: "count", label: "Count" },
      { key: "reason", label: "Reason" },
    ]),
    "",
  ].join("\n");
}

type EnsureIds = {
  sourceId: string;
  specialtyIds: Map<string, string>;
  specialtyNodeIds: Map<string, string>;
  topicNodeIds: Map<string, string>;
  conceptIds: Map<string, string>;
  tagIds: Map<string, string>;
};

async function getOrCreateTag(
  supabase: DatabaseLike,
  cache: Map<string, string>,
  namespace: string,
  slug: string,
  label: string,
  description: string
) {
  const cacheKey = `${namespace}::${slug}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const { error: upsertError } = await supabase.from("tags").upsert(
    {
      namespace,
      slug,
      label,
      description,
      comments: "Imported or reused by the Orthobullets Phase 2 importer.",
      is_active: true,
    },
    { onConflict: "namespace,slug" }
  );

  if (upsertError) {
    throw upsertError;
  }

  const { data, error } = await supabase
    .from("tags")
    .select("id")
    .eq("namespace", namespace)
    .eq("slug", slug)
    .single();

  if (error) {
    throw error;
  }

  const tagId = String(data.id);
  cache.set(cacheKey, tagId);
  return tagId;
}

async function ensureSourceAndTags(supabase: DatabaseLike): Promise<EnsureIds> {
  const { error: sourceUpsertError } = await supabase.from("external_sources").upsert(
    {
      slug: "orthobullets",
      name: "Orthobullets",
      source_type: "qbank",
      description: "Orthobullets public question metadata import.",
      comments: "Metadata only. Never stores protected question text.",
      is_active: true,
    },
    { onConflict: "slug" }
  );

  if (sourceUpsertError) {
    throw sourceUpsertError;
  }

  const { data: sourceRow, error: sourceError } = await supabase
    .from("external_sources")
    .select("id")
    .eq("slug", "orthobullets")
    .single();

  if (sourceError) {
    throw sourceError;
  }

  const tagIds = new Map<string, string>();
  await getOrCreateTag(
    supabase,
    tagIds,
    "Source",
    "orthobullets",
    "Source::Orthobullets",
    "Imported from Orthobullets metadata."
  );
  await getOrCreateTag(
    supabase,
    tagIds,
    "Status",
    "imported",
    "Status::Imported",
    "Imported into the SnapOrtho knowledge graph."
  );
  await getOrCreateTag(
    supabase,
    tagIds,
    "Status",
    "source_derived",
    "Status::SourceDerived",
    "Draft ontology content derived from an external source."
  );
  await getOrCreateTag(
    supabase,
    tagIds,
    "Status",
    "needs_concept_mapping",
    "Status::NeedsConceptMapping",
    "Topic-level mapping exists, but concept-level enrichment is still needed."
  );

  return {
    sourceId: String(sourceRow.id),
    specialtyIds: new Map(),
    specialtyNodeIds: new Map(),
    topicNodeIds: new Map(),
    conceptIds: new Map(),
    tagIds,
  };
}

async function ensureTopicConceptSeed(
  supabase: DatabaseLike,
  ensureIds: EnsureIds,
  topicNodeId: string,
  curriculumNodeSlug: string,
  topicTitle: string
) {
  if (!TOPIC_CONCEPT_SEED_WHITELIST.has(curriculumNodeSlug)) {
    return null;
  }

  if (ensureIds.conceptIds.has(curriculumNodeSlug)) {
    return ensureIds.conceptIds.get(curriculumNodeSlug)!;
  }

  const { error: conceptUpsertError } = await supabase.from("concepts").upsert(
    {
      slug: curriculumNodeSlug,
      curriculum_node_id: topicNodeId,
      primary_learning_objective_id: null,
      canonical_name: topicTitle,
      concept_type: "terminology",
      description: `Topic-level concept seed imported from Orthobullets metadata for ${topicTitle}.`,
      comments: "Conservative topic-level concept seed created during Phase 2 import.",
      is_active: true,
    },
    { onConflict: "slug" }
  );

  if (conceptUpsertError) {
    throw conceptUpsertError;
  }

  const { data: conceptRow, error: conceptError } = await supabase
    .from("concepts")
    .select("id")
    .eq("slug", curriculumNodeSlug)
    .single();

  if (conceptError) {
    throw conceptError;
  }

  const conceptId = String(conceptRow.id);
  ensureIds.conceptIds.set(curriculumNodeSlug, conceptId);

  for (const alias of conceptAliasCandidates(topicTitle)) {
    await supabase.from("concept_aliases").upsert(
      {
        concept_id: conceptId,
        alias_name: alias,
        alias_type: "abbreviation",
        is_preferred: false,
        comments: "Derived from a parenthetical acronym in the imported topic name.",
        is_active: true,
      },
      { onConflict: "concept_id,alias_name" }
    );
  }

  return conceptId;
}

export async function applyOrthobulletsImport(
  inputPath: string,
  options: ApplyOptions
) {
  const artifacts = buildImportArtifacts(inputPath, options.seedTopicConcepts);

  if (options.dryRun) {
    return artifacts;
  }

  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createDatabaseClient(url, key);
  const restAdmin: RestAdmin = {
    url,
    apiKey: key,
  };

  let ensureIds: EnsureIds;

  try {
    ensureIds = await ensureSourceAndTags(supabase);
  } catch (error) {
    throw new Error(`Failed ensuring Orthobullets source/tags: ${describeUnknownError(error)}`);
  }

  let newSpecialtyCount = 0;
  let newSpecialtyNodeCount = 0;
  let newTopicNodeCount = 0;
  let existingSpecialtyNodeCount = 0;
  let existingTopicNodeCount = 0;
  let autoCreatedTopicConcepts = 0;
  type ApplyImportRow = {
    externalQuestionId: string;
    specialtyRaw: string;
    normalizedSpecialtySlug: string;
    normalizedSpecialtyTitle: string;
    topicRaw: string;
    normalizedTopicLabel: string;
    normalizedTopicSlug: string;
    mappedCurriculumNodeSlug: string;
    mappingConfidence: number;
    needsReview: boolean;
    reviewReason: string;
    suggestedAction: string;
    reviewGroupKey: string;
    mappingMethod: MappingMethod;
    reviewOverrideReason: string;
  };

  type AcceptedTopicSetup = {
    specialtyId: string;
    topicNodeId: string;
    specialtyTagId: string;
    topicTagId: string;
    conceptId: string | null;
  };

  const sourceTagId = ensureIds.tagIds.get("Source::orthobullets")!;
  const importedTagId = ensureIds.tagIds.get("Status::imported")!;
  const needsConceptMappingTagId = ensureIds.tagIds.get("Status::needs_concept_mapping")!;
  const sourceDerivedTagId = ensureIds.tagIds.get("Status::source_derived")!;

  const importRows: ApplyImportRow[] = [
    ...artifacts.rowAuditRows.map((row) => ({
      externalQuestionId: row.external_question_id,
      specialtyRaw: row.specialty_raw,
      normalizedSpecialtySlug: row.normalized_specialty_slug,
      normalizedSpecialtyTitle: row.normalized_specialty_title,
      topicRaw: row.topic_raw,
      normalizedTopicLabel: row.normalized_topic_label,
      normalizedTopicSlug: row.normalized_topic_slug,
      mappedCurriculumNodeSlug: row.mapped_curriculum_node_slug,
      mappingConfidence: Number(row.mapping_confidence),
      needsReview: row.needs_review === "TRUE",
      reviewReason: row.review_reason,
      suggestedAction: row.suggested_action,
      reviewGroupKey: row.review_group_key,
      mappingMethod: row.mapping_method as MappingMethod,
      reviewOverrideReason: row.review_override_reason,
    })),
    ...artifacts.sourceAnomalyRows
      .filter((row) => Boolean(row.external_question_id))
      .map((row) => ({
        externalQuestionId: row.external_question_id,
        specialtyRaw: row.raw_specialty,
        normalizedSpecialtySlug: row.normalized_specialty_slug,
        normalizedSpecialtyTitle: row.normalized_specialty_title,
        topicRaw: row.raw_topic_label,
        normalizedTopicLabel: row.normalized_topic_label,
        normalizedTopicSlug: row.normalized_topic_slug,
        mappedCurriculumNodeSlug: row.canonical_topic_node_slug,
        mappingConfidence: Number(row.mapping_confidence),
        needsReview: true,
        reviewReason: row.review_reason,
        suggestedAction: row.suggested_action,
        reviewGroupKey: row.review_group_key,
        mappingMethod: "import_rule" as MappingMethod,
        reviewOverrideReason: "",
      })),
  ];

  const acceptedTopicSetupBySlug = new Map<string, AcceptedTopicSetup>();
  const acceptedRows = importRows.filter(
    (row) =>
      !row.needsReview &&
      row.normalizedSpecialtySlug &&
      row.normalizedSpecialtyTitle &&
      row.mappedCurriculumNodeSlug
  );
  const uniqueAcceptedRows = [...new Map(acceptedRows.map((row) => [row.mappedCurriculumNodeSlug, row])).values()];
  const uniqueSpecialties = [
    ...new Map(
      uniqueAcceptedRows.map((row) => [row.normalizedSpecialtySlug, row.normalizedSpecialtyTitle])
    ).entries(),
  ].map(([slug, title]) => ({ slug, title }));
  const specialtySlugs = uniqueSpecialties.map((item) => item.slug);
  const topicSlugs = uniqueAcceptedRows.map((row) => row.mappedCurriculumNodeSlug);
  console.error(
    `[orthobullets] precreating ${uniqueSpecialties.length} specialties and ${uniqueAcceptedRows.length} accepted topic nodes`
  );

  const { data: existingSpecialtyRows } = await supabase
    .from("specialties")
    .select("id, slug")
    .in("slug", specialtySlugs);
  newSpecialtyCount = uniqueSpecialties.length - (existingSpecialtyRows?.length ?? 0);

  await postgrestUpsertMinimal(
    restAdmin,
    "specialties",
    uniqueSpecialties.map((item) => ({
      slug: item.slug,
      name: item.title,
      description: `Canonical ${item.title} specialty for the educational ontology.`,
      comments: "Created or refreshed by the Orthobullets Phase 2 importer.",
      is_active: true,
    })),
    "slug"
  );

  const { data: specialtyRows, error: specialtyRowsError } = await supabase
    .from("specialties")
    .select("id, slug")
    .in("slug", specialtySlugs);

  if (specialtyRowsError) {
    throw new Error(`Failed loading specialties after upsert: ${describeUnknownError(specialtyRowsError)}`);
  }

  const specialtyIdBySlug = new Map((specialtyRows ?? []).map((row) => [row.slug, row.id]));

  const { data: existingSpecialtyNodeRows } = await supabase
    .from("curriculum_nodes")
    .select("id, slug")
    .in("slug", specialtySlugs);
  existingSpecialtyNodeCount = existingSpecialtyNodeRows?.length ?? 0;
  newSpecialtyNodeCount = specialtySlugs.length - existingSpecialtyNodeCount;

  await postgrestUpsertMinimal(
    restAdmin,
    "curriculum_nodes",
    uniqueSpecialties.map((item) => ({
      slug: item.slug,
      specialty_id: specialtyIdBySlug.get(item.slug),
      parent_id: null,
      node_type: "specialty",
      title: item.title,
      short_label: item.title,
      description: `Canonical ${item.title} specialty root.`,
      comments: "Created or refreshed by the Orthobullets Phase 2 importer.",
      sort_order: 0,
      is_active: true,
    })),
    "slug"
  );

  const { data: specialtyNodeRows, error: specialtyNodeRowsError } = await supabase
    .from("curriculum_nodes")
    .select("id, slug")
    .in("slug", specialtySlugs);

  if (specialtyNodeRowsError) {
    throw new Error(
      `Failed loading specialty curriculum_nodes after upsert: ${describeUnknownError(specialtyNodeRowsError)}`
    );
  }

  const specialtyNodeIdBySlug = new Map((specialtyNodeRows ?? []).map((row) => [row.slug, row.id]));

  const existingTopicNodeRows: Array<{ id: string; slug: string }> = [];
  for (const topicSlugChunk of chunkItems(topicSlugs, 200)) {
    const { data } = await supabase.from("curriculum_nodes").select("id, slug").in("slug", topicSlugChunk);
    existingTopicNodeRows.push(...(data ?? []));
  }
  existingTopicNodeCount = existingTopicNodeRows.length;
  newTopicNodeCount = topicSlugs.length - existingTopicNodeCount;

  await postgrestUpsertMinimal(
    restAdmin,
    "curriculum_nodes",
    uniqueAcceptedRows.map((row) => ({
      slug: row.mappedCurriculumNodeSlug,
      specialty_id: specialtyIdBySlug.get(row.normalizedSpecialtySlug),
      parent_id: specialtyNodeIdBySlug.get(row.normalizedSpecialtySlug),
      node_type: "topic",
      title: row.normalizedTopicLabel,
      short_label: row.normalizedTopicLabel,
      description: `Imported draft topic from Orthobullets metadata: ${row.normalizedTopicLabel}.`,
      comments: "Draft topic imported from Orthobullets metadata in Phase 2.",
      sort_order: 100,
      is_active: true,
    })),
    "slug"
  );

  const topicNodeRows: Array<{ id: string; slug: string }> = [];
  for (const topicSlugChunk of chunkItems(topicSlugs, 200)) {
    const { data, error } = await supabase
      .from("curriculum_nodes")
      .select("id, slug")
      .in("slug", topicSlugChunk);

    if (error) {
      throw new Error(`Failed loading topic curriculum_nodes after upsert: ${describeUnknownError(error)}`);
    }

    topicNodeRows.push(...(data ?? []));
  }

  const topicNodeIdBySlug = new Map(topicNodeRows.map((row) => [row.slug, row.id]));

  const specialtyTagRows = uniqueSpecialties.map((item) => ({
    namespace: "Specialty",
    slug: item.slug.replace(/-/g, "_"),
    label: titleToTagLabel("Specialty", item.title),
    description: `${item.title} specialty tag.`,
    comments: "Imported or reused by the Orthobullets Phase 2 importer.",
    is_active: true,
  }));
  const topicTagRows = uniqueAcceptedRows.map((row) => ({
    namespace: "Topic",
    slug: row.normalizedTopicSlug.replace(/-/g, "_"),
    label: titleToTagLabel("Topic", row.normalizedTopicLabel),
    description: `${row.normalizedTopicLabel} topic tag.`,
    comments: "Imported or reused by the Orthobullets Phase 2 importer.",
    is_active: true,
  }));

  await postgrestUpsertMinimal(restAdmin, "tags", [...specialtyTagRows, ...topicTagRows], "namespace,slug");

  const tagRows: Array<{ id: string; namespace: string; slug: string }> = [];
  const { data: specialtyTagLookupRows, error: specialtyTagLookupError } = await supabase
    .from("tags")
    .select("id, namespace, slug")
    .eq("namespace", "Specialty")
    .in(
      "slug",
      specialtyTagRows.map((row) => row.slug)
    );

  if (specialtyTagLookupError) {
    throw new Error(
      `Failed loading specialty tags after upsert: ${describeUnknownError(specialtyTagLookupError)}`
    );
  }
  tagRows.push(...(specialtyTagLookupRows ?? []));

  for (const topicTagSlugChunk of chunkItems(topicTagRows.map((row) => row.slug), 200)) {
    const { data, error } = await supabase
      .from("tags")
      .select("id, namespace, slug")
      .eq("namespace", "Topic")
      .in("slug", topicTagSlugChunk);

    if (error) {
      throw new Error(`Failed loading topic tags after upsert: ${describeUnknownError(error)}`);
    }

    tagRows.push(...(data ?? []));
  }

  const tagIdByNamespaceSlug = new Map(tagRows.map((row) => [`${row.namespace}::${row.slug}`, row.id]));

  await postgrestUpsertMinimal(
    restAdmin,
    "source_aliases",
    [
      ...uniqueSpecialties.map((item) => ({
        source_id: ensureIds.sourceId,
        entity_type: "curriculum_node",
        entity_id: specialtyNodeIdBySlug.get(item.slug),
        alias_kind: "source_specialty_label",
        alias_value: item.title,
        external_id: null,
        metadata: {},
        comments: "Orthobullets specialty label preserved during import.",
        is_active: true,
      })),
      ...uniqueAcceptedRows.map((row) => ({
        source_id: ensureIds.sourceId,
        entity_type: "curriculum_node",
        entity_id: topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug),
        alias_kind: "source_topic_label",
        alias_value: row.normalizedTopicLabel,
        external_id: null,
        metadata: {
          source_topic_slug: row.normalizedTopicSlug,
          normalized_topic_label: row.normalizedTopicLabel,
        },
        comments: "Orthobullets topic label preserved during import.",
        is_active: true,
      })),
    ],
    "source_id,entity_type,entity_id,alias_kind,alias_value"
  );

  await postgrestUpsertMinimal(
    restAdmin,
    "tag_assignments",
    [
      ...uniqueSpecialties.map((item) => ({
        tag_id: tagIdByNamespaceSlug.get(`Specialty::${item.slug.replace(/-/g, "_")}`),
        entity_type: "curriculum_node",
        entity_id: specialtyNodeIdBySlug.get(item.slug),
        assigned_by_source: "import",
        comments: "Assigned by the Orthobullets Phase 2 importer.",
        is_active: true,
      })),
      ...uniqueAcceptedRows.flatMap((row) => [
        {
          tag_id: sourceTagId,
          entity_type: "curriculum_node",
          entity_id: topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug),
          assigned_by_source: "import",
          comments: "Assigned by the Orthobullets Phase 2 importer.",
          is_active: true,
        },
        {
          tag_id: importedTagId,
          entity_type: "curriculum_node",
          entity_id: topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug),
          assigned_by_source: "import",
          comments: "Assigned by the Orthobullets Phase 2 importer.",
          is_active: true,
        },
        {
          tag_id: sourceDerivedTagId,
          entity_type: "curriculum_node",
          entity_id: topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug),
          assigned_by_source: "import",
          comments: "Assigned by the Orthobullets Phase 2 importer.",
          is_active: true,
        },
        {
          tag_id: tagIdByNamespaceSlug.get(`Topic::${row.normalizedTopicSlug.replace(/-/g, "_")}`),
          entity_type: "curriculum_node",
          entity_id: topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug),
          assigned_by_source: "import",
          comments: "Assigned by the Orthobullets Phase 2 importer.",
          is_active: true,
        },
      ]),
    ],
    "tag_id,entity_type,entity_id"
  );

  for (const row of uniqueAcceptedRows) {
    let conceptId: string | null = null;

    if (options.seedTopicConcepts) {
      conceptId = await ensureTopicConceptSeed(
        supabase,
        ensureIds,
        topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug)!,
        row.mappedCurriculumNodeSlug,
        row.normalizedTopicLabel
      );

      if (conceptId) {
        autoCreatedTopicConcepts += 1;
      }
    }

    acceptedTopicSetupBySlug.set(row.mappedCurriculumNodeSlug, {
      specialtyId: specialtyIdBySlug.get(row.normalizedSpecialtySlug)!,
      topicNodeId: topicNodeIdBySlug.get(row.mappedCurriculumNodeSlug)!,
      specialtyTagId: tagIdByNamespaceSlug.get(
        `Specialty::${row.normalizedSpecialtySlug.replace(/-/g, "_")}`
      )!,
      topicTagId: tagIdByNamespaceSlug.get(
        `Topic::${row.normalizedTopicSlug.replace(/-/g, "_")}`
      )!,
      conceptId,
    });
  }
  console.error(`[orthobullets] accepted topic setup ready for ${acceptedTopicSetupBySlug.size} curriculum nodes`);

  const chunkSize = 250;

  for (let index = 0; index < importRows.length; index += chunkSize) {
    const chunk = importRows.slice(index, index + chunkSize);
    console.error(
      `[orthobullets] importing question chunk ${Math.floor(index / chunkSize) + 1}/${Math.ceil(importRows.length / chunkSize)} (${chunk.length} rows)`
    );
    const externalQuestionIds = chunk.map((row) => row.externalQuestionId);
    const { data: existingQuestions, error: existingQuestionsError } = await supabase
      .from("external_questions")
      .select("id, external_question_id, first_seen_at")
      .eq("source_id", ensureIds.sourceId)
      .in("external_question_id", externalQuestionIds);

    if (existingQuestionsError) {
      throw new Error(
        `Failed looking up existing external_questions chunk: ${describeUnknownError(existingQuestionsError)}`
      );
    }

    const existingQuestionByExternalId = new Map(
      (existingQuestions ?? []).map((row) => [row.external_question_id, row])
    );

    await postgrestUpsertMinimal(
      restAdmin,
      "external_questions",
      chunk.map((row) => ({
        source_id: ensureIds.sourceId,
        external_question_id: row.externalQuestionId,
        specialty_raw: row.specialtyRaw || null,
        specialty_normalized: row.normalizedSpecialtySlug || null,
        topic_raw: row.topicRaw || null,
        topic_normalized: row.normalizedTopicLabel || null,
        topic_slug: row.normalizedTopicSlug || null,
        metadata: {
          review_group_key: row.reviewGroupKey,
          review_reason: row.reviewReason,
          mapping_confidence: row.mappingConfidence,
          mapping_method: row.mappingMethod,
          review_override_reason: row.reviewOverrideReason || null,
        },
        first_seen_at:
          existingQuestionByExternalId.get(row.externalQuestionId)?.first_seen_at ??
          new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        comments: "Imported from Orthobullets metadata CSV in Phase 2.",
        is_active: true,
      })),
      "source_id,external_question_id"
    );

    const { data: persistedQuestions, error: persistedQuestionsError } = await supabase
      .from("external_questions")
      .select("id, external_question_id")
      .eq("source_id", ensureIds.sourceId)
      .in("external_question_id", externalQuestionIds);

    if (persistedQuestionsError) {
      throw new Error(
        `Failed loading persisted external_questions chunk: ${describeUnknownError(persistedQuestionsError)}`
      );
    }

    const questionIdByExternalId = new Map(
      (persistedQuestions ?? []).map((row) => [row.external_question_id, row.id])
    );

    await postgrestUpsertMinimal(
      restAdmin,
      "source_aliases",
      chunk.map((row) => ({
        source_id: ensureIds.sourceId,
        entity_type: "external_question",
        entity_id: questionIdByExternalId.get(row.externalQuestionId),
        alias_kind: "source_question_id",
        alias_value: row.externalQuestionId,
        external_id: row.externalQuestionId,
        metadata: {},
        comments: "Orthobullets external question identifier preserved during import.",
        is_active: true,
      })),
      "source_id,entity_type,entity_id,alias_kind,alias_value"
    );

    const { data: existingMappings, error: existingMappingsError } = await supabase
      .from("external_question_curriculum_mappings")
      .select("id, external_question_id")
      .eq("is_primary", true)
      .in(
        "external_question_id",
        [...questionIdByExternalId.values()].filter(Boolean)
      );

    if (existingMappingsError) {
      throw new Error(
        `Failed looking up existing mapping chunk: ${describeUnknownError(existingMappingsError)}`
      );
    }

    const existingMappingByQuestionId = new Map(
      (existingMappings ?? []).map((row) => [row.external_question_id, row.id])
    );

    const mappingInsertPayloads: JsonRecord[] = [];
    const mappingPatchPayloads: Array<{ id: string; payload: JsonRecord }> = [];
    const tagAssignmentPayloads: JsonRecord[] = [];

    for (const row of chunk) {
      const questionId = questionIdByExternalId.get(row.externalQuestionId);

      if (!questionId) {
        throw new Error(`Missing persisted external_question id for ${row.externalQuestionId}`);
      }

      const acceptedTopicSetup = row.mappedCurriculumNodeSlug
        ? acceptedTopicSetupBySlug.get(row.mappedCurriculumNodeSlug)
        : undefined;

      const mappingPayload = {
        external_question_id: questionId,
        specialty_id: acceptedTopicSetup?.specialtyId ?? null,
        curriculum_node_id: acceptedTopicSetup?.topicNodeId ?? null,
        learning_objective_id: null,
        concept_id: acceptedTopicSetup?.conceptId ?? null,
        mapping_confidence: row.mappingConfidence,
        needs_review: row.needsReview,
        review_reason: row.reviewReason || null,
        suggested_action: row.suggestedAction || null,
        mapping_method: row.mappingMethod,
        is_primary: true,
        metadata: {
          specialty_slug: row.normalizedSpecialtySlug || null,
          curriculum_node_slug: row.mappedCurriculumNodeSlug || null,
          topic_slug: row.normalizedTopicSlug || null,
          review_group_key: row.reviewGroupKey,
          review_override_reason: row.reviewOverrideReason || null,
        },
        comments: "Primary topic-level mapping imported from Orthobullets metadata.",
        is_active: true,
      } satisfies JsonRecord;

      const existingMappingId = existingMappingByQuestionId.get(questionId);
      if (existingMappingId) {
        mappingPatchPayloads.push({ id: existingMappingId, payload: mappingPayload });
      } else {
        mappingInsertPayloads.push(mappingPayload);
      }

      const tagIds = [sourceTagId, importedTagId];
      if (acceptedTopicSetup) {
        tagIds.push(
          acceptedTopicSetup.specialtyTagId,
          acceptedTopicSetup.topicTagId,
          needsConceptMappingTagId
        );
      }

      for (const tagId of tagIds) {
        tagAssignmentPayloads.push({
          tag_id: tagId,
          entity_type: "external_question",
          entity_id: questionId,
          assigned_by_source: "import",
          comments: "Assigned by the Orthobullets Phase 2 importer.",
          is_active: true,
        });
      }
    }

    if (mappingInsertPayloads.length > 0) {
      await postgrestInsertMinimal(
        restAdmin,
        "external_question_curriculum_mappings",
        mappingInsertPayloads
      );
    }

    for (const patchPayload of mappingPatchPayloads) {
      await postgrestPatchMinimal(
        restAdmin,
        "external_question_curriculum_mappings",
        patchPayload.payload,
        { id: patchPayload.id }
      );
    }

    await postgrestUpsertMinimal(
      restAdmin,
      "tag_assignments",
      tagAssignmentPayloads,
      "tag_id,entity_type,entity_id"
    );
  }

  artifacts.summary.newSpecialtyCount = newSpecialtyCount;
  artifacts.summary.newSpecialtyNodeCount = newSpecialtyNodeCount;
  artifacts.summary.newTopicNodeCount = newTopicNodeCount;
  artifacts.summary.existingSpecialtyNodeCount = existingSpecialtyNodeCount;
  artifacts.summary.existingTopicNodeCount = existingTopicNodeCount;
  artifacts.summary.autoCreatedTopicConcepts = autoCreatedTopicConcepts;

  return artifacts;
}

export function resolveInputPath(explicitPath?: string) {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const candidates = [
    "/mnt/data/orthobullets_questions_import.csv",
    "/downloads/orthobullets_questions_import.csv",
    path.join(process.env.HOME ?? "", "Downloads", "orthobullets_questions_import.csv"),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

export function writeArtifacts(outDir: string, artifacts: ImportArtifacts) {
  mkdirSync(outDir, { recursive: true });

  const reviewCsvPath = path.join(outDir, "orthobullets_mapping_review.csv");
  const topicReviewCsvPath = path.join(outDir, "orthobullets_topic_mapping_review.csv");
  const conceptTaskCsvPath = path.join(outDir, "orthobullets_concept_mapping_tasks.csv");
  const sourceAnomaliesCsvPath = path.join(outDir, "orthobullets_source_anomalies.csv");
  const potentialDuplicatesCsvPath = path.join(outDir, "orthobullets_potential_duplicates.csv");
  const summaryJsonPath = path.join(outDir, "orthobullets_import_summary.json");
  const summaryMdPath = path.join(outDir, "orthobullets_import_summary.md");

  writeFileSync(
    reviewCsvPath,
    rowsToCsv(artifacts.rowAuditRows, [
      "external_question_id",
      "specialty_raw",
      "normalized_specialty_slug",
      "normalized_specialty_title",
      "topic_raw",
      "normalized_topic_label",
      "normalized_topic_slug",
      "mapped_specialty_slug",
      "mapped_curriculum_node_slug",
      "canonical_topic_node_id",
      "mapping_confidence",
      "needs_review",
      "review_reason",
      "suggested_action",
      "mapping_method",
      "review_override_reason",
      "review_group_key",
      "row_number",
    ]),
    "utf8"
  );

  writeFileSync(
    topicReviewCsvPath,
    rowsToCsv(artifacts.topicReviewRows, [
      "review_group_key",
      "raw_specialty_labels",
      "normalized_specialty_slug",
      "normalized_specialty_title",
      "raw_topic_labels",
      "normalized_topic_label",
      "normalized_topic_slug",
      "canonical_topic_node_slug",
      "canonical_topic_node_id",
      "question_count",
      "mapping_confidence",
      "review_reason",
      "suggested_action",
      "mapping_method",
      "review_override_reason",
      "representative_question_ids",
      "quality_notes",
    ]),
    "utf8"
  );

  writeFileSync(
    conceptTaskCsvPath,
    rowsToCsv(artifacts.conceptTaskRows, [
      "review_group_key",
      "raw_specialty_labels",
      "normalized_specialty_slug",
      "normalized_specialty_title",
      "raw_topic_labels",
      "normalized_topic_label",
      "normalized_topic_slug",
      "canonical_topic_node_slug",
      "canonical_topic_node_id",
      "question_count",
      "is_high_frequency_topic",
      "mapping_confidence",
      "review_reason",
      "suggested_action",
      "mapping_method",
      "review_override_reason",
      "representative_question_ids",
      "quality_notes",
    ]),
    "utf8"
  );

  writeFileSync(
    sourceAnomaliesCsvPath,
    rowsToCsv(artifacts.sourceAnomalyRows, [
      "external_question_id",
      "raw_specialty",
      "normalized_specialty_slug",
      "normalized_specialty_title",
      "raw_topic_label",
      "normalized_topic_label",
      "normalized_topic_slug",
      "canonical_topic_node_slug",
      "canonical_topic_node_id",
      "mapping_confidence",
      "review_reason",
      "suggested_action",
      "review_group_key",
      "source_anomaly_reason",
      "row_number",
    ]),
    "utf8"
  );

  writeFileSync(
    potentialDuplicatesCsvPath,
    rowsToCsv(artifacts.potentialDuplicateRows, [
      "duplicate_group_key",
      "normalized_topic_label_a",
      "normalized_topic_slug_a",
      "specialty_a",
      "question_count_a",
      "normalized_topic_label_b",
      "normalized_topic_slug_b",
      "specialty_b",
      "question_count_b",
      "duplicate_reason",
      "token_overlap_score",
    ]),
    "utf8"
  );

  writeFileSync(summaryJsonPath, JSON.stringify(artifacts.summary, null, 2) + "\n", "utf8");
  writeFileSync(summaryMdPath, summaryToMarkdown(artifacts.summary), "utf8");

  return {
    reviewCsvPath,
    topicReviewCsvPath,
    conceptTaskCsvPath,
    sourceAnomaliesCsvPath,
    potentialDuplicatesCsvPath,
    summaryJsonPath,
    summaryMdPath,
  };
}

export function defaultOutDir() {
  return path.join(process.cwd(), "tmp", "education", "orthobullets-import");
}

export function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const dryRun = !args.includes("--apply");
  const seedTopicConcepts = args.includes("--seed-topic-concepts");
  const inputArg = args.find((arg) => arg.startsWith("--input="));
  const outArg = args.find((arg) => arg.startsWith("--out="));

  return {
    dryRun,
    seedTopicConcepts,
    inputPath: resolveInputPath(inputArg?.slice("--input=".length)),
    outDir: outArg ? path.resolve(outArg.slice("--out=".length)) : defaultOutDir(),
  };
}

export function buildTopicTagLabel(title: string) {
  return titleToTagLabel("Topic", title);
}

export function buildSpecialtyTagLabel(title: string) {
  return titleToTagLabel("Specialty", title);
}
