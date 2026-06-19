-- ============================================================================
-- BroBot Read Next relevance hardening
-- Tightens seed tags so broad anatomy/category tags cannot drive matches and
-- adds a specific femoral-neck resource for the known false-positive topic.
-- ============================================================================

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
  )
on conflict (url) do update
set
  title = excluded.title,
  resource_type = excluded.resource_type,
  source_name = excluded.source_name,
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

update public.brobot_reading_resources
set tags = case url
  when 'https://www.orthobullets.com/pediatrics/4040/slipped-capital-femoral-epiphysis-scfe'
    then array['scfe','slipped_capital_femoral_epiphysis','stable_scfe','unstable_scfe','pediatric_hip','proximal_femoral_physis']
  when 'https://www.orthobullets.com/pediatrics/4118/developmental-dysplasia-of-the-hip-ddh'
    then array['ddh','developmental_dysplasia_hip','pediatric_hip','barlow','ortolani','acetabular_index']
  when 'https://www.orthobullets.com/pediatrics/4119/legg-calve-perthes-disease'
    then array['perthes','legg_calve_perthes','legg_calve_perthes_disease','pediatric_hip','containment']
  when 'https://orthoinfo.aaos.org/en/diseases--conditions/anterior-cruciate-ligament-acl-injuries/'
    then array['acl','anterior_cruciate_ligament','acl_tear','acl_injury','pivot_shift']
  when 'https://orthoinfo.aaos.org/en/diseases--conditions/rotator-cuff-tears/'
    then array['rotator_cuff','rotator_cuff_tear','cuff_tear','supraspinatus','subacromial_impingement']
  when 'https://orthoinfo.aaos.org/en/diseases--conditions/distal-radius-fractures-broken-wrist/'
    then array['distal_radius','distal_radius_fracture','wrist_fracture','volar_tilt','radial_height']
  when 'https://www.orthobullets.com/trauma/1046/tibial-plateau-fractures'
    then array['tibial_plateau','tibial_plateau_fracture','plateau_fracture','schatzker_classification','split_depression']
  when 'https://www.ncbi.nlm.nih.gov/books/NBK448131/'
    then array['pji','periprosthetic_joint_infection','prosthetic_joint_infection','msis_criteria','arthroplasty_infection']
  when 'https://www.orthobullets.com/spine/2031/cervical-myelopathy'
    then array['cervical_myelopathy','degenerative_cervical_myelopathy','myelopathy','hoffmann_sign','gait_imbalance']
  when 'https://www.ncbi.nlm.nih.gov/books/NBK538176/'
    then array['septic_arthritis','septic_joint','joint_aspiration','synovial_wbc','native_joint_infection']
  when 'https://www.ncbi.nlm.nih.gov/books/NBK448124/'
    then array['compartment_syndrome','acute_compartment_syndrome','fasciotomy','compartment_pressure','pain_with_passive_stretch']
  when 'https://orthoinfo.aaos.org/en/diseases--conditions/open-fractures/'
    then array['open_fracture','gustilo_anderson','antibiotics_open_fracture','irrigation_debridement']
  when 'https://www.ncbi.nlm.nih.gov/books/NBK448083/'
    then array['open_fracture','open_fracture_management','gustilo_anderson','antibiotics_open_fracture','irrigation_debridement']
  when 'https://orthoinfo.aaos.org/en/treatment/total-knee-replacement/'
    then array['total_knee_arthroplasty','tka','knee_replacement','tka_balancing','tka_bone_cuts']
  when 'https://orthoinfo.aaos.org/en/treatment/total-hip-replacement/'
    then array['total_hip_arthroplasty','tha','hip_replacement','acetabular_component','femoral_stem']
  when 'https://orthoinfo.aaos.org/en/treatment/shoulder-joint-replacement/'
    then array['shoulder_arthroplasty','reverse_tsa','tsa','glenoid_component','rotator_cuff_arthropathy']
  else tags
end
where url in (
  'https://www.orthobullets.com/pediatrics/4040/slipped-capital-femoral-epiphysis-scfe',
  'https://www.orthobullets.com/pediatrics/4118/developmental-dysplasia-of-the-hip-ddh',
  'https://www.orthobullets.com/pediatrics/4119/legg-calve-perthes-disease',
  'https://orthoinfo.aaos.org/en/diseases--conditions/anterior-cruciate-ligament-acl-injuries/',
  'https://orthoinfo.aaos.org/en/diseases--conditions/rotator-cuff-tears/',
  'https://orthoinfo.aaos.org/en/diseases--conditions/distal-radius-fractures-broken-wrist/',
  'https://www.orthobullets.com/trauma/1046/tibial-plateau-fractures',
  'https://www.ncbi.nlm.nih.gov/books/NBK448131/',
  'https://www.orthobullets.com/spine/2031/cervical-myelopathy',
  'https://www.ncbi.nlm.nih.gov/books/NBK538176/',
  'https://www.ncbi.nlm.nih.gov/books/NBK448124/',
  'https://orthoinfo.aaos.org/en/diseases--conditions/open-fractures/',
  'https://www.ncbi.nlm.nih.gov/books/NBK448083/',
  'https://orthoinfo.aaos.org/en/treatment/total-knee-replacement/',
  'https://orthoinfo.aaos.org/en/treatment/total-hip-replacement/',
  'https://orthoinfo.aaos.org/en/treatment/shoulder-joint-replacement/'
);

notify pgrst, 'reload schema';

