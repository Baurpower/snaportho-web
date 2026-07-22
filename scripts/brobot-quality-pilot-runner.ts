import fs from 'node:fs';
import path from 'node:path';

import { buildBroBotChatMessages, fallbackBroBotIntentExpansion, parseBroBotChatResponse } from '@/lib/brobot/chat';
import { runBroBotEvaluation } from '@/lib/brobot/evaluator';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { getAnswerModelForRoute } from '@/lib/brobot/model-config';

type Arm = 'current_off' | 'phase12' | 'latest_orprep';
type ManifestTurn = {
  caseName: string; turnId: string; conversationId: string; turnNumber: number; mode: string;
  responseDepth: string; trainingLevel: string; userPrompt: string; originalAnswer: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  selectedBranch?: { label?: string };
};
type ReplayRow = ManifestTurn & {
  arm: Arm; model: string; replayAnswer: string; elapsedMs: number;
  deterministic: ReturnType<typeof deterministicChecks>;
  evaluation?: { original: unknown; replay: unknown };
  evaluationError?: string;
};

const ROOT = path.join(process.cwd(), 'reports', 'brobot-quality-reaudit-2026-07-21');
const INPUT = path.join(ROOT, 'pilot-manifest.jsonl');
const VALID_MODES = new Set(['auto', 'or_prep', 'oite', 'clinic', 'consult', 'fracture_call', 'research', 'general']);
const VALID_DEPTHS = new Set(['quick', 'standard', 'deep']);
const VALID_LEVELS = new Set(['med_student', 'pgy1', 'pgy2', 'pgy3', 'pgy4', 'pgy5', 'attending']);

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim(); if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('='); if (index < 1) continue;
    const key = trimmed.slice(0, index); let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function args() {
  const values = process.argv.slice(2); const command = values.find((value) => !value.startsWith('--')) ?? 'dry-run';
  const armValue = values.find((value) => value.startsWith('--arm='))?.split('=')[1] ?? 'current_off';
  const limitValue = Number(values.find((value) => value.startsWith('--limit='))?.split('=')[1] ?? 0);
  if (armValue !== 'current_off' && armValue !== 'phase12' && armValue !== 'latest_orprep') throw new Error('arm must be current_off, phase12, or latest_orprep');
  return { command, arm: armValue as Arm, limit: Number.isFinite(limitValue) && limitValue > 0 ? limitValue : undefined, score: values.includes('--score') };
}

function readJsonl<T>(file: string): T[] {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function words(value: string) { return value.toLowerCase().match(/[a-z0-9]+/g) ?? []; }
function deterministicChecks(question: string, answer: string) {
  const answerWords = words(answer); const questionTerms = new Set(words(question).filter((word) => word.length > 4));
  const overlap = new Set(answerWords.filter((word) => questionTerms.has(word))).size;
  const sentences = answer.split(/[.!?]\s+/).map((item) => item.trim()).filter(Boolean);
  const normalized = sentences.map((item) => item.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
  return {
    wordCount: answerWords.length,
    questionTermCoverage: questionTerms.size ? Number((overlap / questionTerms.size).toFixed(3)) : null,
    duplicateSentenceCount: normalized.length - new Set(normalized).size,
    hasCitationShape: /\b(?:doi:|pmid|https?:\/\/|et al\.)/i.test(answer),
    empty: !answer.trim(),
  };
}

function assertArmEnvironment(arm: Arm) {
  const expectedByArm: Record<Arm, Record<string, boolean>> = {
    current_off: {
      BROBOT_INTERACTION_CONSTRAINTS_ENABLED: false, BROBOT_CORRECTION_REPAIR_ENABLED: false,
      BROBOT_STRUCTURED_CONVERSATION_STATE_ENABLED: false, BROBOT_LATEST_TURN_TASK_ENABLED: false,
      BROBOT_OR_PREP_TASK_CONTRACT_ENABLED: false,
    },
    phase12: {
      BROBOT_INTERACTION_CONSTRAINTS_ENABLED: true, BROBOT_CORRECTION_REPAIR_ENABLED: true,
      BROBOT_STRUCTURED_CONVERSATION_STATE_ENABLED: true, BROBOT_LATEST_TURN_TASK_ENABLED: false,
      BROBOT_OR_PREP_TASK_CONTRACT_ENABLED: false,
    },
    latest_orprep: {
      BROBOT_INTERACTION_CONSTRAINTS_ENABLED: false, BROBOT_CORRECTION_REPAIR_ENABLED: false,
      BROBOT_STRUCTURED_CONVERSATION_STATE_ENABLED: false, BROBOT_LATEST_TURN_TASK_ENABLED: true,
      BROBOT_OR_PREP_TASK_CONTRACT_ENABLED: true,
    },
  };
  for (const [key, expected] of Object.entries(expectedByArm[arm])) {
    const actual = /^(1|true|yes|on)$/i.test(process.env[key] ?? '');
    if (actual !== expected) throw new Error(`${key} must be ${expected} for arm ${arm}. Use the package script.`);
  }
}

async function evaluate(turn: ManifestTurn, answer: string, model: string) {
  return runBroBotEvaluation({
    jobId: `reaudit:${turn.turnId}`, conversationId: turn.conversationId, messageId: turn.turnId,
    userId: 'reaudit_pseudonymous', mode: turn.mode, procedure: null, model,
    trainingLevel: turn.trainingLevel, responseDepth: turn.responseDepth,
    intentSnapshot: null, contextSnapshot: null, conversationHistory: turn.history,
    currentUserQuestion: turn.userPrompt, finalAssistantResponse: answer,
  });
}

async function evaluateWithRetry(turn: ManifestTurn, answer: string, model: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await evaluate(turn, answer, model);
    } catch (error) {
      lastError = error;
      console.warn(JSON.stringify({ event: 'evaluation_retry', turnId: turn.turnId, attempt }));
    }
  }
  throw lastError;
}

async function main() {
  loadEnv(); const options = args(); assertArmEnvironment(options.arm);
  if (!fs.existsSync(INPUT)) throw new Error('Pilot manifest is missing. Run npm run brobot:reaudit:prepare first.');
  const allTurns = readJsonl<ManifestTurn>(INPUT); const turns = options.limit ? allTurns.slice(0, options.limit) : allTurns;
  const output = path.join(ROOT, `pilot-${options.arm}${options.score ? '-scored' : ''}.jsonl`);
  if (options.command === 'dry-run') {
    console.log(JSON.stringify({ arm: options.arm, turns: turns.length, scoring: options.score, modelCalls: turns.length * (options.score ? 3 : 1), productionWrites: 0, output }, null, 2));
    return;
  }
  if (options.command !== 'run') throw new Error('command must be dry-run or run');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
  fs.mkdirSync(ROOT, { recursive: true });
  const completed = fs.existsSync(output) ? readJsonl<ReplayRow>(output) : [];
  const completedIds = new Set(completed.map((row) => row.turnId));
  for (const [index, turn] of turns.entries()) {
    if (completedIds.has(turn.turnId)) continue;
    const mode = VALID_MODES.has(turn.mode) ? turn.mode : 'general';
    const depth = VALID_DEPTHS.has(turn.responseDepth) ? turn.responseDepth : 'standard';
    const level = VALID_LEVELS.has(turn.trainingLevel) ? turn.trainingLevel : 'pgy2';
    const intent = fallbackBroBotIntentExpansion(turn.userPrompt, mode as Parameters<typeof fallbackBroBotIntentExpansion>[1]);
    const model = getAnswerModelForRoute({ mode: intent.mode, ambiguity: intent.ambiguity, responseDepth: depth as 'quick' | 'standard' | 'deep', subintent: intent.subintent });
    const started = Date.now();
    const completion = await getOpenAI().chat.completions.create({
      model, temperature: 0,
      response_format: { type: 'json_object' },
      messages: buildBroBotChatMessages({ message: turn.userPrompt, messages: [...turn.history, { role: 'user', content: turn.userPrompt }], mode: intent.mode, responseDepth: depth as 'quick' | 'standard' | 'deep', trainingLevel: level as Parameters<typeof buildBroBotChatMessages>[0]['trainingLevel'], intent, selectedBranch: turn.selectedBranch, includeProductMetadata: true }),
    });
    const parsed = parseBroBotChatResponse(completion.choices[0]?.message?.content ?? '', { fallbackMode: intent.mode });
    const row: ReplayRow = { ...turn, arm: options.arm, model, replayAnswer: parsed.answer, elapsedMs: Date.now() - started, deterministic: deterministicChecks(turn.userPrompt, parsed.answer) };
    if (options.score) {
      try {
        row.evaluation = {
          original: await evaluateWithRetry(turn, turn.originalAnswer, model),
          replay: await evaluateWithRetry(turn, parsed.answer, model),
        };
      } catch (error) {
        row.evaluationError = error instanceof Error ? error.message.slice(0, 500) : 'Evaluator failed after three attempts.';
      }
    }
    fs.appendFileSync(output, `${JSON.stringify(row)}\n`);
    console.log(JSON.stringify({ completed: index + 1, total: turns.length, turnId: turn.turnId, arm: options.arm }));
  }
  console.log(JSON.stringify({ status: 'complete', arm: options.arm, turns: turns.length, scoring: options.score, productionWrites: 0, output }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
