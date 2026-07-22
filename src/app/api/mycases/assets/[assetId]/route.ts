import { NextRequest, NextResponse } from "next/server";
import { requireMyCasesApiUser } from "@/lib/mycases/request-user";
import { mediaErrorResponse } from "@/lib/mycases/media/api";
import { deleteOwnedAsset, updateOwnedAssetCaption } from "@/lib/mycases/media/repository";
import { validateEducationalCaption } from "@/lib/mycases/media/processor";
import { MyCasesMediaError } from "@/lib/mycases/media/types";
export const runtime="nodejs";
type Context={params:Promise<{assetId:string}>};
export async function PATCH(request:NextRequest,context:Context){const started=Date.now();const id=(await context.params).assetId;try{const auth=await requireMyCasesApiUser();if("error" in auth)return auth.error;const body=await request.json();if(!body||typeof body!=="object"||Array.isArray(body))throw new MyCasesMediaError("invalid_body","Invalid caption request.");if(Object.keys(body).some(key=>key!=="caption"))throw new MyCasesMediaError("unexpected_field","Only caption can be updated.");return NextResponse.json({asset:await updateOwnedAssetCaption(auth.user.id,id,validateEducationalCaption(body.caption))});}catch(error){return mediaErrorResponse(error,started,id)}}
export async function DELETE(_:NextRequest,context:Context){const started=Date.now();const id=(await context.params).assetId;try{const auth=await requireMyCasesApiUser();if("error" in auth)return auth.error;return NextResponse.json(await deleteOwnedAsset(auth.user.id,id));}catch(error){return mediaErrorResponse(error,started,id)}}
