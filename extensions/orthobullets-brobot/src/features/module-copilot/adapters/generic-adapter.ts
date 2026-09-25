import { classifyModulePage } from '../detector/classify-page.js';
import { scoreTrainingModule } from '../detector/generic-detector.js';
import { detectLikelyPhi } from '../privacy/redact.js';
import type { ActionableElement, ModuleState, PageContext, SafetyFlag } from '../types/module-state.js';
import { firstVideo, flattenControls, strongestProgress, strongestQuestion, type LMSAdapter } from './lms-adapter.js';

function pickTitle(context: PageContext) {
  const top = context.frames.find((frame) => frame.isTop) ?? context.frames[0];
  return top?.headings[0] || top?.title || context.title || undefined;
}

export function findControlByKind(controls: ActionableElement[], kind: ActionableElement['kind']) {
  return controls.find((control) => control.kind === kind && control.visible && control.enabled) ?? null;
}

export const GenericAdapter: LMSAdapter = {
  id: 'generic',

  detect(context) {
    const text = context.frames.map((frame) => frame.visibleText).join('\n');
    const controls = flattenControls(context.frames);
    const detection = scoreTrainingModule({
      text,
      hasProgressUi: Boolean(strongestProgress(context.frames)),
      hasNextPrevious: Boolean(findControlByKind(controls, 'next') || findControlByKind(controls, 'previous')),
      hasAssessmentUi: Boolean(strongestQuestion(context.frames)),
      hasScormSignals: context.frames.some((frame) => frame.scormSignals.length > 0),
      hasCoursePlayerIframe: context.frames.some((frame) => frame.moduleSignals.includes('course-player iframe')),
    });
    return detection.confidence;
  },

  extractState(context): ModuleState {
    const text = context.frames.map((frame) => frame.visibleText).join('\n');
    const controls = flattenControls(context.frames);
    const question = strongestQuestion(context.frames);
    const progress = strongestProgress(context.frames);
    const video = firstVideo(context.frames);
    const detection = scoreTrainingModule({
      text,
      hasProgressUi: Boolean(progress),
      hasNextPrevious: Boolean(findControlByKind(controls, 'next') || findControlByKind(controls, 'previous')),
      hasAssessmentUi: Boolean(question),
      hasScormSignals: context.frames.some((frame) => frame.scormSignals.length > 0),
      hasCoursePlayerIframe: context.frames.some((frame) => frame.moduleSignals.includes('course-player iframe')),
    });
    const page = classifyModulePage({
      text,
      hasNextOrContinue: Boolean(findControlByKind(controls, 'next')),
      hasAnswerControls: Boolean(question),
      hasVideo: Boolean(video),
      question,
    });
    const phi = detectLikelyPhi(text);
    const safetyFlags: SafetyFlag[] = [];
    if (page.pageType === 'attestation') {
      safetyFlags.push({
        code: 'attestation_required',
        message: 'This screen requires personal acknowledgement or attestation.',
      });
    }
    if (page.pageType === 'quiz' || page.pageType === 'knowledge_check') {
      safetyFlags.push({
        code: 'assessment_requires_confirmation',
        message: 'Assessment answers are not selected until you confirm.',
      });
    }
    if (phi.likelyPhi) {
      safetyFlags.push({
        code: 'possible_phi',
        message: 'Possible sensitive identifiers were detected. Content stays local in Phase 1.',
      });
    }
    if (context.frames.some((frame) => frame.scormSignals.length)) {
      safetyFlags.push({
        code: 'scorm_runtime_present',
        message: 'SCORM signals were found. Completion variables will not be modified.',
      });
    }
    if (context.frames.some((frame) => frame.inaccessibleIframeCount > 0)) {
      safetyFlags.push({
        code: 'inaccessible_frame',
        message: 'At least one iframe could not be inspected.',
      });
    }

    const platform = context.frames.some((frame) => frame.scormSignals.length) ? 'scorm' : detection.detected ? 'generic' : 'unknown';

    return {
      detected: detection.detected,
      confidence: detection.confidence,
      detectionReasons: detection.reasons,
      platform,
      adapterId: this.id,
      adapterConfidence: detection.confidence,
      moduleTitle: pickTitle(context),
      sectionTitle: context.frames.find((frame) => frame.isTop)?.headings[1],
      pageType: page.pageType,
      visibleText: phi.redacted.slice(0, 8000),
      progress: progress ?? undefined,
      controls,
      question: question ?? undefined,
      video,
      frames: context.frames.map((frame, index) => ({
        frameId: frame.controls[0]?.frameId,
        url: frame.url,
        depth: frame.isTop ? 0 : index,
        accessible: frame.accessible,
        textLength: frame.visibleText.length,
        controls: frame.controls,
        moduleSignals: frame.moduleSignals,
      })),
      safetyFlags,
      tabId: context.tabId,
      pageUrl: context.url,
    };
  },

  findNext(context) {
    return findControlByKind(flattenControls(context.frames), 'next');
  },

  findPrevious(context) {
    return findControlByKind(flattenControls(context.frames), 'previous');
  },

  extractQuestion(context) {
    return strongestQuestion(context.frames);
  },

  extractProgress(context) {
    return strongestProgress(context.frames);
  },
};
