-- Separate SnapOrtho's install identity from the GUID of the source deck.
-- Existing sync-note UUIDs remain stable so installed subscriptions and
-- scheduling are adopted in place across the cutover.
begin;

alter table public.anki_sync_v2_notes
  add column if not exists source_guid text,
  add column if not exists product_guid text;

alter table public.anki_sync_v2_releases
  add column if not exists identity_scheme text;

alter table public.anki_sync_v2_releases
  add constraint anki_sync_v2_releases_identity_scheme_check
    check(identity_scheme is null or identity_scheme = 'snaportho-note-guid.v1');

create function public.guard_anki_sync_v2_identity_scheme()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status <> 'draft' and new.identity_scheme is distinct from old.identity_scheme then
    raise exception 'published SnapOrtho sync identity scheme is immutable';
  end if;
  return new;
end $$;

create trigger guard_anki_sync_v2_identity_scheme
before update on public.anki_sync_v2_releases
for each row execute function public.guard_anki_sync_v2_identity_scheme();

update public.anki_sync_v2_notes
set source_guid = stable_guid
where source_guid is null;

alter table public.anki_sync_v2_notes
  alter column source_guid set not null;

create unique index if not exists anki_sync_v2_notes_source_guid_unique
  on public.anki_sync_v2_notes(source_guid);

create unique index if not exists anki_sync_v2_notes_product_guid_unique
  on public.anki_sync_v2_notes(product_guid)
  where product_guid is not null;

alter table public.anki_sync_v2_notes
  add constraint anki_sync_v2_notes_source_guid_check
    check(char_length(source_guid) between 1 and 200 and source_guid !~ '[[:cntrl:][:space:]]'),
  add constraint anki_sync_v2_notes_product_guid_check
    check(product_guid is null or product_guid ~ '^so1_[0-9a-f]{32}$'),
  add constraint anki_sync_v2_notes_guid_separation_check
    check(product_guid is null or product_guid <> source_guid);

comment on column public.anki_sync_v2_notes.source_guid is
  'Original imported Anki GUID retained only for provenance and legacy adoption; never emitted to new installs.';
comment on column public.anki_sync_v2_notes.product_guid is
  'SnapOrtho-owned Anki GUID used by bootstrap packages and new sync-created notes.';
comment on column public.anki_sync_v2_releases.identity_scheme is
  'Sync epoch. New clients only replay operations from releases in the current identity scheme.';

commit;
