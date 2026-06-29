-- ============================================================================
-- Educational ontology foundation seed
-- Minimal proof-of-concept data for Phase 1 validation.
-- ============================================================================

insert into public.specialties (slug, name, description, comments)
values
  ('trauma', 'Trauma', 'Orthopaedic trauma curriculum.', 'Seeded Phase 1 specialty.'),
  ('spine', 'Spine', 'Spine curriculum.', 'Seeded Phase 1 specialty.'),
  ('shoulder-elbow', 'Shoulder & Elbow', 'Shoulder and elbow curriculum.', 'Seeded Phase 1 specialty.'),
  ('knee-sports', 'Knee & Sports', 'Knee and sports curriculum.', 'Seeded Phase 1 specialty.'),
  ('pediatrics', 'Pediatrics', 'Pediatric orthopaedics curriculum.', 'Seeded Phase 1 specialty.'),
  ('recon', 'Recon', 'Adult reconstruction curriculum.', 'Seeded Phase 1 specialty.'),
  ('hand', 'Hand', 'Hand surgery curriculum.', 'Seeded Phase 1 specialty.'),
  ('foot-ankle', 'Foot & Ankle', 'Foot and ankle curriculum.', 'Seeded Phase 1 specialty.'),
  ('pathology', 'Pathology', 'Orthopaedic pathology curriculum.', 'Seeded Phase 1 specialty.'),
  ('basic-science', 'Basic Science', 'Basic science curriculum.', 'Seeded Phase 1 specialty.'),
  ('anatomy', 'Anatomy', 'Orthopaedic anatomy curriculum.', 'Seeded Phase 1 specialty.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  comments = excluded.comments,
  is_active = true,
  updated_at = now();

insert into public.external_sources (slug, name, source_type, description, comments)
values
  ('orthobullets', 'Orthobullets', 'qbank', 'Publicly visible orthopaedic education platform and metadata source.', 'Metadata-only mappings; do not store protected question content.'),
  ('rock', 'ROCK', 'qbank', 'ROCK question mapping source.', 'Canonical ontology must remain source-agnostic.'),
  ('snaportho-anki', 'SnapOrtho Anki', 'flashcard_deck', 'Existing SnapOrtho-affiliated Anki deck.', 'Preserve Anki GUIDs in later phases.'),
  ('brobot', 'BroBot', 'chatbot', 'SnapOrtho educational chatbot content source.', 'Will later attach generated and reviewed educational resources.'),
  ('caseprep', 'CasePrep', 'module', 'SnapOrtho case-based learning modules.', 'Future CasePrep modules map to concepts.'),
  ('ao', 'AO', 'reference', 'AO educational reference content.', 'Reference mapping only in later phases.'),
  ('miller', 'Miller', 'textbook', 'Miller orthopaedic textbook reference.', 'Reference mapping only in later phases.'),
  ('campbell', 'Campbell', 'textbook', 'Campbell operative orthopaedics reference.', 'Reference mapping only in later phases.'),
  ('aaos', 'AAOS', 'guideline', 'AAOS educational and guideline references.', 'Reference mapping only in later phases.'),
  ('jbjs', 'JBJS', 'journal', 'Journal of Bone and Joint Surgery reference source.', 'Reference mapping only in later phases.')
on conflict (slug) do update
set
  name = excluded.name,
  source_type = excluded.source_type,
  description = excluded.description,
  comments = excluded.comments,
  is_active = true,
  updated_at = now();

insert into public.tags (namespace, slug, label, description, comments)
values
  ('Specialty', 'trauma', 'Specialty::Trauma', 'Orthopaedic trauma domain.', 'Seed example namespace.'),
  ('Region', 'hip', 'Region::Hip', 'Hip region tag.', 'Seed example namespace.'),
  ('Topic', 'intertrochanteric_fracture', 'Topic::Intertrochanteric_Fracture', 'Intertrochanteric fracture topic tag.', 'Seed example namespace.'),
  ('Concept', 'tip_apex_distance', 'Concept::Tip_Apex_Distance', 'Tip Apex Distance concept tag.', 'Seed example namespace.'),
  ('Source', 'orthobullets', 'Source::Orthobullets', 'Orthobullets source tag.', 'Seed example namespace.'),
  ('Exam', 'oite', 'Exam::OITE', 'OITE-aligned content.', 'Seed example namespace.'),
  ('Level', 'pgy1', 'Level::PGY1', 'PGY1 learner level tag.', 'Seed example namespace.'),
  ('ContentType', 'classification', 'ContentType::Classification', 'Classification-oriented content.', 'Seed example namespace.'),
  ('ContentType', 'treatment', 'ContentType::Treatment', 'Treatment-oriented content.', 'Seed example namespace.'),
  ('ContentType', 'complication', 'ContentType::Complication', 'Complication-oriented content.', 'Seed example namespace.'),
  ('Status', 'needs_review', 'Status::NeedsReview', 'Editorial review still needed.', 'Seed example namespace.')
on conflict (namespace, slug) do update
set
  label = excluded.label,
  description = excluded.description,
  comments = excluded.comments,
  is_active = true,
  updated_at = now();

with trauma as (
  select id from public.specialties where slug = 'trauma'
),
trauma_node as (
  insert into public.curriculum_nodes (
    parent_id,
    specialty_id,
    node_type,
    slug,
    title,
    short_label,
    description,
    comments,
    sort_order
  )
  select
    null,
    trauma.id,
    'specialty',
    'trauma',
    'Trauma',
    'Trauma',
    'Canonical trauma root for SnapOrtho.',
    'Proof-of-concept root node.',
    0
  from trauma
  on conflict (slug) do update
  set
    specialty_id = excluded.specialty_id,
    title = excluded.title,
    short_label = excluded.short_label,
    description = excluded.description,
    comments = excluded.comments,
    updated_at = now()
  returning id
),
hip_node as (
  insert into public.curriculum_nodes (
    parent_id,
    specialty_id,
    node_type,
    slug,
    title,
    short_label,
    description,
    comments,
    sort_order
  )
  select
    trauma_node.id,
    trauma.id,
    'region',
    'trauma-hip',
    'Hip',
    'Hip',
    'Hip region within trauma.',
    'Proof-of-concept region node.',
    10
  from trauma, trauma_node
  on conflict (slug) do update
  set
    parent_id = excluded.parent_id,
    specialty_id = excluded.specialty_id,
    title = excluded.title,
    short_label = excluded.short_label,
    description = excluded.description,
    comments = excluded.comments,
    updated_at = now()
  returning id
),
topic_node as (
  insert into public.curriculum_nodes (
    parent_id,
    specialty_id,
    node_type,
    slug,
    title,
    short_label,
    description,
    comments,
    sort_order
  )
  select
    hip_node.id,
    trauma.id,
    'topic',
    'trauma-hip-intertrochanteric-fracture',
    'Intertrochanteric Fracture',
    'Intertroch Fracture',
    'Canonical topic for intertrochanteric hip fractures.',
    'Proof-of-concept topic node for Phase 1.',
    20
  from trauma, hip_node
  on conflict (slug) do update
  set
    parent_id = excluded.parent_id,
    specialty_id = excluded.specialty_id,
    title = excluded.title,
    short_label = excluded.short_label,
    description = excluded.description,
    comments = excluded.comments,
    updated_at = now()
  returning id
),
objective_rows as (
  insert into public.learning_objectives (
    curriculum_node_id,
    slug,
    objective_text,
    objective_kind,
    sort_order,
    comments
  )
  select topic_node.id, 'classify-intertrochanteric-fracture-stability', 'Classify fracture stability', 'classification', 10, 'Proof-of-concept learning objective.'
  from topic_node
  union all
  select topic_node.id, 'select-operative-fixation-for-intertrochanteric-fracture', 'Choose operative fixation', 'management', 20, 'Proof-of-concept learning objective.'
  from topic_node
  union all
  select topic_node.id, 'recognize-intertrochanteric-fracture-complications', 'Recognize complications', 'complication', 30, 'Proof-of-concept learning objective.'
  from topic_node
  on conflict (slug) do update
  set
    curriculum_node_id = excluded.curriculum_node_id,
    objective_text = excluded.objective_text,
    objective_kind = excluded.objective_kind,
    sort_order = excluded.sort_order,
    comments = excluded.comments,
    updated_at = now()
  returning id, slug
),
concept_rows as (
  insert into public.concepts (
    curriculum_node_id,
    primary_learning_objective_id,
    slug,
    canonical_name,
    concept_type,
    description,
    comments
  )
  select
    topic_node.id,
    (select id from objective_rows where slug = 'select-operative-fixation-for-intertrochanteric-fracture'),
    'trauma-hip-intertrochanteric-fracture-tip-apex-distance',
    'Tip Apex Distance',
    'diagnostic_rule',
    'Fixation quality concept relevant to cephalomedullary fixation decisions.',
    'Atomic concept for later card and question mapping.'
  from topic_node
  union all
  select
    topic_node.id,
    (select id from objective_rows where slug = 'classify-intertrochanteric-fracture-stability'),
    'trauma-hip-intertrochanteric-fracture-reverse-obliquity',
    'Reverse Obliquity',
    'classification',
    'Pattern concept that affects stability and implant choice.',
    'Atomic concept for later card and question mapping.'
  from topic_node
  union all
  select
    topic_node.id,
    (select id from objective_rows where slug = 'select-operative-fixation-for-intertrochanteric-fracture'),
    'trauma-hip-intertrochanteric-fracture-cephalomedullary-nail-indications',
    'Cephalomedullary Nail Indications',
    'indication',
    'Indications concept for choosing cephalomedullary fixation.',
    'Atomic concept for later card and question mapping.'
  from topic_node
  on conflict (slug) do update
  set
    curriculum_node_id = excluded.curriculum_node_id,
    primary_learning_objective_id = excluded.primary_learning_objective_id,
    canonical_name = excluded.canonical_name,
    concept_type = excluded.concept_type,
    description = excluded.description,
    comments = excluded.comments,
    updated_at = now()
  returning id, slug
)
insert into public.concept_aliases (concept_id, alias_name, alias_type, is_preferred, comments)
select
  concept_rows.id,
  alias_name,
  alias_type,
  is_preferred,
  comments
from concept_rows
join (
  values
    ('trauma-hip-intertrochanteric-fracture-tip-apex-distance', 'TAD', 'abbreviation', false, 'Common abbreviation.'),
    ('trauma-hip-intertrochanteric-fracture-tip-apex-distance', 'Tip-Apex Distance', 'spelling_variant', true, 'Common punctuation variant.'),
    ('trauma-hip-intertrochanteric-fracture-reverse-obliquity', 'Reverse obliquity pattern', 'synonym', true, 'Common variant label.'),
    ('trauma-hip-intertrochanteric-fracture-cephalomedullary-nail-indications', 'CMN indications', 'abbreviation', false, 'Common abbreviation.')
) as aliases(concept_slug, alias_name, alias_type, is_preferred, comments)
  on aliases.concept_slug = concept_rows.slug
on conflict do nothing;

insert into public.source_aliases (
  source_id,
  entity_type,
  entity_id,
  alias_kind,
  alias_value,
  external_id,
  metadata,
  comments
)
select
  es.id,
  'curriculum_node',
  cn.id,
  'source_topic_id',
  'Intertrochanteric Fractures',
  '1038',
  jsonb_build_object(
    'public_url',
    'https://www.orthobullets.com/trauma/1038/intertrochanteric-fractures'
  ),
  'Metadata-only source alias for public Orthobullets topic.'
from public.external_sources es
join public.curriculum_nodes cn
  on cn.slug = 'trauma-hip-intertrochanteric-fracture'
where es.slug = 'orthobullets'
on conflict do nothing;

insert into public.tag_assignments (
  tag_id,
  entity_type,
  entity_id,
  assigned_by_source,
  comments
)
select
  t.id,
  'curriculum_node',
  cn.id,
  'seed',
  'Proof-of-concept tag assignment.'
from public.tags t
join public.curriculum_nodes cn
  on cn.slug = 'trauma-hip-intertrochanteric-fracture'
where (t.namespace, t.slug) in (
  ('Specialty', 'trauma'),
  ('Region', 'hip'),
  ('Topic', 'intertrochanteric_fracture'),
  ('Exam', 'oite'),
  ('ContentType', 'treatment')
)
on conflict do nothing;
