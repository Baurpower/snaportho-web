# KG Automation Loop

The KG automation loop is a review-gated workflow around the existing curriculum, card, and question mappings. It does not retarget the mapper, replace legacy mapping tables, or bulk migrate concepts.

## Commands

- `npm run kg:auto:loop`
- `npm run kg:auto:status`
- `npm run kg:auto:review-packet -- --packet "<packet-key>"`
- `npm run kg:auto:approve-packet -- --packet "<packet-key>" --dry-run`
- `npm run kg:auto:apply-approved -- --dry-run`

## Default Loop

`npm run kg:auto:loop` runs the minimum safe automation cycle:

1. `npm run kg:coverage:report`
2. `npm run kg:automation:generate`
3. `npm run kg:automation:report`
4. `npm run kg:auto:status`
5. `npm run kg:auto:apply-approved -- --dry-run`

Pass `-- --packet "<packet-key>"` to also generate a packet review file and a packet approval dry run inside the same loop.

## Review Packets

`npm run kg:auto:review-packet -- --packet "<packet-key>"` writes a packet report under `reports/kg-automation-packets/`.

Each packet report includes:

- packet key and packet label
- curriculum path and specialty when available
- proposal counts by type and review status
- proposal-level evidence, support counts, confidence, conflicts, and recommended action

## Approval Rules

`npm run kg:auto:approve-packet` is conservative by default.

Without extra flags it approves only:

- `create_canonical_entity`
- `link_curriculum_node_to_entity`

It does not auto-approve:

- `add_canonical_relationship`
- `flag_*`
- `link_concept_to_entity`
- `add_entity_alias`

Optional flags expand the allowlist:

- `--allow-aliases`
- `--allow-concept-bridges`
- `--allow-relationships`
- `--allow-risk-flags`
- `--allow-provenance`

Use `--dry-run` first.

## First Packet Flow

Recommended first packet:

- `Trauma > Femoral Shaft Fractures`

Suggested sequence:

1. `npm run kg:auto:loop -- --packet "Trauma > Femoral Shaft Fractures"`
2. `npm run kg:auto:review-packet -- --packet "Trauma > Femoral Shaft Fractures"`
3. `npm run kg:auto:approve-packet -- --packet "Trauma > Femoral Shaft Fractures" --dry-run`
4. If the packet still looks clean, run `npm run kg:auto:approve-packet -- --packet "Trauma > Femoral Shaft Fractures"`
5. Run `npm run kg:auto:apply-approved -- --dry-run`
6. If the dry run is still clean, run `npm run kg:auto:apply-approved`
7. Rerun `npm run kg:coverage:report` and `npm run kg:automation:report`

## Safety Notes

- Proposal history stays in `kg_automation_proposals`; generation updates existing active rows instead of relying on `ON CONFLICT` against the partial active-fingerprint index.
- Dry-run approval and dry-run apply do not mutate canonical tables.
- Relationship, merge, split, and other risk-bearing proposals should stay review-only until the entity and curriculum bridge layer proves stable.
