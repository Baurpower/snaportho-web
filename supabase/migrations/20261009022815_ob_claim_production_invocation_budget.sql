begin;
alter table public.claim_model_invocations alter column job_id drop not null;
alter table public.claim_model_invocations add column production_item_id uuid references public.ob_claim_production_items(id);
alter table public.claim_model_invocations add constraint claim_model_invocation_target_check check(num_nonnulls(job_id,production_item_id)=1);
alter table public.claim_model_invocations drop constraint claim_model_invocations_model_check;
alter table public.claim_model_invocations add constraint claim_model_invocations_model_check check(model ~ '^[A-Za-z0-9._:-]{1,120}$');
alter table public.claim_model_invocations add column prompt_rate_usd numeric not null default 0.0000004 check(prompt_rate_usd>=0);
alter table public.claim_model_invocations add column completion_rate_usd numeric not null default 0.0000016 check(completion_rate_usd>=0);
alter table public.claim_model_invocations add column pricing_version text not null default 'openai-gpt-4.1-mini-2026-10-07';
create index claim_model_invocations_production_item_idx on public.claim_model_invocations(production_item_id)where production_item_id is not null;
create function public.reserve_ob_production_model_invocation(
 p_id uuid,p_item uuid,p_owner text,p_model text,p_policy text,p_input_hash text,p_reservation numeric,p_prompt_rate numeric,p_completion_rate numeric,p_pricing_version text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_scope text;v_limit numeric;v_manifest_limit numeric;v_used numeric;v_run uuid;
begin
 if p_reservation is null or p_reservation<=0 or p_prompt_rate is null or p_prompt_rate<0 or p_completion_rate is null or p_completion_rate<0
  or p_pricing_version is null or length(p_pricing_version)not between 1 and 120 then raise exception 'invalid model budget';end if;
 select i.run_id,(r.execution_manifest#>>'{limits,maxCostUsd}')::numeric into v_run,v_manifest_limit
 from public.ob_claim_production_items i join public.ob_claim_production_runs r on r.id=i.run_id
 where i.id=p_item and i.lease_owner=p_owner and i.lease_expires_at>now()and i.status in('leased','extracting','reviewing','resolving','persisting');
 if not found then raise exception 'lease lost';end if;
 if v_manifest_limit is null or v_manifest_limit<=0 then raise exception 'bounded production model budget required';end if;
 v_scope:='ob-production:'||v_run::text;
 insert into public.claim_model_budgets(scope_key,max_cost_usd)values(v_scope,v_manifest_limit)on conflict do nothing;
 select max_cost_usd into v_limit from public.claim_model_budgets where scope_key=v_scope for update;
 if v_limit is distinct from v_manifest_limit then raise exception 'model budget limit mismatch';end if;
 if exists(select 1 from public.claim_model_invocations where id=p_id)then raise exception 'invocation already reserved';end if;
 select coalesce(sum(case when status='completed' then estimated_cost_usd else reserved_cost_usd end),0)into v_used from public.claim_model_invocations where scope_key=v_scope;
 if v_used+p_reservation>v_limit then raise exception 'model budget exhausted';end if;
 insert into public.claim_model_invocations(id,scope_key,production_item_id,model,policy_version,input_hash,reserved_cost_usd,prompt_rate_usd,completion_rate_usd,pricing_version)
 values(p_id,v_scope,p_item,p_model,p_policy,p_input_hash,p_reservation,p_prompt_rate,p_completion_rate,p_pricing_version);
 return p_id;
end;$$;
create or replace function public.finish_claim_model_invocation(p_id uuid,p_prompt integer,p_completion integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_row public.claim_model_invocations;v_cost numeric;v_status text;
begin
 if (p_prompt is null)<>(p_completion is null)or p_prompt<0 or p_completion<0 then raise exception 'invalid model usage';end if;
 select * into v_row from public.claim_model_invocations where id=p_id for update;
 if not found then raise exception 'model invocation missing';end if;
 v_status:=case when p_prompt is null then 'usage_unknown' else 'completed' end;
 v_cost:=case when p_prompt is null then null else p_prompt*v_row.prompt_rate_usd+p_completion*v_row.completion_rate_usd end;
 if v_row.status<>'reserved' then
  if v_row.status is distinct from v_status or v_row.prompt_tokens is distinct from p_prompt or v_row.completion_tokens is distinct from p_completion then raise exception 'invocation settlement mismatch';end if;return;
 end if;
 update public.claim_model_invocations set status=v_status,prompt_tokens=p_prompt,completion_tokens=p_completion,estimated_cost_usd=v_cost,finished_at=clock_timestamp()where id=p_id;
end;$$;
revoke all on function public.reserve_ob_production_model_invocation(uuid,uuid,text,text,text,text,numeric,numeric,numeric,text)from public,anon,authenticated;
grant execute on function public.reserve_ob_production_model_invocation(uuid,uuid,text,text,text,text,numeric,numeric,numeric,text)to service_role;
commit;
