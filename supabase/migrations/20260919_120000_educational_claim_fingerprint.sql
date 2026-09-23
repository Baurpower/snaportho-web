-- Clinical-claim fingerprint layer for claim-mediated question-to-card matching.
-- Evolves educational_claims; adds versioned snapshots, card/question claim links, and gaps.
-- DDL + existing-row backfill only. Inserts no learner events, mappings from questions, or cards.

begin;

create or replace function public.educational_claim_normalize_text(value text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(both from regexp_replace(
    regexp_replace(lower(coalesce(value, '')), '[^a-z0-9+/ -]', ' ', 'g'),
    '\s+',
    ' ',
    'g'
  ));
$$;

create or replace function public.educational_claim_qualifiers_are_valid(value jsonb)
returns boolean
language sql
immutable
parallel safe
as $$
  select jsonb_typeof(coalesce(value, '{}'::jsonb)) = 'object'
    and public.educational_metadata_is_safe(coalesce(value, '{}'::jsonb))
    and not exists (
      select 1
      from jsonb_each(coalesce(value, '{}'::jsonb)) kv
      where kv.key not in (
        'anatomy', 'age_group', 'setting', 'severity', 'laterality', 'procedure', 'contraindication'
      )
        or jsonb_typeof(kv.value) <> 'string'
        or char_length(kv.value #>> '{}') > 80
    );
$$;

create or replace function public.educational_claim_fingerprint_payload(
  claim_type text,
  primary_entity_id uuid,
  predicate text,
  object_text text,
  qualifiers jsonb
)
returns text
language sql
immutable
parallel safe
as $$
  select concat_ws(
    chr(10),
    'type=' || public.educational_claim_normalize_text(claim_type),
    'entity=' || lower(primary_entity_id::text),
    'predicate=' || public.educational_claim_normalize_text(predicate),
    'object=' || public.educational_claim_normalize_text(object_text),
    'qualifiers=' || coalesce((
      select string_agg(
        kv.key || '=' || public.educational_claim_normalize_text(kv.value #>> '{}'),
        ';'
        order by kv.key
      )
      from jsonb_each(coalesce(qualifiers, '{}'::jsonb)) kv
    ), '')
  );
$$;

create or replace function public.educational_claim_fingerprint_hash(
  claim_type text,
  primary_entity_id uuid,
  predicate text,
  object_text text,
  qualifiers jsonb
)
returns text
language sql
immutable
parallel safe
as $$
  select encode(
    digest(
      convert_to(
        public.educational_claim_fingerprint_payload(
          claim_type, primary_entity_id, predicate, object_text, qualifiers
        ),
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

alter table public.educational_claims
  add column if not exists current_version_id uuid null,
  add column if not exists fingerprint_hash text null,
  add column if not exists predicate text not null default '',
  add column if not exists object_text text not null default '',
  add column if not exists qualifiers jsonb not null default '{}'::jsonb,
  add column if not exists approval_method text not null default 'unreviewed',
  add column if not exists algorithm_version text not null default 'legacy-unversioned';

alter table public.educational_claims
  drop constraint if exists educational_claims_approval_method_check;
alter table public.educational_claims
  add constraint educational_claims_approval_method_check
  check (approval_method in ('unreviewed', 'machine_consensus', 'sampled_audit', 'human_review'));

alter table public.educational_claims
  drop constraint if exists educational_claims_predicate_len_check;
alter table public.educational_claims
  add constraint educational_claims_predicate_len_check
  check (char_length(predicate) <= 80);

alter table public.educational_claims
  drop constraint if exists educational_claims_object_len_check;
alter table public.educational_claims
  add constraint educational_claims_object_len_check
  check (char_length(object_text) <= 200);

alter table public.educational_claims
  drop constraint if exists educational_claims_text_len_check;
alter table public.educational_claims
  add constraint educational_claims_text_len_check
  check (char_length(claim_text) <= 2000);

alter table public.educational_claims
  drop constraint if exists educational_claims_algorithm_check;
alter table public.educational_claims
  add constraint educational_claims_algorithm_check
  check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$');

alter table public.educational_claims
  drop constraint if exists educational_claims_qualifiers_check;
alter table public.educational_claims
  add constraint educational_claims_qualifiers_check
  check (public.educational_claim_qualifiers_are_valid(qualifiers));

alter table public.educational_claims
  drop constraint if exists educational_claims_fingerprint_format_check;
alter table public.educational_claims
  add constraint educational_claims_fingerprint_format_check
  check (fingerprint_hash is null or fingerprint_hash ~ '^[0-9a-f]{64}$');

create or replace function public.sync_educational_claim_fingerprint()
returns trigger
language plpgsql
as $$
begin
  new.fingerprint_hash := public.educational_claim_fingerprint_hash(
    new.claim_type, new.primary_entity_id, new.predicate, new.object_text, new.qualifiers
  );
  return new;
end;
$$;

drop trigger if exists sync_educational_claim_fingerprint on public.educational_claims;
create trigger sync_educational_claim_fingerprint
  before insert or update of claim_type, primary_entity_id, predicate, object_text, qualifiers
  on public.educational_claims
  for each row execute function public.sync_educational_claim_fingerprint();

update public.educational_claims
set fingerprint_hash = public.educational_claim_fingerprint_hash(
  claim_type, primary_entity_id, predicate, object_text, qualifiers
)
where fingerprint_hash is null
   or fingerprint_hash is distinct from public.educational_claim_fingerprint_hash(
     claim_type, primary_entity_id, predicate, object_text, qualifiers
   );

alter table public.educational_claims
  alter column fingerprint_hash set not null;

create table if not exists public.educational_claim_versions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.educational_claims(id) on delete restrict,
  version_number integer not null,
  fingerprint_hash text not null,
  claim_text text not null,
  claim_type text not null,
  predicate text not null,
  object_text text not null,
  qualifiers jsonb not null default '{}'::jsonb,
  primary_entity_id uuid not null references public.canonical_entities(id) on delete restrict,
  approval_method text not null,
  content_source text not null,
  review_status text not null,
  algorithm_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint educational_claim_versions_number_unique unique (claim_id, version_number),
  constraint educational_claim_versions_number_check check (version_number >= 1),
  constraint educational_claim_versions_hash_format_check check (fingerprint_hash ~ '^[0-9a-f]{64}$'),
  constraint educational_claim_versions_text_len_check check (char_length(claim_text) <= 2000),
  constraint educational_claim_versions_predicate_len_check check (char_length(predicate) <= 80),
  constraint educational_claim_versions_object_len_check check (char_length(object_text) <= 200),
  constraint educational_claim_versions_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint educational_claim_versions_approval_check
    check (approval_method in ('unreviewed', 'machine_consensus', 'sampled_audit', 'human_review')),
  constraint educational_claim_versions_content_source_check
    check (content_source in ('verified', 'generated_draft', 'needs_review', 'deprecated')),
  constraint educational_claim_versions_review_status_check
    check (review_status in ('unreviewed', 'in_review', 'approved', 'rejected', 'conflicted')),
  constraint educational_claim_versions_qualifiers_check
    check (public.educational_claim_qualifiers_are_valid(qualifiers)),
  constraint educational_claim_versions_safe_metadata_check
    check (public.educational_metadata_is_safe(metadata))
);

create or replace function public.sync_educational_claim_version_fingerprint()
returns trigger
language plpgsql
as $$
begin
  new.fingerprint_hash := public.educational_claim_fingerprint_hash(
    new.claim_type, new.primary_entity_id, new.predicate, new.object_text, new.qualifiers
  );
  return new;
end;
$$;

drop trigger if exists sync_educational_claim_version_fingerprint on public.educational_claim_versions;
create trigger sync_educational_claim_version_fingerprint
  before insert on public.educational_claim_versions
  for each row execute function public.sync_educational_claim_version_fingerprint();

create or replace function public.guard_educational_claim_versions_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'educational_claim_versions rows are immutable';
end;
$$;

drop trigger if exists guard_educational_claim_versions_immutable on public.educational_claim_versions;
create trigger guard_educational_claim_versions_immutable
  before update or delete on public.educational_claim_versions
  for each row execute function public.guard_educational_claim_versions_immutable();

insert into public.educational_claim_versions (
  claim_id, version_number, fingerprint_hash, claim_text, claim_type, predicate, object_text,
  qualifiers, primary_entity_id, approval_method, content_source, review_status, algorithm_version, metadata, created_at
)
select
  c.id,
  1,
  c.fingerprint_hash,
  c.claim_text,
  c.claim_type,
  c.predicate,
  c.object_text,
  c.qualifiers,
  c.primary_entity_id,
  c.approval_method,
  c.content_source,
  c.review_status,
  c.algorithm_version,
  '{}'::jsonb,
  c.created_at
from public.educational_claims c
where not exists (
  select 1 from public.educational_claim_versions v where v.claim_id = c.id
);

update public.educational_claims c
set current_version_id = v.id
from public.educational_claim_versions v
where v.claim_id = c.id
  and v.version_number = 1
  and c.current_version_id is null;

alter table public.educational_claims
  drop constraint if exists educational_claims_current_version_fk;
alter table public.educational_claims
  add constraint educational_claims_current_version_fk
  foreign key (current_version_id)
  references public.educational_claim_versions(id)
  on delete restrict;

create unique index if not exists educational_claims_active_fingerprint_uidx
  on public.educational_claims (fingerprint_hash)
  where is_active and predicate <> '' and object_text <> '';

create index if not exists educational_claims_entity_active_idx
  on public.educational_claims (primary_entity_id, is_active);

create index if not exists educational_claim_versions_claim_idx
  on public.educational_claim_versions (claim_id, version_number);

create index if not exists educational_claim_versions_fingerprint_idx
  on public.educational_claim_versions (fingerprint_hash);

create table if not exists public.card_claim_links (
  id uuid primary key default gen_random_uuid(),
  canonical_card_id uuid not null references public.canonical_cards(id) on delete restrict,
  canonical_card_version_id uuid not null references public.canonical_card_versions(id) on delete restrict,
  claim_id uuid not null references public.educational_claims(id) on delete restrict,
  claim_version_id uuid not null references public.educational_claim_versions(id) on delete restrict,
  mapping_role text not null default 'teaches',
  confidence numeric(4,3) not null,
  approval_method text not null,
  review_status text not null,
  algorithm_version text not null,
  evidence_locator text not null,
  evidence_hashes text[] not null default '{}'::text[],
  reason_codes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_claim_links_role_check check (mapping_role = 'teaches'),
  constraint card_claim_links_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint card_claim_links_approval_check
    check (approval_method in ('machine_consensus', 'sampled_audit', 'human_review')),
  constraint card_claim_links_review_status_check
    check (review_status in ('auto_approved', 'needs_review', 'approved', 'rejected', 'superseded')),
  constraint card_claim_links_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint card_claim_links_locator_check
    check (char_length(evidence_locator) between 1 and 200 and evidence_locator !~ '<[^>]+>'),
  constraint card_claim_links_hashes_check
    check (array_to_string(evidence_hashes, '') ~ '^([0-9a-f]{64})*$'),
  constraint card_claim_links_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create unique index if not exists card_claim_links_active_uidx
  on public.card_claim_links (canonical_card_id, claim_id)
  where is_active;
create index if not exists card_claim_links_claim_idx
  on public.card_claim_links (claim_id, is_active);
create index if not exists card_claim_links_card_version_idx
  on public.card_claim_links (canonical_card_version_id, is_active);

create table if not exists public.question_claim_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  native_question_id text not null,
  external_question_id uuid null references public.external_questions(id) on delete restrict,
  claim_id uuid not null references public.educational_claims(id) on delete restrict,
  claim_version_id uuid not null references public.educational_claim_versions(id) on delete restrict,
  mapping_role text not null,
  confidence numeric(4,3) not null,
  approval_method text not null,
  review_status text not null,
  algorithm_version text not null,
  evidence_locator text not null,
  source_fingerprint_hash text null,
  evidence_hashes text[] not null default '{}'::text[],
  reason_codes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_claim_links_provider_check check (provider in ('orthobullets', 'rock_himalaya')),
  constraint question_claim_links_native_id_check check (native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint question_claim_links_role_check check (mapping_role in ('tests_primary', 'tests_secondary')),
  constraint question_claim_links_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint question_claim_links_approval_check
    check (approval_method in ('machine_consensus', 'sampled_audit', 'human_review')),
  constraint question_claim_links_review_status_check
    check (review_status in ('auto_approved', 'needs_review', 'approved', 'rejected', 'superseded')),
  constraint question_claim_links_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint question_claim_links_locator_check
    check (char_length(evidence_locator) between 1 and 200 and evidence_locator !~ '<[^>]+>'),
  constraint question_claim_links_source_hash_check
    check (source_fingerprint_hash is null or source_fingerprint_hash ~ '^[0-9a-f]{64}$'),
  constraint question_claim_links_hashes_check
    check (array_to_string(evidence_hashes, '') ~ '^([0-9a-f]{64})*$'),
  constraint question_claim_links_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create unique index if not exists question_claim_links_active_uidx
  on public.question_claim_links (provider, native_question_id, claim_id)
  where is_active;
create index if not exists question_claim_links_claim_idx
  on public.question_claim_links (claim_id, is_active);
create index if not exists question_claim_links_native_idx
  on public.question_claim_links (provider, native_question_id, is_active);

create table if not exists public.educational_claim_gaps (
  id uuid primary key default gen_random_uuid(),
  gap_class text not null,
  owner text not null,
  disposition text not null default 'open',
  priority_score integer not null default 0,
  claim_id uuid null references public.educational_claims(id) on delete restrict,
  claim_version_id uuid null references public.educational_claim_versions(id) on delete restrict,
  canonical_card_id uuid null references public.canonical_cards(id) on delete restrict,
  provider text null,
  native_question_id text null,
  algorithm_version text not null,
  reason_codes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educational_claim_gaps_class_check
    check (gap_class in (
      'missing_claim', 'missing_card', 'weak_card', 'mapping_gap',
      'source_extraction_gap', 'retrieval_gap'
    )),
  constraint educational_claim_gaps_owner_check
    check (owner in ('kg', 'editorial', 'mapping', 'extension', 'ranking')),
  constraint educational_claim_gaps_disposition_check
    check (disposition in ('open', 'assigned', 'resolved', 'wontfix', 'duplicate')),
  constraint educational_claim_gaps_priority_check check (priority_score between 0 and 100),
  constraint educational_claim_gaps_provider_check
    check (provider is null or provider in ('orthobullets', 'rock_himalaya')),
  constraint educational_claim_gaps_native_id_check
    check (native_question_id is null or native_question_id ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint educational_claim_gaps_algorithm_check check (algorithm_version ~ '^[A-Za-z0-9._:-]{1,80}$'),
  constraint educational_claim_gaps_safe_metadata_check check (public.educational_metadata_is_safe(metadata))
);

create unique index if not exists educational_claim_gaps_active_claim_uidx
  on public.educational_claim_gaps (claim_id, gap_class)
  where is_active and claim_id is not null;
create unique index if not exists educational_claim_gaps_active_source_uidx
  on public.educational_claim_gaps (provider, native_question_id, gap_class)
  where is_active and claim_id is null and provider is not null and native_question_id is not null;
create index if not exists educational_claim_gaps_class_idx
  on public.educational_claim_gaps (gap_class, disposition, is_active);

create or replace function public.validate_educational_claim_link_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_record record;
begin
  if tg_table_name = 'card_claim_links' then
    select c.id as card_id, v.canonical_card_id as version_card_id, cv.claim_id as version_claim_id
      into linked_record
    from public.canonical_cards c
    join public.canonical_card_versions v on v.id = new.canonical_card_version_id
    join public.educational_claim_versions cv on cv.id = new.claim_version_id
    where c.id = new.canonical_card_id and c.is_active;
    if not found
      or linked_record.version_card_id is distinct from new.canonical_card_id
      or linked_record.version_claim_id is distinct from new.claim_id then
      raise exception 'card_claim_link card/claim version does not match parent identities';
    end if;
  elsif tg_table_name = 'question_claim_links' then
    select cv.claim_id as version_claim_id, q.external_question_id as native_id
      into linked_record
    from public.educational_claim_versions cv
    left join public.external_questions q on q.id = new.external_question_id
    where cv.id = new.claim_version_id;
    if not found or linked_record.version_claim_id is distinct from new.claim_id then
      raise exception 'question_claim_link claim version does not match claim_id';
    end if;
    if new.external_question_id is not null and linked_record.native_id is null then
      raise exception 'question_claim_link external_question_id does not resolve';
    end if;
  elsif tg_table_name = 'educational_claim_gaps' then
    if new.gap_class in ('missing_card', 'weak_card', 'mapping_gap') and new.claim_id is null then
      raise exception 'coverage gaps require a claim_id';
    end if;
    if new.gap_class = 'weak_card' and new.canonical_card_id is null then
      raise exception 'weak_card gaps require a canonical_card_id';
    end if;
    if new.claim_version_id is not null then
      perform 1 from public.educational_claim_versions cv
        where cv.id = new.claim_version_id and cv.claim_id = new.claim_id;
      if not found then
        raise exception 'gap claim_version_id does not match claim_id';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_card_claim_link_reference on public.card_claim_links;
create trigger validate_card_claim_link_reference
  before insert or update on public.card_claim_links
  for each row execute function public.validate_educational_claim_link_references();

drop trigger if exists validate_question_claim_link_reference on public.question_claim_links;
create trigger validate_question_claim_link_reference
  before insert or update on public.question_claim_links
  for each row execute function public.validate_educational_claim_link_references();

drop trigger if exists validate_educational_claim_gap_reference on public.educational_claim_gaps;
create trigger validate_educational_claim_gap_reference
  before insert or update on public.educational_claim_gaps
  for each row execute function public.validate_educational_claim_link_references();

drop trigger if exists set_card_claim_links_updated_at on public.card_claim_links;
create trigger set_card_claim_links_updated_at
  before update on public.card_claim_links
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_question_claim_links_updated_at on public.question_claim_links;
create trigger set_question_claim_links_updated_at
  before update on public.question_claim_links
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_educational_claim_gaps_updated_at on public.educational_claim_gaps;
create trigger set_educational_claim_gaps_updated_at
  before update on public.educational_claim_gaps
  for each row execute function public.tg_set_updated_at();

create or replace function public.mark_card_claim_links_stale()
returns trigger
language plpgsql
as $$
begin
  if new.current_version_id is distinct from old.current_version_id then
    update public.card_claim_links
      set is_active = false, review_status = 'superseded', updated_at = now()
      where canonical_card_id = new.id
        and is_active
        and canonical_card_version_id is distinct from new.current_version_id;
  end if;
  return new;
end;
$$;

drop trigger if exists mark_card_claim_links_stale on public.canonical_cards;
create trigger mark_card_claim_links_stale
  after update of current_version_id on public.canonical_cards
  for each row execute function public.mark_card_claim_links_stale();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'educational_claims',
    'educational_claim_versions',
    'card_claim_links',
    'question_claim_links',
    'educational_claim_gaps'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_service_role_all',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      table_name || '_service_role_all',
      table_name
    );
  end loop;
end $$;

comment on table public.educational_claims is
  'Atomic SnapOrtho-authored clinical claims. Fingerprint is the merge key; current_version_id pins the immutable snapshot.';
comment on table public.educational_claim_versions is
  'Immutable claim snapshots. A fingerprint change inserts a new version; rows are never updated.';
comment on table public.card_claim_links is
  'Version-pinned card teaches-claim links. Auto-approved machine consensus is first-class; no learner writes.';
comment on table public.question_claim_links is
  'Provider-native question tests-claim links. Stores IDs and hashes, never stems or explanations.';
comment on table public.educational_claim_gaps is
  'Owned coverage gaps for tested claims. A gap is missing adequate teaching, not a retrieval miss.';
comment on function public.educational_claim_fingerprint_hash(text, uuid, text, text, jsonb) is
  'Stable SHA-256 of type, entity, predicate, object, and sorted qualifiers. Matching TypeScript lives in clinical-claim-v1.';

commit;
