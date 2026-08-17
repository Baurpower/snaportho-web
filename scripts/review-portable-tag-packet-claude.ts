/**
 * review-portable-tag-packet-claude.ts
 *
 * Claude (Anthropic) reviewer for the official-deck tag pipeline — the automated
 * analog of review-portable-tag-packet-openai.ts. Reads a brief (or pending
 * packet), asks Claude to tag the primary teaching subject per card, validates
 * every assertion against the listed candidates + exact front/back quotes, and
 * writes a *-sidecar.json labeled reviewer.provider="anthropic".
 *
 * The sidecar then feeds the existing deterministic flow unchanged:
 *   apply-tag-review-sidecar.ts  ->  *-reviewed.json  ->  (verify)  ->  review-import
 *
 * Requirements to RUN (not present in every environment):
 *   - `@anthropic-ai/sdk` installed:  npm i @anthropic-ai/sdk
 *   - a credential resolvable by the zero-arg client: ANTHROPIC_API_KEY, or
 *     ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile. It also reads
 *     ANTHROPIC_BASE_URL if set. Fails closed with a clear message otherwise.
 *
 * Usage:
 *   node --experimental-strip-types scripts/review-portable-tag-packet-claude.ts \
 *     --brief=<...-brief.json> --pending=<...-pending.json> --out=<...-sidecar.json> \
 *     [--model=claude-opus-5] [--group-size=5]
 *
 * This never rewrites the pending packet. It only reads it (for identity +
 * candidates + front/back) and writes the sidecar to --out.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Facet = "anatomy" | "diagnosis" | "treatment" | "specialty";
const FACETS: Facet[] = ["anatomy", "diagnosis", "treatment", "specialty"];

function arg(name: string, required = true): string | undefined {
  const prefix = `${name}=`;
  const match = process.argv.find((v) => v.startsWith(prefix));
  if (!match) { if (required) throw new Error(`${name} is required`); return undefined; }
  return match.slice(prefix.length);
}

function loadEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const at = clean.indexOf("=");
    out[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

type BriefCard = {
  canonicalCardVersionId: string;
  front: string;
  back: string;
  deckPath: string;
  existingTags: string[];
  priorAssertions?: Array<{ facet: Facet; preferredLabel: string }>;
  candidates: Record<Facet, Array<{ termId: string; preferredLabel: string }>>;
};
type Assertion = { facet: Facet; termId: string; confidence: number; evidence: Array<{ field: "front" | "back"; quote: string }>; rationaleCodes: string[] };

function validateCard(card: BriefCard, review: Record<string, any>): {
  assertions: Assertion[]; reviewNotes: string[]; missingConcepts: any[];
} {
  const assertions = Array.isArray(review.assertions) ? (review.assertions as Assertion[]) : [];
  const candIds: Record<string, Set<string>> = {};
  for (const f of FACETS) candIds[f] = new Set((card.candidates[f] ?? []).map((t) => t.termId));
  const seen = new Set<string>();
  for (const a of assertions) {
    const key = `${a.facet}:${a.termId}`;
    if (!FACETS.includes(a.facet)) throw new Error(`invalid_facet:${card.canonicalCardVersionId}:${a.facet}`);
    if (!Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1) throw new Error(`invalid_confidence:${key}`);
    if (seen.has(key)) throw new Error(`duplicate_assertion:${key}`);
    seen.add(key);
    if (!candIds[a.facet].has(a.termId)) throw new Error(`term_not_allowed:${card.canonicalCardVersionId}:${key}`);
    if (!Array.isArray(a.evidence) || a.evidence.length === 0) throw new Error(`evidence_required:${key}`);
    for (const ev of a.evidence) {
      const hay = ev.field === "front" ? card.front : ev.field === "back" ? card.back : undefined;
      if (hay === undefined || !hay.includes(ev.quote)) throw new Error(`evidence_not_exact:${card.canonicalCardVersionId}:${key}`);
    }
    if (!Array.isArray(a.rationaleCodes) || a.rationaleCodes.some((c) => !/^[a-z0-9_]+$/.test(c))) throw new Error(`invalid_rationale_codes:${key}`);
  }
  return {
    assertions,
    reviewNotes: Array.isArray(review.reviewNotes) ? review.reviewNotes.map(String).slice(0, 10) : [],
    missingConcepts: Array.isArray(review.missingConcepts) ? review.missingConcepts : [],
  };
}

async function main() {
  const briefPath = arg("--brief", false);
  const pendingPath = arg("--pending")!;
  const outPath = path.resolve(arg("--out")!);
  const pending = JSON.parse(readFileSync(path.resolve(pendingPath), "utf8"));
  if (pending.schemaVersion !== "snaportho-portable-tag-review-packet.2") throw new Error("unsupported_packet_version");

  // Prefer the brief for the review view; fall back to deriving it from pending.
  const brief = briefPath && existsSync(path.resolve(briefPath))
    ? JSON.parse(readFileSync(path.resolve(briefPath), "utf8"))
    : { batchKey: pending.batchKey, inputChecksum: pending.inputChecksum, cards: pending.cards };
  const cards: BriefCard[] = brief.cards;

  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  const model = arg("--model", false) ?? env.MASTER_DECK_METADATA_CLAUDE_MODEL ?? "claude-opus-5";
  const groupSize = Number(arg("--group-size", false) ?? 5);
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10) throw new Error("invalid_group_size");

  let Anthropic: any;
  try { ({ default: Anthropic } = await import("@anthropic-ai/sdk")); }
  catch { throw new Error("@anthropic-ai/sdk is not installed. Run: npm i @anthropic-ai/sdk"); }
  // Zero-arg client resolves ANTHROPIC_API_KEY | ANTHROPIC_AUTH_TOKEN | ant profile,
  // and ANTHROPIC_BASE_URL if set.
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error("No Anthropic credential found (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login`).");
  }
  const client = new Anthropic();

  const instructions: string[] = Array.isArray(pending.instructions) ? pending.instructions : [];
  const reviewedCards: any[] = [];

  for (let offset = 0; offset < cards.length; offset += groupSize) {
    const group = cards.slice(offset, offset + groupSize);
    const system = [
      "You are performing a meticulous orthopaedic Anki tag review.",
      ...instructions,
      "Tag ONLY the primary teaching subject across anatomy, diagnosis, treatment, and specialty.",
      "Use only listed candidate termIds. Every assertion needs an exact quote from front or back.",
      "Do NOT tag incidental anatomy, differentials, complications, structures-at-risk, or explanation-only mentions.",
      "Empty facet output is valid. Record missingConcepts when the right concept is absent from candidates.",
      "Return ONLY minified JSON: {\"reviews\":[{\"canonicalCardVersionId\":string,\"assertions\":[{\"facet\":string,\"termId\":string,\"confidence\":number,\"evidence\":[{\"field\":\"front\"|\"back\",\"quote\":string}],\"rationaleCodes\":[string]}],\"reviewNotes\":[string],\"missingConcepts\":[{\"facet\":string,\"preferredLabel\":string,\"rationale\":string}]}]} — one review per input card.",
    ].join("\n");
    const user = JSON.stringify({ cards: group.map((c) => ({
      canonicalCardVersionId: c.canonicalCardVersionId,
      front: c.front, back: c.back, deckPath: c.deckPath, existingTags: c.existingTags,
      priorAssertions: c.priorAssertions ?? [], candidates: c.candidates,
    })) });

    const resp = await client.messages.create({
      model, max_tokens: 8000, system,
      messages: [{ role: "user", content: user }],
    });
    const text: string = (resp.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const jsonStart = text.indexOf("{");
    const parsed = JSON.parse(jsonStart >= 0 ? text.slice(jsonStart) : text) as { reviews?: Array<Record<string, any>> };
    const byId = new Map((parsed.reviews ?? []).map((r) => [r.canonicalCardVersionId, r]));
    for (const card of group) {
      const review = byId.get(card.canonicalCardVersionId);
      if (!review) throw new Error(`review_missing:${card.canonicalCardVersionId}`);
      const v = validateCard(card, review);
      reviewedCards.push({ canonicalCardVersionId: card.canonicalCardVersionId, reviewStatus: "completed", ...v });
    }
    console.log(JSON.stringify({ reviewed: reviewedCards.length, total: cards.length }));
  }

  const sidecar = {
    batchKey: pending.batchKey,
    inputChecksum: pending.inputChecksum,
    reviewer: { provider: "anthropic", model, reviewedAt: new Date().toISOString() },
    cards: reviewedCards,
  };
  writeFileSync(outPath, `${JSON.stringify(sidecar, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(JSON.stringify({ wrote: outPath, cards: reviewedCards.length, assertions: reviewedCards.reduce((s, c) => s + c.assertions.length, 0), provider: "anthropic", model }));
}

main().catch((err) => { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
