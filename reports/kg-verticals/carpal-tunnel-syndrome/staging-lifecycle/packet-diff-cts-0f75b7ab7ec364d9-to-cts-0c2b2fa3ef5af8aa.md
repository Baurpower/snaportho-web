# CTS staging packet diff

Previous batch: `cts-0f75b7ab7ec364d9`  
New batch: `cts-0c2b2fa3ef5af8aa`  
Previous graph hash: `0f75b7ab7ec364d9433df7d9efe07eae105615bfeca4979519e18db4a72f0eda`  
New graph hash: `0c2b2fa3ef5af8aa64d276ea972e2725508099edb0dab1eddd88b301d25a3af0`  
New packet hash: `a8db440851cd7742871e81a4292c2a0af0cbf9005e7e12e64d5e5745d9d35c13`

## Graph changes

Added objects: none.

Removed objects:

1. Entity `cts-6-clinical-diagnostic-tool`.
2. Relationship `carpal-tunnel-syndrome has_classification cts-6-clinical-diagnostic-tool`.
3. Relationship `carpal-tunnel part_of hand-wrist-anatomy-hub`.

Revised graph objects: none beyond removal of the three adjudicated objects.
All previously accepted claim and decision-point revisions remain byte-equivalent
in the finalized graph. The eight relationships rejected before this lifecycle
remain absent.

## Proposal changes

- Previous: 226 proposals: 207 `approved`, 19 `needs_review`.
- New: 207 proposals: 207 `approved`, 0 `needs_review`.
- Canonical entity proposals: 93 to 92.
- Canonical relationship proposals: 116 to 114.
- Curriculum bridge proposals: unchanged at 1.
- Claim proposal rows: 8 to 0. The eight reviewed claims remain in the finalized
  graph but are outside the supported canonical staging-apply object scope.
- Decision-point proposal rows: 8 to 0. The eight reviewed decision points remain
  in the finalized graph but are outside the supported canonical staging-apply
  object scope.

No proposal changed from an unresolved state to an unexplained approval. The
three graph proposals received explicit `REJECT` ledger entries; the other 16
rows were removed from this apply packet because their decisions were already
complete and the canonical apply intentionally has no persistence target for
their types.

## Dependency and identity changes

- Removing the CTS-6 entity also removed its only dependent relationship.
- Removing the invalid `part_of` edge does not remove either preexisting endpoint.
- No new canonical identity, endpoint, predicate, or cross-neighborhood ownership
  dependency was introduced.
- Every remaining relationship endpoint resolves within the finalized entity set.

The observed diff is limited to the final adjudications and the correction of
the packet's supported-object scope; no unrelated graph drift was detected.
