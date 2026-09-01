-- Resource-field overlay for the SnapOrtho master deck.
--
-- Publishes enrichment "extra data" (Orthobullets bullets/links, and future
-- resource fields such as ROCK, Podcasts, Video, CasePrep, BroBot) as a
-- layered, versioned overlay that the sync-v2 publisher merges into the master
-- field snapshot at build time -- mirroring how governed tags are merged from
-- rendered_anki_tag_manifests. Canonical card content is never mutated.
--
-- Idempotent: safe to re-run.

create table if not exists public.anki_resource_field_overlays (
  id uuid primary key default gen_random_uuid(),
  overlay_key text not null unique,
  deck_release_id uuid not null references public.anki_deck_releases(id) on delete restrict,
  output_checksum text not null,
  field_count integer not null default 0,
  note_count integer not null default 0,
  status text not null default 'draft',
  predecessor_overlay_id uuid null references public.anki_resource_field_overlays(id) on delete restrict,
  created_at timestamptz not null default now(),
  validated_at timestamptz null,
  published_at timestamptz null,
  superseded_at timestamptz null,
  constraint anki_resource_field_overlays_key_check
    check (overlay_key ~ '^[a-z0-9][a-z0-9._-]{2,127}$'),
  constraint anki_resource_field_overlays_checksum_check
    check (output_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_resource_field_overlays_status_check
    check (status in ('draft','validated','published','superseded')),
  constraint anki_resource_field_overlays_predecessor_check
    check (predecessor_overlay_id is null or predecessor_overlay_id <> id),
  constraint anki_resource_field_overlays_timestamps_check check (
    (status = 'draft' and validated_at is null and published_at is null and superseded_at is null)
    or (status = 'validated' and validated_at is not null and published_at is null and superseded_at is null)
    or (status = 'published' and validated_at is not null and published_at is not null and superseded_at is null)
    or (status = 'superseded' and validated_at is not null and published_at is not null and superseded_at is not null)
  )
);

-- Only one published overlay per deck release at a time.
create unique index if not exists anki_resource_field_overlays_one_published_idx
  on public.anki_resource_field_overlays (deck_release_id)
  where status = 'published';

create table if not exists public.anki_resource_field_overlay_cards (
  id uuid primary key default gen_random_uuid(),
  overlay_id uuid not null references public.anki_resource_field_overlays(id) on delete cascade,
  note_guid text not null,
  fields jsonb not null,
  output_checksum text not null,
  created_at timestamptz not null default now(),
  constraint anki_resource_field_overlay_cards_checksum_check
    check (output_checksum ~ '^[0-9a-f]{64}$'),
  constraint anki_resource_field_overlay_cards_fields_object_check
    check (jsonb_typeof(fields) = 'object'),
  constraint anki_resource_field_overlay_cards_identity_unique
    unique (overlay_id, note_guid)
);

create index if not exists anki_resource_field_overlay_cards_overlay_idx
  on public.anki_resource_field_overlay_cards (overlay_id);
