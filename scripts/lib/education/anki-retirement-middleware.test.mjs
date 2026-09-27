import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require('next/server');
let sessionLookups = 0;
function loadModule(relativePath) {
const exports = {};
const source = readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(compiled, {
  exports, process, console,
  require(name) {
    if (name === 'next/server') return { NextResponse };
    if (name === '@/lib/anki/retired-search-relay') return loadModule('src/lib/anki/retired-search-relay.ts');
    if (name === '@supabase/ssr') return {
      createServerClient() {
        sessionLookups += 1;
        return { auth: { getUser: async () => ({ data: { user: null } }) } };
      },
    };
    if (name === '@/lib/auth/public-provider-webhook-path') return { isPublicProviderWebhookPath: () => false };
    if (name === '@/lib/marketing/links') return { isMarketingAppPath: () => false };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
return exports;
}
const exports = loadModule('src/utils/supabase/middleware.ts');
const deployed = loadModule('src/middleware.ts');
assert.deepEqual(Array.from(deployed.config.matcher), [
  '/api/anki/search-requests/:path*', '/api/brobot/extension/anki-search/:path*',
]);

async function request(path, method = 'GET') {
  return exports.updateSession(new NextRequest(`https://snap-ortho.com${path}`, { method }));
}
for (const suffix of ['', '/', '?limit=10']) {
  const response = await request(`/api/anki/search-requests/pending${suffix}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { requests: [], retired: true });
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
}
for (const [path, method] of [
  ['/api/anki/search-requests/id/claim', 'POST'],
  ['/api/anki/search-requests/id/complete', 'POST'],
  ['/api/brobot/extension/anki-search', 'POST'],
  ['/api/brobot/extension/anki-search/id', 'GET'],
]) {
  const response = await request(path, method);
  assert.equal(response.status, 410);
  assert.equal((await response.json()).code, 'anki_search_retired');
  assert.equal(response.headers.get('location'), null);
}
assert.equal(sessionLookups, 0, 'retired requests must never initialize Supabase');
assert.equal((await request('/api/brobot-anki/launch/pending')).headers.get('x-middleware-next'), '1');
assert.equal(sessionLookups, 0, 'launch polling keeps its device-auth bypass');
for (const path of ['/api/anki/reviewer/queue', '/api/anki/search-requests-other']) {
  const response = await request(path);
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).pathname, '/auth/sign-in');
}
assert.equal(sessionLookups, 2, 'other routes retain session protection');
console.log('anki-retirement-middleware.test.mjs: all assertions passed');

// Exercise the entrypoint discovered by Next.js, not just the session helper.
const poll = deployed.middleware(new NextRequest('https://snap-ortho.com/api/anki/search-requests/pending'));
assert.equal(poll.status, 200);
assert.deepEqual(await poll.json(), { requests: [], retired: true });
assert.equal(deployed.middleware(new NextRequest('https://snap-ortho.com/api/brobot/extension/anki-search/id')).status, 410);
assert.equal(deployed.middleware(new NextRequest('https://snap-ortho.com/api/brobot-anki/launch/pending')).headers.get('x-middleware-next'), '1');
