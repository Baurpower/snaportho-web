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
strict_1.default.match(system?.content ?? '', /title must be generic/i);
strict_1.default.match(system?.content ?? '', /Do NOT repeat any answer choice verbatim/i);
strict_1.default.match(system?.content ?? '', /unmistakable synonym/i);
strict_1.default.match(system?.content ?? '', /Which choices describe a one-time threshold/i);
strict_1.default.match(system?.content ?? '', /learner must still perform a real reasoning step/i);
strict_1.default.match(user?.content ?? '', /Hint 1 - Recognize the pattern/);
strict_1.default.match(user?.content ?? '', /Yield strength/);
console.log('Orthobullets hint prompt anti-spoiler tests passed.');
