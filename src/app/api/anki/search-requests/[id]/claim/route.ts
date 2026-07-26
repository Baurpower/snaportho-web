import { NextResponse } from "next/server";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateBroBotAnkiRequest(request);
  if("response"in auth)return auth.response;
  if(auth.authMethod!=="device_token"||!auth.deviceTokenId)
    return NextResponse.json({error:"Anki device authentication required"},{status:401});
  const{id}=await params,claimExpiresAt=new Date(Date.now()+60_000).toISOString();
  const{data,error}=await auth.supabase.from("educational_anki_search_requests").update({
    status:"claimed",claimed_by_device_token_id:auth.deviceTokenId,claim_expires_at:claimExpiresAt,
  }).eq("id",id).eq("user_id",auth.userId).eq("status","queued").gt("expires_at",new Date().toISOString())
    .select("id,provider,query_kind,normalized_native_id,tested_concept,concept_summary,search_keywords,page_sections,concept_source,status,expires_at").maybeSingle();
  if(error)return NextResponse.json({error:"search claim unavailable"},{status:500});
  if(!data)return NextResponse.json({error:"search already claimed or expired"},{status:409});
  return NextResponse.json({request:data});
}
