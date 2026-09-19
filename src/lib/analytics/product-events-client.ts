'use client';

import type { ProductEventInput } from './product-events';
import { logBranchProductEvent } from '@/lib/branch';
import {
  trackBroBotFirstSuccessConversion,
  trackFirstBroBotMessageEvent,
} from './googleAds';

const ANONYMOUS_KEY = 'snaportho_analytics_anonymous_id';
const SESSION_KEY = 'snaportho_analytics_session_id';
const ATTRIBUTION_KEY = 'snaportho_acquisition_attribution_v1';
const FIRST_BROBOT_SUCCESS_KEY = 'snaportho_brobot_first_success_v1';
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type AcquisitionAttribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  branchClickId: string | null;
};

type StoredAttribution = {
  first: AcquisitionAttribution;
  last: AcquisitionAttribution;
  capturedAt: string;
};

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

export function attributionFromSearch(search: string): AcquisitionAttribution {
  const query = new URLSearchParams(search);
  return {
    source: query.get('utm_source'),
    medium: query.get('utm_medium'),
    campaign: query.get('utm_campaign'),
    utmTerm: query.get('utm_term'),
    utmContent: query.get('utm_content'),
    gclid: query.get('gclid'),
    gbraid: query.get('gbraid'),
    wbraid: query.get('wbraid'),
    branchClickId: query.get('_branch_match_id') ?? query.get('~click_id'),
  };
}

function hasAttribution(value: AcquisitionAttribution) {
  return Object.values(value).some(Boolean);
}

function readStoredAttribution(): StoredAttribution | null {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    const capturedAt = Date.parse(parsed.capturedAt);
    if (!Number.isFinite(capturedAt) || Date.now() - capturedAt > ATTRIBUTION_TTL_MS) {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function currentAttribution(): AcquisitionAttribution {
  const empty = attributionFromSearch('');
  if (typeof window === 'undefined') return empty;

  const fromUrl = attributionFromSearch(window.location.search);
  const stored = readStoredAttribution();
  if (!hasAttribution(fromUrl)) return stored?.last ?? empty;

  const next: StoredAttribution = {
    first: stored?.first ?? fromUrl,
    last: fromUrl,
    capturedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Attribution still works for the current page when storage is unavailable.
  }
  return fromUrl;
}

export function attributionProperties(attribution = currentAttribution()) {
  return {
    utm_term: attribution.utmTerm,
    utm_content: attribution.utmContent,
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
  };
}

export function trackBroBotFirstSuccess(params: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(FIRST_BROBOT_SUCCESS_KEY)) return false;
  } catch {
    // Google Ads is configured to count one conversion per click as a second guard.
  }

  trackFirstBroBotMessageEvent(params);
  const conversionTracked = trackBroBotFirstSuccessConversion();

  if (conversionTracked) {
    try {
      window.localStorage.setItem(FIRST_BROBOT_SUCCESS_KEY, new Date().toISOString());
    } catch {
      // Google Ads is configured to count one conversion per click as a second guard.
    }
  }

  return conversionTracked;
}

export function currentEmailAttribution() {
  const value = currentAttribution();
  if ((value.source !== 'branch' && value.source !== 'resend') || value.medium !== 'email' ||
      !value.campaign || !value.utmContent) return undefined;
  return {
    source: value.source,
    medium: 'email' as const,
    campaign: value.campaign,
    content: value.utmContent,
    branchClickId: value.branchClickId,
  };
}

export function trackProductEvent(
  input: Omit<ProductEventInput, 'eventId' | 'occurredAt' | 'anonymousId' | 'sessionId'>
) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const identity = analyticsIdentity();
  const attribution = currentAttribution();
  const payload = {
    ...input,
    source: input.source ?? attribution.source,
    medium: input.medium ?? attribution.medium,
    campaign: input.campaign ?? attribution.campaign,
    branchClickId: input.branchClickId ?? attribution.branchClickId,
    properties: {
      ...attributionProperties(attribution),
      ...input.properties,
    },
    ...identity,
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
  };

  void logBranchProductEvent(input.eventName, input.properties);
  return fetch('/api/analytics/events', {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((response) => response.ok).catch(() => false);
}
