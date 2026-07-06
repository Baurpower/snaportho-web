# DB-Backed Recompile Report — Ankle Fracture

**Generated:** 2026-07-05

## Command

```bash
npm run kg:compile -- --topic ankle-fracture --db-backed
```

## Data source comparison

| Source | Before apply | After apply |
|--------|--------------|-------------|
| Neighborhood | `spec` fallback | **`database`** ✅ |
| Proposals | `spec` fallback | **`database`** ✅ |
| DB snapshot loaded | false | **true** |

## Compiler metrics — before vs after

| Metric | Spec-only (pre-apply) | DB-backed (post-apply) | Delta |
|--------|----------------------:|-----------------------:|------:|
| Entity count | 19 (spec) | **19 (canonical DB)** | 0 |
| Relationship count | 29 (spec) | **21 (canonical DB)** | −8 pending |
| Claim drafts | 7 (spec) | **1 (DB draft)** | −6 pending review |
| Decision points | 2 (spec) | **0 (DB)** | −2 gated |
| Ontology gaps | 14 | **25** | +11* |
| Maturity (compiler) | 5 / 7 | **5 / 7** | — |
| Maturity (factory quality) | 5 | **6** | +1 ✅ |
| Publication ready | false | **false** | — |
| Human review % | 27.6% | **27.6%** | — |
| Auto-approved | 42 | **42** | — |

\*Gap count increased because the compiler now compares ontology requirements against **actual DB neighborhood** (21 relationships vs 29 in spec). The 8 pending high-risk/attending edges surface as explicit gaps — this is expected and desirable.

## DB counts confirmed

```json
{
  "entities": 19,
  "relationships": 21,
  "claims": 1,
  "decisionPoints": 0,
  "proposalsApplied": 42,
  "proposalsPending": 16
}
```

## Review completeness

| Metric | Value |
|--------|------:|
| Proposals in DB | 58 |
| Applied to canonical | 42 (72.4%) |
| Pending human/attending | 16 (27.6%) |
| `reviewCompleteness` (factory) | 0.72 |

## Key finding

The compiler successfully reads canonical DB state when `--db-backed` is passed.  
Without it, the compiler continues to use spec fallback (read-only planning mode).