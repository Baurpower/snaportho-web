# Anatomy Tag Hierarchy — Executable Runbook

Improve the **versioned SnapOrtho deck's** anatomy tags from flat
(`SnapOrtho::Anatomy::Tibia`) to hierarchical
(`SnapOrtho::Anatomy::Leg_Knee::Osteology::Tibia`) so cards are findable by region/tissue.

**Scope guard:** this workflow touches only the versioned-deck tag pipeline
(`canonical_entities` anatomy overlay → `rendered_anki_tag_manifests` for deck release
`a2949ed3` / `0.1.0-metadata-shadow`). It does **not** modify `anki_note_tags` or anything
in the historical *Marty McFlyin's Ortho Deck* import.

## Why this works (root cause)

- The versioned deck's governed tags come from the newest **published**
  `rendered_anki_tag_manifests` row (currently `snaportho-tags-full-codex-v1-reviewed`),
  picked automatically in `src/app/api/anki/deck/_lib.ts`.
- Tags are rendered by `renderCardTagManifest` (`src/lib/education/anki-tag-rendering.ts`),
  which emits a governed tag for **every declared, exportable ancestor** along a taxonomy
  node's `path` (`exportableParentClosure`).
- But `renderTags` in `scripts/run-master-deck-metadata-pipeline.ts` (~line 1497) hardcodes
  `path: [term.ankiSlug]` — a single token — so every anatomy tag is forced flat.
- Anatomy terms are the **197 `anatomy_structure` canonical entities** (137 used in the deck).

So: assign each structure a `Region` + `Tissue` (agent work), then make `renderTags` emit a
3-token path with exportable ancestors, and re-render into a new manifest.

## Files in this folder

| File | Role |
|------|------|
| `dump-anatomy-structures.mjs` | read-only; produces `anatomy-structures.json` (agent input) |
| `anatomy-structures.json` | 197 structures + deck card counts + sample fronts (generated) |
| `vocabulary.json` | canonical Regions (12) + Tissues (9) — single source of truth |
| `split-shards.mjs` | splits structures into N shards for N agents |
| `AGENT_PROMPT.md` | per-shard classification agent instructions |
| `reconcile.mjs` | validates + merges shard outputs → `anatomy-hierarchy.map.json` |
| `shards/shard-NN.todo.json` | agent input (generated); agents write `shard-NN.done.json` |

## Steps

### 1. Refresh input (read-only)
```bash
cd snaportho-web
node --env-file=.env.local integrations/snaportho-anki/anatomy-hierarchy/dump-anatomy-structures.mjs
node integrations/snaportho-anki/anatomy-hierarchy/split-shards.mjs 6
```

### 2. Run the agents (parallel, one per shard)
Give each agent `AGENT_PROMPT.md` + its `shards/shard-NN.todo.json`. Each writes
`shards/shard-NN.done.json`. Agents are read-only w.r.t. the database.

### 3. Reconcile + review (the gate)
```bash
node integrations/snaportho-anki/anatomy-hierarchy/reconcile.mjs
```
- Hard-fails (exit 1) on: missing coverage, unknown region/tissue token, tag collision.
- Produces `anatomy-hierarchy.map.json` + `coverage-report.md`.
- **Read `coverage-report.md`.** Confirm region distribution looks sane, resolve any
  low-confidence rows and proposed merges, re-run until clean.

### 4. Patch the renderer (one-time code change)
In `scripts/run-master-deck-metadata-pipeline.ts`, `renderTags()` (~line 1497), replace the
flat node build so the anatomy facet consumes `anatomy-hierarchy.map.json`:

```ts
// load once near top of renderTags():
const anatomyMap = new Map(
  Object.values(JSON.parse(readFileSync(
    "integrations/snaportho-anki/anatomy-hierarchy/anatomy-hierarchy.map.json", "utf8",
  )).entities).map((e: any) => [e.entity_id, e]),
);

const nodes: TaxonomyTagNode[] = [];
const ancestorSeen = new Set<string>();
for (const term of taxonomy.terms) {
  const facet = facetName[term.facet];
  const h = facet === "Anatomy" ? anatomyMap.get(term.id) : undefined;
  const path = h ? [h.region, h.tissue, h.structure] : [term.ankiSlug];
  nodes.push({ canonicalEntityId: term.id, facet, path, exportable: true });
  if (h) for (const depth of [1, 2]) {                // exportable Region + Region::Tissue
    const apath = path.slice(0, depth);
    const key = `${facet}::${apath.join("::")}`;
    if (ancestorSeen.has(key)) continue;
    ancestorSeen.add(key);
    nodes.push({ canonicalEntityId: `anatomy-ancestor:${apath.join("::")}`, facet, path: apath, exportable: true });
  }
}
```
Only the `Anatomy` facet changes; `Diagnosis` / `Treatment` / `Specialty` stay flat.

### 5. Render a new (draft) tag manifest for the versioned deck
```bash
node --env-file=.env.local scripts/run-master-deck-metadata-pipeline.ts \
  --command=render-tags \
  --metadata-release-key=snaportho-metadata-full-codex-v1-reviewed \
  --manifest-key=snaportho-tags-anatomy-hierarchy-v1
```
This re-renders the **existing accepted anatomy assertions** through the hierarchical
overlay and inserts a new `draft` manifest for deck release `a2949ed3`. No new model calls,
no assertion changes — purely a re-render.

### 6. Diff, then publish
- Sanity-check the new manifest's `SnapOrtho::Anatomy::*` tags (expect Region and
  Region::Tissue ancestors + depth-3 structure leaves):
```bash
node --env-file=.env.local integrations/snaportho-anki/anatomy-hierarchy/verify-manifest.mjs snaportho-tags-anatomy-hierarchy-v1
```
Expected healthy shape (post-review production numbers):
- depth-1: 12 region tags
- depth-2: ~50 Region::Tissue tags
- depth-3: 137 structure leaves, ~2102 card-tags (same structure coverage as flat baseline)

- Persist the draft if the dry-run looked right:
```bash
node --env-file=.env.local scripts/run-master-deck-metadata-pipeline.ts \
  --command=render-tags \
  --metadata-release-key=snaportho-metadata-full-codex-v1-reviewed \
  --manifest-key=snaportho-tags-anatomy-hierarchy-v1 \
  --persist=true \
  --confirm-render=PERSIST_DRAFT_TAG_MANIFEST
```

- Publish **tag-manifest only** (metadata release stays as-is; do **not** use
  `publish-provisional-tags` — that path is hard-coded for the 84-card provisional review):
```bash
# dry-run preflight
node --env-file=.env.local scripts/publish-anatomy-hierarchy-manifest.ts
# apply
node --env-file=.env.local scripts/publish-anatomy-hierarchy-manifest.ts \
  --apply --confirm=PUBLISH_ANATOMY_HIERARCHY_MANIFEST
```
`_lib.ts` auto-picks the newest **published** rendered tag manifest.

## Safety / rollback
- Anatomy leaves move from flat `SnapOrtho::Anatomy::<Structure>` to
  `SnapOrtho::Anatomy::<Region>::<Tissue>::<Structure>` with exportable Region and
  Region::Tissue ancestors. Diagnosis / Treatment / Specialty stay flat.
- Structure **coverage** is preserved (137 used-in-deck leaves, 2102 card-tags); only
  the full tag path changes. Other facets untouched.
- The versioned deck release is a **shadow draft**, not a published end-user sync
  release, so there is no installed base to churn.
- Rollback = flip `snaportho-tags-full-codex-v1-reviewed` back to `published` (and
  supersede the hierarchy manifest), or re-render without the map and publish that.

## Not in scope (deliberately deferred)
- Applying structure **merges** (re-pointing assertions between duplicate entities).
- Per-card verification that each card's anatomy assertion is correct (separate QA loop).
- Backfilling anatomy tags onto the ~965 deck cards that currently have no anatomy tag.
