/* eslint-disable @typescript-eslint/no-require-imports */

const { isStudentWorkspacePathActive } = require("./student-workspace-nav.ts") as typeof import("./student-workspace-nav");

function assertNavActive(label: string, actual: boolean, expected: boolean) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

assertNavActive(
  "prepare path active",
  isStudentWorkspacePathActive("/student-workspace/prepare", "/student-workspace/prepare"),
  true
);
assertNavActive(
  "case readiness active under prepare",
  isStudentWorkspacePathActive(
    "/student-workspace/case-readiness/acl-tear",
    "/student-workspace/prepare"
  ),
  true
);
assertNavActive(
  "notes not active for prepare",
  isStudentWorkspacePathActive("/student-workspace/notes", "/student-workspace/prepare"),
  false
);
assertNavActive(
  "home exact match",
  isStudentWorkspacePathActive("/student-workspace", "/student-workspace"),
  true
);
assertNavActive(
  "prepare not active for home",
  isStudentWorkspacePathActive("/student-workspace/prepare", "/student-workspace"),
  false
);

console.log("student workspace nav tests passed");