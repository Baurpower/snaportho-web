import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

import { authenticateDeviceLinkedRequest } from '@/lib/brobot/device-link';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { BROBOT_FAST_MODEL } from '@/lib/brobot/model-config';
import { OrthobulletsQuestionClaimRequestSchema } from '@/lib/brobot/orthobullets/types';
import { resolveOrthobulletsIdentityCandidates, safeOrthobulletsTopicId } from '@/lib/brobot/orthobullets/question-identity';
import { createAdminClient } from '@/lib/supabase/admin';

const TOKEN_HEADER = 'x-snaportho-extension-token';
const ALGORITHM = 'orthobullets-question-claim-v1';
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

type Draft = { claimText: string; claimType: string; predicate: string; objectText: string; qualifiers: Record<string, string> };

function validDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['claimText', 'claimType', 'predicate', 'objectText'].every((key) => typeof v[key] === 'string' && (v[key] as string).trim())
    && String(v.claimText).length <= 2000 && String(v.predicate).length <= 80 && String(v.objectText).length <= 200
    && (!v.qualifiers || (typeof v.qualifiers === 'object' && !Array.isArray(v.qualifiers)));
}

export async function POST(request: Request) {
  const auth = await authenticateDeviceLinkedRequest(request, { deviceTokenHeader: TOKEN_HEADER, allowBrowserSession: false, allowBearerToken: false });
  if ('response' in auth) return auth.response;
  const parsed = OrthobulletsQuestionClaimRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const page = parsed.data.pageContext;
  const nativeQuestionId = page.questionId!;
  const candidateIds = resolveOrthobulletsIdentityCandidates({
    nativeQuestionId,
    aliases: Array.isArray(page.raw?.providerSpecific?.questionAliases) ? page.raw.providerSpecific.questionAliases : [],
  });
  const admin = createAdminClient();
  // This is a graph-curation capability, not a learner-facing endpoint. Keep
  // it limited to the designated automated reviewer until a scoped curator
  // role exists in app_metadata/RLS.
  const { data: reviewer } = await admin.auth.admin.getUserById(auth.userId);
  if (reviewer.user?.email?.toLowerCase() !== 'alexbaur123@gmail.com') {
    return NextResponse.json({ error: 'curator_authorization_required' }, { status: 403 });
  }
  const { data: source } = await admin.from('external_sources').select('id').eq('slug', 'orthobullets').maybeSingle();
  if (!source) return NextResponse.json({ status: 'quarantined', reason: 'orthobullets_source_missing' }, { status: 409 });

  // Gaps deliberately contain only IDs/counts/state.  They are durable work
  // items for the metadata pipeline and cannot accidentally retain protected
  // stems, choices, explanations, or source HTML.
  const recordGap = async (gapClass: 'source_extraction_gap' | 'mapping_gap', reasonCodes: string[], metadata: Record<string, unknown>) => {
    const base = {
      gap_class: gapClass,
      owner: 'extension',
      disposition: 'open',
      priority_score: gapClass === 'mapping_gap' ? 70 : 60,
      provider: 'orthobullets',
      native_question_id: nativeQuestionId,
      algorithm_version: ALGORITHM,
      reason_codes: reasonCodes,
      metadata,
      is_active: true,
    };
    const { data: existing } = await admin.from('educational_claim_gaps')
      .select('id')
      .eq('provider', 'orthobullets')
      .eq('native_question_id', nativeQuestionId)
      .eq('gap_class', gapClass)
      .eq('is_active', true)
      .is('claim_id', null)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await admin.from('educational_claim_gaps').update({
        reason_codes: reasonCodes,
        metadata,
        priority_score: base.priority_score,
      }).eq('id', existing.id);
      return !error;
    }
    const { error } = await admin.from('educational_claim_gaps').insert(base);
    // A concurrent retry can win the partial unique index race. The gap still
    // exists, so the request remains safely quarantined either way.
    return !error || error.code === '23505';
  };

  const { data: matchRows, error: matchError } = await admin.from('external_questions')
    .select('id,external_question_id')
    .eq('source_id', source.id)
    .in('external_question_id', candidateIds);
  if (matchError) return NextResponse.json({ error: 'question_metadata_lookup_failed' }, { status: 500 });
  const matches = [...new Map((matchRows ?? []).map((row) => [row.id, row])).values()];
  if (matches.length !== 1) {
    const gapRecorded = await recordGap('source_extraction_gap', [matches.length ? 'ambiguous_metadata_identity' : 'missing_metadata_identity'], {
      identityCandidates: candidateIds,
      matchedMetadataCount: matches.length,
      pageKind: page.pageKind,
      topicId: safeOrthobulletsTopicId(page.topicId),
    });
    return NextResponse.json({
      status: 'quarantined',
      reason: matches.length ? 'ambiguous_metadata_identity' : 'question_not_in_metadata_corpus',
      nativeQuestionId,
      gapRecorded,
    }, { status: 202 });
  }
  const question = matches[0];
  const { data: entityLinks } = await admin.from('question_canonical_entity_links').select('canonical_entity_id').eq('external_question_id', question.id).eq('is_active', true);
  const entityIds = [...new Set((entityLinks ?? []).map((row) => row.canonical_entity_id))];
  if (entityIds.length !== 1) {
    const gapRecorded = await recordGap('mapping_gap', [entityIds.length ? 'ambiguous_canonical_entity' : 'missing_canonical_entity'], {
      externalQuestionId: question.external_question_id,
      canonicalEntityCount: entityIds.length,
      pageKind: page.pageKind,
      topicId: safeOrthobulletsTopicId(page.topicId),
    });
    return NextResponse.json({ status: 'quarantined', reason: entityIds.length ? 'ambiguous_canonical_entity' : 'missing_canonical_entity', nativeQuestionId, gapRecorded }, { status: 202 });
  }

  // Raw source material exists only in this request and OpenAI call; neither is
  // included in logs, metadata, gaps, or any database write below.
  const completion = await getOpenAI().chat.completions.create({
    model: BROBOT_FAST_MODEL, temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: 'Derive one original, concise clinical claim from this completed question. Do not quote or closely paraphrase the stem, choices, or explanation. Return JSON: claimText, claimType, predicate, objectText, qualifiers (only anatomy, age_group, setting, severity, laterality, procedure, contraindication; string values).'}, { role: 'user', content: JSON.stringify({ stem: page.stem, choices: page.answerChoices, correctAnswer: page.correctAnswer, explanation: page.explanationText }) }],
  });
  let draft: unknown;
  try { draft = JSON.parse(completion.choices[0]?.message?.content ?? ''); } catch { return NextResponse.json({ status: 'quarantined', reason: 'model_output_invalid' }, { status: 202 }); }
  if (!validDraft(draft)) return NextResponse.json({ status: 'quarantined', reason: 'model_output_invalid' }, { status: 202 });
  const safeQualifiers = Object.fromEntries(Object.entries(draft.qualifiers ?? {}).filter(([key, value]) => ['anatomy','age_group','setting','severity','laterality','procedure','contraindication'].includes(key) && typeof value === 'string' && value.length <= 80));
  const claim = { ...draft, qualifiers: safeQualifiers };
  const { data: existing } = await admin.from('educational_claims').select('id,current_version_id').eq('primary_entity_id', entityIds[0]).eq('claim_type', claim.claimType).eq('predicate', claim.predicate).eq('object_text', claim.objectText).eq('is_active', true).maybeSingle();
  const sourceHash = sha256(JSON.stringify({ stem: page.stem, choices: page.answerChoices, correct: page.correctAnswer, explanation: page.explanationText }));
  let claimId = existing?.id as string | undefined;
  let versionId = existing?.current_version_id as string | undefined;
  if (!claimId || !versionId) {
    const { data: inserted, error } = await admin.from('educational_claims').insert({ primary_entity_id: entityIds[0], claim_text: claim.claimText, claim_type: claim.claimType, predicate: claim.predicate, object_text: claim.objectText, qualifiers: claim.qualifiers, approval_method: 'machine_consensus', algorithm_version: ALGORITHM, content_source: 'generated_draft', review_status: 'unreviewed', metadata: { entityTarget: 'canonical', sourceProvider: 'orthobullets' } }).select('id,fingerprint_hash').single();
    if (error || !inserted) return NextResponse.json({ error: 'claim_write_failed' }, { status: 500 });
    claimId = inserted.id;
    const { data: version, error: versionError } = await admin.from('educational_claim_versions').insert({ claim_id: claimId, version_number: 1, fingerprint_hash: inserted.fingerprint_hash, claim_text: claim.claimText, claim_type: claim.claimType, predicate: claim.predicate, object_text: claim.objectText, qualifiers: claim.qualifiers, primary_entity_id: entityIds[0], approval_method: 'machine_consensus', content_source: 'generated_draft', review_status: 'unreviewed', algorithm_version: ALGORITHM, metadata: { sourceProvider: 'orthobullets' } }).select('id').single();
    if (versionError || !version) return NextResponse.json({ error: 'claim_version_write_failed' }, { status: 500 });
    versionId = version.id;
    await admin.from('educational_claims').update({ current_version_id: versionId }).eq('id', claimId);
  }
  const { error: linkError } = await admin.from('question_claim_links').upsert({ provider: 'orthobullets', native_question_id: nativeQuestionId, external_question_id: question.id, claim_id: claimId, claim_version_id: versionId, mapping_role: 'tests_primary', confidence: 0.7, approval_method: 'machine_consensus', review_status: 'needs_review', algorithm_version: ALGORITHM, evidence_locator: `question:${nativeQuestionId}`, source_fingerprint_hash: sourceHash, evidence_hashes: [sourceHash], reason_codes: ['completed_review_page','single_canonical_entity'], metadata: { sourceProvider: 'orthobullets', verifiedAnswerVisible: true } }, { onConflict: 'provider,native_question_id,claim_id' });
  if (linkError) return NextResponse.json({ error: 'question_claim_link_write_failed' }, { status: 500 });
  return NextResponse.json({ status: 'created', claimId, nativeQuestionId, reviewStatus: 'needs_review' });
}
