-- Note-centric, immutable, cursor-based SnapOrtho deck delivery.
-- Additive only: v1 history remains readable for recovery and comparison.
begin;

create table public.anki_sync_v2_notes (
  id uuid primary key default gen_random_uuid(),
  source_anki_note_id uuid null references public.anki_notes(id) on delete restrict,
  stable_guid text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint anki_sync_v2_notes_source_unique unique(source_anki_note_id),
  constraint anki_sync_v2_notes_guid_unique unique(stable_guid),
  constraint anki_sync_v2_notes_guid_check check(char_length(stable_guid) between 1 and 200 and stable_guid !~ '[[:cntrl:][:space:]]'),
  constraint anki_sync_v2_notes_status_check check(status in('active','retired'))
);

create table public.anki_sync_v2_note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.anki_sync_v2_notes(id) on delete restrict,
  version_number integer not null,
  predecessor_version_id uuid null references public.anki_sync_v2_note_versions(id) on delete restrict,
  note_type_key text not null,
  field_snapshot jsonb not null,
  field_hashes jsonb not null,
  governed_tags text[] not null default '{}',
  content_checksum text not null,
  tags_checksum text not null,
  deck_path text not null,
  created_at timestamptz not null default now(),
  constraint anki_sync_v2_note_versions_number_unique unique(note_id,version_number),
  constraint anki_sync_v2_note_versions_predecessor_unique unique(predecessor_version_id),
  constraint anki_sync_v2_note_versions_number_check check(version_number > 0),
  constraint anki_sync_v2_note_versions_predecessor_check check(predecessor_version_id is null or predecessor_version_id <> id),
  constraint anki_sync_v2_note_versions_type_check check(char_length(note_type_key) between 1 and 200),
  constraint anki_sync_v2_note_versions_fields_check check(jsonb_typeof(field_snapshot)='object' and jsonb_typeof(field_hashes)='object'),
  constraint anki_sync_v2_note_versions_hash_check check(content_checksum~'^[a-f0-9]{64}$' and tags_checksum~'^[a-f0-9]{64}$'),
  constraint anki_sync_v2_note_versions_path_check check(char_length(deck_path) between 1 and 1000),
  constraint anki_sync_v2_note_versions_safe_check check(public.educational_metadata_is_safe(field_snapshot) and public.educational_metadata_is_safe(field_hashes))
);

create table public.anki_sync_v2_releases (
  id uuid primary key default gen_random_uuid(),
  release_sequence bigint generated always as identity unique,
  release_version text not null unique,
  predecessor_release_id uuid null references public.anki_sync_v2_releases(id) on delete restrict,
  status text not null default 'draft',
  notes_checksum text not null,
  tags_checksum text not null,
  media_checksum text not null,
  note_types_checksum text not null,
  aggregate_checksum text not null,
  expected_note_count integer not null,
  expected_card_count integer not null,
  expected_media_count integer not null default 0,
  minimum_addon_version text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  constraint anki_sync_v2_releases_predecessor_unique unique(predecessor_release_id),
  constraint anki_sync_v2_releases_version_check check(release_version~'^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$'),
  constraint anki_sync_v2_releases_status_check check(status in('draft','published','superseded','retired')),
  constraint anki_sync_v2_releases_hash_check check(
    notes_checksum~'^[a-f0-9]{64}$' and tags_checksum~'^[a-f0-9]{64}$'
    and media_checksum~'^[a-f0-9]{64}$' and note_types_checksum~'^[a-f0-9]{64}$'
    and aggregate_checksum~'^[a-f0-9]{64}$'
  ),
  constraint anki_sync_v2_releases_counts_check check(expected_note_count>0 and expected_card_count>0 and expected_media_count>=0),
  constraint anki_sync_v2_releases_lifecycle_check check(
    (status='draft' and published_at is null) or (status<>'draft' and published_at is not null)
  )
);

create table public.anki_sync_v2_release_notes (
  release_id uuid not null references public.anki_sync_v2_releases(id) on delete restrict,
  note_id uuid not null references public.anki_sync_v2_notes(id) on delete restrict,
  note_version_id uuid not null references public.anki_sync_v2_note_versions(id) on delete restrict,
  ordering_key text not null,
  expected_card_ordinals integer[] not null default '{}',
  primary key(release_id,note_id),
  constraint anki_sync_v2_release_notes_version_unique unique(release_id,note_version_id),
  constraint anki_sync_v2_release_notes_order_unique unique(release_id,ordering_key),
  constraint anki_sync_v2_release_notes_order_check check(ordering_key~'^[A-Za-z0-9._:/-]{1,500}$'),
  constraint anki_sync_v2_release_notes_ordinals_check check(0 <= all(expected_card_ordinals))
);

create table public.anki_sync_v2_delta_operations (
  cursor bigint generated always as identity primary key,
  release_id uuid not null references public.anki_sync_v2_releases(id) on delete restrict,
  operation_index integer not null,
  operation text not null,
  note_id uuid null references public.anki_sync_v2_notes(id) on delete restrict,
  note_version_id uuid null references public.anki_sync_v2_note_versions(id) on delete restrict,
  payload_checksum text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint anki_sync_v2_delta_operation_unique unique(release_id,operation_index),
  constraint anki_sync_v2_delta_index_check check(operation_index>=0),
  constraint anki_sync_v2_delta_kind_check check(operation in(
    'upsert_note','retire_note','update_tags','move_note','update_note_type','media_add','media_remove'
  )),
  constraint anki_sync_v2_delta_hash_check check(payload_checksum~'^[a-f0-9]{64}$'),
  constraint anki_sync_v2_delta_payload_check check(jsonb_typeof(payload)='object' and public.educational_metadata_is_safe(payload))
);

create table public.anki_sync_v2_release_media (
  release_id uuid not null references public.anki_sync_v2_releases(id) on delete restrict,
  logical_filename text not null,
  content_sha256 text not null,
  mime_type text not null,
  byte_size bigint not null,
  object_key text not null,
  storage_provider text not null,
  storage_bucket text null,
  primary key(release_id,logical_filename),
  constraint anki_sync_v2_release_media_hash_check check(content_sha256~'^[a-f0-9]{64}$'),
  constraint anki_sync_v2_release_media_size_check check(byte_size>0)
);

create index anki_sync_v2_delta_release_cursor_idx on public.anki_sync_v2_delta_operations(release_id,cursor);
create index anki_sync_v2_versions_note_idx on public.anki_sync_v2_note_versions(note_id,version_number desc);
create index anki_sync_v2_releases_status_idx on public.anki_sync_v2_releases(status,release_sequence desc);

create function public.guard_anki_sync_v2_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'published SnapOrtho sync v2 evidence is immutable';
end $$;

create function public.guard_anki_sync_v2_release_mutation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' and old.status<>'draft' then
    raise exception 'published SnapOrtho sync v2 release cannot be deleted';
  end if;
  if tg_op='UPDATE' and old.status<>'draft' and new is distinct from old then
    if new.release_version is distinct from old.release_version
      or new.predecessor_release_id is distinct from old.predecessor_release_id
      or new.notes_checksum is distinct from old.notes_checksum
      or new.tags_checksum is distinct from old.tags_checksum
      or new.media_checksum is distinct from old.media_checksum
      or new.note_types_checksum is distinct from old.note_types_checksum
      or new.aggregate_checksum is distinct from old.aggregate_checksum
      or new.expected_note_count is distinct from old.expected_note_count
      or new.expected_card_count is distinct from old.expected_card_count
      or new.expected_media_count is distinct from old.expected_media_count
      or new.minimum_addon_version is distinct from old.minimum_addon_version
      or new.created_at is distinct from old.created_at
      or new.published_at is distinct from old.published_at
      or not(old.status='published' and new.status='superseded') then
      raise exception 'published SnapOrtho sync v2 release is immutable';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

create function public.guard_anki_sync_v2_release_members()
returns trigger language plpgsql security definer set search_path=public as $$
declare rid uuid; lifecycle text;
begin
  rid:=case when tg_op='DELETE' then old.release_id else new.release_id end;
  select status into lifecycle from public.anki_sync_v2_releases where id=rid;
  if lifecycle<>'draft' then raise exception 'published SnapOrtho sync v2 membership is immutable'; end if;
  if tg_op<>'DELETE' and not exists(
    select 1 from public.anki_sync_v2_note_versions v where v.id=new.note_version_id and v.note_id=new.note_id
  ) then raise exception 'release note/version identity mismatch'; end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

create trigger guard_anki_sync_v2_release before update or delete on public.anki_sync_v2_releases
for each row execute function public.guard_anki_sync_v2_release_mutation();
create trigger guard_anki_sync_v2_release_note before insert or update or delete on public.anki_sync_v2_release_notes
for each row execute function public.guard_anki_sync_v2_release_members();
create trigger guard_anki_sync_v2_note_version before update or delete on public.anki_sync_v2_note_versions
for each row execute function public.guard_anki_sync_v2_immutable();
create trigger guard_anki_sync_v2_delta before update or delete on public.anki_sync_v2_delta_operations
for each row execute function public.guard_anki_sync_v2_immutable();
create trigger guard_anki_sync_v2_media before update or delete on public.anki_sync_v2_release_media
for each row execute function public.guard_anki_sync_v2_immutable();

do $$ declare t text; begin
  foreach t in array array[
    'anki_sync_v2_notes','anki_sync_v2_note_versions','anki_sync_v2_releases',
    'anki_sync_v2_release_notes','anki_sync_v2_delta_operations','anki_sync_v2_release_media'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from anon,authenticated,service_role',t);
    execute format('grant select,insert,update on public.%I to service_role',t);
  end loop;
end $$;

comment on table public.anki_sync_v2_releases is
'Immutable note-centric SnapOrtho deck releases. Component checksums are pinned at publication; no latest-manifest overlays.';
comment on table public.anki_sync_v2_delta_operations is
'Globally ordered, checksummed, resumable note-level operations consumed by the Anki add-on.';
commit;
