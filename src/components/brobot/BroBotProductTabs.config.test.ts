import assert from 'node:assert/strict';

type BroBotProductTab = {
  id: 'caseprep' | 'chat';
  label: 'CasePrep' | 'Chat';
  href: '/brobot' | '/brobot/chat';
  description: string;
};

const configModulePath = './BroBotProductTabs.config.ts';
const { broBotProductTabs, isBroBotProductTabActive } = (await import(configModulePath)) as {
  broBotProductTabs: BroBotProductTab[];
  isBroBotProductTabActive: (pathname: string | null, tab: BroBotProductTab) => boolean;
};

const casePrep = findTab('caseprep');
const chat = findTab('chat');

assert.equal(casePrep.href, '/brobot');
assert.equal(chat.href, '/brobot/chat');
assert.equal(casePrep.label, 'CasePrep');
assert.equal(chat.label, 'Chat');

assert.equal(isBroBotProductTabActive('/brobot', casePrep), true);
assert.equal(isBroBotProductTabActive('/brobot/chat', casePrep), false);
assert.equal(isBroBotProductTabActive('/brobot/chat', chat), true);
assert.equal(isBroBotProductTabActive('/brobot/chat/thread-1', chat), true);
assert.equal(isBroBotProductTabActive('/brobot/chatty', chat), false);
assert.equal(isBroBotProductTabActive('/BroBot/Chat', chat), false);

function findTab(id: BroBotProductTab['id']) {
  const tab = broBotProductTabs.find((candidate) => candidate.id === id);
  assert.ok(tab, `Expected ${id} tab to exist`);
  return tab;
}
