# KG Automation — Web Review UI TODO

Today `kg_automation_proposals` is reviewed entirely via CLI (`review-packet`
report markdown → `approve-packet` / `approve-batch`). The strategically more
important next-gen system has a worse review UX than the older Anki mapping
system, which already has a real dashboard. This pass attached reviewer identity
to script approvals (`--reviewer-id` / `KG_AUTOMATION_REVIEWER_ID`) so a web UI
can later supply the authenticated reviewer's id the same way.

**Do not build the full UI speculatively.** When it's built, model it on the
existing, proven Anki KG review dashboard rather than inventing a new pattern:

- Component: `src/components/anki-kg-review/AnkiKgReviewDashboard.tsx`
- API read: `src/app/api/admin/anki-kg-review/route.ts`
- API actions: `src/app/api/admin/anki-kg-review/actions/route.ts`
- Access control: `requireCasePrepReviewer()` from `src/lib/caseprep-review/access-control`
- Audit pattern: append-only `anki_kg_review_actions` table

Concrete path for the proposals UI:

1. `GET /api/admin/kg-automation-review` — list active proposals grouped by
   packet (reuse `getReviewPacketKey` / `resolvePacketSelection` from
   `scripts/kg-automation-common.ts`; promote shared logic into `src/lib` first).
2. `POST /api/admin/kg-automation-review/actions` — approve / reject a packet,
   writing `reviewed_by = auth.uid()` (the id this pass already wired through the
   approval payload), gated by the same reviewer role check.
3. Show registry validation (`validateRelationshipTriple`) inline for
   `add_canonical_relationship` proposals so reviewers see invalid triples before
   approving.
4. Consider an append-only `kg_automation_review_actions` audit table mirroring
   `anki_kg_review_actions` (the proposals table currently records reviewer info
   inline, with no separate history ledger).
