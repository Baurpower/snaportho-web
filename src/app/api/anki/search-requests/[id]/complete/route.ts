import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateBroBotAnkiRequest,parseJsonBody } from "@/app/api/brobot-anki/_lib";

const schema=z.object({
  status:z.enum(["completed","no_local_results","review_required","failed"]),
  availableCount:z.number().int().min(0).max(500),
  missingCount:z.number().int().min(0).max(500),
  ambiguousCount:z.number().int().min(0).max(500),
  versionMismatchCount:z.number().int().min(0).max(500),
  backendCandidateCount:z.number().int().min(0).max(500).default(0),
  localSupplementCount:z.number().int().min(0).max(500).default(0),
  resultTier:z.enum(["direct_reviewed","latest_deck_concept","local_concept_candidate","hybrid","none"]),
  errorCode:z.string().trim().min(1).max(100).nullable().optional(),
});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await authenticateBroBotAnkiRequest(request);
  if("response"in auth)return auth.response;
  if(auth.authMethod!=="device_token"||!auth.deviceTokenId)
    return NextResponse.json({error:"Anki device authentication required"},{status:401});
  const parsed=await parseJsonBody(request,schema);if(!parsed.success)return parsed.response;
  const{id}=await params,input=parsed.data;
  const{data,error}=await auth.supabase.from("educational_anki_search_requests").update({
    status:input.status,result_summary:{
      availableCount:input.availableCount,missingCount:input.missingCount,
      ambiguousCount:input.ambiguousCount,versionMismatchCount:input.versionMismatchCount,
      backendCandidateCount:input.backendCandidateCount,
      localSupplementCount:input.localSupplementCount,
      resultTier:input.resultTier,
    },error_code:input.errorCode??null,completed_at:new Date().toISOString(),
  }).eq("id",id).eq("user_id",auth.userId).eq("claimed_by_device_token_id",auth.deviceTokenId)
    .in("status",["claimed","resolving_local"]).select("id,status,result_summary").maybeSingle();
  if(error)return NextResponse.json({error:"search completion unavailable"},{status:500});
  if(!data)return NextResponse.json({error:"search claim not owned by this device"},{status:409});
  return NextResponse.json(data);
}
