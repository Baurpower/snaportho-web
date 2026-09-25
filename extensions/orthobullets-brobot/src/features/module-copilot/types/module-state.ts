export type ModulePageType =
  | 'instruction'
  | 'video'
  | 'quiz'
  | 'knowledge_check'
  | 'attestation'
  | 'completion'
  | 'unknown';

export type ModulePlatform =
  | 'healthstream'
  | 'relias'
  | 'cornerstone'
  | 'workday'
  | 'scorm'
  | 'articulate'
  | 'generic'
  | 'unknown';

export type ControlKind =
  | 'next'
  | 'previous'
  | 'choice'
  | 'submit'
  | 'play'
  | 'pause'
  | 'attestation'
  | 'other';

export interface ActionableElement {
  elementId: string;
  text?: string;
  role?: string;
  tag?: string;
  ariaLabel?: string;
  type?: string;
  kind: ControlKind;
  enabled: boolean;
  visible: boolean;
  frameId?: number;
  selectorCandidates?: string[];
}

export interface QuizChoice {
  elementId: string;
  label: string;
  text: string;
  selected: boolean;
}

export interface QuizQuestion {
  prompt: string;
  choices: QuizChoice[];
  multiSelect: boolean;
  questionIndex?: number;
  questionTotal?: number;
}

export interface VideoState {
  elementId: string;
  duration?: number | null;
  currentTime?: number | null;
  paused?: boolean;
  playbackRate?: number | null;
}

export interface ModuleProgress {
  current?: number;
  total?: number;
  percent?: number;
}

export type SafetyFlagCode =
  | 'attestation_required'
  | 'assessment_requires_confirmation'
  | 'possible_phi'
  | 'scorm_runtime_present'
  | 'timer_detected'
  | 'inaccessible_frame';

export interface SafetyFlag {
  code: SafetyFlagCode;
  message: string;
}

export interface FrameState {
  frameId?: number;
  url?: string;
  depth: number;
  accessible: boolean;
  textLength: number;
  controls: ActionableElement[];
  moduleSignals: string[];
}

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  reasons: string[];
}

export interface ModuleState {
  detected: boolean;
  confidence: number;
  detectionReasons: string[];
  platform: ModulePlatform;
  adapterId: string;
  adapterConfidence: number;
  moduleTitle?: string;
  sectionTitle?: string;
  pageType: ModulePageType;
  visibleText: string;
  progress?: ModuleProgress;
  controls: ActionableElement[];
  question?: QuizQuestion;
  video?: VideoState;
  frames: FrameState[];
  safetyFlags: SafetyFlag[];
  tabId?: number;
  pageUrl?: string;
}

export type ModuleAction =
  | { type: 'NEXT'; elementId: string }
  | { type: 'PREVIOUS'; elementId: string }
  | { type: 'CLICK'; elementId: string }
  | { type: 'SELECT'; elementId: string; userConfirmed?: boolean }
  | { type: 'SCROLL'; direction: 'up' | 'down' }
  | { type: 'PLAY'; elementId: string }
  | { type: 'PAUSE'; elementId: string }
  | { type: 'WAIT' }
  | { type: 'USER_ACTION_REQUIRED'; reason: string };

export interface ActionResult {
  ok: boolean;
  action: ModuleAction;
  method: 'known-selector' | 'generic-dom' | 'safety-override' | 'user-required';
  success: boolean;
  blocked?: boolean;
  message?: string;
}

export interface FrameSnapshot {
  url: string;
  title: string;
  isTop: boolean;
  accessible: boolean;
  visibleText: string;
  headings: string[];
  iframeCount: number;
  inaccessibleIframeCount: number;
  controls: ActionableElement[];
  question: QuizQuestion | null;
  progress: ModuleProgress | null;
  videos: VideoState[];
  moduleSignals: string[];
  scormSignals: string[];
}

export interface PageContext {
  tabId?: number;
  url: string;
  title: string;
  frames: FrameSnapshot[];
}
