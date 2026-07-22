import type { BroBotBranchOption } from '../chat/types';
import type { ReadNextCandidateSource, ReadNextCandidateV2, ReadNextCategory } from './types';

const CATEGORY_MAP: Record<string, ReadNextCategory> = {
  anatomy: 'anatomy', technique: 'technique', complication: 'complication',
  evidence: 'evidence', comparison: 'compare', compare: 'compare', quiz: 'quiz',
  decision: 'decision', indication: 'decision', counseling: 'counseling',
  prerequisite: 'prerequisite', clarify: 'clarify', application: 'apply', apply: 'apply',
};

function mapCategory(value?: string, label = ''): ReadNextCategory {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z]+/g, '_') ?? '';
  const normalizedLabel = label.toLowerCase();
  const exact = CATEGORY_MAP[normalized];
  if (exact) return exact;
  if (/\b(red flags?|warning signs?)\b/.test(normalizedLabel)) return 'complication';
  if (/\b(imaging|history|exam|diagnos|workup)\b/.test(normalizedLabel)) return 'clarify';
  if (/\bimplant\b/.test(normalizedLabel) && /\b(choose|selection|design|compare)\b/.test(normalizedLabel)) return 'decision';
  if (/anatom|landmark/.test(normalized)) return 'anatomy';
  if (/complication|risk|infection|pitfall/.test(normalized)) return 'complication';
  if (/study_material|study_technique|resource|practice_question/.test(normalized)) return 'apply';
  if (/evidence|research|controvers/.test(normalized)) return 'evidence';
  if (/quiz|oite|board|pimp|trap|attending_question/.test(normalized)) return 'quiz';
  if (/counsel|psycholog/.test(normalized)) return 'counseling';
  if (/compare|versus/.test(normalized)) return 'compare';
  if (/rehabilitation|postoperative|follow_up|pain_management|care/.test(normalized)) return 'apply';
  if (/implant_selection|implant_design/.test(normalized)) return 'decision';
  if (/diagnos|assessment|differential|imaging/.test(normalized)) return 'clarify';
  if (/decision|indication|treatment|management|clinical/.test(normalized)) return 'decision';
  if (/technique|surg|approach|step|fixation|implant|bone_preparation|trialing|cementing|positioning/.test(normalized)) return 'technique';
  if (/classification|basic_science|biology|biomechanic|material|fact|concept/.test(normalized)) return 'prerequisite';
  if (/imaging|measurement|pathology|symptom|health|demographic|growth|education|technology|ethic/.test(normalized)) return 'deepen';
  return 'deepen';
}

export function adaptLegacyBranchesToReadNextCandidates(
  branches: BroBotBranchOption[],
  source: ReadNextCandidateSource = 'model'
): ReadNextCandidateV2[] {
  return branches.map((branch) => ({
    internalId: branch.id,
    displayLabel: branch.label,
    canonicalPrompt: branch.label,
    category: mapCategory(branch.category, branch.label),
    sources: [source],
    provenanceIds: [branch.branchQuestionId, branch.topicId].filter((value): value is string => Boolean(value)),
    evidenceAvailable: false,
    patientSpecific: false,
    urgencyCompatible: false,
    interactionCompatibility: [],
  }));
}
