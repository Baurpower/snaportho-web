# Shadow smoke tests

Local verification:

- deterministic clinical retrieval: passed
- billing/writing/emotional/social bypass: passed
- privacy redaction and stable query hashing: passed
- release-key cache isolation: passed
- known miss gap classification: passed
- TypeScript checks for changed BroBot/KG files: passed
- Markdown/JSON diff checks: passed
- answer prompt integration: absent by inspection
- canonical/release mutation code: absent

Database-dependent smoke tests are pending application of the additive migration. Until then, provider RPC calls fail open with `error` telemetry behavior and do not affect answers.

The fixed set contains 75 prompts: 10 OR prep, 10 OITE, 10 clinic, 10 consult, 5 research, 10 bypass, 10 ambiguous/follow-up, 5 known gaps, and 5 high-risk/exclusion prompts.
