import type { BroBotChatIntent } from './types';

export type OiteLearningMetadata = {
  examContext: 'oite' | 'abos_written' | 'rotation_quiz' | 'daily_learning';
  topicFamily:
    | 'pediatrics'
    | 'trauma'
    | 'sports'
    | 'hand'
    | 'spine'
    | 'arthroplasty'
    | 'tumor'
    | 'infection'
    | 'basic_science'
    | 'general';
  conceptType: Array<
    | 'classification'
    | 'diagnosis'
    | 'treatment_algorithm'
    | 'complication'
    | 'imaging'
    | 'anatomy'
    | 'biomechanics'
    | 'pathophysiology'
  >;
  cognitiveTask: Array<
    | 'recall'
    | 'pattern_recognition'
    | 'differentiate'
    | 'management_decision'
    | 'trap_avoidance'
    | 'test_strategy'
  >;
  learnerRisk: Array<
    | 'confuses_diagnoses'
    | 'misses_thresholds'
    | 'overmemorizes'
    | 'misses_complications'
    | 'weak_algorithm'
  >;
  yieldTier: 'classic' | 'common' | 'moderate' | 'niche' | 'unknown';
};

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function buildOiteLearningMetadata(
  intent: BroBotChatIntent
): OiteLearningMetadata | null {
  if (intent.mode !== 'oite') return null;

  const topic = intent.procedureOrTopic.toLowerCase();
  const subintent = intent.subintent;
  const category = intent.procedureCategory;

  const examContext: OiteLearningMetadata['examContext'] =
    /\babos|written boards?\b/.test(topic)
      ? 'abos_written'
      : /\bquiz|rotation\b/.test(topic)
        ? 'rotation_quiz'
        : /\bdaily|learn|teach\b/.test(topic)
          ? 'daily_learning'
          : 'oite';

  const topicFamily: OiteLearningMetadata['topicFamily'] =
    category === 'pediatric_fracture' || /scfe|perthes|pediatric|physeal|slipped capital/.test(topic)
      ? 'pediatrics'
      : category === 'fracture_orif' || /fracture|dislocation|trauma|open tibia/.test(topic)
        ? 'trauma'
        : category === 'sports_injury' || /acl|meniscus|rotator cuff|labrum|sports/.test(topic)
          ? 'sports'
          : category === 'hand_procedure' || /hand|carpal|trigger|finger|thumb|metacarpal/.test(topic)
            ? 'hand'
            : category === 'spine_procedure' || /spine|scoliosis|stenosis|disc|myelopathy/.test(topic)
              ? 'spine'
              : category === 'arthroplasty' || category === 'arthroplasty_consult' || /tka|tha|arthroplasty|arthroplasties/.test(topic)
                ? 'arthroplasty'
                : /tumor|oncology|sarcoma|metastasis|metastatic/.test(topic)
                  ? 'tumor'
                  : category === 'infection_consult' || /infection|septic|osteomyelitis/.test(topic)
                    ? 'infection'
                    : /biomechanics|bone biology|histology|growth plate|basic science/.test(topic)
                      ? 'basic_science'
                      : 'general';

  const conceptType: OiteLearningMetadata['conceptType'] = uniq([
    ...(subintent === 'treatment_algorithm' || /treat|management|algorithm|indication/.test(topic)
      ? (['treatment_algorithm'] as const)
      : []),
    ...(/classification|classify|stable|unstable|garden|salter|neer|schatzker/.test(topic)
      ? (['classification'] as const)
      : []),
    ...(/diagnos|differential|compare|versus|vs|look similar/.test(topic)
      ? (['diagnosis'] as const)
      : []),
    ...(subintent === 'complication' || /complication|avn|nonunion|malunion|infection/.test(topic)
      ? (['complication'] as const)
      : []),
    ...(/xray|x-ray|radiograph|mri|ct|imaging/.test(topic) ? (['imaging'] as const) : []),
    ...(/anatomy|nerve|vessel|muscle|tendon/.test(topic) ? (['anatomy'] as const) : []),
    ...(/biomechanics|load|stress|strain|wear|loosening/.test(topic)
      ? (['biomechanics'] as const)
      : []),
    ...(/pathophysiology|biology|genetic|metabolic|endocrine/.test(topic)
      ? (['pathophysiology'] as const)
      : []),
  ]);

  if (!conceptType.length) {
    conceptType.push('classification', 'treatment_algorithm');
  }

  const cognitiveTask: OiteLearningMetadata['cognitiveTask'] = uniq([
    'recall',
    'pattern_recognition',
    ...(subintent === 'treatment_algorithm' || conceptType.includes('treatment_algorithm')
      ? (['management_decision'] as const)
      : []),
    ...(subintent === 'quiz' ? (['test_strategy'] as const) : []),
    ...(subintent === 'overview' || subintent === 'other' ? (['test_strategy'] as const) : []),
    ...(/trap|distractor|wrong|except/.test(topic) ? (['trap_avoidance'] as const) : []),
    ...(/compare|versus|vs|differential|similar/.test(topic) ? (['differentiate'] as const) : []),
  ]);

  if (subintent === 'quiz') cognitiveTask.push('trap_avoidance');

  const learnerRisk: OiteLearningMetadata['learnerRisk'] = uniq([
    ...(conceptType.includes('diagnosis') || cognitiveTask.includes('differentiate')
      ? (['confuses_diagnoses'] as const)
      : []),
    ...(conceptType.includes('classification') || conceptType.includes('treatment_algorithm')
      ? (['misses_thresholds', 'weak_algorithm'] as const)
      : []),
    ...(conceptType.includes('complication') ? (['misses_complications'] as const) : []),
    ...(subintent === 'overview' || subintent === 'other' ? (['overmemorizes'] as const) : []),
  ]);

  const classicTopicPattern =
    /\b(scfe|perthes|supracondylar|compartment|open fracture|acl|meniscus|rotator cuff|developmental dysplasia|ddh|osteomyelitis|septic arthritis|ewing|osteosarcoma|slipped capital)\b/;

  const yieldTier: OiteLearningMetadata['yieldTier'] =
    classicTopicPattern.test(topic)
      ? 'classic'
      : /\bclassification|algorithm|trap|boards?|oite\b/.test(topic)
        ? 'common'
        : topicFamily === 'general'
          ? 'unknown'
          : 'moderate';

  return {
    examContext,
    topicFamily,
    conceptType,
    cognitiveTask,
    learnerRisk,
    yieldTier,
  };
}
