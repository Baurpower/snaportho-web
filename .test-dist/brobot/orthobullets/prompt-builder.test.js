"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const prompt_builder_1 = require("./prompt-builder");
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
strict_1.default.match(system?.content ?? '', /Do NOT reveal the correct answer choice/i);
strict_1.default.match(system?.content ?? '', /Medical terms appearing inside choices may be discussed/i);
strict_1.default.match(system?.content ?? '', /Which choices describe a one-time threshold/i);
strict_1.default.match(system?.content ?? '', /learner must still perform a real reasoning step/i);
strict_1.default.match(user?.content ?? '', /Hint 1 - Recognize the pattern/);
strict_1.default.match(user?.content ?? '', /Yield strength/);
strict_1.default.doesNotMatch(user?.content ?? '', /User selected answer/);
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
strict_1.default.match(levelTwoSystem?.content ?? '', /reduce five choices to roughly two/i);
strict_1.default.match(levelTwoSystem?.content ?? '', /CORRECTION REQUIRED/);
strict_1.default.match(levelTwoUser?.content ?? '', /Prior learner-visible hints/);
strict_1.default.match(levelTwoUser?.content ?? '', /Sort the choices by the kind of behavior/);
console.log('Orthobullets hint prompt anti-spoiler tests passed.');
