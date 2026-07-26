import { NextResponse } from "next/server";
import { authenticateDeviceLinkedRequest } from "@/lib/brobot/device-link";
const TOKEN_HEADER = "x-snaportho-extension-token";
export async function GET(request: Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await authenticateDeviceLinkedRequest(request,{deviceTokenHeader:TOKEN_HEADER,allowBrowserSession:false,allowBearerToken:false});
  if("response"in auth)return auth.response;
  const{id}=await params;
  const{data,error}=await auth.supabase.from("educational_anki_search_requests")
    .select("id,status,result_summary,error_code,expires_at,completed_at")
    .eq("id",id).eq("user_id",auth.userId).maybeSingle();
  if(error)return NextResponse.json({error:"search status unavailable"},{status:500});
  if(!data)return NextResponse.json({error:"search request not found"},{status:404});
  return NextResponse.json({searchRequestId:data.id,status:data.status,resultSummary:data.result_summary,errorCode:data.error_code,expiresAt:data.expires_at,completedAt:data.completed_at});
}
