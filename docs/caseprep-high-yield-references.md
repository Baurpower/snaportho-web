# CasePrep High-Yield References

The CasePrep packet loads references as a sidecar after a canonical procedure is
resolved. Opening **High-Yield References** calls `POST /api/case-prep/references`;
the CasePrep SSE stream is never delayed or failed by literature retrieval.

## Sources and ranking

The endpoint reuses BroBot Read Next:

- verified rows from `brobot_reading_resources`;
- PubMed E-utilities with exact procedure-topic verification;
- OpenAlex citation counts;
- packet-provided links after trusted-domain verification;
- Orthobullets' public first-party quick-search results;
- AO Surgery Reference's published sitemap index; and
- topic-matched Nailed It Ortho podcast episodes from its public WordPress search API.

Results are deduplicated and selected in lanes: up to two educational/technique
resources, up to two reviews/guidelines, one landmark or highly cited paper, then
the strongest remaining papers, with a six-resource maximum. One Nailed It Ortho
episode receives its own podcast lane when a strongly matched episode is found.

## Optional production configuration

PubMed works without a key, but NCBI recommends identifying the application and
using a key at higher request rates:

```text
NCBI_TOOL=snaportho-caseprep-references
NCBI_EMAIL=...
NCBI_API_KEY=...
```

Trusted-site discovery requires no Google account, cloud project, API key, or
search-engine configuration. Results are restricted to the allowlisted hosts,
strongly verified against the canonical case topic, cached for six hours, and
treated as non-fatal if a source is temporarily unavailable. Curated trusted
resources and PubMed/OpenAlex remain available during any such outage.

## Security and analytics

The endpoint accepts an authenticated Supabase session or a signed BroBot guest
session. Database reads use the server client and return only verified resources.
Clicks and impressions reuse `brobot_reading_events`, with chat identifiers null
and `surface`, `packet_id`, `canonical_slug`, and recommendation metadata stored
in the JSON metadata field. Raw case prompts are not written to analytics.

No schema migration is required because the existing reading-resource, cache,
and event tables already support this sidecar and nullable chat identifiers.
