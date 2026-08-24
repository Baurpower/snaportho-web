'use client';

import type { ProductEventInput } from './product-events';
import { logBranchProductEvent } from '@/lib/branch';

const ANONYMOUS_KEY = 'snaportho_analytics_anonymous_id';
const SESSION_KEY = 'snaportho_analytics_session_id';

function getOrCreate(storage: Storage, key: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

export function analyticsIdentity() {
  if (typeof window === 'undefined') return { anonymousId: null, sessionId: null };
  return {
    anonymousId: getOrCreate(window.localStorage, ANONYMOUS_KEY),
    sessionId: getOrCreate(window.sessionStorage, SESSION_KEY),
  };
}

export function currentAttribution() {
  if (typeof window === 'undefined') return {};
  const query = new URLSearchParams(window.location.search);
  return {
    source: query.get('utm_source'),
    medium: query.get('utm_medium'),
    campaign: query.get('utm_campaign'),
    branchClickId: query.get('_branch_match_id') ?? query.get('~click_id'),
  };
}

export function trackProductEvent(
  input: Omit<ProductEventInput, 'eventId' | 'occurredAt' | 'anonymousId' | 'sessionId'>
) {
  if (typeof window === 'undefined') return;
  const identity = analyticsIdentity();
  const payload = {
    ...currentAttribution(),
    ...input,
    ...identity,
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  };

  void logBranchProductEvent(input.eventName, input.properties);
  void fetch('/api/analytics/events', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}
