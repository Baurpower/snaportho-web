import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { getGuestSessionFromRequest } from '@/lib/brobot/guest-session';
import { verifyAnkiToken } from '@/lib/brobot/chat/anki-tokens';
import { cardFields, type AnkiCardDetail } from '@/lib/brobot/chat/anki-references';
import { latestPublishedRelease, validCardIds } from '@/lib/brobot/chat/anki-linker';
import { signAnkiAwsDownload, AWS_STORAGE_PROVIDER } from '@/lib/education/anki-aws-storage';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = request.headers.get('x-anki-card-token') ?? '';
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  const guest = getGuestSessionFromRequest(request);
  if (!user && !guest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const value = (user && verifyAnkiToken(token, 'card', user.id))
    || (guest && verifyAnkiToken(token, 'card', guest.guestId));
  if (!value) return NextResponse.json({ error: 'Invalid card link' }, { status: 403 });
  const [releaseId, cardVersionId] = value.split(':');
  if (!validCardIds(releaseId, cardVersionId)) return NextResponse.json({ error: 'Invalid card link' }, { status: 400 });
  try {
    if (await latestPublishedRelease() !== releaseId) {
      return NextResponse.json({ error: 'Card link expired; refresh the answer' }, { status: 409 });
    }
    const db = createAdminClient();
    const [{ data: member, error: memberError }, { data: version, error: versionError }] = await Promise.all([
      db.from('anki_deck_release_cards').select('canonical_card_id,deck_path,card_ordinal')
        .eq('deck_release_id', releaseId).eq('canonical_card_version_id', cardVersionId)
        .eq('inclusion_status', 'included').maybeSingle(),
      db.from('canonical_card_versions').select('id,field_snapshot,is_active')
        .eq('id', cardVersionId).maybeSingle(),
    ]);
    if (memberError || versionError) throw memberError ?? versionError;
    if (!member || !version?.is_active) return NextResponse.json({ error: 'Card unavailable' }, { status: 404 });
    const fields = cardFields(version.field_snapshot);
    const detail: AnkiCardDetail = {
      cardVersionId, deckPath: member.deck_path,
      front: fields.front, back: fields.back, extra: fields.extra,
      frontHtml: fields.frontHtml.slice(0, 50_000),
      backHtml: fields.backHtml.slice(0, 50_000),
      extraHtml: fields.extraHtml.slice(0, 50_000),
      targetCloze: member.card_ordinal, images: [],
    };
    const html = `${detail.frontHtml} ${detail.backHtml} ${detail.extraHtml}`;
    const needed = new Set([...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
      .map((match) => match[1].split(/[?#]/)[0].split(/[/\\]/).pop() ?? '').filter(Boolean));
    if (needed.size) {
      const { data: assets, error } = await db.from('anki_deck_media_assets')
        .select('logical_filename,mime_type,object_key,storage_provider,storage_bucket')
        .eq('canonical_card_version_id', cardVersionId).eq('deck_release_id', releaseId)
        .in('mime_type', ['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
        .neq('license_status', 'excluded');
      if (error) throw error;
      for (const asset of assets ?? []) {
        if (!needed.has(asset.logical_filename)) continue;
        try {
          const signed = asset.storage_provider === AWS_STORAGE_PROVIDER
            ? signAnkiAwsDownload(asset.object_key, 3600)
            : (await db.storage.from(asset.storage_bucket || 'anki-deck-media')
                .createSignedUrl(asset.object_key, 3600)).data?.signedUrl;
          if (signed) detail.images.push({ url: signed, alt: asset.logical_filename, filename: asset.logical_filename });
        } catch {
          // The card remains readable without an unavailable image.
        }
      }
    }
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Card unavailable' }, { status: 503 });
  }
}
