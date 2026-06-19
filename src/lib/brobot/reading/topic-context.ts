import type { BroBotChatMode, BroBotTrainingLevel } from '@/lib/brobot/chat/types';

import { buildReadingSearchTerms, normalizeReadingTopic } from './ranker';
import type { BroBotReadingContext } from './types';

export type ReadingTopicContextDefinition = {
  topicKey: string;
  displayTopic: string;
  aliases: string[];
  requiredTerms: string[];
  preferredTerms: string[];
  excludedTerms: string[];
  allowedBroaderTerms?: string[];
  pubmedQueryFocus?: string[];
  modeBoosts?: Partial<Record<BroBotChatMode, string[]>>;
  family?: string;
  allowRelatedTopicKeys?: string[];
};

export type ReadingTopicContext = ReadingTopicContextDefinition & {
  primaryQuery: string;
  synonyms: string[];
  exclusions: string[];
  mode: Exclude<BroBotChatMode, 'auto'>;
  trainingLevel: BroBotTrainingLevel;
  tags: string[];
  comparisonRequested: boolean;
  procedureCategory?: string;
  subintent?: string;
};

export const READING_TOPIC_CONTEXTS: ReadingTopicContextDefinition[] = [
  {
    topicKey: 'intertrochanteric_femur_fracture',
    displayTopic: 'Intertrochanteric femur fracture',
    aliases: [
      'intertrochanteric fracture',
      'intertrochanteric femur fracture',
      'pertrochanteric fracture',
      'trochanteric fracture',
      'extracapsular hip fracture',
      'AO/OTA 31-A',
    ],
    requiredTerms: [
      'intertrochanteric fracture',
      'intertrochanteric',
      'pertrochanteric',
      'trochanteric fracture',
      'extracapsular hip fracture',
      'AO/OTA 31-A',
    ],
    preferredTerms: [
      'cephalomedullary nail',
      'sliding hip screw',
      'unstable intertrochanteric',
      'reverse obliquity',
      'geriatric hip fracture',
      'management',
      'treatment',
    ],
    excludedTerms: [
      'avascular necrosis',
      'AVN',
      'femoral head necrosis',
      'cerebral palsy',
      'children',
      'pediatric',
      'SCFE',
      'Perthes',
      'DDH',
      'developmental dysplasia',
      'femoral neck',
    ],
    allowedBroaderTerms: ['geriatric hip fracture', 'proximal femur fracture'],
    pubmedQueryFocus: ['intertrochanteric fracture', 'pertrochanteric fracture', 'extracapsular hip fracture'],
    modeBoosts: {
      consult: ['operative fixation', 'cephalomedullary nail'],
      or_prep: ['reduction', 'implant selection'],
      oite: ['classification', 'reverse obliquity'],
    },
    family: 'proximal_femur',
    allowRelatedTopicKeys: ['geriatric_hip_fracture'],
  },
  {
    topicKey: 'femoral_neck_fracture',
    displayTopic: 'Femoral neck fracture',
    aliases: ['femoral neck fracture', 'femoral neck', 'intracapsular hip fracture', 'NOF fracture'],
    requiredTerms: ['femoral neck fracture', 'femoral neck', 'intracapsular hip fracture'],
    preferredTerms: ['Garden classification', 'Pauwels classification', 'arthroplasty', 'fixation', 'treatment'],
    excludedTerms: ['DDH', 'Perthes', 'SCFE', 'developmental dysplasia', 'intertrochanteric', 'pertrochanteric'],
    pubmedQueryFocus: ['femoral neck fracture', 'intracapsular hip fracture'],
    family: 'proximal_femur',
  },
  {
    topicKey: 'subtrochanteric_fracture',
    displayTopic: 'Subtrochanteric femur fracture',
    aliases: ['subtrochanteric fracture', 'subtrochanteric femur fracture', 'proximal femoral shaft fracture'],
    requiredTerms: ['subtrochanteric', 'subtrochanteric fracture', 'subtrochanteric femur fracture'],
    preferredTerms: ['cephalomedullary nail', 'reduction', 'fixation'],
    excludedTerms: ['femoral neck', 'intertrochanteric', 'pediatric', 'children'],
    family: 'proximal_femur',
  },
  {
    topicKey: 'geriatric_hip_fracture',
    displayTopic: 'Geriatric hip fracture',
    aliases: ['hip fracture', 'geriatric hip fracture', 'fragility hip fracture', 'elderly hip fracture'],
    requiredTerms: ['hip fracture', 'geriatric hip fracture', 'fragility hip fracture'],
    preferredTerms: ['co-management', 'timing of surgery', 'mortality', 'delirium', 'treatment'],
    excludedTerms: ['SCFE', 'Perthes', 'DDH', 'pediatric'],
    allowedBroaderTerms: ['proximal femur fracture'],
    family: 'proximal_femur',
  },
  {
    topicKey: 'scfe',
    displayTopic: 'Slipped capital femoral epiphysis',
    aliases: ['SCFE', 'slipped capital femoral epiphysis', 'stable SCFE', 'unstable SCFE'],
    requiredTerms: ['SCFE', 'slipped capital femoral epiphysis'],
    preferredTerms: ['stable SCFE', 'unstable SCFE', 'in situ fixation', 'Klein line'],
    excludedTerms: ['DDH', 'Perthes', 'adult hip fracture', 'intertrochanteric', 'femoral neck fracture'],
    family: 'pediatric_hip',
  },
  {
    topicKey: 'ddh',
    displayTopic: 'Developmental dysplasia of the hip',
    aliases: ['DDH', 'developmental dysplasia of the hip', 'developmental dysplasia', 'acetabular dysplasia'],
    requiredTerms: ['developmental dysplasia', 'DDH', 'acetabular dysplasia'],
    preferredTerms: ['Barlow', 'Ortolani', 'acetabular index', 'Pavlik harness'],
    excludedTerms: ['femoral neck fracture', 'Perthes', 'SCFE', 'intertrochanteric'],
    family: 'pediatric_hip',
  },
  {
    topicKey: 'perthes',
    displayTopic: 'Legg-Calve-Perthes disease',
    aliases: ['Perthes', 'Perthes disease', 'Legg-Calve-Perthes disease', 'Legg Calve Perthes'],
    requiredTerms: ['Perthes', 'Legg-Calve-Perthes', 'Legg Calve Perthes'],
    preferredTerms: ['containment', 'lateral pillar', 'femoral head'],
    excludedTerms: ['DDH', 'developmental dysplasia', 'femoral neck fracture', 'SCFE', 'intertrochanteric'],
    family: 'pediatric_hip',
  },
  {
    topicKey: 'rotator_cuff_tear',
    displayTopic: 'Rotator cuff tear',
    aliases: ['rotator cuff', 'rotator cuff tear', 'rotator cuff repair', 'supraspinatus tear'],
    requiredTerms: ['rotator cuff', 'rotator cuff tear', 'supraspinatus'],
    preferredTerms: ['repair', 'massive tear', 'retear', 'subacromial'],
    excludedTerms: ['ACL', 'anterior cruciate ligament', 'meniscus', 'meniscal'],
    family: 'shoulder',
  },
  {
    topicKey: 'acl_tear',
    displayTopic: 'ACL tear',
    aliases: ['ACL', 'ACL tear', 'ACL reconstruction', 'anterior cruciate ligament injury', 'anterior cruciate ligament'],
    requiredTerms: ['ACL', 'anterior cruciate ligament'],
    preferredTerms: ['reconstruction', 'pivot shift', 'graft'],
    excludedTerms: ['rotator cuff', 'shoulder', 'meniscus tear'],
    family: 'sports_knee',
  },
  {
    topicKey: 'meniscus_tear',
    displayTopic: 'Meniscus tear',
    aliases: ['meniscus', 'meniscus tear', 'meniscal tear', 'meniscus repair', 'partial meniscectomy'],
    requiredTerms: ['meniscus', 'meniscal tear', 'meniscus tear'],
    preferredTerms: ['repair', 'meniscectomy', 'root tear'],
    excludedTerms: ['rotator cuff', 'shoulder', 'ACL', 'anterior cruciate ligament'],
    family: 'sports_knee',
  },
  {
    topicKey: 'carpal_tunnel_syndrome',
    displayTopic: 'Carpal tunnel syndrome',
    aliases: ['carpal tunnel', 'carpal tunnel syndrome', 'median nerve compression', 'carpal tunnel release'],
    requiredTerms: ['carpal tunnel', 'carpal tunnel syndrome', 'median nerve compression'],
    preferredTerms: ['carpal tunnel release', 'electrodiagnostic', 'night symptoms'],
    excludedTerms: ['distal radius fracture', 'distal radius', 'scaphoid fracture', 'scaphoid'],
    family: 'wrist_hand',
  },
  {
    topicKey: 'distal_radius_fracture',
    displayTopic: 'Distal radius fracture',
    aliases: ['distal radius', 'distal radius fracture', 'wrist fracture', 'volar locking plate'],
    requiredTerms: ['distal radius', 'distal radius fracture'],
    preferredTerms: ['volar plate', 'dorsal tilt', 'radial height', 'intra-articular'],
    excludedTerms: ['carpal tunnel', 'scaphoid'],
    family: 'wrist_hand',
  },
  {
    topicKey: 'scaphoid_fracture',
    displayTopic: 'Scaphoid fracture',
    aliases: ['scaphoid', 'scaphoid fracture', 'scaphoid nonunion', 'snuffbox tenderness'],
    requiredTerms: ['scaphoid', 'scaphoid fracture'],
    preferredTerms: ['nonunion', 'avascular necrosis', 'proximal pole'],
    excludedTerms: ['distal radius', 'carpal tunnel'],
    family: 'wrist_hand',
  },
  {
    topicKey: 'prosthetic_joint_infection',
    displayTopic: 'Prosthetic joint infection',
    aliases: ['PJI', 'prosthetic joint infection', 'periprosthetic joint infection', 'MSIS criteria'],
    requiredTerms: ['periprosthetic joint infection', 'prosthetic joint infection', 'PJI'],
    preferredTerms: ['MSIS', 'ICM criteria', 'DAIR', 'two-stage exchange', 'diagnosis'],
    excludedTerms: ['native septic arthritis', 'septic arthritis native joint'],
    family: 'infection',
  },
  {
    topicKey: 'native_septic_arthritis',
    displayTopic: 'Native septic arthritis',
    aliases: ['septic arthritis', 'native septic arthritis', 'septic joint', 'native joint infection'],
    requiredTerms: ['septic arthritis', 'septic joint', 'native joint infection', 'native septic arthritis'],
    preferredTerms: ['aspiration', 'synovial WBC', 'irrigation and debridement'],
    excludedTerms: ['periprosthetic joint infection', 'prosthetic joint infection', 'PJI'],
    family: 'infection',
  },
  {
    topicKey: 'cervical_myelopathy',
    displayTopic: 'Cervical myelopathy',
    aliases: ['cervical myelopathy', 'degenerative cervical myelopathy', 'cervical spondylotic myelopathy'],
    requiredTerms: ['cervical myelopathy', 'degenerative cervical myelopathy', 'cervical spondylotic myelopathy'],
    preferredTerms: ['decompression', 'gait', 'hand clumsiness', 'myelopathic signs'],
    excludedTerms: ['lumbar stenosis', 'lumbar spinal stenosis', 'neurogenic claudication'],
    family: 'spine',
  },
  {
    topicKey: 'lumbar_spinal_stenosis',
    displayTopic: 'Lumbar spinal stenosis',
    aliases: ['lumbar stenosis', 'lumbar spinal stenosis', 'neurogenic claudication'],
    requiredTerms: ['lumbar stenosis', 'lumbar spinal stenosis', 'neurogenic claudication'],
    preferredTerms: ['decompression', 'laminectomy', 'walking tolerance'],
    excludedTerms: ['cervical myelopathy', 'degenerative cervical myelopathy'],
    family: 'spine',
  },
];

const CONTEXTS_BY_KEY = new Map(READING_TOPIC_CONTEXTS.map((definition) => [definition.topicKey, definition]));

const COMPARE_PATTERN = /\b(compare|comparison|versus|vs\.?|differentiate|distinguish)\b/i;
const IGNORED_TOPIC_CANDIDATES = new Set(['mode', 'oite', 'consult', 'clinic', 'or_prep', 'general']);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).toLowerCase()).filter(Boolean) : [];
}

function normalizeMode(value: unknown, fallback?: string | null): Exclude<BroBotChatMode, 'auto'> {
  const mode = String(value || fallback || 'general');
  if (
    mode === 'or_prep' ||
    mode === 'oite' ||
    mode === 'clinic' ||
    mode === 'consult' ||
    mode === 'fracture_call' ||
    mode === 'research' ||
    mode === 'general'
  ) {
    return mode === 'fracture_call' ? 'consult' : mode;
  }
  return 'general';
}

function candidatesFromInput(input: { structuredJson: unknown; latestUserMessage?: string | null }) {
  const structured = record(input.structuredJson);
  const tags = stringArray(structured.tags);
  return [
    ...tags.map((tag) => tag.split(':').slice(1).join(':') || tag),
    typeof structured.selectedFocus === 'string' ? structured.selectedFocus : '',
    typeof structured.goal === 'string' ? structured.goal : '',
    input.latestUserMessage ?? '',
  ].filter((candidate) => candidate.trim().length > 0);
}

function matchScore(candidate: string, definition: ReadingTopicContextDefinition) {
  const normalizedCandidate = normalizeReadingTopic(candidate);
  if (!normalizedCandidate || IGNORED_TOPIC_CANDIDATES.has(normalizedCandidate)) return 0;

  const phrases = [
    definition.topicKey,
    definition.displayTopic,
    ...definition.aliases,
    ...definition.requiredTerms,
  ];

  return phrases.reduce((best, phrase) => {
    const normalizedPhrase = normalizeReadingTopic(phrase);
    if (!normalizedPhrase) return best;
    if (normalizedCandidate === normalizedPhrase) return Math.max(best, 30 + normalizedPhrase.length);
    if (normalizedCandidate.includes(normalizedPhrase)) return Math.max(best, 40 + normalizedPhrase.length);
    if (normalizedPhrase.includes(normalizedCandidate) && normalizedCandidate.length >= 8) {
      return Math.max(best, 8 + normalizedCandidate.length);
    }
    return best;
  }, 0);
}

function resolveReadingTopicDefinition(candidates: string[]) {
  let best: { definition: ReadingTopicContextDefinition; score: number } | null = null;

  for (const candidate of candidates) {
    for (const definition of READING_TOPIC_CONTEXTS) {
      const score = matchScore(candidate, definition);
      if (score > (best?.score ?? 0)) best = { definition, score };
    }
  }

  return best?.definition;
}

function pickTopic(input: { structuredJson: unknown; latestUserMessage?: string | null }): string {
  const candidates = candidatesFromInput(input);
  const matched = resolveReadingTopicDefinition(candidates);
  if (matched) return matched.topicKey;

  return candidates
    .map((candidate) => candidate.trim())
    .find((candidate) => {
      const normalized = normalizeReadingTopic(candidate);
      return normalized && !IGNORED_TOPIC_CANDIDATES.has(normalized);
    }) || 'orthopaedics';
}

export function extractReadingTopicContext(input: {
  structuredJson: unknown;
  latestUserMessage?: string | null;
  fallbackMode?: string | null;
  fallbackTrainingLevel?: string | null;
}): ReadingTopicContext {
  const structured = record(input.structuredJson);
  const tags = stringArray(structured.tags);
  const candidates = candidatesFromInput(input);
  const topic = pickTopic(input);
  const baseContext: BroBotReadingContext = {
    mode: normalizeMode(structured.detectedMode, input.fallbackMode),
    trainingLevel: (input.fallbackTrainingLevel || 'pgy2') as BroBotTrainingLevel,
    topic,
    procedureCategory:
      tags
        .find((tag) => tag.startsWith('procedure:') || tag.startsWith('consult:'))
        ?.split(':')
        .slice(1)
        .join(':') || undefined,
    subintent:
      tags
        .find((tag) => tag.startsWith('concept:') || tag.startsWith('complication:'))
        ?.split(':')
        .slice(1)
        .join(':') || undefined,
    tags,
  };
  const terms = buildReadingSearchTerms(baseContext);
  const topicKey = terms[0] || normalizeReadingTopic(topic) || 'orthopaedics';
  const known = resolveReadingTopicDefinition(candidates) ?? CONTEXTS_BY_KEY.get(topicKey);
  const comparisonRequested = candidates.some((candidate) => COMPARE_PATTERN.test(candidate));
  const fallbackDisplayTopic = topic.replace(/[_:]+/g, ' ').trim();

  if (known) {
    return {
      ...known,
      primaryQuery: `"${(known.pubmedQueryFocus?.[0] ?? known.requiredTerms[0] ?? known.displayTopic).replace(/"/g, '')}"`,
      synonyms: known.aliases,
      exclusions: known.excludedTerms,
      mode: baseContext.mode,
      trainingLevel: baseContext.trainingLevel,
      tags: baseContext.tags,
      comparisonRequested,
      procedureCategory: baseContext.procedureCategory,
      subintent: baseContext.subintent,
    };
  }

  return {
    displayTopic: fallbackDisplayTopic,
    topicKey,
    primaryQuery: `"${fallbackDisplayTopic.replace(/"/g, '')}"`,
    aliases: terms.slice(1, 6).map((term) => term.replace(/_/g, ' ')),
    synonyms: terms.slice(1, 6).map((term) => term.replace(/_/g, ' ')),
    exclusions: [],
    requiredTerms: [fallbackDisplayTopic],
    preferredTerms: [],
    excludedTerms: [],
    mode: baseContext.mode,
    trainingLevel: baseContext.trainingLevel,
    tags: baseContext.tags,
    comparisonRequested,
    procedureCategory: baseContext.procedureCategory,
    subintent: baseContext.subintent,
  };
}

export function readingContextFromTopicContext(topicContext: ReadingTopicContext): BroBotReadingContext {
  return {
    mode: topicContext.mode,
    trainingLevel: topicContext.trainingLevel,
    topic: topicContext.displayTopic,
    procedureCategory: topicContext.procedureCategory,
    subintent: topicContext.subintent,
    tags: [
      topicContext.topicKey,
      ...topicContext.aliases.map(normalizeReadingTopic),
      ...topicContext.tags,
    ],
  };
}
