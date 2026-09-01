import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyMarketingPreferenceToken } from '@/lib/marketing/preferences-token';

export const runtime = 'nodejs';

function page(token: string, message?: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Email preferences</title></head><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a"><main style="max-width:520px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px"><h1>Email preferences</h1>${message ? `<p>${message}</p>` : '<p>Choose how you want to manage SnapOrtho marketing email.</p>'}<form method="post"><input type="hidden" name="token" value="${token.replaceAll('"', '&quot;')}"><button name="scope" value="topic" style="padding:12px;margin:4px">Unsubscribe from this topic</button><button name="scope" value="all" style="padding:12px;margin:4px">Unsubscribe from all marketing</button><button name="scope" value="topic_on" style="padding:12px;margin:4px">Subscribe to this topic</button><button name="scope" value="all_on" style="padding:12px;margin:4px">Subscribe to all marketing</button></form></main></body></html>`;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  try { verifyMarketingPreferenceToken(token); } catch { return new NextResponse('Invalid or expired link', { status: 400 }); }
  return new NextResponse(page(token), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const form = contentType.includes('application/x-www-form-urlencoded') ? await request.formData() : null;
  const url = new URL(request.url);
  const token = String(form?.get('token') ?? url.searchParams.get('token') ?? '');
  const oneClick = contentType.includes('application/x-www-form-urlencoded') && String(form?.get('List-Unsubscribe') ?? '') === 'One-Click';
  const scope = oneClick ? 'topic' : String(form?.get('scope') ?? 'topic');
  let payload;
  try { payload = verifyMarketingPreferenceToken(token); } catch { return new NextResponse('Invalid or expired link', { status: 400 }); }
  const supabase = createAdminClient();
  if (scope === 'topic_on' || scope === 'all_on') {
    let deletion = supabase.from('lifecycle_email_optouts').delete().eq('user_id', payload.userId);
    deletion = scope === 'all_on' ? deletion : deletion.or(`kind.is.null,kind.eq.${payload.topic}`);
    const { error: deleteError } = await deletion;
    if (deleteError) return NextResponse.json({ error: 'Unable to save preference' }, { status: 500 });
    const { error: profileError } = await supabase.from('user_profiles').update({
      receive_emails: true, marketing_consent_at: new Date().toISOString(), marketing_consent_source: 'email_preference_page', marketing_consent_version: 'v1', marketing_unsubscribed_at: null,
    }).eq('user_id', payload.userId);
    if (profileError) return NextResponse.json({ error: 'Unable to save preference' }, { status: 500 });
    return new NextResponse(page(token, scope === 'all_on' ? 'You are subscribed to all marketing email.' : 'You are subscribed to this email topic.'), { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  const kind = scope === 'all' ? null : payload.topic === '*' ? null : payload.topic;
  let lookup = supabase.from('lifecycle_email_optouts').select('id').eq('user_id', payload.userId);
  lookup = kind === null ? lookup.is('kind', null) : lookup.eq('kind', kind);
  const { data: existing, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) return NextResponse.json({ error: 'Unable to save preference' }, { status: 500 });
  if (!existing) {
    const { error: insertError } = await supabase.from('lifecycle_email_optouts').insert({
      user_id: payload.userId, email: payload.email, kind, reason: oneClick ? 'one_click_unsubscribe' : 'preference_page',
    });
    if (insertError?.code !== '23505') return NextResponse.json({ error: 'Unable to save preference' }, { status: 500 });
  }
  if (kind === null) await supabase.from('user_profiles').update({ receive_emails: false, marketing_unsubscribed_at: new Date().toISOString() }).eq('user_id', payload.userId);
  if (oneClick) return new NextResponse(null, { status: 204 });
  return new NextResponse(page(token, kind === null ? 'You are unsubscribed from all marketing email.' : 'You are unsubscribed from this email topic.'), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
