import { createHash } from "node:crypto";

/**
 * Miller's Review enrichment packet contract.
 *
 * Parallels the Orthobullets enrichment pipeline but the retrieval source is the
 * local Miller's Review PDF (see scripts/lib/education/millers_extract.py) and the
 * output is a single resource field: `Millers`. Generated content is ORIGINAL
 * teaching prose plus a printed-page citation — never verbatim excerpts.
 */
export const MILLERS_ENRICHMENT_CONTRACT = "snaportho-millers-enrichment.v1" as const;
export const MILLERS_ENRICHMENT_RUN_KEY = "snaportho-millers-enrichment-v1" as const;
export const MILLERS_FIELD = "Millers" as const;
export const MILLERS_SOURCE_LABEL = "Miller's Review of Orthopaedics, 8th ed." as const;

const MIN_SUMMARY_CHARS = 40;
const MAX_SUMMARY_CHARS = 900;
const MAX_EVIDENCE_CHARS = 240;
const MIN_PRINTED_PAGE = 1;
const MAX_PRINTED_PAGE = 900;

export type EnrichmentStatus = "filled" | "skipped";
export type EnrichmentSkipReason =
  | "no_matching_content"
  | "already_filled"
  | "not_applicable"
  | "low_confidence";

/** A retrieved candidate passage surfaced to the generator/reviewer for audit. */
export type MillersCandidate = {
  sectionPath: string; // e.g. "Basic Sciences › Orthopaedic Tissues › Bone"
  printedPage: number | null;
  pdfPage: number;
  score: number;
  snippet: string; // short excerpt shown to the reviewer only (never published)
};

export type MillersEnrichmentCard = {
  noteId: string;
  noteVersionId: string;
  stableGuid: string;
  contentChecksum: string;
  deckPath: string;
  front: string;
  extra: string;
  governedTags: string[];
  currentMillers: string;
  searchQuery: string;
  candidates: MillersCandidate[];
  // Output (populated by generation / edited during review):
  enrichmentStatus?: EnrichmentStatus;
  skipReason?: EnrichmentSkipReason;
  summary?: string; // original teaching prose (plain text)
  printedPage?: number; // primary cited printed page
  printedPageEnd?: number; // optional range end
  sectionPath?: string; // cited section heading path
  evidence?: string; // short source quote for the reviewer only; NOT published
  reviewNotes?: string[];
};

export type MillersEnrichmentPacket = {
  schemaVersion: typeof MILLERS_ENRICHMENT_CONTRACT;
  runKey: string;
  sourceReleaseId: string;
  sourceReleaseVersion: string;
  corpusChecksum: string;
  batchKey: string;
  inputChecksum: string;
  instructions: string[];
  generator?: { provider: string; model: string; generatedAt: string };
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: MillersEnrichmentCard[];
};

/**
 * Sidecar = the fills an LLM operator (Claude Code, Codex, or Grok) writes after
 * reading the brief. No API is called by the pipeline; the operator produces this
 * file and `applyMillersSidecar` merges it into a reviewed packet.
 */
export type MillersEnrichmentSidecarCard = {
  stableGuid: string;
  status: EnrichmentStatus;
  skipReason?: EnrichmentSkipReason;
  summary?: string;
  printedPage?: number;
  printedPageEnd?: number;
  sectionPath?: string;
  evidence?: string;
  reviewNotes?: string[];
};

export type MillersEnrichmentSidecar = {
  batchKey: string;
  inputChecksum: string;
  operator: { provider: string; model: string; generatedAt: string };
  cards: MillersEnrichmentSidecarCard[];
};

/** Field overlay row emitted for the resource-field overlay publisher. */
export type MillersFieldOverlay = {
  stableGuid: string;
  sourceContentChecksum: string;
  millers: string; // final HTML written to the `Millers` field
};

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

export function pendingPacketFileName(batchKey: string): string {
  return `millers-${batchKey}-pending.json`;
}
export function reviewedPacketFileName(batchKey: string): string {
  return `millers-${batchKey}-reviewed.json`;
}
export function briefPacketFileName(batchKey: string): string {
  return `millers-${batchKey}-brief.json`;
}
export function sidecarPacketFileName(batchKey: string): string {
  return `millers-${batchKey}-sidecar.json`;
}
export function isPendingPacketFileName(name: string): boolean {
  return /^millers-.+-pending\.json$/.test(name);
}
export function isReviewedPacketFileName(name: string): boolean {
  return /^millers-.+-reviewed\.json$/.test(name);
}

export function isBlankResource(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const text = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return text.length === 0;
}

export function fieldsFromSnapshot(snapshot: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(snapshot)) {
    for (const f of snapshot) {
      if (f && typeof f === "object" && "name" in f) {
        const field = f as Record<string, unknown>;
        const name = String(field.name);
        const value = field.rawValue ?? field.value ?? "";
        out[name] = typeof value === "string" ? value : String(value);
      }
    }
  } else if (snapshot && typeof snapshot === "object") {
    for (const [k, v] of Object.entries(snapshot as Record<string, unknown>)) {
      out[k] = typeof v === "string" ? v : String(v);
    }
  }
  return out;
}

export function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** Build the retrieval query from the card's front (and, lightly, its deck path). */
export function searchQueryForCard(front: string, extra: string, deckPath: string): string {
  const frontText = plainText(front);
  const extraText = plainText(extra).slice(0, 200);
  const pathTerms = deckPath
    .split("::")
    .filter((seg) => seg && seg !== "SnapOrtho")
    .join(" ");
  return `${frontText} ${extraText} ${pathTerms}`.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Human-readable citation, e.g. "Miller's Review of Orthopaedics, 8th ed. — p. 412". */
export function citationText(printedPage: number, printedPageEnd?: number): string {
  const pages = printedPageEnd && printedPageEnd > printedPage
    ? `pp. ${printedPage}–${printedPageEnd}`
    : `p. ${printedPage}`;
  return `${MILLERS_SOURCE_LABEL} — ${pages}`;
}

/** Compose the final `Millers` field HTML from an original summary + citation. */
export function buildMillersHtml(
  summary: string,
  printedPage: number,
  printedPageEnd?: number,
): string {
  const body = escapeHtml(summary.trim()).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  const cite = escapeHtml(citationText(printedPage, printedPageEnd));
  return `<div class="snaportho-millers"><p>${body}</p><p class="snaportho-millers-cite"><em>${cite}</em></p></div>`;
}

export type MillersValidation = { ok: true } | { ok: false; error: string };

export function validateFilledCard(card: MillersEnrichmentCard): MillersValidation {
  const summary = (card.summary ?? "").trim();
  if (summary.length < MIN_SUMMARY_CHARS) return { ok: false, error: "summary_too_short" };
  if (summary.length > MAX_SUMMARY_CHARS) return { ok: false, error: "summary_too_long" };
  const page = card.printedPage;
  if (typeof page !== "number" || !Number.isInteger(page)) return { ok: false, error: "missing_printed_page" };
  if (page < MIN_PRINTED_PAGE || page > MAX_PRINTED_PAGE) return { ok: false, error: "printed_page_out_of_range" };
  if (card.printedPageEnd !== undefined) {
    if (!Number.isInteger(card.printedPageEnd) || card.printedPageEnd < page) {
      return { ok: false, error: "bad_printed_page_range" };
    }
  }
  if (card.evidence && card.evidence.length > MAX_EVIDENCE_CHARS) {
    return { ok: false, error: "evidence_too_long" };
  }
  return { ok: true };
}

export function overlaysFromReviewedPacket(packet: MillersEnrichmentPacket): MillersFieldOverlay[] {
  return packet.cards.flatMap((card) => {
    if (card.enrichmentStatus !== "filled") return [];
    const check = validateFilledCard(card);
    if (!check.ok) throw new Error(`invalid_millers_card:${card.stableGuid}:${check.error}`);
    return [{
      stableGuid: card.stableGuid,
      sourceContentChecksum: card.contentChecksum,
      millers: buildMillersHtml(card.summary!, card.printedPage!, card.printedPageEnd),
    }];
  });
}

/** Checksum inputs that seal the packet's identity (excludes generated output). */
export function enrichmentPacketChecksumInput(
  packet: Omit<MillersEnrichmentPacket, "inputChecksum"> | MillersEnrichmentPacket,
): unknown {
  return {
    schemaVersion: packet.schemaVersion,
    runKey: packet.runKey,
    sourceReleaseId: packet.sourceReleaseId,
    corpusChecksum: packet.corpusChecksum,
    batchKey: packet.batchKey,
    cards: packet.cards.map((c) => ({
      stableGuid: c.stableGuid,
      contentChecksum: c.contentChecksum,
      searchQuery: c.searchQuery,
    })),
  };
}

export function sealEnrichmentPacket(
  packet: Omit<MillersEnrichmentPacket, "inputChecksum">,
): MillersEnrichmentPacket {
  const inputChecksum = sha256(enrichmentPacketChecksumInput(packet));
  return { ...packet, inputChecksum };
}

/**
 * Merge operator fills (sidecar) into a sealed pending packet, producing a reviewed
 * packet. Validates identity, that every filled card is well-formed, and that its
 * cited page is one the card actually retrieved (no invented citations). Protected
 * identity fields are re-checksummed so a sidecar can never mutate them.
 */
export function applyMillersSidecar(
  packet: MillersEnrichmentPacket,
  sidecar: MillersEnrichmentSidecar,
): MillersEnrichmentPacket {
  if (sidecar.batchKey !== packet.batchKey) throw new Error(`sidecar_batch_mismatch:${sidecar.batchKey}:${packet.batchKey}`);
  if (sidecar.inputChecksum !== packet.inputChecksum) throw new Error("sidecar_checksum_mismatch");
  if (!sidecar.operator?.provider?.trim() || !sidecar.operator.model?.trim() || !Number.isFinite(Date.parse(sidecar.operator.generatedAt))) {
    throw new Error("sidecar_operator_required");
  }
  const byGuid = new Map(sidecar.cards.map((c) => [c.stableGuid, c]));
  if (byGuid.size !== sidecar.cards.length) throw new Error("sidecar_duplicate_card");
  if (byGuid.size !== packet.cards.length) throw new Error(`sidecar_card_count_mismatch:${byGuid.size}:${packet.cards.length}`);

  const mergedCards = packet.cards.map((card) => {
    const patch = byGuid.get(card.stableGuid);
    if (!patch) throw new Error(`sidecar_missing_card:${card.stableGuid}`);
    if (patch.status === "skipped") {
      return {
        ...card,
        enrichmentStatus: "skipped" as const,
        skipReason: patch.skipReason ?? "no_matching_content",
        reviewNotes: patch.reviewNotes ?? [],
        summary: undefined,
        printedPage: undefined,
        printedPageEnd: undefined,
        sectionPath: undefined,
        evidence: undefined,
      };
    }
    const filled: MillersEnrichmentCard = {
      ...card,
      enrichmentStatus: "filled",
      skipReason: undefined,
      summary: patch.summary?.trim(),
      printedPage: patch.printedPage,
      printedPageEnd: patch.printedPageEnd,
      sectionPath: patch.sectionPath?.trim(),
      evidence: patch.evidence?.trim(),
      reviewNotes: patch.reviewNotes ?? [],
    };
    const check = validateFilledCard(filled);
    if (!check.ok) throw new Error(`sidecar_invalid_card:${card.stableGuid}:${check.error}`);
    const allowedPages = new Set(card.candidates.map((cand) => cand.printedPage));
    if (!allowedPages.has(filled.printedPage!)) {
      throw new Error(`sidecar_page_not_in_candidates:${card.stableGuid}:${filled.printedPage}`);
    }
    return filled;
  });

  const merged: MillersEnrichmentPacket = {
    ...packet,
    generator: sidecar.operator,
    cards: mergedCards,
  };
  if (sha256(enrichmentPacketChecksumInput(merged)) !== packet.inputChecksum) {
    throw new Error("sidecar_mutated_protected_fields");
  }
  return merged;
}
