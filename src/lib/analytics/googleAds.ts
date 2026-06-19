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
  conversionLabel?: string;
  value?: number;
  currency?: string;
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
  conversionLabel,
  value,
  currency,
  transactionId,
  eventCallback,
  eventTimeout,
}: GoogleAdsConversionParams = {}) {
  const gtag = getGtag();

  if (!gtag || !GOOGLE_ADS_ID || !conversionLabel) {
    return;
  }

  gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${conversionLabel}`,
    value,
    currency,
    transaction_id: transactionId,
    event_callback: eventCallback,
    event_timeout: eventTimeout,
  });
}

export function trackSignupConversion() {
  trackGoogleAdsConversion({
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
