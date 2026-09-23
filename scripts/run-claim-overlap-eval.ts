import { buildClaimOverlapGoldV1 } from "../src/lib/education/fixtures/claim-overlap-gold-v1.ts";
import { evaluateClaimOverlap } from "../src/lib/education/claim-overlap-eval.ts";
import { CLAIM_OVERLAP_ALGORITHM, CLAIM_OVERLAP_GATES, goldSetMixErrors } from "../src/lib/education/contracts/claim-overlap-v1.ts";

const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.split("=");
  return [key, rest.join("=") || "true"] as const;
}));
if (args.has("--apply")) throw new Error("claim_overlap_eval_has_no_apply_mode");

const gold = buildClaimOverlapGoldV1();
const mixErrors = goldSetMixErrors(gold.items);
if (mixErrors.length) {
  throw new Error(`gold_set_mix:${mixErrors.join(",")}`);
}
const result = evaluateClaimOverlap(gold.items, gold.inventory);
console.log(JSON.stringify({
  algorithmVersion: CLAIM_OVERLAP_ALGORITHM,
  gates: CLAIM_OVERLAP_GATES,
  itemCount: result.itemCount,
  precisionAt1: result.precisionAt1,
  precisionAt3: result.precisionAt3,
  incorrectCardRate: result.incorrectCardRate,
  siblingDuplicateRate: result.siblingDuplicateRate,
  emptyRate: result.emptyRate,
  falseEmptyCount: result.falseEmptyCount,
  gatesPassed: result.gatesPassed,
  gateFailures: result.gateFailures,
}, null, 2));
if (!result.gatesPassed) {
  process.exitCode = 1;
}
