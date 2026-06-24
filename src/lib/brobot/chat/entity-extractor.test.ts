import assert from 'node:assert/strict';

import {
  extractOrthoEntity,
  entityToTopic,
  hasOrthoEntity,
  resolveTopicFromHistory,
} from './entity-extractor';

// --- extractOrthoEntity ---

const proximalHumerus = extractOrthoEntity('What is the approach to the proximal humerus?');
assert.equal(proximalHumerus.bone, 'proximal humerus');
assert.equal(proximalHumerus.region, 'shoulder');
assert.equal(entityToTopic(proximalHumerus), 'proximal humerus');

const reverseObliquity = extractOrthoEntity('What if it is a reverse obliquity intertroch fracture?');
assert.equal(reverseObliquity.bone, 'intertrochanteric femur');
assert.equal(reverseObliquity.fracturePattern, 'reverse obliquity');

const distalRadius = extractOrthoEntity('distal radius ORIF steps');
assert.equal(distalRadius.bone, 'distal radius');
assert.equal(distalRadius.region, 'wrist');
assert.equal(distalRadius.procedure, 'ORIF');

const reverseTsa = extractOrthoEntity('Indications for reverse TSA?');
assert.equal(reverseTsa.procedure, 'reverse total shoulder arthroplasty');
assert.equal(entityToTopic(reverseTsa), 'reverse total shoulder arthroplasty');

const namedApproach = extractOrthoEntity('Walk me through the deltopectoral approach');
assert.equal(namedApproach.procedure, 'deltopectoral approach');

const laterality = extractOrthoEntity('left distal radius fracture');
assert.equal(laterality.laterality, 'left');

// Region-only when no specific bone is named.
const regionOnly = extractOrthoEntity('What is the approach to the elbow?');
assert.equal(regionOnly.bone, undefined);
assert.equal(regionOnly.region, 'elbow');
assert.equal(entityToTopic(regionOnly), 'elbow');

// Non-ortho / chip-label fragments yield no entity.
assert.equal(entityToTopic(extractOrthoEntity('Axillary nerve risk')), null);
assert.equal(entityToTopic(extractOrthoEntity('Tell me more')), null);
assert.equal(hasOrthoEntity('Axillary nerve risk'), false);
assert.equal(hasOrthoEntity('proximal humerus'), true);

// --- resolveTopicFromHistory ---

// Direct: message itself has the entity.
assert.equal(
  resolveTopicFromHistory({
    message: 'How do I classify ankle fractures?',
    history: [],
  }),
  'ankle'
);

// Continuation: chip label has no entity -> anchor to the learner's prior topic.
assert.equal(
  resolveTopicFromHistory({
    message: 'Axillary nerve risk',
    history: [
      { role: 'user', content: 'What is the approach to the proximal humerus?' },
      { role: 'assistant', content: 'The deltopectoral approach is preferred...' },
    ],
  }),
  'proximal humerus'
);

// Nothing anywhere -> null.
assert.equal(
  resolveTopicFromHistory({
    message: 'Tell me more',
    history: [{ role: 'user', content: 'hello' }],
  }),
  null
);

console.log('BroBot entity-extractor tests passed');
