import { NextRequest, NextResponse } from "next/server";
import { requireMyCasesApiUser } from "@/lib/mycases/request-user";
import { mediaErrorResponse } from "@/lib/mycases/media/api";
import { sanitizeEducationalImage, validateEducationalCaption } from "@/lib/mycases/media/processor";
import { createOwnedAsset, listOwnedAssets } from "@/lib/mycases/media/repository";
import { MYCASES_MEDIA_MAX_UPLOAD_BYTES, MyCasesMediaError } from "@/lib/mycases/media/types";
export const runtime = "nodejs";
type Context = { params: Promise<{ caseId:string }> };
export async function GET(_:NextRequest, context:Context) { const started=Date.now(); try { const auth=await requireMyCasesApiUser(); if("error" in auth)return auth.error; return NextResponse.json({ assets:await listOwnedAssets(auth.user.id,(await context.params).caseId) }); } catch(error){ return mediaErrorResponse(error,started); } }
export async function POST(request:NextRequest, context:Context) { const started=Date.now(); try {
  const auth=await requireMyCasesApiUser(); if("error" in auth)return auth.error;
  const contentLength=Number(request.headers.get("content-length")); if(!Number.isFinite(contentLength)||contentLength<=0) throw new MyCasesMediaError("content_length_required","A valid upload length is required.",411); if(contentLength>MYCASES_MEDIA_MAX_UPLOAD_BYTES+1024*1024) throw new MyCasesMediaError("request_too_large","Upload exceeds the secure request limit.",413);
  const form=await request.formData(); const allowed=new Set(["file","caption","attestation"]); for(const key of form.keys()) if(!allowed.has(key)) throw new MyCasesMediaError("unexpected_field",`Unexpected multipart field: ${key}.`); for(const key of allowed) if(form.getAll(key).length>1) throw new MyCasesMediaError("duplicate_field",`Multipart field ${key} may appear only once.`);
  if(form.get("attestation")!=="true") throw new MyCasesMediaError("attestation_required","Confirm that the image is educational and contains no patient identifiers.");
  const file=form.get("file"); if(!(file instanceof File)) throw new MyCasesMediaError("file_required","Choose an image to upload.");
  const caption=validateEducationalCaption(form.get("caption")); const image=await sanitizeEducationalImage(Buffer.from(await file.arrayBuffer()),file.type);
  const asset=await createOwnedAsset(auth.user.id,(await context.params).caseId,caption,image); return NextResponse.json({ asset },{status:201});
 } catch(error){ return mediaErrorResponse(error,started); } }
