import { resolveSafetyOverride } from '../safety/safety.js';
import type { ActionResult, ModuleAction, ModuleState } from '../types/module-state.js';

export function validateModuleAction(action: ModuleAction, state: ModuleState) {
  if (action.type === 'USER_ACTION_REQUIRED' || action.type === 'WAIT' || action.type === 'SCROLL') {
    return { ok: true as const };
  }
  if (!('elementId' in action)) return { ok: true as const };
  const known = state.controls.some((control) => control.elementId === action.elementId);
  if (!known) {
    return { ok: false as const, error: 'Action refers to an unknown elementId.' };
  }
  return { ok: true as const };
}

export function planModuleAction(state: ModuleState, action: ModuleAction): ActionResult {
  const safety = resolveSafetyOverride(state, action);
  if (safety) {
    return {
      ok: true,
      action: safety,
      method: 'safety-override',
      success: false,
      blocked: true,
      message: safety.reason,
    };
  }

  const valid = validateModuleAction(action, state);
  if (!valid.ok) {
    return {
      ok: false,
      action,
      method: 'generic-dom',
      success: false,
      message: valid.error,
    };
  }

  return {
    ok: true,
    action,
    method: 'generic-dom',
    success: false,
    message: 'ready',
  };
}
