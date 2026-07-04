type EnvReader = Record<string, string | undefined>;

export type MobileSubscriptionDisplayConfig = {
  planName: string;
  planCardTitle: string;
  planCardSubtitle: string;
  description: string;
  apple: {
    enabled: boolean;
    buttonTitle: string;
    subtitle: string;
    priceText: string;
    trialText: string;
  };
  stripe: {
    enabled: boolean;
    buttonTitle: string;
    subtitle: string;
    priceText: string;
    trialText: string;
  };
  restore: {
    buttonTitle: string;
  };
  offerCode: {
    buttonTitle: string;
    subtitle: string;
  };
  legal: {
    privacyTitle: string;
    termsTitle: string;
  };
  countryOverrides: Record<string, never>;
  fallbackUpdatedAt: string;
};

const FALLBACK_UPDATED_AT = '2026-07-04T00:00:00Z';

function readString(env: EnvReader, key: string, fallback: string) {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

function readBool(env: EnvReader, key: string, fallback: boolean) {
  const value = env[key]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

export function getMobileSubscriptionDisplayConfig(
  env: EnvReader = process.env
): MobileSubscriptionDisplayConfig {
  const planName = readString(env, 'MOBILE_SUB_PLAN_NAME', 'BroBot Unlimited');
  const defaultPriceText = readString(env, 'MOBILE_SUB_PRICE_TEXT', '$3.99/month');
  const defaultTrialText = readString(env, 'MOBILE_SUB_TRIAL_TEXT', '1 month free');

  return {
    planName,
    planCardTitle: readString(env, 'MOBILE_SUB_PLAN_CARD_TITLE', planName),
    planCardSubtitle: readString(
      env,
      'MOBILE_SUB_PLAN_CARD_SUBTITLE',
      'Use BroBot for unlimited case prep, anatomy review, and practical orthopaedic learning.'
    ),
    description: readString(
      env,
      'MOBILE_SUB_DESCRIPTION',
      'Unlimited access to BroBot AI-powered orthopaedic case prep, review, and learning.'
    ),
    apple: {
      enabled: readBool(env, 'MOBILE_SUB_APPLE_ENABLED', true),
      buttonTitle: readString(env, 'MOBILE_SUB_APPLE_BUTTON_TITLE', 'Start free trial with Apple'),
      subtitle: readString(env, 'MOBILE_SUB_APPLE_SUBTITLE', `${defaultTrialText}, then ${defaultPriceText}`),
      priceText: readString(env, 'MOBILE_SUB_APPLE_PRICE_TEXT', defaultPriceText),
      trialText: readString(env, 'MOBILE_SUB_APPLE_TRIAL_TEXT', defaultTrialText),
    },
    stripe: {
      enabled: readBool(env, 'MOBILE_SUB_STRIPE_ENABLED', true),
      buttonTitle: readString(env, 'MOBILE_SUB_STRIPE_BUTTON_TITLE', 'Start free trial with Stripe'),
      subtitle: readString(env, 'MOBILE_SUB_STRIPE_SUBTITLE', '1 month free, then monthly billing'),
      priceText: readString(env, 'MOBILE_SUB_STRIPE_PRICE_TEXT', defaultPriceText),
      trialText: readString(env, 'MOBILE_SUB_STRIPE_TRIAL_TEXT', defaultTrialText),
    },
    restore: {
      buttonTitle: readString(env, 'MOBILE_SUB_RESTORE_BUTTON_TITLE', 'Restore Purchases'),
    },
    offerCode: {
      buttonTitle: readString(env, 'MOBILE_SUB_OFFER_CODE_BUTTON_TITLE', 'Redeem Offer Code'),
      subtitle: readString(
        env,
        'MOBILE_SUB_OFFER_CODE_SUBTITLE',
        'Use an App Store code for BroBot Unlimited'
      ),
    },
    legal: {
      privacyTitle: readString(env, 'MOBILE_SUB_PRIVACY_TITLE', 'Privacy Policy'),
      termsTitle: readString(env, 'MOBILE_SUB_TERMS_TITLE', 'Terms of Use'),
    },
    countryOverrides: {},
    fallbackUpdatedAt: readString(env, 'MOBILE_SUB_FALLBACK_UPDATED_AT', FALLBACK_UPDATED_AT),
  };
}
