/* eslint-disable @typescript-eslint/no-explicit-any -- New linking tables are not in generated Supabase types yet. */
import { NextResponse } from 'next/server';
import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import {
  ANKI_SOURCE_PAGE_PROVIDERS,
  normalizeSourcePageUrl,
  snapshotFields,
  type AnkiSourcePageProvider,
} from '@/lib/brobot/anki-page-identity';
import { createAdminClient } from '@/lib/supabase/admin';

export const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';
export const PAGE_PROVIDERS = ANKI_SOURCE_PAGE_PROVIDERS;
export type PageProvider = AnkiSourcePageProvider;
// The additive source-page tables are intentionally not yet in generated database types.
export type LinkAdmin = any;

export async function authenticateLinkingRequest(request: Request) {
  const auth = await authenticateDeviceLinkedRequest(request, {
    deviceTokenHeader: EXTENSION_TOKEN_HEADER,
    allowBrowserSession: false,
    allowBearerToken: false,
  });
  if ('response' in auth) return { response: auth.response } as const;
  return { userId: auth.userId, supabase: createAdminClient() as LinkAdmin } as const;
}

export function parseProvider(value: string | null): PageProvider | null {
  return value === 'orthobullets' || value === 'rock' ? value : null;
}

export function jsonError(error: string, status = 500) {
  return NextResponse.json({ error }, { status });
}

export { normalizeSourcePageUrl, snapshotFields };
