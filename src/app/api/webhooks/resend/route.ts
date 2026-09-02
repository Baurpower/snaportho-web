import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyResendWebhook } from '@/lib/marketing/resend-webhook';

export const runtime = 'nodejs';

type ResendEvent = { type?: string; data?: { email_id?: string; to?: string[] } };

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  const id = request.headers.get('svix-id');
  if (!verifyResendWebhook({ body, id, timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature'), secret })) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  let event: ResendEvent;
  try { event = JSON.parse(body) as ResendEvent; } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }); }
  const emailId = event.data?.email_id ?? null;
  const supabase = createAdminClient();
  const { error: reserveError } = await supabase.from('marketing_email_webhook_events').insert({
    provider_event_id: id, event_type: event.type ?? 'unknown', resend_email_id: emailId, payload: event,
  });
  if (reserveError?.code === '23505') {
    const { data: existing } = await supabase.from('marketing_email_webhook_events').select('processed_at').eq('provider_event_id', id).maybeSingle();
    if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true });
  }
  if (reserveError && reserveError.code !== '23505') return NextResponse.json({ error: 'Unable to reserve event' }, { status: 500 });

  const field: Record<string, string | null> = {
    'email.delivered': 'delivered_at', 'email.clicked': 'first_clicked_at', 'email.bounced': 'bounced_at',
    'email.complained': 'complained_at', 'email.suppressed': 'suppressed_at', 'email.failed': null,
  };
  try {
  if (emailId && event.type && Object.hasOwn(field, event.type)) {
    const at = new Date().toISOString();
    const { data: delivery, error: deliveryError } = await supabase.from('lifecycle_emails').update({ ...(field[event.type] ? { [field[event.type]!]: at } : {}), send_status: event.type === 'email.failed' ? 'delivery_failed' : event.type.replace('email.', '') }).eq('resend_email_id', emailId).select('user_id,email,metadata').maybeSingle();
    if (deliveryError) throw deliveryError;
    // Profile-address failures stay on the delivery record for the bounded
    // runner to select a confirmed auth fallback. Never send inside the webhook.
    const profileAddressFailure = delivery?.metadata?.address_source === 'profile' &&
      (event.type === 'email.bounced' || event.type === 'email.failed');
    if (delivery && !profileAddressFailure && (event.type === 'email.failed' || event.type === 'email.bounced' || event.type === 'email.complained' || event.type === 'email.suppressed')) {
      const { error: optoutError } = await supabase.from('lifecycle_email_optouts').insert({ user_id: delivery.user_id, email: delivery.email, kind: null, reason: event.type });
      if (optoutError && optoutError.code !== '23505') throw optoutError;
      const { error: profileError } = await supabase.from('user_profiles').update({ receive_emails: false, marketing_unsubscribed_at: at }).eq('user_id', delivery.user_id);
      if (profileError) throw profileError;
    }
  }
  const { error: processedError } = await supabase.from('marketing_email_webhook_events').update({ processed_at: new Date().toISOString(), processing_error: null }).eq('provider_event_id', id);
  if (processedError) throw processedError;
  return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from('marketing_email_webhook_events').update({ processing_error: message.slice(0, 500) }).eq('provider_event_id', id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
