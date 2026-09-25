import { analyzePageContext } from '../adapters/registry.js';
import { planModuleAction } from '../actions/action-engine.js';
import { logModuleCopilot } from '../logging.js';
import type { ActionResult, FrameSnapshot, ModuleAction, ModuleState, PageContext } from '../types/module-state.js';

const CONTENT_SCRIPT_FILE = 'features/module-copilot/content/module-copilot-content.js';

const lastStateByTab = new Map<number, ModuleState>();

function asSnapshot(value: unknown, frameId?: number): FrameSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as FrameSnapshot;
  if (!Array.isArray(snapshot.controls)) return null;
  return {
    ...snapshot,
    controls: snapshot.controls.map((control) => ({ ...control, frameId })),
  };
}

async function injectAnalyzer(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [CONTENT_SCRIPT_FILE],
    });
    return { ok: true as const, error: null };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Could not inspect this tab. Click the BroBot icon on the page, then analyze again.',
    };
  }
}

export async function analyzeTab(tabId: number): Promise<ModuleState> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const injection = await injectAnalyzer(tabId);
  if (!injection.ok) {
    const state: ModuleState = {
      detected: false,
      confidence: 0,
      detectionReasons: [],
      platform: 'unknown',
      adapterId: 'generic',
      adapterConfidence: 0,
      pageType: 'unknown',
      visibleText: '',
      controls: [],
      frames: [],
      safetyFlags: [],
      tabId,
      pageUrl: tab?.url,
    };
    lastStateByTab.set(tabId, state);
    throw new Error(
      injection.error ||
        'Could not inspect this tab. Click the BroBot toolbar icon while this tab is focused, then try again.',
    );
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => {
      const api = (globalThis as { __brobotModuleCopilot?: { captureFrame: () => FrameSnapshot } }).__brobotModuleCopilot;
      return api ? api.captureFrame() : null;
    },
  });

  const frames = results
    .map((entry: { frameId?: number; result?: unknown }) => asSnapshot(entry.result, entry.frameId))
    .filter((frame: FrameSnapshot | null): frame is FrameSnapshot => Boolean(frame));

  const context: PageContext = {
    tabId,
    url: tab?.url ?? frames.find((frame) => frame.isTop)?.url ?? '',
    title: tab?.title ?? frames.find((frame) => frame.isTop)?.title ?? '',
    frames,
  };

  const state = {
    ...analyzePageContext(context),
    tabId,
    pageUrl: context.url,
  };
  lastStateByTab.set(tabId, state);
  logModuleCopilot({
    platform: state.platform,
    pageType: state.pageType,
    adapter: state.adapterId,
    adapterConfidence: state.adapterConfidence,
    detected: state.detected,
    confidence: state.confidence,
    frameCount: state.frames.length,
    controlCount: state.controls.length,
    method: 'generic-dom',
  });
  return state;
}

export function getModuleCopilotState(tabId: number) {
  return lastStateByTab.get(tabId) ?? null;
}

export async function performModuleAction(tabId: number, action: ModuleAction): Promise<ActionResult> {
  const state = lastStateByTab.get(tabId);
  if (!state) {
    return {
      ok: false,
      action,
      method: 'generic-dom',
      success: false,
      message: 'Analyze the tab before performing an action.',
    };
  }

  const planned = planModuleAction(state, action);
  if (planned.blocked || !planned.ok || planned.action.type === 'USER_ACTION_REQUIRED') {
    logModuleCopilot({
      platform: state.platform,
      pageType: state.pageType,
      adapter: state.adapterId,
      adapterConfidence: state.adapterConfidence,
      action: planned.action.type,
      method: planned.method,
      success: false,
    });
    return planned;
  }

  if (planned.action.type === 'WAIT') {
    return { ...planned, success: true };
  }

  if (planned.action.type === 'SCROLL') {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (direction: 'up' | 'down') => {
        window.scrollBy({ top: direction === 'down' ? 400 : -400, behavior: 'smooth' });
      },
      args: [planned.action.direction],
    });
    return { ...planned, success: true, method: 'generic-dom' };
  }

  if (!('elementId' in planned.action)) {
    return planned;
  }

  const target = state.controls.find((control) => control.elementId === planned.action.elementId);
  const frameIds = typeof target?.frameId === 'number' ? [target.frameId] : undefined;
  const clickResults = await chrome.scripting.executeScript({
    target: frameIds ? { tabId, frameIds } : { tabId, allFrames: true },
    func: (elementId: string) => {
      const api = (globalThis as { __brobotModuleCopilot?: { click: (id: string) => { ok: boolean; error?: string } } })
        .__brobotModuleCopilot;
      return api ? api.click(elementId) : { ok: false, error: 'Analyzer is not installed in this frame.' };
    },
    args: [planned.action.elementId],
  });

  const clickResult = clickResults.find((entry: { result?: { ok?: boolean } }) => entry.result?.ok)?.result ??
    clickResults[0]?.result ?? { ok: false, error: 'Click did not run.' };

  const success = Boolean(clickResult && 'ok' in clickResult && clickResult.ok);
  logModuleCopilot({
    platform: state.platform,
    pageType: state.pageType,
    adapter: state.adapterId,
    adapterConfidence: state.adapterConfidence,
    action: planned.action.type,
    elementId: planned.action.elementId,
    method: 'generic-dom',
    success,
  });
  return {
    ...planned,
    success,
    message: success ? undefined : (clickResult as { error?: string })?.error ?? 'Click failed.',
  };
}
