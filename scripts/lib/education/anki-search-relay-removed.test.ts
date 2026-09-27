import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../../..");
const migration=readFileSync(path.join(root,"supabase/migrations/20260726_160000_extension_anki_search_relay.sql"),"utf8");
const queryKinds=readFileSync(path.join(root,"supabase/migrations/20260726_200000_anki_search_query_kinds.sql"),"utf8");
// The relay tables remain (migrations are never rewritten); the schema pins stay valid.
for(const pattern of [/force row level security/,/question_fingerprint_hash/,/normalized_native_id/,/claim_expires_at/,/educational_metadata_is_safe/,/open_browse_and_return_results/])assert.match(migration,pattern);
assert.doesNotMatch(migration,/\b(stem|answer_choices|raw_html|explanation_text)\b/i);
for(const pattern of[/query_kind/,/topic_page/,/page_sections/,/page_sections_match_kind/])assert.match(queryKinds,pattern);
// The relay itself is removed: no server routes, no addon polling/claim surface,
// no extension send-to-anki message paths. Old clients poll dead air otherwise.
for(const routeDir of ["src/app/api/anki/search-requests","src/app/api/brobot/extension/anki-search"]){
  assert.equal(existsSync(path.join(root,routeDir)),false,`${routeDir} must stay removed`);
}
const addonApi=readFileSync(path.join(root,"integrations/snaportho-anki/addon/snaportho_reviewer/api.py"),"utf8");
for(const gone of ["pending_search_requests","claim_search_request","complete_search_request"])assert.doesNotMatch(addonApi,new RegExp(gone));
assert.match(addonApi,/pending_launches/);
const bootstrap=readFileSync(path.join(root,"integrations/snaportho-anki/addon/snaportho_reviewer/bootstrap.py"),"utf8");
for(const gone of ["poll_search_relay","search_relay_timer","_claimed_search","_resolve_relay_search"])assert.doesNotMatch(bootstrap,new RegExp(gone));
assert.match(bootstrap,/poll_launches/);
const messages=readFileSync(path.join(root,"extensions/orthobullets-brobot/src/shared/messages.ts"),"utf8");
for(const gone of ["ob:send-to-anki","ob:send-page-to-anki","ob:send-test-to-anki","ob:get-anki-search-status"])assert.doesNotMatch(messages,new RegExp(gone.replace(/[:+]/g,(c)=>`\\${c}`)));
assert.match(messages,/ob:open-anki-launch/);
const background=readFileSync(path.join(root,"extensions/orthobullets-brobot/src/background.ts"),"utf8");
assert.doesNotMatch(background,/\/api\/brobot\/extension\/anki-search/);
console.log("anki-search-relay-removed.test.ts: all assertions passed");
