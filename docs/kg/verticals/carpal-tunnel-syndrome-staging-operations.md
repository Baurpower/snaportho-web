# CTS database-backed staging lifecycle

This runbook stages the finalized post-review CTS graph. It must not regenerate
CTS from the registered topic specification.

## Fixed source artifacts

- Base draft: `reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/carpal-tunnel-syndrome/merged-neighborhood-draft.json`
- Normalized overlay: `reports/kg-verticals/carpal-tunnel-syndrome/final-readiness/normalized-post-review-input.json`
- Review decisions: `reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/cts-final-review-decisions.json`
- Auto-review record: `reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/carpal-tunnel-syndrome/ontology-auto-review.json`

## Commands

Generate the deterministic packet:

```bash
npm run kg:staging:packet -- \
  --topic carpal-tunnel-syndrome \
  --base-draft reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/carpal-tunnel-syndrome/merged-neighborhood-draft.json \
  --post-review-input reports/kg-verticals/carpal-tunnel-syndrome/final-readiness/normalized-post-review-input.json \
  --review-decisions reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/cts-final-review-decisions.json \
  --auto-review reports/kg-verticals/carpal-tunnel-syndrome/dry-run-manufacture/carpal-tunnel-syndrome/ontology-auto-review.json \
  --output-dir reports/kg-staging
```

Persist the packet only after its unresolved proposal set is reviewed:

```bash
KG_TARGET_ENV=staging npm run kg:staging:persist -- \
  --packet reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9/proposal-packet.json
```

Dry-run and real apply:

```bash
KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- \
  --topic carpal-tunnel-syndrome \
  --batch-key cts-0f75b7ab7ec364d9 \
  --report-dir reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9 \
  --dry-run

KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- \
  --topic carpal-tunnel-syndrome \
  --batch-key cts-0f75b7ab7ec364d9 \
  --report-dir reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9
```

Strict database reload and audit:

```bash
npm run kg:compile:db -- \
  --topic carpal-tunnel-syndrome \
  --strict-db \
  --batch-key cts-0f75b7ab7ec364d9 \
  --out-dir reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9/db-reload

npm run kg:audit -- \
  --topic carpal-tunnel-syndrome \
  --db-backed \
  --strict-db \
  --batch-key cts-0f75b7ab7ec364d9 \
  --out-dir reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9/audit
```

Rollback proof and rollback:

```bash
KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- \
  --topic carpal-tunnel-syndrome \
  --rollback cts-0f75b7ab7ec364d9 \
  --report-dir reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9 \
  --dry-run

KG_TARGET_ENV=staging npm run kg:pilot:apply-approved -- \
  --topic carpal-tunnel-syndrome \
  --rollback cts-0f75b7ab7ec364d9 \
  --report-dir reports/kg-staging/carpal-tunnel-syndrome/cts-0f75b7ab7ec364d9
```

Claims and decision points remain `needs_review` proposals and are not selected
by the canonical apply command.
