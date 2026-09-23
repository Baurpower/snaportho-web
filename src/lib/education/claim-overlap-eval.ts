import {
  CLAIM_OVERLAP_ALGORITHM,
  CLAIM_OVERLAP_GATES,
  queryFromGoldItem,
  type ClaimOverlapGoldItem,
} from "./contracts/claim-overlap-v1";
import { matchClaimOverlap, type ClaimOverlapInventory, type ClaimOverlapMatch } from "./claim-overlap-matcher";

export type ClaimOverlapItemEval = {
  itemId: string;
  expectedDisposition: ClaimOverlapGoldItem["expected"]["disposition"];
  observedDisposition: ClaimOverlapMatch["disposition"];
  rank1Correct: boolean | null;
  primaryInTop3: boolean | null;
  incorrectCard: boolean;
  siblingDuplicate: boolean;
  empty: boolean;
};

export type ClaimOverlapEval = {
  algorithmVersion: typeof CLAIM_OVERLAP_ALGORITHM;
  itemCount: number;
  precisionAt1: number;
  precisionAt3: number;
  incorrectCardRate: number;
  siblingDuplicateRate: number;
  emptyRate: number;
  falseEmptyCount: number;
  gatesPassed: boolean;
  gateFailures: string[];
  items: ClaimOverlapItemEval[];
};

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 1;
  return Number((numerator / denominator).toFixed(4));
}

export function evaluateClaimOverlapItem(
  item: ClaimOverlapGoldItem,
  match: ClaimOverlapMatch,
): ClaimOverlapItemEval {
  const returnedIds = match.cards.map((card) => card.canonicalCardId);
  const empty = returnedIds.length === 0;
  const allowed = new Set(item.expected.allowedCardIds);
  const incorrectCard = returnedIds.some((id) => !allowed.has(id));
  const siblingDuplicate = new Set(match.cards.map((card) => card.noteGuid)).size !== match.cards.length;
  const rank1 = match.cards[0]?.canonicalCardId ?? null;
  const rank1Correct = empty ? null : rank1 === item.expected.primaryCardId;
  const primaryInTop3 = empty ? null : (
    item.expected.primaryCardId != null && returnedIds.slice(0, 3).includes(item.expected.primaryCardId)
  );
  return {
    itemId: item.itemId,
    expectedDisposition: item.expected.disposition,
    observedDisposition: match.disposition,
    rank1Correct,
    primaryInTop3,
    incorrectCard,
    siblingDuplicate,
    empty,
  };
}

export function evaluateClaimOverlap(
  items: ClaimOverlapGoldItem[],
  inventory: ClaimOverlapInventory,
): ClaimOverlapEval {
  const evaluated = items.map((item) => (
    evaluateClaimOverlapItem(item, matchClaimOverlap(queryFromGoldItem(item), inventory))
  ));
  const served = evaluated.filter((row) => row.rank1Correct !== null);
  const precisionAt1 = rate(served.filter((row) => row.rank1Correct).length, served.length);
  const precisionAt3 = rate(served.filter((row) => row.primaryInTop3).length, served.length);
  const incorrectCardRate = rate(evaluated.filter((row) => row.incorrectCard).length, evaluated.length);
  const siblingDuplicateRate = rate(evaluated.filter((row) => row.siblingDuplicate).length, evaluated.length);
  const emptyRate = rate(evaluated.filter((row) => row.empty).length, evaluated.length);
  const falseEmptyCount = evaluated.filter((row) => (
    row.expectedDisposition === "serve" && row.empty
  )).length;
  const gateFailures: string[] = [];
  if (precisionAt1 < CLAIM_OVERLAP_GATES.precisionAt1) gateFailures.push("precision_at_1");
  if (precisionAt3 < CLAIM_OVERLAP_GATES.precisionAt3) gateFailures.push("precision_at_3");
  if (incorrectCardRate >= CLAIM_OVERLAP_GATES.incorrectCardRate) gateFailures.push("incorrect_card_rate");
  if (siblingDuplicateRate >= CLAIM_OVERLAP_GATES.siblingDuplicateRate) gateFailures.push("sibling_duplicate_rate");
  return {
    algorithmVersion: CLAIM_OVERLAP_ALGORITHM,
    itemCount: evaluated.length,
    precisionAt1,
    precisionAt3,
    incorrectCardRate,
    siblingDuplicateRate,
    emptyRate,
    falseEmptyCount,
    gatesPassed: gateFailures.length === 0,
    gateFailures,
    items: evaluated,
  };
}
