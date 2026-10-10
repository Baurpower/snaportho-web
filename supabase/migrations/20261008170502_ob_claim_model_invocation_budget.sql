begin;
create table public.claim_model_budgets(
 scope_key text primary key check(length(scope_key) between 1 and 240),
 max_cost_usd numeric not null check(max_cost_usd>0),created_at timestamptz not null default now()
);
create table public.claim_model_invocations(
 id uuid primary key,
 scope_key text not null references public.claim_model_budgets(scope_key),
 job_id uuid not null references public.claim_enrichment_jobs(id),
 model text not null check(model='gpt-4.1-mini'),
 policy_version text not null check(length(policy_version) between 1 and 120),
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 reserved_cost_usd numeric not null check(reserved_cost_usd>0),
 status text not null default 'reserved' check(status in('reserved','completed','usage_unknown')),
 prompt_tokens integer check(prompt_tokens>=0),completion_tokens integer check(completion_tokens>=0),
 estimated_cost_usd numeric check(estimated_cost_usd>=0),
 created_at timestamptz not null default now(),finished_at timestamptz,
 check((status='reserved' and finished_at is null and estimated_cost_usd is null)
  or(status='completed' and finished_at is not null and prompt_tokens is not null and completion_tokens is not null and estimated_cost_usd is not null)
  or(status='usage_unknown' and finished_at is not null and prompt_tokens is null and completion_tokens is null and estimated_cost_usd is null))
);
create index claim_model_invocations_job_idx on public.claim_model_invocations(job_id);
create index claim_model_invocations_scope_idx on public.claim_model_invocations(scope_key);
alter table public.claim_model_budgets enable row level security;
alter table public.claim_model_invocations enable row level security;
revoke all on public.claim_model_budgets,public.claim_model_invocations from public,anon,authenticated,service_role;
grant select on public.claim_model_budgets,public.claim_model_invocations to service_role;
create policy claim_model_budgets_service on public.claim_model_budgets to service_role using(true);
create policy claim_model_invocations_service on public.claim_model_invocations to service_role using(true);
create function public.reserve_claim_model_invocation(
 p_id uuid,p_scope text,p_limit numeric,p_job uuid,p_owner text,p_model text,p_policy text,p_input_hash text,p_reservation numeric
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_limit numeric;v_used numeric;v_existing public.claim_model_invocations;
begin
 if p_limit is null or p_limit<=0 or p_reservation is null or p_reservation<=0 then raise exception 'invalid model budget';end if;
 if not exists(select 1 from public.claim_enrichment_jobs j join public.educational_claims c on c.id=j.claim_id and c.current_version_id=j.claim_version_id and c.is_active
  where j.id=p_job and j.status='leased' and j.lease_owner=p_owner and j.lease_expires_at>now()) then raise exception 'lease lost';end if;
 insert into public.claim_model_budgets(scope_key,max_cost_usd)values(p_scope,p_limit)on conflict do nothing;
 select max_cost_usd into v_limit from public.claim_model_budgets where scope_key=p_scope for update;
 if v_limit is distinct from p_limit then raise exception 'model budget limit mismatch';end if;
 select * into v_existing from public.claim_model_invocations where id=p_id;
 if found then
  if v_existing.scope_key is distinct from p_scope or v_existing.job_id is distinct from p_job or v_existing.model is distinct from p_model
   or v_existing.policy_version is distinct from p_policy or v_existing.input_hash is distinct from p_input_hash or v_existing.reserved_cost_usd is distinct from p_reservation then raise exception 'invocation idempotency mismatch';end if;
  raise exception 'invocation already reserved'; -- Never repeat a provider call after an uncertain response.
 end if;
 select coalesce(sum(case when status='completed' then estimated_cost_usd else reserved_cost_usd end),0)into v_used from public.claim_model_invocations where scope_key=p_scope;
 if v_used+p_reservation>v_limit then raise exception 'model budget exhausted';end if;
 insert into public.claim_model_invocations(id,scope_key,job_id,model,policy_version,input_hash,reserved_cost_usd)
 values(p_id,p_scope,p_job,p_model,p_policy,p_input_hash,p_reservation);
 return p_id;
end;$$;
create function public.finish_claim_model_invocation(p_id uuid,p_prompt integer,p_completion integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_row public.claim_model_invocations;v_cost numeric;v_status text;
begin
 if (p_prompt is null)<>(p_completion is null) or p_prompt<0 or p_completion<0 then raise exception 'invalid model usage';end if;
 select * into v_row from public.claim_model_invocations where id=p_id for update;
 if not found then raise exception 'model invocation missing';end if;
 v_status:=case when p_prompt is null then 'usage_unknown' else 'completed' end;
 v_cost:=case when p_prompt is null then null else p_prompt*0.0000004+p_completion*0.0000016 end;
 if v_row.status<>'reserved' then
  if v_row.status is distinct from v_status or v_row.prompt_tokens is distinct from p_prompt or v_row.completion_tokens is distinct from p_completion then raise exception 'invocation settlement mismatch';end if;
  return;
 end if;
 -- The actual estimate remains observable even if a provider exceeds the reserved bound.
 update public.claim_model_invocations set status=v_status,prompt_tokens=p_prompt,completion_tokens=p_completion,estimated_cost_usd=v_cost,finished_at=clock_timestamp()where id=p_id;
end;$$;
revoke all on function public.reserve_claim_model_invocation(uuid,text,numeric,uuid,text,text,text,text,numeric),public.finish_claim_model_invocation(uuid,integer,integer)from public,anon,authenticated;
grant execute on function public.reserve_claim_model_invocation(uuid,text,numeric,uuid,text,text,text,text,numeric),public.finish_claim_model_invocation(uuid,integer,integer)to service_role;
commit;
