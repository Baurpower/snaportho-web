import { NextResponse } from 'next/server';

import { isAppleServerConfigured } from '@/lib/apple/app-store-server';
import { handleAppleNotification } from './handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/apple/notifications',
    methods: ['GET', 'POST'],
    configured: isAppleServerConfigured(),
  });
}

export async function POST(request: Request) {
  let body: { signedPayload?: string };
  try {
    body = (await request.json()) as { signedPayload?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await handleAppleNotification(body);
  return NextResponse.json(result.body, { status: result.status });
}
