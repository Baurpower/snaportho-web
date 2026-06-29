import { createAdminClient } from '@/lib/supabase/admin';

import type { OrthobulletsKgLookupResult } from './types';

type ExternalQuestionLookupRow = {
  id: string;
  external_question_id: string;
  specialty_normalized: string | null;
  topic_slug: string | null;
  topic_raw: string | null;
};

type MappingLookupRow = {
  curriculum_node_id: string | null;
  concept_id: string | null;
  curriculum_nodes?: {
    slug: string | null;
    title: string | null;
  } | null;
};

type CanonicalLinkRow = {
  canonical_entity_id: string;
};

export async function lookupOrthobulletsKgContext(input: {
  questionId?: string | null;
}): Promise<OrthobulletsKgLookupResult | null> {
  if (!input.questionId) return null;

  const supabase = createAdminClient();

  try {
    const { data: sourceRow } = await supabase
      .from('external_sources')
      .select('id')
      .eq('slug', 'orthobullets')
      .maybeSingle();

    if (!sourceRow?.id) {
      return null;
    }

    const { data: questionRow, error: questionError } = await supabase
      .from('external_questions')
      .select('id, external_question_id, specialty_normalized, topic_slug, topic_raw')
      .eq('source_id', sourceRow.id)
      .eq('external_question_id', input.questionId)
      .maybeSingle<ExternalQuestionLookupRow>();

    if (questionError || !questionRow) {
      return null;
    }

    const { data: mappingRow } = await supabase
      .from('external_question_curriculum_mappings')
      .select('curriculum_node_id, concept_id, curriculum_nodes(slug, title)')
      .eq('external_question_id', questionRow.id)
      .eq('is_primary', true)
      .maybeSingle<MappingLookupRow>();

    const { data: canonicalLinks } = await supabase
      .from('question_canonical_entity_links')
      .select('canonical_entity_id')
      .eq('external_question_id', questionRow.id)
      .eq('is_active', true)
      .returns<CanonicalLinkRow[]>();

    return {
      matchedQuestionId: questionRow.id,
      curriculumNodeId: mappingRow?.curriculum_node_id ?? null,
      curriculumNodeSlug: mappingRow?.curriculum_nodes?.slug ?? null,
      curriculumNodeTitle: mappingRow?.curriculum_nodes?.title ?? null,
      conceptId: mappingRow?.concept_id ?? null,
      canonicalEntityIds: canonicalLinks?.map((row) => row.canonical_entity_id) ?? [],
      sourceQuestionId: questionRow.external_question_id,
      sourceTopicSlug: questionRow.topic_slug,
      sourceTopicRaw: questionRow.topic_raw,
      sourceSpecialty: questionRow.specialty_normalized,
    };
  } catch (error) {
    console.error('[brobot-orthobullets] kg lookup failed (non-fatal)', {
      questionId: input.questionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
