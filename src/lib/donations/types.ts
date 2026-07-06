export type DonationVia = 'Stripe' | 'PayPal' | 'Other';

export type DonationRow = {
  id: string;
  billing_name: string | null;
  display_name: string | null;
  anonymous: boolean;
  email: string;
  message: string | null;
  amount: number;
  stripe_id: string;
  stripe_event_id: string | null;
  status: string;
  created_at: string;
};

export type DonationListItem = {
  name: string;
  amount: number;
  dateISO: string;
  via: DonationVia;
  note?: string;
};

export type DonationsApiResponse = {
  source: string;
  donations: DonationListItem[];
  totals: {
    sumCents: number;
    sumDollars: number;
    count: number;
  };
};

export type DonationPaymentIntentMetadata = {
  billing_name?: string;
  display_name?: string;
  anonymous?: string;
  email?: string;
  message?: string;
};