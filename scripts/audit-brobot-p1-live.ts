import fs from 'node:fs';
import path from 'node:path';

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
}

loadDotEnvLocal();

const [openaiModule, chat, contextBuilder, modelConfig] = await Promise.all([
  import('openai'),
  import('../src/lib/brobot/chat/index.ts'),
  import('../src/lib/brobot/chat/context-builder.ts'),
  import('../src/lib/brobot/model-config.ts'),
]);

const OpenAI = openaiModule.default;

type Fixture = {
  id: string;
  prompt: string;
  mode: chat.BroBotChatMode;
  trainingLevel: chat.BroBotTrainingLevel;
  responseDepth: chat.BroBotResponseDepth;
  // Optional: force a subintent to simulate classifier output for exempt subintents
  forceSubintent?: chat.BroBotChatSubintent;
};

// P1 audit fixtures: same OR/consult/general as P0, plus targeted OITE quiz/anatomy,
// clinic indications, and classification to exercise the new subintent-conditional gates.
const fixtures: Fixture[] = [
  // OR prep (5) — should retain strong revision gate
  { id: 'or-01', prompt: 'Distal radius ORIF tomorrow. What do I need to know?', mode: 'or_prep', trainingLevel: 'pgy2', responseDepth: 'standard' },
  { id: 'or-02', prompt: 'Trigger finger release steps', mode: 'or_prep', trainingLevel: 'pgy1', responseDepth: 'quick' },
  { id: 'or-03', prompt: 'Reverse TSA key surgical techniques', mode: 'or_prep', trainingLevel: 'pgy4', responseDepth: 'deep' },
  { id: 'or-04', prompt: 'How do I confirm carpal tunnel release is complete?', mode: 'or_prep', trainingLevel: 'pgy1', responseDepth: 'standard' },
  { id: 'or-05', prompt: 'Intertroch nail start point', mode: 'or_prep', trainingLevel: 'pgy2', responseDepth: 'standard' },

  // OITE standard (3) — board framing expected, full contract
  { id: 'oite-01', prompt: 'SCFE OITE points', mode: 'oite', trainingLevel: 'pgy2', responseDepth: 'standard' },
  { id: 'oite-02', prompt: 'Femoral shaft fracture OITE traps', mode: 'oite', trainingLevel: 'pgy3', responseDepth: 'standard' },
  { id: 'oite-03', prompt: 'Flexion extension gap imbalance questions', mode: 'oite', trainingLevel: 'pgy3', responseDepth: 'standard' },

  // OITE quiz subintent (3) — lightweight contract, quiz should NOT trigger heavy revision
  { id: 'oite-quiz-01', prompt: 'Quiz me on THA must-see anatomy', mode: 'oite', trainingLevel: 'med_student', responseDepth: 'quick', forceSubintent: 'quiz' },
  { id: 'oite-quiz-02', prompt: 'Give me 3 OITE questions on ankle fractures', mode: 'oite', trainingLevel: 'pgy2', responseDepth: 'standard', forceSubintent: 'quiz' },
  { id: 'oite-def-01', prompt: 'What is the Garden classification?', mode: 'oite', trainingLevel: 'pgy2', responseDepth: 'standard', forceSubintent: 'classification' },

  // OITE anatomy at risk subintent (2) — factual recall, lightweight contract
  { id: 'oite-anat-01', prompt: 'What nerves are at risk in carpal tunnel release?', mode: 'oite', trainingLevel: 'pgy1', responseDepth: 'quick', forceSubintent: 'anatomy_at_risk' },
  { id: 'oite-anat-02', prompt: 'FDP and FDS anatomy facts I need to know', mode: 'oite', trainingLevel: 'pgy2', responseDepth: 'standard', forceSubintent: 'anatomy_at_risk' },

  // Consult (5)
  { id: 'consult-01', prompt: 'Ankle fracture consult. How should I think about it?', mode: 'consult', trainingLevel: 'pgy1', responseDepth: 'standard' },
  { id: 'consult-02', prompt: 'Treatment options for PJI', mode: 'consult', trainingLevel: 'pgy2', responseDepth: 'standard' },
  { id: 'consult-03', prompt: 'Open tibia in ED', mode: 'consult', trainingLevel: 'pgy1', responseDepth: 'quick' },
  { id: 'consult-04', prompt: 'Painful TKA consult', mode: 'consult', trainingLevel: 'pgy2', responseDepth: 'standard' },
  { id: 'consult-05', prompt: 'How should I present a distal radius fracture consult?', mode: 'consult', trainingLevel: 'pgy1', responseDepth: 'standard' },

  // Clinic general (2)
  { id: 'clinic-01', prompt: 'Shoulder pain workup', mode: 'clinic', trainingLevel: 'med_student', responseDepth: 'standard' },
  { id: 'clinic-03', prompt: 'Differential diagnosis of hand infections', mode: 'clinic', trainingLevel: 'pgy1', responseDepth: 'quick' },

  // Clinic with partial-contract subintents (2) — indications/classification get 2-group contract
  { id: 'clinic-ind-01', prompt: 'Indications for ACL reconstruction', mode: 'clinic', trainingLevel: 'pgy2', responseDepth: 'standard', forceSubintent: 'indications' },
  { id: 'clinic-cls-01', prompt: 'Weber ankle fracture classification', mode: 'clinic', trainingLevel: 'pgy2', responseDepth: 'standard', forceSubintent: 'classification' },

  // General (2)
  { id: 'general-01', prompt: 'What is a neutralization plate?', mode: 'general', trainingLevel: 'pgy2', responseDepth: 'standard' },
  { id: 'general-02', prompt: 'Tibial nail insertion techniques overview', mode: 'general', trainingLevel: 'pgy2', responseDepth: 'standard' },
];

function compactText(value: string, max = 220) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= max ? compact : `${compact.slice(0, max).trim()}...`;
}

function includesAny(value: string, terms: string[]) {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function scoreAnswer(params: {
  fixture: Fixture;
  output: chat.BroBotChatOutput;
  qualityGateWarnings: string[];
}) {
  const answer = params.output.answer.toLowerCase();
  const chips = (params.output.nextLearningBranches ?? []).map((chip) => chip.label).join(' ').toLowerCase();
  const mode = params.fixture.mode;
  let specificity = 3;
  let modeFit = params.output.detectedMode === mode || (mode === 'consult' && params.output.detectedMode === 'fracture_call') ? 4 : 2;
  let testRelevance = mode === 'oite' ? 2 : 3;
  let surgicalUsefulness = mode === 'or_prep' ? 2 : 3;
  let lengthControl = params.output.answer.length <= 1350 ? 4 : params.output.answer.length <= 1800 ? 3 : 2;
  let chipQuality = 3;

  if (includesAny(answer, ['approach', 'exposure', 'classification', 'threshold', 'red flag', 'differential', 'nerve', 'vessel', 'implant', 'stability'])) {
    specificity += 1;
  }
  if (includesAny(answer, ['pitfall', 'trap', 'distractor', 'bailout', 'avoid', 'attending', 'senior'])) {
    specificity += 1;
  }
  if (params.qualityGateWarnings.some((warning) => warning.includes('generic') || warning.includes('missing'))) {
    specificity -= 1;
  }
  if (mode === 'oite' && includesAny(answer, ['trap', 'distractor', 'wrong answer', 'stem', 'tested', 'classic', 'threshold'])) {
    testRelevance = 4;
  }
  if (mode === 'or_prep' && includesAny(answer, ['approach', 'exposure', 'anatomy at risk', 'check', 'pitfall', 'bailout', 'fluoro'])) {
    surgicalUsefulness = 4;
  }
  if (mode === 'consult' && includesAny(answer, ['red flag', 'missing', 'imaging', 'present', 'urgent', 'disposition', 'senior'])) {
    modeFit += 1;
  }
  if (mode === 'clinic' && includesAny(answer, ['differential', 'history', 'exam', 'imaging', 'first-line', 'red flag'])) {
    modeFit += 1;
  }
  if (chips && includesAny(chips, ['trap', 'classification', 'approach', 'anatomy', 'indication', 'present', 'imaging', 'differential', 'pitfall', 'exposure', 'decision', 'disposition', 'algorithm'])) {
    chipQuality = 4;
  }
  if (/(complications|anatomy|implants|surgical technique)$/i.test((params.output.nextLearningBranches?.[0]?.label ?? '').trim())) {
    chipQuality -= 1;
  }

  return {
    specificity: Math.max(1, Math.min(5, specificity)),
    modeFit: Math.max(1, Math.min(5, modeFit)),
    testRelevance: Math.max(1, Math.min(5, testRelevance)),
    surgicalUsefulness: Math.max(1, Math.min(5, surgicalUsefulness)),
    lengthControl: Math.max(1, Math.min(5, lengthControl)),
    followUpChipQuality: Math.max(1, Math.min(5, chipQuality)),
  };
}

function failureModes(input: {
  mode: chat.BroBotChatMode;
  subintent: string;
  output: chat.BroBotChatOutput;
  warnings: string[];
  revisionTriggered: boolean;
}) {
  const failures: string[] = [];
  const answer = input.output.answer.toLowerCase();
  const isExemptSubintent = ['quiz', 'oite_traps', 'anatomy_at_risk', 'patient_explanation'].includes(input.subintent);

  if (input.warnings.length) failures.push(`quality_gate:${input.warnings.join('|')}`);
  if (input.mode === 'oite' && !isExemptSubintent && !includesAny(answer, ['trap', 'distractor', 'wrong answer', 'stem'])) {
    failures.push('weak_oite_trap_layer');
  }
  if (input.mode === 'or_prep' && !includesAny(answer, ['approach', 'exposure', 'incision', 'portal', 'interval'])) {
    failures.push('weak_or_exposure_layer');
  }
  if (input.mode === 'consult' && !includesAny(answer, ['disposition', 'admit', 'follow-up', 'operative', 'nonoperative', 'urgent', 'management', 'plan'])) {
    failures.push('weak_consult_disposition');
  }
  if (input.mode === 'clinic' && !isExemptSubintent && !includesAny(answer, ['differential', 'history', 'exam'])) {
    failures.push('weak_clinic_workup_shape');
  }
  if (input.output.answer.length > 1600) failures.push('answer_too_long');
  if ((input.output.nextLearningBranches ?? []).some((chip) => /^(Complications|Anatomy|Implants|Surgical Technique)$/i.test(chip.label))) {
    failures.push('generic_chip_label');
  }
  if (input.revisionTriggered && input.warnings.length === 0) failures.push('possible_false_positive_revision');
  return failures.length ? failures : ['none_obvious'];
}

async function runJsonCompletion(openai: InstanceType<typeof OpenAI>, params: {
  model: string;
  messages: chat.BroBotModelMessage[];
  temperature?: number;
}) {
  const completion = await openai.chat.completions.create({
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0]?.message?.content ?? '';
}

async function runFixture(openai: InstanceType<typeof OpenAI>, fixture: Fixture) {
  const localIntent = chat.preRouteBroBotIntent({
    message: fixture.prompt,
    selectedMode: fixture.mode,
  });
  // Apply forced subintent (simulates classifier for exempt subintent testing)
  const intent: chat.BroBotChatIntent = fixture.forceSubintent
    ? { ...localIntent, subintent: fixture.forceSubintent }
    : localIntent;
  const selectedBranch = undefined;
  const answerContext = await chat.buildBroBotAnswerContext({
    message: fixture.prompt,
    intent,
    selectedBranch,
    trainingLevel: fixture.trainingLevel,
    responseDepth: fixture.responseDepth,
    history: [],
  });
  const answerRoute = chat.routeBroBotAnswer({
    message: fixture.prompt,
    intent,
    selectedMode: fixture.mode,
    history: [],
  });
  const answerModel = modelConfig.getAnswerModelForRoute({
    mode: intent.mode,
    ambiguity: intent.ambiguity,
    responseDepth: fixture.responseDepth,
    subintent: intent.subintent,
  });
  const answerRaw = await runJsonCompletion(openai, {
    model: answerModel,
    messages: chat.buildBroBotChatMessages({
      message: fixture.prompt,
      mode: intent.mode,
      responseDepth: fixture.responseDepth,
      trainingLevel: fixture.trainingLevel,
      intent,
      answerContext,
      answerRoute,
      includeProductMetadata: false,
    }),
  });
  let output = chat.parseBroBotChatResponse(answerRaw, {
    fallbackMode: intent.mode,
    fallbackAnswer: 'BroBot could not format a structured response.',
  });
  let gate = chat.runBroBotQualityGate({
    answer: output.answer,
    mode: intent.mode,
    responseDepth: fixture.responseDepth,
    subintent: intent.subintent,
    trainingLevel: fixture.trainingLevel,
    procedureOrTopic: intent.procedureOrTopic,
    answerRoute,
    clinicalContext: answerContext.clinicalContext,
  });
  const warningsBeforeRevision = [...gate.warnings];
  let revisionTriggered = false;
  if (gate.warnings.length && intent.subintent !== 'urgent_red_flags') {
    revisionTriggered = true;
    const revisionRaw = await runJsonCompletion(openai, {
      model: modelConfig.getRevisionModel(intent.mode),
      messages: chat.buildBroBotRevisionMessages({
        message: fixture.prompt,
        mode: intent.mode,
        responseDepth: fixture.responseDepth,
        trainingLevel: fixture.trainingLevel,
        intent,
        answerContext,
        originalResponse: output.answer,
        priorityPoints: output.priorityPoints,
        knowledgeGaps: output.knowledgeGaps,
        whatMostResidentsMiss: output.whatMostResidentsMiss,
        warnings: gate.warnings,
      }),
    });
    output = chat.parseBroBotChatResponse(revisionRaw, {
      fallbackMode: intent.mode,
      fallbackAnswer: output.answer,
    });
    gate = chat.runBroBotQualityGate({
      answer: output.answer,
      mode: intent.mode,
      responseDepth: fixture.responseDepth,
      subintent: intent.subintent,
      trainingLevel: fixture.trainingLevel,
      procedureOrTopic: intent.procedureOrTopic,
      answerRoute,
      clinicalContext: answerContext.clinicalContext,
    });
  }

  // Build facet chips from unmet coverage warnings.
  const facetChips = contextBuilder.buildUncoveredFacetChips({
    qualityWarnings: gate.warnings,
    procedureOrTopic: intent.procedureOrTopic,
  });
  const metadataFallbackBranches = [
    ...facetChips,
    ...(intent.branchOptions ?? []),
  ];

  const metadataRaw = await runJsonCompletion(openai, {
    model: modelConfig.getMetadataModel(),
    messages: chat.buildBroBotMetadataMessages({
      message: fixture.prompt,
      mode: intent.mode,
      responseDepth: fixture.responseDepth,
      trainingLevel: fixture.trainingLevel,
      intent,
      answerContext,
      finalAnswer: output.answer,
      priorityPoints: output.priorityPoints,
      knowledgeGaps: output.knowledgeGaps,
      whatMostResidentsMiss: output.whatMostResidentsMiss,
      fallbackBranches: metadataFallbackBranches,
    }),
  });
  const metadata = chat.parseBroBotMetadataResponse({
    raw: metadataRaw,
    fallbackMode: intent.mode,
    fallbackSuggestedQuestions: output.suggestedQuestions,
    fallbackNextLearningBranches: metadataFallbackBranches,
    fallbackTags: output.tags,
  });
  output = {
    ...output,
    suggestedQuestions: metadata.suggestedQuestions,
    nextLearningBranches: metadata.nextLearningBranches,
    tags: metadata.tags,
  };

  const scores = scoreAnswer({ fixture, output, qualityGateWarnings: gate.warnings });
  return {
    id: fixture.id,
    prompt: fixture.prompt,
    mode: fixture.mode,
    forcedSubintent: fixture.forceSubintent ?? null,
    detectedSubintent: intent.subintent,
    detectedMode: intent.mode,
    level: fixture.trainingLevel,
    depth: fixture.responseDepth,
    clinicalContext: answerContext.clinicalContext,
    sourceContextFound: answerContext.certifiedContext
      ? {
          source: answerContext.certifiedContext.source,
          title: answerContext.certifiedContext.title,
          sectionLabels: answerContext.certifiedContext.sections.map((s) => s.label),
        }
      : null,
    answerRoute,
    answerLength: output.answer.length,
    finalAnswerQuality: scores,
    answerSummary: compactText(output.answer),
    qualityGateWarningsBeforeRevision: warningsBeforeRevision,
    qualityGateWarnings: gate.warnings,
    revisionTriggered,
    facetChipsGenerated: facetChips.map((chip) => chip.label),
    followUpChips: (output.nextLearningBranches ?? []).map((chip) => ({
      label: chip.label,
      category: chip.category ?? null,
      fromFacet: facetChips.some((fc) => fc.label === chip.label),
    })),
    specificFailureMode: failureModes({
      mode: fixture.mode,
      subintent: intent.subintent,
      output,
      warnings: gate.warnings,
      revisionTriggered,
    }),
  };
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not configured. Add it to the shell or .env.local before running this audit.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const results = [];

for (const fixture of fixtures) {
  console.log(`[brobot-p1-live] ${fixture.id} ${fixture.mode}${fixture.forceSubintent ? `/${fixture.forceSubintent}` : ''}: ${fixture.prompt}`);
  results.push(await runFixture(openai, fixture));
}

// Per-mode breakdown
const modeGroups = ['or_prep', 'oite', 'consult', 'clinic', 'general'] as const;
type ModeGroup = typeof modeGroups[number];

function modeOf(r: (typeof results)[0]): ModeGroup {
  return (modeGroups.find((m) => r.mode === m) ?? 'general') as ModeGroup;
}

const perMode = Object.fromEntries(
  modeGroups.map((mode) => {
    const group = results.filter((r) => modeOf(r) === mode);
    return [mode, {
      count: group.length,
      revisionTriggered: group.filter((r) => r.revisionTriggered).length,
      sourceContextFound: group.filter((r) => r.sourceContextFound).length,
      sourceContextCertified: group.filter((r) => r.sourceContextFound?.source === 'caseprep').length,
      sourceContextDraft: group.filter((r) => r.sourceContextFound?.source === 'caseprep_draft').length,
      qualityGateWarnings: group.filter((r) => r.qualityGateWarnings.length).length,
      facetChipsGenerated: group.filter((r) => r.facetChipsGenerated.length > 0).length,
    }];
  })
);

// Exempt subintent breakdown (the ones that should NOT trigger heavy revision)
const exemptSubintents = ['quiz', 'oite_traps', 'anatomy_at_risk', 'classification', 'indications'];
const exemptResults = results.filter((r) => exemptSubintents.includes(r.detectedSubintent ?? ''));
const exemptRevisionRate = exemptResults.length > 0 ? exemptResults.filter((r) => r.revisionTriggered).length : 0;

const averages = results.reduce((accumulator, result) => {
  for (const [key, value] of Object.entries(result.finalAnswerQuality)) {
    accumulator[key] = (accumulator[key] ?? 0) + Number(value);
  }
  return accumulator;
}, {} as Record<string, number>);
for (const key of Object.keys(averages)) averages[key] = Number((averages[key] / results.length).toFixed(2));

const summary = {
  generatedAt: new Date().toISOString(),
  fixtureCount: fixtures.length,
  averages,
  revisionTriggeredCount: results.filter((r) => r.revisionTriggered).length,
  sourceContextFoundCount: results.filter((r) => r.sourceContextFound).length,
  sourceContextCertifiedCount: results.filter((r) => r.sourceContextFound?.source === 'caseprep').length,
  sourceContextDraftCount: results.filter((r) => r.sourceContextFound?.source === 'caseprep_draft').length,
  qualityGateWarningCount: results.filter((r) => r.qualityGateWarnings.length).length,
  facetChipsGeneratedCount: results.filter((r) => r.facetChipsGenerated.length > 0).length,
  exemptSubintentRevisionCount: exemptRevisionRate,
  exemptSubintentFixtureCount: exemptResults.length,
  perMode,
  results,
};

const outDir = path.join(process.cwd(), 'reports', 'brobot-p1-live-audit');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(
  path.join(outDir, 'summary.md'),
  [
    '# BroBot P1 Live Audit',
    '',
    `Generated: ${summary.generatedAt}`,
    `Fixtures: ${summary.fixtureCount}`,
    `Averages: ${JSON.stringify(summary.averages)}`,
    '',
    '## Key Metrics (target vs P0 baseline)',
    `| Metric | P0 Baseline | P1 Result | Target |`,
    `|---|---|---|---|`,
    `| Revision triggered | 18/20 | ${summary.revisionTriggeredCount}/${summary.fixtureCount} | <6/20 |`,
    `| Source context found | 0/20 | ${summary.sourceContextFoundCount}/${summary.fixtureCount} | >8/20 |`,
    `| Source context certified | — | ${summary.sourceContextCertifiedCount}/${summary.fixtureCount} | any |`,
    `| Source context draft | — | ${summary.sourceContextDraftCount}/${summary.fixtureCount} | any |`,
    `| Facet chips from unmet warnings | — | ${summary.facetChipsGeneratedCount}/${summary.fixtureCount} | >5/20 |`,
    `| Exempt-subintent revision | — | ${summary.exemptSubintentRevisionCount}/${summary.exemptSubintentFixtureCount} | 0/${summary.exemptSubintentFixtureCount} |`,
    '',
    '## Per-Mode Breakdown',
    ...modeGroups.map((mode) => {
      const m = perMode[mode];
      return `- **${mode}**: ${m.count} fixtures | revision ${m.revisionTriggered}/${m.count} | source ${m.sourceContextFound}/${m.count} (cert=${m.sourceContextCertified}, draft=${m.sourceContextDraft}) | facetChips ${m.facetChipsGenerated}/${m.count}`;
    }),
    '',
    '## Results',
    ...results.map((result) => [
      `## ${result.id}: ${result.prompt}`,
      `- mode/level/depth: ${result.mode} / ${result.level} / ${result.depth}`,
      `- subintent: detected=${result.detectedSubintent}${result.forcedSubintent ? ` forced=${result.forcedSubintent}` : ''}`,
      `- detectedMode: ${result.detectedMode}`,
      `- sourceContext: ${result.sourceContextFound ? `${result.sourceContextFound.title} [${result.sourceContextFound.source}] (${result.sourceContextFound.sectionLabels.join(', ')})` : 'null'}`,
      `- clinicalContext: facets=${result.clinicalContext.taskFacets.join(', ')}; requirements=${result.clinicalContext.coverageRequirements.join(', ')}; missing=${result.clinicalContext.missingCriticalSlots.join(', ') || 'none'}`,
      `- quality: ${JSON.stringify(result.finalAnswerQuality)}; answerLength=${result.answerLength}`,
      `- warnings before revision: ${result.qualityGateWarningsBeforeRevision.join(', ') || 'none'}`,
      `- warnings final: ${result.qualityGateWarnings.join(', ') || 'none'}`,
      `- revisionTriggered: ${result.revisionTriggered}`,
      `- facetChipsGenerated: ${result.facetChipsGenerated.join(' | ') || 'none'}`,
      `- chips: ${result.followUpChips.map((c) => `${c.label}${c.fromFacet ? ' [facet]' : ''}`).join(' | ')}`,
      `- failureMode: ${result.specificFailureMode.join(', ')}`,
      `- answerSummary: ${result.answerSummary}`,
      '',
    ].join('\n')),
  ].join('\n')
);

console.log(JSON.stringify({
  outDir,
  fixtureCount: summary.fixtureCount,
  averages: summary.averages,
  revisionTriggeredCount: summary.revisionTriggeredCount,
  sourceContextFoundCount: summary.sourceContextFoundCount,
  sourceContextCertifiedCount: summary.sourceContextCertifiedCount,
  sourceContextDraftCount: summary.sourceContextDraftCount,
  qualityGateWarningCount: summary.qualityGateWarningCount,
  facetChipsGeneratedCount: summary.facetChipsGeneratedCount,
  exemptSubintentRevision: `${summary.exemptSubintentRevisionCount}/${summary.exemptSubintentFixtureCount}`,
  perMode,
}, null, 2));
