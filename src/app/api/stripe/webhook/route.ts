import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncSubscriptionFromStripe } from '@/lib/stripe';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Safe logging (no secrets)
  console.log('[stripe/webhook] Event received', {
    type: event.type,
    id: event.id,
    created: event.created,
  });

  const supabase = createAdminClient();

  // Idempotency: skip only if the event was already SUCCESSFULLY processed.
  // If it exists but processed_at is null (a prior attempt failed), fall through
  // and retry processing so Stripe retries are not silently dropped.
  const { data: existing } = await supabase
    .from('subscription_events')
    .select('id, processed_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing?.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Insert the raw event for audit (skip if already logged from a previous failed attempt)
  if (!existing) {
    await supabase.from('subscription_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      raw_event: event,
    });
  }

  try {
    const stripe = getStripe();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        console.log('[stripe/webhook] checkout.session.completed details', {
          eventId: event.id,
          sessionId: session.id,
          customer: session.customer,
          subscription: session.subscription,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
          customerEmail: session.customer_email || session.customer_details?.email,
          mode: session.mode,
          paymentStatus: session.payment_status,
        });

        // Try multiple places for user_id (defense in depth)
        const customerDetails = session.customer_details as { metadata?: Record<string, string> } | null;
        let userIdFromSession =
          session.metadata?.user_id ||
          session.client_reference_id ||
          customerDetails?.metadata?.user_id;

        // Fallback: look up by customer in our DB (very reliable because we create customer early)
        if (!userIdFromSession && session.customer) {
          const supabase = createAdminClient();
          const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existing?.user_id) {
            userIdFromSession = existing.user_id;
            if (process.env.NODE_ENV !== 'production') {
              console.log('[stripe/webhook] Recovered user_id from customer mapping in checkout.session.completed', {
                customerId,
                userIdFromSession,
              });
            }
          }
        }

        if (session.subscription) {
          let sub = await stripe.subscriptions.retrieve(session.subscription as string);

          if (process.env.NODE_ENV !== 'production') {
            console.log('[stripe/webhook] Retrieved subscription for checkout completed', {
              subscriptionId: sub.id,
              status: sub.status,
              metadataUserId: sub.metadata?.user_id,
            });
          }

          // If we still don't have user_id on the subscription, try to get it from the session and force it
          if (!sub.metadata?.user_id && userIdFromSession) {
            console.log('[stripe/webhook] Injecting user_id into subscription metadata from session', {
              subscriptionId: sub.id,
              userIdFromSession,
            });

            await stripe.subscriptions.update(sub.id, {
              metadata: {
                ...sub.metadata,
                user_id: userIdFromSession,
                plan_code: sub.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
              },
            });

            sub = await stripe.subscriptions.retrieve(sub.id); // re-fetch
          }

          await syncSubscriptionFromStripe(sub);

          if (!userIdFromSession && !sub.metadata?.user_id) {
            console.error('[stripe/webhook] checkout.session.completed but could not resolve user_id', {
              sessionId: session.id,
              customer: session.customer,
            });
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[stripe/webhook] subscription event', {
          eventId: event.id,
          type: event.type,
          subscriptionId: subscription.id,
          customer: subscription.customer,
          status: subscription.status,
          metadata: subscription.metadata,
          priceId: subscription.items?.data?.[0]?.price?.id,
        });
        await syncSubscriptionFromStripe(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[stripe/webhook] invoice.payment_failed', {
          eventId: event.id,
          invoiceId: invoice.id,
          customer: invoice.customer,
          subscription: invoice.parent?.subscription_details?.subscription,
          status: invoice.status,
        });
        const subDetail = invoice.parent?.subscription_details?.subscription;
        const subId = typeof subDetail === 'string' ? subDetail : (subDetail as Stripe.Subscription | undefined)?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe(sub);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('[stripe/webhook] invoice.payment_succeeded', {
          eventId: event.id,
          invoiceId: invoice.id,
          customer: invoice.customer,
          subscription: invoice.parent?.subscription_details?.subscription,
          status: invoice.status,
        });
        const subDetail = invoice.parent?.subscription_details?.subscription;
        const subId = typeof subDetail === 'string' ? subDetail : (subDetail as Stripe.Subscription | undefined)?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe(sub);
        }
        break;
      }

      // Optional: handle refunds/disputes for support visibility
      case 'charge.refunded':
      case 'charge.dispute.created': {
        // For now we just log via the event table above.
        // Future: could trigger admin notification.
        break;
      }

      default:
        // Ignore other events
        break;
    }

    // Mark as processed
    await supabase
      .from('subscription_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe/webhook] error processing ${event.type}`, err);
    // Do not mark as processed so it can be retried by Stripe
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
