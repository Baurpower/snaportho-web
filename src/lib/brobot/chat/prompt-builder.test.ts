import assert from 'node:assert/strict';

import {
  buildBroBotChatMessages,
  buildBroBotChatSystemPrompt,
  buildBroBotMetadataMessages,
  buildBroBotRevisionMessages,
} from './prompt-builder';
import { buildOiteLearningMetadata } from './oite-context';
import { buildOrPrepProcedureMetadata } from './or-prep-context';
import { runBroBotQualityGate } from './quality-gate';
import { buildBroBotAnswerContext } from './context-builder';
import { buildBroBotClinicalContext } from './clinical-context';
import { buildBroBotIntentExpansionMessages } from './intent-expander';
import {
  buildBroBotIntentClassifierMessages,
  fallbackBroBotIntent,
  parseBroBotIntentClassifierResponse,
} from './intent-classifier';
import { parseBroBotChatResponse, parseBroBotMetadataResponse } from './response-parser';
import {
  routeBroBotAnswer,
  buildBroBotRouteClarifyingQuestions,
  enforceClarificationAnswerBrevity,
  CLARIFICATION_ANSWER_MAX_LENGTH,
} from './answer-router';
import { selectSmartChips } from './chip-registry';
import type { BroBotChatIntent, BroBotChatMode } from './types';

const samplePrompts: Array<{ prompt: string; mode: BroBotChatMode; expectedText: string }> = [
  {
    prompt: 'I have tibial plateau ORIF tomorrow',
    mode: 'or_prep',
    expectedText: 'anatomy at risk',
  },
  {
    prompt: 'Give me OITE points for SCFE',
    mode: 'oite',
    expectedText: 'OITE Learning Engine',
  },
  {
    prompt: 'How do I work up septic arthritis?',
    mode: 'clinic',
    expectedText: 'differential',
  },
  {
    prompt: 'What should I know for reverse TSA?',
    mode: 'auto',
    expectedText: 'Infer the best detectedMode',
  },
];

for (const sample of samplePrompts) {
  const messages = buildBroBotChatMessages({
    message: sample.prompt,
    mode: sample.mode,
    responseDepth: 'standard',
    trainingLevel: 'pgy2',
  });

  assert.equal(messages[0]?.role, 'system');
  assert.match(messages[0]?.content ?? '', /Return valid JSON only/);
  assert.match(messages[0]?.content ?? '', /Do NOT include suggested questions/);
  assert.match(messages[0]?.content ?? '', /Important Concepts/);
  assert.match(messages[0]?.content ?? '', /What to Learn Next/);
  assert.match(messages[0]?.content ?? '', /needsClarification/);
  assert.match(messages[0]?.content ?? '', /clarifyingQuestions/);
  assert.match(messages[0]?.content ?? '', /assumedContext/);
  assert.match(messages[0]?.content ?? '', new RegExp(sample.expectedText));
  assert.equal(messages.at(-1)?.content, sample.prompt);
}

const distalRadiusClinicalContext = buildBroBotClinicalContext({
  message: 'Distal radius ORIF tomorrow. What do I need to know?',
  mode: 'or_prep',
  subintent: 'surgical_steps',
  procedureCategory: 'fracture_orif',
  procedureOrTopic: 'distal radius ORIF',
});

assert.equal(distalRadiusClinicalContext.entities.bone, 'distal radius');
assert.equal(distalRadiusClinicalContext.entities.procedure, 'ORIF');
assert.ok(distalRadiusClinicalContext.taskFacets.includes('exposure'));
assert.ok(distalRadiusClinicalContext.taskFacets.includes('anatomy'));
assert.ok(distalRadiusClinicalContext.coverageRequirements.includes('exposure_or_approach'));
assert.ok(distalRadiusClinicalContext.coverageRequirements.includes('named_anatomy'));

const scfeClinicalContext = buildBroBotClinicalContext({
  message: 'SCFE OITE points',
  mode: 'oite',
  subintent: 'overview',
  procedureCategory: 'pediatric_fracture',
  procedureOrTopic: 'SCFE',
});

assert.equal(scfeClinicalContext.entities.diagnosis, 'SCFE');
assert.ok(scfeClinicalContext.taskFacets.includes('testTraps'));
assert.ok(scfeClinicalContext.taskFacets.includes('distractors'));
assert.ok(scfeClinicalContext.coverageRequirements.includes('trap_or_distractor'));

const ankleConsultClinicalContext = buildBroBotClinicalContext({
  message: 'Ankle fracture consult. How should I think about it?',
  mode: 'consult',
  subintent: 'fracture',
  procedureCategory: 'unknown',
  procedureOrTopic: 'ankle fracture',
});

assert.equal(ankleConsultClinicalContext.entities.bone, 'ankle');
assert.ok(ankleConsultClinicalContext.missingCriticalSlots.includes('age'));
assert.ok(ankleConsultClinicalContext.missingCriticalSlots.includes('neurovascular exam'));
assert.ok(ankleConsultClinicalContext.coverageRequirements.includes('red_flags'));
assert.ok(ankleConsultClinicalContext.coverageRequirements.includes('definitive_management_or_disposition'));

const painfulTkaClinicalContext = buildBroBotClinicalContext({
  message: 'Painful TKA consult with fever',
  mode: 'consult',
  subintent: 'postop_problem',
  procedureCategory: 'arthroplasty_consult',
  procedureOrTopic: 'painful TKA',
});

assert.equal(painfulTkaClinicalContext.entities.diagnosis, 'painful total knee arthroplasty');
assert.ok(painfulTkaClinicalContext.caseSlots.priorSurgery);
assert.ok(painfulTkaClinicalContext.missingCriticalSlots.includes('ESR/CRP/WBC and aspiration status'));

const shoulderClinicClinicalContext = buildBroBotClinicalContext({
  message: 'Shoulder pain workup',
  mode: 'clinic',
  subintent: 'workup',
  procedureCategory: 'general_topic',
  procedureOrTopic: 'shoulder pain',
});

assert.equal(shoulderClinicClinicalContext.entities.region, 'shoulder');
assert.ok(shoulderClinicClinicalContext.taskFacets.includes('workup'));
assert.ok(shoulderClinicClinicalContext.coverageRequirements.includes('differential'));
assert.ok(shoulderClinicClinicalContext.coverageRequirements.includes('history_exam'));

const neutralizationPlateClinicalContext = buildBroBotClinicalContext({
  message: 'What is a neutralization plate?',
  mode: 'general',
  subintent: 'implant_options',
  procedureCategory: 'general_topic',
  procedureOrTopic: 'neutralization plate',
});

assert.equal(neutralizationPlateClinicalContext.entities.implant, 'neutralization plate');
assert.ok(neutralizationPlateClinicalContext.taskFacets.includes('implants'));

const referenceFinderPrompt = buildBroBotChatSystemPrompt({
  mode: 'research',
  responseDepth: 'standard',
  trainingLevel: 'pgy3',
  intent: {
    mode: 'research',
    subintent: 'evidence_critique',
    procedureCategory: 'general_topic',
    procedureOrTopic: 'PPI and pseudarthrosis',
    goal: 'Find a citation for a manuscript claim.',
    ambiguity: 'low',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    researchSubmode: 'reference_finder',
    confidence: 0.9,
  },
});

assert.match(referenceFinderPrompt, /Research submode: Reference Finder/);
assert.match(referenceFinderPrompt, /Hard citation rule/);
assert.match(referenceFinderPrompt, /Best citation/);

const deepPgy5SystemPrompt = buildBroBotChatSystemPrompt({
  mode: 'consult',
  responseDepth: 'deep',
  trainingLevel: 'pgy5',
});

assert.match(deepPgy5SystemPrompt, /red flags/);
assert.match(deepPgy5SystemPrompt, /orthopaedic consult companion/);
assert.match(deepPgy5SystemPrompt, /How I Would Present This/);
assert.match(deepPgy5SystemPrompt, /Immediate Priorities/);
assert.match(deepPgy5SystemPrompt, /missingInformation/);
assert.match(deepPgy5SystemPrompt, /consultConfidence/);
assert.match(deepPgy5SystemPrompt, /operative judgment/);
assert.match(deepPgy5SystemPrompt, /avoid a textbook dump/);

const legacyFractureCallPrompt = buildBroBotChatSystemPrompt({
  mode: 'fracture_call',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
});

assert.match(legacyFractureCallPrompt, /Mode: consult/);
assert.match(legacyFractureCallPrompt, /orthopaedic consult companion/);

const orPrepSystemPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy1',
});

assert.match(orPrepSystemPrompt, /complements CasePrep/);
assert.match(orPrepSystemPrompt, /Important OR Concepts/);
assert.match(orPrepSystemPrompt, /What to Clarify Before Scrub/);
assert.match(orPrepSystemPrompt, /operative objective/);
assert.match(orPrepSystemPrompt, /Exposure Engine/);
assert.match(orPrepSystemPrompt, /prioritize exposure over chronology/);
assert.match(orPrepSystemPrompt, /decision points/);
assert.match(orPrepSystemPrompt, /Pitfalls\/Bailout/);
assert.match(orPrepSystemPrompt, /HIDDEN ANSWER PLAN/);
assert.match(orPrepSystemPrompt, /OR Prep mode response contract/);
assert.match(orPrepSystemPrompt, /Required elements/);

const answerOnlyPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  includeProductMetadata: false,
});

assert.match(answerOnlyPrompt, /Set suggestedQuestions to \[\]/);
assert.match(answerOnlyPrompt, /OR Prep exemplar/);

const metadataMessages = buildBroBotMetadataMessages({
  message: 'Distal radius ORIF tomorrow',
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  intent: {
    mode: 'or_prep',
    subintent: 'surgical_steps',
    procedureCategory: 'fracture_orif',
    procedureOrTopic: 'distal radius orif',
    ambiguity: 'moderate',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    confidence: 0.8,
  },
  finalAnswer: '- **Exposure:** volar FCR approach with protection of the radial artery and median nerve.',
  priorityPoints: ['Stay radial to FCR and protect the radial artery.'],
  knowledgeGaps: ['Review dorsal screw-penetration checks.'],
  whatMostResidentsMiss: ['They accept reduction before checking distal screw length.'],
  fallbackBranches: [{ id: 'approach', label: 'What approach should I know?', category: 'Surgical Approach' }],
});

assert.match(metadataMessages[0]?.content ?? '', /metadata composer/);
assert.match(metadataMessages[0]?.content ?? '', /suggestedQuestions/);

const revisionMessages = buildBroBotRevisionMessages({
  message: 'Ankle fracture consult',
  mode: 'consult',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  intent: {
    mode: 'consult',
    subintent: 'fracture',
    procedureCategory: 'unknown',
    procedureOrTopic: 'ankle fracture',
    ambiguity: 'moderate',
    assumedContext: '',
    missingContext: ['age', 'mechanism'],
    clarifyingQuestions: [],
    confidence: 0.7,
  },
  originalResponse: '- Get imaging and present it.',
  priorityPoints: ['Check neurovascular status.'],
  knowledgeGaps: ['Know what makes this unstable.'],
  warnings: ['consult_framework_weak'],
});

assert.match(revisionMessages[0]?.content ?? '', /answer reviser/);
assert.match(revisionMessages[0]?.content ?? '', /Do not add suggestedQuestions/);
assert.match(orPrepSystemPrompt, /Diagnostic knee arthroscopy/);
assert.match(orPrepSystemPrompt, /I mean the sequence once inside the knee/);
assert.match(orPrepSystemPrompt, /suprapatellar pouch/);
assert.match(orPrepSystemPrompt, /Landmarks/);
assert.match(orPrepSystemPrompt, /Steps/);
assert.match(orPrepSystemPrompt, /Brand\/system comparison/);
assert.match(orPrepSystemPrompt, /Anatomy familiarity/);
assert.match(orPrepSystemPrompt, /Do not fabricate exact proprietary implant specifications/);
assert.match(orPrepSystemPrompt, /mode:or_prep/);
assert.match(orPrepSystemPrompt, /PGY-1/);
assert.match(orPrepSystemPrompt, /room flow, landmarks, retractors/);

const quickOrPrepSystemPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'quick',
  trainingLevel: 'med_student',
});

assert.match(quickOrPrepSystemPrompt, /3-4 answer bullets/);
assert.match(quickOrPrepSystemPrompt, /Avoid implant nuance unless asked/);

const orPrepContextPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy3',
  intent: {
    mode: 'or_prep',
    subintent: 'surgical_steps',
    procedureCategory: 'fracture_orif',
    procedureOrTopic: 'tibial plateau ORIF',
    ambiguity: 'low',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    branchOptions: [],
    confidence: 0.9,
  },
  answerContext: {
    mode: 'or_prep',
    subintent: 'surgical_steps',
    procedureCategory: 'fracture_orif',
    procedureOrTopic: 'tibial plateau ORIF',
    trainingLevel: 'pgy3',
    responseDepth: 'standard',
    recentConversationSummary: '',
    certifiedContext: null,
    orPrepProcedureMetadata: {
      family: 'trauma',
      operationType: 'open',
      primaryObjective: ['reduction', 'fixation'],
      exposureComplexity: 'high',
      likelyLearnerChallenge: [
        'anatomy',
        'exposure',
        'reduction',
        'implant_strategy',
        'decision_making',
        'complication_avoidance',
      ],
    },
    oiteLearningMetadata: null,
    clinicalContext: buildBroBotClinicalContext({
      message: 'tibial plateau ORIF',
      mode: 'or_prep',
      subintent: 'surgical_steps',
      procedureCategory: 'fracture_orif',
      procedureOrTopic: 'tibial plateau ORIF',
    }),
  },
});

assert.match(orPrepContextPrompt, /Hidden OR Prep procedure metadata/);
assert.match(orPrepContextPrompt, /family: trauma/);
assert.match(orPrepContextPrompt, /primaryObjective: reduction, fixation/);
assert.match(orPrepContextPrompt, /Structured clinical context/);
assert.match(orPrepContextPrompt, /coverageRequirements: exposure_or_approach, named_anatomy/);
assert.match(orPrepContextPrompt, /exposureComplexity: high/);

const broadOitePrompt = buildBroBotChatSystemPrompt({
  mode: 'oite',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
});

assert.match(broadOitePrompt, /Tell me about SCFE/);
assert.match(broadOitePrompt, /test traps/);
assert.match(broadOitePrompt, /chief-resident OITE tutor/);
assert.match(broadOitePrompt, /Hidden OITE planning/);
assert.match(broadOitePrompt, /Core tested concept/);
assert.match(broadOitePrompt, /Stem recognition/);
assert.match(broadOitePrompt, /Distractors/);
assert.match(broadOitePrompt, /Management pivot/);
assert.match(broadOitePrompt, /OITE Learning Engine/);
assert.match(broadOitePrompt, /tested thresholds/);

const oiteContextPrompt = buildBroBotChatSystemPrompt({
  mode: 'oite',
  responseDepth: 'standard',
  trainingLevel: 'pgy3',
  intent: {
    mode: 'oite',
    subintent: 'treatment_algorithm',
    procedureCategory: 'pediatric_fracture',
    procedureOrTopic: 'SCFE OITE',
    ambiguity: 'low',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    branchOptions: [],
    confidence: 0.9,
  },
  answerContext: {
    mode: 'oite',
    subintent: 'treatment_algorithm',
    procedureCategory: 'pediatric_fracture',
    procedureOrTopic: 'SCFE OITE',
    trainingLevel: 'pgy3',
    responseDepth: 'standard',
    recentConversationSummary: '',
    certifiedContext: null,
    orPrepProcedureMetadata: null,
    oiteLearningMetadata: {
      examContext: 'oite',
      topicFamily: 'pediatrics',
      conceptType: ['classification', 'treatment_algorithm'],
      cognitiveTask: ['recall', 'pattern_recognition', 'management_decision'],
      learnerRisk: ['misses_thresholds', 'weak_algorithm'],
      yieldTier: 'classic',
    },
    clinicalContext: buildBroBotClinicalContext({
      message: 'SCFE OITE',
      mode: 'oite',
      subintent: 'treatment_algorithm',
      procedureCategory: 'pediatric_fracture',
      procedureOrTopic: 'SCFE OITE',
    }),
  },
});

assert.match(oiteContextPrompt, /Hidden OITE learning metadata/);
assert.match(oiteContextPrompt, /topicFamily: pediatrics/);
assert.match(oiteContextPrompt, /conceptType: classification, treatment_algorithm/);
assert.match(oiteContextPrompt, /yieldTier: classic/);
assert.match(oiteContextPrompt, /OITE mode response contract/);
assert.match(oiteContextPrompt, /coverageRequirements: tested_concept, stem_clues, trap_or_distractor/);

const researchPrompt = buildBroBotChatSystemPrompt({
  mode: 'research',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
});

assert.match(researchPrompt, /asks about a paper without abstract\/methods\/results/);
assert.match(researchPrompt, /critique checklist/);

const fluoroBranchPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  intent: {
    mode: 'or_prep',
    subintent: 'surgical_steps',
    procedureCategory: 'fracture_orif',
    procedureOrTopic: 'ankle ORIF',
    goal: 'Prepare for ankle ORIF.',
    ambiguity: 'moderate',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    branchOptions: [],
    answerImmediately: false,
    requiresBranchSelection: true,
    reasonForBranching: 'fracture pattern and imaging checks',
    confidence: 0.82,
  },
  selectedBranch: {
    id: 'fluoroscopy_checklist',
    label: 'Fluoroscopy Checklist',
  },
});

assert.match(fluoroBranchPrompt, /requiredFocus: Fluoroscopy Checklist/);
assert.match(fluoroBranchPrompt, /required views/);
assert.match(fluoroBranchPrompt, /what each view confirms/);
assert.match(fluoroBranchPrompt, /You must answer specifically for the selected branch/);

const implantBranchPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy3',
  intent: {
    mode: 'or_prep',
    subintent: 'implant_options',
    procedureCategory: 'fracture_orif',
    procedureOrTopic: 'distal radius ORIF',
    ambiguity: 'moderate',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    branchOptions: [],
    answerImmediately: false,
    requiresBranchSelection: true,
    reasonForBranching: 'implant choice',
    confidence: 0.82,
  },
  selectedBranch: {
    id: 'implant_options',
    label: 'Implant Options',
  },
});

assert.match(implantBranchPrompt, /tradeoffs/);
assert.match(implantBranchPrompt, /what to ask attending\/rep/);

const presentationBranchPrompt = buildBroBotChatSystemPrompt({
  mode: 'consult',
  responseDepth: 'standard',
  trainingLevel: 'pgy1',
  intent: {
    mode: 'consult',
    subintent: 'presentation_help',
    procedureCategory: 'unknown',
    procedureOrTopic: 'ankle fracture consult',
    ambiguity: 'moderate',
    assumedContext: '',
    missingContext: [],
    clarifyingQuestions: [],
    branchOptions: [],
    answerImmediately: false,
    requiresBranchSelection: true,
    reasonForBranching: 'presentation goal',
    confidence: 0.75,
  },
  selectedBranch: {
    id: 'presentation_help',
    label: 'Presentation Help',
  },
});

assert.match(presentationBranchPrompt, /one-liner/);
assert.match(presentationBranchPrompt, /question for attending/);

const classifierMessages = buildBroBotIntentClassifierMessages({
  message: 'What are the steps to do a diagnostic shoulder scope?',
  selectedMode: 'auto',
});

assert.match(classifierMessages[0]?.content ?? '', /lightweight intent classifier/);
assert.match(classifierMessages[0]?.content ?? '', /diagnostic shoulder scope/);
assert.match(classifierMessages[0]?.content ?? '', /diagnostic_sequence/);

const classifierFixture = parseBroBotIntentClassifierResponse(
  JSON.stringify({
    mode: 'or_prep',
    subintent: 'diagnostic_sequence',
    procedureOrTopic: 'diagnostic shoulder arthroscopy',
    ambiguity: 'moderate',
    assumedContext: 'I am assuming you mean the intra-articular diagnostic sequence.',
    missingContext: ['setup vs intra-articular sequence'],
    clarifyingQuestions: [
      'I mean the sequence once inside the shoulder.',
      'Walk me through portal placement.',
    ],
    confidence: 0.82,
  }),
  'auto'
);

assert.equal(classifierFixture.mode, 'or_prep');
assert.equal(classifierFixture.subintent, 'diagnostic_sequence');
assert.equal(classifierFixture.ambiguity, 'moderate');
assert.equal(classifierFixture.clarifyingQuestions.length, 2);

const legacyClassifierFixture = parseBroBotIntentClassifierResponse(
  JSON.stringify({
    mode: 'fracture_call',
    subintent: 'initial_consult',
    procedureOrTopic: 'ankle fracture consult',
    ambiguity: 'moderate',
    assumedContext: 'I am assuming an ED orthopaedic consult.',
    missingContext: ['age', 'neurovascular exam'],
    clarifyingQuestions: ['What is the neurovascular exam?'],
    confidence: 0.7,
  }),
  'auto'
);

assert.equal(legacyClassifierFixture.mode, 'consult');
assert.equal(legacyClassifierFixture.subintent, 'initial_consult');

assert.deepEqual(
  [
    fallbackBroBotIntent('diagnostic shoulder scope', 'auto'),
    fallbackBroBotIntent('diagnostic knee scope', 'auto'),
  ].map((intent) => [intent.mode, intent.subintent]),
  [
    ['or_prep', 'diagnostic_sequence'],
    ['or_prep', 'diagnostic_sequence'],
  ]
);
assert.equal(fallbackBroBotIntent('shoulder pain workup', 'auto').mode, 'clinic');
assert.equal(fallbackBroBotIntent('shoulder pain workup', 'auto').subintent, 'workup');
assert.equal(fallbackBroBotIntent('SCFE OITE', 'auto').mode, 'oite');
assert.equal(fallbackBroBotIntent('ankle fracture consult', 'auto').mode, 'consult');
assert.equal(fallbackBroBotIntent('ankle fracture consult', 'auto').subintent, 'fracture');
assert.equal(fallbackBroBotIntent('postop wound drainage THA', 'auto').mode, 'consult');
assert.equal(fallbackBroBotIntent('postop wound drainage THA', 'auto').subintent, 'postop_problem');
assert.equal(fallbackBroBotIntent('open tibia consult', 'auto').subintent, 'urgent_red_flags');
assert.equal(fallbackBroBotIntent('present this consult', 'auto').subintent, 'presentation_help');
assert.equal(fallbackBroBotIntent('ankle fracture consult', 'fracture_call').mode, 'consult');
assert.equal(fallbackBroBotIntent('critique this paper', 'auto').mode, 'research');
assert.equal(
  fallbackBroBotIntent('critique this paper', 'auto').subintent,
  'evidence_critique'
);

const parsed = parseBroBotChatResponse(
  JSON.stringify({
    answer: '## Direct Answer\nTest',
    priorityPoints: ['1', '2', '3', '4', '5', '6', '7', '8'],
    knowledgeGaps: ['1', '2', '3', '4', '5', '6'],
    suggestedQuestions: ['1', '2', '3', '4', '5', '6', '7', '7'],
    tags: ['OITE', 'SCFE'],
    detectedMode: 'oite',
    confidence: 1.4,
  })
);

assert.equal(parsed.priorityPoints.length, 6);
assert.equal(parsed.knowledgeGaps.length, 4);
assert.equal(parsed.suggestedQuestions.length, 6);
assert.deepEqual(parsed.tags, ['oite', 'scfe']);
assert.equal(parsed.confidence, 1);
assert.equal(parsed.needsClarification, false);
assert.deepEqual(parsed.clarifyingQuestions, []);
assert.equal(parsed.assumedContext, '');

const assumptionOnlyParsed = parseBroBotChatResponse(
  JSON.stringify({
    answer: '- I will frame this as adult ankle fractures for OITE and clinical decision-making.',
    priorityPoints: ['Stable versus unstable mortise drives treatment.'],
    knowledgeGaps: ['Review syndesmotic instability.'],
    suggestedQuestions: ['Stable vs unstable mortise'],
    tags: ['fracture:ankle'],
    detectedMode: 'oite',
    confidence: 0.84,
    needsClarification: true,
    clarifyingQuestions: [],
    assumedContext: 'I am assuming adult ankle fractures.',
  })
);

assert.equal(assumptionOnlyParsed.needsClarification, false);
assert.equal(assumptionOnlyParsed.assumedContext, 'I am assuming adult ankle fractures.');

const consultParsed = parseBroBotChatResponse(
  JSON.stringify({
    answer: '- **Assessment:** likely closed ankle fracture, but key context is missing.',
    priorityPoints: ['Neurovascular exam', 'Open vs closed status', 'Reduction/splinting'],
    knowledgeGaps: [
      'Age and medical comorbidities',
      'Mechanism and soft tissue status',
      'Neurovascular exam',
      'Radiographic pattern',
      'Reduction status',
    ],
    missingInformation: ['Age', 'Mechanism', 'Open/closed status', 'Neurovascular exam'],
    suggestedQuestions: ['Help me present this consult.'],
    tags: ['consult:fracture', 'concept:presentation'],
    detectedMode: 'fracture_call',
    consultConfidence: 'low',
    confidence: 0.72,
  }),
  { fallbackMode: 'fracture_call' }
);

assert.equal(consultParsed.detectedMode, 'consult');
assert.equal(consultParsed.consultConfidence, 'low');
assert.deepEqual(consultParsed.missingInformation, [
  'Age',
  'Mechanism',
  'Open/closed status',
  'Neurovascular exam',
]);
assert.equal(consultParsed.knowledgeGaps.length, 5);

const clarificationParsed = parseBroBotChatResponse(
  JSON.stringify({
    answer: '- I am assuming you want setup and portal placement.',
    priorityPoints: ['Portal placement: establish standard anterolateral viewing portal.'],
    knowledgeGaps: ['Clarify whether you mean intra-articular sequence.'],
    suggestedQuestions: ['Walk me through portal placement.'],
    clarifyingQuestions: [
      'I mean the sequence once inside the knee.',
      'Walk me through portal placement.',
      'Give me the full diagnostic checklist.',
      'Extra question should be capped.',
    ],
    assumedContext:
      'I am assuming you mean the basic OR flow including portal placement.',
    needsClarification: true,
    tags: ['mode:or_prep', 'procedure:knee_arthroscopy'],
    detectedMode: 'or_prep',
    confidence: 0.7,
  }),
  { fallbackMode: 'or_prep' }
);

assert.equal(clarificationParsed.needsClarification, true);
assert.equal(clarificationParsed.clarifyingQuestions?.length, 3);
assert.equal(
  clarificationParsed.assumedContext,
  'I am assuming you mean the basic OR flow including portal placement.'
);
assert.equal(
  clarificationParsed.suggestedQuestions[0],
  'I mean the sequence once inside the knee.'
);
assert.ok(
  clarificationParsed.suggestedQuestions.includes('Walk me through portal placement.')
);

const gardenIntent: BroBotChatIntent = {
  mode: 'oite',
  subintent: 'classification',
  procedureCategory: 'general_topic',
  procedureOrTopic: 'Garden classification',
  ambiguity: 'moderate',
  assumedContext: 'I am assuming femoral neck fractures.',
  missingContext: [],
  clarifyingQuestions: [],
  confidence: 0.8,
};

assert.equal(
  routeBroBotAnswer({
    message: 'What is the Garden classification?',
    intent: gardenIntent,
  }),
  'answer_now'
);

assert.equal(
  routeBroBotAnswer({
    message: 'What is a neutralization plate?',
    intent: {
      ...gardenIntent,
      mode: 'general',
      subintent: 'implant_options',
      procedureOrTopic: 'neutralization plate',
    },
  }),
  'answer_now'
);

assert.equal(
  routeBroBotAnswer({
    message: 'Teach me ankle fractures',
    intent: {
      ...gardenIntent,
      mode: 'oite',
      subintent: 'overview',
      procedureOrTopic: 'ankle fractures',
      ambiguity: 'moderate',
    },
  }),
  'answer_with_assumption'
);

assert.equal(
  routeBroBotAnswer({
    message: 'What should I study tonight?',
    intent: {
      ...gardenIntent,
      mode: 'general',
      subintent: 'overview',
      procedureOrTopic: '',
      ambiguity: 'high',
      branchOptions: [{ id: 'oite', label: 'OITE trauma review' }],
    },
  }),
  'ask_clarification'
);

assert.equal(
  routeBroBotAnswer({
    message: 'How do I treat this fracture?',
    intent: {
      ...gardenIntent,
      mode: 'consult',
      subintent: 'fracture',
      procedureOrTopic: 'fracture',
      ambiguity: 'moderate',
      missingContext: ['age', 'mechanism', 'open/closed status', 'neurovascular exam', 'imaging'],
    },
  }),
  'ask_clarification'
);

// Regression: "What should I study tonight?" must not fall through to a
// generic answer route just because the intent classifier guessed a filler
// topic instead of returning an empty string.
const studyTonightGenericGuesses = [
  '',
  'orthopaedic study',
  'orthopedic study',
  'orthopaedics',
  'general orthopedics',
  'study plan',
  'studying',
];

for (const guessedTopic of studyTonightGenericGuesses) {
  const route = routeBroBotAnswer({
    message: 'What should I study tonight?',
    intent: {
      ...gardenIntent,
      mode: 'general',
      subintent: 'overview',
      procedureOrTopic: guessedTopic,
      ambiguity: 'high',
    },
  });
  assert.ok(
    route === 'ask_clarification' || route === 'offer_branches',
    `expected ask_clarification or offer_branches for guessed topic "${guessedTopic}", got ${route}`
  );
  assert.notEqual(route, 'answer_with_assumption');
  assert.notEqual(route, 'answer_now');
}

// A genuinely actionable topic on the same study-planning phrasing should
// still be allowed to offer branches instead of asking to clarify.
assert.equal(
  routeBroBotAnswer({
    message: 'What should I study tonight?',
    intent: {
      ...gardenIntent,
      mode: 'general',
      subintent: 'overview',
      procedureOrTopic: 'distal radius ORIF',
      ambiguity: 'high',
    },
  }),
  'offer_branches'
);

const studyTonightQuestions = buildBroBotRouteClarifyingQuestions({
  message: 'What should I study tonight?',
  intent: {
    ...gardenIntent,
    mode: 'general',
    subintent: 'overview',
    procedureOrTopic: 'orthopaedic study',
    ambiguity: 'high',
  },
  answerRoute: 'ask_clarification',
});
assert.ok(studyTonightQuestions.length >= 2);
assert.ok(studyTonightQuestions.some((q) => /rotation|case list/i.test(q)));
assert.ok(studyTonightQuestions.some((q) => /oite|clinic prep|consult prep|or prep/i.test(q)));

// Regression: ask_clarification answers must be short, both via the
// prompt-instructed contract and the deterministic server-side backstop.
const longGenericAnswer =
  'To determine the appropriate treatment for a fracture, consider the following factors. ' +
  'Fracture type and classification guide treatment options, and location and displacement ' +
  'affect surgical versus non-surgical decisions. Patient age and health status can alter the ' +
  'management approach, and the presence of complications like an open fracture or ' +
  'neurovascular injury requires urgent attention. For example, a displaced femoral neck ' +
  'fracture in an elderly patient may require surgical intervention, while a non-displaced ' +
  'distal radius fracture in a young patient might be managed conservatively.';

assert.ok(longGenericAnswer.length > CLARIFICATION_ANSWER_MAX_LENGTH);

const shortenedAnswer = enforceClarificationAnswerBrevity(longGenericAnswer);
assert.ok(shortenedAnswer.length <= CLARIFICATION_ANSWER_MAX_LENGTH);
assert.notEqual(shortenedAnswer, longGenericAnswer);

const briefFramingLine = 'I need a bit more detail before giving a full answer.';
assert.equal(enforceClarificationAnswerBrevity(briefFramingLine), briefFramingLine);

const tooLongClarificationGate = runBroBotQualityGate({
  answer: longGenericAnswer,
  mode: 'consult',
  responseDepth: 'standard',
  subintent: 'fracture',
  answerRoute: 'ask_clarification',
});
assert.ok(tooLongClarificationGate.warnings.includes('ask_clarification_answer_too_long'));

const shortClarificationGate = runBroBotQualityGate({
  answer: briefFramingLine,
  mode: 'consult',
  responseDepth: 'standard',
  subintent: 'fracture',
  answerRoute: 'ask_clarification',
});
assert.deepEqual(shortClarificationGate.warnings, []);

// The clarification-route quality gate should only ever check brevity, not
// the richness heuristics (pearls, decision signals, etc.) that apply to a
// full answer — those would misfire against an intentionally short framing
// line.
const veryShallowClarificationAnswer = 'Quick clarifying question first.';
const shallowClarificationGate = runBroBotQualityGate({
  answer: veryShallowClarificationAnswer,
  mode: 'oite',
  responseDepth: 'standard',
  subintent: 'treatment_algorithm',
  procedureOrTopic: 'femoral shaft fracture',
  answerRoute: 'ask_clarification',
});
assert.deepEqual(shallowClarificationGate.warnings, []);

// Regression: if the separate metadata pass fails (network error, bad
// completion, etc.), route.ts keeps a metadataOutput fallback built purely
// from the already-generated answer pass, then still calls
// parseBroBotMetadataResponse-shaped fallbacks when parsing garbage. Both
// paths must yield a well-formed, non-empty-where-possible result so the
// user's answer is never blocked by a metadata failure.
const answerPassDerivedFallback = {
  suggestedQuestions: ['What imaging findings and reduction status do you have?'],
  nextLearningBranches: [{ id: 'garden_classification', label: 'Garden classification' }],
  tags: ['procedure:femoral_neck_fracture'],
};
assert.ok(Array.isArray(answerPassDerivedFallback.suggestedQuestions));
assert.ok(Array.isArray(answerPassDerivedFallback.nextLearningBranches));
assert.ok(Array.isArray(answerPassDerivedFallback.tags));
assert.ok(answerPassDerivedFallback.suggestedQuestions.length > 0);

const metadataFromGarbageRaw = parseBroBotMetadataResponse({
  raw: 'not valid json at all',
  fallbackMode: 'general',
  fallbackSuggestedQuestions: answerPassDerivedFallback.suggestedQuestions,
  fallbackNextLearningBranches: answerPassDerivedFallback.nextLearningBranches,
  fallbackTags: answerPassDerivedFallback.tags,
});
assert.deepEqual(metadataFromGarbageRaw.suggestedQuestions, answerPassDerivedFallback.suggestedQuestions);
assert.deepEqual(metadataFromGarbageRaw.tags, answerPassDerivedFallback.tags);
assert.ok(metadataFromGarbageRaw.nextLearningBranches.length > 0);

const routeFixtures: Array<{ message: string; intent: BroBotChatIntent }> = [
  { message: 'What is the Garden classification?', intent: gardenIntent },
  {
    message: 'What is a neutralization plate?',
    intent: { ...gardenIntent, mode: 'general', subintent: 'implant_options', procedureOrTopic: 'neutralization plate' },
  },
  {
    message: 'What is the blood supply of the talus?',
    intent: { ...gardenIntent, mode: 'general', subintent: 'anatomy_at_risk', procedureOrTopic: 'talus blood supply' },
  },
  {
    message: 'Teach me ankle fractures',
    intent: { ...gardenIntent, subintent: 'overview', procedureOrTopic: 'ankle fractures', ambiguity: 'moderate' },
  },
  {
    message: 'Distal radius ORIF pearls',
    intent: { ...gardenIntent, mode: 'or_prep', subintent: 'overview', procedureOrTopic: 'distal radius ORIF', ambiguity: 'moderate' },
  },
  {
    message: 'What should I study tonight?',
    intent: { ...gardenIntent, mode: 'general', subintent: 'overview', procedureOrTopic: '', ambiguity: 'high' },
  },
];

const clarificationRate =
  routeFixtures.filter((fixture) =>
    routeBroBotAnswer({ message: fixture.message, intent: fixture.intent }) === 'ask_clarification'
  ).length / routeFixtures.length;

assert.ok(clarificationRate < 0.5);

const aclChips = selectSmartChips({
  message: 'Explain ACL reconstruction',
  subintent: 'surgical_steps',
  procedureOrTopic: 'ACL reconstruction',
});
assert.deepEqual(
  aclChips?.slice(0, 5).map((chip) => chip.label),
  [
    'Femoral tunnel placement pitfalls',
    'BTB vs quad vs hamstring graft',
    'Pivot shift and rotational instability',
    'Meniscus/root lesions that change the plan',
    'OITE graft-choice traps',
  ]
);

const distalRadiusChips = selectSmartChips({
  message: 'Distal radius ORIF pearls',
  subintent: 'overview',
  procedureOrTopic: 'distal radius ORIF',
});
assert.deepEqual(
  distalRadiusChips?.slice(0, 5).map((chip) => chip.label),
  [
    'Volar FCR approach anatomy',
    'Avoid dorsal screw penetration',
    'When CT changes the plan',
    'What makes it unstable',
    'Volar plate positioning pitfalls',
  ]
);

const fenced = parseBroBotChatResponse(
  '```json\n' +
    JSON.stringify({
      answer: '- **FCR approach:** identify FCR and protect radial artery.',
      priorityPoints: ['**FCR interval:** stay radial to FCR.', 'Fluoro checks: verify screws.'],
      knowledgeGaps: ['Confirm implant system.'],
      suggestedQuestions: ['Walk me through the incision and interval.'],
      tags: ['mode:or_prep'],
      detectedMode: 'or_prep',
      confidence: 0.9,
    }) +
    '\n```',
  { fallbackMode: 'or_prep' }
);

assert.match(fenced.answer, /FCR approach/);
assert.deepEqual(fenced.priorityPoints, [
  'FCR interval: stay radial to FCR.',
  'Fluoro checks: verify screws.',
]);
assert.equal(fenced.detectedMode, 'or_prep');

const synthesized = parseBroBotChatResponse(
  JSON.stringify({
    priorityPoints: [
      'A1 pulley localization: usually near the distal palmar crease/metacarpal head region.',
      'Digital neurovascular bundles: stay midline and avoid drifting radial/ulnar.',
      'Complete release: visualize tendon glide before closure.',
    ],
    knowledgeGaps: ['Ask whether the attending prefers longitudinal vs transverse incision.'],
    suggestedQuestions: ['What structures are most at risk?'],
    tags: ['mode:or_prep', 'concept:landmarks'],
    detectedMode: 'or_prep',
    confidence: 0.7,
  }),
  {
    fallbackMode: 'or_prep',
    fallbackAnswer: 'BroBot could not format a structured response. Please try again.',
  }
);

assert.doesNotMatch(synthesized.answer, /could not format/i);
assert.match(synthesized.answer, /A1 pulley localization/);
assert.match(synthesized.answer, /Digital neurovascular bundles/);

const vagueOrPrep = parseBroBotChatResponse(
  JSON.stringify({
    answer: '- Get oriented before incision.',
    priorityPoints: [
      'Anatomy familiarity',
      'FCR interval: stay radial to FCR and protect radial artery.',
      'Complications awareness',
    ],
    knowledgeGaps: ['Confirm implant system and backup fixation.'],
    suggestedQuestions: ['What are the common intraoperative mistakes?'],
    tags: ['mode:or_prep'],
    detectedMode: 'or_prep',
    confidence: 0.8,
  })
);

assert.deepEqual(vagueOrPrep.priorityPoints, [
  'FCR interval: stay radial to FCR and protect radial artery.',
]);

const plateauMetadata = buildOrPrepProcedureMetadata({
  mode: 'or_prep',
  subintent: 'surgical_steps',
  procedureCategory: 'fracture_orif',
  procedureOrTopic: 'tibial plateau ORIF',
  ambiguity: 'low',
  assumedContext: '',
  missingContext: [],
  clarifyingQuestions: [],
  confidence: 0.9,
});

assert.equal(plateauMetadata?.family, 'trauma');
assert.equal(plateauMetadata?.operationType, 'open');
assert.deepEqual(plateauMetadata?.primaryObjective, ['reduction', 'fixation']);
assert.equal(plateauMetadata?.exposureComplexity, 'high');
assert.ok(plateauMetadata?.likelyLearnerChallenge.includes('decision_making'));

const genericChronologyGate = runBroBotQualityGate({
  mode: 'or_prep',
  responseDepth: 'standard',
  answer: [
    '- Make an incision.',
    '- Then dissect down.',
    '- Next place the implant.',
    '- Then irrigate.',
    '- Close the wound.',
  ].join('\n'),
});

assert.ok(genericChronologyGate.warnings.includes('or_prep_exposure_terms_missing'));
assert.ok(genericChronologyGate.warnings.includes('or_prep_named_anatomy_missing'));
assert.ok(genericChronologyGate.warnings.includes('or_prep_decision_point_missing'));
assert.ok(genericChronologyGate.warnings.includes('or_prep_pitfall_bailout_missing'));
assert.ok(genericChronologyGate.warnings.includes('or_prep_learner_level_signal_missing'));
assert.ok(genericChronologyGate.warnings.includes('or_prep_generic_chronology_dominant'));

const strongOrPrepGate = runBroBotQualityGate({
  mode: 'or_prep',
  responseDepth: 'standard',
  answer: [
    '- Objective: restore joint line and stable fixation.',
    '- Exposure: use landmarks to plan the incision and improve visualization with safe retractors.',
    '- Anatomy at risk: protect the peroneal nerve and anterior tibial vessels during exposure.',
    '- Key decisions/checks: confirm reduction and implant position on fluoro before final fixation.',
    '- Pitfalls/Bailout: if visualization is poor, extend exposure safely rather than levering blindly.',
    '- Attending expectation: ask about approach and backup fixation before scrub.',
  ].join('\n'),
});

assert.doesNotMatch(
  strongOrPrepGate.warnings.join(','),
  /or_prep_(exposure_terms|named_anatomy|decision_point|pitfall_bailout|learner_level_signal|generic_chronology)/
);

const scfeOiteMetadata = buildOiteLearningMetadata({
  mode: 'oite',
  subintent: 'treatment_algorithm',
  procedureCategory: 'pediatric_fracture',
  procedureOrTopic: 'SCFE OITE treatment algorithm',
  ambiguity: 'low',
  assumedContext: '',
  missingContext: [],
  clarifyingQuestions: [],
  confidence: 0.9,
});

assert.equal(scfeOiteMetadata?.examContext, 'oite');
assert.equal(scfeOiteMetadata?.topicFamily, 'pediatrics');
assert.ok(scfeOiteMetadata?.conceptType.includes('treatment_algorithm'));
assert.ok(scfeOiteMetadata?.cognitiveTask.includes('management_decision'));
assert.ok(scfeOiteMetadata?.learnerRisk.includes('weak_algorithm'));
assert.equal(scfeOiteMetadata?.yieldTier, 'classic');

const genericOiteGate = runBroBotQualityGate({
  mode: 'oite',
  responseDepth: 'standard',
  answer: '- SCFE is a hip disorder in adolescents.\n- Know the basics and review the topic.',
});

assert.ok(genericOiteGate.warnings.includes('oite_trap_missing'));
assert.ok(genericOiteGate.warnings.includes('oite_comparison_missing'));
assert.ok(genericOiteGate.warnings.includes('oite_algorithm_missing'));
assert.ok(genericOiteGate.warnings.includes('oite_board_pearl_missing'));
assert.ok(genericOiteGate.warnings.includes('oite_test_taking_signal_missing'));
assert.ok(genericOiteGate.warnings.includes('oite_memory_hook_missing'));

const strongOiteGate = runBroBotQualityGate({
  mode: 'oite',
  responseDepth: 'standard',
  answer: [
    '- Direct answer: the classic OITE stem clue is adolescent hip or knee pain with a slipped capital femoral epiphysis.',
    '- Core framework: classify stable versus unstable because that treatment threshold changes management.',
    '- Compare: distinguish SCFE versus Perthes by age, body habitus, and radiograph pattern.',
    '- Exam pearl: boards test AVN risk and in-situ pinning as the management pivot.',
    '- Common trap: do not choose forced reduction; eliminate that wrong answer choice.',
    '- Memory hook: stable can stand, unstable cannot walk.',
  ].join('\n'),
});

assert.doesNotMatch(
  strongOiteGate.warnings.join(','),
  /oite_(trap|comparison|algorithm|board_pearl|test_taking|memory_hook)/
);

const facetGenericOrPrepGate = runBroBotQualityGate({
  answer:
    '- Understand the anatomy and patient-specific factors.\n- Know the complications and use appropriate imaging.\n- Discuss the plan with the attending.',
  mode: 'or_prep',
  responseDepth: 'standard',
  subintent: 'surgical_steps',
  procedureOrTopic: 'distal radius ORIF',
  clinicalContext: distalRadiusClinicalContext,
});

assert.ok(facetGenericOrPrepGate.warnings.includes('facet_or_prep_exposure_missing'));
assert.ok(facetGenericOrPrepGate.warnings.includes('facet_named_anatomy_missing'));
assert.ok(facetGenericOrPrepGate.warnings.includes('answer_too_generic_for_known_topic'));

const facetGenericOiteGate = runBroBotQualityGate({
  answer:
    '- Review the classification and treatment options.\n- This is a common board topic.\n- Remember the key facts.',
  mode: 'oite',
  responseDepth: 'standard',
  subintent: 'overview',
  procedureOrTopic: 'SCFE',
  clinicalContext: scfeClinicalContext,
});

assert.ok(facetGenericOiteGate.warnings.includes('facet_oite_trap_distractor_missing'));

const facetGenericConsultGate = runBroBotQualityGate({
  answer:
    '- Get imaging and examine the patient.\n- Consider treatment based on patient factors.\n- Discuss with the senior.',
  mode: 'consult',
  responseDepth: 'standard',
  subintent: 'fracture',
  procedureOrTopic: 'ankle fracture',
  clinicalContext: ankleConsultClinicalContext,
});

assert.ok(facetGenericConsultGate.warnings.includes('facet_consult_red_flags_missing'));
assert.ok(facetGenericConsultGate.warnings.includes('facet_consult_disposition_missing'));

const facetGenericClinicGate = runBroBotQualityGate({
  answer:
    '- Start with history and imaging.\n- Try treatment based on patient factors.\n- Escalate if symptoms persist.',
  mode: 'clinic',
  responseDepth: 'standard',
  subintent: 'workup',
  procedureOrTopic: 'shoulder pain',
  clinicalContext: shoulderClinicClinicalContext,
});

assert.ok(facetGenericClinicGate.warnings.includes('facet_clinic_differential_missing'));

const weakAnatomyGate = runBroBotQualityGate({
  mode: 'general',
  responseDepth: 'standard',
  subintent: 'anatomy_at_risk',
  answer: '- The nerve is important and should be protected.',
});

assert.ok(weakAnatomyGate.warnings.includes('anatomy_surgical_relevance_weak'));

const strongAnatomyGate = runBroBotQualityGate({
  mode: 'general',
  responseDepth: 'standard',
  subintent: 'anatomy_at_risk',
  answer: [
    '- Course: the palmar cutaneous branch leaves the median nerve proximal to the wrist crease.',
    '- Danger zone: it crosses superficial to the transverse carpal ligament region and can be injured with ulnar/radial incision drift.',
    '- Surgical relevance: injury causes painful palmar numbness after carpal tunnel release.',
    '- Memory hook: palm sensation is spared in carpal tunnel syndrome but at risk during the incision.',
  ].join('\n'),
});

assert.doesNotMatch(strongAnatomyGate.warnings.join(','), /anatomy_surgical_relevance_weak/);

const cleaned = parseBroBotChatResponse(
  JSON.stringify({
    answer: 'Here are the key points:\n- **Stable SCFE:** pin in situ.\n- **Unstable SCFE:** higher AVN risk.',
    priorityPoints: [
      'Certainly, classification drives treatment.',
      'Classification drives treatment.',
    ],
    knowledgeGaps: ['Here is a concise overview: compare stable vs unstable SCFE.'],
    suggestedQuestions: ['Quiz me on SCFE traps', 'Quiz me on SCFE traps'],
    tags: ['OITE'],
    detectedMode: 'oite',
    confidence: 0.8,
  })
);

assert.doesNotMatch(cleaned.answer, /^Here are the key points/i);
assert.equal(cleaned.priorityPoints.length, 1);
assert.equal(cleaned.suggestedQuestions.length, 1);

const parsedResearch = parseBroBotChatResponse(
  JSON.stringify({
    answer: 'Best citation: no verified citation was retrieved.',
    priorityPoints: ['Direct claim support matters.'],
    knowledgeGaps: ['Need a narrower claim.'],
    suggestedQuestions: ['Find a narrower citation.'],
    tags: ['research'],
    detectedMode: 'research',
    researchSubmode: 'reference_finder',
    confidence: 0.8,
  }),
  { fallbackMode: 'research' }
);

assert.equal(parsedResearch.researchSubmode, 'reference_finder');

const fallback = parseBroBotChatResponse('plain non-json answer', { fallbackMode: 'general' });

assert.equal(fallback.answer, 'plain non-json answer');
assert.equal(fallback.detectedMode, 'general');
assert.equal(fallback.confidence, 0.25);

const proseFallback = parseBroBotChatResponse(
  'Use a midline incision, identify the A1 pulley, and stay central to protect the digital neurovascular bundles.',
  { fallbackMode: 'or_prep' }
);

assert.match(proseFallback.answer, /A1 pulley/);
assert.equal(proseFallback.detectedMode, 'or_prep');

const jsonFallback = parseBroBotChatResponse('```json\n{\"answer\":\"oops\"', {
  fallbackMode: 'general',
});

assert.match(jsonFallback.answer, /could not be structured cleanly/);

// --- P0 conversation memory tests ---

const baseConsultIntent: BroBotChatIntent = {
  mode: 'consult',
  subintent: 'fracture',
  procedureCategory: 'fracture_orif',
  procedureOrTopic: 'intertrochanteric fracture fixation',
  ambiguity: 'low',
  assumedContext: '',
  missingContext: [],
  clarifyingQuestions: [],
  branchOptions: [],
  confidence: 0.8,
};

// Case 1 — pronoun resolution: "How do I test for it?" after compartment syndrome.
const compartmentSyndromeHistoryMessages = buildBroBotIntentExpansionMessages({
  message: 'How do I test for it?',
  selectedMode: 'auto',
  history: [
    { role: 'user', content: 'Explain compartment syndrome.' },
    { role: 'assistant', content: 'Compartment syndrome is an emergency...' },
  ],
});

assert.match(
  compartmentSyndromeHistoryMessages[0]?.content ?? '',
  /Continuity rule: this is a continuing conversation/
);
assert.ok(
  compartmentSyndromeHistoryMessages.some((message) =>
    message.content.includes('Recent conversation context')
  ),
  'expansion messages should include recent conversation context when history is present'
);
assert.ok(
  compartmentSyndromeHistoryMessages.some((message) =>
    message.content.includes('Explain compartment syndrome.')
  ),
  'prior user turn should be present in the expansion prompt'
);

// Case 2 — fracture-pattern follow-up: no history present should not trigger the continuity block.
const noHistoryMessages = buildBroBotIntentExpansionMessages({
  message: 'What if it is reverse obliquity?',
  selectedMode: 'auto',
});

assert.doesNotMatch(
  noHistoryMessages[0]?.content ?? '',
  /Continuity rule: this is a continuing conversation/
);

async function runAsyncAnswerContextTests() {
  // Case 3 — recentConversationSummary should reach the answer-model system prompt.
  const continuityAnswerContext = await buildBroBotAnswerContext({
    intent: baseConsultIntent,
    trainingLevel: 'pgy2',
    responseDepth: 'standard',
    history: [
      { role: 'user', content: 'How do you fix an intertrochanteric fracture?' },
      { role: 'assistant', content: 'Use a cephalomedullary nail for most patterns...' },
    ],
  });

  const continuityAnswerPrompt = buildBroBotChatSystemPrompt({
    mode: 'consult',
    responseDepth: 'standard',
    trainingLevel: 'pgy2',
    intent: baseConsultIntent,
    answerContext: continuityAnswerContext,
  });

  assert.match(continuityAnswerPrompt, /Recent conversation context/);
  assert.match(continuityAnswerPrompt, /intertrochanteric fracture/);
  assert.match(
    continuityAnswerPrompt,
    /Continue the existing conversation when appropriate\. Resolve pronouns/
  );

  // Case 4 — new topic override: no prior history means no stale conversation block leaks in.
  const freshTopicAnswerContext = await buildBroBotAnswerContext({
    intent: { ...baseConsultIntent, procedureOrTopic: 'scaphoid fractures' },
    trainingLevel: 'pgy2',
    responseDepth: 'standard',
    history: [],
  });

  const freshTopicPrompt = buildBroBotChatSystemPrompt({
    mode: 'consult',
    responseDepth: 'standard',
    trainingLevel: 'pgy2',
    intent: { ...baseConsultIntent, procedureOrTopic: 'scaphoid fractures' },
    answerContext: freshTopicAnswerContext,
  });

  assert.doesNotMatch(freshTopicPrompt, /Recent conversation context/);
  assert.match(freshTopicPrompt, /scaphoid fractures/);

  console.log('BroBot chat prompt/parser tests passed');
}

// --- P1 entity-injection + level + quality-gate tests ---

const approachIntent: BroBotChatIntent = {
  mode: 'or_prep',
  subintent: 'surgical_approach',
  procedureCategory: 'fracture_orif',
  procedureOrTopic: 'proximal humerus',
  ambiguity: 'low',
  assumedContext: '',
  missingContext: [],
  clarifyingQuestions: [],
  branchOptions: [],
  confidence: 0.85,
};

const approachPrompt = buildBroBotChatSystemPrompt({
  mode: 'or_prep',
  responseDepth: 'standard',
  trainingLevel: 'pgy3',
  intent: approachIntent,
});

// 1. Prompt includes the detected-topic anchor.
assert.match(approachPrompt, /Detected ortho topic: proximal humerus\./);
assert.match(approachPrompt, /Stay anchored to this topic/);

// 2. Curated surgical-approach prompt is told to avoid generic answers and anchor to the topic.
assert.match(approachPrompt, /Do not answer generically\./);
assert.match(approachPrompt, /Anchor every point to proximal humerus/);
assert.match(approachPrompt, /say so explicitly rather than giving a generic placeholder/);

// Non-entity topic should not inject an anchor block.
const noEntityPrompt = buildBroBotChatSystemPrompt({
  mode: 'general',
  responseDepth: 'standard',
  trainingLevel: 'pgy2',
  intent: { ...approachIntent, mode: 'general', subintent: 'overview', procedureOrTopic: 'tell me something' },
});
assert.doesNotMatch(noEntityPrompt, /Detected ortho topic:/);

// 3. entity_not_named fires for a generic proximal humerus approach answer.
const genericApproachGate = runBroBotQualityGate({
  mode: 'or_prep',
  responseDepth: 'standard',
  subintent: 'surgical_approach',
  procedureOrTopic: 'proximal humerus',
  answer:
    '- The procedure requires careful exposure and soft-tissue handling, with attention to the overall objective and a tidy closure that protects the wound for a good recovery overall.',
});
assert.ok(genericApproachGate.warnings.includes('entity_not_named'));

// 4. A strong proximal humerus approach answer passes the entity check.
const strongApproachGate = runBroBotQualityGate({
  mode: 'or_prep',
  responseDepth: 'standard',
  subintent: 'surgical_approach',
  procedureOrTopic: 'proximal humerus',
  answer: [
    '- Positioning: beach chair; use the deltopectoral interval between deltoid and pectoralis major.',
    '- Protect the axillary nerve at the inferior border; identify the cephalic vein and greater tuberosity.',
    '- Internervous plane exposure; extend distally for fixation if needed.',
  ].join('\n'),
});
assert.ok(!strongApproachGate.warnings.includes('entity_not_named'));

// 5. Senior-level answer with no judgment/tradeoff/bailout language warns.
const seniorNoJudgmentGate = runBroBotQualityGate({
  mode: 'general',
  responseDepth: 'standard',
  trainingLevel: 'pgy5',
  answer:
    '- The deltopectoral approach uses the interval between deltoid and pectoralis major; the axillary nerve runs at the inferior border and the greater tuberosity is a key bony surface to recognize.',
});
assert.ok(seniorNoJudgmentGate.warnings.includes('level_senior_judgment_missing'));

// 6. Junior-level answer with no orientation/landmark/next-step language warns.
const juniorNoOrientationGate = runBroBotQualityGate({
  mode: 'general',
  responseDepth: 'standard',
  trainingLevel: 'pgy1',
  answer:
    '- The tradeoff between alternatives depends on the controversy and the evidence; a nuanced synthesis weighing bailout options and operative judgment is what ultimately drives the decision here.',
});
assert.ok(juniorNoOrientationGate.warnings.includes('level_junior_orientation_missing'));

// Level checks are no-ops when trainingLevel is omitted (backward compatible).
const noLevelGate = runBroBotQualityGate({
  mode: 'general',
  responseDepth: 'standard',
  answer: 'A short answer with no level signals at all and nothing in particular to note here today.',
});
assert.ok(!noLevelGate.warnings.includes('level_senior_judgment_missing'));
assert.ok(!noLevelGate.warnings.includes('level_junior_orientation_missing'));

console.log('BroBot P1 entity/level/quality-gate tests passed');

runAsyncAnswerContextTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
