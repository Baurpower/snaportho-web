import assert from "node:assert/strict";

import {
  caseFrameFromOverview,
  normalizeApproachRisks,
  sourceLabel,
} from "./approach-decision.ts";

{
  const risks = normalizeApproachRisks([
    "The lateral femoral cutaneous nerve is vulnerable near the anterior superior iliac spine.",
    {
      structure: "Sciatic nerve",
      why_at_risk: "Lies on quadratus femoris.",
      how_to_avoid_injury: "Keep the hip extended and the knee flexed.",
    },
  ]);
  assert.equal(risks.length, 2);
  assert.equal(risks[0]?.name.toLowerCase().includes("lateral femoral cutaneous"), true);
  assert.ok(risks[0]?.why?.includes("vulnerable"));
  assert.equal(risks[1]?.name, "Sciatic nerve");
  assert.equal(risks[1]?.protection, "Keep the hip extended and the knee flexed.");
}

{
  const frame = caseFrameFromOverview(
    "Displaced or unstable femoral-neck fracture in an older adult when arthroplasty is preferred. Performed via the Lateral (Hardinge) approach; the superior gluteal nerve is the key structure to protect.",
  );
  assert.match(frame, /femoral-neck fracture/i);
  assert.doesNotMatch(frame, /Performed via/i);
  assert.doesNotMatch(frame, /Hardinge/i);
}

{
  assert.equal(
    caseFrameFromOverview(
      "Tibial-shaft fracture requiring operative stabilization because of instability.",
    ),
    "Tibial-shaft fracture requiring operative stabilization because of instability.",
  );
}

{
  assert.match(
    sourceLabel(
      "https://surgeryreference.aofoundation.org/orthopedic-trauma/adult-trauma/proximal-femur/approach/anterior-approach-smith-petersen",
    ),
    /aofoundation\.org/,
  );
}

console.log("approach-decision helpers ok");
