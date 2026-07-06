/**
 * Environment guards for KG staging operations.
 * Blocks destructive apply/migrate paths unless explicitly targeting staging.
 */

import { resolveEnv } from "../../kg-automation-common.ts";

/** Supabase project refs permitted for KG write operations (staging/dev only). */
export const STAGING_PROJECT_REFS = new Set([
  "geznczcokbgybsseipjg", // SnapOrtho dev/staging (local .env.local default)
]);

/** Hostnames that must never receive KG apply/migrate writes. */
export const BLOCKED_PRODUCTION_HOST_PATTERNS = [
  /prod/i,
  /production/i,
  /snaportho-prod/i,
];

export type StagingGuardResult = {
  allowed: boolean;
  projectRef: string;
  host: string;
  reason: string;
  kgTargetEnv: string;
};

export function getProjectRefFromUrl(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

export function assertStagingTarget(operation: string): StagingGuardResult {
  const { supabaseUrl } = resolveEnv();
  if (!supabaseUrl) {
    throw new Error(`KG ${operation} blocked: missing NEXT_PUBLIC_SUPABASE_URL`);
  }

  const host = new URL(supabaseUrl).hostname;
  const projectRef = getProjectRefFromUrl(supabaseUrl);
  const kgTargetEnv = (process.env.KG_TARGET_ENV ?? "staging").trim().toLowerCase();

  if (kgTargetEnv === "production" || kgTargetEnv === "prod") {
    return {
      allowed: false,
      projectRef,
      host,
      kgTargetEnv,
      reason: "KG_TARGET_ENV=production is blocked for ankle staging proof scripts",
    };
  }

  for (const pattern of BLOCKED_PRODUCTION_HOST_PATTERNS) {
    if (pattern.test(host) || pattern.test(projectRef)) {
      return {
        allowed: false,
        projectRef,
        host,
        kgTargetEnv,
        reason: `Host/project matches blocked production pattern: ${host}`,
      };
    }
  }

  if (!STAGING_PROJECT_REFS.has(projectRef)) {
    return {
      allowed: false,
      projectRef,
      host,
      kgTargetEnv,
      reason: `Project ref ${projectRef} not in STAGING_PROJECT_REFS allowlist`,
    };
  }

  return {
    allowed: true,
    projectRef,
    host,
    kgTargetEnv,
    reason: "Staging target confirmed",
  };
}

export function requireStaging(operation: string): StagingGuardResult {
  const result = assertStagingTarget(operation);
  if (!result.allowed) {
    throw new Error(`KG ${operation} blocked: ${result.reason}`);
  }
  return result;
}