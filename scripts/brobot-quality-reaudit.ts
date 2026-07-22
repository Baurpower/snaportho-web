import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const AUDIT_CUTOFF = '2026-07-21T23:59:59.999Z';
const COHORT_SIZE = 115;
const OUTPUT_DIR = path.join(process.cwd(), 'reports', 'brobot-quality-reaudit-2026-07-21');

type DbConversation = { id: string; created_at: string; last_mode: string | null; detected_context: unknown };
type DbMessage = { id: string; conversation_id: string; role: 'user' | 'assistant' | 'system'; content: string; structured_json: Record<string, unknown> | null; mode: string | null; response_depth: string | null; created_at: string };
type ManifestTurn = {
  turnId: string; conversationId: string; turnNumber: number; mode: string; responseDepth: string;
  trainingLevel: string; userPrompt: string; originalAnswer: string; history: Array<{ role: 'user' | 'assistant'; content: string }>;
  selectedBranch?: { label?: string }; privacyFlags: string[];
};

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
const pseudonym = (prefix: string, value: string) => `${prefix}_${createHash('sha256').update(`brobot-reaudit-v1:${value}`).digest('hex').slice(0, 12)}`;
function sanitize(value: string) {
  const flags: string[] = [];
  let text = String(value ?? '');
  const rules: Array<[string, RegExp, string]> = [
    ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]'],
    ['phone', /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[REDACTED_PHONE]'],
    ['mrn', /\b(?:mrn|medical record(?: number)?)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/gi, '[REDACTED_MRN]'],
    ['dob', /\b(?:dob|date of birth)\s*[:#-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, '[REDACTED_DOB]'],
    ['address', /\b\d{1,6}\s+[A-Za-z0-9.' -]{2,40}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/gi, '[REDACTED_ADDRESS]'],
  ];
  for (const [flag, pattern, replacement] of rules) {
    if (pattern.test(text)) flags.push(flag);
    pattern.lastIndex = 0; text = text.replace(pattern, replacement);
  }
  if (/\b(?:patient name|name is)\s*[:#-]?\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text)) flags.push('possible_name_manual_review');
  return { text, flags: [...new Set(flags)] };
}

async function fetchCohort() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: conversations, error: conversationError } = await supabase
    .from('brobot_conversations')
    .select('id,created_at,last_mode,detected_context')
    .lte('created_at', AUDIT_CUTOFF)
    .order('created_at', { ascending: true })
    .limit(COHORT_SIZE);
  if (conversationError) throw new Error(`Conversation select failed: ${conversationError.message}`);
  const ids = (conversations ?? []).map((row) => row.id);
  const { data: messages, error: messageError } = ids.length ? await supabase
    .from('brobot_messages')
    .select('id,conversation_id,role,content,structured_json,mode,response_depth,created_at')
    .in('conversation_id', ids)
    .order('conversation_id', { ascending: true })
    .order('created_at', { ascending: true }) : { data: [], error: null };
  if (messageError) throw new Error(`Message select failed: ${messageError.message}`);
  return { conversations: (conversations ?? []) as DbConversation[], messages: (messages ?? []) as DbMessage[] };
}

function buildManifest(corpus: Awaited<ReturnType<typeof fetchCohort>>) {
  const grouped = new Map<string, DbMessage[]>();
  for (const message of corpus.messages) grouped.set(message.conversation_id, [...(grouped.get(message.conversation_id) ?? []), message]);
  const turns: ManifestTurn[] = [];
  let privacyFlagCount = 0;
  for (const conversation of corpus.conversations) {
    const conversationId = pseudonym('conv', conversation.id); const history: ManifestTurn['history'] = [];
    let pendingUser: { text: string; flags: string[] } | null = null; let turnNumber = 0;
    for (const message of grouped.get(conversation.id) ?? []) {
      const clean = sanitize(message.content);
      privacyFlagCount += clean.flags.length;
      if (message.role === 'user') { pendingUser = clean; history.push({ role: 'user', content: clean.text }); continue; }
      if (message.role !== 'assistant' || !pendingUser) continue;
      turnNumber += 1;
      const structured = message.structured_json ?? {};
      turns.push({
        turnId: `${conversationId}:T${turnNumber}`, conversationId, turnNumber,
        mode: message.mode ?? String(structured.detectedMode ?? conversation.last_mode ?? 'general'),
        responseDepth: message.response_depth ?? 'standard',
        trainingLevel: String(structured.trainingLevel ?? 'pgy2'),
        userPrompt: pendingUser.text, originalAnswer: clean.text,
        history: history.slice(0, -1).slice(-12),
        selectedBranch: typeof structured.selectedFocus === 'string' && structured.selectedFocus ? { label: structured.selectedFocus } : undefined,
        privacyFlags: [...new Set([...pendingUser.flags, ...clean.flags])],
      });
      history.push({ role: 'assistant', content: clean.text }); pendingUser = null;
    }
  }
  return { turns, privacyFlagCount };
}

const anchors: Array<[string, RegExp]> = [
  ['distal_radius_duration', /distal radius[\s\S]{0,80}(how long|duration|time)/i],
  ['distal_femur_nail_plate', /distal femur[\s\S]{0,80}(nail|plate)/i],
  ['posterior_malleolus', /posterior malleol/i], ['compartment_syndrome', /compartment syndrome/i],
  ['article_retrieval', /(?:articles?|papers?)/i], ['staged_quiz', /quiz[\s\S]{0,80}(wait|after i|one at a time)/i],
  ['eip_correction', /\bEIP\b/i], ['repeated_tka', /cemented[\s\S]{0,80}cementless/i],
  ['tka_implants', /(?:TKA|total knee)[\s\S]{0,80}implant/i], ['reverse_tsa', /reverse[ -]TSA|reverse total shoulder/i],
  ['tibial_shaft_consult', /tibial shaft/i], ['tibial_plateau_orif', /tibial plateau[\s\S]{0,80}ORIF/i],
];
function selectPilot(turns: ManifestTurn[]) {
  const selectedConversations = new Map<string, string>();
  for (const [name, pattern] of anchors) {
    const match = turns.find((turn) => pattern.test(`${turn.userPrompt}\n${turn.originalAnswer}`));
    if (match && !selectedConversations.has(match.conversationId)) selectedConversations.set(match.conversationId, name);
  }
  for (const turn of turns) {
    if (selectedConversations.size >= 15) break;
    if (selectedConversations.has(turn.conversationId)) continue;
    if (!turns.some((candidate) => candidate.conversationId === turn.conversationId && candidate.turnNumber > 1)) continue;
    selectedConversations.set(turn.conversationId, `continuity_${selectedConversations.size + 1}`);
  }
  for (const turn of turns) {
    if (selectedConversations.size >= 15) break;
    if (!selectedConversations.has(turn.conversationId)) selectedConversations.set(turn.conversationId, `coverage_${selectedConversations.size + 1}`);
  }
  return turns
    .filter((turn) => selectedConversations.has(turn.conversationId))
    .map((turn) => ({ caseName: selectedConversations.get(turn.conversationId)!, ...turn }));
}

async function prepare() {
  loadEnv();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase read configuration is unavailable.');
  }
  const corpus = await fetchCohort(); const manifest = buildManifest(corpus); const pilot = selectPilot(manifest.turns);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'replay-manifest.jsonl'), manifest.turns.map((turn) => JSON.stringify(turn)).join('\n') + '\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'pilot-manifest.jsonl'), pilot.map((turn) => JSON.stringify(turn)).join('\n') + '\n');
  const summary = { version: 'brobot-quality-reaudit-v1', cutoff: AUDIT_CUTOFF, requestedConversations: COHORT_SIZE,
    conversations: corpus.conversations.length, messages: corpus.messages.length, assistantTurns: manifest.turns.length,
    pilotConversations: new Set(pilot.map((item) => item.conversationId)).size, pilotTurns: pilot.length,
    anchorCasesFound: [...new Set(pilot.filter((item) => !item.caseName.startsWith('continuity_') && !item.caseName.startsWith('coverage_')).map((item) => item.caseName))],
    turnsRequiringPrivacyReview: manifest.turns.filter((turn) => turn.privacyFlags.length > 0).length,
    privacyFlagCount: manifest.privacyFlagCount, productionWrites: 0 };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

const command = process.argv[2] ?? 'prepare';
if (command !== 'prepare') throw new Error(`Unsupported command ${command}; replay commands are added after manifest calibration.`);
prepare().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
