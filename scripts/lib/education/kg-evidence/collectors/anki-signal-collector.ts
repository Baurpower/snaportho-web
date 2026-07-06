import { resolveTopic } from "../../kg-compiler/topic-registry.ts";
import { stableEvidenceId } from "../evidence-id.ts";
import type { EvidenceCollector, CollectorContext, CollectorResult } from "./types.ts";

const DECK_BRANCH_HINTS: Record<string, string> = {
  "ankle-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "compartment-syndrome":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "tibial-shaft-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "femoral-neck-fracture":
    "Marty McFlyin's Ortho Deck::2) Pocket Pimped::09 Hip::09.02 Trauma::Femoral Neck Fractures",
  "intertrochanteric-fracture":
    "Marty McFlyin's Ortho Deck::2) Pocket Pimped::09 Hip::09.02 Trauma::Intertrochanteric Fractures",
  "subtrochanteric-fracture":
    "Marty McFlyin's Ortho Deck::2) Pocket Pimped::09 Hip::09.02 Trauma::Subtrochanteric Fractures",
  "humeral-shaft-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Upper Extremity",
  "distal-humerus-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Upper Extremity",
  "pelvic-ring-injury":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "acetabular-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "femoral-shaft-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "distal-femur-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "patella-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "tibial-plateau-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "pilon-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "calcaneus-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
  "talus-fracture":
    "Marty McFlyin's Ortho Deck::3) OrthoBullets::Trauma::Lower Extremity",
};

const MAPPING_REPORT_PATH = "reports/anki-kg-mapping-v1-report.md";

export const ankiSignalCollector: EvidenceCollector = {
  id: "anki-signal-collector",

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const warnings: CollectorResult["warnings"] = [];
    const sources: CollectorResult["sources"] = [];
    const items: CollectorResult["items"] = [];

    const nodeSlug = context.sources.curriculumNodeSlug;
    if (!nodeSlug) {
      warnings.push({
        code: "ANKI_NODE_MISSING",
        message: "Cannot resolve Anki signals without curriculum node slug",
        collectorId: this.id,
        severity: "warning",
      });
      return { collectorId: this.id, sources, items, warnings, auditDetail: "no node" };
    }

    const topic = resolveTopic(context.topicKey);
    const cardCount = topic?.loadSnapshot().assets.ankiCardMappings ?? 0;

    if (cardCount === 0) {
      warnings.push({
        code: "ANKI_SIGNALS_UNAVAILABLE",
        message: `No Anki mapping count registered for topic ${context.topicKey}`,
        collectorId: this.id,
        severity: "info",
      });
    }

    const sourceId = `anki:${nodeSlug}`;
    sources.push({
      sourceId,
      sourceType: "anki_card",
      label: `Anki card mappings for ${nodeSlug}`,
      path: MAPPING_REPORT_PATH,
      copyrightPolicy: "metadata_only",
      trustTier: "secondary",
    });

    items.push({
      evidenceId: stableEvidenceId("anki_card", nodeSlug, "mapping_count"),
      sourceType: "anki_card",
      sourceId: nodeSlug,
      path: MAPPING_REPORT_PATH,
      extractionMethod: "mapping_count",
      copyrightPolicy: "metadata_only",
      confidenceHint: cardCount > 0 ? 0.92 : 0.5,
      provenanceHint: `anki_kg_mapping:${nodeSlug}`,
      label: "Anki card mapping count",
      summary: `${cardCount} high-confidence Anki card mapping(s) for curriculum node ${nodeSlug}`,
      payload: {
        curriculumNodeSlug: nodeSlug,
        mappedCardCount: cardCount,
        deckBranchHint: DECK_BRANCH_HINTS[context.topicKey] ?? null,
        storesCardText: false,
        storesCardAnswer: false,
        signalType: "mapping_count",
      },
      tags: ["anki", "asset_signal", "metadata_only"],
      collectedAt: context.collectedAt,
    });

    const deckBranchHint = DECK_BRANCH_HINTS[context.topicKey];
    if (deckBranchHint) {
      items.push({
        evidenceId: stableEvidenceId("anki_card", nodeSlug, "deck_branch_hint"),
        sourceType: "anki_card",
        sourceId: nodeSlug,
        path: MAPPING_REPORT_PATH,
        extractionMethod: "deck_branch_hint",
        copyrightPolicy: "metadata_only",
        confidenceHint: 0.85,
        provenanceHint: `anki_deck_branch:${deckBranchHint}`,
        label: "Anki deck branch hint",
        summary: `Primary deck branch for ${context.topicKey} Anki cards (metadata only)`,
        payload: {
          deckBranch: deckBranchHint,
          storesCardText: false,
        },
        tags: ["anki", "deck_hint"],
        collectedAt: context.collectedAt,
      });
    }

    return {
      collectorId: this.id,
      sources,
      items,
      warnings,
      auditDetail: `cards=${cardCount}`,
    };
  },
};