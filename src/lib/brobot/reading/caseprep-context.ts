import type { BroBotTrainingLevel } from '@/lib/brobot/chat/types';

import { normalizeReadingTopic } from './ranker';
import type { ReadingTopicContext } from './topic-context';

const PROCEDURE_SUFFIXES = [
  /\bopen reduction(?: and)? internal fixation\b/gi,
  /\borif\b/gi,
  /\boperative fixation\b/gi,
  /\binternal fixation\b/gi,
  /\breconstruction\b/gi,
  /\brepair\b/gi,
  /\brelease\b/gi,
  /\barthroplasty\b/gi,
];

function clean(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseClinicalTopic(value: string) {
  let result = value;
  for (const pattern of PROCEDURE_SUFFIXES)
    result = result.replace(pattern, ' ');
  return result.replace(/\s+/g, ' ').trim();
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function preferredProcedureTerms(value: string) {
  const normalized = value.toLowerCase();
  const terms = ['management', 'treatment'];
  if (/fracture|orif|fixation/.test(normalized)) {
    terms.push('operative fixation', 'surgical technique', 'complications');
  }
  if (/arthroplasty|replacement/.test(normalized))
    terms.push('implant selection', 'surgical technique');
  if (/repair|reconstruction/.test(normalized))
    terms.push('outcomes', 'surgical technique');
  return unique(terms);
}

export function buildCasePrepReadingTopic(input: {
  canonicalSlug: string;
  displayName: string;
  requestedCase?: string | null;
  specialty?: string | null;
  region?: string | null;
  procedureType?: string | null;
  trainingLevel?: string | null;
}): ReadingTopicContext {
  const displayName = clean(input.displayName) || clean(input.canonicalSlug);
  const slugPhrase = clean(input.canonicalSlug);
  const requestedCase = clean(input.requestedCase);
  const baseTopic = baseClinicalTopic(displayName) || displayName;
  const aliases = unique([baseTopic, displayName, slugPhrase, requestedCase]);
  const topicKey =
    normalizeReadingTopic(input.canonicalSlug || displayName) || 'orthopaedics';
  const tags = unique([
    topicKey,
    input.specialty,
    input.region,
    input.procedureType,
    ...aliases.map(normalizeReadingTopic),
  ]);

  return {
    topicKey,
    displayTopic: displayName,
    primaryQuery: `"${baseTopic.replace(/"/g, '')}"`,
    aliases,
    synonyms: aliases,
    requiredTerms: unique([baseTopic, displayName]),
    preferredTerms: preferredProcedureTerms(`${displayName} ${requestedCase}`),
    excludedTerms: [],
    exclusions: [],
    pubmedQueryFocus: unique([baseTopic, displayName]).slice(0, 3),
    mode: 'or_prep',
    trainingLevel: (input.trainingLevel || 'pgy2') as BroBotTrainingLevel,
    tags,
    comparisonRequested: false,
    procedureCategory: clean(input.procedureType) || undefined,
  };
}
