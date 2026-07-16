export type MeasuredStyleSignals = {
  emDashCount: number;
  emDashConcern: 'minor_concern' | 'worth_reviewing' | 'likely_noticeable';
  sentenceCount: number;
  sentenceLengthMean: number;
  sentenceLengthStandardDeviation: number;
  sentenceLengthCoefficientOfVariation: number;
  shortDramaticSentenceCount: number;
  tedTalkCueCount: number;
  abstractVirtueMentions: Record<string, number>;
  consultantPhraseMatches: string[];
  marketingPhraseMatches: string[];
  orthopaedicClicheMatches: string[];
  reflectionCueCount: number;
  threePartListCount: number;
  contrastStructureCount: number;
};

const VIRTUES = ['resilience', 'grit', 'leadership', 'teamwork', 'empathy', 'dedication', 'perseverance'] as const;
const CONSULTANT = ['drove impact', 'fostered collaboration', 'created meaningful change', 'empowered others', 'optimized workflow', 'stakeholder engagement'];
const MARKETING = ['transformative experience', 'lifelong passion', 'unique perspective', 'unwavering commitment', 'deeply meaningful journey'];
const ORTHO_CLICHES = ['fixing things with my hands', 'mechanics and medicine', 'restoring function', 'return to what they love', 'teamwork in the or', 'orthopaedics combines'];
const TED_CUES = ['what i learned was', 'what i discovered', 'what mattered most'];
const REFLECTION_CUES = ['this experience taught me', 'i came to appreciate', 'i realized', 'i learned that', 'i discovered that', 'this taught me'];

function matches(text: string, phrases: readonly string[]) {
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase));
}

function countPhraseOccurrences(text: string, phrases: readonly string[]) {
  const lower = text.toLowerCase();
  return phrases.reduce((total, phrase) => total + lower.split(phrase).length - 1, 0);
}

export function extractMeasuredStyleSignals(text: string): MeasuredStyleSignals {
  const sentences = text.split(/(?<=[.!?])\s+/u).map((item) => item.trim()).filter(Boolean);
  const lengths = sentences.map((sentence) => sentence.split(/\s+/u).filter(Boolean).length);
  const mean = lengths.length ? lengths.reduce((sum, length) => sum + length, 0) / lengths.length : 0;
  const variance = lengths.length ? lengths.reduce((sum, length) => sum + ((length - mean) ** 2), 0) / lengths.length : 0;
  const emDashCount = (text.match(/—/gu) || []).length;
  const lower = text.toLowerCase();
  const abstractVirtueMentions = Object.fromEntries(VIRTUES.map((virtue) => [virtue, (lower.match(new RegExp(`\\b${virtue}\\b`, 'gu')) || []).length]));
  return {
    emDashCount,
    emDashConcern: emDashCount > 5 ? 'likely_noticeable' : emDashCount >= 3 ? 'worth_reviewing' : 'minor_concern',
    sentenceCount: sentences.length,
    sentenceLengthMean: Number(mean.toFixed(1)),
    sentenceLengthStandardDeviation: Number(Math.sqrt(variance).toFixed(1)),
    sentenceLengthCoefficientOfVariation: mean ? Number((Math.sqrt(variance) / mean).toFixed(2)) : 0,
    shortDramaticSentenceCount: lengths.filter((length) => length > 0 && length <= 5).length,
    tedTalkCueCount: countPhraseOccurrences(text, TED_CUES),
    abstractVirtueMentions,
    consultantPhraseMatches: matches(text, CONSULTANT),
    marketingPhraseMatches: matches(text, MARKETING),
    orthopaedicClicheMatches: matches(text, ORTHO_CLICHES),
    reflectionCueCount: countPhraseOccurrences(text, REFLECTION_CUES),
    threePartListCount: (text.match(/\b[^,.;:]{2,50},\s+[^,.;:]{2,50},\s+(?:and|or)\s+[^,.;:]{2,50}/giu) || []).length,
    contrastStructureCount: (text.match(/\b(?:not\s+[^,.!?;]{1,80},?\s+but|more than\s+[^,.!?;]{1,80},?\s+(?:it|this|that)\s+was|wasn't\s+[^,.!?;]{1,80},?\s+(?:it|this|that)\s+was)/giu) || []).length,
  };
}
