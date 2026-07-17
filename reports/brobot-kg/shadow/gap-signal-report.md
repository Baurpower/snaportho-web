# Gap signal report

Implemented deterministic classes:

- missing neighborhood/entity
- weak ranking
- empty packet after filtering
- partial neighborhood coverage
- missing predicate family
- missing claim
- missing decision point

The latter two are emitted for matched topics because the pinned release has zero active claims and decision points. Events carry normalized concept, candidate entity/neighborhood, confidence, and reasons.

The database trigger aggregates event gap arrays into `brobot_kg_growth_queue`; it does not write graph, proposal, release, claim, or decision-point records.
