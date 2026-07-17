import assert from "node:assert/strict";
import {
  buildCaseReadinessSession,
  normalizeStudyGuideCompletionIds,
} from "@/lib/student-curriculum/case-readiness-builder";

const LEGACY_HEADINGS = [
  ["Why", "This", "Matters"],
  ["If", "You", "Know", "Only", "Three", "Things"],
  ["Resident", "Expectations"],
  ["Attending", "Questions"],
  ["Common", "Mistakes"],
  ["How", "To", "Look", "Prepared"],
  ["Learn", "Next"],
].map((parts) => parts.join(" "));

const EXPECTED_FAST_SECTIONS: Record<string, string[]> = {
  "fracture-healing": [
    "Distinguish primary from secondary bone healing",
    "Sequence the stages of secondary healing",
    "Explain why excessive strain prevents bone formation",
    "Recognize delayed union, nonunion, and malunion",
  ],
  "bone-remodeling": [
    "Explain osteoblast and osteoclast coupling",
    "Apply Wolff law to loading and stress",
    "Know when remodeling will not rescue alignment",
  ],
  "carpal-tunnel-syndrome": [
    "Recognize the median-nerve symptom pattern",
    "Perform a focused CTS exam",
    "Know when electrodiagnostics help",
    "Explain indications for carpal tunnel release",
    "Identify structures released during carpal tunnel surgery",
  ],
  "distal-radius-fracture": [
    "Connect mechanism, deformity, and median nerve exam",
    "Recognize radiographic signs of an unstable distal radius fracture",
    "State reduction and splinting goals",
    "Explain why fixation may be needed",
    "Remember complications that change follow-up",
  ],
  "posterior-hip-approach": [
    "Set up lateral positioning and posterior landmarks",
    "Follow superficial and deep exposure",
    "Identify short external rotators and capsule",
    "Protect the sciatic nerve danger zone",
    "Connect closure to posterior stability",
  ],
  "total-hip-implant-fixation": [
    "Compare cemented and cementless fixation",
    "Explain stem geometry and load transfer",
    "Understand acetabular cup fixation",
    "Recognize radiographic fixation and loosening signs",
    "Use patient and bone factors to explain implant choice",
  ],
  "postoperative-acl-rehabilitation": [
    "Prioritize swelling control, extension, and quad activation",
    "Assess the first post-op ACL visit",
    "Explain staged progression to running and sport",
    "Adjust rehab for meniscus repair and graft factors",
    "Recognize warning signs during ACL rehab",
  ],
};

for (const [topicId, expectedTitles] of Object.entries(EXPECTED_FAST_SECTIONS)) {
  const session = buildCaseReadinessSession(topicId, "fast", {
    selectedMinutes: 15,
  });

  assert.ok(session, `${topicId} should build a session`);
  assert.deepEqual(
    session.studyGuideSections.map((section) => section.title),
    expectedTitles,
    `${topicId} should render the expected section sequence`
  );

  assert.equal(
    session.studyGuideSections.reduce(
      (total, section) => total + section.estimatedMinutes,
      0
    ),
    15,
    `${topicId} section minutes should match selected time`
  );

  for (const section of session.studyGuideSections) {
    assert.match(
      section.id,
      new RegExp(`^${topicId}__[-a-z0-9]+$`),
      `${section.title} should use a semantic stable ID`
    );
    assert.ok(section.learningObjective.length > 20);
    assert.ok(section.completionLabel.startsWith("I "));
    assert.ok(section.content.length > 0);
    assert.ok(
      section.content.every((block) => block.items.length > 0),
      `${section.title} should not render empty content blocks`
    );
    assert.ok(
      section.brobotActions.every((action) =>
        action.prompt.includes(section.title) &&
        action.prompt.includes(section.learningObjective)
      ),
      `${section.title} BroBot actions should include selected section context`
    );
  }

  const renderedText = JSON.stringify(session.studyGuideSections);
  for (const heading of LEGACY_HEADINGS) {
    assert.equal(
      renderedText.includes(heading),
      false,
      `${topicId} should not render legacy heading ${heading}`
    );
  }
}

{
  const session = buildCaseReadinessSession("fracture-healing", "fast", {
    selectedMinutes: 15,
  });
  assert.ok(session);
  const first = session.studyGuideSections[0].id;
  const third = session.studyGuideSections[2].id;

  assert.deepEqual(
    normalizeStudyGuideCompletionIds(
      [first, "legacy-section", first, third],
      session.studyGuideSections
    ),
    [first, third],
    "progress normalization should keep current semantic IDs and drop stale duplicates"
  );
}

console.log("case readiness study-guide tests passed");
