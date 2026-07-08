import type { BroBotChatMode, BroBotProcedureCategory } from './types';
import {
  CasePrepRegistryNotFoundError,
  CasePrepRegistryUpstreamError,
  fetchRegistryIndex,
  fetchRegistryProcedure,
} from '@/lib/caseprep-review/client';
import type { ClinicalSection, ClinicalSectionItem } from '@/lib/caseprep-review/types';
import { CASEPREP_TOPIC_MAPPINGS } from '@/lib/student-curriculum/caseprep-topic-mapping';

export type BroBotCertifiedContext = {
  source: 'caseprep' | 'caseprep_draft';
  title: string;
  sections: Array<{
    label: string;
    content: string;
  }>;
} | null;

/**
 * A ranked source packet used to thread CasePrep (and future) context sources
 * through the answer pipeline. certificationScore is 1.0 for certified procedures
 * and 0.6 for live-but-uncertified procedures.
 */
export type SourceConceptPacket = {
  source: 'caseprep' | 'caseprep_draft';
  title: string;
  certificationScore: number;
  sections: Array<{
    label: string;
    content: string;
  }>;
};

export function toSourceConceptPackets(context: BroBotCertifiedContext): SourceConceptPacket[] {
  if (!context) return [];
  return [
    {
      source: context.source,
      title: context.title,
      certificationScore: context.source === 'caseprep' ? 1.0 : 0.6,
      sections: context.sections,
    },
  ];
}

const MAX_SECTION_CHARS = 520;
const MAX_SECTIONS = 5;

const SECTION_PRIORITY_BY_MODE: Record<string, RegExp[]> = {
  or_prep: [/approach|exposure|layer|anatomy|risk|step|implant|pitfall|complication|pimp/i],
  oite: [/classification|indication|complication|pitfall|pimp|question|anatomy/i],
  consult: [/indication|workup|classification|imaging|complication|postop|risk/i],
  clinic: [/workup|indication|exam|imaging|treatment|complication/i],
  general: [/overview|indication|anatomy|classification|complication/i],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderSectionItem(item: ClinicalSectionItem): string {
  switch (item.kind) {
    case 'bullet':
    case 'text':
      return item.text.trim();
    case 'pimp_question':
      return `Q: ${item.question.trim()} A: ${item.answer.trim()}`;
    case 'structure_at_risk':
      return `${item.structure}: ${item.why_at_risk.trim()} Avoid: ${item.how_to_avoid_injury.trim()}`;
    case 'surgical_layer':
      return `${item.layer_name}: ${item.what_user_should_know.trim()}`;
    case 'source':
      return item.title?.trim() || item.url;
    default:
      return '';
  }
}

function renderClinicalSection(section: ClinicalSection): string {
  const rendered = section.items
    .map(renderSectionItem)
    .filter(Boolean)
    .join('\n');

  if (rendered.length <= MAX_SECTION_CHARS) return rendered;
  return `${rendered.slice(0, MAX_SECTION_CHARS).trim()}...`;
}

function mappedSlugForText(text: string): string | null {
  const normalizedText = normalize(text);

  for (const mapping of CASEPREP_TOPIC_MAPPINGS) {
    const candidates = [
      mapping.topicId,
      mapping.slug,
      mapping.displayName,
      mapping.displayName.replace(/\bORIF\b/i, '').trim(),
    ].map(normalize);

    if (candidates.some((candidate) => candidate && normalizedText.includes(candidate))) {
      return mapping.slug;
    }
  }

  if (/\bdistal radius\b/.test(normalizedText)) return 'distal-radius-orif';
  if (/\bankle fracture\b/.test(normalizedText)) return 'ankle-fracture-orif';
  if (/\bcarpal tunnel\b/.test(normalizedText)) return 'carpal-tunnel-release';
  if (/\bacl\b/.test(normalizedText)) return 'acl-reconstruction';
  if (/\btotal hip\b|\btha\b/.test(normalizedText)) return 'total-hip-arthroplasty';
  if (/\btotal knee\b|\btka\b/.test(normalizedText)) return 'total-knee-arthroplasty';
  return null;
}

async function resolveProcedureSlug(input: {
  procedureOrTopic: string;
  selectedBranchLabel?: string;
}): Promise<string | null> {
  const text = `${input.procedureOrTopic} ${input.selectedBranchLabel ?? ''}`;
  const mapped = mappedSlugForText(text);
  if (mapped) return mapped;

  try {
    const index = await fetchRegistryIndex();
    const normalizedText = normalize(text);
    const match = index.procedures.find((procedure) => {
      const candidates = [
        procedure.slug,
        procedure.display_name,
        procedure.body_region,
        procedure.procedure_family,
      ].map(normalize);
      return candidates.some((candidate) => candidate && normalizedText.includes(candidate));
    });
    return match?.slug ?? null;
  } catch {
    return null;
  }
}

function sectionScore(section: ClinicalSection, input: {
  mode: BroBotChatMode;
  selectedBranchLabel?: string;
}) {
  const mode = input.mode === 'fracture_call' || input.mode === 'auto' ? 'general' : input.mode;
  const priority = SECTION_PRIORITY_BY_MODE[mode] ?? SECTION_PRIORITY_BY_MODE.general;
  const text = `${section.key} ${section.label} ${input.selectedBranchLabel ?? ''}`;
  const modeScore = priority.reduce((score, pattern, index) => {
    return pattern.test(text) ? Math.max(score, priority.length - index) : score;
  }, 0);
  const branchScore =
    input.selectedBranchLabel && normalize(text).includes(normalize(input.selectedBranchLabel))
      ? 6
      : 0;

  return modeScore + branchScore + Number(section.is_required) * 2 + section.coverage_weight;
}

export async function getCasePrepCertifiedContext(input: {
  procedureOrTopic: string;
  procedureCategory: BroBotProcedureCategory;
  mode: BroBotChatMode;
  selectedBranchLabel?: string;
}): Promise<BroBotCertifiedContext> {
  const slug = await resolveProcedureSlug({
    procedureOrTopic: input.procedureOrTopic,
    selectedBranchLabel: input.selectedBranchLabel,
  });
  if (!slug) {
    console.log('[caseprep-context] no-slug', {
      procedureOrTopic: input.procedureOrTopic,
      selectedBranchLabel: input.selectedBranchLabel,
      mode: input.mode,
    });
    return null;
  }

  try {
    const procedure = await fetchRegistryProcedure(slug);
    const hasCertifiedSignal =
      procedure.review_status === 'certified' ||
      procedure.content_status === 'certified' ||
      Boolean(procedure.certified_at);

    // Reject deprecated or non-live procedures entirely. For live procedures without
    // a certified signal, still return context but label it as 'caseprep_draft' so
    // callers can weigh it accordingly. This was the main cause of 0/20 source hits.
    if (!procedure.is_live || procedure.deprecated) {
      console.log('[caseprep-context] skipped', {
        slug,
        is_live: procedure.is_live,
        deprecated: procedure.deprecated,
        hasCertifiedSignal,
        reason: !procedure.is_live ? 'not_live' : 'deprecated',
      });
      return null;
    }

    const source: 'caseprep' | 'caseprep_draft' = hasCertifiedSignal ? 'caseprep' : 'caseprep_draft';

    const sections = procedure.sections
      .filter((section) => !section.is_empty)
      .map((section) => ({
        section,
        score: sectionScore(section, input),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SECTIONS)
      .map(({ section }) => ({
        label: section.label,
        content: renderClinicalSection(section),
      }))
      .filter((section) => section.content.trim().length > 0);

    console.log('[caseprep-context] resolved', {
      slug,
      source,
      hasCertifiedSignal,
      sectionCount: sections.length,
      mode: input.mode,
    });

    if (sections.length === 0) return null;

    return {
      source,
      title: procedure.display_name,
      sections,
    };
  } catch (error) {
    if (
      error instanceof CasePrepRegistryNotFoundError ||
      error instanceof CasePrepRegistryUpstreamError ||
      error instanceof TypeError
    ) {
      console.log('[caseprep-context] miss', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    throw error;
  }
}
