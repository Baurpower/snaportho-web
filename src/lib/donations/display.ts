import type { DonationListItem, DonationRow } from './types';

export function donorDisplayName(row: Pick<DonationRow, 'display_name' | 'anonymous'>): string {
  if (row.anonymous) return 'Anonymous';
  const display = row.display_name?.trim();
  return display && display.length > 0 ? display : 'Anonymous';
}

export function centsToRoundedDollars(amountCents: number): number {
  return Math.floor((amountCents + 50) / 100);
}

export function mapDonationRowToListItem(row: DonationRow): DonationListItem {
  const message = row.message?.trim();
  return {
    name: donorDisplayName(row),
    amount: centsToRoundedDollars(row.amount),
    dateISO: row.created_at,
    via: 'Stripe',
    note: message && message.length > 0 ? message : undefined,
  };
}