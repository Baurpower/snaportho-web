-- Operational hardening for Orthobullets claim-production runs.
begin;

alter table public.ob_claim_production_runs
  add column if not exists release_sha text null,
  add column if not exists packet_sha256 text null,
  add column if not exists execution_manifest jsonb null,
  add column if not exists pricing_profile jsonb null,
  add column if not exists manifest_locked_at timestamptz null;

alter table public.ob_claim_production_runs
  add constraint ob_claim_runs_release_sha_check
    check (release_sha is null or release_sha ~ '^[0-9a-f]{7,64}$'),
  add constraint ob_claim_runs_packet_sha_check
    check (packet_sha256 is null or packet_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint ob_claim_runs_manifest_safe_check
    check (execution_manifest is null or public.educational_metadata_is_safe(execution_manifest)),
  add constraint ob_claim_runs_pricing_safe_check
    check (pricing_profile is null or public.educational_metadata_is_safe(pricing_profile));

create or replace function public.ob_claim_runs_manifest_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.manifest_locked_at is not null and (
    new.release_sha is distinct from old.release_sha
    or new.packet_sha256 is distinct from old.packet_sha256
    or new.execution_manifest is distinct from old.execution_manifest
    or new.pricing_profile is distinct from old.pricing_profile
    or new.expected_count is distinct from old.expected_count
    or new.algorithm_version is distinct from old.algorithm_version
  ) then
    raise exception 'production run execution manifest is immutable' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists ob_claim_runs_manifest_guard on public.ob_claim_production_runs;
create trigger ob_claim_runs_manifest_guard before update on public.ob_claim_production_runs
for each row execute function public.ob_claim_runs_manifest_guard();

create or replace function public.ob_claim_pause_run(p_run_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'pause reason required'; end if;
  update public.ob_claim_production_runs
     set status = case when status in ('running','paused') then 'paused' else status end,
         config = config || jsonb_build_object('last_pause_reason', left(p_reason, 120)), updated_at = now()
   where id = p_run_id returning status into v_status;
  if v_status is null then raise exception 'run not found'; end if;
  return jsonb_build_object('status', v_status, 'reason', left(p_reason, 120));
end;
$$;

create or replace function public.ob_claim_resume_run(p_run_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  update public.ob_claim_production_runs set status = 'running', completed_at = null, updated_at = now()
   where id = p_run_id and status in ('running','paused') returning status into v_status;
  if v_status is null then raise exception 'run not resumable'; end if;
  return v_status;
end;
$$;

create or replace function public.ob_claim_recover_expired_leases(p_run_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.ob_claim_production_items
     set status = 'failed_transient', next_attempt_at = now(), lease_owner = null,
         lease_expires_at = null, heartbeat_at = null,
         last_diagnostic = 'lease_expired', reason_codes = array['lease_expired'], updated_at = now()
   where run_id = p_run_id
     and status in ('leased','extracting','reviewing','resolving','persisting')
     and (lease_expires_at is null or lease_expires_at < now());
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.ob_claim_finalize_run(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run public.ob_claim_production_runs%rowtype;
  v_total integer;
  v_nonterminal integer;
  v_status text;
begin
  select * into v_run from public.ob_claim_production_runs where id = p_run_id for update;
  if not found then raise exception 'run not found'; end if;
  perform public.refresh_ob_claim_production_run(p_run_id);
  select count(*)::integer,
         count(*) filter (where status not in ('accepted','ai_review_unresolved','identity_unresolved','identity_conflict','failed_permanent'))::integer
    into v_total, v_nonterminal from public.ob_claim_production_items where run_id = p_run_id;
  select * into v_run from public.ob_claim_production_runs where id = p_run_id;
  if v_total <> v_run.expected_count or v_nonterminal <> 0 or v_run.completed_count <> v_run.expected_count then
    return jsonb_build_object('terminal', false, 'status', v_run.status, 'total_items', v_total,
      'expected_count', v_run.expected_count, 'nonterminal_count', v_nonterminal);
  end if;
  v_status := case when v_run.unresolved_count = 0 and v_run.failed_count = 0
    then 'completed' else 'completed_with_gaps' end;
  update public.ob_claim_production_runs set status = v_status, completed_at = coalesce(completed_at, now()), updated_at = now()
   where id = p_run_id;
  return jsonb_build_object('terminal', true, 'status', v_status, 'total_items', v_total,
    'expected_count', v_run.expected_count, 'nonterminal_count', 0);
end;
$$;

revoke all on function public.ob_claim_pause_run(uuid,text) from public, anon, authenticated;
revoke all on function public.ob_claim_resume_run(uuid) from public, anon, authenticated;
revoke all on function public.ob_claim_recover_expired_leases(uuid) from public, anon, authenticated;
revoke all on function public.ob_claim_finalize_run(uuid) from public, anon, authenticated;
revoke all on function public.ob_claim_runs_manifest_guard() from public, anon, authenticated;
grant execute on function public.ob_claim_pause_run(uuid,text) to service_role;
grant execute on function public.ob_claim_resume_run(uuid) to service_role;
grant execute on function public.ob_claim_recover_expired_leases(uuid) to service_role;
grant execute on function public.ob_claim_finalize_run(uuid) to service_role;

commit;
