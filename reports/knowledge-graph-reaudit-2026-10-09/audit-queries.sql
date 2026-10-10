-- Read-only audit queries. Run sections separately; no application mutations.
-- anonProbe changes transaction-local role only and rolls back.

-- SECTION: claims
select jsonb_build_object(
'states',(select jsonb_agg(to_jsonb(t)) from(select c.algorithm_version,c.content_source,c.review_status,c.approval_method,v.review_status version_review,count(*) claims,count(*)filter(where c.is_active) active,count(*)filter(where s.claim_version_id is not null) servable,count(*)filter(where c.primary_entity_id is not null) primary_entity from educational_claims c left join educational_claim_versions v on v.id=c.current_version_id left join servable_claim_versions s on s.claim_version_id=v.id group by 1,2,3,4,5)t),
'types',(select jsonb_agg(to_jsonb(t))from(select claim_type,importance_level,count(*) n from educational_claims where is_active group by 1,2)t),
'integrity',(select jsonb_build_object('missingHead',count(*)filter(where v.id is null),'crossClaimHead',count(*)filter(where v.claim_id<>c.id),'parentTextDrift',count(*)filter(where c.claim_text is distinct from v.claim_text),'parentQualifierDrift',count(*)filter(where c.qualifiers is distinct from v.qualifiers),'parentHashDrift',count(*)filter(where c.fingerprint_hash is distinct from v.fingerprint_hash),'parentApprovedSnapshotUnreviewed',count(*)filter(where c.review_status='approved' and v.review_status='unreviewed'),'missingSemanticIdentity',count(*)filter(where c.semantic_fingerprint_hash is null),'emptyQualifiers',count(*)filter(where c.qualifiers='{}'::jsonb))from educational_claims c left join educational_claim_versions v on v.id=c.current_version_id where c.is_active),
'semanticDuplicates',(select jsonb_build_object('groups',count(*),'claims',coalesce(sum(n),0))from(select semantic_fingerprint_hash,count(*)n from educational_claims where is_active and semantic_fingerprint_hash is not null group by 1 having count(*)>1)t),
'attestations',(select jsonb_agg(to_jsonb(t))from(select dimension,verdict,policy_version,count(*) n from claim_version_attestations group by 1,2,3)t),
'qualityFlags',(select jsonb_agg(to_jsonb(t))from(select code,severity,count(*) n,count(distinct claim_version_id) versions from claim_quality_flags group by 1,2)t),
'servableFlags',(select count(*)from claim_quality_flags f join servable_claim_versions s on s.claim_version_id=f.claim_version_id),
'versionsPerClaim',(select jsonb_object_agg(n,claims)from(select n,count(*)claims from(select claim_id,count(*)n from educational_claim_versions group by 1)v group by n)t)
) audit;


-- SECTION: links
with release as(select id from anki_deck_releases where status='published' order by published_at desc nulls last,created_at desc limit 1) select jsonb_build_object(
'questionLinks',(select jsonb_agg(to_jsonb(t))from(select q.algorithm_version,q.mapping_role,q.review_status,q.approval_method,count(*)n,count(distinct q.native_question_id)questions,count(distinct q.claim_id)claims from question_claim_links q where q.is_active group by 1,2,3,4)t),
'questionIntegrity',(select jsonb_build_object('active',count(*),'missingClaim',count(*)filter(where c.id is null),'inactiveClaim',count(*)filter(where not c.is_active),'staleVersion',count(*)filter(where q.claim_version_id is distinct from c.current_version_id),'wrongVersionOwner',count(*)filter(where v.claim_id<>q.claim_id),'missingRegistryQuestion',count(*)filter(where q.external_question_id is null),'registryIdMismatch',count(*)filter(where eq.external_question_id is distinct from q.native_question_id and q.external_question_id is not null),'servableClaims',count(distinct s.claim_id))from question_claim_links q left join educational_claims c on c.id=q.claim_id left join educational_claim_versions v on v.id=q.claim_version_id left join external_questions eq on eq.id=q.external_question_id left join servable_claim_versions s on s.claim_version_id=q.claim_version_id where q.is_active),
'cardLinks',(select jsonb_agg(to_jsonb(t))from(select algorithm_version,mapping_role,review_status,approval_method,count(*)n,count(distinct claim_id)claims,count(distinct canonical_card_id)cards from card_claim_links where is_active group by 1,2,3,4)t),
'cardIntegrity',(select jsonb_build_object('active',count(*),'staleClaimVersion',count(*)filter(where l.claim_version_id is distinct from c.current_version_id),'staleCardVersion',count(*)filter(where l.canonical_card_version_id is distinct from cc.current_version_id),'inactiveCard',count(*)filter(where not cc.is_active),'missingVersion',count(*)filter(where cv.id is null),'wrongCardVersionOwner',count(*)filter(where cv.canonical_card_id<>cc.id),'notCurrentRelease',count(*)filter(where not exists(select 1 from anki_deck_release_cards r,release where r.deck_release_id=release.id and r.canonical_card_id=l.canonical_card_id and r.canonical_card_version_id=l.canonical_card_version_id and r.inclusion_status='included')),'servableClaimLinks',count(*)filter(where s.claim_version_id is not null),'servableTeachesLinks',count(*)filter(where s.claim_version_id is not null and l.mapping_role='teaches'),'missingEvidenceHashes',count(*)filter(where cardinality(l.evidence_hashes)=0))from card_claim_links l left join educational_claims c on c.id=l.claim_id left join canonical_cards cc on cc.id=l.canonical_card_id left join canonical_card_versions cv on cv.id=l.canonical_card_version_id left join servable_claim_versions s on s.claim_version_id=l.claim_version_id where l.is_active),
'entityEdges',(select jsonb_agg(to_jsonb(t))from(select entity_kind,role,algorithm_version,count(*)n,count(distinct claim_id)claims from claim_entities where is_active group by 1,2,3)t),
'entityIntegrity',(select jsonb_build_object('active',count(*),'staleClaimVersion',count(*)filter(where e.claim_version_id is distinct from c.current_version_id),'untrustedCanonical',count(*)filter(where e.entity_kind='canonical' and t.id is null),'rejectedOrInactiveProposal',count(*)filter(where e.entity_kind='proposed' and (not p.is_active or p.review_status in('rejected','superseded'))),'missingProposal',count(*)filter(where e.entity_kind='proposed' and p.id is null))from claim_entities e left join educational_claims c on c.id=e.claim_id left join trusted_canonical_entities t on t.id=e.canonical_entity_id left join kg_automation_proposals p on p.id=e.proposed_proposal_id where e.is_active),
'claimsWithSubject',(select count(distinct e.claim_id)from claim_entities e join educational_claims c on c.id=e.claim_id and c.current_version_id=e.claim_version_id join trusted_canonical_entities t on t.id=e.canonical_entity_id where e.is_active and e.role in('teaches_about','tested_answer')),
'claimsMultipleSubjects',(select count(*)from(select claim_version_id,count(distinct canonical_entity_id)n from claim_entities where is_active and entity_kind='canonical' and role in('teaches_about','tested_answer')group by 1 having count(distinct canonical_entity_id)>1)t),
'releases',(select jsonb_agg(jsonb_build_object('id',id,'version',release_version,'status',status,'publishedAt',published_at))from anki_deck_releases),
'currentReleaseCards',(select count(*)from anki_deck_release_cards r,release where r.deck_release_id=release.id and r.inclusion_status='included')
) audit;


-- SECTION: graph
select jsonb_build_object(
'entities',(select jsonb_agg(to_jsonb(t))from(select entity_type,status,review_status,is_active,count(*)n from canonical_entities group by 1,2,3,4)t),
'trustedEntities',(select count(*)from trusted_canonical_entities),
'duplicateLabels',(select jsonb_agg(to_jsonb(t))from(select normalized_label,count(*)n,count(distinct entity_type)types from canonical_entities where is_active group by 1 having count(*)>1 order by n desc limit 30)t),
'aliasAmbiguity',(select jsonb_agg(to_jsonb(t))from(select normalized_alias,count(distinct canonical_entity_id)n from canonical_entity_aliases where is_active and review_status='approved' group by 1 having count(distinct canonical_entity_id)>1)t),
'aliases',(select jsonb_agg(to_jsonb(t))from(select review_status,alias_type,count(*)n from canonical_entity_aliases where is_active group by 1,2)t),
'relationships',(select jsonb_agg(to_jsonb(t))from(select predicate,review_status,provenance_status,lifecycle_status,is_active,count(*)n from canonical_relationships group by 1,2,3,4,5)t),
'relationshipIntegrity',(select jsonb_build_object('active',count(*),'selfLoops',count(*)filter(where r.subject_entity_type=r.object_entity_type and r.subject_entity_id=r.object_entity_id),'missingSubject',count(*)filter(where r.subject_entity_type='canonical_entity' and se.id is null),'missingObject',count(*)filter(where r.object_entity_type='canonical_entity' and oe.id is null),'untrustedEndpoint',count(*)filter(where (r.subject_entity_type='canonical_entity' and st.id is null)or(r.object_entity_type='canonical_entity' and ot.id is null)))from canonical_relationships r left join canonical_entities se on se.id=r.subject_entity_id left join canonical_entities oe on oe.id=r.object_entity_id left join trusted_canonical_entities st on st.id=r.subject_entity_id left join trusted_canonical_entities ot on ot.id=r.object_entity_id where r.is_active),
'release',(select jsonb_agg(jsonb_build_object('id',release_id,'publication',publication_status,'reviewTier',review_tier,'status',status,'activatedAt',activated_at,'rollback',rollback_state))from kg_production_releases),
'neighborhoods',(select jsonb_agg(to_jsonb(t))from(select publication_status,lifecycle_state,review_tier,coverage_status,count(*)n from kg_production_neighborhoods group by 1,2,3,4)t),
'productionObjects',(select jsonb_agg(to_jsonb(t))from(select target_table,publication_status,review_tier,provenance_status,risk_tier,count(*)n from kg_production_objects group by 1,2,3,4,5)t),
'isolatedTrustedEntities',(select count(*)from trusted_canonical_entities e where not exists(select 1 from canonical_relationships r where r.is_active and (r.subject_entity_id=e.id or r.object_entity_id=e.id))),
'provenanceCount',(select count(*)from ontology_provenance_records)
) audit;


-- SECTION: automation
select jsonb_build_object('proposals',(select jsonb_agg(to_jsonb(t))from(select proposal_type,review_status,is_active,count(*)n,count(*)filter(where cardinality(source_signal_ids)=0) no_source_signals,count(*)filter(where supporting_source_count=0) zero_support_count,count(*)filter(where conflict_count>0) conflicts from kg_automation_proposals group by 1,2,3)t),'membership',(select jsonb_agg(to_jsonb(t))from(select packet_state,apply_disposition,count(*)n from kg_proposal_batch_memberships group by 1,2)t),'gaps',(select jsonb_agg(to_jsonb(t))from(select gap_class,owner,disposition,count(*)n from educational_claim_gaps where is_active group by 1,2,3)t),'growthQueue',(select jsonb_agg(to_jsonb(t))from(select lifecycle_status,gap_type,proposed_repair_type,count(*)n,sum(unique_user_count)user_count_sum,sum(total_query_count)query_count_sum,min(first_seen_at)first_seen,max(last_seen_at)last_seen from brobot_kg_growth_queue group by 1,2,3)t),'jobs',(select jsonb_agg(to_jsonb(t))from(select stage,policy_version,status,outcome,count(*)n from claim_enrichment_jobs group by 1,2,3,4)t),'leases',(select jsonb_build_object('expired',count(*)filter(where status='leased'and lease_expires_at<now()),'staleVersion',count(*)filter(where j.claim_version_id is distinct from c.current_version_id))from claim_enrichment_jobs j join educational_claims c on c.id=j.claim_id),'costs',(select jsonb_agg(to_jsonb(t))from(select policy_version,status,model,count(*)n,sum(prompt_tokens)prompt_tokens,sum(completion_tokens)completion_tokens,sum(estimated_cost_usd)cost from claim_model_invocations group by 1,2,3)t),'obRuns',(select jsonb_agg(jsonb_build_object('id',id,'status',status,'expected',expected_count,'completed',completed_count,'accepted',accepted_count,'unresolved',unresolved_count,'failed',failed_count,'release',release_sha,'started',started_at,'updated',updated_at,'cost',total_estimated_cost_usd))from ob_claim_production_runs),'runEventCostMismatch',(select jsonb_agg(to_jsonb(t))from(select r.id,r.total_estimated_cost_usd run_cost,sum(e.estimated_cost_usd)event_cost,r.total_estimated_cost_usd-coalesce(sum(e.estimated_cost_usd),0)difference from ob_claim_production_runs r left join ob_claim_extraction_events e on e.run_id=r.id group by r.id having abs(r.total_estimated_cost_usd-coalesce(sum(e.estimated_cost_usd),0))>0.0000001)t)) audit;


-- SECTION: provenance
select jsonb_build_object('relationshipEndpointTypes',(select jsonb_agg(to_jsonb(t))from(select subject_entity_type,object_entity_type,count(*)n from canonical_relationships group by 1,2)t),'relationshipDangling',(select jsonb_build_object('missingSubject',count(*)filter(where se.id is null),'missingObject',count(*)filter(where oe.id is null),'untrustedSubject',count(*)filter(where st.id is null),'untrustedObject',count(*)filter(where ot.id is null))from canonical_relationships r left join canonical_entities se on se.id=r.subject_entity_id left join canonical_entities oe on oe.id=r.object_entity_id left join trusted_canonical_entities st on st.id=r.subject_entity_id left join trusted_canonical_entities ot on ot.id=r.object_entity_id where r.is_active),'metadataKeys',(select jsonb_agg(to_jsonb(t))from(select family,key,count(*)n from(select 'claim'family,jsonb_object_keys(metadata)key from educational_claims union all select 'entity',jsonb_object_keys(metadata)from canonical_entities union all select 'relationship',jsonb_object_keys(metadata)from canonical_relationships)t group by 1,2)t),'productionSourceRecords',(select jsonb_agg(to_jsonb(t))from(select target_table,count(*)n,count(*)filter(where cardinality(source_record_ids)=0)empty_source_record_ids,count(*)filter(where verification_hash is null or verification_hash='')missing_hash from kg_production_objects group by 1)t),'servableAlgorithms',(select jsonb_agg(to_jsonb(t))from(select c.algorithm_version,c.content_source,c.approval_method,count(*)n from servable_claim_versions s join educational_claims c on c.id=s.claim_id group by 1,2,3)t),'semanticDuplicatePairs',(select jsonb_agg(to_jsonb(t))from(select semantic_fingerprint_hash,count(*)n,count(distinct claim_text)texts,count(distinct primary_entity_id)entity_ids,jsonb_agg(distinct algorithm_version)algorithms from educational_claims where is_active group by 1 having count(*)>1 order by n desc limit 15)t)) audit;


-- SECTION: security
with tables as (
select c.relname name,c.relkind kind,c.relrowsecurity rls,c.reloptions options,
has_table_privilege('anon',c.oid,'SELECT') anon_select,has_table_privilege('authenticated',c.oid,'SELECT') authenticated_select,
has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE') anon_write,has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') authenticated_write,
(select jsonb_agg(jsonb_build_object('name',polname,'roles',polroles,'command',polcmd,'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid)))from pg_policy p where p.polrelid=c.oid) policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('educational_claims','educational_claim_versions','claim_entities','card_claim_links','question_claim_links','claim_version_attestations','servable_claim_versions','trusted_canonical_entities','claim_enrichment_jobs','claim_model_invocations','claim_model_budgets','ob_claim_final_reviews','canonical_entities','canonical_relationships','kg_automation_proposals','kg_proposal_batch_memberships','card_canonical_entity_links','claims_review_backup_2026_10_07','kg_graph_feedback_events','brobot_kg_retrieval_events')
), functions as (
select p.proname name,pg_get_function_arguments(p.oid) arguments,p.prosecdef security_definer,p.proconfig config,
has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname ~ '(brobot.*(retrieve|knowledge)|claim_version|claim_enrichment|claim_model|ob_claim|commit_orthobullets|educational_claim)'
)
select jsonb_build_object('tables',(select jsonb_agg(to_jsonb(t))from tables t),'functions',(select jsonb_agg(to_jsonb(f))from functions f))audit;


-- SECTION: anonProbe
begin read only; set local role anon; select jsonb_build_object('cardEntityLinks',(select count(*) from public.card_canonical_entity_links),'proposalMemberships',(select count(*) from public.kg_proposal_batch_memberships),'reviewBackup',(select count(*) from public.claims_review_backup_2026_10_07),'trustedEntitiesView',(select count(*)from public.trusted_canonical_entities),'baseCanonicalEntities',(select count(*)from public.canonical_entities)) anonymous_role_read_probe; rollback;


-- SECTION: coverage
with coverage as (
select count(*) claims,
count(*) filter(where exists(select 1 from claim_entities ce join trusted_canonical_entities t on t.id=ce.canonical_entity_id where ce.claim_id=c.id and ce.claim_version_id=c.current_version_id and ce.is_active and ce.role in('teaches_about','tested_answer'))) canonical_subject,
count(*) filter(where te.id is not null) primary_trusted,
count(*) filter(where exists(select 1 from card_claim_links l where l.claim_id=c.id and l.claim_version_id=c.current_version_id and l.is_active and l.mapping_role='teaches')) card_linked,
count(*) filter(where exists(select 1 from question_claim_links l where l.claim_id=c.id and l.claim_version_id=c.current_version_id and l.is_active)) question_linked,
count(*) filter(where not exists(select 1 from question_claim_links q where q.claim_id=c.id and q.is_active) and not exists(select 1 from card_claim_links l where l.claim_id=c.id and l.is_active)) no_source_link,
count(*) filter(where exists(select 1 from claim_quality_flags f where f.claim_id=c.id and f.claim_version_id=c.current_version_id)) any_quality_flag,
count(*) filter(where exists(select 1 from claim_version_attestations a where a.claim_version_id=c.current_version_id and a.dimension='clinical_validity')) clinical_attestation,
count(*) filter(where exists(select 1 from claim_quality_flags f where f.claim_version_id=c.current_version_id and f.code in('extractor_image_deictic','extractor_vignette_context','extractor_explicit_deictic'))) image_or_vignette_flags
from educational_claims c left join trusted_canonical_entities te on te.id=c.primary_entity_id where c.is_active
),qualified as(select algorithm_version,count(*)n,count(*)filter(where qualifiers='{}'::jsonb)empty,count(*)filter(where qualifiers?'age_group')age,count(*)filter(where qualifiers?'laterality')laterality,count(*)filter(where qualifiers?'timing')timing,count(*)filter(where qualifiers?'setting')setting,count(*)filter(where qualifiers?'severity')severity from educational_claims group by 1),
entity_coverage as(select count(*)trusted,count(*)filter(where not exists(select 1 from claim_entities ce where ce.canonical_entity_id=e.id and ce.is_active and ce.role in('teaches_about','tested_answer')))no_subject_claims,count(*)filter(where not exists(select 1 from canonical_entity_aliases a where a.canonical_entity_id=e.id and a.is_active and a.review_status='approved'))no_approved_alias from trusted_canonical_entities e),
verification as(select family,verification,count(*)n from(select 'entity'family,metadata->>'clinical_verification'verification from canonical_entities union all select 'relationship',metadata->>'clinical_verification'from canonical_relationships union all select 'claim',metadata->>'clinical_verification'from educational_claims)t group by 1,2)
select jsonb_build_object('claimCoverage',(select to_jsonb(c)from coverage c),'qualifiedByAlgorithm',(select jsonb_agg(to_jsonb(q))from qualified q),'entityCoverage',(select to_jsonb(e)from entity_coverage e),'clinicalVerificationMetadata',(select jsonb_agg(to_jsonb(v))from verification v),'primaryOutsideTrusted',(select count(*)from educational_claims c left join trusted_canonical_entities t on t.id=c.primary_entity_id where c.primary_entity_id is not null and t.id is null))audit;


-- SECTION: cohort
-- Read-only; $1 is the original inventory run UUID. No source content returned.
with cohort as (
 select distinct provider,native_question_id from public.ob_claim_production_items where run_id='3bf06315-fc96-47b2-99a8-bb70e52a0a27'::uuid
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



-- SECTION: extra
select jsonb_build_object('capturedAt',now(),'relationships',(select jsonb_agg(jsonb_build_object('id',r.id,'s',r.subject_entity_id,'p',r.predicate,'o',r.object_entity_id,'sType',se.entity_type,'oType',oe.entity_type))from canonical_relationships r join canonical_entities se on se.id=r.subject_entity_id join canonical_entities oe on oe.id=r.object_entity_id where r.is_active),'qualifierKeys',(select jsonb_agg(to_jsonb(x))from(select k,count(*)n from educational_claims c cross join lateral jsonb_object_keys(c.qualifiers)k group by k order by n desc)x),'runs',(select jsonb_agg(to_jsonb(x))from(select id,run_key,status,expected_count,completed_count from ob_claim_production_runs order by started_at)x),'servableLabels',(select jsonb_agg(distinct e.preferred_label) from servable_claim_versions s join educational_claims c on c.id=s.claim_id left join canonical_entities e on e.id=c.primary_entity_id)) audit;


-- SECTION: retrievalProbes
with tests as(select q,v from (values('carpal tunnel syndrome','v2'),('carpal tunnel syndrome','v3'),('femoral neck fracture','v2'),('femoral neck fracture','v3'),('perineurium','v2'),('perineurium','v3')) t(q,v)), packets as(select q,v,case when v='v2' then retrieve_brobot_knowledge_v2('kg-beta-20260716-002',q) else retrieve_brobot_knowledge_v3('kg-beta-20260716-002',q,p_variants=>array[q],p_terms=>string_to_array(q,' '))end payload from tests)select q,v,payload->>'coverage' coverage,jsonb_array_length(payload->'candidates') candidates,jsonb_array_length(payload->'facts')facts,jsonb_array_length(payload->'claims')claims,jsonb_array_length(payload->'cardCandidates')cards,payload->'limitations'limitations from packets;


-- SECTION: relevanceProbe
select q,cl->>'claimId' claim_id,cl->>'claimText' claim_text,cl->'channels'channels,cl->'components'components,cl->>'score'score from (values('carpal tunnel syndrome'),('femoral neck fracture')) t(q) cross join lateral jsonb_array_elements(retrieve_brobot_knowledge_v3('kg-beta-20260716-002',q,p_variants=>array[q],p_terms=>string_to_array(q,' '))->'claims')cl;
