// Disposable production smoke test. Sends no email; touches only a newly created test user.
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createMarketingPreferenceToken } from '../src/lib/marketing/preferences-token';

if (!process.argv.includes('--confirm=TEST-DISPOSABLE-USER')) throw Error('Explicit disposable-user test confirmation required');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {auth:{persistSession:false}});
const run = randomUUID();
const email = `campaign-preflight-${run}@example.com`;
const eventId = `prelaunch-smoke-${run}`;
const providerId = `prelaunch-${run}`;
const base='https://snap-ortho.com';
const {data, error} = await db.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'Disposable campaign preflight'}});
if(error || !data.user) throw error || Error('No test user');
const userId=data.user.id;
async function checked(operation: PromiseLike<{error:unknown}>) {const {error}=await operation;if(error)throw error;}
try {
  await checked(db.from('user_profiles').upsert({user_id:userId,email,full_name:'Disposable campaign preflight',receive_emails:true}));
  const token=createMarketingPreferenceToken({userId,email,topic:'brobot_learning'});
  const response=await fetch(`${base}/api/email/preferences?token=${encodeURIComponent(token)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,204,'Live one-click unsubscribe');
  const {data:optout,error:lookupError}=await db.from('lifecycle_email_optouts').select('kind').eq('user_id',userId);
  if(lookupError)throw lookupError;
  assert.ok(optout?.some(row=>row.kind==='brobot_learning'));
  console.log('Live one-click unsubscribe: PASS');
  await checked(db.from('lifecycle_emails').insert({user_id:userId,email,kind:'prelaunch_smoke_test',campaign_key:'prelaunch_smoke_test',campaign_step:'smoke_test',template_version:run,send_status:'sent',resend_email_id:providerId}));
  const body=JSON.stringify({type:'email.bounced',data:{email_id:providerId,to:[email]},test:true});
  const timestamp=String(Math.floor(Date.now()/1000));
  const secret=process.env.RESEND_WEBHOOK_SECRET!.trim().replace(/^whsec_/,'');
  const signature=createHmac('sha256',Buffer.from(secret,'base64')).update(`${eventId}.${timestamp}.${body}`).digest('base64');
  const eventResponse=await fetch(`${base}/api/webhooks/resend`,{method:'POST',headers:{'Content-Type':'application/json','svix-id':eventId,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`},body,signal:AbortSignal.timeout(15000)});
  assert.equal(eventResponse.status,200,'Live simulated bounce webhook');
  const {data:profile,error:profileError}=await db.from('user_profiles').select('receive_emails').eq('user_id',userId).single();
  if(profileError)throw profileError;
  assert.equal(profile.receive_emails,false);
  const {data:global,error:globalError}=await db.from('lifecycle_email_optouts').select('kind').eq('user_id',userId).is('kind',null);
  if(globalError)throw globalError;
  assert.equal(global?.length,1);
  const optin=await fetch(`${base}/api/email/preferences?token=${encodeURIComponent(token)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'scope=all_on',signal:AbortSignal.timeout(15000)});
  assert.equal(optin.status,409,'Provider suppression survives resubscribe');
  console.log('Live simulated bounce and suppression protection: PASS');
} finally {
  await checked(db.from('marketing_email_webhook_events').delete().eq('provider_event_id',eventId));
  await checked(db.from('lifecycle_emails').delete().eq('user_id',userId));
  await checked(db.from('lifecycle_email_optouts').delete().eq('user_id',userId));
  await checked(db.auth.admin.deleteUser(userId));
  console.log('Disposable test user and test delivery/event records removed. No email sent.');
}
