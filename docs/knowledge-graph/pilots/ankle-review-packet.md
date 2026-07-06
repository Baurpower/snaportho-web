# Ankle Fracture — Review Packet (KF-011)

**Date:** 2026-07-05  
**Pilot:** `ankle-fracture-neighborhood`  
**Proposal artifact:** `reports/kg-pilots/ankle-proposal-packet.json`  
**Quality report:** `reports/kg-pilots/ankle-neighborhood-quality.md`  
**Estimated spec maturity:** Level 5 (not publication-ready)

---

## 1. Proposal summary

| Category | Count | Default status |
|----------|------:|----------------|
| Entity proposals | 19 | `generated` |
| Relationship proposals | 29 | `generated` / `needs_review` (high-risk) |
| Claim drafts | 7 | `needs_review`, `generated_draft` |
| Decision point drafts | 2 | `needs_review`, `generated_draft` |
| Curriculum bridge | 1 | `needs_review` |

**High-risk predicates (must not auto-approve):** `at_risk_structure`, `indicates_treatment`, `treated_by`, `uses_fixation`, `explains_instability`

---

## 2. Proposed entities — reviewer checklist

- [ ] Confirm `ankle-fracture` granularity (not conflated with ankle sprain / pilon)
- [ ] Confirm Weber as `classification_system` + A/B/C as `classification_grade` entities
- [ ] Confirm anatomy hub objects (ankle ring composite, malleoli, syndesmosis, deltoid, talus, SPN)
- [ ] Confirm `fixation_method` ORIF vs `procedure` Ankle ORIF distinction
- [ ] Reject any duplicate of existing canonical entities (none expected pre-migration)

---

## 3. Proposed relationships — reviewer checklist

- [ ] Anatomy hierarchy direction (`part_of`, `inserts_on`) correct
- [ ] `injured_in` vs `involves_anatomy` used appropriately
- [ ] `explains_instability` direction: anatomy/finding → condition
- [ ] `at_risk_structure` edges clinically accurate (superficial peroneal nerve)
- [ ] `indicates_treatment` from medial clear space → ORIF clinically defensible
- [ ] Relationship metadata (`anatomy_role`, `relevance_reason`) assigned on essential edges
- [ ] No generic region buckets as targets

---

## 4. Proposed claims — reviewer checklist

**All claims are DRAFT — rewrite for atomicity and clinical accuracy before any approval.**

| draft_id | Reviewer action |
|----------|-----------------|
| `claim-ankle-mortise-congruity` | Split if multi-assertion; confirm L1 |
| `claim-ankle-deltoid-unstable-fibula` | Confirm board_trap classification |
| `claim-ankle-medial-clear-space` | Confirm threshold language deferred to DP |
| `claim-ankle-ring-concept` | Confirm anatomy_pearl attachment to `ankle-ring` |
| `claim-ankle-isolated-fibula-trap` | **Safety relevance** — confirm cognitive_trap |
| `claim-ankle-stress-views` | Confirm L2 vs L1 |
| `claim-ankle-syndesmosis-language` | Confirm clinical_script scope |

- [ ] No claim marked `verified` without attending review on L1 safety content
- [ ] L1 cap ≤12 respected (7 proposed)

---

## 5. Proposed decision points — attending review required

| draft_id | Reviewer |
|----------|----------|
| `dp-ankle-unstable-mortise-orif` | **Attending** — operative pathway |
| `dp-ankle-stable-nonoperative` | **Attending** — nonoperative criteria |

- [ ] Thresholds explicit (medial clear space mm values — open clinical question)
- [ ] `safety_criticality` appropriate
- [ ] Linked to supporting claims/relationships after approval

---

## 6. Metadata and provenance

| Field | Status |
|-------|--------|
| Source signals | `trauma-ankle-fractures`, `ankle-fracture` |
| Card count proxy | 12 |
| Question count proxy | 98 |
| Provenance records | **Not attached** — required at apply time |
| Maturity metadata on entities | `maturity_target: 6` on ankle-fracture |

---

## 7. Publication blockers

| Blocker | Resolution |
|---------|------------|
| Migration not applied | Apply `20260705_120000_ankle_pilot_kg_vocabulary.sql` to staging |
| No human approvals | Run review queues; approve via `approve-kg-automation-packet.ts` |
| Claims/DPs are draft | Keep `content_source=generated_draft` until expert sign-off |
| No DB entities | Run apply script post-approval |
| Product cutover | **Out of scope** — no Prepare/BroBot changes in this pilot |

---

## 8. Open clinical questions

1. Should medial clear space threshold (e.g., >4 mm) be a DP threshold field vs imaging claim?
2. Should Weber A/B/C all be linked, or only B/C for pilot?
3. Is `ankle-fracture-foot-ankle-perspective` a separate entity or curriculum view only?
4. When to add `commonly_confused_with` ankle sprain (blocked — no sprain entity yet)?

---

## 9. Reviewer roles

| Role | Responsibility |
|------|----------------|
| Curator | Entity identity, relationship triage, claim editing |
| Clinical reviewer | Relationship clinical accuracy |
| Attending reviewer | DPs + L1 safety claims |
| Engineering reviewer | Migration apply + apply script smoke test |

---

## 10. Approval workflow (post-migration)

```
1. Review this packet + JSON proposals
2. Mark proposals approved in kg_automation_proposals (or batch approve script)
3. npm run kg:automation:apply-approved -- --dry-run
4. Apply to staging
5. Insert reviewed claims/DPs with review_status=approved, content_source=verified
6. Re-run npm run kg:pilot:ankle:quality — target Level 6+
7. Traversal smoke tests (separate script — Phase G)
```

**Do not skip attending review on operative indication DP.**