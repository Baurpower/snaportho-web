import type {
  OrthobulletsExplainResponse,
  OrthobulletsExtractionDiagnostics,
  OrthobulletsPageContext,
} from './types.js';

export type ActivePageState = {
  tabId: number | null;
  url: string | null;
  title: string | null;
  supported: boolean;
};

export type AuthState = {
  status: 'linked' | 'unlinked';
  deviceToken?: string;
};

export type LinkStartResult = {
  linkCode: string;
  approvalUrl: string;
  expiresAt: string;
};

export type ExtensionMessage =
  | { type: 'ob:get-active-page-state' }
  | { type: 'ob:get-auth-state' }
  | { type: 'ob:start-link'; deviceName: string }
  | { type: 'ob:poll-link'; linkCode: string }
  | { type: 'ob:clear-link' }
  | { type: 'ob:extract-page-context'; tabId: number }
  | { type: 'ob:explain'; pageContext: OrthobulletsPageContext };

// Stable error codes surfaced to the side panel so it can render a specific
// UI state (and, where relevant, a retry path) instead of a raw message.
export type ExtensionErrorCode =
  | 'unsupported_page'
  | 'not_linked'
  | 'quota_exceeded'
  | 'disabled'
  | 'invalid_request'
  | 'api_failure'
  | 'parse_failure'
  | 'extraction_failure'
  | 'network_failure'
  | 'unknown';

export type ExtensionMessageResponse =
  | { ok: true; activePage: ActivePageState }
  | { ok: true; auth: AuthState }
  | { ok: true; link: LinkStartResult }
  | { ok: true; deviceToken: string }
  | { ok: true; pageContext: OrthobulletsPageContext; diagnostics: OrthobulletsExtractionDiagnostics }
  | { ok: true; explanation: OrthobulletsExplainResponse }
  | { ok: true; cleared: true }
  | { ok: false; error: string; code?: ExtensionErrorCode; diagnostics?: OrthobulletsExtractionDiagnostics };
