# Product Integration Contract

Release contract version: `kg-beta-20260716-002`

BroBot, Prepare, Path to Ortho, and the browser extension must use the authenticated production RPCs or the authenticated application routes. They must not query canonical, staging, proposal, or batch tables directly.

## Topic lookup

- RPC: `find_kg_production_topics(p_query text, p_limit integer)`
- HTTP: `GET /api/knowledge-graph/topics?query=<text>&limit=<1-50>`

Each match includes `release_id`, `neighborhood_slug`, `coverage_status`, `review_tier`, matched entity ID, slug, and label. Inactive releases, inactive neighborhoods, hidden objects, and staging-only records are excluded.

## Neighborhood retrieval

- RPC: `get_kg_production_neighborhood(p_neighborhood_slug text)`
- HTTP: `GET /api/knowledge-graph/neighborhood/:slug`

The response contains:

- release ID, publication status, activation timestamp, lifecycle state, and verification hash
- `full` or `partial` coverage and the exact excluded-object count
- active entities with canonical identity, label, review tier, provenance tier, risk tier, verification hash, and source record IDs
- active relationships with canonical endpoints, predicate, review tier, provenance tier, risk tier, verification hash, and source record IDs
- active curriculum bridges with the same release metadata
- empty claim and decision-point arrays for this first broad release

Products must preserve the `automated_beta` tier internally and must not describe it as attending-certified. High-risk content may be displayed only when the returned object is present and carries complete provenance; this release candidate contains no high-risk objects.

## Feedback submission

- HTTP: `POST /api/knowledge-graph/feedback`

The body follows `KgFeedbackInput` in `src/lib/education/kg-feedback.ts`. Products should include the release ID and exact entity, relationship, and neighborhood IDs used in the retrieval. The server removes common direct identifiers and sensitive context keys before persistence.

## Shared helpers

- `getProductionKgNeighborhood`
- `findProductionKgTopics`
- `submitKgGraphFeedback`

The read helpers return `null` or an empty list for unavailable content, throw on database errors, and cap search limits at 50. Product routes require an authenticated user and return private, non-cacheable responses.

## Compatibility and failure behavior

- Release membership is additive; canonical IDs remain stable.
- A partial neighborhood is a valid response, not an error.
- A hidden or rolled-back release returns no neighborhood and no topic matches.
- Staging-only content is never returned.
- Consumers must tolerate new metadata fields and must not infer review tier from canonical review columns.
