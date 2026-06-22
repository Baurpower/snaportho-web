export const BROBOT_PRICING = {
  free: {
    name: 'Free',
    priceLabel: '$0',
    dailyAccessLabel: 'Limited daily access',
  },
  unlimited: {
    name: 'BroBot Unlimited',
    monthlyPrice: 2.99,
    yearlyPrice: 29.99,
    monthlyPriceLabel: '$2.99/month',
    yearlyPriceLabel: '$29.99/year',
    monthlyAfterTrialLabel: 'Then $2.99/month',
    yearlyAfterTrialLabel: 'Then $29.99/year',
    trialLabel: 'Free for 1 month',
    yearlySavingsLabel: 'Save $5.89 vs monthly',
  },
} as const;
