import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export type ProposalType =
  | "create_canonical_entity"
  | "link_curriculum_node_to_entity"
  | "link_concept_to_entity"
  | "add_entity_alias"
  | "add_canonical_relationship"
  | "add_provenance_record"
  | "flag_duplicate_entity"
  | "flag_ambiguous_mapping"
  | "flag_possible_split"
  | "flag_possible_merge"
  | "retarget_card_to_entity"
  | "retarget_question_to_entity";

export type ProposalReviewStatus =
  | "generated"
  | "needs_review"
  | "approved"
  | "rejected"
  | "applied"
  | "superseded";

export type ConfidenceTier = "high" | "medium" | "low";

export type ProposalRecord = {
  proposal_fingerprint: string;
  proposal_type: ProposalType;
  source_signal_type: string;
  source_signal_ids: string[];
  specialty_id: string | null;
  proposed_entity_type: string | null;
  proposed_entity_label: string | null;
  proposed_existing_entity_id: string | null;
  proposed_subject_entity_id: string | null;
  proposed_predicate: string | null;
  proposed_object_entity_id: string | null;
  proposed_alias: string | null;
  proposed_bridge_type: string | null;
  confidence: number;
  confidence_tier: ConfidenceTier;
  confidence_reason: string;
  evidence_summary: string;
  supporting_card_count: number;
  supporting_question_count: number;
  supporting_curriculum_node_count: number;
  supporting_source_count: number;
  conflict_count: number;
  review_status: ProposalReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  applied_at: string | null;
  superseded_by: string | null;
  metadata: Record<string, unknown>;
  comments: string | null;
  is_active: boolean;
};

export type ProposalSnapshot = {
  generatedAt: string;
  tableAvailable: boolean;
  persistedToDatabase: boolean;
  proposalCount: number;
  proposals: ProposalRecord[];
};

export type ProposalRow = ProposalRecord & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProposalSource = "database" | "snapshot" | "unavailable";

export const ACTIVE_PROPOSAL_REVIEW_STATUSES: ProposalReviewStatus[] = [
  "generated",
  "needs_review",
  "approved",
];

export const TERMINAL_PROPOSAL_REVIEW_STATUSES: ProposalReviewStatus[] = [
  "rejected",
  "applied",
  "superseded",
];

export function loadEnvFile(filePath: string) {
  const env = Object.create(null) as Record<string, string>;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

export function resolveEnv() {
  const cwdEnvPath = path.join(process.cwd(), ".env.local");
  const fileEnv = existsSync(cwdEnvPath) ? loadEnvFile(cwdEnvPath) : {};

  return {
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL?.trim() || "",
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  };
}

export function createServiceRoleClient() {
  const { supabaseUrl, serviceRoleKey } = resolveEnv();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as {
    from: (relation: string) => any;
  };
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    const ownProps = Object.fromEntries(
      Object.getOwnPropertyNames(error)
        .filter((key) => !["name", "message", "stack"].includes(key))
        .map((key) => [key, (error as unknown as { [key: string]: unknown })[key]])
    );

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...ownProps,
    };
  }

  return { error: String(error) };
}

export function ensureOutDir(outDir: string) {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
}

export function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()/]/g, " ")
    .replace(/\s+/g, " ");
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function toConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) {
    return "high";
  }
  if (score >= 0.65) {
    return "medium";
  }
  return "low";
}

export function defaultReviewStatus(tier: ConfidenceTier): ProposalReviewStatus {
  return tier === "low" ? "generated" : "needs_review";
}

export function isMissingRelationError(error: unknown, relationName: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(relationName) && message.includes("does not exist");
}

export function snapshotFilePath(outDir: string) {
  return path.join(outDir, "kg-automation-proposals.snapshot.json");
}

export function writeSnapshot(outDir: string, snapshot: ProposalSnapshot) {
  ensureOutDir(outDir);
  const filePath = snapshotFilePath(outDir);
  writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return filePath;
}

export function readSnapshot(outDir: string) {
  const filePath = snapshotFilePath(outDir);
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf8")) as ProposalSnapshot;
}

/**
 * Paginate a Supabase select past the 1000-row default cap. `buildQuery`
 * receives an inclusive [from, to] range and must return a query already
 * carrying its filters and a `.range(from, to)` call. See
 * docs/kg-automation-scale-hardening-todo.md for the read sites that still need
 * to adopt this.
 *
 * Example:
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from("anki_cards").select("anki_card_id,deck_id").eq("is_active", true).range(from, to)
 *   );
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) {
      throw error;
    }
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
  }
  return rows;
}

export function chunkArray<T>(values: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReviewerIdentity = {
  reviewerId: string | null;
  reviewerLabel: string | null;
  /** ISO timestamp, set only when a reviewer id is available (DB CHECK requires reviewed_by when reviewed_at is set). */
  reviewedAt: string | null;
};

/**
 * Resolve the human reviewer behind a script-driven approval so we stop leaving
 * `reviewed_by` null. Reads `--reviewer-id <uuid>` / `--reviewer-label <text>`
 * flags, falling back to KG_AUTOMATION_REVIEWER_ID / KG_AUTOMATION_REVIEWER_LABEL
 * env vars. When a valid reviewer id is present we also stamp reviewed_at.
 */
export function resolveReviewerIdentity(argv: string[]): ReviewerIdentity {
  let reviewerId: string | null = null;
  let reviewerLabel: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--reviewer-id") {
      reviewerId = argv[index + 1] ?? reviewerId;
      index += 1;
    } else if (arg === "--reviewer-label") {
      reviewerLabel = argv[index + 1] ?? reviewerLabel;
      index += 1;
    }
  }

  reviewerId =
    reviewerId?.trim() || process.env.KG_AUTOMATION_REVIEWER_ID?.trim() || null;
  reviewerLabel =
    reviewerLabel?.trim() || process.env.KG_AUTOMATION_REVIEWER_LABEL?.trim() || null;

  if (reviewerId && !UUID_PATTERN.test(reviewerId)) {
    console.warn(
      `[kg-automation] Ignoring --reviewer-id "${reviewerId}" — not a valid UUID. reviewed_by will be left null.`
    );
    reviewerId = null;
  }

  if (!reviewerId) {
    console.warn(
      "[kg-automation] No reviewer identity provided (--reviewer-id / KG_AUTOMATION_REVIEWER_ID). " +
        "reviewed_by will be left null. Pass a reviewer UUID to attribute this approval."
    );
  }

  return {
    reviewerId,
    reviewerLabel,
    reviewedAt: reviewerId ? new Date().toISOString() : null,
  };
}

export function getReviewPacketKey(proposal: ProposalRow) {
  return String(proposal.metadata.review_packet_key ?? proposal.proposal_fingerprint);
}

export function getReviewPacketLabel(proposal: ProposalRow) {
  return String(
    proposal.metadata.review_packet_label ??
      proposal.metadata.curriculum_node_path ??
      proposal.proposed_entity_label ??
      proposal.proposal_fingerprint
  );
}

export function isActiveProposalStatus(status: string): status is ProposalReviewStatus {
  return ACTIVE_PROPOSAL_REVIEW_STATUSES.includes(status as ProposalReviewStatus);
}

export function isTerminalProposalStatus(status: string): status is ProposalReviewStatus {
  return TERMINAL_PROPOSAL_REVIEW_STATUSES.includes(status as ProposalReviewStatus);
}

export function filterActiveProposalRows<T extends ProposalRow>(proposals: T[]) {
  return proposals.filter((proposal) => isActiveProposalStatus(proposal.review_status));
}

function normalizePacketSelector(value: string) {
  return value.trim().toLowerCase();
}

export function resolvePacketSelection(proposals: ProposalRow[], selection: string) {
  const normalizedSelection = normalizePacketSelector(selection);
  const strippedSelection = normalizedSelection.replace(/^branch:/, "").replace(/^concept:/, "");
  const grouped = new Map<string, ProposalRow[]>();

  for (const proposal of proposals) {
    const packetKey = getReviewPacketKey(proposal);
    const bucket = grouped.get(packetKey) ?? [];
    bucket.push(proposal);
    grouped.set(packetKey, bucket);
  }

  const matches = [...grouped.entries()].filter(([packetKey, packetProposals]) => {
    const normalizedKey = normalizePacketSelector(packetKey);
    const normalizedLabel = normalizePacketSelector(getReviewPacketLabel(packetProposals[0]));
    const strippedKey = normalizedKey.replace(/^branch:/, "").replace(/^concept:/, "");

    return (
      normalizedKey === normalizedSelection ||
      normalizedLabel === normalizedSelection ||
      normalizedKey.endsWith(normalizedSelection) ||
      strippedKey === strippedSelection ||
      strippedKey.endsWith(strippedSelection)
    );
  });

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error(
      `Packet selector ${selection} matched multiple packets: ${matches
        .map(([packetKey]) => packetKey)
        .join(", ")}`
    );
  }

  return {
    packetKey: matches[0][0],
    proposals: matches[0][1],
  };
}

export async function loadProposalRows(outDir: string) {
  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from("kg_automation_proposals")
      .select("*")
      .eq("is_active", true)
      .in("review_status", ACTIVE_PROPOSAL_REVIEW_STATUSES)
      .order("confidence", { ascending: false });

    if (error) {
      throw error;
    }

    if ((data ?? []).length > 0) {
      return {
        proposals: (data ?? []) as ProposalRow[],
        source: "database" as ProposalSource,
      };
    }
  } catch {
    // Fall back to local snapshot when the live table is unavailable.
  }

  const snapshot = readSnapshot(outDir);
  if (!snapshot) {
    return {
      proposals: [] as ProposalRow[],
      source: "unavailable" as ProposalSource,
    };
  }

  return {
    proposals: filterActiveProposalRows(snapshot.proposals as ProposalRow[]),
    source: "snapshot" as ProposalSource,
  };
}
