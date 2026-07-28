"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const prompt_builder_1 = require("./prompt-builder");
function textContent(message) {
    if (!message)
        return '';
    return typeof message.content === 'string'
        ? message.content
        : message.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');
}
const context = {
    pageContext: {
        source: 'orthobullets',
        provider: 'orthobullets',
        mode: 'question',
        pageUrl: 'https://www.orthobullets.com/currenttest',
        pageKind: 'question',
        questionId: '2928',
        stem: 'Which defines the stress at which a material begins to undergo plastic deformation?',
        breadcrumbs: [],
        answerChoices: [
            { key: '1', text: 'Toughness' },
            { key: '2', text: 'Ultimate strength' },
            { key: '3', text: 'Yield strength' },
            { key: '4', text: 'Fatigue strength' },
            { key: '5', text: 'Endurance limit' },
        ],
        percentDistribution: [],
        linkedConcepts: [],
        images: [],
        extractionWarnings: [],
    },
    warnings: [],
    kgLookup: null,
};
const [system, user] = (0, prompt_builder_1.buildOrthobulletsHintMessages)({ context, hintLevel: 1 });
const systemText = textContent(system);
const userText = textContent(user);
strict_1.default.match(systemText, /Do NOT reveal the correct answer choice/i);
strict_1.default.match(systemText, /Medical terms appearing inside choices may be discussed/i);
strict_1.default.match(systemText, /Which choices describe a one-time threshold/i);
strict_1.default.match(systemText, /learner must still perform a real reasoning step/i);
strict_1.default.match(userText, /Hint 1 - Recognize the pattern/);
strict_1.default.match(userText, /Yield strength/);
strict_1.default.doesNotMatch(userText, /User selected answer/);
const [levelTwoSystem, levelTwoUser] = (0, prompt_builder_1.buildOrthobulletsHintMessages)({
    context,
    hintLevel: 2,
    priorHints: [{
            hintLevel: 1,
            title: 'Separate the material-property categories',
            hint: 'Sort the choices by the kind of behavior each property measures.',
        }],
    correctionIssues: ['Hint 2 does not explicitly contrast stronger and weaker paths'],
});
strict_1.default.match(textContent(levelTwoSystem), /reduce five choices to roughly two/i);
strict_1.default.match(textContent(levelTwoSystem), /CORRECTION REQUIRED/);
strict_1.default.match(textContent(levelTwoUser), /Prior learner-visible hints/);
strict_1.default.match(textContent(levelTwoUser), /Sort the choices by the kind of behavior/);
const [, visionUser] = (0, prompt_builder_1.buildOrthobulletsHintMessages)({
    context: {
        ...context,
        pageContext: {
            ...context.pageContext,
            pageUrl: 'https://www.orthobullets.com/currenttest',
            stem: 'Which Angle A measurement increases junctional risk in Figure A?',
            images: [{ src: '/question-images/sagittal-alignment.png' }],
        },
    },
    hintLevel: 1,
});
strict_1.default.ok(Array.isArray(visionUser?.content), 'question figures should produce multimodal input');
strict_1.default.deepEqual(Array.isArray(visionUser?.content)
    ? visionUser.content.filter((part) => part.type === 'image_url').map((part) => part.image_url.url)
    : [], ['https://www.orthobullets.com/question-images/sagittal-alignment.png']);
strict_1.default.match(textContent(visionUser), /Inspect labels and measurements directly/);
console.log('Orthobullets hint prompt anti-spoiler tests passed.');
