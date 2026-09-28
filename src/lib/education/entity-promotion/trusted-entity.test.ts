/** Tests for the shared trusted-entity definition. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterTrustedCanonicalEntities,
  isRetiredCanonicalEntity,
  isTrustedCanonicalEntity,
  RETIRED_ENTITY_STATUSES,
  TRUSTED_ENTITY_STATUSES,
} from "./trusted-entity";

describe("isTrustedCanonicalEntity", () => {
  it("trusts approved reviewed and canonical rows", () => {
    assert.equal(
      isTrustedCanonicalEntity({ is_active: true, review_status: "approved", status: "reviewed" }),
      true,
    );
    assert.equal(
      isTrustedCanonicalEntity({ is_active: true, review_status: "approved", status: "canonical" }),
      true,
    );
  });

  it("rejects provisional, unreviewed, inactive, and retired rows", () => {
    assert.equal(
      isTrustedCanonicalEntity({ is_active: true, review_status: "approved", status: "proposed" }),
      false,
    );
    assert.equal(
      isTrustedCanonicalEntity({ is_active: true, review_status: "unreviewed", status: "reviewed" }),
      false,
    );
    assert.equal(
      isTrustedCanonicalEntity({ is_active: false, review_status: "approved", status: "canonical" }),
      false,
    );
    assert.equal(
      isTrustedCanonicalEntity({ is_active: true, review_status: "approved", status: "deprecated" }),
      false,
    );
  });

  it("accepts camelCase application rows", () => {
    assert.equal(
      isTrustedCanonicalEntity({ active: true, reviewStatus: "approved", lifecycleStatus: "reviewed" }),
      true,
    );
    assert.equal(
      isTrustedCanonicalEntity({ active: true, reviewStatus: "approved", lifecycleStatus: "proposed" }),
      false,
    );
  });

  it("flags retired rows", () => {
    for (const status of RETIRED_ENTITY_STATUSES) {
      assert.equal(isRetiredCanonicalEntity({ status }), true);
    }
    assert.equal(isRetiredCanonicalEntity({ status: "reviewed" }), false);
  });

  it("filters mixed lists", () => {
    const rows = [
      { is_active: true, review_status: "approved", status: "reviewed" },
      { is_active: true, review_status: "unreviewed", status: "reviewed" },
      { is_active: true, review_status: "approved", status: "canonical" },
    ];
    assert.equal(filterTrustedCanonicalEntities(rows).length, 2);
  });

  it("pins the trusted status set", () => {
    assert.deepEqual([...TRUSTED_ENTITY_STATUSES].sort(), ["canonical", "reviewed"]);
  });
});
