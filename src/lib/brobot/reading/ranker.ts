import type {
  BroBotReadingContext,
  BroBotReadingRecommendation,
  BroBotReadingResourceRow,
  RankedBroBotReadingResource,
} from './types';

const TRAINING_LEVEL_ORDER = [
  'med_student',
  'pgy1',
  'pgy2',
  'pgy3',
  'pgy4',
  'pgy5',
  'attending',
];

const BROAD_TAGS = new Set([
  'anatomy',
  'arthroplasty',
  'board',
  'clinic',
  'classification',
  'consult',
  'emergency',
  'fracture',
  'fracture_orif',
  'general',
  'general_topic',
  'hand',
  'hip',
  'imaging',
  'infection',
  'knee',
  'oite',
  'orthopaedics',
  'or_prep',
  'pediatrics',
  'research',
  'shoulder',
  'spine',
  'sports',
  'sports_injury',
  'trauma',
  'workup',
]);

const TOPIC_SYNONYMS: Record<string, string[]> = {
  intertrochanteric_fracture: [
    'intertrochanteric_fracture',
    'intertrochanteric_femur_fracture',
    'pertrochanteric_fracture',
    'trochanteric_fracture',
    'extracapsular_hip_fracture',
    'ao_ota_31_a',
    'cephalomedullary_nail',
    'sliding_hip_screw',
    'reverse_obliquity',
  ],
  intertrochanteric_femur_fracture: [
    'intertrochanteric_fracture',
    'intertrochanteric_femur_fracture',
    'pertrochanteric_fracture',
    'trochanteric_fracture',
    'extracapsular_hip_fracture',
    'ao_ota_31_a',
    'cephalomedullary_nail',
    'sliding_hip_screw',
    'reverse_obliquity',
  ],
  femoral_neck: [
    'femoral_neck',
    'femoral_neck_fracture',
    'neck_of_femur',
    'nof',
    'hip_fracture',
    'garden_classification',
    'pauwels_classification',
    'femoral_neck_stress_fracture',
    'displaced_femoral_neck_fracture',
  ],
  femoral_neck_fracture: [
    'femoral_neck',
    'femoral_neck_fracture',
    'neck_of_femur',
    'nof',
    'hip_fracture',
    'garden_classification',
    'pauwels_classification',
    'femoral_neck_stress_fracture',
    'displaced_femoral_neck_fracture',
  ],
  hip_fracture: [
    'hip_fracture',
    'femoral_neck_fracture',
    'femoral_neck',
    'intertrochanteric_fracture',
  ],
  ddh: [
    'ddh',
    'developmental_dysplasia_hip',
    'developmental_dysplasia_of_the_hip',
    'barlow',
    'ortolani',
    'acetabular_index',
  ],
  developmental_dysplasia_hip: [
    'ddh',
    'developmental_dysplasia_hip',
    'developmental_dysplasia_of_the_hip',
    'barlow',
    'ortolani',
    'acetabular_index',
  ],
  perthes: ['perthes', 'legg_calve_perthes', 'legg_calve_perthes_disease', 'containment'],
  legg_calve_perthes: ['perthes', 'legg_calve_perthes', 'legg_calve_perthes_disease'],
  scfe: ['scfe', 'slipped_capital_femoral_epiphysis', 'stable_scfe', 'unstable_scfe'],
  slipped_capital_femoral_epiphysis: [
    'scfe',
    'slipped_capital_femoral_epiphysis',
    'stable_scfe',
    'unstable_scfe',
  ],
  pji: ['pji', 'prosthetic_joint_infection', 'periprosthetic_joint_infection'],
  prosthetic_joint_infection: ['pji', 'prosthetic_joint_infection', 'periprosthetic_joint_infection'],
  rotator_cuff: ['rotator_cuff', 'rotator_cuff_tear', 'cuff_tear', 'supraspinatus'],
  rotator_cuff_tear: ['rotator_cuff', 'rotator_cuff_tear', 'cuff_tear', 'supraspinatus'],
  acl: ['acl', 'anterior_cruciate_ligament', 'acl_tear', 'acl_injury'],
  anterior_cruciate_ligament: ['acl', 'anterior_cruciate_ligament', 'acl_tear', 'acl_injury'],
  carpal_tunnel: ['carpal_tunnel', 'carpal_tunnel_syndrome', 'median_nerve'],
  carpal_tunnel_syndrome: ['carpal_tunnel', 'carpal_tunnel_syndrome', 'median_nerve'],
  distal_radius: ['distal_radius', 'distal_radius_fracture', 'wrist_fracture'],
  distal_radius_fracture: ['distal_radius', 'distal_radius_fracture', 'wrist_fracture'],
  tibial_plateau: ['tibial_plateau', 'tibial_plateau_fracture', 'schatzker_classification'],
  tibial_plateau_fracture: ['tibial_plateau', 'tibial_plateau_fracture', 'schatzker_classification'],
};

const NEGATIVE_TOPIC_GUARDS: Array<{
  topic: string[];
  exclude: string[];
  allowedWhen: string[];
}> = [
  {
    topic: ['femoral_neck', 'femoral_neck_fracture', 'hip_fracture'],
    exclude: [
      'ddh',
      'developmental_dysplasia_hip',
      'perthes',
      'legg_calve_perthes',
      'scfe',
      'slipped_capital_femoral_epiphysis',
      'clubfoot',
      'pediatric_deformity',
    ],
    allowedWhen: ['pediatric_hip_differential', 'pediatric_differential'],
  },
  {
    topic: ['rotator_cuff', 'rotator_cuff_tear'],
    exclude: ['acl', 'anterior_cruciate_ligament', 'meniscus', 'meniscal_tear'],
    allowedWhen: ['comparison', 'compare'],
  },
  {
    topic: ['carpal_tunnel', 'carpal_tunnel_syndrome'],
    exclude: ['distal_radius', 'distal_radius_fracture', 'scaphoid', 'scaphoid_fracture'],
    allowedWhen: ['comparison', 'compare'],
  },
];

function numeric(value: number | string | null | undefined, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_:;/|()[\]{}.,!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeReadingTopic(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\bneck of femur\b/g, 'nof')
    .replace(/\bslipped capital femoral epiphysis\b/g, 'scfe')
    .replace(/\bdevelopmental dysplasia of the hip\b/g, 'developmental dysplasia hip')
    .replace(/\bperiprosthetic joint infection\b/g, 'pji')
    .replace(/\bprosthetic joint infection\b/g, 'pji')
    .replace(/\banterior cruciate ligament\b/g, 'acl')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function tokenize(value: string | null | undefined): Set<string> {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter((token) => token.length > 2)
  );
}

function normalizedTagSet(tags: Array<string | null | undefined>): Set<string> {
  return new Set(tags.map(normalizeReadingTopic).filter(Boolean));
}

function expandSynonyms(value: string): Set<string> {
  const normalized = normalizeReadingTopic(value);
  const expanded = new Set<string>([normalized]);

  for (const [key, synonyms] of Object.entries(TOPIC_SYNONYMS)) {
    if (normalized === key || synonyms.includes(normalized)) {
      expanded.add(key);
      synonyms.forEach((synonym) => expanded.add(synonym));
    }
  }

  return expanded;
}

function contextSpecificTerms(context: BroBotReadingContext): Set<string> {
  const terms = new Set<string>();
  const rawTerms = [
    context.topic,
    context.procedureCategory,
    context.subintent,
    ...context.tags,
  ];

  rawTerms.forEach((term) => {
    const normalized = normalizeReadingTopic(term);
    if (!normalized || BROAD_TAGS.has(normalized)) return;
    expandSynonyms(normalized).forEach((expanded) => {
      if (!BROAD_TAGS.has(expanded)) terms.add(expanded);
    });
  });

  return terms;
}

export function buildReadingSearchTerms(context: BroBotReadingContext): string[] {
  return Array.from(contextSpecificTerms(context));
}

function resourceSpecificTerms(resource: BroBotReadingResourceRow): Set<string> {
  const terms = new Set<string>();
  const rawTerms = [
    resource.title,
    resource.journal ?? '',
    ...(resource.tags ?? []),
    ...(resource.procedure_categories ?? []),
  ];

  rawTerms.forEach((term) => {
    const normalized = normalizeReadingTopic(term);
    if (!normalized || BROAD_TAGS.has(normalized)) return;
    terms.add(normalized);
    expandSynonyms(normalized).forEach((expanded) => {
      if (!BROAD_TAGS.has(expanded)) terms.add(expanded);
    });
  });

  return terms;
}

function hasAnyOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) {
    if (b.has(value)) return true;
  }
  return false;
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  return intersection / Math.min(a.size, b.size);
}

function violatesNegativeGuard(resource: BroBotReadingResourceRow, context: BroBotReadingContext) {
  const contextTerms = contextSpecificTerms(context);
  const resourceTerms = resourceSpecificTerms(resource);

  for (const guard of NEGATIVE_TOPIC_GUARDS) {
    if (!hasAnyOverlap(contextTerms, new Set(guard.topic))) continue;
    if (hasAnyOverlap(contextTerms, new Set(guard.allowedWhen))) continue;
    if (hasAnyOverlap(resourceTerms, new Set(guard.exclude))) return true;
  }

  return false;
}

function passesHardRelevanceGate(resource: BroBotReadingResourceRow, context: BroBotReadingContext) {
  const contextTerms = contextSpecificTerms(context);
  if (contextTerms.size === 0) return false;
  if (violatesNegativeGuard(resource, context)) return false;

  const resourceTerms = resourceSpecificTerms(resource);
  if (hasAnyOverlap(resourceTerms, contextTerms)) return true;

  const resourceTags = normalizedTagSet(resource.tags ?? []);
  const contextTags = normalizedTagSet(context.tags);
  for (const tag of contextTags) {
    if (!BROAD_TAGS.has(tag) && resourceTags.has(tag)) return true;
  }

  return false;
}

function levelIndex(level: string | null | undefined): number {
  const index = TRAINING_LEVEL_ORDER.indexOf(String(level ?? ''));
  return index >= 0 ? index : -1;
}

function levelFit(resource: BroBotReadingResourceRow, trainingLevel: string): number {
  const current = levelIndex(trainingLevel);
  if (current < 0) return 0.65;

  const min = levelIndex(resource.training_level_min);
  const max = levelIndex(resource.training_level_max);
  if (min < 0 && max < 0) return 0.75;
  if (min >= 0 && current < min) return 0.2;
  if (max >= 0 && current > max) return 0.45;
  return 1;
}

function modeFit(resource: BroBotReadingResourceRow, mode: string): number {
  const modes = resource.modes ?? [];
  if (modes.length === 0) return 0.6;
  if (modes.includes(mode)) return 1;
  if (mode === 'general') return 0.7;
  if (mode === 'consult' && modes.includes('clinic')) return 0.75;
  if (mode === 'clinic' && modes.includes('consult')) return 0.75;
  return 0.25;
}

function topicFit(resource: BroBotReadingResourceRow, context: BroBotReadingContext): number {
  const contextTerms = contextSpecificTerms(context);
  const resourceTerms = resourceSpecificTerms(resource);
  const exactOrSynonymMatch = hasAnyOverlap(resourceTerms, contextTerms) ? 1 : 0;
  const contextTags = normalizedTagSet([
    context.topic,
    context.procedureCategory,
    context.subintent,
    ...context.tags,
  ]);
  const resourceTags = normalizedTagSet(resource.tags ?? []);
  const tagOverlap = overlapScore(resourceTags, contextTags);

  const contextText = [
    context.topic,
    context.procedureCategory,
    context.subintent,
    ...context.tags,
  ].join(' ');
  const resourceText = [
    resource.title,
    resource.source_name,
    resource.journal ?? '',
    ...(resource.tags ?? []),
    ...(resource.procedure_categories ?? []),
  ].join(' ');

  const tokenOverlap = overlapScore(tokenize(resourceText), tokenize(contextText));
  return Math.min(1, exactOrSynonymMatch * 0.7 + tagOverlap * 0.2 + tokenOverlap * 0.1);
}

function accessScore(resource: BroBotReadingResourceRow): number {
  if (resource.access === 'free') return 1;
  if (resource.access === 'abstract_only') return 0.55;
  if (resource.access === 'paywalled') return 0.25;
  return 0.4;
}

function statusIsVerified(resource: BroBotReadingResourceRow): boolean {
  return resource.editorial_status === 'verified';
}

export function scoreReadingResource(
  resource: BroBotReadingResourceRow,
  context: BroBotReadingContext
): RankedBroBotReadingResource {
  const educationalYield = numeric(resource.educational_yield, 50) / 100;
  const landmarkOrGuideline =
    Math.max(numeric(resource.landmark_score), numeric(resource.board_relevance)) / 100;
  const modeAlignment = modeFit(resource, context.mode);
  const levelAlignment = levelFit(resource, context.trainingLevel);
  const contextAlignment = topicFit(resource, context);
  const recencyWhenRelevant =
    context.mode === 'research' || resource.resource_type === 'guideline'
      ? resource.year
        ? Math.max(0, Math.min(1, (numeric(resource.year) - 2000) / 26))
        : 0.25
      : 0.6;

  const score =
    45 * contextAlignment +
    12 * modeAlignment +
    10 * levelAlignment +
    14 * educationalYield +
    7 * landmarkOrGuideline +
    4 * accessScore(resource) +
    3 * recencyWhenRelevant;

  return {
    ...resource,
    rankScore: statusIsVerified(resource) ? Math.round(score * 100) / 100 : 0,
  };
}

export function rankReadingResources(
  resources: BroBotReadingResourceRow[],
  context: BroBotReadingContext,
  max = 5
): BroBotReadingRecommendation[] {
  const seenUrls = new Set<string>();

  return resources
    .filter(statusIsVerified)
    .filter((resource) => passesHardRelevanceGate(resource, context))
    .filter((resource) => {
      const key = resource.url.toLowerCase();
      if (!key || seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    })
    .map((resource) => scoreReadingResource(resource, context))
    .filter((resource) => resource.rankScore > 0)
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, max)
    .map((resource, index) => ({
      id: resource.id,
      title: resource.title,
      resourceType: resource.resource_type,
      sourceName: resource.source_name,
      journal: resource.journal ?? undefined,
      year: resource.year ?? undefined,
      url: resource.url,
      pmid: resource.pmid ?? undefined,
      doi: resource.doi ?? undefined,
      whyItMatters: resource.why_it_matters,
      bestFor: resource.source_origin === 'pubmed_live' ? 'Evidence-based reading' : undefined,
      badges: [
        resource.source_origin === 'pubmed_live' ? 'PubMed' : '',
        resource.resource_type === 'systematic_review' ? 'Review' : '',
        resource.resource_type === 'guideline' ? 'Guideline' : '',
        numeric(resource.board_relevance) >= 70 ? 'Board' : '',
        numeric(resource.technique_relevance) >= 70 ? 'Technique' : '',
        resource.access === 'free' ? 'Free' : '',
      ].filter(Boolean),
      matchedTerms: Array.isArray(resource.citation_metadata?.matchedTerms)
        ? resource.citation_metadata.matchedTerms.map(String)
        : undefined,
      tags: resource.tags ?? [],
      access: resource.access ?? 'unknown',
      sourceOrigin:
        resource.source_origin === 'pubmed_live' ||
        resource.source_origin === 'trusted_web_live' ||
        resource.source_origin === 'cached_live' ||
        resource.source_origin === 'curated'
          ? resource.source_origin
          : 'curated',
      isLandmark: numeric(resource.landmark_score) >= 75,
      isBoardRelevant: numeric(resource.board_relevance) >= 70,
      isTechniqueRelevant: numeric(resource.technique_relevance) >= 70,
      rankScore: resource.rankScore,
      rankPosition: index + 1,
    }));
}
