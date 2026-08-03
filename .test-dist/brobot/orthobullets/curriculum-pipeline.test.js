"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("node:assert/strict"));
const curriculum_pipeline_1 = require("./curriculum-pipeline");
assert.equal((0, curriculum_pipeline_1.isTransientCurriculumError)({ status: 429, message: "rate limited" }), true);
assert.equal((0, curriculum_pipeline_1.isTransientCurriculumError)({ status: 400, message: "bad request" }), false);
const exhaustedCreditError = {
    status: 429,
    code: "credit_balance_exhausted",
    type: "insufficient_quota",
    message: "You have no credits remaining.",
};
assert.equal((0, curriculum_pipeline_1.isTransientCurriculumError)(exhaustedCreditError), false);
assert.equal((0, curriculum_pipeline_1.isCurriculumModelUnavailableError)(exhaustedCreditError), true);
async function main() {
    let attempts = 0;
    const recovered = await (0, curriculum_pipeline_1.withCurriculumRetry)(async () => {
        attempts += 1;
        if (attempts < 3)
            throw Object.assign(new Error("temporarily unavailable"), {
                status: 503,
            });
        return "ok";
    }, { retries: 2, sleep: async () => undefined });
    assert.equal(recovered, "ok");
    assert.equal(attempts, 3);
    const partial = JSON.parse((0, curriculum_pipeline_1.buildPartialCurriculumResponse)([
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
    ], 1));
    assert.equal(partial.oneSentenceTakeaway, "First takeaway.");
    assert.deepEqual(partial.inThirtySeconds, ["Point one", "Point two"]);
    assert.match(partial.warnings.join(" "), /Partial explanation recovered/);
    assert.match(partial.warnings.join(" "), /1 section group could not be processed/);
    console.log("Curriculum pipeline resilience tests passed.");
}
void main();
