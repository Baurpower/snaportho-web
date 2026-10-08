import fs from 'node:fs';
import path from 'node:path';

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();
process.env.BROBOT_CLAIMS_GROUNDING_MODE = 'enabled';
process.env.BROBOT_CLAIM_ANKI_MODE = 'enabled';

const [{ default: OpenAI }, chat, { createAdminClient }, { getAnswerModelForRoute }, anki] = await Promise.all([
  import('openai'),
  import('../src/lib/brobot/chat/index.ts'),
  import('../src/lib/supabase/admin.ts'),
  import('../src/lib/brobot/model-config.ts'),
  import('../src/lib/brobot/chat/anki-linker.ts'),
]);
const { BROBOT_KG_PINNED_RELEASE_ID } = await import('../src/lib/brobot/kg/contracts.ts');
type Packet = import('../src/lib/brobot/kg/contracts.ts').BroBotKgPacket;

const coverageFixtures = [
  { id: 'oite-scfe', prompt: 'SCFE OITE points and treatment thresholds', mode: 'oite' as const, level: 'pgy2' as const },
  { id: 'oite-garden', prompt: 'Explain the Garden classification and why it changes treatment', mode: 'oite' as const, level: 'pgy2' as const },
  { id: 'clinic-acl', prompt: 'What are the indications for ACL reconstruction?', mode: 'clinic' as const, level: 'pgy2' as const },
  { id: 'or-ctr', prompt: 'How do I confirm carpal tunnel release is complete?', mode: 'or_prep' as const, level: 'pgy1' as const },
  { id: 'consult-ankle', prompt: 'Ankle fracture consult. What changes urgency and management?', mode: 'consult' as const, level: 'pgy1' as const },
  { id: 'or-distal-radius', prompt: 'Distal radius ORIF tomorrow. Key exposure, anatomy, and decisions?', mode: 'or_prep' as const, level: 'pgy2' as const },
];
const eligibleFixtures = [
  { id: 'eligible-perineurium', prompt: 'What connective tissue surrounds nerve fascicles after a partial median nerve laceration?', mode: 'oite' as const, level: 'pgy2' as const },
  { id: 'eligible-groin-flap', prompt: 'Preparing a groin flap for traumatic thumb soft-tissue coverage. What is the pedicle and which nerve is at risk?', mode: 'or_prep' as const, level: 'pgy2' as const },
  { id: 'eligible-latissimus-flap', prompt: 'For a latissimus dorsi myocutaneous flap covering a large adult elbow defect, what vessel supplies the main perforators?', mode: 'or_prep' as const, level: 'pgy2' as const },
  { id: 'eligible-carpal-tunnel', prompt: 'During open carpal tunnel release, which branch is endangered by a radial transverse carpal ligament cut and what deficit results?', mode: 'or_prep' as const, level: 'pgy1' as const },
];
const fixtures = process.env.BROBOT_AUDIT_TARGET === 'eligible' ? eligibleFixtures : coverageFixtures;

const db = createAdminClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const entities = [];
for (let start = 0; ; start += 1000) {
  const page = await db.from('canonical_entities')
    .select('id,preferred_label,normalized_label,entity_type,status,is_active')
    .eq('is_active', true).range(start, start + 999);
  if (page.error) throw page.error;
  entities.push(...(page.data ?? []));
  if ((page.data?.length ?? 0) < 1000) break;
}

const claimAuditRows = await db.from('educational_claims')
  .select('id,current_version_id,review_status,content_source,approval_method,is_active').limit(10000);
if (claimAuditRows.error) throw claimAuditRows.error;
const claimAuditVersionIds = (claimAuditRows.data ?? []).map((claim) => claim.current_version_id).filter(Boolean);
const claimVersionAuditRows = claimAuditVersionIds.length
  ? await db.from('educational_claim_versions')
      .select('id,review_status,content_source,approval_method').limit(10000)
  : { data: [], error: null };
if (claimVersionAuditRows.error) throw claimVersionAuditRows.error;
const [allClaimsCount, activeClaimsCount, approvedVersionsCount, verifiedVersionsCount, eligibleVersionsCount, allCardLinksCount] = await Promise.all([
  db.from('educational_claims').select('id', { count: 'exact', head: true }),
  db.from('educational_claims').select('id', { count: 'exact', head: true }).eq('is_active', true),
  db.from('educational_claim_versions').select('id', { count: 'exact', head: true }).eq('review_status', 'approved'),
  db.from('educational_claim_versions').select('id', { count: 'exact', head: true }).eq('content_source', 'verified'),
  db.from('educational_claim_versions').select('id', { count: 'exact', head: true })
    .eq('review_status', 'approved').eq('content_source', 'verified'),
  db.from('card_claim_links').select('id', { count: 'exact', head: true }),
]);
const eligibleVersionRows = await db.from('educational_claim_versions')
  .select('id,claim_id,claim_text,claim_type,predicate,object_text,primary_entity_id,review_status,content_source,approval_method')
  .eq('review_status', 'approved').eq('content_source', 'verified');
if (eligibleVersionRows.error) throw eligibleVersionRows.error;
const eligibleClaimRows = await db.from('educational_claims')
  .select('id,current_version_id,is_active,review_status,content_source,primary_entity_id')
  .in('id', (eligibleVersionRows.data ?? []).map((version) => version.claim_id));
if (eligibleClaimRows.error) throw eligibleClaimRows.error;
const eligibleCardLinks = await db.from('card_claim_links')
  .select('id,claim_id,claim_version_id,canonical_card_id,canonical_card_version_id,review_status,is_active')
  .in('claim_id', (eligibleVersionRows.data ?? []).map((version) => version.claim_id));
if (eligibleCardLinks.error) throw eligibleCardLinks.error;
const cardLinkRows = [];
for (let start = 0; ; start += 1000) {
  const page = await db.from('card_claim_links')
    .select('review_status,approval_method,algorithm_version,is_active,confidence,claim_id,claim_version_id')
    .range(start, start + 999);
  if (page.error) throw page.error;
  cardLinkRows.push(...(page.data ?? []));
  if ((page.data?.length ?? 0) < 1000) break;
}
const productionRpcProbe = await db.rpc('retrieve_brobot_knowledge_v2', {
  p_release_id: 'audit-probe',
  p_query: 'groin flap',
  p_mode: 'or_prep',
  p_subintent: 'procedure_preparation',
});
function distribution(rows: Record<string, unknown>[], key: string) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const value = String(row[key] ?? 'null');
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}
const liveEligibility = {
  claimRows: claimAuditRows.data?.length ?? 0,
  activeClaims: claimAuditRows.data?.filter((claim) => claim.is_active).length ?? 0,
  currentVersionPointers: claimAuditVersionIds.length,
  currentVersionsFound: claimVersionAuditRows.data?.length ?? 0,
  parentReviewStatus: distribution(claimAuditRows.data ?? [], 'review_status'),
  parentContentSource: distribution(claimAuditRows.data ?? [], 'content_source'),
  versionReviewStatus: distribution(claimVersionAuditRows.data ?? [], 'review_status'),
  versionContentSource: distribution(claimVersionAuditRows.data ?? [], 'content_source'),
  versionApprovalMethod: distribution(claimVersionAuditRows.data ?? [], 'approval_method'),
  exactCounts: {
    claims: allClaimsCount.count,
    activeClaims: activeClaimsCount.count,
    approvedVersions: approvedVersionsCount.count,
    verifiedVersions: verifiedVersionsCount.count,
    approvedVerifiedVersions: eligibleVersionsCount.count,
    cardClaimLinks: allCardLinksCount.count,
  },
  eligibleVersions: (eligibleVersionRows.data ?? []).map((version) => ({
    ...version,
    entityLabel: (entities ?? []).find((entity) => entity.id === version.primary_entity_id)?.preferred_label,
    parent: eligibleClaimRows.data?.find((claim) => claim.id === version.claim_id),
  })),
  eligibleCardLinks: {
    total: eligibleCardLinks.data?.length ?? 0,
    activeApproved: eligibleCardLinks.data?.filter((link) => link.is_active
      && ['approved', 'auto_approved'].includes(link.review_status)).length ?? 0,
  },
  cardLinkPopulation: {
    totalFetched: cardLinkRows.length,
    reviewStatus: distribution(cardLinkRows, 'review_status'),
    approvalMethod: distribution(cardLinkRows, 'approval_method'),
    algorithmVersion: distribution(cardLinkRows, 'algorithm_version'),
    active: cardLinkRows.filter((link) => link.is_active).length,
  },
  productionRpc: productionRpcProbe.error
    ? { available: false, error: productionRpcProbe.error.message }
    : {
        available: true,
        claims: Array.isArray(productionRpcProbe.data?.claims) ? productionRpcProbe.data.claims.length : 0,
        cards: Array.isArray(productionRpcProbe.data?.cardCandidates) ? productionRpcProbe.data.cardCandidates.length : 0,
      },
};
console.log('[claims-audit] live eligibility', JSON.stringify(liveEligibility));
if (process.env.BROBOT_AUDIT_DIAGNOSTICS_ONLY === '1') process.exit(0);

function tokens(value: string) {
  return new Set((value.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []).filter((token) =>
    !new Set(['the','and','for','with','what','explain','points','treatment','tomorrow','changes']).has(token)));
}
function entityMatches(query: string) {
  const q = tokens(query);
  return (entities ?? []).map((entity) => {
    const label = tokens(`${entity.preferred_label} ${entity.normalized_label}`);
    const overlap = [...label].filter((token) => q.has(token)).length;
    return { entity, score: overlap / Math.max(1, label.size) };
  }).filter((row) => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}

async function packetFor(prompt: string, mode: typeof fixtures[number]['mode']): Promise<Packet | null> {
  const { data, error } = await db.rpc('retrieve_brobot_knowledge_v2', {
    p_release_id: BROBOT_KG_PINNED_RELEASE_ID, p_query: prompt,
    p_entity_types: [], p_neighborhood_hints: [], p_predicates: [],
    p_max_candidates: 8, p_max_entities: 8, p_max_relationships: 10,
    p_max_neighborhoods: 2, p_mode: mode, p_subintent: 'general_overview',
    p_max_claims: 8, p_max_cards: 8,
  });
  if (error) throw error;
  const claims = (data?.claims ?? []) as Packet['claims'];
  return {
    retrievalId: crypto.randomUUID(), releaseId: data?.releaseId ?? BROBOT_KG_PINNED_RELEASE_ID,
    status: claims.length ? 'hit' : 'partial', anchors: data?.candidates ?? [],
    facts: data?.facts ?? [], claims, cardCandidates: data?.cardCandidates ?? [],
    neighborhoodSlugs: data?.neighborhoodSlugs ?? [], coverage: data?.coverage ?? 'unknown',
    limitations: data?.limitations ?? [], tokenEstimate: 0,
  };
}

async function answer(fixture: typeof fixtures[number], packet: Packet | null) {
  const intent = chat.preRouteBroBotIntent({ message: fixture.prompt, selectedMode: fixture.mode });
  const context = await chat.buildBroBotAnswerContext({ message: fixture.prompt, intent,
    trainingLevel: fixture.level, responseDepth: 'standard', history: [] });
  context.knowledgePacket = packet;
  const route = chat.routeBroBotAnswer({ message: fixture.prompt, intent, selectedMode: fixture.mode, history: [] });
  const started = performance.now();
  const completion = await openai.chat.completions.create({
    model: getAnswerModelForRoute({ mode: intent.mode, ambiguity: intent.ambiguity, responseDepth: 'standard', subintent: intent.subintent }),
    temperature: 0.1, response_format: { type: 'json_object' },
    messages: chat.buildBroBotChatMessages({ message: fixture.prompt, mode: intent.mode,
      responseDepth: 'standard', trainingLevel: fixture.level, intent, answerContext: context,
      answerRoute: route, includeProductMetadata: false }),
  });
  const output = chat.parseBroBotChatResponse(completion.choices[0]?.message?.content ?? '', {
    fallbackMode: intent.mode, validClaimIds: packet?.claims.map((claim) => claim.claimId),
    knowledgeCoverage: packet?.coverage ?? 'unavailable',
  });
  const gate = chat.runBroBotQualityGate({ answer: output.answer, mode: intent.mode,
    responseDepth: 'standard', subintent: intent.subintent, trainingLevel: fixture.level,
    procedureOrTopic: intent.procedureOrTopic, answerRoute: route,
    clinicalContext: context.clinicalContext, question: fixture.prompt,
    usedClaimIds: output.usedClaimIds, knowledgePacket: packet });
  return { output, warnings: gate.warnings, latencyMs: Math.round(performance.now() - started) };
}

async function judge(prompt: string, claims: string[], baseline: string, grounded: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini', temperature: 0, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'You are a strict orthopaedic education evaluator. Compare A and B against the supplied reviewed claims. Return JSON with winner (A|B|tie), scoresA and scoresB objects containing correctness,specificity,qualifierPreservation,educationalUsefulness each 1-5, and concise reasons. Do not reward unsupported detail.' },
      { role: 'user', content: JSON.stringify({ prompt, reviewedClaims: claims, A: baseline, B: grounded }) },
    ],
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? '{}');
}

const releaseId = await anki.latestPublishedRelease();
const results = [];
for (const fixture of fixtures) {
  const packet = await packetFor(fixture.prompt, fixture.mode);
  const baseline = await answer(fixture, null);
  const grounded = await answer(fixture, packet);
  const cards = releaseId && grounded.output.usedClaimIds?.length
    ? await anki.linkAnkiCardsForClaimIds(grounded.output.usedClaimIds, releaseId, 'audit') : [];
  const evaluation = await judge(fixture.prompt, packet?.claims.map((claim) => claim.claimText) ?? [],
    baseline.output.answer, grounded.output.answer);
  results.push({ fixture, entityAnchors: packet?.anchors.map((anchor) => anchor.label) ?? [],
    eligibleClaimCount: packet?.claims.length ?? 0, baseline, grounded, cardCount: cards.length,
    cards: cards.map((card) => ({ title: card.title, deckPath: card.deckPath, claimId: card.claimId })), evaluation });
  console.log(`[claims-audit] ${fixture.id}: claims=${packet?.claims.length ?? 0} used=${grounded.output.usedClaimIds?.length ?? 0} cards=${cards.length} winner=${evaluation.winner ?? 'unknown'}`);
}

const wins = results.reduce((acc, result) => {
  const key = result.evaluation.winner === 'B' ? 'grounded' : result.evaluation.winner === 'A' ? 'baseline' : 'tie';
  acc[key] += 1; return acc;
}, { grounded: 0, baseline: 0, tie: 0 });
const report = { generatedAt: new Date().toISOString(), liveData: true, liveEligibility, fixtureCount: fixtures.length,
  wins, totalEligibleClaims: results.reduce((sum, result) => sum + result.eligibleClaimCount, 0), results };
const outDir = path.join(process.cwd(), 'reports', process.env.BROBOT_AUDIT_TARGET === 'eligible'
  ? 'brobot-claims-live-audit-eligible' : 'brobot-claims-live-audit');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'summary.md'), [
  '# BroBot Claims Live Audit', '', `Generated: ${report.generatedAt}`, `Paired real chats: ${report.fixtureCount}`,
  `Grounded wins: ${wins.grounded}; baseline wins: ${wins.baseline}; ties: ${wins.tie}`,
  `Eligible reviewed claims retrieved: ${report.totalEligibleClaims}`, '',
  ...results.flatMap((result) => [`## ${result.fixture.id}: ${result.fixture.prompt}`,
    `- Anchors: ${result.entityAnchors.join(', ') || 'none'}`,
    `- Eligible claims: ${result.eligibleClaimCount}; used: ${result.grounded.output.usedClaimIds?.length ?? 0}; cards: ${result.cardCount}`,
    `- Judge winner: ${result.evaluation.winner ?? 'unknown'}`,
    `- Judge: ${JSON.stringify(result.evaluation)}`,
    `- Baseline warnings: ${result.baseline.warnings.join(', ') || 'none'}; latency ${result.baseline.latencyMs} ms`,
    `- Grounded warnings: ${result.grounded.warnings.join(', ') || 'none'}; latency ${result.grounded.latencyMs} ms`,
    '', '### Baseline', result.baseline.output.answer, '', '### Grounded', result.grounded.output.answer, '']),
].join('\n'));
console.log(JSON.stringify({ outDir, wins, totalEligibleClaims: report.totalEligibleClaims }, null, 2));
