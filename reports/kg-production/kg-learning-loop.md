# Knowledge Graph Learning Loop

The production graph learns from use without silently rewriting clinical knowledge.

## Flow

1. A product retrieves an exact release projection.
2. The product submits feedback linked to the release and graph object IDs.
3. Repeated events are normalized and clustered by deterministic fingerprints.
4. A signal is assigned product impact, frequency, evidence readiness, graph reuse, review cost, and safety risk.
5. The system may prepare an auditable proposed entity, relationship, alias, metadata correction, provenance addition, neighborhood expansion, source acquisition, or review request.
6. Proposed clinical changes enter the existing proposal and validation workflow.
7. Validated changes move through staging and database verification.
8. A future immutable release manifest promotes eligible canonical IDs through the overlay.

`scripts/build-kg-feedback-signals.ts` implements the normalization boundary. Its default mode is read-only and emits clustered proposed signals. Persistence requires a separate explicit confirmation and writes only feedback-signal state; it never writes canonical or production publication records.

## Allowed automation

Low-risk, deterministic, reversible, schema-valid, non-clinical metadata corrections may be automated when tests and an audit record exist. Examples include harmless formatting, alias normalization, telemetry metadata, and confirmed membership records.

## Prohibited unattended promotion

The system must not directly self-publish clinical claims, emergency guidance, medication instructions, operative indications, contraindications, treatment selection, complication management, surgical bailout decisions, or disputed ontology decisions.

## Growth prioritization

The initial queue uses:

`product_demand × product_impact × evidence_readiness × graph_reuse ÷ review_cost`

Before activation, product demand defaults to one because no live release telemetry exists. After activation, query volume, retrieval failures, repeated corrections, affected products, curriculum importance, centrality, evidence availability, manufacturing effort, and safety risk replace that baseline. High-risk demand can raise review priority but cannot bypass review.
