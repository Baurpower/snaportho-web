import { createHash } from "node:crypto";

export const METADATA_PIPELINE_VERSION = "snaportho-master-metadata.v1" as const;
export const METADATA_FACETS = ["anatomy", "diagnosis", "treatment", "specialty"] as const;
export type MetadataFacet = (typeof METADATA_FACETS)[number];
export type ProposalDecision = "accept" | "review" | "reject";

export type CardPacket = {
  canonicalCardId: string;
  canonicalCardVersionId: string;
  contentHash: string;
  front: string;
  back: string;
  existingTags: string[];
  deckPath?: string;
};

export type TaxonomyTerm = {
  id: string;
  facet: MetadataFacet;
  preferredLabel: string;
  ankiSlug: string;
  aliases: string[];
  parentIds: string[];
  active: boolean;
};

export type TaxonomyCandidate = TaxonomyTerm & {
  matchedAliases: string[];
  retrievalScore: number;
};

export type TaxonomyCandidatePacket = {
  taxonomyVersion: string;
  facet: MetadataFacet;
  candidates: TaxonomyCandidate[];
  checksum: string;
};

export type FacetProposal = {
  facet: MetadataFacet;
  termId: string;
  confidence: number;
  evidence: string[];
  evidenceSpans: Array<{ field: "front" | "back"; start: number; end: number; evidenceHash: string }>;
  rationaleCodes: string[];
  agentId: string;
  promptVersion: string;
};

export type CriticFinding = {
  critic: "clinical_entailment" | "ontology";
  termId: string;
  decision: "support" | "oppose" | "uncertain";
  confidence: number;
  reasonCodes: string[];
};

export type RoutedAssertion = {
  facet: MetadataFacet;
  termId: string;
  assertionRole: "primary" | "secondary";
  decision: ProposalDecision;
  riskTier: "low" | "medium" | "high";
  route: "auto_accept" | "rapid_review" | "clinical_review" | "taxonomy_review" | "reject";
  confidence: number;
  reasonCodes: string[];
  evidence: string[];
  ankiTag: string;
};

export type CardPipelineResult = {
  contractVersion: typeof METADATA_PIPELINE_VERSION;
  runId: string;
  batchId: string;
  card: Pick<CardPacket, "canonicalCardId" | "canonicalCardVersionId" | "contentHash">;
  inputChecksum: string;
  status: "completed" | "failed";
  proposals: FacetProposal[];
  criticFindings: CriticFinding[];
  assertions: RoutedAssertion[];
  failure?: { code: string; message: string; retryable: boolean };
};

export interface TaxonomyRetriever {
  retrieve(input: { card: CardPacket; facet: MetadataFacet; limit: number }): Promise<TaxonomyCandidate[]>;
}

function lexicalTokens(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/** Deterministic, dependency-free candidate retrieval suitable for the full taxonomy. */
export class LexicalTaxonomyRetriever implements TaxonomyRetriever {
  private readonly taxonomy: readonly TaxonomyTerm[];
  constructor(taxonomy: readonly TaxonomyTerm[]) { this.taxonomy = taxonomy; }
  async retrieve({ card, facet, limit }: { card: CardPacket; facet: MetadataFacet; limit: number }) {
    const text = `${card.front} ${card.back} ${card.existingTags.join(" ")} ${card.deckPath ?? ""}`.toLocaleLowerCase();
    const cardTokens = lexicalTokens(text);
    return this.taxonomy
      .filter((term) => term.active && term.facet === facet)
      .map((term): TaxonomyCandidate => {
        const labels = [term.preferredLabel, ...term.aliases];
        const matchedAliases = labels.filter((label) => text.includes(label.toLocaleLowerCase()));
        const termTokens = lexicalTokens(labels.join(" "));
        const overlap = [...termTokens].filter((token) => cardTokens.has(token)).length;
        const retrievalScore = Math.min(1, (matchedAliases.length ? 0.75 : 0) + 0.25 * overlap / Math.max(1, termTokens.size));
        return { ...term, matchedAliases, retrievalScore };
      })
      // The specialty vocabulary is intentionally small and specialty is often
      // implied by anatomy/deck context rather than named verbatim.
      .filter((term) => term.retrievalScore > 0 || facet === "specialty")
      .map((term) => facet === "specialty" && term.retrievalScore === 0
        ? { ...term, retrievalScore: 0.01 }
        : term)
      .sort((a, b) => b.retrievalScore - a.retrievalScore || a.id.localeCompare(b.id))
      .slice(0, Math.max(1, limit));
  }
}

export interface MetadataAgentAdapter {
  propose(input: {
    card: CardPacket;
    facet: MetadataFacet;
    taxonomy: TaxonomyCandidatePacket;
  }): Promise<FacetProposal[]>;
}

export interface MetadataCriticAdapter {
  review(input: {
    card: CardPacket;
    proposal: FacetProposal;
    taxonomy: TaxonomyCandidatePacket;
    critic: CriticFinding["critic"];
  }): Promise<CriticFinding>;
}

type JsonChatClient = {
  chat: { completions: { create(input: Record<string, unknown>): Promise<{
    choices: Array<{ message?: { content?: string | null } }>;
  }> } };
};

function parseJsonObject(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("model_response_not_object");
  return parsed as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Production adapter using the repository's OpenAI chat client shape. Callers pass
 * `getOpenAI()` so this library remains fixture-testable and does not read env vars.
 */
export class OpenAIMetadataAdapter implements MetadataAgentAdapter, MetadataCriticAdapter {
  private readonly client: JsonChatClient;
  private readonly model: string;
  private readonly promptVersion: string;
  constructor(
    client: JsonChatClient,
    model: string,
    promptVersion = "master-metadata-2026-07-28.1",
  ) { this.client = client; this.model = model; this.promptVersion = promptVersion; }

  async propose(input: { card: CardPacket; facet: MetadataFacet; taxonomy: TaxonomyCandidatePacket }) {
    if (input.taxonomy.candidates.length === 0) return [];
    const allowed = new Set(input.taxonomy.candidates.map((term) => term.id));
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the SnapOrtho ${input.facet} metadata agent. Select only explicitly supported terms from the candidate packet. Never infer an unstated diagnosis or treatment. Return JSON {"proposals":[{"termId":string,"confidence":number,"evidenceSpans":[{"field":"front"|"back","quote":string}],"rationaleCodes":string[]}]}. Quotes must be exact substrings. Empty proposals are valid. Prompt ${this.promptVersion}.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            card: { front: input.card.front, back: input.card.back },
            taxonomyVersion: input.taxonomy.taxonomyVersion,
            candidates: input.taxonomy.candidates.map((term) => ({
              id: term.id, label: term.preferredLabel, aliases: term.aliases, parents: term.parentIds,
            })),
          }),
        },
      ],
    });
    const object = parseJsonObject(response.choices[0]?.message?.content ?? "");
    const rows = Array.isArray(object.proposals) ? object.proposals : [];
    const proposals = rows.map((value): FacetProposal => {
      if (!value || typeof value !== "object") throw new Error("invalid_proposal");
      const row = value as Record<string, unknown>;
      const termId = String(row.termId ?? "");
      if (!allowed.has(termId)) throw new Error(`unknown_taxonomy_term:${termId}`);
      const spans = Array.isArray(row.evidenceSpans) ? row.evidenceSpans.map((span) => {
        if (!span || typeof span !== "object") throw new Error("invalid_evidence_span");
        const item = span as Record<string, unknown>;
        if ((item.field !== "front" && item.field !== "back") || typeof item.quote !== "string") throw new Error("invalid_evidence_span");
        const field = item.field as "front" | "back";
        const source = input.card[field];
        const start = source.indexOf(item.quote);
        if (start < 0) throw new Error(`invalid_evidence_span:${termId}`);
        const end = start + item.quote.length;
        return { field, start, end, evidenceHash: metadataChecksum(item.quote) };
      }) : [];
      return {
        facet: input.facet,
        termId,
        confidence: clampConfidence(Number(row.confidence)),
        evidence: spans.map((span) => span.evidenceHash),
        evidenceSpans: spans,
        rationaleCodes: stringArray(row.rationaleCodes),
        agentId: `openai:${this.model}:${input.facet}`,
        promptVersion: this.promptVersion,
      };
    });
    return [...new Map(proposals.map((proposal) => [proposal.termId, proposal])).values()];
  }

  async review(input: {
    card: CardPacket;
    proposal: FacetProposal;
    taxonomy: TaxonomyCandidatePacket;
    critic: CriticFinding["critic"];
  }): Promise<CriticFinding> {
    const term = input.taxonomy.candidates.find((candidate) => candidate.id === input.proposal.termId);
    if (!term) throw new Error(`critic_term_not_in_packet:${input.proposal.termId}`);
    const instruction = input.critic === "clinical_entailment"
      ? "Judge whether the quoted card content clinically entails the proposed label. Reject plausible but unstated diagnoses/treatments."
      : "Judge whether this is the correct canonical taxonomy term and granularity; flag alias, parent, or sibling mismatch.";
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${instruction} Return JSON {"decision":"support"|"oppose"|"uncertain","confidence":number,"reasonCodes":string[]}.` },
        { role: "user", content: JSON.stringify({ card: { front: input.card.front, back: input.card.back }, proposal: input.proposal, term }) },
      ],
    });
    const row = parseJsonObject(response.choices[0]?.message?.content ?? "");
    if (row.decision !== "support" && row.decision !== "oppose" && row.decision !== "uncertain") throw new Error("invalid_critic_decision");
    return {
      critic: input.critic,
      termId: input.proposal.termId,
      decision: row.decision,
      confidence: clampConfidence(Number(row.confidence)),
      reasonCodes: stringArray(row.reasonCodes),
    };
  }
}

export interface PipelineCheckpointStore {
  get(cardVersionId: string, inputChecksum: string): Promise<CardPipelineResult | null>;
  put(result: CardPipelineResult): Promise<void>;
}

export class MemoryCheckpointStore implements PipelineCheckpointStore {
  private rows = new Map<string, CardPipelineResult>();
  async get(cardVersionId: string, inputChecksum: string) {
    return this.rows.get(`${cardVersionId}:${inputChecksum}`) ?? null;
  }
  async put(result: CardPipelineResult) {
    this.rows.set(`${result.card.canonicalCardVersionId}:${result.inputChecksum}`, result);
  }
}

function stableJson(value: unknown): string {
  const visit = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(visit)
      : item && typeof item === "object"
        ? Object.fromEntries(
            Object.entries(item as Record<string, unknown>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, child]) => [key, visit(child)]),
          )
        : item;
  return JSON.stringify(visit(value));
}

export function metadataChecksum(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function buildTaxonomyCandidatePacket(
  facet: MetadataFacet,
  taxonomyVersion: string,
  candidates: TaxonomyCandidate[],
): TaxonomyCandidatePacket {
  const normalized = candidates
    .filter((candidate) => candidate.active && candidate.facet === facet)
    .map((candidate) => ({
      ...candidate,
      aliases: [...new Set(candidate.aliases)].sort(),
      parentIds: [...new Set(candidate.parentIds)].sort(),
      matchedAliases: [...new Set(candidate.matchedAliases)].sort(),
    }))
    .sort((a, b) => b.retrievalScore - a.retrievalScore || a.id.localeCompare(b.id));
  return {
    taxonomyVersion,
    facet,
    candidates: normalized,
    checksum: metadataChecksum({ taxonomyVersion, facet, candidates: normalized }),
  };
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function resolveProposal(
  proposal: FacetProposal,
  findings: CriticFinding[],
  term: TaxonomyTerm,
): RoutedAssertion {
  const clinical = findings.find((finding) => finding.critic === "clinical_entailment");
  const ontology = findings.find((finding) => finding.critic === "ontology");
  const reasonCodes = [...new Set([
    ...proposal.rationaleCodes,
    ...(clinical?.reasonCodes ?? []),
    ...(ontology?.reasonCodes ?? []),
  ])].sort();
  const confidence = clampConfidence(Math.min(
    proposal.confidence,
    clinical?.confidence ?? 0,
    ontology?.confidence ?? 0,
  ));
  const opposed = clinical?.decision === "oppose" || ontology?.decision === "oppose";
  const taxonomyProblem = ontology?.decision !== "support";
  const insufficientEvidence = proposal.evidenceSpans.length === 0 || clinical?.decision !== "support";
  let decision: ProposalDecision = "review";
  let route: RoutedAssertion["route"] = "rapid_review";
  let riskTier: RoutedAssertion["riskTier"] = "medium";
  if (opposed && confidence >= 0.75) {
    decision = "reject"; route = "reject"; riskTier = "high";
  } else if (taxonomyProblem) {
    route = "taxonomy_review"; riskTier = "high";
  } else if (insufficientEvidence || proposal.facet === "diagnosis" || proposal.facet === "treatment") {
    route = "clinical_review"; riskTier = "high";
  } else if (confidence >= 0.98) {
    decision = "accept"; route = "auto_accept"; riskTier = "low";
  }
  return {
    facet: proposal.facet,
    termId: proposal.termId,
    assertionRole: "primary",
    decision,
    route,
    riskTier,
    confidence,
    reasonCodes,
    evidence: [...new Set(proposal.evidence)].sort(),
    ankiTag: `SnapOrtho::${proposal.facet[0].toUpperCase()}${proposal.facet.slice(1)}::${term.ankiSlug}`,
  };
}

export type PipelineOptions = {
  taxonomyVersion: string;
  taxonomyLimit?: number;
  batchSize?: number;
  concurrency?: number;
  retryFailed?: boolean;
};

export class MasterDeckMetadataPipeline {
  private readonly retriever: TaxonomyRetriever;
  private readonly agent: MetadataAgentAdapter;
  private readonly critic: MetadataCriticAdapter;
  private readonly checkpoints: PipelineCheckpointStore;
  private readonly terms: ReadonlyMap<string, TaxonomyTerm>;
  constructor(
    retriever: TaxonomyRetriever,
    agent: MetadataAgentAdapter,
    critic: MetadataCriticAdapter,
    checkpoints: PipelineCheckpointStore,
    terms: ReadonlyMap<string, TaxonomyTerm>,
  ) {
    this.retriever = retriever;
    this.agent = agent;
    this.critic = critic;
    this.checkpoints = checkpoints;
    this.terms = terms;
  }

  async processCard(card: CardPacket, runId: string, batchId: string, options: PipelineOptions): Promise<CardPipelineResult> {
    const inputChecksum = metadataChecksum({
      version: METADATA_PIPELINE_VERSION,
      taxonomyVersion: options.taxonomyVersion,
      card,
    });
    const existing = await this.checkpoints.get(card.canonicalCardVersionId, inputChecksum);
    if (existing && (existing.status === "completed" || !options.retryFailed)) return existing;
    try {
      // The four facet agents intentionally run independently and concurrently.
      const facetResults = await Promise.all(METADATA_FACETS.map(async (facet) => {
        const candidates = await this.retriever.retrieve({ card, facet, limit: options.taxonomyLimit ?? 40 });
        const taxonomy = buildTaxonomyCandidatePacket(facet, options.taxonomyVersion, candidates);
        const proposals = await this.agent.propose({ card, facet, taxonomy });
        return { taxonomy, proposals };
      }));
      const proposals = facetResults
        .flatMap(({ proposals: facetProposals }) => facetProposals)
        .sort((a, b) => a.facet.localeCompare(b.facet) || a.termId.localeCompare(b.termId));
      for (const proposal of proposals) {
        if (proposal.facet === undefined || !this.terms.has(proposal.termId)) throw new Error(`unknown_taxonomy_term:${proposal.termId}`);
        if (!proposal.evidenceSpans.every((span) =>
          Number.isInteger(span.start) &&
          Number.isInteger(span.end) &&
          span.start >= 0 &&
          span.end > span.start &&
          span.end <= card[span.field].length &&
          metadataChecksum(card[span.field].slice(span.start, span.end)) === span.evidenceHash
        )) {
          throw new Error(`invalid_evidence_span:${proposal.termId}`);
        }
      }
      const criticFindings = (await Promise.all(proposals.flatMap((proposal) => {
        const facetResult = facetResults.find((item) => item.taxonomy.facet === proposal.facet)!;
        return (["clinical_entailment", "ontology"] as const).map((critic) =>
          this.critic.review({ card, proposal, taxonomy: facetResult.taxonomy, critic }),
        );
      }))).sort((a, b) => a.termId.localeCompare(b.termId) || a.critic.localeCompare(b.critic));
      const assertions = proposals.map((proposal) =>
        resolveProposal(
          proposal,
          criticFindings.filter((finding) => finding.termId === proposal.termId),
          this.terms.get(proposal.termId)!,
        ),
      );
      const specialtyAssertions = assertions
        .filter((assertion) => assertion.facet === "specialty" && assertion.decision !== "reject")
        .sort((left, right) => right.confidence - left.confidence || left.termId.localeCompare(right.termId));
      for (const assertion of specialtyAssertions.slice(1)) {
        assertion.assertionRole = "secondary";
        if (assertion.route === "auto_accept") {
          assertion.decision = "review";
          assertion.route = "rapid_review";
          assertion.riskTier = "medium";
          assertion.reasonCodes = [...new Set([...assertion.reasonCodes, "secondary_specialty_requires_review"])].sort();
        }
      }
      const result: CardPipelineResult = {
        contractVersion: METADATA_PIPELINE_VERSION,
        runId,
        batchId,
        card: {
          canonicalCardId: card.canonicalCardId,
          canonicalCardVersionId: card.canonicalCardVersionId,
          contentHash: card.contentHash,
        },
        inputChecksum,
        status: "completed",
        proposals,
        criticFindings,
        assertions,
      };
      await this.checkpoints.put(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: CardPipelineResult = {
        contractVersion: METADATA_PIPELINE_VERSION,
        runId,
        batchId,
        card: {
          canonicalCardId: card.canonicalCardId,
          canonicalCardVersionId: card.canonicalCardVersionId,
          contentHash: card.contentHash,
        },
        inputChecksum,
        status: "failed",
        proposals: [],
        criticFindings: [],
        assertions: [],
        failure: { code: message.split(":")[0], message, retryable: !message.startsWith("invalid_evidence_span") },
      };
      await this.checkpoints.put(result);
      return result;
    }
  }

  async run(cards: CardPacket[], runId: string, options: PipelineOptions): Promise<CardPipelineResult[]> {
    const ordered = [...cards].sort((a, b) => a.canonicalCardVersionId.localeCompare(b.canonicalCardVersionId));
    const batchSize = Math.max(1, options.batchSize ?? 100);
    const concurrency = Math.max(1, options.concurrency ?? 8);
    const output: CardPipelineResult[] = [];
    for (let offset = 0; offset < ordered.length; offset += batchSize) {
      const batch = ordered.slice(offset, offset + batchSize);
      const batchId = metadataChecksum({ runId, versions: batch.map((card) => card.canonicalCardVersionId) });
      for (let cursor = 0; cursor < batch.length; cursor += concurrency) {
        output.push(...await Promise.all(
          batch.slice(cursor, cursor + concurrency).map((card) => this.processCard(card, runId, batchId, options)),
        ));
      }
    }
    return output;
  }
}
