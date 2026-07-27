import assert from 'node:assert/strict';

import { validateOrthobulletsHintDraft } from './hint-quality';

const rsaChoices = [
  { key: '1', text: '58-year-old man with rotator cuff tear arthropathy and well-controlled hypertension' },
  { key: '2', text: '71-year-old woman with massive irreparable rotator cuff tear without arthritis and type 2 diabetes mellitus' },
  { key: '3', text: '76-year-old woman with rheumatoid arthritis, chronic dislocation, and BMI of 28 kg/m²' },
  { key: '4', text: '64-year-old man with primary glenohumeral osteoarthritis, intact rotator cuff, and chronic kidney disease stage 3' },
  { key: '5', text: '69-year-old woman with primary glenohumeral osteoarthritis, intact rotator cuff, and hyperlipidemia' },
];

const priorHints = [{
  hintLevel: 1 as const,
  title: 'Identify risk factors for postoperative complications',
  hint: 'Consider which patient characteristics might predispose someone to bone stress or fragility. Think about age, gender, bone quality, and conditions affecting bone integrity.',
}];

assert.deepEqual(
  validateOrthobulletsHintDraft({
    hintLevel: 2,
    pageContext: { answerChoices: rsaChoices },
    priorHints,
    draft: {
      title: 'Identify risk factors for postoperative complications',
      hint: 'Consider bone quality and mechanical stress. Think about age and conditions affecting bone density.',
    },
  }),
  [
    'repeats the title of Hint 1',
    'Hint 2 does not explicitly contrast stronger and weaker paths',
  ]
);

assert.deepEqual(
  validateOrthobulletsHintDraft({
    hintLevel: 2,
    pageContext: { answerChoices: rsaChoices },
    priorHints,
    draft: {
      title: 'Separate isolated comorbidity from a compounded risk profile',
      hint: 'Prioritize a combination of impaired bone biology and abnormal chronic shoulder mechanics rather than age or a single medical comorbidity alone.',
    },
  }),
  []
);

assert.match(
  validateOrthobulletsHintDraft({
    hintLevel: 1,
    pageContext: { answerChoices: [{ key: '3', text: 'Yield strength' }] },
    priorHints: [],
    draft: {
      title: 'Recognizing Yield Strength',
      hint: 'Think about the transition to irreversible deformation.',
    },
  }).join(' '),
  /reproduces complete answer choice/
);

assert.match(
  validateOrthobulletsHintDraft({
    hintLevel: 3,
    pageContext: { answerChoices: rsaChoices },
    priorHints,
    draft: {
      title: 'Apply the final discriminator',
      hint: 'Choose option 3.',
    },
  }).join(' '),
  /direct answer-selection language/
);

console.log('Orthobullets hint quality tests passed.');
