export type BroBotAnswerDisplayInput = {
  answer: string;
  detectedMode?: string;
  pearl?: string | null;
  pitfall?: string | null;
  whatMostResidentsMiss?: string[] | null;
  missingInformation?: string[] | null;
  consultConfidence?: 'low' | 'moderate' | 'high' | null;
};

export type BroBotAnswerDisplay = {
  showPearl: boolean;
  pearl: string | null;
  showPitfall: boolean;
  pitfall: string | null;
  residentsMiss: string[];
  consultMissing: string[];
  showLowConfidenceConsult: boolean;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isCoveredByAnswer(answer: string, text: string) {
  const needle = normalize(text);
  if (needle.length < 12) return false;
  return normalize(answer).includes(needle);
}

export function selectBroBotAnswerExtras(
  input: BroBotAnswerDisplayInput,
): BroBotAnswerDisplay {
  const answer = input.answer?.trim() ?? '';
  const pearl = input.pearl?.trim() || null;
  const pitfall = input.pitfall?.trim() || null;
  const isConsult = input.detectedMode === 'consult' || input.detectedMode === 'fracture_call';

  return {
    showPearl: Boolean(pearl && !isCoveredByAnswer(answer, pearl)),
    pearl,
    showPitfall: Boolean(pitfall && !isCoveredByAnswer(answer, pitfall)),
    pitfall,
    residentsMiss: (input.whatMostResidentsMiss ?? [])
      .map((item) => item.trim())
      .filter((item) => item && !isCoveredByAnswer(answer, item))
      .slice(0, 3),
    consultMissing: isConsult
      ? (input.missingInformation ?? [])
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [],
    showLowConfidenceConsult: isConsult && input.consultConfidence === 'low',
  };
}
