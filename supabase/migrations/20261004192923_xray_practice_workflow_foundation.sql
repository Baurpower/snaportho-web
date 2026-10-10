-- X-ray Practice workflow control plane.
-- Image bytes live outside Postgres; this migration stores object references,
-- immutable authored revisions, append-only review evidence, and release state.
begin;

create table public.xray_contributors (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null default 'contributor'
    check (role in ('contributor','reviewer','publisher','administrator')),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  specialty text null check (specialty is null or length(specialty) <= 120),
  is_active boolean not null default false,
  qualification_verified boolean not null default false,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid null references auth.users(id) on delete restrict,
  revoked_at timestamptz null,
  constraint xray_contributors_active_revocation_check
    check ((is_active and revoked_at is null) or not is_active)
);

create table public.xray_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  state text not null default 'draft'
    check (state in ('draft','processing','ready_to_submit','submitted','assigned','in_review','changes_requested','rejected','publication_ready','pr_open','merged','released','superseded','withdrawn')),
  draft_version integer not null default 1 check (draft_version > 0),
  draft_content jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_content) = 'object'),
  submitted_revision_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  closed_at timestamptz null,
  unique (id, owner_user_id)
);

create table public.xray_submission_revisions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.xray_submissions(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  authored_by_user_id uuid not null references auth.users(id) on delete restrict,
  schema_version text not null check (schema_version = 'xray_case_v1'),
  content_snapshot jsonb not null check (jsonb_typeof(content_snapshot) = 'object'),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  asset_manifest_sha256 text not null check (asset_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (submission_id, revision_number),
  unique (id, submission_id)
);

alter table public.xray_submissions
  add constraint xray_submissions_submitted_revision_fk
  foreign key (submitted_revision_id, id)
  references public.xray_submission_revisions(id, submission_id)
  on delete restrict;

create table public.xray_assets (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.xray_submissions(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  state text not null default 'pending_upload'
    check (state in ('pending_upload','quarantined','processing','review_ready','processing_failed','privacy_rejected','publication_ready','published','withdrawn')),
  view_code text null check (view_code is null or view_code ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  display_order integer not null default 0 check (display_order between 0 and 20),
  quarantine_object_key text not null unique,
  quarantine_object_version text null,
  review_object_key text null unique,
  review_object_version text null,
  publication_object_key text null unique,
  publication_object_version text null,
  content_sha256 text null check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  thumbnail_sha256 text null check (thumbnail_sha256 is null or thumbnail_sha256 ~ '^[a-f0-9]{64}$'),
  media_type text null check (media_type is null or media_type = 'image/webp'),
  byte_size bigint null check (byte_size is null or byte_size > 0),
  width integer null check (width is null or width between 128 and 12000),
  height integer null check (height is null or height between 128 and 12000),
  processor_version text null,
  privacy_attested_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint xray_assets_owner_matches_submission
    foreign key (submission_id, owner_user_id)
    references public.xray_submissions(id, owner_user_id) on delete restrict,
  unique (id, submission_id),
  constraint xray_assets_review_ready_check check (
    state not in ('review_ready','publication_ready','published') or
    (review_object_key is not null and review_object_version is not null and content_sha256 is not null and thumbnail_sha256 is not null and media_type = 'image/webp' and width is not null and height is not null)
  ),
  constraint xray_assets_published_check check (
    state <> 'published' or (publication_object_key is not null and publication_object_version is not null)
  )
);

create table public.xray_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.xray_assets(id) on delete restrict,
  status text not null default 'queued'
    check (status in ('queued','processing','succeeded','failed','dead_lettered')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  idempotency_key uuid not null unique,
  safe_error_code text null,
  safe_result jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_result) = 'object'),
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null
);

create table public.xray_review_assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.xray_submissions(id) on delete restrict,
  revision_id uuid not null,
  assigned_reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  review_lane text not null check (review_lane in ('privacy','clinical','editorial')),
  status text not null default 'assigned'
    check (status in ('assigned','in_progress','completed','cancelled','superseded')),
  assigned_by_user_id uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  supersedes_assignment_id uuid null references public.xray_review_assignments(id) on delete restrict,
  foreign key (revision_id, submission_id)
    references public.xray_submission_revisions(id, submission_id) on delete restrict,
  unique (revision_id, assigned_reviewer_user_id, review_lane),
  unique (id, revision_id),
  unique (id, submission_id, revision_id, assigned_reviewer_user_id, review_lane)
);

create table public.xray_review_comments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.xray_review_assignments(id) on delete restrict,
  revision_id uuid not null references public.xray_submission_revisions(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  field_path text not null check (length(field_path) between 1 and 300),
  severity text not null check (severity in ('required','suggestion','question')),
  body text not null check (length(btrim(body)) between 1 and 2000),
  resolution_status text not null default 'open'
    check (resolution_status in ('open','author_addressed','reviewer_reopened','reviewer_resolved','reviewer_dismissed')),
  author_response text null check (author_response is null or length(btrim(author_response)) between 1 and 2000),
  author_addressed_at timestamptz null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolved_by_user_id uuid null references auth.users(id) on delete restrict,
  foreign key (assignment_id, revision_id)
    references public.xray_review_assignments(id, revision_id) on delete restrict
);

create table public.xray_review_decisions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.xray_review_assignments(id) on delete restrict,
  submission_id uuid not null references public.xray_submissions(id) on delete restrict,
  revision_id uuid not null references public.xray_submission_revisions(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  review_lane text not null check (review_lane in ('privacy','clinical','editorial')),
  decision text not null check (decision in ('approve','request_changes','reject','escalate')),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  asset_manifest_sha256 text not null check (asset_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  reason_codes text[] not null default '{}',
  notes text not null default '' check (length(notes) <= 2000),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (reviewer_user_id, idempotency_key),
  unique (assignment_id),
  foreign key (revision_id, submission_id)
    references public.xray_submission_revisions(id, submission_id) on delete restrict,
  foreign key (assignment_id, submission_id, revision_id, reviewer_user_id, review_lane)
    references public.xray_review_assignments(id, submission_id, revision_id, assigned_reviewer_user_id, review_lane)
  on delete restrict
);

alter table public.xray_submission_revisions
  add constraint xray_revisions_publication_identity_unique
  unique (id, submission_id, content_sha256, asset_manifest_sha256);

create table public.xray_publication_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.xray_submissions(id) on delete restrict,
  revision_id uuid not null references public.xray_submission_revisions(id) on delete restrict,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'queued'
    check (status in ('queued','exporting','pr_open','merged','releasing','released','failed','withdrawn')),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  asset_manifest_sha256 text not null check (asset_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  idempotency_key uuid not null,
  github_pr_url text null,
  git_commit_sha text null check (git_commit_sha is null or git_commit_sha ~ '^[a-f0-9]{40}$'),
  release_id text null,
  manifest_sha256 text null check (manifest_sha256 is null or manifest_sha256 ~ '^[a-f0-9]{64}$'),
  safe_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (requested_by_user_id, idempotency_key),
  unique (revision_id),
  foreign key (revision_id, submission_id, content_sha256, asset_manifest_sha256)
    references public.xray_submission_revisions(id, submission_id, content_sha256, asset_manifest_sha256)
    on delete restrict
);

create table public.xray_mutation_requests (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation text not null check (operation ~ '^[a-z][a-z0-9_]{1,79}$'),
  idempotency_key uuid not null,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  result_resource_id uuid null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (actor_user_id, operation, idempotency_key)
);

create table public.xray_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users(id) on delete restrict,
  actor_type text not null check (actor_type in ('user','service','system')),
  event_type text not null check (event_type in ('submission_created','draft_saved','revision_submitted','review_assigned','review_started','comment_added','comment_addressed','comment_resolved','comment_reopened','decision_recorded','publication_requested','publication_updated','publication_withdrawn','asset_state_changed')),
  submission_id uuid null references public.xray_submissions(id) on delete restrict,
  revision_id uuid null references public.xray_submission_revisions(id) on delete restrict,
  assignment_id uuid null references public.xray_review_assignments(id) on delete restrict,
  publication_request_id uuid null references public.xray_publication_requests(id) on delete restrict,
  request_id uuid not null,
  idempotency_key uuid null,
  safe_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (actor_type, actor_user_id, idempotency_key)
);

create index xray_submissions_owner_updated_idx on public.xray_submissions(owner_user_id, updated_at desc);
create index xray_submissions_state_updated_idx on public.xray_submissions(state, updated_at desc);
create index xray_revisions_submission_idx on public.xray_submission_revisions(submission_id, revision_number desc);
create index xray_assets_submission_order_idx on public.xray_assets(submission_id, display_order);
create index xray_assignments_reviewer_status_idx on public.xray_review_assignments(assigned_reviewer_user_id, status, created_at desc);
create index xray_comments_assignment_idx on public.xray_review_comments(assignment_id, created_at);
create index xray_decisions_revision_lane_idx on public.xray_review_decisions(revision_id, review_lane, created_at desc);
create index xray_publication_status_idx on public.xray_publication_requests(status, created_at);
create index xray_audit_submission_idx on public.xray_audit_events(submission_id, created_at desc);
create index xray_assignments_active_revision_idx on public.xray_review_assignments(revision_id, review_lane)
  where status in ('assigned','in_progress');
create index xray_comments_required_open_idx on public.xray_review_comments(assignment_id)
  where severity = 'required' and resolution_status in ('open','author_addressed','reviewer_reopened');
create index xray_processing_queued_idx on public.xray_processing_jobs(created_at)
  where status = 'queued';
create index xray_publication_queued_idx on public.xray_publication_requests(created_at)
  where status = 'queued';

create or replace function public.xray_guard_immutable_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '55000';
end;
$$;

create trigger xray_revisions_immutable before update or delete on public.xray_submission_revisions
for each row execute function public.xray_guard_immutable_row();
create trigger xray_decisions_immutable before update or delete on public.xray_review_decisions
for each row execute function public.xray_guard_immutable_row();
create trigger xray_audit_immutable before update or delete on public.xray_audit_events
for each row execute function public.xray_guard_immutable_row();

create or replace function public.xray_guard_submission_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'submission identity is immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger xray_submission_identity_immutable before update on public.xray_submissions
for each row execute function public.xray_guard_submission_identity();

create or replace function public.xray_validate_review_assignment()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_owner_user_id uuid;
  v_current_revision_id uuid;
begin
  select owner_user_id, submitted_revision_id
  into v_owner_user_id, v_current_revision_id
  from public.xray_submissions where id = new.submission_id;
  if v_owner_user_id is null or v_current_revision_id is distinct from new.revision_id then
    raise exception 'assignment must target the current submitted revision';
  end if;
  if v_owner_user_id = new.assigned_reviewer_user_id then
    raise exception 'self review assignment is forbidden' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.xray_contributors c
    where c.user_id = new.assigned_reviewer_user_id and c.is_active
      and c.qualification_verified and c.role in ('reviewer','publisher','administrator')
  ) then raise exception 'assignment requires an active verified reviewer' using errcode = '23514'; end if;
  if new.review_lane in ('privacy','clinical') and exists (
    select 1 from public.xray_review_assignments a
    where a.revision_id = new.revision_id
      and a.assigned_reviewer_user_id = new.assigned_reviewer_user_id
      and a.review_lane in ('privacy','clinical')
      and a.review_lane <> new.review_lane
      and a.status not in ('cancelled','superseded')
  ) then raise exception 'privacy and clinical lanes require independent reviewers' using errcode = '23514'; end if;
  return new;
end;
$$;

create trigger xray_assignments_validate before insert or update on public.xray_review_assignments
for each row execute function public.xray_validate_review_assignment();

alter table public.xray_contributors enable row level security;
alter table public.xray_submissions enable row level security;
alter table public.xray_submission_revisions enable row level security;
alter table public.xray_assets enable row level security;
alter table public.xray_processing_jobs enable row level security;
alter table public.xray_review_assignments enable row level security;
alter table public.xray_review_comments enable row level security;
alter table public.xray_review_decisions enable row level security;
alter table public.xray_publication_requests enable row level security;
alter table public.xray_audit_events enable row level security;
alter table public.xray_mutation_requests enable row level security;

alter table public.xray_contributors force row level security;
alter table public.xray_submissions force row level security;
alter table public.xray_submission_revisions force row level security;
alter table public.xray_assets force row level security;
alter table public.xray_processing_jobs force row level security;
alter table public.xray_review_assignments force row level security;
alter table public.xray_review_comments force row level security;
alter table public.xray_review_decisions force row level security;
alter table public.xray_publication_requests force row level security;
alter table public.xray_audit_events force row level security;
alter table public.xray_mutation_requests force row level security;

revoke all on public.xray_contributors, public.xray_submissions, public.xray_submission_revisions,
  public.xray_assets, public.xray_processing_jobs, public.xray_review_assignments,
  public.xray_review_comments, public.xray_review_decisions,
  public.xray_publication_requests, public.xray_audit_events, public.xray_mutation_requests
from public, anon, authenticated;

grant select, insert, update on public.xray_contributors, public.xray_submissions,
  public.xray_submission_revisions, public.xray_assets, public.xray_processing_jobs,
  public.xray_review_assignments, public.xray_review_comments, public.xray_review_decisions,
  public.xray_publication_requests, public.xray_audit_events, public.xray_mutation_requests
to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.xray_can_read_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.xray_submissions s
      where s.id = p_submission_id and s.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.xray_review_assignments a
      join public.xray_contributors c on c.user_id = a.assigned_reviewer_user_id
      where a.submission_id = p_submission_id
        and a.assigned_reviewer_user_id = auth.uid()
        and a.status in ('assigned','in_progress')
        and c.is_active and c.qualification_verified and c.revoked_at is null
        and c.role in ('reviewer','publisher','administrator')
    )
    or exists (
      select 1 from public.xray_contributors c
      where c.user_id = auth.uid() and c.is_active and c.revoked_at is null
        and c.role in ('publisher','administrator')
    )
  );
$$;

revoke all on function private.xray_can_read_submission(uuid) from public, anon, authenticated;
grant execute on function private.xray_can_read_submission(uuid) to authenticated;

create or replace function private.xray_require_actor(p_actor_user_id uuid, p_require_reviewer boolean default false)
returns public.xray_contributors
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_actor public.xray_contributors;
begin
  select * into v_actor from public.xray_contributors
  where user_id = p_actor_user_id and is_active and revoked_at is null;
  if v_actor.user_id is null then
    raise exception 'active X-ray contributor access required' using errcode = '42501';
  end if;
  if p_require_reviewer and (
    not v_actor.qualification_verified or
    v_actor.role not in ('reviewer','publisher','administrator')
  ) then raise exception 'active verified reviewer access required' using errcode = '42501'; end if;
  return v_actor;
end;
$$;

create or replace function private.xray_begin_mutation(
  p_actor_user_id uuid, p_operation text, p_idempotency_key uuid, p_request_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_request public.xray_mutation_requests;
begin
  if p_idempotency_key is null or p_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid mutation identity';
  end if;
  insert into public.xray_mutation_requests(actor_user_id, operation, idempotency_key, request_fingerprint)
  values (p_actor_user_id, p_operation, p_idempotency_key, p_request_fingerprint)
  on conflict (actor_user_id, operation, idempotency_key) do nothing;
  select * into v_request from public.xray_mutation_requests
  where actor_user_id = p_actor_user_id and operation = p_operation
    and idempotency_key = p_idempotency_key for update;
  if v_request.request_fingerprint <> p_request_fingerprint then
    raise exception 'idempotency key reused with different request' using errcode = '22000';
  end if;
  return v_request.result_resource_id;
end;
$$;

create or replace function private.xray_finish_mutation(
  p_actor_user_id uuid, p_operation text, p_idempotency_key uuid, p_result_resource_id uuid
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.xray_mutation_requests
  set result_resource_id = p_result_resource_id, completed_at = now()
  where actor_user_id = p_actor_user_id and operation = p_operation
    and idempotency_key = p_idempotency_key and result_resource_id is null;
$$;

create or replace function public.create_xray_submission(
  p_actor_user_id uuid, p_title text, p_request_id uuid, p_idempotency_key uuid,
  p_request_fingerprint text
)
returns public.xray_submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.xray_submissions;
  v_existing_id uuid;
begin
  perform private.xray_require_actor(p_actor_user_id, false);
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'create_submission', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_row from public.xray_submissions where id = v_existing_id;
    return v_row;
  end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 200 then raise exception 'invalid title'; end if;
  insert into public.xray_submissions(owner_user_id, title)
  values (p_actor_user_id, btrim(p_title)) returning * into v_row;
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id, request_id, idempotency_key)
  values (p_actor_user_id, 'user', 'submission_created', v_row.id, p_request_id, p_idempotency_key);
  perform private.xray_finish_mutation(p_actor_user_id, 'create_submission', p_idempotency_key, v_row.id);
  return v_row;
end;
$$;

create or replace function public.save_xray_draft(
  p_actor_user_id uuid, p_submission_id uuid, p_expected_draft_version integer, p_title text,
  p_draft_content jsonb, p_request_id uuid, p_idempotency_key uuid, p_request_fingerprint text
)
returns public.xray_submissions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.xray_submissions;
  v_existing_id uuid;
begin
  perform private.xray_require_actor(p_actor_user_id, false);
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'save_draft', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_row from public.xray_submissions where id = v_existing_id;
    return v_row;
  end if;
  if jsonb_typeof(p_draft_content) <> 'object' then raise exception 'draft content must be an object'; end if;
  update public.xray_submissions
  set title = btrim(p_title), draft_content = p_draft_content,
      draft_version = draft_version + 1, updated_at = now()
  where id = p_submission_id and owner_user_id = p_actor_user_id
    and draft_version = p_expected_draft_version
    and state in ('draft','changes_requested')
  returning * into v_row;
  if v_row.id is null then raise exception 'draft conflict or submission unavailable' using errcode = '40001'; end if;
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id, request_id, idempotency_key,
    safe_metadata) values (p_actor_user_id, 'user', 'draft_saved', v_row.id, p_request_id, p_idempotency_key,
    jsonb_build_object('draftVersion', v_row.draft_version));
  perform private.xray_finish_mutation(p_actor_user_id, 'save_draft', p_idempotency_key, v_row.id);
  return v_row;
end;
$$;

create or replace function public.submit_xray_revision(
  p_actor_user_id uuid, p_submission_id uuid, p_expected_draft_version integer, p_schema_version text,
  p_content_snapshot jsonb, p_content_sha256 text, p_asset_manifest_sha256 text,
  p_request_id uuid, p_idempotency_key uuid, p_request_fingerprint text
)
returns public.xray_submission_revisions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_submission public.xray_submissions;
  v_revision public.xray_submission_revisions;
  v_revision_number integer;
  v_existing_id uuid;
begin
  perform private.xray_require_actor(p_actor_user_id, false);
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'submit_revision', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_revision from public.xray_submission_revisions where id = v_existing_id;
    return v_revision;
  end if;
  if p_schema_version <> 'xray_case_v1' or jsonb_typeof(p_content_snapshot) <> 'object'
     or p_content_sha256 !~ '^[a-f0-9]{64}$' or p_asset_manifest_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid revision contract';
  end if;
  select * into v_submission from public.xray_submissions
  where id = p_submission_id and owner_user_id = p_actor_user_id for update;
  if v_submission.id is null or v_submission.state not in ('draft','changes_requested')
     or v_submission.draft_version <> p_expected_draft_version then
    raise exception 'draft conflict or submission unavailable' using errcode = '40001';
  end if;
  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.xray_submission_revisions where submission_id = p_submission_id;
  insert into public.xray_submission_revisions(submission_id, revision_number, authored_by_user_id,
    schema_version, content_snapshot, content_sha256, asset_manifest_sha256)
  values (p_submission_id, v_revision_number, p_actor_user_id, p_schema_version,
    p_content_snapshot, p_content_sha256, p_asset_manifest_sha256)
  returning * into v_revision;
  update public.xray_submissions set state = 'submitted', submitted_revision_id = v_revision.id,
    submitted_at = now(), updated_at = now() where id = p_submission_id;
  update public.xray_review_assignments set status = 'superseded'
  where submission_id = p_submission_id and revision_id <> v_revision.id
    and status in ('assigned','in_progress');
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id,
    revision_id, request_id, idempotency_key, safe_metadata)
  values (p_actor_user_id, 'user', 'revision_submitted', p_submission_id, v_revision.id,
    p_request_id, p_idempotency_key, jsonb_build_object('revisionNumber', v_revision_number,
    'contentSha256', p_content_sha256, 'assetManifestSha256', p_asset_manifest_sha256));
  perform private.xray_finish_mutation(p_actor_user_id, 'submit_revision', p_idempotency_key, v_revision.id);
  return v_revision;
end;
$$;

create or replace function public.add_xray_review_comment(
  p_actor_user_id uuid, p_assignment_id uuid, p_field_path text, p_severity text, p_body text,
  p_request_id uuid, p_idempotency_key uuid, p_request_fingerprint text
)
returns public.xray_review_comments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_assignment public.xray_review_assignments;
  v_comment public.xray_review_comments;
  v_owner uuid;
  v_existing_id uuid;
begin
  perform private.xray_require_actor(p_actor_user_id, true);
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'add_review_comment', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_comment from public.xray_review_comments where id = v_existing_id;
    return v_comment;
  end if;
  if p_severity not in ('required','suggestion','question')
     or length(btrim(p_field_path)) not between 1 and 300
     or length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'invalid review comment';
  end if;
  select * into v_assignment from public.xray_review_assignments
  where id = p_assignment_id and assigned_reviewer_user_id = p_actor_user_id
    and status in ('assigned','in_progress') for update;
  if v_assignment.id is null then raise exception 'active assignment required' using errcode = '42501'; end if;
  select owner_user_id into v_owner from public.xray_submissions where id = v_assignment.submission_id;
  if v_owner = p_actor_user_id then raise exception 'self review is forbidden' using errcode = '42501'; end if;
  update public.xray_review_assignments set status = 'in_progress', started_at = coalesce(started_at, now())
  where id = v_assignment.id;
  insert into public.xray_review_comments(assignment_id, revision_id, author_user_id,
    field_path, severity, body)
  values (v_assignment.id, v_assignment.revision_id, p_actor_user_id, btrim(p_field_path), p_severity, btrim(p_body))
  returning * into v_comment;
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id,
    revision_id, assignment_id, request_id, idempotency_key,
    safe_metadata) values (p_actor_user_id, 'user', 'comment_added', v_assignment.submission_id,
    v_assignment.revision_id, v_assignment.id, p_request_id, p_idempotency_key,
    jsonb_build_object('severity', p_severity, 'fieldPath', btrim(p_field_path)));
  perform private.xray_finish_mutation(p_actor_user_id, 'add_review_comment', p_idempotency_key, v_comment.id);
  return v_comment;
end;
$$;

create or replace function public.address_xray_review_comment(
  p_actor_user_id uuid, p_comment_id uuid, p_author_response text, p_request_id uuid,
  p_idempotency_key uuid, p_request_fingerprint text
)
returns public.xray_review_comments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_comment public.xray_review_comments;
  v_existing_id uuid;
begin
  perform private.xray_require_actor(p_actor_user_id, false);
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'address_review_comment', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_comment from public.xray_review_comments where id = v_existing_id;
    return v_comment;
  end if;
  if length(btrim(p_author_response)) not between 1 and 2000 then raise exception 'invalid author response'; end if;
  update public.xray_review_comments c
  set resolution_status = 'author_addressed', author_response = btrim(p_author_response),
      author_addressed_at = now(), resolved_at = null, resolved_by_user_id = null
  from public.xray_review_assignments a, public.xray_submissions s
  where c.id = p_comment_id and a.id = c.assignment_id and s.id = a.submission_id
    and s.owner_user_id = p_actor_user_id
    and c.resolution_status in ('open','reviewer_reopened')
  returning c.* into v_comment;
  if v_comment.id is null then raise exception 'comment unavailable for author response' using errcode = '42501'; end if;
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id,
    revision_id, assignment_id, request_id, idempotency_key)
  select p_actor_user_id, 'user', 'comment_addressed', a.submission_id, v_comment.revision_id,
    v_comment.assignment_id, p_request_id, p_idempotency_key
  from public.xray_review_assignments a where a.id = v_comment.assignment_id;
  perform private.xray_finish_mutation(p_actor_user_id, 'address_review_comment', p_idempotency_key, v_comment.id);
  return v_comment;
end;
$$;

create or replace function public.resolve_xray_review_comment(
  p_actor_user_id uuid, p_comment_id uuid, p_resolution_status text, p_request_id uuid,
  p_idempotency_key uuid, p_request_fingerprint text
)
returns public.xray_review_comments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_comment public.xray_review_comments;
  v_existing_id uuid;
  v_event_type text;
begin
  perform private.xray_require_actor(p_actor_user_id, true);
  if p_resolution_status not in ('reviewer_resolved','reviewer_dismissed','reviewer_reopened') then
    raise exception 'invalid reviewer resolution status';
  end if;
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'resolve_review_comment', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_comment from public.xray_review_comments where id = v_existing_id;
    return v_comment;
  end if;
  update public.xray_review_comments c
  set resolution_status = p_resolution_status,
      resolved_at = case when p_resolution_status = 'reviewer_reopened' then null else now() end,
      resolved_by_user_id = case when p_resolution_status = 'reviewer_reopened' then null else p_actor_user_id end
  from public.xray_review_assignments a
  where c.id = p_comment_id and a.id = c.assignment_id
    and a.assigned_reviewer_user_id = p_actor_user_id
    and a.status in ('assigned','in_progress')
    and c.resolution_status in ('open','author_addressed','reviewer_reopened')
  returning c.* into v_comment;
  if v_comment.id is null then raise exception 'comment unavailable for reviewer resolution' using errcode = '42501'; end if;
  v_event_type := case when p_resolution_status = 'reviewer_reopened' then 'comment_reopened' else 'comment_resolved' end;
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id,
    revision_id, assignment_id, request_id, idempotency_key, safe_metadata)
  select p_actor_user_id, 'user', v_event_type, a.submission_id, v_comment.revision_id,
    v_comment.assignment_id, p_request_id, p_idempotency_key,
    jsonb_build_object('commentResolution', p_resolution_status)
  from public.xray_review_assignments a where a.id = v_comment.assignment_id;
  perform private.xray_finish_mutation(p_actor_user_id, 'resolve_review_comment', p_idempotency_key, v_comment.id);
  return v_comment;
end;
$$;

create or replace function public.record_xray_review_decision(
  p_actor_user_id uuid, p_assignment_id uuid, p_decision text, p_content_sha256 text,
  p_asset_manifest_sha256 text, p_reason_codes text[], p_notes text,
  p_request_id uuid, p_idempotency_key uuid, p_request_fingerprint text
)
returns public.xray_review_decisions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_assignment public.xray_review_assignments;
  v_revision public.xray_submission_revisions;
  v_owner uuid;
  v_decision public.xray_review_decisions;
  v_privacy_approved boolean;
  v_clinical_approved boolean;
  v_existing_id uuid;
begin
  perform private.xray_require_actor(p_actor_user_id, true);
  v_existing_id := private.xray_begin_mutation(p_actor_user_id, 'record_review_decision', p_idempotency_key, p_request_fingerprint);
  if v_existing_id is not null then
    select * into strict v_decision from public.xray_review_decisions where id = v_existing_id;
    return v_decision;
  end if;
  if p_decision not in ('approve','request_changes','reject','escalate') then raise exception 'invalid decision'; end if;
  if coalesce(length(p_notes), 0) > 2000 then raise exception 'notes too long'; end if;
  select * into v_assignment from public.xray_review_assignments
  where id = p_assignment_id and assigned_reviewer_user_id = p_actor_user_id
    and status in ('assigned','in_progress') for update;
  if v_assignment.id is null then raise exception 'active assignment required' using errcode = '42501'; end if;
  select owner_user_id into v_owner from public.xray_submissions where id = v_assignment.submission_id;
  if v_owner = p_actor_user_id then raise exception 'self review is forbidden' using errcode = '42501'; end if;
  select * into v_revision from public.xray_submission_revisions where id = v_assignment.revision_id;
  if v_revision.content_sha256 <> p_content_sha256 or v_revision.asset_manifest_sha256 <> p_asset_manifest_sha256 then
    raise exception 'review hashes do not match assigned revision' using errcode = '40001';
  end if;
  if p_decision = 'approve' and exists (
    select 1 from public.xray_review_comments c
    where c.assignment_id = v_assignment.id and c.severity = 'required'
      and c.resolution_status in ('open','author_addressed','reviewer_reopened')
  ) then raise exception 'required review comments must be resolved before approval' using errcode = '23514'; end if;
  insert into public.xray_review_decisions(assignment_id, submission_id, revision_id, reviewer_user_id,
    review_lane, decision, content_sha256, asset_manifest_sha256, reason_codes, notes, idempotency_key)
  values (v_assignment.id, v_assignment.submission_id, v_assignment.revision_id, p_actor_user_id,
    v_assignment.review_lane, p_decision, p_content_sha256, p_asset_manifest_sha256,
    coalesce(p_reason_codes, '{}'), coalesce(p_notes, ''), p_idempotency_key)
  returning * into v_decision;
  update public.xray_review_assignments set status = 'completed', completed_at = now()
  where id = v_assignment.id;
  if p_decision = 'request_changes' then
    update public.xray_submissions set state = 'changes_requested', updated_at = now()
    where id = v_assignment.submission_id and submitted_revision_id = v_assignment.revision_id;
  elsif p_decision = 'reject' then
    update public.xray_submissions set state = 'rejected', closed_at = now(), updated_at = now()
    where id = v_assignment.submission_id and submitted_revision_id = v_assignment.revision_id;
  elsif p_decision = 'approve' then
    select exists(select 1 from public.xray_review_decisions d where d.revision_id = v_assignment.revision_id and d.review_lane = 'privacy' and d.decision = 'approve') into v_privacy_approved;
    select exists(select 1 from public.xray_review_decisions d where d.revision_id = v_assignment.revision_id and d.review_lane = 'clinical' and d.decision = 'approve') into v_clinical_approved;
    update public.xray_submissions set state = case when v_privacy_approved and v_clinical_approved then 'publication_ready' else 'in_review' end,
      updated_at = now() where id = v_assignment.submission_id and submitted_revision_id = v_assignment.revision_id;
  end if;
  insert into public.xray_audit_events(actor_user_id, actor_type, event_type, submission_id,
    revision_id, assignment_id, request_id, idempotency_key,
    safe_metadata) values (p_actor_user_id, 'user', 'decision_recorded', v_assignment.submission_id,
    v_assignment.revision_id, v_assignment.id, p_request_id, p_idempotency_key,
    jsonb_build_object('reviewLane', v_assignment.review_lane, 'decision', p_decision));
  perform private.xray_finish_mutation(p_actor_user_id, 'record_review_decision', p_idempotency_key, v_decision.id);
  return v_decision;
end;
$$;

revoke all on function public.xray_guard_immutable_row() from public, anon, authenticated;
revoke all on function public.xray_guard_submission_identity() from public, anon, authenticated;
revoke all on function public.xray_validate_review_assignment() from public, anon, authenticated;
revoke all on function private.xray_require_actor(uuid,boolean) from public, anon, authenticated;
revoke all on function private.xray_begin_mutation(uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function private.xray_finish_mutation(uuid,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.create_xray_submission(uuid,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.save_xray_draft(uuid,uuid,integer,text,jsonb,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.submit_xray_revision(uuid,uuid,integer,text,jsonb,text,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.add_xray_review_comment(uuid,uuid,text,text,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.address_xray_review_comment(uuid,uuid,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.resolve_xray_review_comment(uuid,uuid,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.record_xray_review_decision(uuid,uuid,text,text,text,text[],text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.create_xray_submission(uuid,text,uuid,uuid,text) to service_role;
grant execute on function public.save_xray_draft(uuid,uuid,integer,text,jsonb,uuid,uuid,text) to service_role;
grant execute on function public.submit_xray_revision(uuid,uuid,integer,text,jsonb,text,text,uuid,uuid,text) to service_role;
grant execute on function public.add_xray_review_comment(uuid,uuid,text,text,text,uuid,uuid,text) to service_role;
grant execute on function public.address_xray_review_comment(uuid,uuid,text,uuid,uuid,text) to service_role;
grant execute on function public.resolve_xray_review_comment(uuid,uuid,text,uuid,uuid,text) to service_role;
grant execute on function public.record_xray_review_decision(uuid,uuid,text,text,text,text[],text,uuid,uuid,text) to service_role;

comment on table public.xray_submission_revisions is 'Immutable authored X-ray case snapshots; release content is exported only after independent review.';
comment on table public.xray_review_decisions is 'Append-only, hash-bound human review evidence. Never update or delete decisions.';
comment on table public.xray_audit_events is 'Append-only safe workflow audit metadata. Never store clinical text, image URLs, or image bytes.';
comment on table public.xray_mutation_requests is 'Server-only idempotency ledger. A key may be replayed only with the same request fingerprint.';
comment on table public.xray_assets is 'Object references and processing metadata only. Image bytes are stored in the approved AWS asset plane.';

commit;
