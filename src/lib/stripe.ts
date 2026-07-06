// src/lib/stripe.ts
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { BROBOT_CONFIG } from '@/lib/config/brobot';
import {
  getAppBaseUrl,
  getBillingPortalReturnUrl,
  getCheckoutSuccessUrl,
} from '@/lib/config/app-url'; // Centralized production-safe URL resolution
import { getRemainingAIUses } from '@/lib/brobot/entitlements';
import { upsertCanonicalSubscription } from '@/lib/subscriptions/ledger';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  return stripeClient;
}

type BillingPortalErrorCode =
  | 'NO_STRIPE_SUBSCRIPTION'
  | 'SUBSCRIPTION_NOT_MANAGEABLE'
  | 'PORTAL_SESSION_FAILED';

class BillingPortalError extends Error {
  code: BillingPortalErrorCode;

  constructor(code: BillingPortalErrorCode, message: string) {
    super(message);
    this.name = 'BillingPortalError';
    this.code = code;
  }
}

export class NoManageableStripeSubscriptionError extends BillingPortalError {
  constructor() {
    super('NO_STRIPE_SUBSCRIPTION', 'No active Stripe subscription found for this account.');
    this.name = 'NoManageableStripeSubscriptionError';
  }
}

export class SubscriptionNotManageableError extends BillingPortalError {
  constructor() {
    super(
      'SUBSCRIPTION_NOT_MANAGEABLE',
      'This Stripe subscription is already canceled and may no longer be manageable in the billing portal.'
    );
    this.name = 'SubscriptionNotManageableError';
  }
}

export class BillingPortalSessionFailedError extends BillingPortalError {
  constructor() {
    super('PORTAL_SESSION_FAILED', 'Failed to create Stripe billing portal session.');
    this.name = 'BillingPortalSessionFailedError';
  }
}

function summarizeStripeId(value: string | null | undefined) {
  if (!value) return null;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function summarizeStripeError(error: unknown) {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return {
      type: error instanceof Error ? error.name : typeof error,
      code: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    type: error.type ?? error.name,
    code: error.code ?? null,
    message: error.message,
  };
}

function isSubscriptionNotManageableStripeError(
  error: unknown,
  params: {
    status: string | null;
    currentPeriodEndInFuture: boolean;
  }
) {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false;
  }

  if (
    params.status !== 'canceled' ||
    !params.currentPeriodEndInFuture ||
    error.type !== 'StripeInvalidRequestError'
  ) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  if (error.code === 'resource_missing' || normalizedMessage.includes('no such customer')) {
    return false;
  }

  return (
    normalizedMessage.includes('subscription') ||
    normalizedMessage.includes('cancel') ||
    normalizedMessage.includes('manage')
  );
}

function logPortalDecision(
  label: string,
  details: Record<string, unknown>
) {
  console.info(`[stripe/portal] ${label}`, details);
}

type PortalSubscriptionRow = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  provider: string | null;
  plan_code: string | null;
  updated_at: string | null;
};

type StripeSubscriptionRow = {
  user_id: string;
  provider: string | null;
  environment: string | null;
  status: string | null;
  plan_code: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  updated_at: string | null;
};

type ExistingStripeSubscriptionRow = {
  stripe_subscription_id: string | null;
  status: string | null;
  current_period_end: string | null;
  updated_at: string | null;
};

type TrialEligibilitySubscriptionRow = {
  provider: string | null;
  status: string | null;
  plan_code: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

export type BroBotTrialDecision = {
  eligible: boolean;
  reason:
    | 'eligible'
    | 'trial_not_configured'
    | 'prior_subscription_row'
    | 'prior_stripe_subscription';
  offerId: string | null;
  trialEnd: number | null;
  trialMonths: number | null;
};

export type PendingBroBotSubscriptionRow = {
  id: string;
  email: string;
  normalized_email: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string | null;
  checkout_session_id: string;
  plan_code: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  metadata: Record<string, unknown> | null;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimPendingSubscriptionResult =
  | { status: 'claimed'; subscriptionId: string; pendingId: string }
  | { status: 'already_claimed_by_user'; subscriptionId: string; pendingId: string }
  | { status: 'already_has_subscription' }
  | { status: 'not_found' }
  | { status: 'email_mismatch'; pendingEmail: string }
  | { status: 'not_claimable'; reason: string };

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addCalendarMonthsUtc(date: Date, months: number) {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error('Trial month count must be a positive integer.');
  }

  const targetMonthZeroBased = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthZeroBased / 12);
  const targetMonth = ((targetMonthZeroBased % 12) + 12) % 12;
  const targetDay = Math.min(date.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export function getBroBotTrialEndTimestamp(startedAt = new Date()) {
  const trialMonths = Number.isFinite(BROBOT_CONFIG.TRIAL_MONTHS)
    ? BROBOT_CONFIG.TRIAL_MONTHS
    : 0;
  if (!Number.isInteger(trialMonths) || trialMonths <= 0) return null;

  return Math.floor(addCalendarMonthsUtc(startedAt, trialMonths).getTime() / 1000);
}

export function buildBroBotCheckoutMetadata(params: {
  userId: string;
  trialDecision: BroBotTrialDecision;
  source?: string | null;
  trialRequested?: boolean;
}) {
  const source = params.source ?? '';
  return {
    user_id: params.userId,
    source,
    provider: 'stripe',
    purchase_source: 'stripe',
    billing_environment: getStripeEnvironment(),
    checkout_source: source,
    entry_point: source,
    product: 'brobot',
    plan: BROBOT_CONFIG.PAID_PLAN_CODE,
    plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
    trial_requested: params.trialRequested === false ? 'false' : 'true',
    trial_offer_reference_id: params.trialDecision.offerId ?? '',
    trial_offer_attached: 'false',
    trial_implementation: params.trialDecision.eligible ? 'checkout_trial_end' : 'none',
    trial_duration_unit: params.trialDecision.eligible ? 'calendar_month' : '',
    trial_duration_count: params.trialDecision.trialMonths?.toString() ?? '',
    trial_end: params.trialDecision.trialEnd?.toString() ?? '',
    trial_applied: params.trialDecision.eligible ? 'true' : 'false',
    trial_eligibility_reason: params.trialDecision.reason,
  };
}

function buildRequestedBroBotTrialDecision(enableTrial?: boolean): BroBotTrialDecision {
  const offerId = BROBOT_CONFIG.TRIAL_OFFER_ID || null;
  const trialMonths = Number.isFinite(BROBOT_CONFIG.TRIAL_MONTHS)
    ? BROBOT_CONFIG.TRIAL_MONTHS
    : 0;
  const trialEnd = getBroBotTrialEndTimestamp();

  if (enableTrial === false || !trialEnd || trialMonths <= 0) {
    return {
      eligible: false,
      reason: 'trial_not_configured',
      offerId,
      trialEnd: null,
      trialMonths: trialMonths > 0 ? trialMonths : null,
    };
  }

  return {
    eligible: true,
    reason: 'eligible',
    offerId,
    trialEnd,
    trialMonths,
  };
}

function hasPriorBroBotSubscriptionRow(row: TrialEligibilitySubscriptionRow) {
  if (row.plan_code !== BROBOT_CONFIG.PAID_PLAN_CODE) return false;

  if (row.provider === 'apple') return true;
  if (row.provider === 'stripe' && row.stripe_subscription_id) return true;
  if (row.status === 'trialing') return true;
  if (row.status && ['active', 'past_due', 'canceled', 'unpaid'].includes(row.status)) return true;

  return Boolean(row.current_period_start || row.current_period_end);
}

function stripeSubscriptionMatchesBroBot(subscription: Stripe.Subscription) {
  if (subscription.metadata?.plan_code === BROBOT_CONFIG.PAID_PLAN_CODE) return true;

  const priceIds = new Set(
    [BROBOT_CONFIG.MONTHLY_PRICE_ID, BROBOT_CONFIG.YEARLY_PRICE_ID].filter(Boolean)
  );

  return subscription.items.data.some((item) => priceIds.has(item.price.id));
}

function logBroBotCheckoutTrialDebug(label: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production' || process.env.BROBOT_CHECKOUT_DEBUG === 'true') {
    console.info(`[brobot/stripe-checkout-trial-debug] ${label}`, details);
  }
}

function normalizeEmail(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase();
}

function getStripeCustomerId(value: string | { id?: string } | null | undefined) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id ?? null;
}

function getStripeEnvironment() {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (secretKey.startsWith('sk_live_')) return 'live';
  if (secretKey.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

function getIsoTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function shouldKeepExistingStripeSubscription(params: {
  existing: ExistingStripeSubscriptionRow | null;
  incomingSubscriptionId: string;
  incomingStatus: string;
  incomingPeriodEndIso: string | null;
}) {
  const { existing, incomingSubscriptionId, incomingStatus, incomingPeriodEndIso } = params;
  if (!existing?.stripe_subscription_id) return false;
  if (existing.stripe_subscription_id === incomingSubscriptionId) return false;

  const existingPeriodEnd = getIsoTime(existing.current_period_end);
  const incomingPeriodEnd = getIsoTime(incomingPeriodEndIso);

  if (existingPeriodEnd != null && incomingPeriodEnd != null && existingPeriodEnd > incomingPeriodEnd) {
    return true;
  }

  const existingStatus = existing.status ?? 'incomplete';
  const existingIsActiveLike = ['active', 'trialing', 'past_due'].includes(existingStatus);
  const incomingIsActiveLike = ['active', 'trialing', 'past_due'].includes(incomingStatus);

  if (existingIsActiveLike && !incomingIsActiveLike) {
    if (existingPeriodEnd == null) return true;
    if (incomingPeriodEnd == null) return true;
    if (existingPeriodEnd >= incomingPeriodEnd) return true;
  }

  return false;
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const periodStart = firstItem?.current_period_start ?? null;
  const periodEnd = firstItem?.current_period_end ?? null;

  return {
    periodStartIso: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    periodEndIso: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
}

function getBroBotPriceId(interval: 'month' | 'year') {
  return interval === 'year'
    ? BROBOT_CONFIG.YEARLY_PRICE_ID
    : BROBOT_CONFIG.MONTHLY_PRICE_ID;
}

function buildGuestTrialMetadata(params: {
  trialRequested?: boolean;
  trialEnd: number | null;
  trialMonths: number | null;
}) {
  const eligible =
    params.trialRequested !== false &&
    Boolean(params.trialEnd && params.trialMonths && params.trialMonths > 0);

  return {
    trial_offer_reference_id: BROBOT_CONFIG.TRIAL_OFFER_ID || '',
    trial_offer_attached: 'false',
    trial_implementation: eligible ? 'checkout_trial_end' : 'none',
    trial_duration_unit: eligible ? 'calendar_month' : '',
    trial_duration_count: params.trialMonths?.toString() ?? '',
    trial_end: params.trialEnd?.toString() ?? '',
    trial_applied: eligible ? 'true' : 'false',
    trial_eligibility_reason: eligible ? 'eligible_pre_auth' : 'trial_not_configured',
  };
}

function getCheckoutSessionEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email || session.customer_email || null;
}

function hasClaimableStripeStatus(status: string, periodEndIso: string | null) {
  if (['active', 'trialing', 'past_due'].includes(status)) return true;
  if (status === 'canceled' && periodEndIso) {
    return new Date(periodEndIso).getTime() > Date.now();
  }
  return false;
}

function stripeStatusSelectionPriority(status: string | null | undefined) {
  switch (status) {
    case 'active':
      return 5;
    case 'trialing':
      return 4;
    case 'past_due':
      return 3;
    case 'canceled':
      return 2;
    case 'incomplete':
      return 1;
    default:
      return 0;
  }
}

function compareStripeSubscriptionRows(a: StripeSubscriptionRow, b: StripeSubscriptionRow) {
  const statusDiff = stripeStatusSelectionPriority(b.status) - stripeStatusSelectionPriority(a.status);
  if (statusDiff !== 0) return statusDiff;

  const periodDiff = (getIsoTime(b.current_period_end) ?? -Infinity) - (getIsoTime(a.current_period_end) ?? -Infinity);
  if (periodDiff !== 0) return periodDiff;

  return (getIsoTime(b.updated_at) ?? -Infinity) - (getIsoTime(a.updated_at) ?? -Infinity);
}

function stripeRowGrantsPortalAccess(row: PortalSubscriptionRow, now = Date.now()) {
  const graceMs = BROBOT_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const periodEndTs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const hasFutureAccessWindow = periodEndTs != null && periodEndTs > now;
  const isStripeBacked = Boolean(row.stripe_customer_id) && row.provider !== 'apple';

  return (
    isStripeBacked &&
    (
      row.status === 'active' ||
      row.status === 'trialing' ||
      (row.status === 'past_due' && periodEndTs != null && periodEndTs + graceMs > now) ||
      (row.cancel_at_period_end === true && hasFutureAccessWindow) ||
      (row.status === 'canceled' && hasFutureAccessWindow)
    )
  );
}

async function listStripeSubscriptionsForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      user_id,
      provider,
      environment,
      status,
      plan_code,
      current_period_end,
      cancel_at_period_end,
      canceled_at,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      updated_at
    `)
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load Stripe subscriptions: ${error.message}`);
  }

  return (data ?? []) as StripeSubscriptionRow[];
}

async function getLatestStripeCustomerIdForUser(userId: string) {
  const rows = await listStripeSubscriptionsForUser(userId);
  return rows.find((row) => row.stripe_customer_id)?.stripe_customer_id ?? null;
}

export async function determineBroBotTrialDecision(params: {
  userId: string;
  stripeCustomerId?: string | null;
  enableTrial?: boolean;
  now?: Date;
}): Promise<BroBotTrialDecision> {
  const offerId = BROBOT_CONFIG.TRIAL_OFFER_ID || null;
  const trialMonths = Number.isFinite(BROBOT_CONFIG.TRIAL_MONTHS)
    ? BROBOT_CONFIG.TRIAL_MONTHS
    : 0;
  const trialEnd = getBroBotTrialEndTimestamp(params.now);

  logBroBotCheckoutTrialDebug('eligibility_start', {
    userId: params.userId,
    stripeCustomerId: params.stripeCustomerId ?? null,
    enableTrial: Boolean(params.enableTrial),
    configuredTrialOfferId: offerId,
    configuredTrialMonths: trialMonths,
    calculatedTrialEnd: trialEnd,
    calculatedTrialEndIso: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
  });

  if (!params.enableTrial || !offerId || !trialEnd || trialMonths <= 0) {
    logBroBotCheckoutTrialDebug('eligibility_result', {
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId ?? null,
      enableTrial: Boolean(params.enableTrial),
      trialEligible: false,
      trialEligibilityReason: 'trial_not_configured',
      trialEnd: null,
      trialApplied: false,
    });

    return {
      eligible: false,
      reason: 'trial_not_configured',
      offerId,
      trialEnd: null,
      trialMonths: trialMonths > 0 ? trialMonths : null,
    };
  }

  const supabase = createAdminClient();
  const { data: priorRows, error } = await supabase
    .from('subscriptions')
    .select(`
      provider,
      status,
      plan_code,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      current_period_start,
      current_period_end,
      created_at
    `)
    .eq('user_id', params.userId)
    .eq('plan_code', BROBOT_CONFIG.PAID_PLAN_CODE)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Failed to determine trial eligibility: ${error.message}`);
  }

  if ((priorRows ?? []).some((row) => hasPriorBroBotSubscriptionRow(row as TrialEligibilitySubscriptionRow))) {
    logBroBotCheckoutTrialDebug('eligibility_result', {
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId ?? null,
      enableTrial: Boolean(params.enableTrial),
      trialEligible: false,
      trialEligibilityReason: 'prior_subscription_row',
      trialEnd: null,
      trialApplied: false,
      matchingSubscriptionRows: (priorRows ?? []).map((row) => ({
        provider: row.provider,
        status: row.status,
        plan_code: row.plan_code,
        stripe_customer_id: row.stripe_customer_id,
        stripe_subscription_id: row.stripe_subscription_id,
        stripe_price_id: row.stripe_price_id,
        current_period_start: row.current_period_start,
        current_period_end: row.current_period_end,
        created_at: row.created_at,
        countedAsPriorBroBotSubscription: hasPriorBroBotSubscriptionRow(row as TrialEligibilitySubscriptionRow),
      })),
    });

    return {
      eligible: false,
      reason: 'prior_subscription_row',
      offerId,
      trialEnd: null,
      trialMonths,
    };
  }

  if (params.stripeCustomerId) {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: params.stripeCustomerId,
      status: 'all',
      limit: 100,
    });

    if (subscriptions.data.some(stripeSubscriptionMatchesBroBot)) {
      logBroBotCheckoutTrialDebug('eligibility_result', {
        userId: params.userId,
        stripeCustomerId: params.stripeCustomerId,
        enableTrial: Boolean(params.enableTrial),
        trialEligible: false,
        trialEligibilityReason: 'prior_stripe_subscription',
        trialEnd: null,
        trialApplied: false,
        stripeSubscriptionHistory: subscriptions.data.map((subscription) => ({
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
          priceIds: subscription.items.data.map((item) => item.price.id),
          trial_start: subscription.trial_start,
          trial_end: subscription.trial_end,
          matchedBroBot: stripeSubscriptionMatchesBroBot(subscription),
        })),
      });

      return {
        eligible: false,
        reason: 'prior_stripe_subscription',
        offerId,
        trialEnd: null,
        trialMonths,
      };
    }
  }

  logBroBotCheckoutTrialDebug('eligibility_result', {
    userId: params.userId,
    stripeCustomerId: params.stripeCustomerId ?? null,
    enableTrial: Boolean(params.enableTrial),
    trialEligible: true,
    trialEligibilityReason: 'eligible',
    trialEnd,
    trialEndIso: new Date(trialEnd * 1000).toISOString(),
    trialApplied: true,
  });

  return {
    eligible: true,
    reason: 'eligible',
    offerId,
    trialEnd,
    trialMonths,
  };
}

/**
 * Ensures a Stripe Customer exists for the given user.
 * Reuses the most recent saved customer ID when available.
 */
export async function getOrCreateStripeCustomer(userId: string, email?: string): Promise<string> {
  const stripe = getStripe();

  const existingCustomerId = await getLatestStripeCustomerIdForUser(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session for BroBot Unlimited.
 */
export async function createBroBotCheckoutSession(
  userId: string,
  interval: 'month' | 'year',
  email?: string,
  /** Optional overrides for mobile flows using custom URL schemes (e.g. snaportho://) */
  customSuccessUrl?: string,
  customCancelUrl?: string,
  options: {
    enableTrial?: boolean;
    source?: string;
  } = {}
): Promise<{ url: string | null }> {
  const stripe = getStripe();
  const priceId =
    interval === 'year'
      ? BROBOT_CONFIG.YEARLY_PRICE_ID
      : BROBOT_CONFIG.MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error('Stripe price ID not configured for BroBot');
  }

  const customerId = await getOrCreateStripeCustomer(userId, email);
  const trialDecision = buildRequestedBroBotTrialDecision(options.enableTrial);
  const metadata = buildBroBotCheckoutMetadata({
    userId,
    trialDecision,
    source: options.source ?? null,
    trialRequested: options.enableTrial,
  });

  // Use custom redirect URLs if provided (mobile), otherwise fall back to centralized web URLs.
  // Always call getAppBaseUrl() for the production safety throw when using web defaults.
  const successUrl = customSuccessUrl || BROBOT_CONFIG.BILLING_SUCCESS_URL;
  const cancelUrl = customCancelUrl || BROBOT_CONFIG.BILLING_CANCEL_URL;

  if (!customSuccessUrl && !customCancelUrl) {
    getAppBaseUrl(); // force throw in production if misconfigured (before creating session)
  }

  // Dev-only debug logging for redirect troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.log('[stripe] Creating Checkout Session with redirect URLs:', {
      success_url: successUrl,
      cancel_url: cancelUrl,
      isMobileCustom: !!(customSuccessUrl || customCancelUrl),
      checkout_source: options.source ?? 'direct',
      trial_applied: trialDecision.eligible,
      trial_reason: trialDecision.reason,
    });
  }

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata,
    ...(trialDecision.eligible && trialDecision.trialEnd
      ? {
          trial_end: trialDecision.trialEnd,
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel',
            },
          },
        }
      : {}),
  };

  console.info('[STRIPE_CHECKOUT]', {
    source: options.source ?? 'direct',
    userId: userId.slice(0, 8),
    priceId: summarizeStripeId(priceId),
    trial: Boolean(trialDecision.eligible && trialDecision.trialEnd),
    trialEnd: trialDecision.trialEnd,
    trialPeriodDays: null,
    planCode: BROBOT_CONFIG.PAID_PLAN_CODE,
  });

  logBroBotCheckoutTrialDebug('checkout_create_params', {
    userId,
    stripeCustomerId: customerId,
    enableTrial: Boolean(options.enableTrial),
    checkoutSource: options.source ?? 'direct',
    trialEligible: trialDecision.eligible,
    trialEligibilityReason: trialDecision.reason,
    trialEnd: trialDecision.trialEnd,
    trialEndIso: trialDecision.trialEnd
      ? new Date(trialDecision.trialEnd * 1000).toISOString()
      : null,
    trialApplied: Boolean(trialDecision.eligible && trialDecision.trialEnd),
    mode: 'subscription',
    lineItemPriceId: priceId,
    subscription_data: subscriptionData,
    metadata,
  });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    client_reference_id: userId, // stable identifier for webhook resolution
    metadata,
    subscription_data: subscriptionData,
  });

  logBroBotCheckoutTrialDebug('checkout_create_result', {
    userId,
    stripeCustomerId: customerId,
    enableTrial: Boolean(options.enableTrial),
    checkoutSource: options.source ?? 'direct',
    trialEligible: trialDecision.eligible,
    trialEligibilityReason: trialDecision.reason,
    trialEnd: trialDecision.trialEnd,
    trialApplied: Boolean(trialDecision.eligible && trialDecision.trialEnd),
    subscription_data: subscriptionData,
    checkoutSessionId: session.id,
    checkoutSessionUrlPresent: Boolean(session.url),
    checkoutSessionMode: session.mode,
    checkoutSessionSubscription: session.subscription,
    checkoutSessionMetadata: session.metadata,
  });

  return { url: session.url };
}

export async function createGuestBroBotCheckoutSession(
  interval: 'month' | 'year',
  options: {
    enableTrial?: boolean;
    source?: string;
    campaign?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
  } = {}
): Promise<{ url: string | null }> {
  const stripe = getStripe();
  const priceId = getBroBotPriceId(interval);

  if (!priceId) {
    throw new Error('Stripe price ID not configured for BroBot');
  }

  getAppBaseUrl();

  const trialMonths = Number.isFinite(BROBOT_CONFIG.TRIAL_MONTHS)
    ? BROBOT_CONFIG.TRIAL_MONTHS
    : 0;
  const trialEnd = getBroBotTrialEndTimestamp();
  const metadata = {
    product: 'brobot',
    plan: BROBOT_CONFIG.PAID_PLAN_CODE,
    plan_code: BROBOT_CONFIG.PAID_PLAN_CODE,
    source: options.source || 'brobot_public_pricing',
    trial_requested: options.enableTrial === false ? 'false' : 'true',
    checkout_mode: 'pre_auth',
    interval,
    campaign: options.campaign || '',
    utm_source: options.utmSource || '',
    utm_medium: options.utmMedium || '',
    utm_campaign: options.utmCampaign || '',
    utm_term: options.utmTerm || '',
    utm_content: options.utmContent || '',
    ...buildGuestTrialMetadata({
      trialRequested: options.enableTrial,
      trialEnd,
      trialMonths: trialMonths > 0 ? trialMonths : null,
    }),
  };

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata,
    ...(options.enableTrial !== false && trialEnd
      ? {
          trial_end: trialEnd,
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel',
            },
          },
        }
      : {}),
  };

  const sessionParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: getCheckoutSuccessUrl(),
    cancel_url: `${getAppBaseUrl()}/brobot/pricing?canceled=true`,
    customer_creation: 'always',
    metadata,
    subscription_data: subscriptionData,
  } as Stripe.Checkout.SessionCreateParams;

  console.info('[STRIPE_CHECKOUT]', {
    source: options.source || 'brobot_public_pricing',
    userId: 'guest',
    priceId: summarizeStripeId(priceId),
    trial: Boolean(options.enableTrial !== false && trialEnd),
    trialEnd,
    trialPeriodDays: null,
    planCode: BROBOT_CONFIG.PAID_PLAN_CODE,
  });

  const session = await stripe.checkout.sessions.create(sessionParams);

  logBroBotCheckoutTrialDebug('guest_checkout_create_result', {
    interval,
    checkoutSource: options.source || 'brobot_public_pricing',
    trialRequested: options.enableTrial !== false,
    trialEnd,
    subscription_data: subscriptionData,
    checkoutSessionId: session.id,
    checkoutSessionUrlPresent: Boolean(session.url),
    metadata,
  });

  return { url: session.url };
}

export async function upsertPendingSubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session,
  stripeSub: Stripe.Subscription
) {
  const supabase = createAdminClient();
  const email = getCheckoutSessionEmail(session);
  const customerId = getStripeCustomerId(session.customer) || getStripeCustomerId(stripeSub.customer);

  if (!email) {
    throw new Error(`Cannot create pending subscription without checkout email for session ${session.id}`);
  }

  if (!customerId) {
    throw new Error(`Cannot create pending subscription without Stripe customer for session ${session.id}`);
  }

  const priceId = stripeSub.items.data[0]?.price.id || null;
  const { periodStartIso, periodEndIso } = getSubscriptionPeriod(stripeSub);
  const metadata = {
    checkout_session_metadata: session.metadata ?? {},
    subscription_metadata: stripeSub.metadata ?? {},
  };

  const payload = {
    email,
    stripe_customer_id: customerId,
    stripe_subscription_id: stripeSub.id,
    stripe_price_id: priceId,
    checkout_session_id: session.id,
    plan_code: stripeSub.metadata?.plan_code || session.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
    status: mapStripeStatusToInternal(stripeSub.status),
    current_period_start: periodStartIso,
    current_period_end: periodEndIso,
    metadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('pending_subscriptions')
    .upsert(payload, { onConflict: 'checkout_session_id' })
    .select('*')
    .single<PendingBroBotSubscriptionRow>();

  if (error) {
    throw new Error(`Failed to upsert pending subscription: ${error.message}`);
  }

  return data;
}

export async function syncPendingSubscriptionFromStripe(stripeSub: Stripe.Subscription) {
  const supabase = createAdminClient();
  const priceId = stripeSub.items.data[0]?.price.id || null;
  const { periodStartIso, periodEndIso } = getSubscriptionPeriod(stripeSub);

  const { data: pending, error: pendingError } = await supabase
    .from('pending_subscriptions')
    .select('id, claimed_at')
    .eq('stripe_subscription_id', stripeSub.id)
    .maybeSingle<{ id: string; claimed_at: string | null }>();

  if (pendingError) {
    throw new Error(`Failed to load pending subscription: ${pendingError.message}`);
  }

  if (!pending) {
    return { synced: false, claimed: false };
  }

  const { error } = await supabase
    .from('pending_subscriptions')
    .update({
      stripe_price_id: priceId,
      status: mapStripeStatusToInternal(stripeSub.status),
      current_period_start: periodStartIso,
      current_period_end: periodEndIso,
      metadata: {
        subscription_metadata: stripeSub.metadata ?? {},
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id);

  if (error) {
    throw new Error(`Failed to sync pending subscription: ${error.message}`);
  }

  return { synced: true, claimed: Boolean(pending.claimed_at) };
}

export async function claimPendingBroBotSubscriptionForUser(
  userId: string,
  email: string | null | undefined,
  options: {
    checkoutSessionId?: string | null;
  } = {}
): Promise<ClaimPendingSubscriptionResult> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { status: 'not_found' };
  }

  const entitlement = await getRemainingAIUses({ type: 'user', id: userId });
  if (entitlement.source === 'subscription') {
    return { status: 'already_has_subscription' };
  }

  const supabase = createAdminClient();
  let pending: PendingBroBotSubscriptionRow | null = null;

  if (options.checkoutSessionId) {
    const { data, error } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('checkout_session_id', options.checkoutSessionId)
      .maybeSingle<PendingBroBotSubscriptionRow>();

    if (error) {
      throw new Error(`Failed to load pending subscription: ${error.message}`);
    }

    pending = data;

    if (pending && pending.normalized_email !== normalizedEmail) {
      return { status: 'email_mismatch', pendingEmail: pending.email };
    }
  } else {
    const { data, error } = await supabase
      .from('pending_subscriptions')
      .select('*')
      .eq('normalized_email', normalizedEmail)
      .is('claimed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<PendingBroBotSubscriptionRow>();

    if (error) {
      throw new Error(`Failed to load pending subscription: ${error.message}`);
    }

    pending = data;
  }

  if (!pending) {
    return { status: 'not_found' };
  }

  if (pending.claimed_by_user_id === userId && pending.claimed_at) {
    return {
      status: 'already_claimed_by_user',
      subscriptionId: pending.stripe_subscription_id,
      pendingId: pending.id,
    };
  }

  if (pending.claimed_at) {
    return { status: 'not_claimable', reason: 'already_claimed' };
  }

  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(pending.stripe_subscription_id);
  const { periodStartIso, periodEndIso } = getSubscriptionPeriod(stripeSub);
  const internalStatus = mapStripeStatusToInternal(stripeSub.status);

  if (!hasClaimableStripeStatus(internalStatus, periodEndIso)) {
    await syncPendingSubscriptionFromStripe(stripeSub);
    return { status: 'not_claimable', reason: `subscription_${internalStatus}` };
  }

  await stripe.subscriptions.update(stripeSub.id, {
    metadata: {
      ...stripeSub.metadata,
      user_id: userId,
      plan_code: stripeSub.metadata?.plan_code || pending.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
      checkout_mode: stripeSub.metadata?.checkout_mode || 'pre_auth',
      claimed_from_pending_subscription_id: pending.id,
    },
  });

  await upsertCanonicalSubscription({
    user_id: userId,
    provider: 'stripe',
    environment: getStripeEnvironment(),
    provider_customer_id: getStripeCustomerId(stripeSub.customer),
    provider_subscription_id: stripeSub.id,
    provider_product_id:
      typeof stripeSub.items.data[0]?.price.product === 'string'
        ? stripeSub.items.data[0]?.price.product
        : stripeSub.items.data[0]?.price.product?.id ?? null,
    provider_price_id: stripeSub.items.data[0]?.price.id || pending.stripe_price_id,
    provider_original_transaction_id: null,
    provider_transaction_id:
      stripeSub.latest_invoice
        ? (
            typeof stripeSub.latest_invoice === 'string'
              ? stripeSub.latest_invoice
              : (stripeSub.latest_invoice.id ?? null)
          )
        : null,
    raw_provider_status: stripeSub.status,
    provider_metadata: {
      provider: 'stripe',
      claim_source: 'pending_subscription',
      metadata: stripeSub.metadata ?? {},
    },
    plan_code: pending.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE,
    status: internalStatus as
      | 'active'
      | 'trialing'
      | 'past_due'
      | 'canceled'
      | 'expired'
      | 'unpaid'
      | 'incomplete'
      | 'grace'
      | 'billing_retry',
    current_period_start: periodStartIso,
    current_period_end: periodEndIso,
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    canceled_at: stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000).toISOString()
      : null,
    last_verified_at: new Date().toISOString(),
    stripe_customer_id: getStripeCustomerId(stripeSub.customer),
    stripe_subscription_id: stripeSub.id,
    stripe_price_id: stripeSub.items.data[0]?.price.id || pending.stripe_price_id,
  });

  const { data: claimedRows, error: claimError } = await supabase
    .from('pending_subscriptions')
    .update({
      claimed_by_user_id: userId,
      claimed_at: new Date().toISOString(),
      status: internalStatus,
      current_period_start: periodStartIso,
      current_period_end: periodEndIso,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pending.id)
    .is('claimed_at', null)
    .select('id');

  if (claimError) {
    throw new Error(`Failed to mark pending subscription claimed: ${claimError.message}`);
  }

  if (!claimedRows?.length) {
    return { status: 'not_claimable', reason: 'claim_race_lost' };
  }

  return {
    status: 'claimed',
    subscriptionId: stripeSub.id,
    pendingId: pending.id,
  };
}

/**
 * Creates a Stripe Customer Portal session for managing billing.
 */
export async function createBillingPortalSession(
  userId: string,
  /** Optional custom return URL (e.g. mobile snaportho://subscription/portal-return) */
  customReturnUrl?: string
): Promise<{ url: string | null }> {
  const stripe = getStripe();

  const allRows = await listStripeSubscriptionsForUser(userId);
  const sortedRows = [...allRows].sort(compareStripeSubscriptionRows);
  const manageableRow = sortedRows.find((row) => stripeRowGrantsPortalAccess(row as PortalSubscriptionRow));
  const sub = (manageableRow ?? sortedRows[0] ?? null) as PortalSubscriptionRow | null;

  const now = Date.now();
  const periodEndTs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const hasStripeCustomerId = Boolean(sub?.stripe_customer_id);
  const hasStripeSubscriptionId = Boolean(sub?.stripe_subscription_id);
  const hasFutureAccessWindow = periodEndTs != null && periodEndTs > now;
  const isManageable = !!sub && stripeRowGrantsPortalAccess(sub, now);

  logPortalDecision('subscription_selected', {
    userId: userId.slice(0, 8),
    selectedRowExists: Boolean(sub),
    provider: sub?.provider ?? null,
    status: sub?.status ?? null,
    hasStripeCustomerId,
    hasStripeSubscriptionId,
    currentPeriodEndInFuture: hasFutureAccessWindow,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? null,
      rowsConsidered: sortedRows.map((row) => ({
        status: row.status,
        currentPeriodEnd: row.current_period_end,
        stripeSubscriptionId: summarizeStripeId(row.stripe_subscription_id),
      })),
      environmentMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
        ? 'live'
        : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
      ? 'test'
      : 'unknown',
  });

  if (!sub || !hasStripeCustomerId || sub.provider === 'apple') {
    throw new NoManageableStripeSubscriptionError();
  }

  if (!isManageable) {
    throw new SubscriptionNotManageableError();
  }

  const customerId = sub.stripe_customer_id;
  if (!customerId) {
    throw new NoManageableStripeSubscriptionError();
  }

  // Use custom return URL (mobile) or fall back to web (with production safety check)
  let returnUrl: string;
  if (customReturnUrl) {
    returnUrl = customReturnUrl;
  } else {
    getAppBaseUrl(); // force throw in production
    returnUrl = getBillingPortalReturnUrl();
  }

  try {
    logPortalDecision('portal_create_attempt', {
      userId: userId.slice(0, 8),
      customerId: summarizeStripeId(customerId),
      subscriptionId: summarizeStripeId(sub.stripe_subscription_id),
      status: sub.status,
    });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: portal.url };
  } catch (error) {
    const summary = summarizeStripeError(error);
    console.error('[stripe/portal] portal_create_failed', {
      userId: userId.slice(0, 8),
      status: sub.status,
      provider: sub.provider ?? null,
      hasStripeCustomerId,
      hasStripeSubscriptionId,
      currentPeriodEndInFuture: hasFutureAccessWindow,
      stripeErrorType: summary.type,
      stripeErrorCode: summary.code,
      stripeErrorMessage: summary.message,
    });

    if (
      isSubscriptionNotManageableStripeError(error, {
        status: sub.status,
        currentPeriodEndInFuture: hasFutureAccessWindow,
      })
    ) {
      throw new SubscriptionNotManageableError();
    }

    throw new BillingPortalSessionFailedError();
  }
}

/**
 * Maps Stripe subscription status to our internal enum.
 */
export function mapStripeStatusToInternal(status: Stripe.Subscription.Status): string {
  const mapping: Record<Stripe.Subscription.Status, string> = {
    active: 'active',
    past_due: 'past_due',
    unpaid: 'unpaid',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    trialing: 'trialing',
    paused: 'past_due',
  };
  return mapping[status] || 'incomplete';
}

/**
 * Syncs a Stripe Subscription object into our database.
 * Called from webhooks and defensively from other places.
 */
export type SyncSubscriptionFromStripeResult =
  | { synced: true; userId: string; subscriptionId: string; rowId: string | null }
  | { synced: false; reason: 'missing_user_id' | 'upsert_failed'; subscriptionId: string };

/** Legacy production index removed by 20260630_180000_stripe_resubscribe_history.sql */
export function isLegacyStripeUserProviderConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('subscriptions_user_provider_idx');
}

/**
 * Stripe-only write path.
 *
 * Primary path: upsert by stripe_subscription_id (supports multiple historical rows).
 * Legacy fallback: if the old (user_id, provider) unique index is still present on a
 * stale database, update the existing Stripe row in place instead of failing checkout.
 * Never touches provider=apple.
 */
async function upsertStripeBrobotSubscription(
  upsertPayload: Parameters<typeof upsertCanonicalSubscription>[0],
  userId: string
) {
  if (upsertPayload.provider !== 'stripe') {
    return upsertCanonicalSubscription(upsertPayload);
  }

  try {
    return await upsertCanonicalSubscription(upsertPayload);
  } catch (error) {
    if (!isLegacyStripeUserProviderConstraintError(error)) {
      throw error;
    }

    console.warn('[stripe] legacy_resubscribe_fallback_triggered', {
      provider: 'stripe',
      stripe_subscription_id: upsertPayload.stripe_subscription_id,
      user_id: userId.slice(0, 8),
      hint: 'Apply migration 20260630_180000_stripe_resubscribe_history.sql to drop subscriptions_user_provider_idx',
    });

    const supabase = createAdminClient();
    const { data, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: upsertPayload.status,
        current_period_start: upsertPayload.current_period_start,
        current_period_end: upsertPayload.current_period_end,
        cancel_at_period_end: upsertPayload.cancel_at_period_end,
        canceled_at: upsertPayload.canceled_at,
        provider_customer_id: upsertPayload.provider_customer_id,
        provider_subscription_id: upsertPayload.provider_subscription_id,
        provider_product_id: upsertPayload.provider_product_id,
        provider_price_id: upsertPayload.provider_price_id,
        provider_transaction_id: upsertPayload.provider_transaction_id,
        raw_provider_status: upsertPayload.raw_provider_status,
        provider_metadata: upsertPayload.provider_metadata,
        last_verified_at: upsertPayload.last_verified_at,
        stripe_customer_id: upsertPayload.stripe_customer_id,
        stripe_subscription_id: upsertPayload.stripe_subscription_id,
        stripe_price_id: upsertPayload.stripe_price_id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'stripe')
      .eq('plan_code', upsertPayload.plan_code)
      .select('*')
      .maybeSingle();

    if (updateError) {
      throw new Error(`Failed to update existing Stripe subscription row: ${updateError.message}`);
    }

    if (!data) {
      throw error;
    }

    console.log('[stripe] legacy_resubscribe_fallback_applied', {
      provider: 'stripe',
      stripe_subscription_id: upsertPayload.stripe_subscription_id,
      user_id: userId.slice(0, 8),
      db_row_id: data.id ?? null,
    });

    return { applied: true, payload: upsertPayload, row: data };
  }
}

export async function syncSubscriptionFromStripe(
  stripeSub: Stripe.Subscription
): Promise<SyncSubscriptionFromStripeResult> {
  const supabase = createAdminClient();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[stripe] syncSubscriptionFromStripe called', {
      subscriptionId: stripeSub.id,
      status: stripeSub.status,
      metadataUserId: stripeSub.metadata?.user_id,
      customer: stripeSub.customer,
    });
  }

  let userId = stripeSub.metadata?.user_id;

  if (!userId) {
    const { data: existingBySubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', stripeSub.id)
      .limit(1)
      .maybeSingle<{ user_id: string }>();

    if (existingBySubscription?.user_id) {
      userId = existingBySubscription.user_id;
    }
  }

  // Fallback: look up by customer if metadata is missing (very useful after checkout)
  if (!userId && stripeSub.customer) {
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.user_id) {
      userId = existing.user_id;
      console.log('[stripe] syncSubscriptionFromStripe recovered user_id from customer mapping', {
        customerId,
        userId,
      });
    }
  }

  if (!userId) {
    console.error('[stripe] syncSubscriptionFromStripe: missing user_id in metadata and no customer mapping found', {
      provider: 'stripe',
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id:
        typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id ?? null,
      action: 'skipped',
    });
    return {
      synced: false,
      reason: 'missing_user_id',
      subscriptionId: stripeSub.id,
    };
  }

  const planCode = stripeSub.metadata?.plan_code || BROBOT_CONFIG.PAID_PLAN_CODE;
  const priceId = stripeSub.items.data[0]?.price.id || null;

  const internalStatus = mapStripeStatusToInternal(stripeSub.status);

  console.log('[STRIPE_WEBHOOK]', {
    event: 'syncSubscriptionFromStripe',
    subscriptionStatus: stripeSub.status,
    plan: planCode,
    userId: userId.slice(0, 8),
    subscriptionId: summarizeStripeId(stripeSub.id),
  });

  // In Stripe SDK v18 (API 2025-03-31+), current_period_start/end moved from
  // Subscription to SubscriptionItem. Use the first item as source of truth.
  const firstItem = stripeSub.items.data[0];
  const periodStart = firstItem?.current_period_start ?? null;
  const periodEnd = firstItem?.current_period_end ?? null;

  const upsertPayload = {
    user_id: userId,
    provider: 'stripe',
    environment: getStripeEnvironment(),
    provider_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
    provider_subscription_id: stripeSub.id,
    provider_product_id:
      typeof priceId === 'string' && typeof stripeSub.items.data[0]?.price.product === 'string'
        ? stripeSub.items.data[0]?.price.product
        : typeof stripeSub.items.data[0]?.price.product === 'object'
        ? stripeSub.items.data[0]?.price.product?.id ?? null
        : null,
    provider_price_id: priceId,
    provider_original_transaction_id: null,
    provider_transaction_id:
      stripeSub.latest_invoice
        ? (
            typeof stripeSub.latest_invoice === 'string'
              ? stripeSub.latest_invoice
              : (stripeSub.latest_invoice.id ?? null)
          )
        : null,
    raw_provider_status: stripeSub.status,
    provider_metadata: {
      provider: 'stripe',
      metadata: stripeSub.metadata ?? {},
    },
    plan_code: planCode,
    status: internalStatus as
      | 'active'
      | 'trialing'
      | 'past_due'
      | 'canceled'
      | 'expired'
      | 'unpaid'
      | 'incomplete'
      | 'grace'
      | 'billing_retry',
    current_period_start: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end: stripeSub.cancel_at_period_end,
    canceled_at: stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000).toISOString()
      : null,
    last_verified_at: new Date().toISOString(),
    stripe_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
    stripe_subscription_id: stripeSub.id,
    stripe_price_id: priceId,
  };

  let upserted;
  try {
    upserted = await upsertStripeBrobotSubscription(upsertPayload, userId);
  } catch (error) {
    console.error('[stripe] syncSubscriptionFromStripe upsert failed', {
      provider: 'stripe',
      stripe_subscription_id: stripeSub.id,
      user_id: userId.slice(0, 8),
      action: 'upsert_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      synced: false,
      reason: 'upsert_failed',
      subscriptionId: stripeSub.id,
    };
  }

  console.log('[stripe] syncSubscriptionFromStripe upsert', {
    provider: 'stripe',
    stripe_subscription_id: stripeSub.id,
    stripe_customer_id: upsertPayload.stripe_customer_id,
    user_id: userId.slice(0, 8),
    action: 'upserted',
    db_row_id: upserted.row?.id ?? null,
    resolvedStatus: internalStatus,
    upsertApplied: upserted.applied,
  });

  return {
    synced: true,
    userId,
    subscriptionId: stripeSub.id,
    rowId: upserted.row?.id ?? null,
  };
}

export async function reconcileStripeSubscriptions(params: {
  userId?: string | null;
  stripeCustomerId?: string | null;
}) {
  const stripe = getStripe();
  const customerId = params.stripeCustomerId
    ?? (params.userId ? await getLatestStripeCustomerIdForUser(params.userId) : null);

  if (!customerId) {
    return {
      customerId: null,
      syncedCount: 0,
      matchedCount: 0,
      subscriptions: [] as Array<{ id: string; status: string; matchedBroBot: boolean }>,
    };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });

  const relevant = subscriptions.data.filter((subscription) => stripeSubscriptionMatchesBroBot(subscription));

  for (const subscription of relevant) {
    await syncSubscriptionFromStripe(subscription);
  }

  return {
    customerId,
    syncedCount: relevant.length,
    matchedCount: relevant.length,
    subscriptions: subscriptions.data.map((subscription) => ({
      id: subscription.id,
      status: subscription.status,
      matchedBroBot: stripeSubscriptionMatchesBroBot(subscription),
    })),
  };
}
