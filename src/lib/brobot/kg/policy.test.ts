import assert from "node:assert/strict";

import { buildBroBotClinicalContextFromIntent } from "../chat/clinical-context";
import type { BroBotChatIntent } from "../chat/types";
import { decideBroBotKgRetrieval } from "./policy";

function intent(overrides: Partial<BroBotChatIntent> = {}): BroBotChatIntent {
  return {
    mode: "general",
    subintent: "overview",
    procedureCategory: "general_topic",
    procedureOrTopic: "orthopaedics",
    ambiguity: "low",
    assumedContext: "",
    missingContext: [],
    clarifyingQuestions: [],
    confidence: 0.8,
    ...overrides,
  };
}

function decide(query: string, value: BroBotChatIntent) {
  return decideBroBotKgRetrieval({
    query,
    mode: value.mode,
    intent: value,
    clinicalContext: buildBroBotClinicalContextFromIntent({ message: query, intent: value }),
    responseDepth: "standard",
  });
}

assert.equal(
  decide("Walk me through distal radius ORIF anatomy", intent({
    mode: "or_prep",
    subintent: "anatomy_at_risk",
    procedureCategory: "fracture_orif",
    procedureOrTopic: "distal radius ORIF",
  })).action,
  "retrieve"
);
assert.equal(decide("How do I change my subscription?", intent()).action, "bypass");
assert.equal(decide("Can you review my personal statement?", intent()).action, "bypass");
assert.equal(decide("hello", intent()).action, "bypass");
assert.equal(
  decide("What should I study tonight?", intent({ ambiguity: "high", requiresBranchSelection: true })).action,
  "bypass"
);

console.log("brobot kg policy tests passed");
