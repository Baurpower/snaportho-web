# Retrieval policy

Policy version: `brobot-kg-shadow-v1`

- `score >= 0.55`: retrieve.
- `0.35 <= score < 0.55`: lightweight entity resolution.
- `score < 0.35`: bypass.

Positive signals include detected clinical entities, orthopaedic language, clinical task facets, clinical modes, selected branches, and conversation continuity. High ambiguity and patient-specific consult uncertainty reduce the score.

Deterministic bypasses cover billing/account, administration/scheduling, writing review, emotional support, greetings, product feedback, generic study planning, and unresolved clarification turns.

Mode-specific entity and predicate policies are centralized in `src/lib/brobot/kg/mode-policies.ts`. Consult safety and clarification behavior remain owned by the existing BroBot pipeline.
