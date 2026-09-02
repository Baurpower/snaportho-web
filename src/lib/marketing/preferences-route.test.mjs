import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual route with an in-memory database adapter. No live opt-outs
// or customer preferences are changed by these tests.
const source = readFileSync(new URL('../../app/api/email/preferences/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
async function run(scope, results, token = 'valid') {
  const writes = [];
  const admin = { from(table) {
    const query = {
      select() { return query; }, eq() { return query; }, is() { return query; },
      maybeSingle() { return query; },
      insert(data) { writes.push({table, method:'insert', data}); return query; },
      update(data) { writes.push({table, method:'update', data}); return query; },
      then(resolve, reject) {
        assert.ok(results.length, 'Unexpected database operation');
        return Promise.resolve(results.shift()).then(resolve, reject);
      },
    };
    return query;
  }};
  class NextResponse extends Response {
    static json(value, options) { return Response.json(value, options); }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Response, URL, Date,
    require(name) {
      if (name === 'next/server') return { NextResponse };
      if (name === '@/lib/supabase/admin') return { createAdminClient: () => admin };
      if (name === '@/lib/marketing/preferences-token') return { verifyMarketingPreferenceToken(value) {
        if (value !== 'valid') throw Error('Invalid token');
        return { userId:'test-user', email:'test@example.com', topic:'brobot_learning' };
      }};
      throw Error(`Unexpected dependency: ${name}`);
    },
  });
  const response = await exports.POST(new Request(`https://snap-ortho.com/api/email/preferences?token=${token}`, {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams(scope === 'oneClick' ? {'List-Unsubscribe':'One-Click'} : {scope}),
  }));
  return {response, writes};
}
const ok = {data:null, error:null};
let result = await run('topic', [ok, ok]);
assert.equal(result.response.status, 200, 'A successful first opt-out must not report failure');
assert.match(await result.response.text(), /unsubscribed from this email topic/);
result = await run('oneClick', [ok, ok]);
assert.equal(result.response.status, 204);
result = await run('all', [ok, ok, ok]);
assert.equal(result.response.status, 200);
assert.equal(result.writes[1].data.receive_emails, false);
result = await run('all', [ok, ok, {error:{code:'failed'}}]);
assert.equal(result.response.status, 500, 'Do not claim a global opt-out succeeded when the profile update failed');
result = await run('topic', [ok, {error:{code:'23505'}}]);
assert.equal(result.response.status, 200, 'A concurrent duplicate opt-out is already saved');
result = await run('topic', [ok, {error:{code:'failed'}}]);
assert.equal(result.response.status, 500);
result = await run('topic', [], 'invalid');
assert.equal(result.response.status, 400);
assert.equal(result.writes.length, 0);
console.log('Email preference route success, failure, duplicate, one-click and invalid-token tests passed.');
