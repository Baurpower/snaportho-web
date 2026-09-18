import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { getGuestSessionFromRequest } from '@/lib/brobot/guest-session';
import { ANKI_LINKER_VERSION, answerHash, latestPublishedRelease, linkAnkiClaims } from '@/lib/brobot/chat/anki-linker';
import { answerClaims } from '@/lib/brobot/chat/anki-claims';
import { createAnkiToken, verifyAnkiToken } from '@/lib/brobot/chat/anki-tokens';
import { cardFields, cardPreview, type AnkiReference } from '@/lib/brobot/chat/anki-references';

export const runtime = 'nodejs';
export const maxDuration = 60;

const UUID = /^[0-9a-f-]{36}$/i;
const guestCache = new Map<string, { expires: number; references: AnkiReference[] }>();

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  if (!UUID.test(messageId)) return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createAdminClient();
  const { data: message, error: messageError } = await db.from('brobot_messages')
    .select('content').eq('id', messageId).eq('user_id', user.id).eq('role', 'assistant').maybeSingle();
  if (messageError) return NextResponse.json({ error: 'Unable to load message' }, { status: 503 });
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  const answer = String(message.content ?? '');
  const hash = answerHash(answer);
  try {
    const releaseId = await latestPublishedRelease();
    if (!releaseId) return NextResponse.json({ answerHash: hash, references: [] });
    const { data: lookup } = await db.from('brobot_anki_reference_lookups')
      .select('answer_hash,deck_release_id,linker_version').eq('message_id', messageId).eq('user_id', user.id).maybeSingle();
    if (lookup?.answer_hash === hash && lookup.deck_release_id === releaseId
      && lookup.linker_version === ANKI_LINKER_VERSION) {
      const { data: rows, error } = await db.from('brobot_anki_references')
        .select('canonical_card_id,canonical_card_version_id,deck_release_id,anchor_text,claim_id,rank')
        .eq('message_id', messageId).eq('user_id', user.id).order('rank');
      if (!error && rows) {
        const claims = new Map(answerClaims(answer).map((claim) => [claim.id, claim.text]));
        const { data: members } = rows.length ? await db.from('anki_deck_release_cards')
          .select('canonical_card_version_id,deck_path,card_ordinal').eq('deck_release_id', releaseId)
          .eq('inclusion_status', 'included').in('canonical_card_version_id', rows.map((row) => row.canonical_card_version_id))
          : { data: [] as Array<{ canonical_card_version_id: string; deck_path: string; card_ordinal: number }> };
        const { data: versions } = rows.length ? await db.from('canonical_card_versions')
          .select('id,field_snapshot,is_active').in('id', rows.map((row) => row.canonical_card_version_id))
          : { data: [] as Array<{ id: string; field_snapshot: unknown; is_active: boolean }> };
        const paths = new Map((members ?? []).map((member) => [member.canonical_card_version_id, member]));
        const fronts = new Map((versions ?? []).filter((version) => version.is_active)
          .map((version) => [version.id, cardFields(version.field_snapshot).front]));
        if (rows.every((row) => row.claim_id && claims.get(row.claim_id) === row.anchor_text
          && row.deck_release_id === releaseId && paths.has(row.canonical_card_version_id)
          && fronts.has(row.canonical_card_version_id))) {
          const references: AnkiReference[] = rows.map((row) => ({
            id: row.canonical_card_version_id, number: row.rank, claimId: row.claim_id!,
            anchorText: row.anchor_text, cardId: row.canonical_card_id,
            cardVersionId: row.canonical_card_version_id, releaseId,
            deckPath: paths.get(row.canonical_card_version_id)!.deck_path,
            title: cardPreview(fronts.get(row.canonical_card_version_id)!,
              paths.get(row.canonical_card_version_id)!.card_ordinal,
              paths.get(row.canonical_card_version_id)!.deck_path),
            token: createAnkiToken('card', user.id, `${releaseId}:${row.canonical_card_version_id}`),
          }));
          return NextResponse.json({ answerHash: hash, references });
        }
      }
    }
    const references = await linkAnkiClaims(answer, releaseId, user.id);
    const { error: deleteError } = await db.from('brobot_anki_references')
      .delete().eq('message_id', messageId).eq('user_id', user.id);
    if (deleteError) throw deleteError;
    if (references.length) {
      const { error } = await db.from('brobot_anki_references').insert(references.map((reference) => ({
        user_id: user.id, message_id: messageId, answer_hash: hash,
        anchor_text: reference.anchorText, claim_id: reference.claimId,
        canonical_card_id: reference.cardId, canonical_card_version_id: reference.cardVersionId,
        deck_release_id: releaseId, rank: reference.number,
      })));
      if (error) throw error;
    }
    const { error: stateError } = await db.from('brobot_anki_reference_lookups').upsert({
      message_id: messageId, user_id: user.id, answer_hash: hash,
      deck_release_id: releaseId, linker_version: ANKI_LINKER_VERSION,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'message_id' });
    if (stateError) throw stateError;
    return NextResponse.json({ answerHash: hash, references });
  } catch {
    return NextResponse.json({ error: 'Card lookup unavailable' }, { status: 503 });
  }
}

/** Guest answers are ephemeral; the chat response supplies a signed hash of its answer. */
export async function POST(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  if (!UUID.test(messageId)) return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
    }
  }
  const guest = getGuestSessionFromRequest(request);
  if (!guest) return NextResponse.json({ error: 'Guest session required' }, { status: 401 });
  const body = await request.json().catch(() => null) as { answer?: unknown; token?: unknown } | null;
  if (typeof body?.answer !== 'string' || body.answer.length > 12000 || typeof body.token !== 'string'
    || verifyAnkiToken(body.token, 'guest-answer', guest.guestId) !== answerHash(body.answer)) {
    return NextResponse.json({ error: 'Invalid guest answer' }, { status: 400 });
  }
  try {
    const releaseId = await latestPublishedRelease();
    const key = `${guest.guestId}:${answerHash(body.answer)}:${releaseId}`;
    const cached = guestCache.get(key);
    const references = cached && cached.expires > Date.now()
      ? cached.references
      : releaseId ? await linkAnkiClaims(body.answer, releaseId, guest.guestId) : [];
    if (!cached || cached.expires <= Date.now()) {
      if (guestCache.size >= 200) guestCache.delete(guestCache.keys().next().value!);
      guestCache.set(key, { expires: Date.now() + 10 * 60_000, references });
    }
    return NextResponse.json({ answerHash: answerHash(body.answer), references });
  } catch {
    return NextResponse.json({ error: 'Card lookup unavailable' }, { status: 503 });
  }
}
