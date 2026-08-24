"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const curriculum_prompt_builder_1 = require("./curriculum-prompt-builder");
const context = {
    pageContext: {
        source: 'rock',
        provider: 'rock',
        mode: 'curriculum_content',
        pageUrl: 'https://rock.aaos.org/coursecontent.aspx?id=6002116',
        pageKind: 'curriculum_content',
        title: 'Local Anesthesia',
        breadcrumbs: ['General Principles'],
        contentText: 'Local anesthetic pharmacology content.',
        answerChoices: [],
        percentDistribution: [],
        linkedConcepts: [],
        images: [{ src: 'https://rock.aaos.org/figure-4.jpg', alt: 'AP pelvis radiograph', caption: 'Contained central acetabular deficiency (Paprosky type IIA).' }],
        extractionWarnings: [],
        learningObjectives: ['Recognize LAST'],
    },
    warnings: [],
    kgLookup: null,
};
const highYield = (0, curriculum_prompt_builder_1.buildCurriculumExplainMessages)({ context, emphasis: 'high_yield' });
const boards = (0, curriculum_prompt_builder_1.buildCurriculumExplainMessages)({ context, emphasis: 'boards' });
strict_1.default.match(highYield[1]?.content ?? '', /COMPLETE STUDY GUIDE/i);
strict_1.default.match(boards[1]?.content ?? '', /COMPLETE STUDY GUIDE/i);
strict_1.default.match(highYield[1]?.content ?? '', /Recognize LAST/);
strict_1.default.match(highYield[1]?.content ?? '', /Paprosky type IIA/);
strict_1.default.match(highYield[0]?.content ?? '', /suggestedFollowUps/);
strict_1.default.match(highYield[0]?.content ?? '', /actual named type\/grade/i);
strict_1.default.match(highYield[0]?.content ?? '', /Do not merely state that a classification exists/i);
strict_1.default.match(highYield[0]?.content ?? '', /standalone study guide/i);
strict_1.default.match(highYield[0]?.content ?? '', /8-16 board-grade facts/i);
strict_1.default.match(highYield[1]?.content ?? '', /board testing, clinical decisions, and OR relevance/i);
console.log('Curriculum prompt builder emphasis tests passed.');
