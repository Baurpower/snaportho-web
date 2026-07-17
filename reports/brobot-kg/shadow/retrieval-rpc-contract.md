# Retrieval RPC contract

RPC: `public.retrieve_brobot_kg_shadow`

Inputs:

- pinned release ID
- normalized query
- allowed entity types
- optional neighborhood hints
- allowed predicates
- candidate/entity/relationship/neighborhood limits

Output:

- exact release ID
- coverage
- scored candidates
- direct incoming/outgoing facts
- at most two neighborhood slugs
- limitations

The function reads active production overlay tables plus active aliases and canonical endpoint labels. It excludes inactive/deprecated endpoints, production exclusions, high-risk objects, claims, and decision points. Ordering and limits are deterministic. Execute permission is limited to authenticated/service-role clients.
