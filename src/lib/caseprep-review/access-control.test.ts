import assert from "node:assert/strict";

const ROLE_RANK = {
  viewer: 0,
  resident_reviewer: 1,
  attending_reviewer: 2,
  certifier: 3,
  content_admin: 4,
} as const;

function hasRequiredRole(
  role: keyof typeof ROLE_RANK,
  minRole: keyof typeof ROLE_RANK
) {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

assert.equal(hasRequiredRole("viewer", "viewer"), true);
assert.equal(hasRequiredRole("viewer", "resident_reviewer"), false);
assert.equal(hasRequiredRole("content_admin", "certifier"), true);

console.log("caseprep-review access-control hierarchy tests passed");