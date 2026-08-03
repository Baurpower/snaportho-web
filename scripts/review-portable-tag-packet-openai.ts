import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

type Facet = "anatomy" | "diagnosis" | "treatment" | "specialty";
type Args = Map<string, string>;
type Assertion = {
  facet: Facet;
  termId: string;
  confidence: number;
  evidence: Array<{ field: "front" | "back"; quote: string }>;
  rationaleCodes: string[];
};
type PacketCard = {
  canonicalCardVersionId: string;
  front: string;
  back: string;
  deckPath: string;
  existingTags: string[];
  candidates: Record<Facet, Array<{ termId: string; preferredLabel: string }>>;
  reviewStatus?: "completed";
  reviewNotes?: string[];
  missingConcepts?: Array<{ facet: Facet; preferredLabel: string; rationale: string }>;
  assertions: Assertion[];
};
type Packet = {
  schemaVersion: string;
  instructions: string[];
  reviewer?: { provider: string; model: string; reviewedAt: string };
  cards: PacketCard[];
};

function parseArgs(values: string[]): Args {
  const args = new Map<string, string>();
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const at = value.indexOf("=");
    args.set(at < 0 ? value : value.slice(0, at), at < 0 ? "true" : value.slice(at + 1));
  }
  return args;
}

function loadEnv(file: string) {
  const values: Record<string, string> = {};
  if (!existsSync(file)) return values;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#") || !clean.includes("=")) continue;
    const at = clean.indexOf("=");
    values[clean.slice(0, at).trim()] = clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function validateReview(card: PacketCard, result: Record<string, any>) {
  const assertions = Array.isArray(result.assertions) ? result.assertions as Assertion[] : [];
  const seen = new Set<string>();
  for (const assertion of assertions) {
    if (!(["anatomy", "diagnosis", "treatment", "specialty"] as string[]).includes(assertion.facet))
      throw new Error(`invalid_facet:${card.canonicalCardVersionId}`);
    if (!Number.isFinite(assertion.confidence) || assertion.confidence < 0 || assertion.confidence > 1)
      throw new Error(`invalid_confidence:${card.canonicalCardVersionId}`);
    const key = `${assertion.facet}:${assertion.termId}`;
    if (seen.has(key)) throw new Error(`duplicate_assertion:${card.canonicalCardVersionId}:${key}`);
    seen.add(key);
    if (!card.candidates[assertion.facet].some((candidate) => candidate.termId === assertion.termId))
      throw new Error(`term_not_allowed:${card.canonicalCardVersionId}:${key}`);
    if (!Array.isArray(assertion.evidence) || assertion.evidence.length === 0)
      throw new Error(`evidence_required:${card.canonicalCardVersionId}:${key}`);
    for (const evidence of assertion.evidence) {
      if (!(["front", "back"] as string[]).includes(evidence.field) || !card[evidence.field].includes(evidence.quote))
        throw new Error(`evidence_not_exact:${card.canonicalCardVersionId}:${key}`);
    }
    if (!Array.isArray(assertion.rationaleCodes) || assertion.rationaleCodes.some((code) => !/^[a-z0-9_]+$/.test(code)))
      throw new Error(`invalid_rationale_codes:${card.canonicalCardVersionId}:${key}`);
  }
  card.assertions = assertions;
  card.reviewNotes = Array.isArray(result.reviewNotes) ? result.reviewNotes.map(String).slice(0, 10) : [];
  card.missingConcepts = Array.isArray(result.missingConcepts) ? result.missingConcepts : [];
  card.reviewStatus = "completed";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.get("--input");
  if (!input) throw new Error("--input is required");
  const packetPath = path.resolve(input);
  const packet = JSON.parse(readFileSync(packetPath, "utf8")) as Packet;
  if (packet.schemaVersion !== "snaportho-portable-tag-review-packet.2") throw new Error("unsupported_packet_version");
  const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY required");
  const model = args.get("--model") ?? env.MASTER_DECK_METADATA_MODEL ?? env.BROBOT_STRONG_MODEL ?? "gpt-4o";
  const groupSize = Number(args.get("--group-size") ?? 5);
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10) throw new Error("invalid_group_size");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const pending = packet.cards.filter((card) => card.reviewStatus !== "completed");
  for (let offset = 0; offset < pending.length; offset += groupSize) {
    const group = pending.slice(offset, offset + groupSize);
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are performing a meticulous orthopaedic Anki tag review.",
            ...packet.instructions,
            "Return JSON {reviews:[{canonicalCardVersionId,assertions,reviewNotes,missingConcepts}]}, one review per input card.",
            "Each assertion has facet, termId, confidence, evidence:[{field,quote}], rationaleCodes.",
            "Quotes must be exact substrings. Prefer a small precise tag set. Do not omit a clearly supported central specialty or anatomy target.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({ cards: group.map((card) => ({
            canonicalCardVersionId: card.canonicalCardVersionId,
            front: card.front,
            back: card.back,
            deckPath: card.deckPath,
            existingTags: card.existingTags,
            candidates: card.candidates,
          })) }),
        },
      ],
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as { reviews?: Array<Record<string, any>> };
    const reviews = new Map((parsed.reviews ?? []).map((review) => [review.canonicalCardVersionId, review]));
    for (const card of group) {
      const review = reviews.get(card.canonicalCardVersionId);
      if (!review) throw new Error(`review_missing:${card.canonicalCardVersionId}`);
      validateReview(card, review);
    }
    packet.reviewer = { provider: "openai", model, reviewedAt: new Date().toISOString() };
    writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({ packet: packetPath, completed: packet.cards.filter((card) => card.reviewStatus === "completed").length, total: packet.cards.length }));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
