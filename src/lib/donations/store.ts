import { createAdminClient } from '@/lib/supabase/admin';
import type { DonationPaymentIntentMetadata } from './types';

export type InsertDonationParams = {
  billingName: string;
  displayName: string;
  anonymous: boolean;
  email: string;
  message: string;
  amountCents: number;
  stripePaymentIntentId: string;
  stripeEventId: string;
};

export async function getExistingDonationByStripeEventId(stripeEventId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('donations')
    .select('id, stripe_event_id, stripe_id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getExistingDonationByPaymentIntentId(stripePaymentIntentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('donations')
    .select('id, stripe_event_id, stripe_id')
    .eq('stripe_id', stripePaymentIntentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertDonation(params: InsertDonationParams) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('donations')
    .insert({
      billing_name: params.billingName,
      display_name: params.displayName,
      anonymous: params.anonymous,
      email: params.email,
      message: params.message,
      amount: params.amountCents,
      stripe_id: params.stripePaymentIntentId,
      stripe_event_id: params.stripeEventId,
      status: 'paid',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export function parseDonationMetadata(metadata: DonationPaymentIntentMetadata | null | undefined) {
  const billingName = (metadata?.billing_name ?? '').trim();
  const displayName = (metadata?.display_name ?? '').trim();
  const anonRaw = (metadata?.anonymous ?? 'false').toLowerCase();
  const anonymous = anonRaw === 'true' || anonRaw === '1' || anonRaw === 'yes';
  const email = (metadata?.email ?? '').trim();
  const message = (metadata?.message ?? '').trim();

  return { billingName, displayName, anonymous, email, message };
}

export async function listPaidDonations(limit: number) {
  const supabase = createAdminClient();

  const { data: totalsRows, error: totalsError } = await supabase
    .from('donations')
    .select('amount')
    .eq('status', 'paid');

  if (totalsError) throw totalsError;

  const sumCents = (totalsRows ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const count = totalsRows?.length ?? 0;

  const { data: donations, error: donationsError } = await supabase
    .from('donations')
    .select('id, billing_name, display_name, anonymous, email, message, amount, stripe_id, stripe_event_id, status, created_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (donationsError) throw donationsError;

  return {
    donations: donations ?? [],
    totals: {
      sumCents,
      sumDollars: Math.floor((sumCents + 50) / 100),
      count,
    },
  };
}