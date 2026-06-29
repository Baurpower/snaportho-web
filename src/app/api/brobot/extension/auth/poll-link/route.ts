import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  generateDeviceToken,
  getDeviceLinkByCode,
  hashDeviceToken,
  isExpired,
  isoNow,
  parseJsonBody,
} from '@/lib/brobot/device-link';

const PollLinkSchema = z.object({
  linkCode: z.string().trim().min(1).max(32),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, PollLinkSchema);
  if (!parsed.success) return parsed.response;

  const lookup = await getDeviceLinkByCode(parsed.data.linkCode.trim().toUpperCase());
  if (!lookup.success) return lookup.response;

  const { supabase, link } = lookup;

  if (!link) {
    return NextResponse.json({ error: 'Link code not found.' }, { status: 404 });
  }

  if (link.revoked_at || link.status === 'revoked') {
    return NextResponse.json({ approved: false, status: 'revoked' });
  }

  if (isExpired(link.expires_at)) {
    await supabase
      .from('brobot_anki_device_links')
      .update({ status: 'expired', updated_at: isoNow() })
      .eq('id', link.id);

    return NextResponse.json({ approved: false, status: 'expired' });
  }

  if (!link.user_id || !link.approved_at || link.status === 'pending') {
    return NextResponse.json({ approved: false, status: 'pending' });
  }

  if (link.exchanged_at) {
    return NextResponse.json(
      {
        approved: true,
        status: 'consumed',
        error: 'A device token was already issued for this link code.',
      },
      { status: 409 }
    );
  }

  const rawDeviceToken = generateDeviceToken('snaportho_extension');
  const tokenHash = hashDeviceToken(rawDeviceToken);
  const now = isoNow();

  const { error: tokenError } = await supabase
    .from('brobot_anki_device_tokens')
    .insert({
      device_link_id: link.id,
      user_id: link.user_id,
      device_name: link.device_name,
      token_hash: tokenHash,
      created_at: now,
      updated_at: now,
    });

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  const { error: linkError } = await supabase
    .from('brobot_anki_device_links')
    .update({
      status: 'approved',
      exchanged_at: now,
      updated_at: now,
    })
    .eq('id', link.id);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({
    approved: true,
    status: 'approved',
    deviceToken: rawDeviceToken,
  });
}
