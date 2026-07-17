# Privacy review

Default event content:

- SHA-256 query hash
- normalized concept
- exact graph IDs
- retrieval outcome and scores

Sanitized query text is disabled unless `BROBOT_KG_STORE_SANITIZED_QUERY=true`.

The sanitizer targets names, emails, phones, long identifiers, MRN/accession/account/room labels, DOBs, and street addresses. Full history and answer text are not stored in retrieval events.

Recommended retention:

- sanitized query text: 30 days
- pseudonymous retrieval events: 13 months
- aggregates: indefinite
- safety/expert correction events: governed clinical-quality retention

No destructive retention job was added.
