import type { BroBotChatMode } from '@/lib/brobot/chat/types';

import type { BroBotResearchSubmode, ResearchSubmodeRoute } from './types';

type RouteInput = {
  message: string;
  selectedMode?: BroBotChatMode;
};

type Rule = {
  submode: BroBotResearchSubmode;
  name: string;
  patterns: RegExp[];
  confidence: number;
  signals: string[];
};

const ROUTING_RULES: Rule[] = [
  {
    submode: 'reference_finder',
    name: 'citation_support',
    confidence: 0.94,
    signals: ['citation', 'claim support'],
    patterns: [
      /\b(find|need|give|provide|identify)\b.*\b(citation|reference|paper)\b/i,
      /\b(citation|reference)\b.*\b(for|support|sentence|claim|statement)\b/i,
      /\b(support|cite)\b.*\b(this|claim|sentence|statement)\b/i,
      /\b(better|stronger)\b.*\b(citation|reference)\b/i,
    ],
  },
  {
    submode: 'manuscript_reviewer',
    name: 'manuscript_section_review',
    confidence: 0.92,
    signals: ['manuscript review', 'section critique'],
    patterns: [
      /\b(review|critique|edit|look over)\b.*\b(manuscript|paper|section|introduction|methods|results|discussion|abstract)\b/i,
      /\b(my|this)\b.*\b(introduction|methods|results|discussion|abstract)\b.*\b(section|paragraph|draft)\b/i,
      /\b(reviewer|peer review)\b.*\b(comments?|criticism|criticisms|vulnerabilities)\b/i,
    ],
  },
  {
    submode: 'literature_review_builder',
    name: 'literature_review',
    confidence: 0.91,
    signals: ['literature review', 'outline'],
    patterns: [
      /\b(build|create|draft|make|outline|write)\b.*\b(lit|literature)\b.*\b(review|section|outline)\b/i,
      /\b(literature review|review article)\b.*\b(on|for|about)\b/i,
      /\b(organize|summarize)\b.*\b(evidence|literature)\b.*\b(themes?|outline)\b/i,
    ],
  },
  {
    submode: 'journal_scout',
    name: 'must_read_papers',
    confidence: 0.9,
    signals: ['must-read papers', 'landmark literature'],
    patterns: [
      /\b(must[- ]read|seminal|landmark|classic|highest[- ]impact|most important)\b.*\b(papers?|studies|literature|articles?)\b/i,
      /\b(find|show|identify)\b.*\b(top|best|highest[- ]impact|landmark)\b.*\b(papers?|studies|articles?)\b/i,
    ],
  },
  {
    submode: 'systematic_review_assistant',
    name: 'systematic_review_planning',
    confidence: 0.93,
    signals: ['systematic review planning', 'search strategy'],
    patterns: [
      /\b(systematic review|meta-analysis|meta analysis)\b.*\b(plan|design|protocol|search|inclusion|exclusion|screening|extraction)\b/i,
      /\b(plan|design|protocol|search|inclusion|exclusion|screening|extraction)\b.*\b(systematic review|meta-analysis|meta analysis)\b/i,
      /\b(help|create|generate|build)\b.*\b(search strategy|inclusion criteria|exclusion criteria|screening framework|data extraction)\b/i,
      /\b(prisma|risk of bias|robins|cochrane)\b/i,
    ],
  },
  {
    submode: 'statistical_reviewer',
    name: 'statistical_review',
    confidence: 0.92,
    signals: ['statistical review', 'methods/results reporting'],
    patterns: [
      /\b(review|critique|check)\b.*\b(stats|statistics|statistical analysis|analysis section)\b/i,
      /\b(confidence interval|effect size|p[- ]?value|regression|propensity|matching|covariates?|multiple comparisons|power|underpowered)\b/i,
      /\b(balance statistics|missing data|denominators?|model details)\b/i,
    ],
  },
  {
    submode: 'research_planning',
    name: 'study_design',
    confidence: 0.91,
    signals: ['study design', 'research planning'],
    patterns: [
      /\b(trinetx|database study|retrospective cohort|case[- ]control|registry study)\b/i,
      /\b(help|design|plan|develop)\b.*\b(study|project|research question|hypothesis|cohort)\b/i,
      /\b(exposure definition|outcome definition|matching strategy|confounders?)\b/i,
    ],
  },
  {
    submode: 'evidence_synthesis',
    name: 'focused_evidence_question',
    confidence: 0.82,
    signals: ['focused evidence question', 'association'],
    patterns: [
      /\b(does|do|is|are|can)\b.+\b(increase|decrease|predict|associated with|risk factor|lead to|cause|improve|reduce)\b/i,
      /\b(compare|synthesize|summarize)\b.*\b(evidence|findings|studies)\b/i,
      /\b(consensus|conflicting evidence|conflict|journal club)\b/i,
    ],
  },
];

function genericResearchFallback(message: string): ResearchSubmodeRoute {
  const signals = /\b(paper|study|evidence|research|abstract|methods|results|literature)\b/i.test(message)
    ? ['generic research language']
    : [];

  return {
    submode: 'evidence_synthesis',
    confidence: signals.length > 0 ? 0.55 : 0.45,
    source: 'fallback',
    matchedRule: 'generic_research_fallback',
    signals,
  };
}

export function routeResearchSubmode(input: RouteInput): ResearchSubmodeRoute | null {
  const selectedMode = input.selectedMode === 'fracture_call' ? 'consult' : input.selectedMode;
  if (selectedMode && selectedMode !== 'auto' && selectedMode !== 'research') return null;

  const message = input.message.trim();
  if (!message) return null;

  if (/\b(stats|statistics|statistical analysis|analysis section|confidence interval|p[- ]?value|regression|propensity|matching)\b/i.test(message)) {
    return {
      submode: 'statistical_reviewer',
      confidence: 0.93,
      source: 'deterministic',
      matchedRule: 'statistical_priority',
      signals: ['statistical review'],
    };
  }

  for (const rule of ROUTING_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(message))) {
      return {
        submode: rule.submode,
        confidence: rule.confidence,
        source: 'deterministic',
        matchedRule: rule.name,
        signals: rule.signals,
      };
    }
  }

  if (selectedMode === 'research') return genericResearchFallback(message);
  return null;
}
