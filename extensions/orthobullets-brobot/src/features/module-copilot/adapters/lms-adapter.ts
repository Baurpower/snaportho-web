import type { ActionableElement, FrameSnapshot, ModuleProgress, ModuleState, PageContext, QuizQuestion } from '../types/module-state.js';

export interface LMSAdapter {
  id: string;
  detect(context: PageContext): number;
  extractState(context: PageContext): ModuleState;
  findNext?(context: PageContext): ActionableElement | null;
  findPrevious?(context: PageContext): ActionableElement | null;
  extractQuestion?(context: PageContext): QuizQuestion | null;
  extractProgress?(context: PageContext): ModuleProgress | null;
}

export function flattenControls(frames: FrameSnapshot[]) {
  return frames.flatMap((frame) => frame.controls);
}

export function strongestQuestion(frames: FrameSnapshot[]) {
  return frames.find((frame) => frame.question && frame.question.choices.length >= 2)?.question ?? null;
}

export function strongestProgress(frames: FrameSnapshot[]) {
  return frames.find((frame) => frame.progress)?.progress ?? null;
}

export function firstVideo(frames: FrameSnapshot[]) {
  return frames.find((frame) => frame.videos.length)?.videos[0];
}
