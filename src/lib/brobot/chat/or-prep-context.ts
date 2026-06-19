import type { BroBotChatIntent } from './types';

export type OrPrepProcedureMetadata = {
  family:
    | 'arthroplasty'
    | 'trauma'
    | 'sports'
    | 'spine'
    | 'hand'
    | 'pediatrics'
    | 'oncology'
    | 'foot_ankle'
    | 'general';
  operationType: 'open' | 'arthroscopic' | 'percutaneous' | 'endoscopic' | 'mis' | 'unknown';
  primaryObjective: Array<
    | 'exposure'
    | 'reduction'
    | 'fixation'
    | 'replacement'
    | 'fusion'
    | 'reconstruction'
    | 'repair'
    | 'decompression'
    | 'resection'
  >;
  exposureComplexity: 'low' | 'moderate' | 'high' | 'unknown';
  likelyLearnerChallenge: Array<
    | 'anatomy'
    | 'exposure'
    | 'reduction'
    | 'implant_strategy'
    | 'decision_making'
    | 'complication_avoidance'
  >;
};

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function buildOrPrepProcedureMetadata(
  intent: BroBotChatIntent
): OrPrepProcedureMetadata | null {
  if (intent.mode !== 'or_prep') return null;

  const topic = intent.procedureOrTopic.toLowerCase();
  const subintent = intent.subintent;
  const category = intent.procedureCategory;

  const family: OrPrepProcedureMetadata['family'] =
    category === 'arthroplasty'
      ? 'arthroplasty'
      : category === 'fracture_orif' || /orif|fracture|plate|nail|fixation/.test(topic)
        ? 'trauma'
        : category === 'arthroscopy' || category === 'tendon_ligament_repair'
          ? 'sports'
          : category === 'spine_procedure'
            ? 'spine'
            : category === 'hand_procedure' || /carpal|trigger|metacarpal|phalange|finger|thumb/.test(topic)
              ? 'hand'
              : category === 'pediatric_fracture' || /pediatric|peds|physeal|scfe/.test(topic)
                ? 'pediatrics'
                : /tumor|oncology|sarcoma|metast/.test(topic)
                  ? 'oncology'
                  : /ankle|foot|calcane|talus|lisfranc|bunion|achilles/.test(topic)
                    ? 'foot_ankle'
                    : 'general';

  const operationType: OrPrepProcedureMetadata['operationType'] =
    category === 'arthroscopy' || /arthroscop|scope|portal/.test(topic)
      ? 'arthroscopic'
      : /percutaneous|pinning|crpp/.test(topic)
        ? 'percutaneous'
        : /endoscopic/.test(topic)
          ? 'endoscopic'
          : /minimally invasive|\bmis\b/.test(topic)
            ? 'mis'
            : /open|orif|arthroplasty|release|decompression|fusion/.test(topic) ||
                category !== 'unknown'
              ? 'open'
              : 'unknown';

  const primaryObjective: OrPrepProcedureMetadata['primaryObjective'] = uniq([
    ...(subintent === 'landmarks' || subintent === 'anatomy_at_risk'
      ? (['exposure'] as const)
      : []),
    ...(category === 'fracture_orif' || /fracture|orif|reduction/.test(topic)
      ? (['reduction', 'fixation'] as const)
      : []),
    ...(category === 'arthroplasty' || /arthroplasty|replacement|tsa|tha|tka/.test(topic)
      ? (['replacement'] as const)
      : []),
    ...(category === 'spine_procedure' || /fusion/.test(topic) ? (['fusion'] as const) : []),
    ...(/acl|ligament|reconstruction/.test(topic) ? (['reconstruction'] as const) : []),
    ...(category === 'tendon_ligament_repair' || /repair|tendon/.test(topic)
      ? (['repair'] as const)
      : []),
    ...(/decompression|laminectomy|carpal tunnel/.test(topic)
      ? (['decompression'] as const)
      : []),
    ...(/resection|excision|tumor/.test(topic) ? (['resection'] as const) : []),
  ]);

  if (!primaryObjective.length) primaryObjective.push('exposure');

  const exposureComplexity: OrPrepProcedureMetadata['exposureComplexity'] =
    family === 'spine' ||
    family === 'arthroplasty' ||
    /pelvis|acetabul|plateau|proximal humerus|revision/.test(topic)
      ? 'high'
      : operationType === 'arthroscopic' ||
          family === 'hand' ||
          /ankle|distal radius|carpal tunnel|trigger/.test(topic)
        ? 'moderate'
        : category === 'unknown'
          ? 'unknown'
          : 'moderate';

  const likelyLearnerChallenge: OrPrepProcedureMetadata['likelyLearnerChallenge'] = uniq([
    'anatomy',
    'exposure',
    ...(primaryObjective.includes('reduction') ? (['reduction'] as const) : []),
    ...(primaryObjective.includes('fixation') || primaryObjective.includes('replacement')
      ? (['implant_strategy'] as const)
      : []),
    ...(subintent === 'attending_questions' ||
    subintent === 'surgical_steps' ||
    exposureComplexity === 'high'
      ? (['decision_making'] as const)
      : []),
    'complication_avoidance',
  ]);

  return {
    family,
    operationType,
    primaryObjective,
    exposureComplexity,
    likelyLearnerChallenge,
  };
}
