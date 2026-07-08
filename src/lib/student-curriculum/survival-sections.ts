import type {
  CurriculumTopic,
  FastStudyTemplate,
  DeepStudyTemplate,
} from '@/lib/student-curriculum/curriculum-types';

export const SURVIVAL_SECTION_IDS = [
  'whyThisMatters',
  'mustKnow',
  'residentExpectations',
  'attendingQuestions',
  'commonMistakes',
  'lookPrepared',
  'learnNext',
  'positioning',
  'approach',
  'criticalSteps',
  'pitfalls',
] as const;

export type SurvivalSectionId = (typeof SURVIVAL_SECTION_IDS)[number];

export const SURVIVAL_SECTION_GROUPS = ['survival', 'procedure-detail'] as const;
export type SurvivalSectionGroup = (typeof SURVIVAL_SECTION_GROUPS)[number];

export const TOPIC_TYPES = ['procedure', 'concept'] as const;
export type TopicType = (typeof TOPIC_TYPES)[number];

export type SurvivalSection = {
  id: SurvivalSectionId;
  title: string;
  subtitle: string;
  group: SurvivalSectionGroup;
  items: string[];
  hasContent: boolean;
};

const PROCEDURE_TAG_FRAGMENTS = ['arthroplasty', 'reconstruction', 'orif', 'repair', 'replacement'];
const PROCEDURE_TITLE_WORDS = ['arthroplasty', 'reconstruction', 'replacement', 'repair'];

export function detectTopicType(topic: CurriculumTopic): TopicType {
  const titleLower = topic.title.toLowerCase();
  const tagsLower = topic.tags.map((t) => t.toLowerCase());

  if (
    tagsLower.some((tag) => PROCEDURE_TAG_FRAGMENTS.some((pt) => tag.includes(pt))) ||
    PROCEDURE_TITLE_WORDS.some((word) => titleLower.includes(word))
  ) {
    return 'procedure';
  }

  return 'concept';
}

function compact(values: Array<string | undefined>, limit: number): string[] {
  return values
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, limit);
}

function splitDelimited(items: string[]): string[] {
  return items.flatMap((item) =>
    item
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function certifiedBullets(
  certifiedByLabel: Map<string, string>,
  ...labels: string[]
): string[] {
  for (const label of labels) {
    const content = certifiedByLabel.get(label.toLowerCase());
    if (content?.trim()) {
      return content
        .split(/\n+/)
        .map((line) => line.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 6);
    }
  }
  return [];
}

export function buildSurvivalSections(params: {
  topic: CurriculumTopic;
  fastTemplate: FastStudyTemplate;
  deepTemplate: DeepStudyTemplate;
  certifiedSections?: Array<{ label: string; content: string }>;
  relatedTopicTitles?: Map<string, string>;
}): SurvivalSection[] {
  const { topic, fastTemplate, deepTemplate, certifiedSections, relatedTopicTitles } = params;

  const topicType = detectTopicType(topic);
  const certifiedByLabel = new Map(
    (certifiedSections ?? []).map((s) => [s.label.toLowerCase(), s.content])
  );

  const whyItems = compact(
    [
      fastTemplate.oneLiner,
      ...certifiedBullets(certifiedByLabel, 'why this matters', 'overview', 'procedure overview'),
    ],
    3
  );

  const parsedMustKnow = splitDelimited(fastTemplate.mustKnow);
  const mustKnowItems = compact(
    [
      ...certifiedBullets(certifiedByLabel, 'must know', 'if you know only three things', 'high yield'),
      ...parsedMustKnow,
      ...deepTemplate.boardPearls,
      ...topic.learningObjectives.map((o) => o.objective),
    ],
    3
  );

  const residentItems = compact(
    [
      ...certifiedBullets(certifiedByLabel, 'resident expectations'),
      ...topic.learningObjectives.map((o) => o.objective),
      ...fastTemplate.pimpQuestions.slice(0, 2).map((q) => `Be ready to answer: ${q}`),
    ],
    5
  );

  const attendingItems = compact(
    [
      ...certifiedBullets(
        certifiedByLabel,
        'attending questions',
        'pimp questions',
        'common attending questions'
      ),
      ...fastTemplate.pimpQuestions,
      ...deepTemplate.selfCheckQuestions,
    ],
    7
  );

  const mistakeItems = compact(
    [
      ...certifiedBullets(certifiedByLabel, 'common mistakes', 'mistakes'),
      ...deepTemplate.boardPearls.map((pearl) => `Do not miss: ${pearl}`),
      ...deepTemplate.complications.slice(0, 2),
    ],
    5
  );

  const lookPreparedItems = compact(
    [
      ...certifiedBullets(
        certifiedByLabel,
        'how to look prepared',
        'survival tips',
        'or survival',
        'look prepared'
      ),
      ...fastTemplate.orSurvivalTips,
    ],
    5
  );

  const learnNextItems = topic.relatedTopicIds.slice(0, 6).map(
    (id) =>
      relatedTopicTitles?.get(id) ??
      id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
  );

  type SectionDef = Omit<SurvivalSection, 'hasContent'>;

  const sections: SectionDef[] = [
    {
      id: 'whyThisMatters',
      title: 'Why This Matters',
      subtitle: 'Why you are spending time on this tonight.',
      group: 'survival',
      items: whyItems,
    },
    {
      id: 'mustKnow',
      title: 'If You Know Only Three Things',
      subtitle: 'The highest-yield facts for tomorrow.',
      group: 'survival',
      items: mustKnowItems,
    },
    {
      id: 'residentExpectations',
      title: 'Resident Expectations',
      subtitle: 'What the PGY2 expects you to know.',
      group: 'survival',
      items: residentItems,
    },
    {
      id: 'attendingQuestions',
      title: 'Attending Questions',
      subtitle: 'Questions you should be ready to answer out loud.',
      group: 'survival',
      items: attendingItems,
    },
    {
      id: 'commonMistakes',
      title: 'Common Mistakes',
      subtitle: 'What makes learners appear unprepared.',
      group: 'survival',
      items: mistakeItems,
    },
    {
      id: 'lookPrepared',
      title: 'How To Look Prepared',
      subtitle: 'Insider advice for tomorrow.',
      group: 'survival',
      items: lookPreparedItems,
    },
    {
      id: 'learnNext',
      title: 'Learn Next',
      subtitle: 'Continue building your understanding.',
      group: 'survival',
      items: learnNextItems,
    },
  ];

  if (topicType === 'procedure') {
    sections.push(
      {
        id: 'positioning',
        title: 'Positioning',
        subtitle: 'How the patient is set up and what that changes.',
        group: 'procedure-detail',
        items: compact(
          [
            ...certifiedBullets(certifiedByLabel, 'positioning', 'patient positioning'),
            fastTemplate.orSurvivalTips[0],
          ],
          4
        ),
      },
      {
        id: 'approach',
        title: 'Approach',
        subtitle: 'Surgical exposure and key anatomical considerations.',
        group: 'procedure-detail',
        items: compact(
          [
            ...certifiedBullets(certifiedByLabel, 'approach', 'surgical approach'),
            ...deepTemplate.surgicalApproach,
            ...deepTemplate.anatomy.slice(0, 2),
          ],
          5
        ),
      },
      {
        id: 'criticalSteps',
        title: 'Critical Steps',
        subtitle: 'High-level operative flow.',
        group: 'procedure-detail',
        items: compact(
          [
            ...certifiedBullets(certifiedByLabel, 'surgical steps', 'operative steps', 'critical steps'),
            ...fastTemplate.caseSteps,
            ...deepTemplate.surgicalApproach,
          ],
          6
        ),
      },
      {
        id: 'pitfalls',
        title: 'Pitfalls',
        subtitle: 'What can go wrong and what the team watches for.',
        group: 'procedure-detail',
        items: compact(
          [
            ...certifiedBullets(certifiedByLabel, 'pitfalls', 'complications'),
            ...deepTemplate.complications,
          ],
          5
        ),
      }
    );
  }

  return sections.map((section) => ({
    ...section,
    hasContent: section.items.length > 0,
  }));
}
