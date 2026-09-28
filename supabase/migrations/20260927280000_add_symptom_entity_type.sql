-- Phase 3C Step 4: add the `symptom` entity type (patient-reported
-- phenomena: pain, numbness, weakness, stiffness, swelling, paresthesia).
--
-- Smallest additive change: extend the existing CHECK constraint following
-- the 20260628_150000 / 20260705_120000 pattern. No backfill: no live rows
-- use the new value yet, and symptom promotions enter only via reviewed
-- decisions. Examiner-observed findings are intentionally NOT covered here
-- (clinical_sign ruling deferred post-foundation); radiographic findings
-- keep using imaging_finding.

alter table public.canonical_entities
  drop constraint if exists canonical_entities_type_check;
alter table public.canonical_entities
  add constraint canonical_entities_type_check
  check (
    entity_type in (
      'condition',
      'procedure',
      'anatomy_structure',
      'classification_system',
      'classification_grade',
      'complication',
      'diagnostic_test',
      'imaging_finding',
      'implant',
      'fixation_method',
      'treatment_principle',
      'biomechanics_concept',
      'exam_maneuver',
      'surgical_approach',
      'surgical_positioning',
      'symptom'
    )
  );
