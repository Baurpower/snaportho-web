/* eslint-disable @typescript-eslint/no-explicit-any -- v2 tables precede generated types. */
import{NextResponse}from"next/server";import{deviceAuth,ANKI_DECK_MEDIA_BUCKET,ANKI_MEDIA_SIGNED_URL_SECONDS,AWS_STORAGE_PROVIDER,signAnkiAwsDownload}from"../../../../../_lib";
export async function GET(request:Request,{params}:{params:Promise<{id:string;sha256:string}>}){
 const auth=await deviceAuth(request);if("response"in auth)return auth.response;const{id,sha256}=await params;
 const db=auth.supabase as any;
 if(!/^[a-f0-9]{64}$/.test(sha256))return NextResponse.json({error:"invalid media hash"},{status:400});
 const{data:release}=await db.from("anki_sync_v2_releases").select("status").eq("id",id).maybeSingle();
 if(!release||!["published","superseded"].includes(release.status))return NextResponse.json({error:"release unavailable"},{status:404});
 const{data:asset,error}=await db.from("anki_sync_v2_release_media").select("*").eq("release_id",id).eq("content_sha256",sha256).maybeSingle();
 if(error)return NextResponse.json({error:"media lookup unavailable"},{status:500});if(!asset)return NextResponse.json({error:"media not found"},{status:404});
 let url=null;if(asset.storage_provider===AWS_STORAGE_PROVIDER)url=signAnkiAwsDownload(asset.object_key,ANKI_MEDIA_SIGNED_URL_SECONDS);else{const{data}=await auth.supabase.storage.from(asset.storage_bucket||ANKI_DECK_MEDIA_BUCKET).createSignedUrl(asset.object_key,ANKI_MEDIA_SIGNED_URL_SECONDS,{download:asset.logical_filename});url=data?.signedUrl??null;}
 return url?NextResponse.json({sha256,mimeType:asset.mime_type,byteSize:asset.byte_size,logicalFilename:asset.logical_filename,url,expiresInSeconds:ANKI_MEDIA_SIGNED_URL_SECONDS}):NextResponse.json({error:"media temporarily unavailable"},{status:503});
}
