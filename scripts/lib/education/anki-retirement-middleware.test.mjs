import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const config = readFileSync('next.config.ts', 'utf8');
const payload = JSON.parse(readFileSync('public/retired/anki-search-pending.json', 'utf8'));
const sessionMiddleware = readFileSync('src/utils/supabase/middleware.ts', 'utf8');

assert.equal(existsSync('src/middleware.ts'), false, 'retired polling must not execute middleware');
assert.equal(existsSync('src/lib/anki/retired-search-relay.ts'), false, 'dynamic retirement responder must stay removed');
assert.deepEqual(payload, { requests: [], retired: true });
assert.match(config, /source:\s*['"]\/api\/anki\/search-requests\/pending['"]/);
assert.match(config, /destination:\s*['"]\/retired\/anki-search-pending\.json['"]/);
assert.match(config, /s-maxage=86400/);
assert.doesNotMatch(sessionMiddleware, /retiredAnkiSearchResponse/);
assert.match(sessionMiddleware, /pathname === ['"]\/api\/brobot-anki\/launch\/pending['"]/);

console.log('anki-retirement-middleware.test.mjs: static retirement response is configured without middleware.');
