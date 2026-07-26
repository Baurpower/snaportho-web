# SnapOrtho incorporation agent

The human action **Submit enrichment** is the editorial approval. The
incorporation agent operationalizes that approved change; it does not perform a
second editorial vote.

## Configuration

Apply:

`supabase/migrations/20260726_200000_anki_streamlined_incorporation.sql`

Configure the production service with a high-entropy
`ANKI_INCORPORATION_AGENT_SECRET`. Give this secret to the incorporation agent,
not database credentials.

## Agent loop

1. `POST /api/anki/incorporation/agent/next` with
   `Authorization: Bearer $ANKI_INCORPORATION_AGENT_SECRET`.
2. A `204` response means the queue is empty.
3. Read the returned `instructions` and `candidate`.
4. Return a JSON plan matching `responseContract`. The normal action is to
   return the supplied contract unchanged: deterministic server code has
   already removed no-ops, protected fields, and invalid operations.
5. `POST` that plan to `/api/anki/incorporation/agent/execute` with the same
   authorization header.
6. Repeat until the queue is empty.

The agent must never generate SQL, use Supabase credentials, invent operations,
partially accept a safe candidate, or override `needs_attention`.

## Outcomes

- `incorporated`: the canonical version and existing-entity mappings were
  updated in one database transaction. The card is eligible for the next deck
  release.
- `needs_attention`: a concise issue is stored on the original proposal.
- `already_incorporated`: the proposal contained only duplicates or no-ops and
  is closed without creating a redundant card version.

New cards, ontology expansion, unresolved entities, stale conflicting versions,
invalid URLs, and unavailable target decks go to `needs_attention`.

## Release boundary

Incorporation updates governed canonical data. It does not directly publish a
deck release. The existing draft-release builder should include the resulting
current canonical version in the next release.
