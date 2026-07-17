# AC_JOINT_PROPOSAL_DRIFT Adjudication Packet

## Decision

This is historical proposal-label drift, not a duplicate identity or namespace collision. Automatic metadata normalization is safe.

- Canonical entity: `f3be2d30-1e96-46b1-a056-935a05ac9924`, `anatomy_structure/ac-joint`, **Acromioclavicular Joint**.
- Current and conflicting ownership: both resolve to `upper-extremity-trauma-cluster-shared`; there is no ownership conflict.
- Affected neighborhood: `proximal-humerus-fracture`.
- Relationship impact: none; relationship endpoints already target the canonical entity.
- Staging impact: one active semantic proposal says **Ac Joint**, and its one legacy membership lacks a canonical target.
- Publication impact: none directly.
- Review role required: none.
- Expected immediate unlock count: 0 until the neighborhood's separate aggregate-apply provenance gap is repaired.

Recommended resolution: change only the active semantic proposal label to **Acromioclavicular Joint**, preserve **Ac Joint** in resolution metadata, and attach the existing membership to the existing canonical row. Alternatives rejected: creating an alias-only workaround would leave the semantic proposal inconsistent; creating or merging canonical entities would manufacture a duplicate.
