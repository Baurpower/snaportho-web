import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const addressExports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('./recipient-address.ts', import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:addressExports});

function load(path, results, dependencies) {
  const writes = [];
  const admin = { auth:{admin:{async getUserById(){return {data:{user:{email:'auth@example.com',email_confirmed_at:'2026-01-01'}},error:null};}}}, from(table) {
    const query = {
      select(){return query;}, eq(){return query;}, maybeSingle(){return query;}, single(){return query;},
      insert(data){writes.push({table,data});return query;}, update(data){writes.push({table,data});return query;},
      then(resolve,reject){assert.ok(results.length,'Unexpected database operation');return Promise.resolve(results.shift()).then(resolve,reject);},
    };return query;
  }};
  const exports = {};
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports, Date, process:{env:{RESEND_WEBHOOK_SECRET:'test'}},
    require(name){if(name==='./recipient-address')return addressExports;if(name==='@/lib/supabase/admin')return {createAdminClient:()=>admin};if(name in dependencies)return dependencies[name];throw Error(name);},
  });
  return {exports,writes};
}
const ok={data:null,error:null};
const next={NextResponse:{json:Response.json.bind(Response)}};
for(const type of ['email.bounced','email.complained','email.suppressed']) {
  for(const failure of [null,'profile','finalize']) {
    const results=[ok,{data:{user_id:'test',email:'test@example.com',metadata:{address_source:type==='email.bounced'?'authentication':'profile'}},error:null},ok,
      failure==='profile'?{error:Error('profile failed')}:ok,
      failure==='finalize'?{error:Error('finalize failed')}:ok];
    if(failure==='finalize')results.push(ok);
    const {exports,writes}=load('../../app/api/webhooks/resend/route.ts',results,{
      'next/server':next,'@/lib/marketing/resend-webhook':{verifyResendWebhook:()=>true},
    });
    const response=await exports.POST(new Request('https://example.com',{method:'POST',headers:{'svix-id':'test'},body:JSON.stringify({type,data:{email_id:'email-1'}})}));
    assert.equal(response.status,failure?500:200);
    assert.ok(writes.some(w=>w.table==='user_profiles'&&w.data.receive_emails===false));
    if(!failure)assert.equal(writes.at(-1).data.processing_error,null);
  }
}
const recipient={userId:'test',email:'test@example.com',campaignKey:'activation',campaignStep:'activation_1',topic:'brobot_learning',templateVersion:'v1',addressSource:'profile'};
for(const mode of ['sent','network','finalize','duplicate','suppressed','render']) {
  let sends=0;
  const results=[{data:{email:'test@example.com',receive_emails:mode!=='suppressed'},error:null},{data:[],error:null}];
  if(mode!=='suppressed')results.push({data:[],error:null});
  if(!['suppressed','render'].includes(mode))results.push(mode==='duplicate'?{error:{code:'23505'}}:{data:{id:'log-1'},error:null});
  if(['sent','finalize'].includes(mode))results.push(mode==='finalize'?{error:{message:'DB unavailable'}}:ok);
  if(['network','finalize'].includes(mode))results.push(ok);
  const {exports,writes}=load('./delivery.ts',results,{
    './templates':{renderMarketingEmail(){if(mode==='render')throw Error('Invalid template');return {unsubscribeUrl:'https://example.com'};}},
    './resend':{async sendMarketingEmail(){sends++;if(mode==='network')throw Error('Timed out');return {id:'provider-1'};}},
  });
  if(['network','finalize','render'].includes(mode))await assert.rejects(exports.deliverMarketingCampaignEmail(recipient));
  else assert.equal((await exports.deliverMarketingCampaignEmail(recipient)).status,mode);
  assert.equal(sends,['sent','network','finalize'].includes(mode)?1:0);
  assert.ok(!writes.some(w=>w.data.send_status==='failed'),'Uncertain deliveries must retain their reservation');
  if(mode==='render')assert.equal(writes.length,0);
}
console.log('Webhook suppression, retry failures, consent, duplicate and ambiguous-send safety tests passed.');

for (const type of ['email.bounced','email.failed']) {
  const {exports,writes}=load('../../app/api/webhooks/resend/route.ts',[ok,{data:{user_id:'test',email:'profile@example.com',metadata:{address_source:'profile'}},error:null},ok],{
    'next/server':next,'@/lib/marketing/resend-webhook':{verifyResendWebhook:()=>true},
  });
  const response=await exports.POST(new Request('https://example.com',{method:'POST',headers:{'svix-id':'profile-failure'},body:JSON.stringify({type,data:{email_id:'primary'}})}));
  assert.equal(response.status,200);
  assert.ok(!writes.some(w=>['user_profiles','lifecycle_email_optouts'].includes(w.table)),'Address failure must not manufacture a user opt-out');
}
for(const blocked of [false,true]) {
  const primary={id:'primary',email:'test@example.com',campaign_key:'activation',campaign_step:'activation_1',template_version:'v1',bounced_at:'2026-09-02',metadata:{address_source:'profile'}};
  const results=[{data:{email:'test@example.com',receive_emails:true},error:null},{data:blocked?[{kind:null}]:[],error:null}];
  if(!blocked)results.push({data:[primary],error:null},{data:{id:'fallback'},error:null},ok);
  let sent=0;
  const {exports,writes}=load('./delivery.ts',results,{'./templates':{renderMarketingEmail:()=>({unsubscribeUrl:'https://example.com'})},'./resend':{async sendMarketingEmail(){sent++;return {id:'fallback-provider'};}}});
  const outcome=await exports.deliverMarketingCampaignEmail({...recipient,email:'auth@example.com',addressSource:'authentication',templateVersion:'v1.auth-fallback',fallbackFromDeliveryId:'primary'});
  assert.equal(outcome.status,blocked?'suppressed':'sent');
  assert.equal(sent,blocked?0:1);
  if(!blocked)assert.equal(writes[0].data.metadata.fallback_from_delivery_id,'primary');
}
console.log('Profile failures queue an auth fallback; account opt-outs still block it.');
