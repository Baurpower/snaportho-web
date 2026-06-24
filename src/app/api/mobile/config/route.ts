import { NextResponse } from 'next/server';

/**
 * Mobile Remote Config / Version Gate Endpoint
 *
 * GET /api/mobile/config
 *
 * Purpose: Lets the iOS app determine whether its installed version is
 * supported, whether a force/optional update is needed, whether BroBot
 * Chat/CasePrep are in maintenance, and which API version each should use.
 *
 * - Works for guests and authenticated users; auth is never required.
 * - Phase 0: fully static/env-driven, no Supabase read.
 * - Never personalized — safe to cache publicly for a short window.
 */

type MaintenanceScope = 'all' | 'brobot';

interface RemoteConfigResponse {
  configVersion: number;
  serverTime: string;
  refreshAfterSeconds: number;

  minSupportedVersion: string;
  recommendedVersion: string;
  latestVersion: string;
  forceUpdateRequired: boolean;
  softUpdateAvailable: boolean;
  updateTitle: string;
  updateMessage: string;
  appStoreUrl: string;

  maintenanceMode: boolean;
  maintenanceScope: MaintenanceScope;
  maintenanceTitle: string | null;
  maintenanceMessage: string | null;

  brobotChatApiVersion: string;
  brobotCasePrepApiVersion: string;
  brobotChatEnabled: boolean;
  brobotCasePrepEnabled: boolean;

  featureFlags: {
    brobotStreaming: boolean;
    brobotFollowUpChips: boolean;
    brobotReadingRecs: boolean;
  };
}

const DEFAULT_APP_STORE_URL = 'https://apps.apple.com/app/id000000000';

/**
 * Parses a dot-separated numeric version string into an array of integer
 * components. Non-numeric / missing components become 0 so comparisons
 * never throw on malformed client input (e.g. "abc", "", "1.2-beta").
 */
function parseVersionComponents(raw: string | null | undefined): number[] {
  if (!raw || typeof raw !== 'string') return [0];
  const parts = raw.trim().split('.');
  const parsed = parts.map((p) => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  return parsed.length > 0 ? parsed : [0];
}

/**
 * Compares two dot-separated numeric versions component-by-component
 * (not lexicographically), padding missing components with zero.
 * Returns -1 / 0 / 1. Guarantees "1.10" > "1.2".
 */
function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const av = parseVersionComponents(a);
  const bv = parseVersionComponents(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** True only for a well-formed dot-separated numeric version, e.g. "1.60" or "2". */
function isWellFormedVersion(raw: string | null | undefined): boolean {
  return !!raw && /^\d+(\.\d+)*$/.test(raw.trim());
}

function readBool(envVal: string | undefined, defaultVal: boolean): boolean {
  if (envVal === undefined) return defaultVal;
  return envVal === 'true' || envVal === '1';
}

function readMaintenanceScope(envVal: string | undefined): MaintenanceScope {
  return envVal === 'all' ? 'all' : 'brobot';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientAppVersion = searchParams.get('appVersion');

  const minSupportedVersion = process.env.IOS_MIN_SUPPORTED_VERSION || '1.0';
  const recommendedVersion = process.env.IOS_RECOMMENDED_VERSION || minSupportedVersion;
  const latestVersion = process.env.IOS_LATEST_VERSION || recommendedVersion;

  let forceUpdateRequired = false;
  let softUpdateAvailable = false;

  try {
    // A missing/malformed client version fails open (no gate) rather than
    // being treated as "0.0" — an indeterminate comparison is more likely a
    // parsing edge case on a real install than a client we need to block.
    if (isWellFormedVersion(clientAppVersion)) {
      forceUpdateRequired = compareVersions(clientAppVersion, minSupportedVersion) < 0;
      softUpdateAvailable =
        !forceUpdateRequired && compareVersions(clientAppVersion, recommendedVersion) < 0;
    }
  } catch {
    forceUpdateRequired = false;
    softUpdateAvailable = false;
  }

  const payload: RemoteConfigResponse = {
    configVersion: parseInt(process.env.MOBILE_CONFIG_VERSION || '1', 10) || 1,
    serverTime: new Date().toISOString(),
    refreshAfterSeconds: parseInt(process.env.MOBILE_CONFIG_REFRESH_SECONDS || '3600', 10) || 3600,

    minSupportedVersion,
    recommendedVersion,
    latestVersion,
    forceUpdateRequired,
    softUpdateAvailable,
    updateTitle: forceUpdateRequired ? 'Update Required' : 'Update Available',
    updateMessage:
      process.env.IOS_FORCE_UPDATE_MESSAGE ||
      (forceUpdateRequired
        ? 'Please update SnapOrtho to continue.'
        : 'A new version of SnapOrtho is available with improvements.'),
    appStoreUrl: process.env.IOS_APP_STORE_URL || DEFAULT_APP_STORE_URL,

    maintenanceMode: readBool(process.env.MOBILE_MAINTENANCE_MODE, false),
    maintenanceScope: readMaintenanceScope(process.env.MOBILE_MAINTENANCE_SCOPE),
    maintenanceTitle: process.env.MOBILE_MAINTENANCE_TITLE || null,
    maintenanceMessage: process.env.MOBILE_MAINTENANCE_MESSAGE || null,

    brobotChatApiVersion: process.env.BROBOT_CHAT_API_VERSION || 'v1',
    brobotCasePrepApiVersion: process.env.BROBOT_CASEPREP_API_VERSION || 'v1',
    brobotChatEnabled: readBool(process.env.BROBOT_CHAT_ENABLED, true),
    brobotCasePrepEnabled: readBool(process.env.BROBOT_CASEPREP_ENABLED, true),

    featureFlags: {
      brobotStreaming: readBool(process.env.BROBOT_FEATURE_STREAMING, false),
      brobotFollowUpChips: readBool(process.env.BROBOT_FEATURE_FOLLOWUP_CHIPS, true),
      brobotReadingRecs: readBool(process.env.BROBOT_FEATURE_READING_RECS, false),
    },
  };

  const response = NextResponse.json(payload);
  response.headers.set(
    'Cache-Control',
    'public, max-age=60, stale-while-revalidate=300'
  );
  return response;
}
