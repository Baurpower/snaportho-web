import type { ActionResult, ModuleAction, ModuleState } from '../types/module-state.js';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function progressBar(percent?: number) {
  const width = Math.max(0, Math.min(100, percent ?? 0));
  const label = percent == null ? 'Unknown' : `${Math.round(percent)}%`;
  return `<div style="display:grid;gap:6px;">
    <div style="height:10px;border-radius:999px;background:#e7e0d3;overflow:hidden;">
      <div style="width:${width}%;height:100%;background:#0f766e;"></div>
    </div>
    <p style="margin:0;font-size:12px;color:#5c6574;">${escapeHtml(label)}</p>
  </div>`;
}

function buttonStyle(primary = false, disabled = false) {
  if (disabled) {
    return 'border:1px solid #d2cab8;border-radius:999px;background:#e2e8f0;color:#64748b;padding:10px 14px;font-weight:700;cursor:default;';
  }
  if (primary) {
    return 'border:none;border-radius:999px;background:#0f766e;color:white;padding:10px 14px;font-weight:700;cursor:pointer;';
  }
  return 'border:1px solid #d2cab8;border-radius:999px;background:#f7f5ef;color:#18202b;padding:10px 14px;font-weight:700;cursor:pointer;';
}

export function appendModuleCopilotPanel(
  root: HTMLElement,
  input: {
    analyzing: boolean;
    actionBusy: boolean;
    error: string | null;
    moduleState: ModuleState | null;
    lastAction: ActionResult | null;
    onAnalyze: () => void;
    onNavigate: (action: Extract<ModuleAction, { type: 'NEXT' | 'PREVIOUS' }>) => void;
  },
) {
  const state = input.moduleState;
  const next = state?.controls.find((control) => control.kind === 'next' && control.visible && control.enabled);
  const previous = state?.controls.find((control) => control.kind === 'previous' && control.visible && control.enabled);
  const percent = state?.progress?.percent;
  const progressLabel =
    state?.progress?.current != null && state?.progress?.total != null
      ? `${state.progress.current} / ${state.progress.total}`
      : percent != null
        ? `${Math.round(percent)}%`
        : 'Unknown';

  const card = document.createElement('div');
  card.innerHTML = `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:12px;">
    <div>
      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0f766e;font-weight:700;">Module Copilot</p>
      <p style="margin:6px 0 0;color:#384152;line-height:1.5;">Analyzes the current tab only after you click. No AI automation in Phase 1.</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="mc-analyze" ${input.analyzing ? 'disabled' : ''} style="${buttonStyle(true, input.analyzing)}">${input.analyzing ? 'Analyzing…' : 'Analyze this tab'}</button>
    </div>
    ${input.error ? `<p style="margin:0;color:#9a3412;line-height:1.45;">${escapeHtml(input.error)}</p>` : ''}
  </div>`;
  root.appendChild(card);
  card.querySelector('#mc-analyze')?.addEventListener('click', () => input.onAnalyze());

  if (!state && !input.analyzing && !input.error) {
    return;
  }

  if (state && !state.detected) {
    const empty = document.createElement('div');
    empty.innerHTML = `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:8px;">
      <p style="margin:0;font-weight:700;">No training module detected.</p>
      <p style="margin:0;color:#5c6574;line-height:1.5;">Confidence ${Math.round(state.confidence * 100)}%. Open a hospital training module, then analyze again.</p>
    </div>`;
    root.appendChild(empty);
    return;
  }

  if (!state) return;

  const result = document.createElement('div');
  result.innerHTML = `<div style="padding:14px;border-radius:16px;background:white;border:1px solid #ded7c8;display:grid;gap:12px;">
    <div>
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">Module detected</p>
      <h2 style="margin:6px 0 0;font-size:20px;line-height:1.25;">${escapeHtml(state.moduleTitle || 'Untitled module')}</h2>
    </div>
    <div style="display:grid;gap:6px;">
      <p style="margin:0;"><strong>Platform:</strong> ${escapeHtml(state.platform === 'scorm' ? 'SCORM' : 'Generic')}</p>
      <p style="margin:0;"><strong>Confidence:</strong> ${Math.round(state.confidence * 100)}%</p>
      <p style="margin:0;"><strong>Page type:</strong> ${escapeHtml(state.pageType.replaceAll('_', ' '))}</p>
      <p style="margin:0;"><strong>Progress:</strong> ${escapeHtml(progressLabel)}</p>
    </div>
    ${progressBar(percent)}
    <p style="margin:0;font-size:12px;color:#5c6574;">${escapeHtml(state.detectionReasons.join(' · ') || 'generic detector')}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="mc-back" ${!previous || input.actionBusy ? 'disabled' : ''} style="${buttonStyle(false, !previous || input.actionBusy)}">Back</button>
      <button id="mc-continue" ${!next || input.actionBusy ? 'disabled' : ''} style="${buttonStyle(true, !next || input.actionBusy)}">Continue</button>
    </div>
    ${
      state.pageType === 'attestation'
        ? '<p style="margin:0;color:#9a3412;line-height:1.45;">This screen requires you to personally acknowledge or attest. BroBot will not click it for you.</p>'
        : ''
    }
    ${
      state.question
        ? `<div style="display:grid;gap:6px;padding:10px;border-radius:12px;background:#f7f5ef;border:1px solid #ded7c8;">
            <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">${state.pageType === 'knowledge_check' ? 'Knowledge check' : 'Question'}</p>
            <p style="margin:0;line-height:1.5;">${escapeHtml(state.question.prompt.slice(0, 400))}</p>
            <ul style="margin:0;padding-left:18px;display:grid;gap:4px;">${state.question.choices
              .map((choice) => `<li>${escapeHtml(choice.label)}. ${escapeHtml(choice.text)}</li>`)
              .join('')}</ul>
            <p style="margin:0;font-size:12px;color:#5c6574;">Answer suggestions are not enabled in Phase 1.</p>
          </div>`
        : ''
    }
    <div>
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6574;font-weight:700;">Controls</p>
      <p style="margin:0;color:#384152;line-height:1.5;">${
        state.controls.filter((control) => control.visible).length
          ? escapeHtml(
              state.controls
                .filter((control) => control.visible)
                .slice(0, 8)
                .map((control) => `${control.elementId} → ${control.text || control.kind}`)
                .join(' · '),
            )
          : 'None detected'
      }</p>
    </div>
    ${
      input.lastAction?.blocked
        ? `<p style="margin:0;color:#9a3412;">${escapeHtml(input.lastAction.message ?? 'Action blocked by safety rules.')}</p>`
        : input.lastAction && !input.lastAction.success && input.lastAction.message
          ? `<p style="margin:0;color:#9a3412;">${escapeHtml(input.lastAction.message)}</p>`
          : ''
    }
  </div>`;
  root.appendChild(result);
  result.querySelector('#mc-back')?.addEventListener('click', () => {
    if (!previous) return;
    input.onNavigate({ type: 'PREVIOUS', elementId: previous.elementId });
  });
  result.querySelector('#mc-continue')?.addEventListener('click', () => {
    if (!next) return;
    input.onNavigate({ type: 'NEXT', elementId: next.elementId });
  });
}
