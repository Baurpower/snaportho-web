import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  generateLinkCode,
  getDeviceLinkByCode,
  isoNow,
  parseJsonBody,
  plusMinutesIso,
} from '@/lib/brobot/device-link';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveBrowserAccessibleBaseUrl } from '@/lib/brobot-anki/url';

const StartLinkSchema = z.object({
  deviceName: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, StartLinkSchema);
  if (!parsed.success) return parsed.response;

  const supabase = createAdminClient();
  let linkCode = '';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateLinkCode();
    const existing = await getDeviceLinkByCode(candidate);
    if (!existing.success) return existing.response;
    if (!existing.link) {
      linkCode = candidate;
      break;
    }
  }

  if (!linkCode) {
    return NextResponse.json(
      { error: 'Unable to generate a unique link code.' },
      { status: 500 }
    );
  }

  const expiresAt = plusMinutesIso(15);
  const { error } = await supabase.from('brobot_anki_device_links').insert({
    link_code: linkCode,
    device_name: `[Extension] ${parsed.data.deviceName.trim()}`,
    status: 'pending',
    created_at: isoNow(),
    updated_at: isoNow(),
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = resolveBrowserAccessibleBaseUrl(request);
  const approvalUrl = new URL(
    `/brobot/extension/link?code=${encodeURIComponent(linkCode)}`,
    `${baseUrl}/`
  ).toString();

  return NextResponse.json({
    linkCode,
    approvalUrl,
    expiresAt,
  });
}
