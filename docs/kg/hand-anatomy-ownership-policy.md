# Hand Anatomy Ownership Policy

This policy governs graph-finalization behavior for Hand and Wrist manufacturing. It is graph governance, not an educational section template.

## Canonical owner

The canonical Hand anatomy backbone owns identity and core anatomical relationships for:

- muscles
- tendons
- tendon zones
- pulleys
- nerves and branches
- vessels
- bones
- joints
- ligaments
- compartments and canals

Condition neighborhoods import or reference these canonical identities. Procedure neighborhoods add procedure-specific exposure, risk, approach, and complication relationships. Exam neighborhoods add examination and functional-assessment relationships.

## Permitted local references

Condition topics may reference shared anatomy when the anatomy supports symptoms, examination, diagnostic testing, treatment planning, or complications. Local metadata may differ for topic-specific teaching role, review routing, or evidence packet traceability, but the identity and core anatomy ownership remain with the Hand anatomy backbone.

## New anatomy identity creation

Create a new local anatomy identity only when:

1. no canonical or alias-equivalent identity exists,
2. the source packet explicitly requires the anatomy concept,
3. the entity has a proposed canonical owner,
4. unresolved identity ambiguity is routed to curator review.

Do not create duplicate local anatomy merely because a topic mentions the structure.

## Unresolved anatomy routing

Unresolved Hand anatomy routes to curator review. Anatomy-at-risk relationships in procedures route to attending review. EDX-specific anatomy claims route to an electrodiagnostic specialist when the source claim depends on test interpretation.

## Valid shared-node defer

A local anatomy node is a valid staging defer when all are true:

1. it is a recognized Hand anatomy backbone class,
2. the future owner is identified,
3. it is not a placeholder,
4. it is not required to complete a local relationship that would change clinical meaning,
5. publication remains blocked until source and identity reconciliation are complete.

## Staging blockers

The following block staged manufacturing:

- unexplained anatomy placeholders,
- classification systems with no condition link,
- procedures with no indication or pathway,
- duplicate anatomy identities without reuse/merge disposition,
- local anatomy that claims ownership while conflicting with the Hand anatomy backbone,
- invalid predicates used to force connectivity.

## CTS APB resolution

`abductor-pollicis-brevis` is a real intrinsic thenar muscle. In CTS it is referenced as a motor-examination and EDX-relevant anatomy concept. It should be owned by the canonical Hand anatomy backbone and consumed by CTS as a cross-neighborhood reference. CTS should not invent a direct disease-to-muscle edge solely to eliminate an orphan warning.
