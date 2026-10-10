-- Run with a bound cohort_run parameter. This records historical approval;
-- it cannot grant source fidelity, clinical validity, or publication.
with cohort_claims as (
 select distinct c.id,c.current_version_id,c.metadata->'approval' original_approval
 from public.ob_claim_production_items i
 join public.question_claim_links q on q.provider=i.provider and q.native_question_id=i.native_question_id and q.is_active
 join public.educational_claims c on c.id=q.claim_id and c.is_active
 join public.educational_claim_versions v on v.id=c.current_version_id and v.claim_id=c.id
 where i.run_id=$1::uuid and c.review_status='approved' and v.review_status='unreviewed'
  and c.metadata #>> '{approval,batch}'='bulk-2026-10-07'
), recorded as (
 insert into public.claim_version_attestations(claim_id,claim_version_id,dimension,verdict,policy_version,actor,reason_codes,metadata,idempotency_key)
 select id,current_version_id,'historical_approval','recorded','legacy-bulk-approval-import.v1','legacy-import',
  array['legacy_parent_approval_only','source_review_not_recovered'],jsonb_build_object('originalApproval',original_approval),
  'legacy-bulk-2026-10-07:'||current_version_id::text from cohort_claims
 on conflict(idempotency_key) do nothing returning id
) select count(*) as recorded from recorded;
