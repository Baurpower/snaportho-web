"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const topic_tutor_prompt_builder_1 = require("./topic-tutor-prompt-builder");
const context = {
    pageContext: {
        source: 'orthobullets',
        provider: 'orthobullets',
        mode: 'topic_page',
        pageUrl: 'https://www.orthobullets.com/pediatrics/4092/duchenne-muscular-dystrophy',
        pageKind: 'topic',
        topicId: '4092',
        title: 'Duchenne Muscular Dystrophy',
        breadcrumbs: ['Pediatrics'],
        sectionHeadings: ['Summary'],
        contentSections: [{ heading: 'Summary', text: 'X-linked dystrophin disorder.' }],
        answerChoices: [],
        percentDistribution: [],
        linkedConcepts: [],
        images: [],
        extractionWarnings: [],
    },
    warnings: [],
    kgLookup: null,
};
const progress = {
    sectionsCompleted: [],
    conceptsMastered: [],
    conceptsMissed: [],
    savedPearls: [],
    tier: 1,
};
const normalChat = (0, topic_tutor_prompt_builder_1.buildTopicTutorMessages)({
    context,
    progress,
    history: [],
    userMessage: 'Why does this cause cardiomyopathy?',
});
strict_1.default.match(normalChat[0]?.content ?? '', /treat the learner's message as normal chat/i);
strict_1.default.match(normalChat[0]?.content ?? '', /Answer it directly and conversationally/i);
const usefulVersion = (0, topic_tutor_prompt_builder_1.buildTopicTutorMessages)({ context, progress, history: [], action: 'explain_page' });
strict_1.default.match(usefulVersion[1]?.content ?? '', /3-5 ideas that organize the topic/i);
strict_1.default.match(usefulVersion[1]?.content ?? '', /helpful synthesis, not a quiz/i);
const tested = (0, topic_tutor_prompt_builder_1.buildTopicTutorMessages)({ context, progress, history: [], action: 'what_tested' });
strict_1.default.match(tested[1]?.content ?? '', /Give 3-5 concrete, prioritized OITE\/board testable takeaways/i);
const traps = (0, topic_tutor_prompt_builder_1.buildTopicTutorMessages)({ context, progress, history: [], action: 'board_traps' });
strict_1.default.match(traps[1]?.content ?? '', /tempting wrong idea with the clue or rule/i);
console.log('Orthobullets topic tutor focus and normal-chat tests passed.');
