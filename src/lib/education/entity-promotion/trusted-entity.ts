/** Single shared trusted-canonical-entity definition (Phase 3B).
 *
 * Trusted = active + approved + (reviewed OR canonical).
 *
 * Rationale: the reviewed promotion workflow (existing apply scripts and the
 * Phase 3 applier) creates entities as status='reviewed', review_status=
 * 'approved'. Consumers that test status='canonical' exactly silently drop
 * every reviewed entity. All trusted read paths — routes, libs, scripts,
 * and the SQL helper in 20260927270000 — must reference THIS definition.
 *
 * Every consumer in the trust matrix (reports/kg-live-stabilization/
 * consumer-trust-matrix.md) was migrated to these constants.
 */

export const TRUSTED_ENTITY_ACTIVE = true as const;
export const TRUSTED_ENTITY_REVIEW_STATUS = "approved" as const;
export const TRUSTED_ENTITY_STATUSES = ["reviewed", "canonical"] as const;

/** Lifecycle states that retire an entity everywhere (no consumer may use). */
export const RETIRED_ENTITY_STATUSES = ["deprecated", "replaced", "merged", "split"] as const;

/** Pre-trust states: visible to review tooling, never to trusted reads. */
export const UNTRUSTED_PROVISIONAL_STATUSES = ["proposed", "draft"] as const;

export type CanonicalEntityTrustRow = {
  is_active?: boolean | null;
  active?: boolean | null;
  review_status?: string | null;
  reviewStatus?: string | null;
  status?: string | null;
  lifecycleStatus?: string | null;
};

function pick(row: CanonicalEntityTrustRow): { active: boolean; review: string; status: string } {
  return {
    active: (row.is_active ?? row.active ?? false) === true,
    review: (row.review_status ?? row.reviewStatus ?? "").toLowerCase(),
    status: (row.status ?? row.lifecycleStatus ?? "").toLowerCase(),
  };
}

/** True only for the trusted definition above. Accepts both snake_case DB
 * rows and camelCase application rows (EntityIndexRow). */
export function isTrustedCanonicalEntity(row: CanonicalEntityTrustRow): boolean {
  const picked = pick(row);
  return (
    picked.active
    && picked.review === TRUSTED_ENTITY_REVIEW_STATUS
    && (TRUSTED_ENTITY_STATUSES as readonly string[]).includes(picked.status)
  );
}

/** True for retired rows regardless of other flags. */
export function isRetiredCanonicalEntity(row: CanonicalEntityTrustRow): boolean {
  const picked = pick(row);
  return (RETIRED_ENTITY_STATUSES as readonly string[]).includes(picked.status);
}

/** Filter a mixed row list down to trusted rows. */
export function filterTrustedCanonicalEntities<T extends CanonicalEntityTrustRow>(rows: T[]): T[] {
  return rows.filter(isTrustedCanonicalEntity);
}
