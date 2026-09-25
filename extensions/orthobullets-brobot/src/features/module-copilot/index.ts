import { analyzePageContext } from './adapters/registry.js';
import { GenericAdapter } from './adapters/generic-adapter.js';
import { planModuleAction } from './actions/action-engine.js';
import { registerModuleAdapter, selectAdapter } from './adapters/registry.js';
import type { ModuleAction, ModuleState, PageContext } from './types/module-state.js';

let lastState: ModuleState | null = null;

export const moduleCopilot = {
  analyzePage(context: PageContext) {
    lastState = analyzePageContext(context);
    return lastState;
  },
  getState() {
    return lastState;
  },
  performAction(action: ModuleAction) {
    if (!lastState) {
      return {
        ok: false as const,
        action,
        method: 'generic-dom' as const,
        success: false,
        message: 'No module state is loaded.',
      };
    }
    return planModuleAction(lastState, action);
  },
};

export { GenericAdapter, analyzePageContext, registerModuleAdapter, selectAdapter };
export type { ModuleAction, ModuleState, PageContext };
