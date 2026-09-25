import * as assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import { scoreTrainingModule } from './generic-detector.js';
import { classifyModulePage } from './classify-page.js';
import { captureFrameSnapshot } from '../extraction/extract-frame.js';
import { analyzePageContext } from '../adapters/registry.js';
import { GenericAdapter } from '../adapters/generic-adapter.js';
import { detectLikelyPhi, redactSensitiveText } from '../privacy/redact.js';
import { planModuleAction } from '../actions/action-engine.js';
import { resolveSafetyOverride } from '../safety/safety.js';
import type { FrameSnapshot, ModuleState, PageContext } from '../types/module-state.js';

function documentFrom(html: string) {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  return document as Document;
}

function contextFromHtml(html: string, url = 'https://training.example/module'): PageContext {
  const documentRef = documentFrom(html);
  const snapshot: FrameSnapshot = captureFrameSnapshot(documentRef, url);
  snapshot.isTop = true;
  return { url, title: snapshot.title || 'Annual Safety Training', frames: [snapshot] };
}

const instructionHtml = `
  <h1>Annual Safety Training</h1>
  <p>This module covers hospital fire safety. Training courses use a lesson and progress tracker.</p>
  <div role="progressbar" aria-valuenow="4" aria-valuemax="12">4 of 12</div>
  <p>Slide 4 of 12</p>
  <button>Back</button>
  <button>Continue</button>
`;

const quizHtml = `
  <h1>Annual Safety Training</h1>
  <p>Knowledge Check</p>
  <p>Question 2 of 5. Which of the following is correct?</p>
  <label><input type="radio" name="q" /> A. Pull the alarm</label>
  <label><input type="radio" name="q" /> B. Hide the fire</label>
  <label><input type="radio" name="q" /> C. Ignore it</label>
  <button>Submit</button>
`;

const attestationHtml = `
  <h1>Annual Safety Training</h1>
  <p>I certify that I have completed this training and I acknowledge the policy.</p>
  <p>By clicking submit I agree to the attestation. Electronic signature required.</p>
  <button>I agree</button>
`;

const completionHtml = `
  <h1>Annual Safety Training</h1>
  <p>Course complete. Training completed. Congratulations. Certificate is available. Completion recorded.</p>
`;

const videoHtml = `
  <h1>Annual Safety Training</h1>
  <video controls></video>
  <button>Continue</button>
`;

// Generic module detection
{
  const low = scoreTrainingModule({
    text: 'hello world',
    hasProgressUi: false,
    hasNextPrevious: false,
    hasAssessmentUi: false,
    hasScormSignals: false,
    hasCoursePlayerIframe: false,
  });
  assert.equal(low.detected, false);

  const high = scoreTrainingModule({
    text: 'This training course lesson module has a quiz and SCORM player.',
    hasProgressUi: true,
    hasNextPrevious: true,
    hasAssessmentUi: true,
    hasScormSignals: true,
    hasCoursePlayerIframe: true,
  });
  assert.equal(high.detected, true);
  assert.ok(high.confidence >= 0.8);
  assert.ok(high.reasons.includes('progress indicator found'));
  assert.ok(high.reasons.includes('course navigation found'));
  assert.ok(high.reasons.includes('training terminology detected'));
}

// Navigation, quiz, progress extraction
{
  const instruction = contextFromHtml(instructionHtml);
  const extracted = GenericAdapter.extractState(instruction);
  assert.equal(extracted.pageType, 'instruction');
  assert.ok(GenericAdapter.findNext?.(instruction)?.text?.toLowerCase().includes('continue'));
  assert.ok(GenericAdapter.findPrevious?.(instruction)?.text?.toLowerCase().includes('back'));
  assert.equal(extracted.progress?.current, 4);
  assert.equal(extracted.progress?.total, 12);

  const quiz = captureFrameSnapshot(documentFrom(quizHtml), 'https://training.example/quiz');
  assert.ok(quiz.question);
  assert.ok(quiz.question.choices.length >= 2);
  assert.match(quiz.question.prompt, /knowledge check|which of the following/i);
}

// Page-type classification, attestation, completion
{
  assert.equal(classifyModulePage({
    text: 'Lots of instructional content about PPE and hand hygiene in this hospital course.',
    hasNextOrContinue: true,
    hasAnswerControls: false,
    hasVideo: false,
    question: null,
  }).pageType, 'instruction');

  assert.equal(classifyModulePage({
    text: 'I certify that I have completed this module.',
    hasNextOrContinue: true,
    hasAnswerControls: false,
    hasVideo: false,
    question: null,
  }).pageType, 'attestation');

  assert.equal(classifyModulePage({
    text: 'Course complete. Congratulations. Certificate ready.',
    hasNextOrContinue: false,
    hasAnswerControls: false,
    hasVideo: false,
    question: null,
  }).pageType, 'completion');

  const attestationState = analyzePageContext(contextFromHtml(attestationHtml));
  assert.equal(attestationState.pageType, 'attestation');
  const completionState = analyzePageContext(contextFromHtml(completionHtml));
  assert.equal(completionState.pageType, 'completion');
  const videoState = analyzePageContext(contextFromHtml(videoHtml));
  assert.equal(videoState.pageType, 'video');
}

// Sensitive-information redaction
{
  const raw = 'Patient: Jane Doe MRN: 9988771 DOB: 01/02/1980 called 555-123-4567 email jane@hospital.org Employee ID: 44B at 123 Main Street';
  const redacted = redactSensitiveText(raw);
  assert.equal(redacted.includes('Jane Doe'), false);
  assert.equal(redacted.includes('9988771'), false);
  assert.equal(redacted.includes('jane@hospital.org'), false);
  assert.equal(detectLikelyPhi(raw).likelyPhi, true);
}

// Action validation + safety overrides
{
  const attestationState: ModuleState = analyzePageContext(contextFromHtml(attestationHtml));
  const attestButton = attestationState.controls.find((control) => /agree|certify|submit/i.test(control.text ?? '')) ??
    attestationState.controls[0];
  assert.ok(attestButton);
  const aiClick = resolveSafetyOverride(attestationState, { type: 'CLICK', elementId: attestButton.elementId });
  assert.equal(aiClick?.type, 'USER_ACTION_REQUIRED');

  const planned = planModuleAction(attestationState, { type: 'CLICK', elementId: attestButton.elementId });
  assert.equal(planned.blocked, true);
  assert.equal(planned.action.type, 'USER_ACTION_REQUIRED');

  const quizState = analyzePageContext(contextFromHtml(quizHtml));
  const choice = quizState.question?.choices[1];
  assert.ok(choice);
  const silentSelect = planModuleAction(quizState, { type: 'SELECT', elementId: choice.elementId });
  assert.equal(silentSelect.blocked, true);
  assert.equal(silentSelect.action.type, 'USER_ACTION_REQUIRED');

  const confirmed = planModuleAction(quizState, { type: 'SELECT', elementId: choice.elementId, userConfirmed: true });
  assert.equal(confirmed.blocked ?? false, false);
  assert.equal(confirmed.action.type, 'SELECT');

  const unknown = planModuleAction(quizState, { type: 'NEXT', elementId: 'el_999' });
  assert.equal(unknown.ok, false);
}

console.log('Module Copilot Phase 1 tests passed.');
