import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { BROBOT_PERSONAL_STATEMENT_COMPARISON_MODEL } from '@/lib/brobot/model-config';
import { getBroBotAccessGate } from '@/lib/brobot/brobot-entitlement-access';
import { recordSuccessfulAIUse, recordUsageEvent } from '@/lib/brobot/usage';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildComparisonPrompt, buildDirectComparisonPrompt, hashStatement, normalizeStatementText, parseAndVerifyReview, parseComparison, validateStatementLength } from '@/lib/brobot/personal-statement/contract';
import { PERSONAL_STATEMENT_COMPARISON_JSON_SCHEMA } from '@/lib/brobot/personal-statement/model-schema';
import { PERSONAL_STATEMENT_COMPARISON_PROMPT_VERSION, PERSONAL_STATEMENT_COMPARISON_SCHEMA_VERSION, PERSONAL_STATEMENT_SCHEMA_VERSION } from '@/lib/brobot/personal-statement/types';
import { BROBOT_CONFIG } from '@/lib/config/brobot';

export const runtime = 'nodejs'; export const maxDuration = 60;
const RequestSchema = z.union([
  z.object({ reviewIdA:z.string().uuid(), reviewIdB:z.string().uuid() }),
  z.object({ textA:z.string(), textB:z.string() }),
]);
const fail=(error:string,message:string,status:number)=>NextResponse.json({error,message},{status});

export async function POST(request:Request){
  const startedAt=Date.now(); const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return fail('unauthorized','Sign in to compare drafts.',401);
  const parsed=RequestSchema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return fail('invalid_comparison','Provide two different saved reviews or two drafts.',400);
  const subject={type:'user' as const,id:user.id};
  try{
    const gate=await getBroBotAccessGate(subject); if(BROBOT_CONFIG.PS_COMPARISON_PAID_ONLY&&!gate.isUnlimited)return fail('comparison_requires_upgrade','Draft comparison is available with BroBot Unlimited.',403);
    let textA:string;let textB:string;let reviewIdA:string|null=null;let reviewIdB:string|null=null;let prompt:string;
    if('reviewIdA'in parsed.data){
      const requestedReviewIdA=parsed.data.reviewIdA;const requestedReviewIdB=parsed.data.reviewIdB;
      if(requestedReviewIdA===requestedReviewIdB)return fail('invalid_comparison','Choose two different saved reviews.',400);
      const {data:rows,error}=await createAdminClient().from('personal_statement_reviews').select('id,statement_text,statement_hash,review_json').eq('user_id',user.id).eq('review_schema_version',PERSONAL_STATEMENT_SCHEMA_VERSION).in('id',[requestedReviewIdA,requestedReviewIdB]);
      if(error||!rows||rows.length!==2)return fail('review_not_found','One or both saved reviews could not be found.',404);
      const a=rows.find((row)=>row.id===requestedReviewIdA)!;const b=rows.find((row)=>row.id===requestedReviewIdB)!;
      textA=normalizeStatementText(a.statement_text);textB=normalizeStatementText(b.statement_text);reviewIdA=a.id;reviewIdB=b.id;
      prompt=buildComparisonPrompt(textA,parseAndVerifyReview(a.review_json,textA),textB,parseAndVerifyReview(b.review_json,textB));
    }else{textA=normalizeStatementText(parsed.data.textA);textB=normalizeStatementText(parsed.data.textB);prompt=buildDirectComparisonPrompt(textA,textB)}
    const hashA=hashStatement(textA);const hashB=hashStatement(textB);if(hashA===hashB)return fail('duplicate_statements','Choose two drafts with different text.',400);
    if(!validateStatementLength(textA).ok||!validateStatementLength(textB).ok)return fail('invalid_comparison','Both drafts must meet the 150–1,500 word review limits.',400);
    const completion=await getOpenAI().chat.completions.create({model:BROBOT_PERSONAL_STATEMENT_COMPARISON_MODEL,messages:[{role:'user',content:prompt}],response_format:PERSONAL_STATEMENT_COMPARISON_JSON_SCHEMA,temperature:0.2});
    const content=completion.choices[0]?.message?.content;if(!content)return fail('invalid_model_response','BroBot could not prepare a valid comparison.',502);const comparison=parseComparison(JSON.parse(content));
    const {data:stored,error:storeError}=await createAdminClient().from('personal_statement_comparisons').insert({user_id:user.id,source_review_id_a:reviewIdA,source_review_id_b:reviewIdB,statement_hash_a:hashA,statement_hash_b:hashB,model:BROBOT_PERSONAL_STATEMENT_COMPARISON_MODEL,prompt_version:PERSONAL_STATEMENT_COMPARISON_PROMPT_VERSION,comparison_schema_version:PERSONAL_STATEMENT_COMPARISON_SCHEMA_VERSION,comparison_json:comparison}).select('id,created_at').single();
    if(storeError)throw new Error('comparison_persistence_failed');await recordSuccessfulAIUse(subject,Date.now()-startedAt);return NextResponse.json({id:stored.id,createdAt:stored.created_at,comparison});
  }catch(error){await recordUsageEvent({subject,outcome:'failure',latencyMs:Date.now()-startedAt});console.error('[personal-statement-comparison] failed',{category:error instanceof Error?error.name:'unknown'});return fail('comparison_failed','The comparison could not be completed. Your allowance was not used.',500)}
}
