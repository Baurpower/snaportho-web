create table public.anki_deck_release_cards (id uuid primary key,deck_release_id uuid,canonical_card_id uuid,canonical_card_version_id uuid,note_guid text,card_ordinal integer,native_card_id_hint text,content_hash text,deck_path text,ordering_key text,inclusion_status text,metadata jsonb,created_at timestamp with time zone);
create table public.anki_deck_releases (id uuid primary key,release_key text,release_version text,import_batch_id uuid,predecessor_release_id uuid,status text,manifest_schema_version text,manifest_checksum text,minimum_addon_version text,metadata jsonb,created_at timestamp with time zone,reviewed_at timestamp with time zone,published_at timestamp with time zone,superseded_at timestamp with time zone,retired_at timestamp with time zone);
create table public.brobot_kg_retrieval_events (id uuid primary key,request_id uuid,retrieval_id uuid,conversation_id uuid,message_id uuid,user_id uuid,query_hash text,normalized_concept text,sanitized_query text,mode text,subintent text,training_level text,response_depth text,is_follow_up boolean,release_id text,retrieval_status text,trigger_reasons text[],bypass_reason text,fallback_used boolean,candidate_count integer,selected_neighborhood_slugs text[],selected_entity_ids uuid[],selected_relationship_ids uuid[],candidate_scores jsonb,predicate_families text[],cache_status text,stage_timings_ms jsonb,retrieval_latency_ms integer,packet_token_estimate integer,policy_version text,packet_schema_version text,gap_signals jsonb,quality_gate_warnings text[],evaluator_result jsonb,regeneration_status boolean,feedback_result smallint,correction_signal boolean,created_at timestamp with time zone,updated_at timestamp with time zone,configured_deadline_ms integer,elapsed_latency_ms integer,timeout_stage text,rpc_started boolean,rpc_completed boolean,evidence_packet_count integer,answer_influenced boolean,retrieval_mode text,safe_error_code text,safe_error_stage text,selected_claim_ids uuid[],candidate_card_ids uuid[],answer_used_claim_ids uuid[],claim_candidate_count integer,card_candidate_count integer,query_variants text[],requested_facets text[],retrieval_channels jsonb,claim_score_components jsonb,exclusion_reasons text[],rerank_version text,pool_size integer,support_level text);
create table public.canonical_card_versions (id uuid primary key,canonical_card_id uuid,version_number integer,source_note_id uuid,source_card_id uuid,content_hash text,field_snapshot jsonb,raw_html_snapshot jsonb,tag_snapshot text[],metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.canonical_cards (id uuid primary key,anki_note_id uuid,anki_card_id uuid,current_version_id uuid,current_version_number integer,canonical_status text,title text,source_content_hash text,metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.canonical_entities (id uuid primary key,source_concept_id uuid,entity_type text,preferred_label text,normalized_label text,slug text,description text,status text,review_status text,created_from_source_id uuid,replacement_entity_id uuid,deprecated_at timestamp with time zone,metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.canonical_entity_aliases (id uuid primary key,canonical_entity_id uuid,alias_name text,normalized_alias text,alias_type text,confidence numeric(4,3),review_status text,reviewed_by text,reviewed_at timestamp with time zone,created_from_decision_key text,metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.canonical_relationships (id uuid primary key,subject_entity_type text,subject_entity_id uuid,predicate text,object_entity_type text,object_entity_id uuid,confidence numeric(4,3),review_status text,provenance_status text,lifecycle_status text,created_by_source text,deprecated_at timestamp with time zone,metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.card_canonical_entity_links (id uuid primary key,canonical_card_id uuid,canonical_entity_id uuid,source_curriculum_node_id uuid,source_concept_id uuid,source_card_knowledge_link_id uuid,source_curriculum_node_entity_id uuid,retarget_path text,match_basis text,mapping_confidence numeric(4,3),review_status text,created_by_source text,migration_proposal_id uuid,rollback_batch_key text,metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.card_claim_links (id uuid primary key,canonical_card_id uuid,canonical_card_version_id uuid,claim_id uuid,claim_version_id uuid,mapping_role text,confidence numeric(4,3),approval_method text,review_status text,algorithm_version text,evidence_locator text,evidence_hashes text[],reason_codes text[],metadata jsonb,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
create table public.educational_claim_versions (id uuid primary key,claim_id uuid,version_number integer,fingerprint_hash text,claim_text text,claim_type text,predicate text,object_text text,qualifiers jsonb,primary_entity_id uuid,approval_method text,content_source text,review_status text,algorithm_version text,metadata jsonb,created_at timestamp with time zone,semantic_fingerprint_hash text,semantic_identity_version text);
create table public.educational_claims (id uuid primary key,primary_entity_id uuid,claim_text text,claim_type text,importance_level text,content_source text,review_status text,metadata jsonb,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone,current_version_id uuid,fingerprint_hash text,predicate text,object_text text,qualifiers jsonb,approval_method text,algorithm_version text,semantic_fingerprint_hash text,semantic_identity_version text);
create table public.ob_claim_candidate_decisions (id uuid primary key,candidate_id uuid,extraction_event_id uuid,item_id uuid,run_id uuid,stage text,verdict text,reason text,model text,prompt_version text,created_at timestamp with time zone);
create table public.ob_claim_candidate_resolutions (id uuid primary key,candidate_id uuid,extraction_event_id uuid,item_id uuid,run_id uuid,examined_claim_id uuid,structural_hash text,semantic_hash text,verdict text,reason text,decision text,resolved_claim_id uuid,model text,prompt_version text,prompt_tokens bigint,completion_tokens bigint,estimated_cost_usd numeric,created_at timestamp with time zone);
create table public.ob_claim_candidates (id uuid primary key,extraction_event_id uuid,item_id uuid,run_id uuid,candidate_index integer,claim_text text,importance text,claim_type text,qualifiers jsonb,support_sections text[],generator_model text,generator_prompt_version text,generator_confidence numeric,origin_candidate_index integer,repair_action text,repair_reason text,pre_repair_text text,final_text text,accepted boolean,created_at timestamp with time zone);
create table public.ob_claim_extraction_events (id uuid primary key,item_id uuid,run_id uuid,provider text,native_question_id text,source_fingerprint_hash text,algorithm_version text,prompt_set_version text,attempt_no integer,supersedes_attempt_id uuid,superseded_by_attempt_id uuid,contract_version text,prompt_versions jsonb,models jsonb,registry_question_id uuid,started_at timestamp with time zone,completed_at timestamp with time zone,final_state text,coverage_verdict text,coverage_notes text,missing_concepts text[],diagnostics text[],prompt_tokens bigint,completion_tokens bigint,estimated_cost_usd numeric,created_at timestamp with time zone);
create table public.ob_claim_production_items (id uuid primary key,run_id uuid,provider text,native_question_id text,specialty text,status text,attempt_count integer,max_attempts integer,next_attempt_at timestamp with time zone,lease_owner text,lease_expires_at timestamp with time zone,heartbeat_at timestamp with time zone,source_fingerprint_hash text,identity_outcome text,registry_question_id uuid,live_attempt_id uuid,last_diagnostic text,reason_codes text[],prompt_tokens bigint,completion_tokens bigint,estimated_cost_usd numeric,started_at timestamp with time zone,completed_at timestamp with time zone,updated_at timestamp with time zone);
create table public.ob_question_identity_resolutions (id uuid primary key,item_id uuid,run_id uuid,native_question_id text,outcome text,registry_question_id uuid,method text,confidence text,evidence text[],locator text,conflicting_ids uuid[],created_at timestamp with time zone);
create table public.question_claim_links (id uuid primary key,provider text,native_question_id text,external_question_id uuid,claim_id uuid,claim_version_id uuid,mapping_role text,confidence numeric(4,3),approval_method text,review_status text,algorithm_version text,evidence_locator text,source_fingerprint_hash text,evidence_hashes text[],reason_codes text[],metadata jsonb,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone,superseded_at timestamp with time zone,superseded_by_claim_id uuid);
create table public.source_aliases (id uuid primary key,source_id uuid,entity_type text,entity_id uuid,alias_kind text,alias_value text,external_id text,metadata jsonb,comments text,is_active boolean,created_at timestamp with time zone,updated_at timestamp with time zone);
CREATE OR REPLACE FUNCTION public.educational_metadata_is_safe(value jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select not exists (
    select 1
    from jsonb_path_query(
      coalesce(value, '{}'::jsonb),
      '$.** ? (@.type() == "object").keyvalue()'
    ) item
    where lower(item ->> 'key') = any (array[
      'stem','question','questiontext','answer','answertext','answerchoices','choices',
      'correctanswer','selectedanswer','explanation','image','images','rawhtml',
      'cardbody','front','back'
    ])
  );
$function$;

CREATE OR REPLACE FUNCTION public.guard_educational_claim_versions_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'educational_claim_versions rows are immutable';
end;
$function$;

CREATE OR REPLACE FUNCTION public.ob_claim_immutable_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'table is insert-only';
end;
$function$;

create table public.ob_claim_production_runs(id uuid primary key,execution_manifest jsonb);
