import { GenericAdapter } from './generic-adapter.js';
import type { LMSAdapter } from './lms-adapter.js';
import type { ModuleState, PageContext } from '../types/module-state.js';

const adapters: LMSAdapter[] = [GenericAdapter];

export function registerModuleAdapter(adapter: LMSAdapter) {
  if (!adapters.some((candidate) => candidate.id === adapter.id)) {
    adapters.push(adapter);
  }
}

export function selectAdapter(context: PageContext): LMSAdapter {
  let best = GenericAdapter;
  let bestScore = GenericAdapter.detect(context);
  for (const adapter of adapters) {
    if (adapter.id === GenericAdapter.id) continue;
    const score = adapter.detect(context);
    if (score > bestScore) {
      best = adapter;
      bestScore = score;
    }
  }
  return best;
}

export function analyzePageContext(context: PageContext): ModuleState {
  const adapter = selectAdapter(context);
  const state = adapter.extractState(context);
  return {
    ...state,
    adapterId: adapter.id,
    adapterConfidence: adapter.detect(context),
  };
}
