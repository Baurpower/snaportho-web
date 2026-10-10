-- Read-only, sanitized evaluation inventory. $1 is the original cohort run.
with cohort as(select distinct provider,native_question_id from public.ob_claim_production_items where run_id=$1::uuid),latest as(
 select distinct on(i.provider,i.native_question_id) i.provider,i.native_question_id,i.status,e.id event_id,e.source_fingerprint_hash,e.models
 from public.ob_claim_production_items i join cohort co using(provider,native_question_id)join public.ob_claim_extraction_events e on e.item_id=i.id
 where i.status in('accepted','ai_review_unresolved','resolution_unresolved') order by i.provider,i.native_question_id,e.created_at desc,e.id desc
),sets as(
 select l.*,encode(extensions.digest(l.native_question_id||':orthobullets-audit-2026-10-08','sha256'),'hex')selection_hash,
 coalesce(bool_or(c.final_text ~ '[0-9]'),false)numeric_fact,
 coalesce(bool_or(c.final_text ~* '\m(no|not|never|without|contraindicat)'),false)negation,
 coalesce(bool_or(c.final_text ~* '\m(compared|versus|than|higher|lower)'),false)treatment_comparison,
 coalesce(bool_or(coalesce(c.qualifiers->>'age_group','') ~* '(pediatric|child|adolescent)'),false)pediatric,
 coalesce(bool_or(c.accepted and c.repair_action in('rewrite','split')),false)repaired,
 coalesce(jsonb_agg(jsonb_build_object('candidateId',c.id,'accepted',c.accepted,'repairAction',c.repair_action) order by c.candidate_index)filter(where c.id is not null),'[]')candidates
 from latest l left join public.ob_claim_candidates c on c.extraction_event_id=l.event_id group by l.provider,l.native_question_id,l.status,l.event_id,l.source_fingerprint_hash,l.models
),ranked as(
 select *,row_number()over(partition by status order by selection_hash)random_rank,
 row_number()over(partition by numeric_fact order by selection_hash)numeric_rank,
 row_number()over(partition by negation order by selection_hash)negation_rank,
 row_number()over(partition by treatment_comparison order by selection_hash)comparison_rank,
 row_number()over(partition by pediatric order by selection_hash)pediatric_rank,
 row_number()over(partition by models->>'generator' order by selection_hash)model_rank from sets
)
select provider,native_question_id,status,event_id,source_fingerprint_hash,models,candidates,
 (status='accepted' and random_rank<=25)random_sample,
 array_remove(array[
 case when status<>'accepted' then 'unresolved' end,case when repaired then 'repaired' end,
 case when numeric_fact and numeric_rank<=10 then 'numeric' end,
 case when negation and negation_rank<=10 then 'negation' end,
 case when treatment_comparison and comparison_rank<=10 then 'comparison' end,
 case when pediatric and pediatric_rank<=10 then 'pediatric' end,
 case when model_rank<=3 then 'model_configuration' end
 ],null)targeted_strata
from ranked order by native_question_id;
