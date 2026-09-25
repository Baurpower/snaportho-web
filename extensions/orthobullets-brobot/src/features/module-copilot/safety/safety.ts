import { ATTESTATION_PHRASES } from '../detector/classify-page.js';
import type { ActionableElement, ModuleAction, ModuleState } from '../types/module-state.js';

export function isAttestationControl(control: ActionableElement | undefined, pageText = '') {
  if (!control) return false;
  if (control.kind === 'attestation') return true;
  const haystack = `${control.text ?? ''} ${control.ariaLabel ?? ''} ${pageText}`.toLowerCase();
  return ATTESTATION_PHRASES.some((phrase) => haystack.includes(phrase));
}

export function resolveSafetyOverride(
  state: ModuleState,
  action: ModuleAction,
): Extract<ModuleAction, { type: 'USER_ACTION_REQUIRED' }> | null {
  if (action.type === 'USER_ACTION_REQUIRED') return action;
  if (action.type === 'WAIT' || action.type === 'SCROLL') return null;

  if (state.pageType === 'attestation' && (action.type === 'CLICK' || action.type === 'NEXT' || action.type === 'SELECT')) {
    return {
      type: 'USER_ACTION_REQUIRED',
      reason: 'This screen requires personal acknowledgement or attestation.',
    };
  }

  const targetId = 'elementId' in action ? action.elementId : undefined;
  const target = state.controls.find((control) => control.elementId === targetId);
  if (isAttestationControl(target, state.visibleText)) {
    return {
      type: 'USER_ACTION_REQUIRED',
      reason: 'This screen requires personal acknowledgement or attestation.',
    };
  }

  if (
    (state.pageType === 'quiz' || state.pageType === 'knowledge_check') &&
    (action.type === 'SELECT' || (action.type === 'CLICK' && target?.kind === 'choice'))
  ) {
    const confirmed = action.type === 'SELECT' ? action.userConfirmed === true : false;
    if (!confirmed) {
      return {
        type: 'USER_ACTION_REQUIRED',
        reason: 'Assessment answers are not selected until you confirm.',
      };
    }
  }

  return null;
}
