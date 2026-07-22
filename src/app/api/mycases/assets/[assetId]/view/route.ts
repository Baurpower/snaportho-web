import { NextRequest, NextResponse } from "next/server";
import { requireMyCasesApiUser } from "@/lib/mycases/request-user";
import { mediaErrorResponse } from "@/lib/mycases/media/api";
import { createOwnedAssetThumbnailView, createOwnedAssetView } from "@/lib/mycases/media/repository";
export const runtime="nodejs";
type Context={params:Promise<{assetId:string}>};
export async function GET(request:NextRequest,context:Context){const started=Date.now();const id=(await context.params).assetId;try{const auth=await requireMyCasesApiUser();if("error" in auth)return auth.error;if(request.nextUrl.searchParams.get("thumbnailOnly")==="true")return NextResponse.json(await createOwnedAssetThumbnailView(auth.user.id,id));return NextResponse.json(await createOwnedAssetView(auth.user.id,id,request.nextUrl.searchParams.get("download")==="true"));}catch(error){return mediaErrorResponse(error,started,id)}}
