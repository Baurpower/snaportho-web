begin;
-- Sequence decisions by append order, even within one transaction or with a supplied timestamp.
alter table public.claim_version_attestations add column decision_sequence bigint generated always as identity;
alter table public.claim_version_attestations alter column created_at set default clock_timestamp();
create index claim_attestations_sequence_idx on public.claim_version_attestations(claim_version_id,dimension,decision_sequence desc);
grant usage on sequence public.claim_version_attestations_decision_sequence_seq to service_role;
create or replace function public.claim_version_effective_state(p_version_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
select coalesce(jsonb_object_agg(dimension,jsonb_build_object('verdict',verdict,'policy',policy_version,'id',id)), '{}'::jsonb)
from(select distinct on(dimension)dimension,verdict,policy_version,id from public.claim_version_attestations
 where claim_version_id=p_version_id order by dimension,decision_sequence desc)s;
$$;
create function public.guard_claim_attestation_insert()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_current uuid;v_state jsonb;
begin
 select current_version_id into v_current from public.educational_claims where id=new.claim_id for update;
 if v_current is distinct from new.claim_version_id or not exists(select 1 from public.educational_claim_versions where id=new.claim_version_id and claim_id=new.claim_id)then raise exception 'claim version is not current';end if;
 if exists(select 1 from unnest(new.evidence_hashes)h where h is null or h !~ '^[a-f0-9]{64}$')
  or exists(select 1 from unnest(new.evidence_locators)l where l is null or length(l)>500 or l !~ '^https://' or l ~ '[<>]' or l ~ 'https://[^/]*@')then raise exception 'unsafe evidence reference';end if;
 if new.dimension in('source_fidelity','clinical_validity')and new.verdict in('supported','validated')
  and(coalesce(cardinality(new.evidence_hashes),0)=0 or coalesce(cardinality(new.evidence_locators),0)=0)then raise exception 'positive validation requires evidence references';end if;
 if new.dimension='publication'and new.verdict='eligible' then
  v_state:=public.claim_version_effective_state(new.claim_version_id);
  if v_state#>>'{source_fidelity,verdict}'is distinct from 'supported'or v_state#>>'{quality,verdict}'is distinct from 'good'
   or v_state#>>'{clinical_validity,verdict}'is distinct from 'validated'then raise exception 'publication validation incomplete';end if;
 end if;
 return new;
end;$$;
create trigger claim_attestations_insert_guard before insert on public.claim_version_attestations for each row execute function public.guard_claim_attestation_insert();
create or replace view public.servable_claim_versions with(security_invoker=true) as
with latest as (
 select distinct on(claim_version_id,dimension) claim_version_id,dimension,verdict
 from public.claim_version_attestations where dimension in('publication','source_fidelity','quality','clinical_validity')
 order by claim_version_id,dimension,decision_sequence desc
), states as (
 select claim_version_id,jsonb_object_agg(dimension,verdict) s from latest group by claim_version_id
), legacy as (
 select v.id from public.educational_claim_versions v
 where v.review_status='approved' and v.content_source='verified' and v.approval_method in('human_review','sampled_audit','machine_consensus')
 union
 select v.id from public.card_claim_links l
 join public.educational_claim_versions v on v.id=l.claim_version_id and v.claim_id=l.claim_id
 join public.canonical_card_versions cv on cv.id=l.canonical_card_version_id and cv.canonical_card_id=l.canonical_card_id and cv.is_active
 join public.canonical_cards cc on cc.id=l.canonical_card_id and cc.is_active and cc.current_version_id=l.canonical_card_version_id
 join public.anki_deck_release_cards drc on drc.canonical_card_id=l.canonical_card_id and drc.canonical_card_version_id=l.canonical_card_version_id and drc.inclusion_status='included'
 where l.is_active and l.mapping_role='teaches' and l.review_status='auto_approved' and l.approval_method='machine_consensus'
  and l.algorithm_version='card-claim-factory.v1' and cardinality(l.evidence_hashes)>0
  and v.review_status='unreviewed' and v.content_source='generated_draft' and v.approval_method='machine_consensus'
  and drc.deck_release_id=(select id from public.anki_deck_releases where status='published' order by published_at desc nulls last,created_at desc limit 1)
), permitted as (
 select id from legacy where not exists(select 1 from states where claim_version_id=legacy.id)
 union
 select claim_version_id from states where s->>'publication'='eligible' and s->>'source_fidelity'='supported'
  and s->>'quality'='good' and s->>'clinical_validity'='validated'
)
select v.id as claim_version_id,c.id as claim_id
from public.educational_claims c join public.educational_claim_versions v on v.id=c.current_version_id and v.claim_id=c.id
join permitted p on p.id=v.id where c.is_active;

revoke all on function public.guard_claim_attestation_insert() from public,anon,authenticated;
grant execute on function public.guard_claim_attestation_insert() to service_role;
create function public.project_claim_attestation_state()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.dimension<>'historical_approval' then
  update public.educational_claims set review_status=case when public.claim_version_is_servable(new.claim_version_id)then 'approved'else 'unreviewed'end where id=new.claim_id;
 end if;
 return new;
end;$$;
revoke all on function public.project_claim_attestation_state()from public,anon,authenticated;
grant execute on function public.project_claim_attestation_state()to service_role;
create trigger claim_attestations_project_state after insert on public.claim_version_attestations for each row execute function public.project_claim_attestation_state();
commit;
