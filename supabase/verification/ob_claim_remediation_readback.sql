-- Read-only; $1 is the original inventory run UUID. No source content returned.
with cohort as (
 select distinct provider,native_question_id from public.ob_claim_production_items where run_id=$1::uuid
), latest as (
 select distinct on(i.provider,i.native_question_id) i.provider,i.native_question_id,i.status,e.id event_id,e.coverage_verdict
 from public.ob_claim_production_items i join cohort co using(provider,native_question_id)
 join public.ob_claim_extraction_events e on e.item_id=i.id
 where i.status in('accepted','ai_review_unresolved','resolution_unresolved')
 order by i.provider,i.native_question_id,e.created_at desc,e.id desc
), edges as (
 select q.* from public.question_claim_links q join cohort co using(provider,native_question_id)
 where q.is_active and q.algorithm_version='orthobullets-claims-prod.v1'
), claims as (
 select distinct c.id,c.current_version_id,c.review_status from edges q join public.educational_claims c on c.id=q.claim_id and c.is_active
), versions as (
 select c.id claim_id,c.current_version_id,v.review_status,c.review_status parent_review_status from claims c join public.educational_claim_versions v on v.id=c.current_version_id and v.claim_id=c.id
), candidates as (
 select c.* from latest l join public.ob_claim_candidates c on c.extraction_event_id=l.event_id
), stage_jobs as (
 select j.stage,j.policy_version,j.status,j.outcome,count(*) jobs from public.claim_enrichment_jobs j join versions v on v.current_version_id=j.claim_version_id group by 1,2,3,4
)
select jsonb_build_object(
 'inventoryQuestions',(select count(*)from cohort),
 'latestCompletedQuestions',(select count(*)from latest),
 'latestOutcomes',(select coalesce(jsonb_object_agg(status,n),'{}')from(select status,count(*)n from latest group by status)s),
 'unresolvedQids',(select coalesce(jsonb_agg(native_question_id order by native_question_id),'[]')from latest where status<>'accepted'),
 'activeProductionEdges',(select count(*)from edges),
 'distinctActiveClaims',(select count(*)from claims),
 'currentVersions',(select count(*)from versions),
 'servableCurrentVersions',(select count(*)from versions v join public.servable_claim_versions s on s.claim_version_id=v.current_version_id),
 'parentApprovedVersionUnreviewed',(select count(*)from versions where parent_review_status='approved' and review_status='unreviewed'),
 'historicalApprovalReceipts',(select count(*)from public.claim_version_attestations a join versions v on v.current_version_id=a.claim_version_id where a.dimension='historical_approval'),
 'currentPositivePublicationReceipts',(select count(*)from versions v where public.claim_version_effective_state(v.current_version_id)#>>'{publication,verdict}'='eligible'),
 'acceptedCandidates',(select count(*)from candidates where accepted),
 'acceptedRepairedCandidates',(select count(*)from candidates where accepted and repair_action in('rewrite','split')),
 'acceptedRepairedWithoutFinalReceipt',(select count(*)from candidates c left join public.ob_claim_final_reviews f on f.candidate_id=c.id where c.accepted and c.repair_action in('rewrite','split')and f.candidate_id is null),
 'entityEdges',(select coalesce(jsonb_agg(to_jsonb(s)),'[]')from(select ce.entity_kind,ce.role,count(*)edges,count(distinct ce.claim_id)claims from public.claim_entities ce join versions v on v.current_version_id=ce.claim_version_id where ce.is_active group by 1,2)s),
 'stageJobs',(select coalesce(jsonb_agg(to_jsonb(j)),'[]')from stage_jobs j),
 'modelUsage',(select jsonb_build_object('invocations',count(*),'unknownUsage',count(*)filter(where inv.status<>'completed'),'promptTokens',sum(prompt_tokens),'completionTokens',sum(completion_tokens),'estimatedCostUsd',sum(estimated_cost_usd))from public.claim_model_invocations inv join public.claim_enrichment_jobs j on j.id=inv.job_id join versions v on v.current_version_id=j.claim_version_id)
) as readback;
