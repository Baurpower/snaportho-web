import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const middlewareManifest = readJson('.next/server/middleware-manifest.json');
assert.deepEqual(middlewareManifest.middleware, {}, 'production build must not contain request middleware');

const routes = readJson('.next/routes-manifest.json');
const rewriteEntries = Array.isArray(routes.rewrites)
  ? routes.rewrites
  : [...routes.rewrites.beforeFiles, ...routes.rewrites.afterFiles, ...routes.rewrites.fallback];
const rewrite = rewriteEntries
  .find((item) => item.source === '/api/anki/search-requests/pending');
assert.ok(rewrite, 'static compatibility rewrite is missing');
assert.equal(rewrite.destination, '/retired/anki-search-pending.json');
assert.deepEqual(readJson('public/retired/anki-search-pending.json'), { requests: [], retired: true });

const version = readJson('integrations/snaportho-anki/addon/manifest.json').version;
const tracePath = '.next/server/app/api/anki/addon/download/route.js.nft.json';
const trace = readJson(tracePath);
const packagePath = path.resolve(`dist/snaportho-${version}.ankiaddon`);
assert.ok(existsSync(packagePath), 'published add-on package is missing');
assert.ok(trace.files.some((file) => path.resolve(path.dirname(tracePath), file) === packagePath),
  'published add-on package is missing from the server deployment trace');
console.log('Static Anki retirement response and downloadable package are present in the production build.');
