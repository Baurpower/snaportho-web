import { NextResponse } from 'next/server';
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from '@/lib/caseprep-review/access-control';
import { getBroBotKnowledgeHealthSnapshot } from '@/lib/brobot/kg/config';
import {
  BROBOT_ASYNC_ENRICHMENT_ENABLED,
  BROBOT_TIER1_KG_ENABLED,
  BROBOT_TIERED_PIPELINE_ENABLED,
} from '@/lib/brobot/model-config';
import {
  BROBOT_KNOWLEDGE_PACKET_SCHEMA_VERSION,
  BROBOT_KNOWLEDGE_POLICY_VERSION_V3,
} from '@/lib/brobot/kg/contracts';
import { ANSWER_SUPPORT_SCHEMA_VERSION } from '@/lib/brobot/chat/answer-support';
import {
  ANKI_LINKER_VERSION,
  latestPublishedRelease,
} from '@/lib/brobot/chat/anki-linker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireCasePrepReviewer({ minRole: 'content_admin' });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
  const knowledge = getBroBotKnowledgeHealthSnapshot();
  const publishedReleaseAvailable = Boolean(await latestPublishedRelease());
  const warnings = [...knowledge.warnings];
  if (!publishedReleaseAvailable)
    warnings.push('published_anki_release_missing');
  if (BROBOT_TIERED_PIPELINE_ENABLED && !BROBOT_TIER1_KG_ENABLED)
    warnings.push('tier1_kg_disabled');
  return NextResponse.json({
    healthy: warnings.length === 0,
    warnings,
    knowledge,
    tieredPipelineEnabled: BROBOT_TIERED_PIPELINE_ENABLED,
    tier1KgEnabled: BROBOT_TIER1_KG_ENABLED,
    asyncEnrichmentEnabled: BROBOT_ASYNC_ENRICHMENT_ENABLED,
    packetSchemaVersion: BROBOT_KNOWLEDGE_PACKET_SCHEMA_VERSION,
    knowledgePolicyVersion: BROBOT_KNOWLEDGE_POLICY_VERSION_V3,
    answerSupportSchemaVersion: ANSWER_SUPPORT_SCHEMA_VERSION,
    ankiLinkerVersion: ANKI_LINKER_VERSION,
    publishedReleaseAvailable,
  });
}
