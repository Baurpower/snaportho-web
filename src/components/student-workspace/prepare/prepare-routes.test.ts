/* eslint-disable @typescript-eslint/no-require-imports */

const { buildCaseReadinessHref } = require("./prepare-routes.ts") as typeof import("./prepare-routes");

if (
  buildCaseReadinessHref({ topicId: "acl-tear", mode: "fast", time: 15 }) !==
  "/student-workspace/case-readiness/acl-tear?mode=fast&time=15"
) {
  throw new Error("fast prep href mismatch");
}

if (
  buildCaseReadinessHref({ topicId: "acl-tear", mode: "deep", time: 45 }) !==
  "/student-workspace/case-readiness/acl-tear?mode=deep&time=45"
) {
  throw new Error("deep prep href mismatch");
}

if (
  buildCaseReadinessHref({ topicId: "  ", mode: "fast", time: 15 }) !==
  "/student-workspace/prepare"
) {
  throw new Error("empty topic href mismatch");
}

if (
  buildCaseReadinessHref({ topicId: "hip-fracture", mode: "fast", time: 0 }) !==
  "/student-workspace/case-readiness/hip-fracture?mode=fast&time=15"
) {
  throw new Error("invalid time href mismatch");
}

console.log("prepare route builder tests passed");