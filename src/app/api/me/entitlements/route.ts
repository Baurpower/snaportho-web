import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getNormalizedBroBotEntitlement, type Subject } from '@/lib/brobot/entitlements';
import { createGuestSession, getGuestSessionFromRequest } from '@/lib/brobot/guest-session';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let guestCookieToSet: string | null = null;
  let subject: Subject;

  if (user) {
    subject = { type: 'user', id: user.id };
  } else {
    let guestSession = getGuestSessionFromRequest(request);

    if (!guestSession) {
      const createdGuest = createGuestSession();
      guestSession = createdGuest.session;
      guestCookieToSet = createdGuest.cookie;
    }

    subject = { type: 'guest', id: guestSession.guestId };
  }

  try {
    const url = new URL(request.url);
    const includeDebug =
      process.env.NODE_ENV !== 'production' &&
      subject.type === 'user' &&
      url.searchParams.get('debug') === '1';
    const entitlement = await getNormalizedBroBotEntitlement(subject, { includeDebug });
    const response = NextResponse.json(entitlement);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    if (guestCookieToSet) {
      response.headers.append('Set-Cookie', guestCookieToSet);
    }
    return response;
  } catch (err) {
    console.error('[me/entitlements] error', err);
    return NextResponse.json(
      { error: 'Failed to load entitlements' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  }
}
