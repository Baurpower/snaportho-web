/**
 * validate-tag-review-sidecar.ts
 *
 * Fail-closed validator for a tag-review sidecar (review OR verify) against its
 * source packet. This is reviewer-agnostic: it guards sidecars written by the
 * Grok workflow, the Claude API reviewer, or an in-session Claude reviewer.
 *
 * The deterministic merge (apply-tag-review-sidecar.ts) already checks batchKey,
 * checksum, card count, and that protected fields are unchanged. It does NOT
 * check that each assertion's termId is a listed candidate or that each evidence
 * quote is an exact substring of front/back. This validator adds exactly those
 * clinical-contract checks, so a hand- or model-authored sidecar can be caught
 * before it reaches the merge/import.
 *
 * Usage:
 *   node --experimental-strip-types scripts/validate-tag-review-sidecar.ts \
 *     --packet=<pending-or-reviewed.json> --sidecar=<sidecar.json>
 *
 * Exits non-zero (and prints the failures) if anything is invalid.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error Direct Node strip-types runner imports TypeScript source.
import type {
  PortableTagReviewPacket,
  TagReviewSidecar,
  MetadataFacet,
} from "../src/lib/education/portable-tag-review-packet.ts";

const FACETS: MetadataFacet[] = ["anatomy", "diagnosis", "treatment", "specialty"];

function arg(name: string): string {
  const prefix = `${name}=`;
  const match = process.argv.find((v) => v.startsWith(prefix));
  if (!match) throw new Error(`${name} is required`);
  return match.slice(prefix.length);
}

const packet = JSON.parse(readFileSync(path.resolve(arg("--packet")), "utf8")) as PortableTagReviewPacket;
const sidecar = JSON.parse(readFileSync(path.resolve(arg("--sidecar")), "utf8")) as TagReviewSidecar;

const errors: string[] = [];

// Top-level identity
if (sidecar.batchKey !== packet.batchKey) errors.push(`batchKey mismatch: ${sidecar.batchKey} != ${packet.batchKey}`);
if (sidecar.inputChecksum !== packet.inputChecksum) errors.push("inputChecksum mismatch");
if (!sidecar.reviewer?.provider?.trim() || !sidecar.reviewer.model?.trim() || !Number.isFinite(Date.parse(sidecar.reviewer.reviewedAt))) {
  errors.push("reviewer block requires non-empty provider, model, and a valid reviewedAt");
}

// One sidecar card per packet card, same ids, same order
const packetCards = packet.cards;
const sidecarByV = new Map(sidecar.cards.map((c) => [c.canonicalCardVersionId, c]));
if (sidecarByV.size !== sidecar.cards.length) errors.push("duplicate canonicalCardVersionId in sidecar");
if (sidecar.cards.length !== packetCards.length) errors.push(`card count: sidecar ${sidecar.cards.length} != packet ${packetCards.length}`);

for (const card of packetCards) {
  const sc = sidecarByV.get(card.canonicalCardVersionId);
  const where = `card ${card.canonicalCardVersionId}`;
  if (!sc) { errors.push(`${where}: missing from sidecar`); continue; }
  if (sc.reviewStatus !== "completed") errors.push(`${where}: reviewStatus must be "completed"`);

  const candIds: Record<string, Set<string>> = {};
  for (const f of FACETS) candIds[f] = new Set((card.candidates[f] ?? []).map((t) => t.termId));

  const seen = new Set<string>();
  for (const a of sc.assertions ?? []) {
    const key = `${a.facet}:${a.termId}`;
    if (!FACETS.includes(a.facet)) errors.push(`${where}: invalid facet ${a.facet}`);
    if (seen.has(key)) errors.push(`${where}: duplicate assertion ${key}`);
    seen.add(key);
    if (!Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1) errors.push(`${where}: bad confidence for ${key}`);
    // termId must be a listed candidate for its facet (never-invent-terms guard)
    if (a.facet && !candIds[a.facet]?.has(a.termId)) errors.push(`${where}: termId not in ${a.facet} candidates (${key})`);
    // evidence: at least one, each an exact substring of the named field
    if (!Array.isArray(a.evidence) || a.evidence.length === 0) errors.push(`${where}: ${key} has no evidence`);
    for (const ev of a.evidence ?? []) {
      if (ev.field !== "front" && ev.field !== "back") { errors.push(`${where}: ${key} evidence.field must be front|back`); continue; }
      const hay = ev.field === "front" ? card.front : card.back;
      if (typeof ev.quote !== "string" || !hay.includes(ev.quote)) errors.push(`${where}: ${key} quote not an exact substring of ${ev.field}: "${ev.quote}"`);
    }
    if (!Array.isArray(a.rationaleCodes) || a.rationaleCodes.some((c) => !/^[a-z0-9_]+$/.test(c))) errors.push(`${where}: ${key} bad rationaleCodes`);
  }
}

const nAssert = sidecar.cards.reduce((s, c) => s + (c.assertions?.length ?? 0), 0);
if (errors.length) {
  console.error(JSON.stringify({ valid: false, batchKey: sidecar.batchKey, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ valid: true, batchKey: sidecar.batchKey, cards: sidecar.cards.length, assertions: nAssert, reviewer: sidecar.reviewer }, null, 2));
}
