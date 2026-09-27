import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const manifest = readJson('.next/server/middleware-manifest.json');
const middleware = manifest.middleware['/'];
assert.ok(middleware, 'Anki retirement middleware was not included in the production build');
assert.equal(middleware.name, 'src/middleware');
assert.deepEqual(middleware.matchers.map((matcher) => matcher.originalSource), [
  '/api/anki/search-requests/:path*', '/api/brobot/extension/anki-search/:path*',
]);
const matches = (url) => middleware.matchers.some((matcher) => new RegExp(matcher.regexp).test(url));
for (const url of ['/api/anki/search-requests/pending', '/api/anki/search-requests/id/claim', '/api/brobot/extension/anki-search/id']) {
  assert.ok(matches(url), `Retired route is not intercepted: ${url}`);
}
for (const url of ['/api/brobot-anki/launch/pending', '/api/anki/addon/download', '/api/brobot/chat', '/auth/sign-in', '/']) {
  assert.equal(matches(url), false, `Retirement middleware must not intercept ${url}`);
}

const version = readJson('integrations/snaportho-anki/addon/manifest.json').version;
const tracePath = '.next/server/app/api/anki/addon/download/route.js.nft.json';
const trace = readJson(tracePath);
const packagePath = path.resolve(`dist/snaportho-${version}.ankiaddon`);
assert.ok(existsSync(packagePath), 'Published add-on package is missing');
assert.ok(trace.files.some((file) => path.resolve(path.dirname(tracePath), file) === packagePath),
  'Published add-on package is missing from the server deployment trace');
console.log('Anki retirement middleware and downloadable package are present in the production build.');
