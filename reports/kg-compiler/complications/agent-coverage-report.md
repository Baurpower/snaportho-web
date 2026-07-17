# Complications — Agent Coverage Report

Manufactured: 2026-07-08

## Required agents vs execution

| Agent | Required by work plan | Executed | Zero-work documented |
|---|---|---|---|
| Anatomy Builder | no | no | yes |
| Clinical Entity Builder | iteration 1 only | yes (iter 1) | yes (iter 2) |
| Relationship Builder | yes | yes | — |
| Claim Builder | no | no | yes |
| Decision Point Builder | no | no | yes |
| Metadata Builder | no | no | yes |
| Asset Linker | no | no | yes |
| Provenance Builder | no | no | yes |
| Duplicate Detector | yes | yes | — |
| Conflict Resolver | yes | yes | — |
| Quality Scorer | yes | yes | — |
| Review Assistant | yes | yes | — |
| Publication Validator | yes | yes | — |
| Neighborhood QA | external audit | yes | — |

Unmet agent capabilities: **0** (`unmet-agent-capabilities.json`).

Remaining automatic improvement: none that the Relationship Builder can safely
emit without inventing Surgical Approaches identities. Remaining work requires
human/attending review and approach backbone linkage.
