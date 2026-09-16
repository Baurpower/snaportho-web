import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { signAnkiAwsDownload, AWS_STORAGE_PROVIDER } from '@/lib/education/anki-aws-storage';
import {
  answerSentences,
  cardFields,
  clozeFactMatches,
  searchTerms,
  type AnkiReference,
} from '@/lib/brobot/chat/anki-references';

export const runtime = 'nodejs';

type SearchRow = {
  deck_release_id: string;
  canonical_card_id: string;
  canonical_card_version_id: string;
  card_ordinal: number;
  content_hash: string;
  term_coverage: number;
  sentenceIndex?: number;
  cachedAnchorText?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) {
    return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
  }
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();
  const { data: message, error: messageError } = await db
    .from('brobot_messages')
    .select('id,content,structured_json')
    .eq('id', messageId)
    .eq('user_id', user.id)
    .eq('role', 'assistant')
    .maybeSingle();
  if (messageError) return NextResponse.json({ error: 'Unable to load message' }, { status: 500 });
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const answer = String(message.content ?? '');
  const hash = createHash('sha256').update(answer).digest('hex');
  const sentences = answerSentences(answer).filter((sentence) => searchTerms(sentence).length >= 2).slice(0, 4);
  if (!sentences.length) return NextResponse.json({ answerHash: hash, references: [] });

  const { data: cached, error: cacheError } = await db.from('brobot_anki_references')
    .select('canonical_card_id,canonical_card_version_id,deck_release_id,anchor_text,answer_hash,rank')
    .eq('message_id', messageId).eq('user_id', user.id).order('rank');
  const cachedRows = !cacheError && cached?.length && cached.every((row) => row.answer_hash === hash)
    ? cached : null;
  let candidateRows: Array<SearchRow & { sentenceIndex: number }> = [];
  if (cachedRows) {
    candidateRows = cachedRows.map((row) => ({
      canonical_card_id: row.canonical_card_id,
      canonical_card_version_id: row.canonical_card_version_id,
      deck_release_id: row.deck_release_id,
      card_ordinal: 0,
      content_hash: '',
      term_coverage: 1 - row.rank * 0.01,
      sentenceIndex: Math.max(0, sentences.indexOf(row.anchor_text)),
      cachedAnchorText: row.anchor_text,
    }));
  } else {
    const searches = await Promise.all(sentences.map((sentence) =>
      db.rpc('search_latest_anki_deck_by_concept', {
        search_terms: searchTerms(sentence),
        result_limit: 10,
      }).limit(10)
    ));
    if (searches.some((result) => result.error)) {
      return NextResponse.json({ error: 'Card lookup unavailable' }, { status: 503 });
    }
    candidateRows = searches.flatMap((result, sentenceIndex) =>
      ((result.data ?? []) as SearchRow[]).map((row) => ({ ...row, sentenceIndex }))
    );
  }
  const versionIds = [...new Set(candidateRows.map((row) => row.canonical_card_version_id))];
  if (!versionIds.length) return NextResponse.json({ answerHash: hash, references: [] });

  // Publication is the current content gate. No cards have production-eligible
  // entity mappings yet, so factual matching below must pass independently.
  const eligibleRows = candidateRows;

  const { data: versions, error: versionsError } = await db
    .from('canonical_card_versions')
    .select('id,canonical_card_id,content_hash,field_snapshot,is_active')
    .in('id', [...new Set(eligibleRows.map((row) => row.canonical_card_version_id))]);
  if (versionsError) return NextResponse.json({ error: 'Card lookup unavailable' }, { status: 503 });
  const versionById = new Map((versions ?? []).map((row) => [row.id, row]));

  const { data: cards } = await db.from('canonical_cards')
    .select('id,title,is_active,canonical_status')
    .in('id', [...new Set(eligibleRows.map((row) => row.canonical_card_id))]);
  const cardById = new Map((cards ?? []).map((row) => [row.id, row]));
  const { data: latestRelease } = await db.from('anki_deck_releases')
    .select('id').eq('status', 'published')
    .order('published_at', { ascending: false }).limit(1).maybeSingle();
  if (!latestRelease) return NextResponse.json({ answerHash: hash, references: [] });
  const { data: members } = await db.from('anki_deck_release_cards')
    .select('canonical_card_id,canonical_card_version_id,deck_release_id,deck_path,card_ordinal,inclusion_status')
    .in('canonical_card_version_id', [...new Set(eligibleRows.map((row) => row.canonical_card_version_id))])
    .eq('deck_release_id', latestRelease.id)
    .eq('inclusion_status', 'included');
  const memberByVersion = new Map((members ?? []).map((row) => [row.canonical_card_version_id, row]));

  const seenCards = new Set<string>();
  const seenSentences = new Set<number>();
  const references: AnkiReference[] = [];
  for (const row of eligibleRows.sort((a, b) =>
    b.term_coverage - a.term_coverage || a.sentenceIndex - b.sentenceIndex
  )) {
    const version = versionById.get(row.canonical_card_version_id);
    const card = cardById.get(row.canonical_card_id);
    const member = memberByVersion.get(row.canonical_card_version_id);
    if (!version?.is_active || !card?.is_active || !member
      || member.deck_release_id !== row.deck_release_id
      || member.deck_release_id !== latestRelease?.id
      || (row.content_hash && version.content_hash !== row.content_hash)
      || card.canonical_status === 'archived'
      || seenCards.has(row.canonical_card_id) || seenSentences.has(row.sentenceIndex)) continue;
    const fields = cardFields(version.field_snapshot);
    const ordinal = member.card_ordinal;
    const anchorText = row.cachedAnchorText ?? sentences[row.sentenceIndex];
    if (!fields.front || !clozeFactMatches(anchorText, fields.front, ordinal)) continue;
    references.push({
      id: row.canonical_card_version_id,
      number: references.length + 1,
      anchorText,
      cardId: row.canonical_card_id,
      cardVersionId: row.canonical_card_version_id,
      releaseId: row.deck_release_id,
      deckPath: member.deck_path,
      title: card.title || member.deck_path.split('::').pop() || 'Anki card',
      front: fields.front,
      back: fields.back,
      extra: fields.extra,
      frontHtml: fields.frontHtml.slice(0, 50_000),
      backHtml: fields.backHtml.slice(0, 50_000),
      extraHtml: fields.extraHtml.slice(0, 50_000),
      targetCloze: ordinal,
      images: [],
    });
    seenCards.add(row.canonical_card_id);
    seenSentences.add(row.sentenceIndex);
    if (references.length === 3) break;
  }
  if (!cachedRows && !cacheError && references.length) {
    await db.from('brobot_anki_references').upsert(
      references.map((reference) => ({
        user_id: user.id,
        message_id: messageId,
        answer_hash: hash,
        anchor_text: reference.anchorText,
        canonical_card_id: reference.cardId,
        canonical_card_version_id: reference.cardVersionId,
        deck_release_id: reference.releaseId,
        rank: reference.number,
      })),
      { onConflict: 'message_id,rank' },
    );
  }
  if (references.length) {
    const { data: assets } = await db.from('anki_deck_media_assets')
      .select('canonical_card_version_id,deck_release_id,logical_filename,mime_type,object_key,license_status,storage_provider,storage_bucket')
      .in('canonical_card_version_id', references.map((reference) => reference.cardVersionId))
      .in('mime_type', ['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
      .neq('license_status', 'excluded');
    for (const reference of references) {
      for (const asset of (assets ?? []).filter((item) =>
        item.canonical_card_version_id === reference.cardVersionId
        && item.deck_release_id === reference.releaseId
      ).slice(0, 3)) {
        try {
          const url = asset.storage_provider === AWS_STORAGE_PROVIDER
            ? signAnkiAwsDownload(asset.object_key, 3600)
            : (await db.storage.from(asset.storage_bucket || 'anki-deck-media')
                .createSignedUrl(asset.object_key, 3600)).data?.signedUrl;
          if (url) reference.images.push({ url, alt: asset.logical_filename, filename: asset.logical_filename });
        } catch {
          // Card text remains available when an image cannot be signed.
        }
      }
    }
  }
  return NextResponse.json({ answerHash: hash, references });
}
