import * as assert from "node:assert/strict";

import {
  buildPartialCurriculumResponse,
  isCurriculumModelUnavailableError,
  isTransientCurriculumError,
  withCurriculumRetry,
} from "./curriculum-pipeline";

assert.equal(
  isTransientCurriculumError({ status: 429, message: "rate limited" }),
  true,
);
assert.equal(
  isTransientCurriculumError({ status: 400, message: "bad request" }),
  false,
);
const exhaustedCreditError = {
  status: 429,
  code: "credit_balance_exhausted",
  type: "insufficient_quota",
  message: "You have no credits remaining.",
};
assert.equal(isTransientCurriculumError(exhaustedCreditError), false);
assert.equal(isCurriculumModelUnavailableError(exhaustedCreditError), true);

async function main() {
  let attempts = 0;
  const recovered = await withCurriculumRetry(
    async () => {
      attempts += 1;
      if (attempts < 3)
        throw Object.assign(new Error("temporarily unavailable"), {
          status: 503,
        });
      return "ok";
    },
    { retries: 2, sleep: async () => undefined },
  );
  assert.equal(recovered, "ok");
  assert.equal(attempts, 3);

  const partial = JSON.parse(
    buildPartialCurriculumResponse(
      [
        {
          result: {
            oneSentenceTakeaway: "First takeaway.",
            inThirtySeconds: ["Point one", "Point two"],
            mustKnow: [{ title: "Core", bullets: ["Fact"] }],
            clinicalPearls: ["Pearl"],
            commonMistakes: [],
            attendingQuestions: [],
            testableFacts: ["Testable fact"],
            suggestedFollowUps: ["What comes next?"],
          },
        },
      ],
      1,
    ),
  );
  assert.equal(partial.oneSentenceTakeaway, "First takeaway.");
  assert.deepEqual(partial.inThirtySeconds, ["Point one", "Point two"]);
  assert.match(partial.warnings.join(" "), /Partial explanation recovered/);
  assert.match(
    partial.warnings.join(" "),
    /1 section group could not be processed/,
  );

  console.log("Curriculum pipeline resilience tests passed.");
}

void main();
