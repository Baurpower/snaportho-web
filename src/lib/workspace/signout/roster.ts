/**
 * Display helpers for the full-visibility rounds roster (table view).
 * Pure / dependency-free so the UI can show everything without click-to-reveal.
 */

import { splitFields } from "@/lib/workspace/signout/fields";
import {
  computeNextOr,
  computePod,
  computeTxDay,
  nextOrChip,
  podChip,
  txDayChip,
  type NextOrInfo,
  type PodInfo,
  type TxDayInfo,
} from "@/lib/workspace/signout/pod";
import { WB_TERMS, extractTags, parseBody, sectionTitle } from "@/lib/workspace/signout/tokens";
import type { SignoutCard } from "@/lib/workspace/signout/types";
import { formatDiagnosticsText } from "@/lib/workspace/signout/diagnostics";

export type WbStatus = (typeof WB_TERMS)[number];

const WB_SET = new Set<string>(WB_TERMS);

const OPEN_ITEM_RE = /^\s*\[\s\]\s*(.*)$/;
const DONE_ITEM_RE = /^\s*\[[xX]\]\s*(.*)$/;
// Prose plan lines that look like bullets but aren't checkboxes.
const BULLET_RE = /^\s*[-*•]\s+(.*)$/;

/** Weight-bearing terms found in body text (order preserved, unique). */
export function extractWeightBearing(body: string): WbStatus[] {
  if (!body) return [];
  const found: WbStatus[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(/\b(NWB|TTWB|PWB|WBAT|FWB)\b/gi)) {
    const upper = match[1].toUpperCase() as WbStatus;
    if (!WB_SET.has(upper) || seen.has(upper)) continue;
    seen.add(upper);
    found.push(upper);
  }
  return found;
}

/** Lead text before any ## section — full multi-line, not a single truncated line. */
export function rosterOneLiner(body: string): string {
  return splitFields(body).lead.trim();
}

export type OpenTodo = {
  text: string;
  /** Absolute line index in the body, for future toggle-from-table. */
  lineIndex: number;
  section: string | null;
};

/**
 * Open checkbox items (`[ ]`) across the whole body, in order.
 * Done items are excluded — roster focuses on what still needs action.
 */
export function extractOpenTodos(body: string): OpenTodo[] {
  const out: OpenTodo[] = [];
  let section: string | null = null;
  body.split("\n").forEach((raw, lineIndex) => {
    const heading = sectionTitle(raw);
    if (heading !== null) {
      section = heading;
      return;
    }
    const m = OPEN_ITEM_RE.exec(raw);
    if (!m) return;
    const text = m[1].trim();
    if (text) out.push({ text, lineIndex, section });
  });
  return out;
}

/**
 * Plan block for the roster: open todos + non-checkbox prose under ## Plan
 * (and any lead-level open todos already counted once).
 */
export function rosterPlanBlock(body: string): {
  openTodos: OpenTodo[];
  planProse: string[];
  empty: boolean;
} {
  const fields = splitFields(body);
  const openTodos = extractOpenTodos(body).filter(
    (item) => item.section?.toLowerCase() !== "dispo barriers"
  );

  const planRaw = (fields.values["Plan"] ?? "").trim();
  const planProse: string[] = [];
  if (planRaw) {
    for (const line of planRaw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Skip checkbox lines — already in openTodos (or done).
      if (OPEN_ITEM_RE.test(trimmed) || DONE_ITEM_RE.test(trimmed)) continue;
      const bullet = BULLET_RE.exec(trimmed);
      planProse.push(bullet ? bullet[1].trim() : trimmed);
    }
  }

  return {
    openTodos,
    planProse,
    empty: openTodos.length === 0 && planProse.length === 0,
  };
}

export type ClinicalExtra = {
  title: string;
  text: string;
};

/** HPI/Exam and Labs/Imaging/PT when present — for optional muted roster blocks. */
export function rosterClinicalExtras(body: string): ClinicalExtra[] {
  const fields = splitFields(body);
  const out: ClinicalExtra[] = [];
  for (const key of ["HPI/Exam", "Labs/Imaging/PT"] as const) {
    const text = (fields.values[key] ?? "").trim();
    if (text) out.push({ title: key, text });
  }
  return out;
}

export type RosterRowModel = {
  location: string;
  patient: string;
  attending: string;
  surgery: string;
  surgeryDate: string;
  nextSurgery: string;
  nextSurgeryDate: string;
  /** True when management is non-operative (tx + start date, not surgery POD). */
  nonOp: boolean;
  pod: PodInfo | null;
  txDay: TxDayInfo | null;
  nextOr: NextOrInfo | null;
  /** Chip text: POD n / Pre-op / Non-op / Day n */
  podLabel: string | null;
  /** Chip text for planned return OR */
  nextOrLabel: string | null;
  weightBearing: WbStatus[];
  tags: string[];
  oneLiner: string;
  openTodos: OpenTodo[];
  planProse: string[];
  planEmpty: boolean;
  disposition: string;
  dispoBarriers: OpenTodo[];
  clinicalExtras: ClinicalExtra[];
};

/** Everything the full-visibility table needs for one card. */
export function buildRosterRow(card: SignoutCard): RosterRowModel {
  const body = card.body ?? "";
  const fields = splitFields(body);
  const plan = rosterPlanBlock(body);
  const dispoBarriers = extractOpenTodos(body).filter(
    (item) => item.section?.toLowerCase() === "dispo barriers"
  );
  const nonOp = card.managementMode === "nonop";
  const txDay = nonOp ? computeTxDay(card.surgeryDate) : null;
  const pod = nonOp ? null : computePod(card.surgeryDate);
  const nextOr = nonOp ? null : computeNextOr(card.nextSurgeryDate);
  // Non-op with a start date shows Day n; without date, plain "Non-op".
  const podLabel = nonOp
    ? txDayChip(card.surgeryDate) ?? "Non-op"
    : podChip(card.surgeryDate);
  return {
    location: card.location?.trim() ?? "",
    patient: card.handle?.trim() ?? "",
    attending: card.attending?.trim() ?? "",
    surgery: card.surgery?.trim() ?? "",
    surgeryDate: card.surgeryDate ?? "",
    nextSurgery: card.nextSurgery?.trim() ?? "",
    nextSurgeryDate: card.nextSurgeryDate ?? "",
    nonOp,
    pod,
    txDay,
    nextOr,
    podLabel,
    nextOrLabel: nonOp ? null : nextOrChip(card.nextSurgeryDate),
    weightBearing: extractWeightBearing(body),
    tags: extractTags(body),
    oneLiner: rosterOneLiner(body),
    openTodos: plan.openTodos,
    planProse: plan.planProse,
    planEmpty: plan.empty,
    disposition: (fields.values["Dispo"] ?? "").trim(),
    dispoBarriers,
    clinicalExtras: rosterClinicalExtras(body),
  };
}

/** Soft-clamp long clinical extras for density (plan/one-liner stay full). */
export function clampLines(text: string, maxLines: number): { text: string; clipped: boolean } {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return { text, clipped: false };
  return { text: lines.slice(0, maxLines).join("\n"), clipped: true };
}

/**
 * Column text for a Google-Doc-style roster table.
 * Clinical = one-liner + HPI/Exam; Labs = Labs/Imaging/PT; Plan = open todos + plan prose.
 */
export function rosterTableColumns(card: SignoutCard): {
  clinical: string;
  labs: string;
  plan: string;
  dispo: string;
  row: RosterRowModel;
} {
  const row = buildRosterRow(card);
  const hpi = row.clinicalExtras.find((e) => e.title === "HPI/Exam")?.text ?? "";
  const legacyLabs = row.clinicalExtras.find((e) => e.title === "Labs/Imaging/PT")?.text ?? "";
  const structuredLabs = formatDiagnosticsText(card.diagnostics, 3);
  const labs = [structuredLabs, legacyLabs].filter(Boolean).join("\n");
  const clinicalParts = [row.oneLiner, hpi].filter(Boolean);
  const planParts = [
    ...row.openTodos.map((t) => `☐ ${t.text}`),
    ...row.planProse,
  ];
  return {
    clinical: clinicalParts.join("\n\n"),
    labs,
    plan: planParts.join("\n"),
    dispo: [
      row.disposition,
      ...row.dispoBarriers.map((item) => `☐ ${item.text}`),
    ]
      .filter(Boolean)
      .join("\n"),
    row,
  };
}

// Re-export for callers that only need parseBody side effects elsewhere.
export { parseBody };
