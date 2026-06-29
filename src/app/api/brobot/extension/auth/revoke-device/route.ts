import { NextResponse } from 'next/server';

import { authenticateDeviceLinkedRequest, hashDeviceToken, isoNow } from '@/lib/brobot/device-link';
import { createAdminClient } from '@/lib/supabase/admin';

const EXTENSION_TOKEN_HEADER = 'x-snaportho-extension-token';

export async function POST(request: Request) {
  const auth = await authenticateDeviceLinkedRequest(request, {
    deviceTokenHeader: EXTENSION_TOKEN_HEADER,
    allowBearerToken: false,
    allowBrowserSession: false,
  });

  if ('response' in auth) {
    return auth.response;
  }

  const rawBody = await request.text();
  let deviceToken: string | undefined;

  if (rawBody.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawBody) as { deviceToken?: string };
      deviceToken = parsed.deviceToken?.trim();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }
  }

  const supabase = createAdminClient();
  const now = isoNow();

  if (auth.authMethod === 'device_token' && auth.deviceTokenId) {
    const { error } = await supabase
      .from('brobot_anki_device_tokens')
      .update({ revoked_at: now, updated_at: now })
      .eq('id', auth.deviceTokenId)
      .eq('user_id', auth.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ revoked: true });
  }

  if (!deviceToken) {
    return NextResponse.json(
      { error: 'deviceToken is required when revoking without the current token context.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('brobot_anki_device_tokens')
    .update({ revoked_at: now, updated_at: now })
    .eq('token_hash', hashDeviceToken(deviceToken))
    .eq('user_id', auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revoked: true });
}
