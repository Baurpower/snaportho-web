-- ============================================================
-- CasePrep section reviews — RLS UPDATE policy fix
-- ============================================================
-- Problem: the original UPDATE policy requires reviewer_id = auth.uid(),
-- which means reviewer B cannot override reviewer A's decision on the same
-- section. With unique(procedure_slug, section_key), this causes a unique
-- constraint violation when reviewer B upserts after reviewer A.
--
-- Fix: allow any active caseprep reviewer to update any section review row.
-- The unique constraint already enforces one active decision per section;
-- any trusted reviewer should be able to change it.
-- ============================================================

drop policy if exists caseprep_section_reviews_update on public.caseprep_section_reviews;

create policy caseprep_section_reviews_update
  on public.caseprep_section_reviews
  for update
  to authenticated
  using (public.is_caseprep_reviewer())
  with check (public.is_caseprep_reviewer());
