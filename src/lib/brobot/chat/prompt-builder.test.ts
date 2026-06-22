import assert from 'node:assert/strict';

import { buildBroBotChatMessages, buildBroBotChatSystemPrompt } from './prompt-builder';
import { buildOiteLearningMetadata } from './oite-context';
import { buildOrPrepProcedureMetadata } from './or-prep-context';
import { runBroBotQualityGate } from './quality-gate';
import {
  buildBroBotIntentClassifierMessages,
  fallbackBroBotIntent,
  parseBroBotIntentClassifierResponse,
} from './intent-classifier';
import { parseBroBotChatResponse } from './response-parser';
import type { BroBotChatMode } from './types';

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
  },
});

assert.match(orPrepContextPrompt, /Hidden OR Prep procedure metadata/);
assert.match(orPrepContextPrompt, /family: trauma/);
assert.match(orPrepContextPrompt, /primaryObjective: reduction, fixation/);
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
  },
});

assert.match(oiteContextPrompt, /Hidden OITE learning metadata/);
assert.match(oiteContextPrompt, /topicFamily: pediatrics/);
assert.match(oiteContextPrompt, /conceptType: classification, treatment_algorithm/);
assert.match(oiteContextPrompt, /yieldTier: classic/);

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

const strongOiteGate = runBroBotQualityGate({
  mode: 'oite',
  responseDepth: 'standard',
  answer: [
    '- Direct answer: the classic OITE stem clue is adolescent hip or knee pain with a slipped capital femoral epiphysis.',
    '- Core framework: classify stable versus unstable because that treatment threshold changes management.',
    '- Compare: distinguish SCFE versus Perthes by age, body habitus, and radiograph pattern.',
    '- Exam pearl: boards test AVN risk and in-situ pinning as the management pivot.',
    '- Common trap: do not choose forced reduction; eliminate that wrong answer choice.',
  ].join('\n'),
});

assert.doesNotMatch(
  strongOiteGate.warnings.join(','),
  /oite_(trap|comparison|algorithm|board_pearl|test_taking)/
);

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

console.log('BroBot chat prompt/parser tests passed');
