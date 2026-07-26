-- Supabase remains the release/text control plane; binary deck artifacts and media may live in AWS.
begin;

alter table public.anki_deck_release_artifacts
  add column if not exists storage_provider text not null default 'supabase_storage',
  add column if not exists storage_bucket text null,
  add column if not exists delivery_metadata jsonb not null default '{}';

alter table public.anki_deck_media_assets
  add column if not exists storage_provider text not null default 'supabase_storage',
  add column if not exists storage_bucket text null;

alter table public.anki_deck_release_artifacts
  add constraint anki_release_artifact_storage_provider
  check(storage_provider in ('supabase_storage','aws_s3'));

alter table public.anki_deck_media_assets
  add constraint anki_media_asset_storage_provider
  check(storage_provider in ('supabase_storage','aws_s3'));

alter table public.anki_deck_release_artifacts
  add constraint anki_release_artifact_delivery_metadata_safe
  check(public.educational_metadata_is_safe(delivery_metadata));

comment on column public.anki_deck_release_artifacts.storage_provider is
  'Binary provider only. Supabase remains authoritative for release and text metadata.';
comment on column public.anki_deck_media_assets.storage_provider is
  'Binary provider only. Supabase remains authoritative for card/media metadata.';

commit;
