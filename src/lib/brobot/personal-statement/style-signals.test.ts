import assert from 'node:assert/strict';
import { extractMeasuredStyleSignals } from './style-signals';

assert.equal(extractMeasuredStyleSignals('Plain sentence. Another plain sentence.').emDashConcern, 'minor_concern');
assert.equal(extractMeasuredStyleSignals('A — B — C — D.').emDashConcern, 'worth_reviewing');
assert.equal(extractMeasuredStyleSignals('A — B — C — D — E — F — G.').emDashConcern, 'likely_noticeable');

const patterned = extractMeasuredStyleSignals('What I learned was simple. We drove impact through stakeholder engagement and an unwavering commitment to resilience.');
assert.equal(patterned.tedTalkCueCount, 1);
assert.deepEqual(patterned.consultantPhraseMatches, ['drove impact', 'stakeholder engagement']);
assert.deepEqual(patterned.marketingPhraseMatches, ['unwavering commitment']);
assert.equal(patterned.abstractVirtueMentions.resilience, 1);

const repeated = extractMeasuredStyleSignals('I realized the plan was wrong. Later, I realized the handoff was unclear. Resilience, adaptability, and leadership mattered.');
assert.equal(repeated.reflectionCueCount, 2);
assert.equal(repeated.threePartListCount, 1);

console.log('personal statement style signal tests passed');
