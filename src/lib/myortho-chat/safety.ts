import type { MyOrthoChatResponse } from './schemas';

export type SafetyLevel = 'emergency' | 'contact_surgical_team' | null;

const EMERGENCY_PATTERNS = [
  /\b(chest pain|chest pressure)\b/i,
  /\b(can'?t breathe|cannot breathe|trouble breathing|short(ness)? of breath)\b/i,
  /\b(fainted|fainting|passed out|unconscious|severe confusion)\b/i,
  /\b(bleeding (won'?t|will not) stop|severe bleeding)\b/i,
  /\b(overdose|took too (many|much))\b/i,
  /\b(kill myself|suicide|self[- ]harm)\b/i,
];

const TEAM_PATTERNS = [
  /\b(calf pain|calf tenderness|calf swelling|one[- ]sided swelling)\b/i,
  /\b(wound|incision).{0,30}\b(drain|pus|opening|opened|red|redness|odor|smell)\b/i,
  /\b(fever|chills)\b/i,
  /\b(foot|feet|toe|toes).{0,30}\b(cold|cool|dark|blue|numb|can'?t move|cannot move)\b/i,
  /\b(pain).{0,30}\b(worse|worsening|uncontrolled|medicine (isn'?t|is not) working)\b/i,
  /\b(dressing|bandage).{0,30}\b(soaked|soaking|blood)\b/i,
];

export function classifySafety(message: string): SafetyLevel {
  if (EMERGENCY_PATTERNS.some((pattern) => pattern.test(message))) return 'emergency';
  if (TEAM_PATTERNS.some((pattern) => pattern.test(message))) return 'contact_surgical_team';
  return null;
}

export function emergencyResponse(): MyOrthoChatResponse {
  return {
    answer: 'These symptoms could be an emergency. Call emergency services now. Do not wait for a response in the app or try to drive yourself. If someone is with you, ask them to stay with you while help is on the way.',
    urgency: 'emergency',
    urgencyMessage: 'Call emergency services now.',
    sources: [
      { sourceId: 'aaos-total-knee-replacement', title: 'Total Knee Replacement', publisher: 'AAOS OrthoInfo', url: 'https://orthoinfo.aaos.org/en/treatment/total-knee-replacement/' },
      { sourceId: 'medlineplus-knee-discharge', title: 'Knee Joint Replacement—Discharge', publisher: 'MedlinePlus', url: 'https://medlineplus.gov/ency/patientinstructions/000170.htm' },
    ],
    relatedArticles: [],
    suggestedQuestions: [],
  };
}

export function enforceSafety(response: MyOrthoChatResponse, detected: SafetyLevel): MyOrthoChatResponse {
  if (detected === 'emergency') return emergencyResponse();
  if (detected === 'contact_surgical_team' && response.urgency !== 'emergency') {
    return {
      ...response,
      urgency: 'contact_surgical_team',
      urgencyMessage: response.urgencyMessage || 'Contact your surgical team promptly using the number in your discharge instructions.',
    };
  }
  return response;
}
