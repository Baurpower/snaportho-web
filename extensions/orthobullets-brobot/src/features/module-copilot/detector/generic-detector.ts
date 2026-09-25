import type { DetectionResult } from '../types/module-state.js';

export const TRAINING_TERMS = [
  'training',
  'course',
  'lesson',
  'module',
  'continue',
  'next',
  'previous',
  'resume',
  'launch',
  'progress',
  'quiz',
  'assessment',
  'knowledge check',
  'question',
  'complete',
  'scorm',
  'certificate',
  'ce credit',
  'continuing education',
];

export const SCORM_TERMS = ['scorm', 'aicc', 'sco', 'lmsapi', 'apiwrapper', 'scormdriver', 'pipwerks'];

export const COURSE_PLAYER_TERMS = ['course-player', 'courseplayer', 'learning-player', 'content-player', 'scoframe'];

const PROGRESS_TEXT = /(\d+)\s*(?:of|\/)\s*(\d+)/i;
const PERCENT_TEXT = /(\d{1,3})\s*%/;

export function normalizeVisibleText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function textContainsAny(haystack: string, needles: string[]) {
  const lower = haystack.toLowerCase();
  return needles.filter((needle) => lower.includes(needle));
}

export function detectProgressFromText(text: string) {
  const ofMatch = text.match(PROGRESS_TEXT);
  const percentMatch = text.match(PERCENT_TEXT);
  const current = ofMatch ? Number(ofMatch[1]) : undefined;
  const total = ofMatch ? Number(ofMatch[2]) : undefined;
  const percent = percentMatch ? Number(percentMatch[1]) : undefined;
  if (current == null && total == null && percent == null) return null;
  return { current, total, percent };
}

export function scoreTrainingModule(input: {
  text: string;
  hasProgressUi: boolean;
  hasNextPrevious: boolean;
  hasAssessmentUi: boolean;
  hasScormSignals: boolean;
  hasCoursePlayerIframe: boolean;
}): DetectionResult {
  const text = normalizeVisibleText(input.text);
  const matchedTerms = textContainsAny(text, TRAINING_TERMS);
  let score = 0;
  const reasons: string[] = [];

  if (matchedTerms.length >= 2) {
    score += 15;
    reasons.push('training terminology detected');
  }
  if (input.hasProgressUi || detectProgressFromText(text)) {
    score += 20;
    reasons.push('progress indicator found');
  }
  if (input.hasNextPrevious) {
    score += 15;
    reasons.push('course navigation found');
  }
  if (input.hasAssessmentUi) {
    score += 20;
    reasons.push('assessment UI found');
  }
  if (input.hasScormSignals || textContainsAny(text, SCORM_TERMS).length) {
    score += 25;
    reasons.push('SCORM indicators found');
  }
  if (input.hasCoursePlayerIframe || textContainsAny(text, COURSE_PLAYER_TERMS).length) {
    score += 15;
    reasons.push('course-player iframe found');
  }

  const confidence = Math.min(1, Number((score / 110).toFixed(2)));
  return {
    detected: score >= 30,
    confidence,
    reasons,
  };
}
