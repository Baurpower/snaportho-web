import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import {
  getStripe,
  syncPendingSubscriptionFromStripe,
  syncSubscriptionFromStripe,
  upsertPendingSubscriptionFromCheckoutSession,
  type SyncSubscriptionFromStripeResult,
} from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import { sendSubscriptionPurchaseConversion } from '@/lib/analytics/googleAdsServer';
import {
  getExistingSubscriptionEvent,
  upsertSubscriptionEvent,
} from '@/lib/subscriptions/events';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function summarizeId(value: string | null | undefined) {
  if (!value) return null;
  return value.length <= 12 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getStripeCustomerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id ?? null;
}

function logStripeWebhookAction(details: Record<string, unknown>) {
  console.log('[stripe/webhook] action', {
    provider: 'stripe',
    ...details,
  });
}

async function runStripeSubscriptionSync(params: {
  stripeSub: Stripe.Subscription;
  stripeEventId: string;
  checkoutSessionId?: string | null;
  requireUserMapping?: boolean;
}): Promise<SyncSubscriptionFromStripeResult> {
  const customerId = getStripeCustomerId(params.stripeSub.customer);
  const result = await syncSubscriptionFromStripe(params.stripeSub);

  logStripeWebhookAction({
    stripe_event_id: params.stripeEventId,
    checkout_session_id: params.checkoutSessionId ?? null,
    stripe_customer_id: customerId,
    stripe_subscription_id: params.stripeSub.id,
    user_id:
      result.synced
        ? result.userId.slice(0, 8)
        : params.stripeSub.metadata?.user_id?.slice(0, 8) ?? null,
    action: result.synced ? 'subscription_synced' : `subscription_sync_skipped_${result.reason}`,
    db_row_id: result.synced ? result.rowId : null,
    subscription_status: params.stripeSub.status,
    plan_code: params.stripeSub.metadata?.plan_code ?? BROBOT_CONFIG.PAID_PLAN_CODE,
  });

  if (!result.synced && params.requireUserMapping) {
    throw new Error(
      `Stripe subscription sync failed (${result.reason}) for subscription ${params.stripeSub.id}`
    );
  }

  return result;
}

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

  logStripeWebhookAction({
    stripe_event_id: event.id,
    action: 'event_received',
    event_type: event.type,
    created: event.created,
  });

  const existing = await getExistingSubscriptionEvent({
    provider: 'stripe',
    providerEventId: event.id,
  });

  if (existing?.processed_at) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!existing) {
    await upsertSubscriptionEvent({
      provider: 'stripe',
      providerEventId: event.id,
      eventType: event.type,
      rawPayload: event as unknown as Record<string, unknown>,
    });
  }

  try {
    const stripe = getStripe();
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        logStripeWebhookAction({
          stripe_event_id: event.id,
          checkout_session_id: session.id,
          stripe_customer_id: getStripeCustomerId(session.customer),
          stripe_subscription_id:
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id ?? null,
          action: 'checkout_session_completed',
          payment_status: session.payment_status,
          mode: session.mode,
        });

        const customerDetails = session.customer_details as { metadata?: Record<string, string> } | null;
        let userIdFromSession =
          session.metadata?.user_id ||
          session.client_reference_id ||
          customerDetails?.metadata?.user_id;

        if (!userIdFromSession && session.customer) {
          const supabase = createAdminClient();
          const customerId = getStripeCustomerId(session.customer);
          const { data: existingMapping } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .eq('provider', 'stripe')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingMapping?.user_id) {
            userIdFromSession = existingMapping.user_id;
            logStripeWebhookAction({
              stripe_event_id: event.id,
              checkout_session_id: session.id,
              stripe_customer_id: customerId,
              user_id: existingMapping.user_id.slice(0, 8),
              action: 'resolved_user_id_from_customer_mapping',
            });
          }
        }

        if (!session.subscription) {
          logStripeWebhookAction({
            stripe_event_id: event.id,
            checkout_session_id: session.id,
            action: 'checkout_completed_without_subscription',
          });
          break;
        }

        let sub = await stripe.subscriptions.retrieve(session.subscription as string);

        const isPreAuthCheckout =
          session.metadata?.checkout_mode === 'pre_auth' ||
          sub.metadata?.checkout_mode === 'pre_auth' ||
          (!userIdFromSession && !sub.metadata?.user_id);

        if (isPreAuthCheckout && !userIdFromSession && !sub.metadata?.user_id) {
          const pending = await upsertPendingSubscriptionFromCheckoutSession(session, sub);
          logStripeWebhookAction({
            stripe_event_id: event.id,
            checkout_session_id: session.id,
            stripe_subscription_id: sub.id,
            action: 'pending_subscription_upserted',
            db_row_id: pending.id,
          });

          const conversionResult = await sendSubscriptionPurchaseConversion(sub);
          logStripeWebhookAction({
            stripe_event_id: event.id,
            checkout_session_id: session.id,
            stripe_subscription_id: sub.id,
            action: 'google_ads_conversion',
            ...conversionResult,
          });
          break;
        }

        if (!sub.metadata?.user_id && userIdFromSession) {
          await stripe.subscriptions.update(sub.id, {
            metadata: {
              ...sub.metadata,
              user_id: userIdFromSession,
              plan_code: sub.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
            },
          });
          sub = await stripe.subscriptions.retrieve(sub.id);
        }

        await runStripeSubscriptionSync({
          stripeSub: sub,
          stripeEventId: event.id,
          checkoutSessionId: session.id,
          requireUserMapping: !isPreAuthCheckout,
        });

        const conversionResult = await sendSubscriptionPurchaseConversion(sub);
        logStripeWebhookAction({
          stripe_event_id: event.id,
          checkout_session_id: session.id,
          stripe_subscription_id: sub.id,
          action: 'google_ads_conversion',
          ...conversionResult,
        });

        if (!userIdFromSession && !sub.metadata?.user_id) {
          console.error('[stripe/webhook] checkout.session.completed unresolved user_id after sync attempt', {
            stripe_event_id: event.id,
            checkout_session_id: session.id,
            stripe_customer_id: summarizeId(getStripeCustomerId(session.customer)),
            stripe_subscription_id: sub.id,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStripeWebhookAction({
          stripe_event_id: event.id,
          stripe_customer_id: getStripeCustomerId(subscription.customer),
          stripe_subscription_id: subscription.id,
          user_id: subscription.metadata?.user_id?.slice(0, 8) ?? null,
          action: `subscription_${event.type.split('.').slice(-1)[0]}`,
          subscription_status: subscription.status,
        });

        if (!subscription.metadata?.user_id && subscription.metadata?.checkout_mode === 'pre_auth') {
          await syncPendingSubscriptionFromStripe(subscription);
        } else {
          await runStripeSubscriptionSync({
            stripeSub: subscription,
            stripeEventId: event.id,
            requireUserMapping:
              Boolean(subscription.metadata?.user_id) &&
              subscription.metadata?.checkout_mode !== 'pre_auth',
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetail = invoice.parent?.subscription_details?.subscription;
        const subId =
          typeof subDetail === 'string'
            ? subDetail
            : (subDetail as Stripe.Subscription | undefined)?.id ?? null;

        logStripeWebhookAction({
          stripe_event_id: event.id,
          stripe_customer_id: getStripeCustomerId(invoice.customer),
          stripe_subscription_id: subId,
          action: 'invoice_payment_failed',
        });

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          if (!sub.metadata?.user_id && sub.metadata?.checkout_mode === 'pre_auth') {
            await syncPendingSubscriptionFromStripe(sub);
          } else {
            await runStripeSubscriptionSync({
              stripeSub: sub,
              stripeEventId: event.id,
              requireUserMapping: false,
            });
          }
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetail = invoice.parent?.subscription_details?.subscription;
        const subId =
          typeof subDetail === 'string'
            ? subDetail
            : (subDetail as Stripe.Subscription | undefined)?.id ?? null;

        logStripeWebhookAction({
          stripe_event_id: event.id,
          stripe_customer_id: getStripeCustomerId(invoice.customer),
          stripe_subscription_id: subId,
          action: event.type,
        });

        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          if (!sub.metadata?.user_id && sub.metadata?.checkout_mode === 'pre_auth') {
            await syncPendingSubscriptionFromStripe(sub);
          } else {
            await runStripeSubscriptionSync({
              stripeSub: sub,
              stripeEventId: event.id,
              requireUserMapping: false,
            });
          }
        }
        break;
      }

      case 'charge.refunded':
      case 'charge.dispute.created':
        break;

      default:
        break;
    }

    await upsertSubscriptionEvent({
      provider: 'stripe',
      providerEventId: event.id,
      eventType: event.type,
      rawPayload: event as unknown as Record<string, unknown>,
      processedAt: new Date().toISOString(),
      processingResult: { received: true, success: true },
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[stripe/webhook] error processing event', {
      stripe_event_id: event.id,
      event_type: event.type,
      error: errorMessage,
    });
    await upsertSubscriptionEvent({
      provider: 'stripe',
      providerEventId: event.id,
      eventType: event.type,
      rawPayload: event as unknown as Record<string, unknown>,
      processingResult: {
        received: true,
        success: false,
        error: errorMessage,
      },
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}