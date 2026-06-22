import assert from 'node:assert/strict';

import { routeResearchSubmode } from './submode-router';

const examples = [
  ['Find a citation for this sentence', 'reference_finder'],
  ['Review my discussion section', 'manuscript_reviewer'],
  ['Build a literature review on PPI and pseudarthrosis', 'literature_review_builder'],
  ['Does albumin predict nonunion?', 'evidence_synthesis'],
  ['Find must-read papers on TKA instability', 'journal_scout'],
  ['Help me design a systematic review', 'systematic_review_assistant'],
  ['Review my stats section', 'statistical_reviewer'],
  ['Help design a TriNetX study', 'research_planning'],
] as const;

for (const [message, expectedSubmode] of examples) {
  const route = routeResearchSubmode({ message, selectedMode: 'research' });
  assert.ok(route, message);
  assert.equal(route?.submode, expectedSubmode, message);
  assert.equal(route?.source, 'deterministic', message);
  assert.ok(route?.confidence && route.confidence >= 0.8, message);
}

const nonResearch = routeResearchSubmode({
  message: 'Find a citation for this sentence',
  selectedMode: 'oite',
});
assert.equal(nonResearch, null);

const fallback = routeResearchSubmode({
  message: 'Talk through this research idea',
  selectedMode: 'research',
});
assert.equal(fallback?.submode, 'evidence_synthesis');
assert.equal(fallback?.source, 'fallback');

console.log('BroBot research submode router tests passed');
