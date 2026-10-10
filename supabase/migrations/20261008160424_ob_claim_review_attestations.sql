-- Append-only review state; content snapshots remain immutable.
begin;
create table public.claim_version_attestations (
 id uuid primary key default gen_random_uuid(),
 claim_id uuid not null references public.educational_claims(id),
 claim_version_id uuid not null references public.educational_claim_versions(id),
 dimension text not null check(dimension in ('source_fidelity','clinical_validity','quality','publication','historical_approval')),
 verdict text not null check(verdict in ('supported','unsupported','ambiguous','validated','disputed','outdated','insufficient','good','rewrite','split','remove','eligible','quarantined','revoked','recorded')),
 policy_version text not null check(length(policy_version) between 1 and 100),
 actor text not null check(length(actor) between 1 and 100),
 evidence_hashes text[] not null default '{}',
 evidence_locators text[] not null default '{}',
 reason_codes text[] not null default '{}',
 metadata jsonb not null default '{}' check(public.educational_metadata_is_safe(metadata)),
 idempotency_key text not null unique check(length(idempotency_key) between 1 and 200),
 created_at timestamptz not null default clock_timestamp(),
 constraint claim_attestation_verdict_dimension check (
 (dimension='source_fidelity' and verdict in ('supported','unsupported','ambiguous')) or
 (dimension='clinical_validity' and verdict in ('validated','disputed','outdated','insufficient')) or
 (dimension='quality' and verdict in ('good','rewrite','split','remove')) or
 (dimension='publication' and verdict in ('eligible','quarantined','revoked')) or
 (dimension='historical_approval' and verdict='recorded'))
);
create index claim_attestations_version_dimension_idx on public.claim_version_attestations(claim_version_id,dimension,created_at desc,id desc);
alter table public.claim_version_attestations enable row level security;
revoke all on public.claim_version_attestations from public,anon,authenticated;
grant select,insert on public.claim_version_attestations to service_role;
create policy claim_attestations_service on public.claim_version_attestations to service_role using(true) with check(true);
create trigger claim_attestations_immutable before update or delete on public.claim_version_attestations
 for each row execute function public.guard_educational_claim_versions_immutable();

create or replace function public.claim_version_effective_state(p_version_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
select coalesce(jsonb_object_agg(dimension,jsonb_build_object('verdict',verdict,'policy',policy_version,'id',id)), '{}'::jsonb)
from (select distinct on(dimension) dimension,verdict,policy_version,id
 from public.claim_version_attestations where claim_version_id=p_version_id
 order by dimension,created_at desc,id desc) s;
$$;
create or replace function public.claim_version_is_servable(p_version_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
select exists(select 1 from public.educational_claims c join public.educational_claim_versions v on v.id=c.current_version_id and v.claim_id=c.id
 cross join lateral (select public.claim_version_effective_state(v.id) s) state
 where v.id=p_version_id and c.is_active and (
   (state.s #>> '{publication,verdict}'='eligible'
     and state.s #>> '{source_fidelity,verdict}'='supported'
     and state.s #>> '{quality,verdict}'='good'
     and state.s #>> '{clinical_validity,verdict}'='validated')
   or (not exists(select 1 from public.claim_version_attestations a where a.claim_version_id=v.id and a.dimension in('publication','source_fidelity','clinical_validity','quality'))
     and ((v.review_status='approved' and v.content_source='verified' and v.approval_method in('human_review','sampled_audit','machine_consensus'))
      or (v.review_status='unreviewed' and v.content_source='generated_draft' and v.approval_method='machine_consensus'
       and exists(select 1 from public.card_claim_links l
        join public.canonical_cards cc on cc.id=l.canonical_card_id and cc.is_active and cc.current_version_id=l.canonical_card_version_id
        join public.anki_deck_release_cards drc on drc.canonical_card_id=l.canonical_card_id and drc.canonical_card_version_id=l.canonical_card_version_id and drc.inclusion_status='included'
        where l.claim_id=c.id and l.claim_version_id=v.id and l.is_active and l.review_status='auto_approved'
         and l.approval_method='machine_consensus' and l.algorithm_version='card-claim-factory.v1' and cardinality(l.evidence_hashes)>0
         and drc.deck_release_id=(select id from public.anki_deck_releases where status='published' order by published_at desc nulls last,created_at desc limit 1)))))
 ));
$$;

create or replace function public.append_claim_version_attestation(
 p_claim_id uuid,p_version_id uuid,p_dimension text,p_verdict text,p_policy text,p_actor text,
 p_evidence_hashes text[],p_evidence_locators text[],p_reason_codes text[],p_metadata jsonb,p_idempotency_key text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_current uuid; v_existing public.claim_version_attestations; v_id uuid; v_state jsonb;
begin
 select current_version_id into v_current from public.educational_claims where id=p_claim_id for update;
 if not found or v_current is distinct from p_version_id or not exists(select 1 from public.educational_claim_versions where id=p_version_id and claim_id=p_claim_id) then
  raise exception 'claim version is not current' using errcode='23514'; end if;
 select * into v_existing from public.claim_version_attestations where idempotency_key=p_idempotency_key;
 if found then
  if v_existing.claim_id is distinct from p_claim_id or v_existing.claim_version_id is distinct from p_version_id
   or v_existing.dimension is distinct from p_dimension or v_existing.verdict is distinct from p_verdict
   or v_existing.policy_version is distinct from p_policy or v_existing.actor is distinct from p_actor
   or v_existing.evidence_hashes is distinct from p_evidence_hashes or v_existing.evidence_locators is distinct from p_evidence_locators
   or v_existing.reason_codes is distinct from p_reason_codes or v_existing.metadata is distinct from p_metadata then
   raise exception 'idempotency key reused with different decision' using errcode='23514'; end if;
  return v_existing.id;
 end if;
 if exists(select 1 from unnest(p_evidence_hashes) h where h is null or h !~ '^[a-f0-9]{64}$')
  or exists(select 1 from unnest(p_evidence_locators) l where l is null or length(l)>500 or l !~ '^https://' or l ~ '[<>]' or l ~ 'https://[^/]*@') then
   raise exception 'unsafe evidence reference' using errcode='23514'; end if;
 if p_dimension in('source_fidelity','clinical_validity') and p_verdict in('supported','validated')
  and (coalesce(cardinality(p_evidence_hashes),0)=0 or coalesce(cardinality(p_evidence_locators),0)=0) then
   raise exception 'positive validation requires evidence references' using errcode='23514'; end if;
 if p_dimension='publication' and p_verdict='eligible' then
  v_state:=public.claim_version_effective_state(p_version_id);
  if v_state #>> '{source_fidelity,verdict}' is distinct from 'supported'
   or v_state #>> '{quality,verdict}' is distinct from 'good'
   or v_state #>> '{clinical_validity,verdict}' is distinct from 'validated' then
    raise exception 'publication validation incomplete' using errcode='23514'; end if;
 end if;
 insert into public.claim_version_attestations(claim_id,claim_version_id,dimension,verdict,policy_version,actor,evidence_hashes,evidence_locators,reason_codes,metadata,idempotency_key)
 values(p_claim_id,p_version_id,p_dimension,p_verdict,p_policy,p_actor,p_evidence_hashes,p_evidence_locators,p_reason_codes,p_metadata,p_idempotency_key) returning id into v_id;
 if p_dimension<>'historical_approval' then
  update public.educational_claims set review_status=case when public.claim_version_is_servable(p_version_id) then 'approved' else 'unreviewed' end where id=p_claim_id;
 end if;
 return v_id;
end; $$;

create table public.claim_enrichment_jobs (
 id uuid primary key default gen_random_uuid(),
 claim_id uuid not null references public.educational_claims(id),
 claim_version_id uuid not null references public.educational_claim_versions(id),
 stage text not null check(stage in('entity','card','source_audit','clinical_evidence')),
 policy_version text not null,
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'pending' check(status in('pending','leased','complete','retry','exhausted')),
 attempt_count integer not null default 0,
 max_attempts integer not null default 3 check(max_attempts between 1 and 10),
 lease_owner text, lease_expires_at timestamptz, next_attempt_at timestamptz,
 outcome text, reason_codes text[] not null default '{}',
 result jsonb not null default '{}' check(public.educational_metadata_is_safe(result)),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(claim_version_id,stage,policy_version,input_hash),
 check(attempt_count>=0)
);
create index claim_enrichment_ready_idx on public.claim_enrichment_jobs(stage,status,next_attempt_at);
alter table public.claim_enrichment_jobs enable row level security;
revoke all on public.claim_enrichment_jobs from public,anon,authenticated;
grant select,insert,update on public.claim_enrichment_jobs to service_role;
create policy claim_enrichment_service on public.claim_enrichment_jobs to service_role using(true) with check(true);
create or replace function public.lease_claim_enrichment_job(p_stage text,p_worker text,p_lease_seconds integer default 300)
returns setof public.claim_enrichment_jobs language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 update public.claim_enrichment_jobs set status='exhausted',outcome='lease_attempts_exhausted',lease_owner=null,lease_expires_at=null,updated_at=now()
 where stage=p_stage and status='leased' and lease_expires_at<=now() and attempt_count>=max_attempts;
 select j.id into v_id from public.claim_enrichment_jobs j join public.educational_claims c on c.id=j.claim_id and c.current_version_id=j.claim_version_id and c.is_active
 where j.stage=p_stage and j.attempt_count<j.max_attempts and (
 (j.status in('pending','retry') and (j.next_attempt_at is null or j.next_attempt_at<=now())) or
 (j.status='leased' and j.lease_expires_at<=now()))
 order by j.created_at,j.id for update of j skip locked limit 1;
 if v_id is null then return; end if;
 return query update public.claim_enrichment_jobs set status='leased',attempt_count=attempt_count+1,lease_owner=p_worker,
 lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,1800))),updated_at=now() where id=v_id returning *;
end; $$;
create or replace function public.complete_claim_enrichment_job(p_id uuid,p_worker text,p_outcome text,p_result jsonb,p_retry boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.claim_enrichment_jobs set status=case when p_retry and attempt_count<max_attempts then 'retry' when p_retry then 'exhausted' else 'complete' end,
 outcome=p_outcome,result=p_result,lease_owner=null,lease_expires_at=null,next_attempt_at=case when p_retry then now()+interval '5 minutes' else null end,updated_at=now()
 where id=p_id and lease_owner=p_worker and lease_expires_at>now() and status='leased';
 if not found then raise exception 'enrichment lease lost' using errcode='23514'; end if;
end; $$;

revoke all on function public.claim_version_effective_state(uuid),public.claim_version_is_servable(uuid),
 public.append_claim_version_attestation(uuid,uuid,text,text,text,text,text[],text[],text[],jsonb,text),
 public.lease_claim_enrichment_job(text,text,integer),public.complete_claim_enrichment_job(uuid,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.claim_version_effective_state(uuid),public.claim_version_is_servable(uuid),
 public.append_claim_version_attestation(uuid,uuid,text,text,text,text,text[],text[],text[],jsonb,text),
 public.lease_claim_enrichment_job(text,text,integer),public.complete_claim_enrichment_job(uuid,text,text,jsonb,boolean) to service_role;
create or replace function public.servable_claim_version_ids(p_version_ids uuid[])
returns table(claim_version_id uuid) language sql stable security invoker set search_path='' as $$
 select distinct id from unnest(p_version_ids) id where public.claim_version_is_servable(id);
$$;
revoke all on function public.servable_claim_version_ids(uuid[]) from public,anon,authenticated;
grant execute on function public.servable_claim_version_ids(uuid[]) to service_role;
commit;
