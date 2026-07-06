import { NextResponse } from 'next/server';

import { mapDonationRowToListItem } from '@/lib/donations/display';
import { listPaidDonations } from '@/lib/donations/store';
import type { DonationsApiResponse } from '@/lib/donations/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') ?? '80');
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 80, 1), 200);

  try {
    const { donations, totals } = await listPaidDonations(limit);
    const payload: DonationsApiResponse = {
      source: 'db:donations:supabase',
      donations: donations.map((row) => mapDonationRowToListItem(row)),
      totals,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[api/donations] failed', error);
    return NextResponse.json({ error: 'Failed to load donations' }, { status: 500 });
  }
}