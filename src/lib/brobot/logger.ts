/**
 * BroBot Structured Logging Foundation (Phase 1)
 *
 * Lightweight, centralized logging for all BroBot AI activity.
 * Currently writes to console with a consistent shape.
 *
 * In Phase 2+ this can be swapped to:
 *   - A real logger (Pino, Winston, etc.)
 *   - Vercel Log Drains / Axiom / Datadog
 *   - Direct insertion into a metrics table or external analytics
 *
 * All BroBot-related log lines should go through this helper so we have
 * one place to evolve the observability story.
 */

export type BroBotLogEvent =
  | 'request_received'
  | 'entitlement_checked'
  | 'upstream_call'
  | 'success'
  | 'failure'
  | 'limit_hit'
  | 'guest_session_created'
  | 'cached_hit';

interface LogParams {
  event: BroBotLogEvent;
  requestId?: string;
  subjectType?: 'user' | 'guest';
  subjectId?: string; // truncated for privacy
  feature?: string;
  latencyMs?: number;
  remaining?: number | null;
  outcome?: string;
  extra?: Record<string, unknown>;
}

export function logBroBotEvent(params: LogParams) {
  const payload = {
    ts: new Date().toISOString(),
    service: 'brobot',
    ...params,
  };

  // For now we use console with a recognizable prefix.
  // This makes grep / log aggregation easy.
  console.log(`[brobot] ${params.event}`, payload);
}
