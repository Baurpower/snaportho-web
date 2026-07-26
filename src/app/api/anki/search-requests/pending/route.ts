import { NextResponse } from "next/server";
import { authenticateBroBotAnkiRequest } from "@/app/api/brobot-anki/_lib";

export async function GET(request: Request) {
  const auth=await authenticateBroBotAnkiRequest(request);
  if("response"in auth)return auth.response;
  if(auth.authMethod!=="device_token"||!auth.deviceTokenId)
    return NextResponse.json({error:"Anki device authentication required"},{status:401});
  const now=new Date().toISOString();
  const staleCutoff=new Date(Date.now()-5*60_000).toISOString();
  await auth.supabase.from("educational_anki_search_requests").update({
    status:"cancelled",error_code:"stale_delivery_request",completed_at:now,
  }).eq("user_id",auth.userId).in("status",["queued","claimed","resolving_local"])
    .lt("created_at",staleCutoff);
  await auth.supabase.from("educational_anki_search_requests").update({
    status:"queued",claimed_by_device_token_id:null,claim_expires_at:null,
  }).eq("user_id",auth.userId).eq("status","claimed").lt("claim_expires_at",now);
  const{data,error}=await auth.supabase.from("educational_anki_search_requests")
    .select("id,provider,query_kind,normalized_native_id,tested_concept,concept_summary,search_keywords,page_sections,concept_source,status,created_at,expires_at")
    .eq("user_id",auth.userId).eq("status","queued").gt("expires_at",now)
    .order("created_at",{ascending:true}).limit(5);
  if(error)return NextResponse.json({error:"pending searches unavailable"},{status:500});
  return NextResponse.json({requests:data??[]});
}
