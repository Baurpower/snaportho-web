import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getRemainingAIUses, type Subject } from '@/lib/brobot/entitlements';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const subject: Subject = user
    ? { type: 'user', id: user.id }
    : { type: 'guest', id: 'anonymous' }; // Guests are handled via cookie in the proxy

  try {
    const entitlement = await getRemainingAIUses(subject);
    return NextResponse.json({ data: entitlement });
  } catch (err) {
    console.error('[me/entitlements] error', err);
    return NextResponse.json({ error: 'Failed to load entitlements' }, { status: 500 });
  }
}