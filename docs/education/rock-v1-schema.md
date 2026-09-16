# ROCK `rock-v1` Pinecone schema

Vector index design for grounding CasePrep and Chat on the AAOS ROCK curriculum.
Source corpus: `snaportho-web/data/rock-corpus/` (promoted from the enrichment index;
see `data/rock-corpus/manifest.json`).

## Index & namespace

- **Index:** reuse the existing `PINECONE_INDEX` (do not create a second index).
- **Namespace:** `rock-v1` — isolates ROCK from the `ankiv3` vectors, which have a
  known metadata backfill gap. All ROCK queries pass `namespace="rock-v1"`.
- **Embedding:** `text-embedding-3-small`, **1536 dims** (matches the existing
  CasePrep/ortho-context embedder, so one client and one dimension across the index).
- **Metric:** cosine (existing index default).
- **Bump rule:** any change to chunking, the embed model, or teaching-page filtering
  ⇒ new namespace `rock-v2` (never mutate `rock-v1` in place). Track with a
  `schema_version` metadata field so mixed reads are detectable.

## What gets embedded

Only **teaching pages**. Reference/bibliography pages (`page.reference === true` in the
corpus, 2,023 of 16,356 pages) are excluded — they are dense with the chapter's own
topic words inside citation titles and pollute retrieval. This carries forward the
single most valuable tuning from the BM25 authoring engine (`rock-retrieval.ts`).

Chunks never cross a chapter boundary. Approx corpus after filtering: ~21.7M teaching
chars ⇒ **~12k chunks**.

## Chunking

- Target **~450 tokens** per chunk (~1,800 chars), **~60-token overlap**.
- Chunk within a chapter, walking teaching pages in `pdf_page` order; record the page
  span each chunk covers.
- Drop chunks under a floor (e.g. < 200 chars) to avoid header/figure-caption noise.
- Prepend the chapter title to each chunk's embedded text (mirrors BM25 title weighting)
  but store the raw passage separately in metadata for grounding display.

## Vector record

```jsonc
{
  "id": "510000500#0007",              // `${chapterId}#${zeroPaddedChunkIdx}`
  "values": [/* 1536 floats */],
  "metadata": {
    "schema_version": "rock-v1",
    "source_collection": "rock",       // cross-source scoping (matches CasePrep convention)
    "chapter_id": "510000500",         // ROCK canonical course id
    "canonical_id": "510000500",       // catalog.canonicalId (== chapter_id for canonicals)
    "title": "Hallux Valgus: Disorders of the First Ray",
    "url": "https://rock.aaos.org/coursecontent.aspx?id=510000500",
    "chunk_index": 7,
    "page_start": 4,                   // pdf_page of first page in the chunk
    "page_end": 5,
    "char_len": 1783,
    "text": "…raw teaching passage, no title prefix…"  // grounding payload
  }
}
```

Notes:
- `text` is stored so retrieval returns grounding passages without a second fetch. If it
  pushes metadata size limits, store only `chapter_id`+`chunk_index` and resolve `text`
  from `data/rock-corpus` at query time.
- `canonical_id` supports the catalog's 55 duplicate-title groups / alias chapters: embed
  only canonical chapters (`catalog.isCanonical === true`); aliases resolve via catalog.

## Query patterns

**Free-text (CasePrep case-readiness, procedure-anchored):**
```
index.query(
  namespace="rock-v1",
  vector=embed(query_text),
  top_k=8,
  filter={"source_collection": {"$eq": "rock"}},
  include_metadata=True,
)
```
Then dedupe to distinct `chapter_id`, keep top N chapters, pass their passages as grounding.

**Card-anchored (ortho-context / most chat):** *skip vector search.* The published overlay
(`combined-orthobullets-millers-rock-v6`) already maps the card → chapter id(s). Fetch those
chapters' top chunks directly by metadata:
```
filter={"chapter_id": {"$in": [<overlay chapter ids>]}}
```
Highest precision, zero embedding cost.

## Env vars required (backend)

Reuses existing names; only the namespace is new and can be hardcoded or configured:
- `PINECONE_API_KEY` — (existing)
- `PINECONE_INDEX` — (existing; ROCK lives in a namespace within it)
- `OPENAI_API_KEY` — (existing; for `text-embedding-3-small`)
- `ROCK_PINECONE_NAMESPACE` — new, default `rock-v1`

## Build job (Phase 0 deliverable, not yet written)

1. Read `data/rock-corpus/catalog.json` + `chapters/*.json`.
2. Filter to canonical chapters, teaching pages only.
3. Chunk per the rules above.
4. Embed in batches (`text-embedding-3-small`), upsert into namespace `rock-v1` with metadata.
5. Write a build report: chunk count, chapters covered, checksum of `manifest.json` it was
   built against (so we can detect corpus drift vs. what's live in Pinecone).
