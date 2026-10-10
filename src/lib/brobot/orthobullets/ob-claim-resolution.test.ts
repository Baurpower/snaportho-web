import assert from 'node:assert/strict';
import { exactDurableIdentity } from './claim-extraction-contract-v1';
import {
  resolveObClaimCandidate,
  type ObResolutionCandidateRow,
  type ObResolutionDeps,
} from './ob-claim-resolution';

const TEXT = 'The radial nerve travels in the spiral groove along the posterior humeral shaft.';
const candidate = {
  candidateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  index: 0, text: TEXT, importance: 'primary' as const, claimType: 'anatomy' as const,
  qualifiers: { anatomy: 'humeral shaft' },
  support: ['explanation'] as Array<'explanation'>,
  generator: { model: 'm', promptVersion: 'g', confidence: 0.9 },
  factual: { verdict: 'supported' as const, reason: 'r' },
  quality: { verdict: 'good' as const, reason: 'r' },
  repairs: [],
  finalFactual: 'supported' as const, finalQuality: 'good' as const,
  validator: { verdict: 'accept' as const, reason: 'r' },
  accepted: true,
};

const identity = exactDurableIdentity({ claimText: TEXT, claimType: 'anatomy', qualifiers: { anatomy: 'humeral shaft' } });

const claimRow = (overrides: Partial<ObResolutionCandidateRow> = {}): ObResolutionCandidateRow => ({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  claimText: TEXT, claimType: 'anatomy', qualifiers: { anatomy: 'humeral shaft' },
  fingerprintHash: identity.structuralHash, semanticFingerprintHash: identity.semanticHash,
  isActive: true, createdAt: '2026-01-01T00:00:00.000Z', algorithmVersion: 'orthobullets-claims-prod.v1',
  ...overrides,
});

const emptyDeps: ObResolutionDeps = {
  findByExactIdentity: async () => [],
  findBySemanticHash: async () => [],
  findTextNeighbors: async () => [],
};

function stubClient(outputs: Array<string | Error>) {
  let calls = 0;
  return {
    chat: {
      completions: {
        create: async () => {
          const output = outputs[Math.min(calls, outputs.length - 1)];
          calls += 1;
          if (output instanceof Error) throw output;
          return { choices: [{ message: { content: output } }], usage: { prompt_tokens: 3, completion_tokens: 2 } };
        },
      },
    },
  };
}

const options = (client: ReturnType<typeof stubClient>) => ({ client: client as never, model: 'm' });

// Exact identity reuses deterministically (oldest wins), no model call.
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findByExactIdentity: async () => [
      claimRow({ id: 'c2', createdAt: '2026-02-01T00:00:00.000Z' }),
      claimRow({ id: 'c1', createdAt: '2026-01-01T00:00:00.000Z' }),
    ],
  };
  const outcome = await resolveObClaimCandidate(candidate, deps, options(stubClient([])));
  assert.equal(outcome.decision, 'reuse');
  assert.equal(outcome.resolvedClaimId, 'c1');
  assert.equal(outcome.records[0].verdict, 'exact_identity');
  assert.equal(outcome.usage.modelCalls, 0);
}

// Exact lookup ignores inactive rows.
{
  const deps: ObResolutionDeps = { ...emptyDeps, findByExactIdentity: async () => [claimRow({ isActive: false })] };
  const outcome = await resolveObClaimCandidate(candidate, deps, options(stubClient([])));
  assert.equal(outcome.decision, 'create');
}

// No candidates anywhere: create.
{
  const outcome = await resolveObClaimCandidate(candidate, emptyDeps, options(stubClient([])));
  assert.equal(outcome.decision, 'create');
  assert.equal(outcome.records[0].examinedClaimId, null);
  assert.equal(outcome.usage.modelCalls, 0);
}

// Equivalent verdict reuses (oldest equivalent).
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findBySemanticHash: async () => [claimRow({ id: 's1' }), claimRow({ id: 's2', createdAt: '2026-03-01T00:00:00.000Z' })],
  };
  const client = stubClient([JSON.stringify({
    verdicts: [
      { claim_id: 's1', verdict: 'equivalent', reason: 'same proposition' },
      { claim_id: 's2', verdict: 'equivalent', reason: 'same proposition' },
    ],
  })]);
  const outcome = await resolveObClaimCandidate(candidate, deps, options(client));
  assert.equal(outcome.decision, 'reuse');
  assert.equal(outcome.resolvedClaimId, 's1');
  assert.equal(outcome.usage.modelCalls, 1);
}

// Related-but-distinct preserves distinction: create, no merge.
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findTextNeighbors: async () => [claimRow({ id: 'n1', claimText: 'The radial nerve is at risk in humeral shaft fractures.' })],
  };
  const client = stubClient([JSON.stringify({
    verdicts: [{ claim_id: 'n1', verdict: 'related_but_distinct', reason: 'different proposition' }],
  })]);
  const outcome = await resolveObClaimCandidate(candidate, deps, options(client));
  assert.equal(outcome.decision, 'create');
  assert.equal(outcome.resolvedClaimId, null);
  assert.equal(outcome.records[0].verdict, 'related_but_distinct');
}

// Contradiction blocks creation: unresolved, never silent fork.
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findTextNeighbors: async () => [claimRow({ id: 'n1' })],
  };
  const client = stubClient([JSON.stringify({
    verdicts: [{ claim_id: 'n1', verdict: 'contradictory', reason: 'opposite polarity' }],
  })]);
  const outcome = await resolveObClaimCandidate(candidate, deps, options(client));
  assert.equal(outcome.decision, 'unresolved');
  assert.equal(outcome.resolvedClaimId, null);
}

// Unknown applicability abstains; uncertainty cannot authorize a new assertion.
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findTextNeighbors: async () => [claimRow({ id: 'n1' })],
  };
  const client = stubClient([JSON.stringify({
    verdicts: [{ claim_id: 'n1', verdict: 'uncertain', reason: 'cannot decide' }],
  })]);
  const outcome = await resolveObClaimCandidate(candidate, deps, options(client));
  assert.equal(outcome.decision, 'unresolved');
}

// Malformed / incomplete / failed equivalence review: unresolved + diagnostic.
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findTextNeighbors: async () => [claimRow({ id: 'n1' })],
  };
  for (const [label, output] of [
    ['unparseable', 'not json'],
    ['bad-shape', JSON.stringify({ nope: [] })],
    ['missing-verdict', JSON.stringify({ verdicts: [] })],
    ['bad-verdict', JSON.stringify({ verdicts: [{ claim_id: 'n1', verdict: 'same', reason: 'x' }] })],
  ] as const) {
    const outcome = await resolveObClaimCandidate(candidate, deps, options(stubClient([output])));
    assert.equal(outcome.decision, 'unresolved', label);
    assert.ok(outcome.diagnostic, label);
  }
  const outcome = await resolveObClaimCandidate(candidate, deps, options(stubClient([new Error('boom')])));
  assert.equal(outcome.decision, 'unresolved');
  assert.equal(outcome.diagnostic, 'equivalence_unavailable');
}

// Request shape: timeout rides the SDK options argument, never the body
// (body timeout is a live 400: "Unrecognized request argument supplied: timeout").
{
  const deps: ObResolutionDeps = {
    ...emptyDeps,
    findTextNeighbors: async () => [claimRow({ id: 'n1', claimText: 'The radial nerve is at risk in humeral shaft fractures.' })],
  };
  const seen: Array<{ body: Record<string, unknown>; options: unknown }> = [];
  const client = {
    chat: {
      completions: {
        create: (body: Record<string, unknown>, options: unknown) => {
          seen.push({ body, options });
          return Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  verdicts: [{ claim_id: 'n1', verdict: 'related_but_distinct', reason: 'different proposition' }],
                }),
              },
            }],
            usage: { prompt_tokens: 3, completion_tokens: 2 },
          });
        },
      },
    },
  };
  const outcome = await resolveObClaimCandidate(candidate, deps, {
    client: client as never, model: 'm', requestTimeoutMs: 4242,
  });
  assert.equal(outcome.decision, 'create');
  assert.equal(seen.length, 1);
  assert.equal('timeout' in (seen[0]?.body ?? {}), false);
  assert.deepEqual(seen[0]?.options, { timeout: 4242 });
}

console.log('ob-claim-resolution.test.ts: all assertions passed');

// A matching claim must not hide an independently confirmed conflict.
{
 const deps = {...emptyDeps, findTextNeighbors: async()=>[claimRow({id:'same'}),claimRow({id:'opposite'})]};
 const result = await resolveObClaimCandidate(candidate,deps,options(stubClient([
  JSON.stringify({verdicts:[{claim_id:'same',verdict:'equivalent',reason:'same'},{claim_id:'opposite',verdict:'contradictory',reason:'opposite'}]}),
  JSON.stringify({verdicts:[{claim_id:'opposite',verdict:'contradictory',reason:'same scope'}]}),
 ])));
 assert.equal(result.decision,'unresolved');assert.equal(result.usage.modelCalls,2);
 assert.equal(result.records.reduce((sum,row)=>sum+row.usage.promptTokens,0),result.usage.promptTokens);
}
// A scoped second pass can correct a comparison of different outcomes.
{
 const deps = {...emptyDeps,findTextNeighbors:async()=>[claimRow({id:'different-outcome'})]};
 const result=await resolveObClaimCandidate(candidate,deps,options(stubClient([
 JSON.stringify({verdicts:[{claim_id:'different-outcome',verdict:'contradictory',reason:'initial comparison'}]}),
 JSON.stringify({verdicts:[{claim_id:'different-outcome',verdict:'related_but_distinct',reason:'different outcomes'}]}),
 ])));
 assert.equal(result.decision,'create');assert.match(result.records[0].reason,/scoped_recheck/);
}
// Duplicate ids fail closed instead of silently replacing a decision.
{
 const result=await resolveObClaimCandidate(candidate,{...emptyDeps,findTextNeighbors:async()=>[claimRow({id:'duplicate'})]},options(stubClient([
 JSON.stringify({verdicts:[{claim_id:'duplicate',verdict:'equivalent',reason:'a'},{claim_id:'duplicate',verdict:'related_but_distinct',reason:'b'}]})
 ])));
 assert.equal(result.decision,'unresolved');assert.match(result.diagnostic??'',/duplicate/);
}
