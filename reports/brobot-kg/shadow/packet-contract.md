# Packet contract

Schema version: `brobot-kg-packet-v1`

The packet contains retrieval/release IDs, status, scored anchors, typed facts, selected neighborhoods, coverage, limitations, and token estimate.

Budgets:

| Depth | Anchors | Entities | Relationships | Neighborhoods | Token ceiling |
|---|---:|---:|---:|---:|---:|
| Quick | 1 | 4 | 6 | 1 | 450 |
| Standard | 2 | 6 | 10 | 2 | 800 |
| Deep | 3 | 8 | 14 | 2 | 1,200 |

Raw Supabase rows are not accepted by BroBot context. Claims and decision points are absent by contract.
