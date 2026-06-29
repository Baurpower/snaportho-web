import {
  CURRICULUM_TOPIC_BY_ID,
  CURRICULUM_TOPICS,
  CURRICULUM_TRACK_BY_ID,
  CURRICULUM_TRACKS,
} from '@/lib/student-curriculum/curriculum-data';
import type {
  CurriculumCommonStudentCase,
  CurriculumRecommendation,
  CurriculumRecommendationReason,
  CurriculumStudyTemplate,
  CurriculumTopic,
  CurriculumTrack,
  CurriculumTrackOverview,
  DeepStudyTemplate,
  FastStudyTemplate,
  RecommendedNextTopicsParams,
  StudyMode,
} from '@/lib/student-curriculum/curriculum-types';

const DIFFICULTY_RANK: Record<CurriculumTopic['difficulty'], number> = {
  introductory: 0,
  core: 1,
  advanced: 2,
};

const STUDENT_LEVEL_RANK: Record<CurriculumTopic['studentLevel'], number> = {
  preclinical: 0,
  clerkship: 1,
  subintern: 2,
  'intern-ready': 3,
};

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function buildReason(
  code: CurriculumRecommendationReason['code'],
  label: string
): CurriculumRecommendationReason {
  return { code, label };
}

export function getTrackById(trackId: string): CurriculumTrack | undefined {
  return CURRICULUM_TRACK_BY_ID[trackId];
}

export function getTopicById(topicId: string): CurriculumTopic | undefined {
  return CURRICULUM_TOPIC_BY_ID[topicId];
}

export function getTopicsByTrack(trackId: string): CurriculumTopic[] {
  const track = getTrackById(trackId);
  if (!track) {
    return [];
  }

  return track.topicIds
    .map((topicId) => getTopicById(topicId))
    .filter((topic): topic is CurriculumTopic => Boolean(topic));
}

export function getRelatedTopics(topicId: string): CurriculumTopic[] {
  const topic = getTopicById(topicId);
  if (!topic) {
    return [];
  }

  return topic.relatedTopicIds
    .map((relatedTopicId) => getTopicById(relatedTopicId))
    .filter((relatedTopic): relatedTopic is CurriculumTopic => Boolean(relatedTopic));
}

export function getPrerequisiteTopics(topicId: string): CurriculumTopic[] {
  const topic = getTopicById(topicId);
  if (!topic) {
    return [];
  }

  return topic.prerequisites
    .map((prerequisiteId) => getTopicById(prerequisiteId))
    .filter((prerequisite): prerequisite is CurriculumTopic => Boolean(prerequisite));
}

export function getSuggestedStartTopic(trackId: string): CurriculumTopic | undefined {
  const track = getTrackById(trackId);
  if (!track) {
    return undefined;
  }

  return getTopicById(track.suggestedStartTopicId);
}

function scoreRecommendation(
  topic: CurriculumTopic,
  params: RecommendedNextTopicsParams,
  completedTopicIds: Set<string>,
  weakTagIds: Set<string>,
  currentTopic?: CurriculumTopic
): CurriculumRecommendation {
  const track = CURRICULUM_TRACK_BY_ID[topic.trackId];
  const reasons: CurriculumRecommendationReason[] = [];
  let score = 0;

  if (params.trackId && topic.trackId === params.trackId) {
    score += 70;
    reasons.push(
      buildReason(
        'preferred-track',
        `Matches the requested ${track.title} track.`
      )
    );
  }

  if (!params.trackId && currentTopic && topic.trackId === currentTopic.trackId) {
    score += 24;
    reasons.push(
      buildReason('same-track', `Stays within the ${track.title} track.`)
    );
  }

  if (currentTopic && currentTopic.relatedTopicIds.includes(topic.id)) {
    score += 120;
    reasons.push(
      buildReason('related-topic', `Directly related to ${currentTopic.title}.`)
    );
  }

  const matchingWeakTags = topic.tags.filter((tag) =>
    weakTagIds.has(normalizeTag(tag))
  );
  if (matchingWeakTags.length > 0) {
    score += matchingWeakTags.length * 28;
    reasons.push(
      buildReason(
        'matching-weak-tag',
        `Reinforces weak areas: ${matchingWeakTags.join(', ')}.`
      )
    );
  }

  const completedPrerequisites = topic.prerequisites.filter((prerequisiteId) =>
    completedTopicIds.has(prerequisiteId)
  );
  if (topic.prerequisites.length > 0 && completedPrerequisites.length === topic.prerequisites.length) {
    score += 30;
    reasons.push(
      buildReason(
        'prerequisites-ready',
        'All listed prerequisites are already completed.'
      )
    );
  } else if (completedPrerequisites.length > 0) {
    score += 12;
    reasons.push(
      buildReason(
        'prerequisites-ready',
        `Some prerequisites are already completed (${completedPrerequisites.length}/${topic.prerequisites.length}).`
      )
    );
  } else if (topic.prerequisites.length === 0) {
    score += 10;
    reasons.push(
      buildReason('prerequisites-ready', 'No prerequisite topics are required.')
    );
  }

  if (track.suggestedStartTopicId === topic.id) {
    score += currentTopic ? 6 : 26;
    reasons.push(
      buildReason(
        'suggested-start-topic',
        `Suggested starting topic for the ${track.title} track.`
      )
    );
  }

  if (topic.difficulty === 'introductory') {
    score += 16;
    reasons.push(
      buildReason('introductory-difficulty', 'Introductory difficulty makes it easier to pick up quickly.')
    );
  } else if (topic.difficulty === 'core') {
    score += 10;
    reasons.push(
      buildReason('core-difficulty', 'Core difficulty keeps the next step high-yield without being too advanced.')
    );
  }

  if (topic.studentLevel === 'clerkship' || topic.studentLevel === 'preclinical') {
    score += 10;
    reasons.push(
      buildReason(
        'student-level-fit',
        `Student level is ${topic.studentLevel.replace('-', ' ')}, which fits broad frontend entry points.`
      )
    );
  } else if (topic.studentLevel === 'subintern') {
    score += 5;
    reasons.push(
      buildReason(
        'student-level-fit',
        'Student level is subintern, which still works well for focused progression.'
      )
    );
  }

  if (reasons.length === 0) {
    score += 5;
    reasons.push(
      buildReason('fallback-topic', 'Uncompleted topic available for continued study.')
    );
  }

  return {
    topic,
    track,
    score,
    reasons,
  };
}

export function getRecommendedNextTopics(
  params: RecommendedNextTopicsParams = {}
): CurriculumRecommendation[] {
  const completedTopicIds = new Set(params.completedTopicIds ?? []);
  const weakTagIds = new Set((params.weakTagIds ?? []).map(normalizeTag));
  const currentTopic = params.currentTopicId
    ? getTopicById(params.currentTopicId)
    : undefined;
  const limit = params.limit ?? 5;

  const candidateTopics = (params.trackId ? getTopicsByTrack(params.trackId) : CURRICULUM_TOPICS).filter(
    (topic) => !completedTopicIds.has(topic.id) && topic.id !== params.currentTopicId
  );

  return candidateTopics
    .map((topic) =>
      scoreRecommendation(topic, params, completedTopicIds, weakTagIds, currentTopic)
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const difficultyDifference =
        DIFFICULTY_RANK[left.topic.difficulty] - DIFFICULTY_RANK[right.topic.difficulty];
      if (difficultyDifference !== 0) {
        return difficultyDifference;
      }

      const levelDifference =
        STUDENT_LEVEL_RANK[left.topic.studentLevel] -
        STUDENT_LEVEL_RANK[right.topic.studentLevel];
      if (levelDifference !== 0) {
        return levelDifference;
      }

      if (left.track.title !== right.track.title) {
        return left.track.title.localeCompare(right.track.title);
      }

      if (left.topic.title !== right.topic.title) {
        return left.topic.title.localeCompare(right.topic.title);
      }

      return left.topic.id.localeCompare(right.topic.id);
    })
    .slice(0, limit);
}

export function getCurriculumOverview(): CurriculumTrackOverview[] {
  return CURRICULUM_TRACKS.map((track) => {
    const topics = getTopicsByTrack(track.id);

    return {
      track,
      topicCount: topics.length,
      estimatedFastMinutes: topics.reduce(
        (sum, topic) => sum + topic.estimatedFastMinutes,
        0
      ),
      estimatedDeepMinutes: topics.reduce(
        (sum, topic) => sum + topic.estimatedDeepMinutes,
        0
      ),
      suggestedStartTopic: getSuggestedStartTopic(track.id),
    };
  }).sort((left, right) => left.track.title.localeCompare(right.track.title));
}

export function getCommonStudentCases(limit?: number): CurriculumCommonStudentCase[] {
  const groupedCases = new Map<string, CurriculumCommonStudentCase>();

  for (const topic of CURRICULUM_TOPICS) {
    const track = CURRICULUM_TRACK_BY_ID[topic.trackId];
    for (const curriculumCase of topic.commonCases) {
      const existing = groupedCases.get(curriculumCase.name);
      const nextTopicReference = {
        topicId: topic.id,
        topicTitle: topic.title,
        trackId: track.id,
        trackTitle: track.title,
      };

      if (existing) {
        existing.topics.push(nextTopicReference);
      } else {
        groupedCases.set(curriculumCase.name, {
          caseName: curriculumCase.name,
          topics: [nextTopicReference],
        });
      }
    }
  }

  const orderedCases = Array.from(groupedCases.values())
    .map((entry) => ({
      ...entry,
      topics: entry.topics.sort((left, right) => {
        if (left.trackTitle !== right.trackTitle) {
          return left.trackTitle.localeCompare(right.trackTitle);
        }

        if (left.topicTitle !== right.topicTitle) {
          return left.topicTitle.localeCompare(right.topicTitle);
        }

        return left.topicId.localeCompare(right.topicId);
      }),
    }))
    .sort((left, right) => {
      if (right.topics.length !== left.topics.length) {
        return right.topics.length - left.topics.length;
      }

      return left.caseName.localeCompare(right.caseName);
    });

  return typeof limit === 'number' ? orderedCases.slice(0, limit) : orderedCases;
}

export function getStudyTemplate(
  topicId: string,
  mode: 'fast'
): FastStudyTemplate | undefined;
export function getStudyTemplate(
  topicId: string,
  mode: 'deep'
): DeepStudyTemplate | undefined;
export function getStudyTemplate(
  topicId: string,
  mode: StudyMode
): CurriculumStudyTemplate | undefined {
  const topic = getTopicById(topicId);
  if (!topic) {
    return undefined;
  }

  return mode === 'fast' ? topic.fastStudyTemplate : topic.deepStudyTemplate;
}
