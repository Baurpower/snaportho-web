import type { BroBotModelMessage } from './types';

/**
 * Structured orthopaedic entity extracted from a user message.
 *
 * This is deliberately a plain type (not a zod schema) and is NOT added to the
 * persisted intent contract — it is a derived, in-memory aid for routing,
 * answer-prompt anchoring, and conversation continuity. Keeping it out of the
 * schema keeps this change additive and non-breaking.
 */
export type OrthoEntity = {
  region?: string;
  bone?: string;
  procedure?: string;
  fracturePattern?: string;
  laterality?: 'left' | 'right';
  raw: string;
};

type BonePattern = { re: RegExp; bone: string; region: string };
type RegionPattern = { re: RegExp; region: string };
type ProcedurePattern = { re: RegExp; procedure: string };
type FracturePattern = { re: RegExp; pattern: string };

// Most specific (multi-word, named) bones first so they win over generic regions.
const BONE_PATTERNS: BonePattern[] = [
  { re: /\bproximal humerus\b/, bone: 'proximal humerus', region: 'shoulder' },
  { re: /\bhumeral shaft\b/, bone: 'humeral shaft', region: 'arm' },
  { re: /\bdistal humerus\b/, bone: 'distal humerus', region: 'elbow' },
  { re: /\bolecranon\b/, bone: 'olecranon', region: 'elbow' },
  { re: /\bradial head\b/, bone: 'radial head', region: 'elbow' },
  { re: /\bdistal radius\b/, bone: 'distal radius', region: 'wrist' },
  { re: /\bscaphoid\b/, bone: 'scaphoid', region: 'wrist' },
  { re: /\bmetacarpal\b/, bone: 'metacarpal', region: 'hand' },
  { re: /\b(phalanx|phalangeal)\b/, bone: 'phalanx', region: 'hand' },
  { re: /\bfemoral neck\b/, bone: 'femoral neck', region: 'hip' },
  { re: /\b(intertrochanteric|inter ?troch|peritrochanteric)\b/, bone: 'intertrochanteric femur', region: 'hip' },
  { re: /\bsubtrochanteric\b/, bone: 'subtrochanteric femur', region: 'hip' },
  { re: /\bfemoral shaft\b/, bone: 'femoral shaft', region: 'thigh' },
  { re: /\b(distal femur|supracondylar femur)\b/, bone: 'distal femur', region: 'knee' },
  { re: /\bpatella(r)?\b/, bone: 'patella', region: 'knee' },
  { re: /\btibial plateau\b/, bone: 'tibial plateau', region: 'knee' },
  { re: /\b(tibial shaft|tibial diaphysis)\b/, bone: 'tibial shaft', region: 'leg' },
  { re: /\b(pilon|tibial plafond)\b/, bone: 'tibial pilon', region: 'ankle' },
  { re: /\b(malleolus|malleolar|ankle fractures?)\b/, bone: 'ankle', region: 'ankle' },
  { re: /\bcalcaneus\b/, bone: 'calcaneus', region: 'foot' },
  { re: /\btalus\b/, bone: 'talus', region: 'foot' },
  { re: /\bmetatarsal\b/, bone: 'metatarsal', region: 'foot' },
  { re: /\bclavicle\b/, bone: 'clavicle', region: 'shoulder' },
  { re: /\bscapula\b/, bone: 'scapula', region: 'shoulder' },
  { re: /\bacetabulum\b/, bone: 'acetabulum', region: 'pelvis' },
  { re: /\b(pelvis|pelvic)\b/, bone: 'pelvis', region: 'pelvis' },
];

const REGION_PATTERNS: RegionPattern[] = [
  { re: /\bshoulder\b/, region: 'shoulder' },
  { re: /\belbow\b/, region: 'elbow' },
  { re: /\bwrist\b/, region: 'wrist' },
  { re: /\bhand\b/, region: 'hand' },
  { re: /\bhip\b/, region: 'hip' },
  { re: /\bknee\b/, region: 'knee' },
  { re: /\bankle\b/, region: 'ankle' },
  { re: /\bfoot\b/, region: 'foot' },
  { re: /\b(spine|lumbar|cervical|thoracic)\b/, region: 'spine' },
];

const PROCEDURE_PATTERNS: ProcedurePattern[] = [
  { re: /\breverse (tsa|total shoulder( arthroplasty)?|shoulder arthroplasty)\b/, procedure: 'reverse total shoulder arthroplasty' },
  { re: /\b(anatomic )?(tsa|total shoulder arthroplasty)\b/, procedure: 'total shoulder arthroplasty' },
  { re: /\b(tka|total knee( arthroplasty)?)\b/, procedure: 'total knee arthroplasty' },
  { re: /\b(tha|total hip( arthroplasty)?)\b/, procedure: 'total hip arthroplasty' },
  { re: /\bhemiarthroplasty\b/, procedure: 'hemiarthroplasty' },
  { re: /\bacl (reconstruction|repair)\b/, procedure: 'ACL reconstruction' },
  { re: /\bcarpal tunnel release\b/, procedure: 'carpal tunnel release' },
  { re: /\b(cephalomedullary nail|im nail|intramedullary nail|nailing)\b/, procedure: 'intramedullary nailing' },
  { re: /\bfasciotomy\b/, procedure: 'fasciotomy' },
  { re: /\b(laminectomy|spinal fusion|decompression)\b/, procedure: 'spinal decompression/fusion' },
  { re: /\b(arthroscopy|arthroscopic|scope)\b/, procedure: 'arthroscopy' },
  { re: /\borif\b/, procedure: 'ORIF' },
];

const FRACTURE_PATTERNS: FracturePattern[] = [
  { re: /\breverse obliquity\b/, pattern: 'reverse obliquity' },
  { re: /\bgarden (i{1,3}v?|[1-4]|one|two|three|four)\b/, pattern: 'Garden classification' },
  { re: /\bpauwels\b/, pattern: 'Pauwels classification' },
  { re: /\bweber [abc]\b/, pattern: 'Weber classification' },
  { re: /\blauge[- ]hansen\b/, pattern: 'Lauge-Hansen' },
  { re: /\bcomminuted\b/, pattern: 'comminuted' },
  { re: /\bsegmental\b/, pattern: 'segmental' },
  { re: /\bintra-?articular\b/, pattern: 'intra-articular' },
  { re: /\bopen fracture\b/, pattern: 'open' },
  { re: /\b(nondisplaced|non-displaced)\b/, pattern: 'nondisplaced' },
  { re: /\bdisplaced\b/, pattern: 'displaced' },
  { re: /\bspiral\b/, pattern: 'spiral' },
  { re: /\btransverse\b/, pattern: 'transverse' },
];

// "deltopectoral approach", "posterior approach" — capture the modifier before
// the word "approach", skipping filler words that are not real approach names.
const NAMED_APPROACH_RE = /\b([a-z][a-z-]+(?: [a-z-]+)?)\s+approach\b/;
const APPROACH_STOPWORDS = new Set([
  'the',
  'an',
  'a',
  'is',
  'of',
  'to',
  'for',
  'what',
  'which',
  'do',
  'you',
  'your',
  'my',
  'best',
  'surgical',
  'standard',
  'this',
  'that',
  'each',
  'common',
  'safe',
  'good',
  'right',
  'left',
]);

export function extractOrthoEntity(text: string): OrthoEntity {
  const raw = String(text ?? '');
  const lower = raw.toLowerCase();
  const entity: OrthoEntity = { raw };

  for (const { re, bone, region } of BONE_PATTERNS) {
    if (re.test(lower)) {
      entity.bone = bone;
      entity.region = region;
      break;
    }
  }

  if (!entity.region) {
    for (const { re, region } of REGION_PATTERNS) {
      if (re.test(lower)) {
        entity.region = region;
        break;
      }
    }
  }

  for (const { re, procedure } of PROCEDURE_PATTERNS) {
    if (re.test(lower)) {
      entity.procedure = procedure;
      break;
    }
  }

  // Named-approach capture only applies to "<name> approach" phrasing, not the
  // question form "approach to the <target>" (where the target is the entity and
  // is handled by bone/region extraction above).
  if (!entity.procedure && !/\bapproach(es)?\s+to\b/.test(lower)) {
    const approachMatch = lower.match(NAMED_APPROACH_RE);
    const words = (approachMatch?.[1]?.trim() ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !APPROACH_STOPWORDS.has(word));
    const candidate = words.join(' ');
    if (candidate) {
      entity.procedure = `${candidate} approach`;
    }
  }

  for (const { re, pattern } of FRACTURE_PATTERNS) {
    if (re.test(lower)) {
      entity.fracturePattern = pattern;
      break;
    }
  }

  if (/\bleft\b/.test(lower)) entity.laterality = 'left';
  else if (/\bright\b/.test(lower)) entity.laterality = 'right';

  return entity;
}

/** The most salient anatomic/procedure anchor for this entity, or null. */
export function entityToTopic(entity: OrthoEntity): string | null {
  return entity.bone ?? entity.procedure ?? entity.region ?? null;
}

/** True when the text contains a recognizable ortho bone/region/procedure. */
export function hasOrthoEntity(text: string): boolean {
  return entityToTopic(extractOrthoEntity(text)) !== null;
}

/**
 * Resolve the conversation's anchor topic: prefer the current message, then
 * fall back to the most recent prior turn that named an entity. Used so a
 * follow-up like a clicked chip ("Axillary nerve risk") stays anchored to the
 * original procedure/body region rather than re-routing on the bare chip label.
 */
export function resolveTopicFromHistory(input: {
  message: string;
  history: BroBotModelMessage[];
}): string | null {
  const direct = entityToTopic(extractOrthoEntity(input.message));
  if (direct) return direct;

  // Prefer the learner's own most recent topic, then fall back to any turn.
  for (let i = input.history.length - 1; i >= 0; i -= 1) {
    if (input.history[i]?.role !== 'user') continue;
    const topic = entityToTopic(extractOrthoEntity(input.history[i]?.content ?? ''));
    if (topic) return topic;
  }

  for (let i = input.history.length - 1; i >= 0; i -= 1) {
    const topic = entityToTopic(extractOrthoEntity(input.history[i]?.content ?? ''));
    if (topic) return topic;
  }

  return null;
}
