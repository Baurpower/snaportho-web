import { ATTESTATION_PHRASES } from '../detector/classify-page.js';
import type { ActionableElement, ControlKind, FrameSnapshot, ModuleProgress, QuizQuestion, VideoState } from '../types/module-state.js';
import { COURSE_PLAYER_TERMS, SCORM_TERMS, TRAINING_TERMS, detectProgressFromText, textContainsAny } from '../detector/generic-detector.js';

const NEXT_RE = /\b(next|continue|forward|resume|start|launch)\b/i;
const PREV_RE = /\b(back|previous|prev)\b/i;
const PLAY_RE = /\b(play|watch)\b/i;
const PAUSE_RE = /\b(pause)\b/i;
const SUBMIT_RE = /\b(submit|check answer|grade|finish)\b/i;
const QUESTION_RE = /question\s+(\d+)\s*(?:of|\/)\s*(\d+)/i;
const MAX_TEXT = 12_000;

function owningWindow(node: Node) {
  return node.ownerDocument?.defaultView ?? null;
}

function asHtmlElement(node: Element | null): HTMLElement | null {
  if (!node) return null;
  return node as HTMLElement;
}

export function readVisibleText(element: Element | Document) {
  const html = element as HTMLElement;
  const raw =
    typeof html.innerText === 'string' && html.innerText.trim()
      ? html.innerText
      : (html.textContent ?? '');
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

export function isLikelyVisible(element: Element) {
  const html = asHtmlElement(element);
  if (!html) return false;
  if (html.hidden || html.getAttribute('aria-hidden') === 'true') return false;
  const disabledAncestor = html.closest('[hidden],[aria-hidden="true"]');
  if (disabledAncestor && disabledAncestor !== html) return false;
  const styleAttr = html.getAttribute('style') ?? '';
  if (/display\s*:\s*none/i.test(styleAttr) || /visibility\s*:\s*hidden/i.test(styleAttr)) return false;
  const view = owningWindow(html);
  try {
    const computed = view?.getComputedStyle?.(html);
    if (computed && (computed.display === 'none' || computed.visibility === 'hidden')) return false;
  } catch {
    // linkedom and some frames do not implement getComputedStyle
  }
  return true;
}

function controlText(element: HTMLElement) {
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('value') ||
    element.getAttribute('title') ||
    readVisibleText(element)
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function classifyControlKind(element: HTMLElement, text: string): ControlKind {
  const combined = `${text} ${element.getAttribute('name') ?? ''}`.toLowerCase();
  if (ATTESTATION_PHRASES.some((phrase) => combined.includes(phrase))) return 'attestation';
  if (element.getAttribute('type') === 'radio' || element.getAttribute('type') === 'checkbox' || element.getAttribute('role') === 'radio') {
    return 'choice';
  }
  if (NEXT_RE.test(text) && !SUBMIT_RE.test(text)) return 'next';
  if (PREV_RE.test(text)) return 'previous';
  if (PLAY_RE.test(text)) return 'play';
  if (PAUSE_RE.test(text)) return 'pause';
  if (SUBMIT_RE.test(text) || element.getAttribute('type') === 'submit') return 'submit';
  return 'other';
}

function selectorCandidates(element: HTMLElement, elementId: string) {
  const candidates = [`[data-brobot-mc-id="${elementId}"]`];
  if (element.id) candidates.push(`#${CSS.escape ? CSS.escape(element.id) : element.id}`);
  const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
  if (testId) candidates.push(`[data-testid="${testId}"]`);
  return candidates;
}

function stampId(element: HTMLElement, elementId: string) {
  element.setAttribute('data-brobot-mc-id', elementId);
}

function nextId(index: number) {
  return `el_${String(index).padStart(3, '0')}`;
}

function extractControls(root: Document, startIndex = 1) {
  const nodes = [
    ...root.querySelectorAll(
      'button, [role="button"], input[type="button"], input[type="submit"], input[type="radio"], input[type="checkbox"], a, video, [aria-label]',
    ),
  ];
  const controls: ActionableElement[] = [];
  let index = startIndex;
  for (const node of nodes) {
    const element = asHtmlElement(node);
    if (!element) continue;
    const visible = isLikelyVisible(element);
    const text = controlText(element);
    if (!text && element.tagName !== 'VIDEO') continue;
    const elementId = nextId(index);
    index += 1;
    stampId(element, elementId);
    const enabled = !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true';
    controls.push({
      elementId,
      text: text || undefined,
      role: element.getAttribute('role') ?? undefined,
      tag: element.tagName.toLowerCase(),
      ariaLabel: element.getAttribute('aria-label') ?? undefined,
      type: element.getAttribute('type') ?? undefined,
      kind: element.tagName === 'VIDEO' ? 'play' : classifyControlKind(element, text),
      enabled,
      visible,
      selectorCandidates: selectorCandidates(element, elementId),
    });
  }
  return { controls, nextIndex: index };
}

function choiceLabel(input: HTMLElement) {
  const id = input.id;
  if (id) {
    const byFor = input.ownerDocument.querySelector(`label[for="${id}"]`);
    if (byFor) return readVisibleText(byFor);
  }
  const parentLabel = input.closest('label');
  if (parentLabel) return readVisibleText(parentLabel);
  return controlText(input);
}

export function extractQuestion(root: Document, controls: ActionableElement[]): QuizQuestion | null {
  const text = readVisibleText(root.body ?? root.documentElement);
  const choiceControls = controls.filter((control) => control.kind === 'choice' && control.visible);
  const radios = [...root.querySelectorAll('input[type="radio"]')].filter((node) => isLikelyVisible(node));
  const checkboxes = [...root.querySelectorAll('input[type="checkbox"]')].filter((node) => isLikelyVisible(node));
  const questionMatch = text.match(QUESTION_RE);
  const looksLikeQuestion =
    choiceControls.length >= 2 ||
    /\b(question|knowledge check|select all that apply|choose the best)\b/i.test(text);

  if (!looksLikeQuestion) return null;

  const inputs = (radios.length >= 2 ? radios : checkboxes.length >= 2 ? checkboxes : []) as HTMLElement[];
  const choices = inputs.map((input) => {
    const elementId = input.getAttribute('data-brobot-mc-id') || '';
    const label = choiceLabel(input);
    const letter = label.match(/^([A-D])[\).:\s]/i)?.[1]?.toUpperCase();
    return {
      elementId,
      label: letter || label.slice(0, 8),
      text: label,
      selected: Boolean((input as HTMLInputElement).checked),
    };
  }).filter((choice) => choice.elementId);

  if (choices.length < 2 && choiceControls.length < 2) return null;

  const promptSource =
    root.querySelector('[class*="question"], [id*="question"], h1, h2, legend, [role="heading"]') ??
    (root.body as Element | null);
  const prompt = promptSource ? readVisibleText(promptSource).slice(0, 600) : text.slice(0, 400);

  return {
    prompt,
    choices: choices.length >= 2 ? choices : choiceControls.map((control, index) => ({
      elementId: control.elementId,
      label: String.fromCharCode(65 + index),
      text: control.text ?? control.elementId,
      selected: false,
    })),
    multiSelect: checkboxes.length >= 2 && radios.length < 2,
    questionIndex: questionMatch ? Number(questionMatch[1]) : undefined,
    questionTotal: questionMatch ? Number(questionMatch[2]) : undefined,
  };
}

export function extractProgress(root: Document, text: string): ModuleProgress | null {
  const fromText = detectProgressFromText(text);
  const bar = root.querySelector('[role="progressbar"], progress, [class*="progress"]');
  const htmlBar = asHtmlElement(bar);
  const now = htmlBar?.getAttribute('aria-valuenow');
  const max = htmlBar?.getAttribute('aria-valuemax');
  const value = htmlBar && 'value' in htmlBar ? Number((htmlBar as HTMLProgressElement).value) : Number(now);
  const maximum = htmlBar && 'max' in htmlBar ? Number((htmlBar as HTMLProgressElement).max) : Number(max);
  const percent =
    Number.isFinite(value) && Number.isFinite(maximum) && maximum > 0
      ? Math.round((value / maximum) * 100)
      : fromText?.percent;
  if (!fromText && percent == null) return null;
  return {
    current: fromText?.current,
    total: fromText?.total,
    percent: percent ?? fromText?.percent,
  };
}

function extractVideos(root: Document, controls: ActionableElement[]): VideoState[] {
  return [...root.querySelectorAll('video')].map((node) => {
    const video = node as HTMLVideoElement;
    const stamped = controls.find((control) => control.tag === 'video' && control.elementId === video.getAttribute('data-brobot-mc-id'));
    return {
      elementId: stamped?.elementId ?? video.getAttribute('data-brobot-mc-id') ?? 'video',
      duration: Number.isFinite(video.duration) ? video.duration : null,
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : null,
      paused: typeof video.paused === 'boolean' ? video.paused : true,
      playbackRate: Number.isFinite(video.playbackRate) ? video.playbackRate : null,
    };
  });
}

function collectIframeSignals(root: Document) {
  const iframes = [...root.querySelectorAll('iframe')];
  let inaccessibleIframeCount = 0;
  let hasCoursePlayerIframe = false;
  for (const iframe of iframes) {
    const src = `${iframe.getAttribute('src') ?? ''} ${iframe.getAttribute('id') ?? ''} ${iframe.getAttribute('name') ?? ''} ${iframe.className}`;
    if (textContainsAny(src.toLowerCase(), [...COURSE_PLAYER_TERMS, ...SCORM_TERMS]).length) {
      hasCoursePlayerIframe = true;
    }
    try {
      const doc = (iframe as HTMLIFrameElement).contentDocument;
      if (!doc) inaccessibleIframeCount += 1;
    } catch {
      inaccessibleIframeCount += 1;
    }
  }
  return { iframeCount: iframes.length, inaccessibleIframeCount, hasCoursePlayerIframe };
}

export function captureFrameSnapshot(documentRef: Document, url = documentRef.URL || ''): FrameSnapshot {
  const root = documentRef;
  const title = root.title || '';
  const visibleText = readVisibleText(root.body ?? root.documentElement);
  const headings = [...root.querySelectorAll('h1, h2, h3')].map((node) => readVisibleText(node)).filter(Boolean).slice(0, 12);
  const { controls } = extractControls(root);
  const question = extractQuestion(root, controls);
  const progress = extractProgress(root, visibleText);
  const videos = extractVideos(root, controls);
  const iframeInfo = collectIframeSignals(root);
  const haystack = `${url} ${title} ${visibleText} ${headings.join(' ')}`;
  const moduleSignals = textContainsAny(haystack, TRAINING_TERMS);
  const scormSignals = textContainsAny(haystack, SCORM_TERMS);
  if (iframeInfo.hasCoursePlayerIframe) moduleSignals.push('course-player iframe');

  return {
    url,
    title,
    isTop: owningWindow(root.documentElement)?.top === owningWindow(root.documentElement),
    accessible: true,
    visibleText,
    headings,
    iframeCount: iframeInfo.iframeCount,
    inaccessibleIframeCount: iframeInfo.inaccessibleIframeCount,
    controls,
    question,
    progress,
    videos,
    moduleSignals: [...new Set(moduleSignals)],
    scormSignals: [...new Set(scormSignals)],
  };
}

export function clickStampedElement(documentRef: Document, elementId: string) {
  const element = documentRef.querySelector(`[data-brobot-mc-id="${elementId}"]`) as HTMLElement | null;
  if (!element) return { ok: false as const, error: 'Element is no longer on this page.' };
  if (!isLikelyVisible(element)) return { ok: false as const, error: 'Element is not visible.' };
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return { ok: false as const, error: 'Element is disabled.' };
  }
  if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) {
    element.checked = true;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  element.click();
  return { ok: true as const };
}
