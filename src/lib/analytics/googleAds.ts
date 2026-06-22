type GtagEventParams = Record<string, string | number | boolean | (() => void) | undefined>;

type Gtag = (
  command: "event",
  eventName: string,
  params?: GtagEventParams,
) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";
const CREATE_ACCOUNT_CONVERSION_SEND_TO =
  "AW-18233960538/YM_gCOS4ksIcENrQ0PZD";

const CONVERSION_LABELS = {
  signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_CONVERSION_LABEL ?? "",
  subscription: process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIPTION_CONVERSION_LABEL ?? "",
  checkoutStarted: process.env.NEXT_PUBLIC_GOOGLE_ADS_CHECKOUT_STARTED_CONVERSION_LABEL ?? "",
  landingCta: process.env.NEXT_PUBLIC_GOOGLE_ADS_LANDING_CTA_CONVERSION_LABEL ?? "",
  casePrep: process.env.NEXT_PUBLIC_GOOGLE_ADS_CASE_PREP_CONVERSION_LABEL ?? "",
  broBotConversation:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_BROBOT_CONVERSATION_CONVERSION_LABEL ?? "",
};

export type GoogleAdsConversionParams = {
  sendTo?: string;
  conversionLabel?: string;
  value?: number;
  currency?: string;
  eventName?: string;
  transactionId?: string;
  eventCallback?: () => void;
  eventTimeout?: number;
};

function getGtag(): Gtag | null {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return null;
  }

  return window.gtag;
}

export function trackGoogleAdsConversion({
  sendTo,
  conversionLabel,
  value,
  currency,
  eventName,
  transactionId,
  eventCallback,
  eventTimeout,
}: GoogleAdsConversionParams = {}) {
  const gtag = getGtag();
  const resolvedSendTo =
    sendTo || (GOOGLE_ADS_ID && conversionLabel ? `${GOOGLE_ADS_ID}/${conversionLabel}` : "");

  if (!gtag || !resolvedSendTo) {
    return false;
  }

  gtag("event", "conversion", {
    send_to: resolvedSendTo,
    value,
    currency,
    event_name: eventName,
    transaction_id: transactionId,
    event_callback: eventCallback,
    event_timeout: eventTimeout,
  });

  return true;
}

export function trackGoogleAdsEvent(
  eventName: string,
  params: GtagEventParams = {}
) {
  const gtag = getGtag();

  if (!gtag) {
    return false;
  }

  gtag("event", eventName, params);
  return true;
}

export function trackCreateAccountConversion() {
  const fired = trackGoogleAdsConversion({
    sendTo: CREATE_ACCOUNT_CONVERSION_SEND_TO,
    value: 1,
    currency: "USD",
    eventName: "Create Account",
  });

  if (fired && process.env.NODE_ENV === "development") {
    console.info("[Google Ads] Create Account conversion fired");
  }

  return fired;
}

export function trackSignupConversion() {
  return trackGoogleAdsConversion({
    conversionLabel: CONVERSION_LABELS.signup,
  });
}

export function trackSubscriptionConversion(params: GoogleAdsConversionParams = {}) {
  trackGoogleAdsConversion({
    ...params,
    conversionLabel: params.conversionLabel || CONVERSION_LABELS.subscription,
  });
}

export function trackCheckoutStartedConversion(params: GoogleAdsConversionParams = {}) {
  trackGoogleAdsConversion({
    ...params,
    conversionLabel: params.conversionLabel || CONVERSION_LABELS.checkoutStarted,
  });
}

export function trackLandingCtaConversion(params: GoogleAdsConversionParams = {}) {
  trackGoogleAdsConversion({
    ...params,
    conversionLabel: params.conversionLabel || CONVERSION_LABELS.landingCta,
  });
}

export function trackBroBotLandingPageView() {
  return trackGoogleAdsEvent("landing_page_view", {
    page: "brobot_landing",
  });
}

export function trackBroBotPricingPageView() {
  return trackGoogleAdsEvent("pricing_page_view", {
    page: "brobot_pricing",
  });
}

export function trackTryBroBotFreeClick() {
  trackGoogleAdsEvent("try_brobot_free_click", {
    page: "brobot_landing",
  });
  trackGoogleAdsEvent("landing_try_free_click", {
    page: "brobot_landing",
  });

  return trackLandingCtaConversion({
    eventName: "try_brobot_free_click",
  });
}

export function trackPricingClick() {
  trackGoogleAdsEvent("pricing_click", {
    page: "brobot_landing",
  });
  trackGoogleAdsEvent("landing_pricing_click", {
    page: "brobot_landing",
  });

  return trackLandingCtaConversion({
    eventName: "pricing_click",
  });
}

export function trackLandingStartTrialClick() {
  trackGoogleAdsEvent("landing_start_trial_click", {
    page: "brobot_landing",
  });

  return trackLandingCtaConversion({
    eventName: "landing_start_trial_click",
  });
}

export function trackCheckoutStartEvent(params: GtagEventParams = {}) {
  trackGoogleAdsEvent("checkout_start", params);
  trackGoogleAdsEvent("start_checkout", params);

  return trackCheckoutStartedConversion({
    value: typeof params.value === "number" ? params.value : undefined,
    currency: typeof params.currency === "string" ? params.currency : undefined,
    eventName: "checkout_start",
  });
}

export function trackSignupStartEvent(params: GtagEventParams = {}) {
  return trackGoogleAdsEvent("signup_start", params);
}

export function trackCheckoutCompletedEvent(params: GtagEventParams = {}) {
  return trackGoogleAdsEvent("checkout_completed", params);
}

export function trackAccountCreatedEvent(params: GtagEventParams = {}) {
  return trackGoogleAdsEvent("account_created", params);
}

export function trackSubscriptionClaimedEvent(params: GtagEventParams = {}) {
  return trackGoogleAdsEvent("subscription_claimed", params);
}

export function trackFirstBroBotMessageEvent(params: GtagEventParams = {}) {
  return trackGoogleAdsEvent("first_brobot_message", params);
}

export function trackCasePrepConversion() {
  trackGoogleAdsConversion({
    conversionLabel: CONVERSION_LABELS.casePrep,
  });
}

export function trackBroBotConversationConversion() {
  trackGoogleAdsConversion({
    conversionLabel: CONVERSION_LABELS.broBotConversation,
  });
}
