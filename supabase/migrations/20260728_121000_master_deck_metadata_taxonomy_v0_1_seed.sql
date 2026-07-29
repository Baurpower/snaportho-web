-- Minimum frozen taxonomy required by the metadata pipeline runner.
-- Clinical anatomy, diagnosis, and treatment targets remain canonical_entities.
-- This seed is idempotent and intentionally does not activate or publish anything.

begin;

insert into public.metadata_taxonomy_versions (
  version, lifecycle_status, definition_checksum, frozen_at, safe_metadata
)
values (
  '0.1.0',
  'draft',
  encode(digest(
    'snaportho-metadata-taxonomy-v0.1.0|specialty|adult-reconstruction,basic-science,foot-ankle,general-orthopedics,hand-upper-extremity,metabolic-bone,orthopedic-oncology,pediatric-orthopedics,rehabilitation,shoulder-elbow,spine,sports-medicine,trauma',
    'sha256'
  ), 'hex'),
  null,
  '{"seed":"master_deck_metadata_taxonomy_v0_1","clinicalFacetsUseCanonicalEntities":true}'::jsonb
)
on conflict (version) do nothing;

with taxonomy as (
  select id from public.metadata_taxonomy_versions
  where version = '0.1.0' and lifecycle_status = 'draft'
), seed(stable_key, slug, preferred_label, definition) as (
  values
    ('specialty.adult-reconstruction', 'Adult_Reconstruction', 'Adult Reconstruction',
      'Orthopaedic care focused on adult hip and knee reconstruction, including arthroplasty.'),
    ('specialty.basic-science', 'Basic_Science', 'Basic Science',
      'Foundational orthopaedic science, biomechanics, biomaterials, and related principles.'),
    ('specialty.foot-ankle', 'Foot_Ankle', 'Foot and Ankle',
      'Orthopaedic conditions and care of the foot and ankle.'),
    ('specialty.general-orthopedics', 'General_Orthopedics', 'General Orthopedics',
      'General orthopaedic content not more specifically assigned to another specialty.'),
    ('specialty.hand-upper-extremity', 'Hand_Upper_Extremity', 'Hand and Upper Extremity',
      'Orthopaedic conditions and care of the hand, wrist, and upper extremity.'),
    ('specialty.metabolic-bone', 'Metabolic_Bone', 'Metabolic Bone',
      'Metabolic, endocrine, and systemic disorders affecting bone health.'),
    ('specialty.orthopedic-oncology', 'Orthopedic_Oncology', 'Orthopedic Oncology',
      'Musculoskeletal tumors and related oncologic orthopaedic care.'),
    ('specialty.pediatric-orthopedics', 'Pediatric_Orthopedics', 'Pediatric Orthopedics',
      'Orthopaedic conditions and care of infants, children, and adolescents.'),
    ('specialty.rehabilitation', 'Rehabilitation', 'Rehabilitation',
      'Nonoperative rehabilitation, recovery, therapy, and functional restoration.'),
    ('specialty.shoulder-elbow', 'Shoulder_Elbow', 'Shoulder and Elbow',
      'Orthopaedic conditions and care primarily involving the shoulder and elbow.'),
    ('specialty.spine', 'Spine', 'Spine',
      'Orthopaedic conditions and care of the cervical, thoracic, lumbar, and sacral spine.'),
    ('specialty.sports-medicine', 'Sports_Medicine', 'Sports Medicine',
      'Sports-related musculoskeletal injury, prevention, and operative or nonoperative care.'),
    ('specialty.trauma', 'Trauma', 'Trauma',
      'Acute musculoskeletal trauma, fracture care, and management of traumatic injury.')
)
insert into public.metadata_concepts (
  taxonomy_version_id, facet, stable_key, slug, preferred_label, definition,
  external_codes, applicability_rules, is_exportable, lifecycle_status
)
select
  taxonomy.id, 'specialty', seed.stable_key, seed.slug, seed.preferred_label, seed.definition,
  '{}'::jsonb, '{"cardinality":{"primary":1,"secondary":"optional"}}'::jsonb, true, 'active'
from taxonomy cross join seed
on conflict (taxonomy_version_id, stable_key) do nothing;

update public.metadata_taxonomy_versions
set lifecycle_status = 'frozen', frozen_at = now()
where version = '0.1.0' and lifecycle_status = 'draft';

commit;
