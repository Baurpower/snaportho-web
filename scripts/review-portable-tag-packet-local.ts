import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Facet = "anatomy" | "diagnosis" | "treatment" | "specialty";
type Candidate = { termId: string; preferredLabel: string };
type Card = {
  canonicalCardVersionId: string; front: string; back: string; deckPath: string; existingTags: string[];
  candidates: Record<Facet, Candidate[]>; assertions: any[]; reviewStatus?: "completed";
  reviewNotes?: string[]; missingConcepts?: Array<{ facet: Facet; preferredLabel: string; rationale: string }>;
};
type Packet = { schemaVersion: string; reviewer?: { provider: string; model: string; reviewedAt: string }; cards: Card[] };

const input = process.argv.find((value) => value.startsWith("--input="))?.slice(8);
const force = process.argv.includes("--force");
if (!input) throw new Error("--input required");
const file = path.resolve(input);
const packet = JSON.parse(readFileSync(file, "utf8")) as Packet;
if (packet.schemaVersion !== "snaportho-portable-tag-review-packet.2") throw new Error("unsupported_packet");

const specialtyRules: Array<[RegExp, string]> = [
  [/Pediatrics/i, "Pediatric Orthopedics"], [/Foot(?:\s*&\s*|\s*and\s*)Ankle|Foot\/Ankle/i, "Foot and Ankle"],
  [/Shoulder|Elbow/i, "Shoulder and Elbow"], [/Hand|Wrist|Forearm/i, "Hand and Upper Extremity"],
  [/Spine/i, "Spine"], [/Bone Tumors|Tumor|Pathology/i, "Orthopedic Oncology"],
  [/Basic Science|Anatomy/i, "Basic Science"], [/Recon|Arthroplasty|Hip and Knee Book/i, "Adult Reconstruction"],
  [/Knee & Sports|Sports/i, "Sports Medicine"], [/Trauma|Fracture|Dislocation/i, "Trauma"],
];
const genericAnatomy = /(?:Hub|Orthopaedic Anatomy|Imaging Anatomy Landmarks)$/i;
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function quoteFor(text: string, label: string) {
  const lower = text.toLowerCase(); const at = lower.indexOf(label.toLowerCase());
  return at >= 0 ? text.slice(at, at + label.length) : "";
}
function assertion(facet: Facet, candidate: Candidate, field: "front" | "back", quote: string, confidence: number, reason: string) {
  return { facet, termId: candidate.termId, confidence, evidence: [{ field, quote }], rationaleCodes: [reason, "local_portable_pilot"] };
}

for (const card of packet.cards) {
  if (card.reviewStatus === "completed" && !force) continue;
  card.assertions = []; card.reviewNotes = []; card.missingConcepts = [];
  const text = `${card.front} ${card.back}`;
  if (/^[a-f0-9]{24,}-oa-\d+$/i.test(card.front.trim()) && !card.back.trim()) {
    card.reviewNotes.push("image_occlusion_content_unavailable_for_text_review");
    card.missingConcepts.push({ facet: "anatomy", preferredLabel: "Image review required", rationale: "The packet contains only an image-occlusion identifier." });
    card.reviewStatus = "completed"; continue;
  }

  const specialtyNames = new Set<string>();
  for (const [pattern, label] of specialtyRules) if (pattern.test(card.deckPath)) specialtyNames.add(label);
  for (const label of specialtyNames) {
    const candidate = card.candidates.specialty.find((item) => item.preferredLabel === label);
    if (!candidate) continue;
    const quote = card.front.slice(0, Math.min(120, card.front.length));
    if (quote) card.assertions.push(assertion("specialty", candidate, "front", quote, label === "Trauma" ? 0.94 : 0.97, "deck_and_card_primary_domain"));
  }

  for (const facet of ["anatomy", "diagnosis", "treatment"] as const) {
    const scored = card.candidates[facet].flatMap((candidate) => {
      if (facet === "anatomy" && genericAnatomy.test(candidate.preferredLabel)) return [];
      const frontQuote = quoteFor(card.front, candidate.preferredLabel);
      const backQuote = quoteFor(card.back, candidate.preferredLabel);
      const deckLeaf = normalize(card.deckPath.split("::").at(-1) ?? "");
      const label = normalize(candidate.preferredLabel);
      const deckMatch = label.length >= 5 && (deckLeaf.includes(label) || label.includes(deckLeaf));
      let score = frontQuote ? 3 : backQuote ? 1 : 0;
      if (deckMatch) score += 3;
      if (facet === "treatment" && /\b(?:ORIF|arthroplasty|repair|rehabilitation|approach|fixation|management)\b/i.test(candidate.preferredLabel) && frontQuote) score += 1;
      if (!score || (!frontQuote && !backQuote)) return [];
      return [{ candidate, quote: frontQuote || backQuote, field: (frontQuote ? "front" : "back") as "front" | "back", score }];
    }).sort((a, b) => b.score - a.score || b.candidate.preferredLabel.length - a.candidate.preferredLabel.length);
    const limit = facet === "anatomy" ? 3 : facet === "diagnosis" ? 2 : 2;
    const accepted: typeof scored = [];
    for (const item of scored) {
      if (accepted.some((prior) => normalize(prior.candidate.preferredLabel).includes(normalize(item.candidate.preferredLabel)))) continue;
      if (item.score < (facet === "diagnosis" ? 3 : 2)) continue;
      accepted.push(item); if (accepted.length >= limit) break;
    }
    for (const item of accepted) card.assertions.push(assertion(facet, item.candidate, item.field, item.quote, item.score >= 6 ? 0.99 : item.score >= 3 ? 0.97 : 0.9, "explicit_primary_subject"));
  }
  if (!card.assertions.some((item) => item.facet === "diagnosis") && /SCFE|Marfan|arthritis|rupture|fracture|sprain|syndrome|osteosarcoma|flatfoot/i.test(card.front)) {
    card.reviewNotes.push("central_diagnosis_candidate_missing_or_not_exactly_retrieved");
  }
  card.reviewStatus = "completed";
}
packet.reviewer = { provider: "codex", model: "codex-in-task-local-review-pilot", reviewedAt: new Date().toISOString() };
writeFileSync(file, `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({ file, cards: packet.cards.length, completed: packet.cards.filter((card) => card.reviewStatus === "completed").length, assertions: packet.cards.reduce((sum, card) => sum + card.assertions.length, 0), notes: packet.cards.reduce((sum, card) => sum + (card.reviewNotes?.length ?? 0), 0) }, null, 2));
