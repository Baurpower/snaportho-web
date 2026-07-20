import type { BroBotEntityResolution, BroBotResolvedEntity } from './types';

type HandLexiconEntry = Omit<BroBotResolvedEntity, 'abbreviation' | 'specialty'>;

export const HAND_ABBREVIATION_LEXICON: Record<string, HandLexiconEntry[]> = {
  EIP: [{ expansion: 'extensor indicis proprius', type: 'tendon' }],
  EDC: [{ expansion: 'extensor digitorum communis', type: 'tendon' }],
  EPL: [{ expansion: 'extensor pollicis longus', type: 'tendon' }],
  EPB: [{ expansion: 'extensor pollicis brevis', type: 'tendon' }],
  APL: [{ expansion: 'abductor pollicis longus', type: 'tendon' }],
  FPL: [{ expansion: 'flexor pollicis longus', type: 'tendon' }],
  FDP: [{ expansion: 'flexor digitorum profundus', type: 'tendon' }],
  FDS: [{ expansion: 'flexor digitorum superficialis', type: 'tendon' }],
  APB: [{ expansion: 'abductor pollicis brevis', type: 'muscle' }],
  EDQ: [{ expansion: 'extensor digiti quinti', type: 'tendon' }],
  ECRB: [{ expansion: 'extensor carpi radialis brevis', type: 'tendon' }],
  ECRL: [{ expansion: 'extensor carpi radialis longus', type: 'tendon' }],
  FCU: [{ expansion: 'flexor carpi ulnaris', type: 'tendon' }],
  FCR: [{ expansion: 'flexor carpi radialis', type: 'tendon' }],
  PIN: [{ expansion: 'posterior interosseous nerve', type: 'nerve' }],
  AIN: [{ expansion: 'anterior interosseous nerve', type: 'nerve' }],
  MCP: [{ expansion: 'metacarpophalangeal joint', type: 'joint' }],
  CMC: [{ expansion: 'carpometacarpal joint', type: 'joint' }],
  IP: [{ expansion: 'interphalangeal joint', type: 'joint' }],
  DRUJ: [{ expansion: 'distal radioulnar joint', type: 'joint' }],
  TFCC: [{ expansion: 'triangular fibrocartilage complex', type: 'anatomy' }],
};

const RELATIONSHIP_PATTERN = /\b(to|transfer|tenodesis|repair|reconstruction|opponensplasty)\b/i;
const AMBIGUOUS_BARE_PATTERN = /^\s*(what (?:is|does)|define|meaning of)?\s*(IP|PIN|AIN)\s*(?:mean|stand for)?\s*[?.]*\s*$/i;

export function resolveBroBotEntities(message: string): BroBotEntityResolution {
  const upper = message.toUpperCase();
  const abbreviations = Object.keys(HAND_ABBREVIATION_LEXICON).filter((abbreviation) =>
    new RegExp(`\\b${abbreviation}\\b`, 'i').test(upper)
  );
  const entities = abbreviations.flatMap((abbreviation) =>
    HAND_ABBREVIATION_LEXICON[abbreviation].map((entry) => ({
      abbreviation,
      ...entry,
      specialty: 'hand_surgery' as const,
    }))
  );

  if (entities.length === 0) {
    return { state: 'unresolved', specialty: 'unknown', resolvedTopic: '', entities: [] };
  }

  if (AMBIGUOUS_BARE_PATTERN.test(message)) {
    const abbreviation = abbreviations[0];
    return {
      state: 'ambiguous',
      specialty: 'hand_surgery',
      resolvedTopic: abbreviation,
      entities,
      clarifyingQuestion:
        abbreviation === 'IP'
          ? 'Which interphalangeal joint and digit do you mean (thumb IP, PIP, or DIP)?'
          : `Are you asking about ${entities[0].expansion} anatomy, examination, syndrome, or a transfer?`,
    };
  }

  const transferEntities = entities.filter((entity) =>
    entity.type === 'tendon' || entity.type === 'muscle' || entity.type === 'nerve'
  );
  let relationship: string | undefined;
  let resolvedTopic = entities.map((entity) => entity.abbreviation).join(' / ');

  if (transferEntities.length >= 2) {
    if (!RELATIONSHIP_PATTERN.test(message)) {
      return {
        state: 'ambiguous',
        specialty: 'hand_surgery',
        resolvedTopic,
        entities,
        clarifyingQuestion: `What relationship are you asking about between ${transferEntities
          .map((entity) => entity.abbreviation)
          .join(' and ')}—anatomy, examination, injury, or tendon transfer?`,
      };
    }
    relationship = /\bEIP\b[\s\S]*\bAPB\b/i.test(message)
      ? 'EIP opponensplasty (EIP tendon transfer to restore thumb opposition/APB function)'
      : 'hand tendon, muscle, or nerve transfer';
    resolvedTopic = relationship;
  }

  return {
    state: 'resolved',
    specialty: 'hand_surgery',
    resolvedTopic,
    entities,
    relationship,
  };
}
