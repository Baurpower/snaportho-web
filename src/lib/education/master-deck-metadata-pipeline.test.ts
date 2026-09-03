import assert from "node:assert/strict";
import { MasterDeckMetadataPipeline, MemoryCheckpointStore, LexicalTaxonomyRetriever, buildTaxonomyCandidatePacket, metadataChecksum, resolveProposal, type CardPacket, type MetadataFacet, type TaxonomyCandidate, type TaxonomyTerm } from "./master-deck-metadata-pipeline.ts";

const terms = new Map<string, TaxonomyTerm>([
  ["shoulder", { id: "shoulder", facet: "anatomy", preferredLabel: "Shoulder", ankiSlug: "Shoulder", aliases: [], parentIds: [], active: true }],
  ["sports", { id: "sports", facet: "specialty", preferredLabel: "Sports medicine", ankiSlug: "Sports_Medicine", aliases: [], parentIds: [], active: true }],
  ["trauma", { id: "trauma", facet: "specialty", preferredLabel: "Trauma", ankiSlug: "Trauma", aliases: [], parentIds: [], active: true }],
]);
const candidate = (facet: MetadataFacet): TaxonomyCandidate => ({
  ...(facet === "anatomy" ? terms.get("shoulder")! : terms.get("sports")!),
  matchedAliases: [],
  retrievalScore: 0.9,
});
const packet = buildTaxonomyCandidatePacket("anatomy", "tax-v1", [
  candidate("anatomy"),
  { ...candidate("anatomy"), id: "inactive", active: false },
]);
assert.deepEqual(packet.candidates.map((item) => item.id), ["shoulder"]);
const lexical = new LexicalTaxonomyRetriever([...terms.values()]);

const proposal = {
  facet: "anatomy" as const,
  termId: "shoulder",
  confidence: 0.99,
  evidence: ["front"],
  evidenceSpans: [{ field: "front" as const, start: 0, end: 8, evidenceHash: metadataChecksum("shoulder") }],
  rationaleCodes: ["explicit"],
  agentId: "fixture",
  promptVersion: "v1",
};
const accepted = resolveProposal(proposal, [
  { critic: "clinical_entailment", termId: "shoulder", decision: "support", confidence: 0.99, reasonCodes: [] },
  { critic: "ontology", termId: "shoulder", decision: "support", confidence: 0.99, reasonCodes: [] },
], terms.get("shoulder")!);
assert.equal(accepted.route, "auto_accept");
assert.equal(accepted.ankiTag, "SnapOrtho::Anatomy::Shoulder");
const belowPolicyThreshold = resolveProposal({ ...proposal, confidence: 0.97 }, [
  { critic: "clinical_entailment", termId: "shoulder", decision: "support", confidence: 0.99, reasonCodes: [] },
  { critic: "ontology", termId: "shoulder", decision: "support", confidence: 0.99, reasonCodes: [] },
], terms.get("shoulder")!);
assert.equal(belowPolicyThreshold.route, "rapid_review");

const card: CardPacket = {
  canonicalCardId: "card-1",
  canonicalCardVersionId: "version-1",
  contentHash: "a".repeat(64),
  front: "shoulder instability",
  back: "Bankart lesion",
  existingTags: [],
};
let proposeCalls = 0;
const store = new MemoryCheckpointStore();
const pipeline = new MasterDeckMetadataPipeline(
  { retrieve: async ({ facet }) => facet === "anatomy" ? [candidate(facet)] : facet === "specialty" ? [
    candidate(facet),
    { ...terms.get("trauma")!, matchedAliases: [], retrievalScore: 0.8 },
  ] : [] },
  {
    propose: async ({ facet, taxonomy }) => {
      proposeCalls += 1;
      if (!taxonomy.candidates.length) return [];
      return taxonomy.candidates.map((item) => ({ ...proposal, facet, termId: item.id }));
    },
  },
  {
    review: async ({ proposal: item, critic }) => ({
      critic,
      termId: item.termId,
      decision: "support",
      confidence: 0.95,
      reasonCodes: [],
    }),
  },
  store,
  terms,
);
async function main() {
  const lexicalMatches = await lexical.retrieve({
    card: { canonicalCardId: "x", canonicalCardVersionId: "y", contentHash: "z", front: "Shoulder pain", back: "", existingTags: [] },
    facet: "anatomy",
    limit: 10,
  });
  assert.deepEqual(lexicalMatches.map((item) => item.id), ["shoulder"]);
  const first = await pipeline.run([card], "run-1", { taxonomyVersion: "tax-v1", batchSize: 1, concurrency: 1 });
  assert.equal(proposeCalls, 4, "all four facet agents execute");
  assert.equal(first[0].status, "completed");
  assert.equal(first[0].assertions.length, 3);
  assert.deepEqual(
    first[0].assertions.filter((item) => item.facet === "specialty").map((item) => [item.termId, item.assertionRole, item.route]),
    [["sports", "primary", "rapid_review"], ["trauma", "secondary", "rapid_review"]],
  );
  const resumed = await pipeline.run([card], "run-2", { taxonomyVersion: "tax-v1" });
  assert.equal(proposeCalls, 4, "checkpoint prevents duplicate model calls");
  assert.equal(resumed[0], first[0], "resume returns persisted result");

  const invalidPipeline = new MasterDeckMetadataPipeline(
    { retrieve: async ({ facet }) => facet === "anatomy" ? [candidate(facet)] : [] },
    { propose: async ({ facet, taxonomy }) => taxonomy.candidates.length ? [{ ...proposal, facet, evidenceSpans: [{ field: "front", start: 50, end: 61, evidenceHash: "invalid" }] }] : [] },
    { review: async () => { throw new Error("critic_should_not_run"); } },
    new MemoryCheckpointStore(),
    terms,
  );
  const invalid = await invalidPipeline.run([card], "run-invalid", { taxonomyVersion: "tax-v1" });
  assert.equal(invalid[0].status, "failed");
  assert.equal(invalid[0].failure?.code, "invalid_evidence_span");

  console.log("master-deck-metadata-pipeline.test.ts: all assertions passed");
}

void main();
