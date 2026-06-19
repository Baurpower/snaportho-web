-- ============================================================================
-- BroBot Read Next MVP
-- Curated external learning resources and analytics for on-demand reading cards.
-- ============================================================================

create table if not exists public.brobot_reading_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  resource_type text not null,
  source_name text not null,
  journal text null,
  year integer null,
  url text not null,
  doi text null,
  pubmed_id text null,
  abstract_summary text null,
  why_it_matters text not null,
  tags text[] not null default '{}',
  modes text[] not null default '{}',
  procedure_categories text[] not null default '{}',
  training_level_min text null,
  training_level_max text null,
  educational_yield numeric not null default 50,
  landmark_score numeric not null default 0,
  board_relevance numeric not null default 0,
  clinical_relevance numeric not null default 0,
  technique_relevance numeric not null default 0,
  evidence_level text null,
  access text not null default 'unknown',
  editorial_status text not null default 'draft',
  last_verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brobot_reading_resources_type_check
    check (resource_type in (
      'landmark_paper',
      'review_article',
      'guideline',
      'society_resource',
      'technique_article',
      'visual_resource',
      'textbook_reference',
      'systematic_review',
      'trial',
      'educational_website'
    )),
  constraint brobot_reading_resources_access_check
    check (access in ('free', 'abstract_only', 'paywalled', 'unknown')),
  constraint brobot_reading_resources_editorial_status_check
    check (editorial_status in ('draft', 'verified', 'retired')),
  constraint brobot_reading_resources_yield_check
    check (educational_yield >= 0 and educational_yield <= 100),
  constraint brobot_reading_resources_landmark_check
    check (landmark_score >= 0 and landmark_score <= 100),
  constraint brobot_reading_resources_board_check
    check (board_relevance >= 0 and board_relevance <= 100),
  constraint brobot_reading_resources_clinical_check
    check (clinical_relevance >= 0 and clinical_relevance <= 100),
  constraint brobot_reading_resources_technique_check
    check (technique_relevance >= 0 and technique_relevance <= 100),
  constraint brobot_reading_resources_url_unique unique (url)
);

create unique index if not exists brobot_reading_resources_lower_url_unique_idx
  on public.brobot_reading_resources (lower(url));

create index if not exists brobot_reading_resources_verified_modes_idx
  on public.brobot_reading_resources using gin (modes)
  where editorial_status = 'verified';

create index if not exists brobot_reading_resources_verified_tags_idx
  on public.brobot_reading_resources using gin (tags)
  where editorial_status = 'verified';

create index if not exists brobot_reading_resources_verified_rank_idx
  on public.brobot_reading_resources (
    editorial_status,
    educational_yield desc,
    board_relevance desc,
    technique_relevance desc,
    clinical_relevance desc
  );

create table if not exists public.brobot_reading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid null references public.brobot_conversations(id) on delete set null,
  source_message_id uuid null references public.brobot_messages(id) on delete set null,
  resource_id uuid null references public.brobot_reading_resources(id) on delete set null,
  event_type text not null,
  rank_position integer null,
  rank_score numeric null,
  mode text null,
  training_level text null,
  topic text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint brobot_reading_events_type_check
    check (event_type in (
      'panel_open',
      'impression',
      'click',
      'feedback_helpful',
      'feedback_not_helpful'
    )),
  constraint brobot_reading_events_rank_position_check
    check (rank_position is null or rank_position > 0)
);

create index if not exists brobot_reading_events_user_created_at_idx
  on public.brobot_reading_events (user_id, created_at desc);

create index if not exists brobot_reading_events_message_type_idx
  on public.brobot_reading_events (source_message_id, event_type, created_at desc);

create index if not exists brobot_reading_events_resource_type_idx
  on public.brobot_reading_events (resource_id, event_type, created_at desc);

create index if not exists brobot_reading_events_mode_level_type_idx
  on public.brobot_reading_events (mode, training_level, event_type, created_at desc);

create or replace function public.set_brobot_reading_resources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_brobot_reading_resources_updated_at
  on public.brobot_reading_resources;

create trigger set_brobot_reading_resources_updated_at
  before update on public.brobot_reading_resources
  for each row
  execute function public.set_brobot_reading_resources_updated_at();

alter table public.brobot_reading_resources enable row level security;
alter table public.brobot_reading_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_reading_resources'
      and policyname = 'Authenticated users can read verified reading resources'
  ) then
    create policy "Authenticated users can read verified reading resources"
      on public.brobot_reading_resources
      for select
      using (auth.role() = 'authenticated' and editorial_status = 'verified');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_reading_events'
      and policyname = 'Users can insert their own reading events'
  ) then
    create policy "Users can insert their own reading events"
      on public.brobot_reading_events
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brobot_reading_events'
      and policyname = 'Users can view their own reading events'
  ) then
    create policy "Users can view their own reading events"
      on public.brobot_reading_events
      for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

insert into public.brobot_reading_resources (
  title,
  resource_type,
  source_name,
  journal,
  year,
  url,
  why_it_matters,
  tags,
  modes,
  procedure_categories,
  training_level_min,
  training_level_max,
  educational_yield,
  landmark_score,
  board_relevance,
  clinical_relevance,
  technique_relevance,
  evidence_level,
  access,
  editorial_status,
  last_verified_at
) values
  (
    'Slipped Capital Femoral Epiphysis (SCFE)',
    'educational_website',
    'Orthobullets',
    null,
    null,
    'https://www.orthobullets.com/pediatrics/4040/slipped-capital-femoral-epiphysis-scfe',
    'Fast board-focused review of SCFE presentation, stability, treatment, and complications.',
    array['scfe','slipped_capital_femoral_epiphysis','stable_scfe','unstable_scfe','pediatric_hip','proximal_femoral_physis'],
    array['oite','general'],
    array['pediatric_fracture','general_topic'],
    'med_student',
    'pgy5',
    88,
    35,
    92,
    70,
    25,
    'educational review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Developmental Dysplasia of the Hip (DDH)',
    'educational_website',
    'Orthobullets',
    null,
    null,
    'https://www.orthobullets.com/pediatrics/4118/developmental-dysplasia-of-the-hip-ddh',
    'High-yield framework for DDH exam findings, imaging by age, and treatment thresholds.',
    array['ddh','developmental_dysplasia_hip','pediatric_hip','barlow','ortolani','acetabular_index'],
    array['oite','clinic','general'],
    array['general_topic'],
    'med_student',
    'pgy4',
    84,
    25,
    88,
    72,
    15,
    'educational review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Legg-Calve-Perthes Disease',
    'educational_website',
    'Orthobullets',
    null,
    null,
    'https://www.orthobullets.com/pediatrics/4119/legg-calve-perthes-disease',
    'Concise pediatric hip review for age-based prognosis, staging, and containment concepts.',
    array['perthes','legg_calve_perthes','legg_calve_perthes_disease','pediatric_hip','containment'],
    array['oite','clinic','general'],
    array['general_topic'],
    'med_student',
    'pgy4',
    82,
    25,
    84,
    65,
    10,
    'educational review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Anterior Cruciate Ligament (ACL) Injuries',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/diseases--conditions/anterior-cruciate-ligament-acl-injuries/',
    'Readable anatomy, mechanism, diagnosis, and treatment overview for ACL questions.',
    array['acl','anterior_cruciate_ligament','acl_tear','acl_injury','pivot_shift'],
    array['clinic','oite','general'],
    array['sports_injury','general_topic'],
    'med_student',
    'pgy4',
    78,
    15,
    70,
    80,
    20,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Rotator Cuff Tears',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/diseases--conditions/rotator-cuff-tears/',
    'Practical overview of cuff tear symptoms, imaging, nonoperative care, and surgical indications.',
    array['rotator_cuff','rotator_cuff_tear','cuff_tear','supraspinatus','subacromial_impingement'],
    array['clinic','oite','general'],
    array['sports_injury','general_topic'],
    'med_student',
    'pgy4',
    76,
    10,
    68,
    82,
    25,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Distal Radius Fractures (Broken Wrist)',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/diseases--conditions/distal-radius-fractures-broken-wrist/',
    'Accessible review of distal radius fracture evaluation and treatment options for call and boards.',
    array['distal_radius','distal_radius_fracture','wrist_fracture','volar_tilt','radial_height'],
    array['oite','consult','clinic','general'],
    array['fracture_orif','hand_procedure','general_topic'],
    'med_student',
    'pgy4',
    80,
    15,
    80,
    78,
    35,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Femoral Neck Fractures',
    'educational_website',
    'Orthobullets',
    null,
    null,
    'https://www.orthobullets.com/trauma/1037/femoral-neck-fractures',
    'High-yield adult hip fracture resource for Garden classification, Pauwels pattern, displacement, and treatment decisions.',
    array['femoral_neck_fracture','femoral_neck','hip_fracture','garden_classification','pauwels_classification','displaced_femoral_neck_fracture'],
    array['oite','consult','clinic','or_prep','general'],
    array['fracture_orif'],
    'pgy1',
    'pgy5',
    88,
    35,
    86,
    88,
    65,
    'educational review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Tibial Plateau Fractures',
    'educational_website',
    'Orthobullets',
    null,
    null,
    'https://www.orthobullets.com/trauma/1046/tibial-plateau-fractures',
    'High-yield trauma topic covering classification, imaging, soft-tissue concerns, and fixation concepts.',
    array['tibial_plateau','tibial_plateau_fracture','plateau_fracture','schatzker_classification','split_depression'],
    array['oite','or_prep','consult','general'],
    array['fracture_orif'],
    'pgy1',
    'pgy5',
    88,
    30,
    86,
    82,
    72,
    'educational review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Periprosthetic Joint Infection',
    'review_article',
    'NCBI Bookshelf',
    'StatPearls',
    2026,
    'https://www.ncbi.nlm.nih.gov/books/NBK448131/',
    'Useful clinical framework for PJI definitions, workup, organisms, and treatment strategies.',
    array['pji','periprosthetic_joint_infection','prosthetic_joint_infection','msis_criteria','arthroplasty_infection'],
    array['consult','clinic','research','general'],
    array['arthroplasty_consult','infection_consult','arthroplasty'],
    'pgy2',
    'attending',
    82,
    20,
    72,
    90,
    25,
    'review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Cervical Myelopathy',
    'educational_website',
    'Orthobullets',
    null,
    null,
    'https://www.orthobullets.com/spine/2031/cervical-myelopathy',
    'Board-relevant spine framework for symptoms, exam findings, imaging, and treatment indications.',
    array['cervical_myelopathy','degenerative_cervical_myelopathy','myelopathy','hoffmann_sign','gait_imbalance'],
    array['oite','clinic','consult','general'],
    array['spine_procedure','general_topic'],
    'pgy1',
    'pgy5',
    84,
    25,
    86,
    78,
    20,
    'educational review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Septic Arthritis',
    'review_article',
    'NCBI Bookshelf',
    'StatPearls',
    2026,
    'https://www.ncbi.nlm.nih.gov/books/NBK538176/',
    'Concise emergency workup and treatment reference for suspected septic joint consults.',
    array['septic_arthritis','septic_joint','joint_aspiration','synovial_wbc','native_joint_infection'],
    array['consult','clinic','general'],
    array['infection_consult'],
    'med_student',
    'pgy5',
    86,
    20,
    72,
    94,
    15,
    'review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Acute Compartment Syndrome',
    'review_article',
    'NCBI Bookshelf',
    'StatPearls',
    2026,
    'https://www.ncbi.nlm.nih.gov/books/NBK448124/',
    'High-stakes consult reference for serial exams, pressure thresholds, and fasciotomy timing.',
    array['compartment_syndrome','acute_compartment_syndrome','fasciotomy','compartment_pressure','pain_with_passive_stretch'],
    array['consult','oite','general'],
    array['fracture_orif','general_topic'],
    'med_student',
    'pgy5',
    90,
    25,
    82,
    96,
    40,
    'review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Open Fractures',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/diseases--conditions/open-fractures/',
    'Accessible overview of open fracture urgency, contamination, infection risk, and treatment principles.',
    array['open_fracture','gustilo_anderson','antibiotics_open_fracture','irrigation_debridement'],
    array['consult','oite','general'],
    array['fracture_orif'],
    'med_student',
    'pgy4',
    80,
    20,
    76,
    88,
    35,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Open Fracture Management',
    'review_article',
    'NCBI Bookshelf',
    'StatPearls',
    2026,
    'https://www.ncbi.nlm.nih.gov/books/NBK448083/',
    'More detailed clinical reference for antibiotics, debridement principles, and early management.',
    array['open_fracture','open_fracture_management','gustilo_anderson','antibiotics_open_fracture','irrigation_debridement'],
    array['consult','or_prep','general'],
    array['fracture_orif'],
    'pgy1',
    'pgy5',
    82,
    20,
    75,
    90,
    45,
    'review',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Total Knee Replacement',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/treatment/total-knee-replacement/',
    'Clear arthroplasty overview for indications, surgical phases, risks, and patient-facing concepts.',
    array['total_knee_arthroplasty','tka','knee_replacement','tka_balancing','tka_bone_cuts'],
    array['or_prep','clinic','general'],
    array['arthroplasty'],
    'med_student',
    'pgy3',
    72,
    10,
    45,
    70,
    62,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Total Hip Replacement',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/treatment/total-hip-replacement/',
    'Readable arthroplasty reference for THA indications, procedure flow, risks, and recovery concepts.',
    array['total_hip_arthroplasty','tha','hip_replacement','acetabular_component','femoral_stem'],
    array['or_prep','clinic','general'],
    array['arthroplasty'],
    'med_student',
    'pgy3',
    72,
    10,
    45,
    70,
    62,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  ),
  (
    'Shoulder Joint Replacement',
    'society_resource',
    'AAOS OrthoInfo',
    null,
    null,
    'https://orthoinfo.aaos.org/en/treatment/shoulder-joint-replacement/',
    'Useful overview for shoulder arthroplasty indications, implants at a high level, and complications.',
    array['shoulder_arthroplasty','reverse_tsa','tsa','glenoid_component','rotator_cuff_arthropathy'],
    array['or_prep','clinic','general'],
    array['arthroplasty'],
    'med_student',
    'pgy3',
    72,
    10,
    45,
    70,
    60,
    'society educational resource',
    'free',
    'verified',
    '2026-06-18'
  )
on conflict (url) do update
set
  title = excluded.title,
  resource_type = excluded.resource_type,
  source_name = excluded.source_name,
  journal = excluded.journal,
  year = excluded.year,
  why_it_matters = excluded.why_it_matters,
  tags = excluded.tags,
  modes = excluded.modes,
  procedure_categories = excluded.procedure_categories,
  training_level_min = excluded.training_level_min,
  training_level_max = excluded.training_level_max,
  educational_yield = excluded.educational_yield,
  landmark_score = excluded.landmark_score,
  board_relevance = excluded.board_relevance,
  clinical_relevance = excluded.clinical_relevance,
  technique_relevance = excluded.technique_relevance,
  evidence_level = excluded.evidence_level,
  access = excluded.access,
  editorial_status = excluded.editorial_status,
  last_verified_at = excluded.last_verified_at;

comment on table public.brobot_reading_resources is
  'Verified external resources used by BroBot Read Next recommendations.';
comment on table public.brobot_reading_events is
  'Panel opens, impressions, and clicks for BroBot Read Next recommendations.';

notify pgrst, 'reload schema';
