-- Secure, non-public educational raster media for MyCases.
-- This is intentionally not a zero-knowledge or client-encrypted Vault.
begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mycases_cases'::regclass
      and conname = 'mycases_cases_id_user_id_key'
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (id, user_id)'
  ) then
    raise exception 'mycases_cases_id_user_id_key must exist before educational media';
  end if;
end
$$;

create table if not exists public.mycases_educational_assets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  case_id uuid not null,
  caption text check (caption is null or length(btrim(caption)) between 1 and 500),
  storage_object_key text not null,
  thumbnail_object_key text not null,
  media_type text not null check (media_type = 'image/webp'),
  byte_size bigint not null check (byte_size between 1 and 15728640),
  width integer not null check (width between 1 and 8000),
  height integer not null check (height between 1 and 8000),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  processing_status text not null default 'ready'
    check (processing_status in ('processing', 'ready', 'failed', 'deleting', 'deleted')),
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint mycases_educational_assets_id_user_id_key unique (id, user_id),
  constraint mycases_educational_assets_case_owner_fk
    foreign key (case_id, user_id)
    references public.mycases_cases(id, user_id)
    on delete restrict,
  constraint mycases_educational_assets_pixel_limit
    check ((width::bigint * height::bigint) <= 40000000),
  constraint mycases_educational_assets_image_key
    check (storage_object_key = user_id::text || '/' || id::text || '/image.webp'),
  constraint mycases_educational_assets_thumbnail_key
    check (thumbnail_object_key = user_id::text || '/' || id::text || '/thumbnail.webp')
);

create index if not exists mycases_educational_assets_case_created_idx
  on public.mycases_educational_assets (user_id, case_id, created_at desc)
  where deleted_at is null;
create index if not exists mycases_educational_assets_active_idx
  on public.mycases_educational_assets (user_id, processing_status, updated_at desc)
  where deleted_at is null;
create unique index if not exists mycases_educational_assets_active_checksum_idx
  on public.mycases_educational_assets (user_id, case_id, checksum_sha256)
  where deleted_at is null and processing_status <> 'deleted';

drop trigger if exists mycases_educational_assets_touch on public.mycases_educational_assets;
create trigger mycases_educational_assets_touch
  before update on public.mycases_educational_assets
  for each row execute function public.mycases_touch_version();

alter table public.mycases_educational_assets enable row level security;

drop policy if exists mycases_educational_assets_select_own on public.mycases_educational_assets;
drop policy if exists mycases_educational_assets_insert_own on public.mycases_educational_assets;
drop policy if exists mycases_educational_assets_update_own on public.mycases_educational_assets;
drop policy if exists mycases_educational_assets_delete_own on public.mycases_educational_assets;
create policy mycases_educational_assets_select_own on public.mycases_educational_assets
  for select using (auth.uid() = user_id);
create policy mycases_educational_assets_insert_own on public.mycases_educational_assets
  for insert with check (auth.uid() = user_id);
create policy mycases_educational_assets_update_own on public.mycases_educational_assets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy mycases_educational_assets_delete_own on public.mycases_educational_assets
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mycases-educational-media',
  'mycases-educational-media',
  false,
  15728640,
  array['image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mycases_educational_media_select_own on storage.objects;
drop policy if exists mycases_educational_media_insert_own on storage.objects;
drop policy if exists mycases_educational_media_update_own on storage.objects;
drop policy if exists mycases_educational_media_delete_own on storage.objects;

-- Deliberately create no anon/authenticated storage.objects policies for this
-- bucket. Every object operation is performed by the service role only after a
-- Next.js API authenticates the caller and verifies the corresponding owned
-- database row. These drops also converge staging databases that ran the first
-- version of this migration, which allowed direct owner-folder access.

comment on table public.mycases_educational_assets is
  'Private sanitized educational raster metadata. No original filenames, public URLs, EXIF, DICOM, reports, or encryption keys.';
commit;
