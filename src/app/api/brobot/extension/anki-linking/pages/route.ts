import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateLinkingRequest,
  jsonError,
  normalizeSourcePageUrl,
  parseProvider,
} from '../_lib';

const RegisterPageSchema = z.object({
  provider: z.enum(['orthobullets', 'rock']),
  url: z.string().url().max(2000),
  title: z.string().trim().min(1).max(500),
});

export async function GET(request: Request) {
  const auth = await authenticateLinkingRequest(request);
  if ('response' in auth) return auth.response;
  const params = new URL(request.url).searchParams;
  const search = (params.get('search') ?? '').trim().slice(0, 120)
    .replace(/[^\p{L}\p{N}\s._'-]/gu, '');
  const pageId = params.get('pageId');
  const provider = parseProvider(params.get('provider'));
  let query = auth.supabase.from('brobot_anki_source_pages')
    .select('id,provider,canonical_url,source_url,title,created_at')
    .eq('user_id', auth.userId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (pageId) query = query.eq('id', pageId);
  else if (provider) query = query.eq('provider', provider);
  if (search) {
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    query = query.or(`title.ilike.%${escapedSearch}%,canonical_url.ilike.%${escapedSearch}%`);
  }
  const { data, error } = await query;
  if (error) return jsonError('source_pages_unavailable');
  return NextResponse.json({ pages: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateLinkingRequest(request);
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = RegisterPageSchema.safeParse(body);
  if (!parsed.success) return jsonError('invalid_source_page', 400);
  const normalized = normalizeSourcePageUrl(parsed.data.url, parsed.data.provider);
  if (!normalized) return jsonError('unsupported_source_page_url', 400);
  const { data, error } = await auth.supabase.from('brobot_anki_source_pages')
    .upsert({
      user_id: auth.userId,
      provider: parsed.data.provider,
      canonical_url: normalized.canonicalUrl,
      source_url: normalized.sourceUrl,
      title: parsed.data.title.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider,canonical_url' })
    .select('id,provider,canonical_url,source_url,title,created_at')
    .single();
  if (error || !data) return jsonError('source_page_save_failed');
  return NextResponse.json({ page: data });
}
