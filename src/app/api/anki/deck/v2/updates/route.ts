/* eslint-disable @typescript-eslint/no-explicit-any -- v2 tables precede generated Supabase types. */
// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { deviceAuth } from "../../_lib";
import { checksum, NOTE_SYNC_V2 } from "@/lib/education/anki-note-sync-v2";

const query=z.object({
  after:z.coerce.number().int().min(0).default(0),
  limit:z.coerce.number().int().min(1).max(500).default(250),
}).strict();
export async function GET(request:Request){
  const auth=await deviceAuth(request);if("response"in auth)return auth.response;
  const url=new URL(request.url),parsed=query.safeParse(Object.fromEntries(url.searchParams));
  if(!parsed.success)return NextResponse.json({error:"invalid v2 cursor request"},{status:400});
  const{data:release,error:releaseError}=await auth.supabase.from("anki_sync_v2_releases")
    .select("id,release_sequence,release_version,aggregate_checksum,expected_note_count,expected_card_count,expected_media_count")
    .eq("status","published").order("release_sequence",{ascending:false}).limit(1).maybeSingle();
  if(releaseError)return NextResponse.json({error:"v2 release lookup unavailable"},{status:500});
  if(!release)return NextResponse.json({error:"no published SnapOrtho sync v2 release"},{status:404});
  const{data:lineage,error:lineageError}=await auth.supabase.from("anki_sync_v2_releases")
    .select("id").in("status",["published","superseded"]).lte("release_sequence",release.release_sequence);
  if(lineageError)return NextResponse.json({error:"v2 release lineage unavailable"},{status:500});
  const releaseIds=(lineage??[]).map((row:any)=>row.id);
  const{data,error,count}=await auth.supabase.from("anki_sync_v2_delta_operations")
    .select("cursor,release_id,operation_index,operation,note_id,note_version_id,payload_checksum,payload",{count:"exact"})
    .in("release_id",releaseIds).gt("cursor",parsed.data.after).order("cursor")
    .limit(parsed.data.limit);
  if(error)return NextResponse.json({error:"v2 delta lookup unavailable"},{status:500});
  const operations=(data??[]).map((row:any)=>({
    cursor:Number(row.cursor),releaseId:row.release_id,operationIndex:row.operation_index,
    operation:row.operation,noteId:row.note_id,noteVersionId:row.note_version_id,
    payloadChecksum:row.payload_checksum,payload:row.payload,
  }));
  const nextCursor=operations.length?operations.at(-1)!.cursor:parsed.data.after;
  return NextResponse.json({
    contractVersion:NOTE_SYNC_V2,
    release:{id:release.id,sequence:Number(release.release_sequence),version:release.release_version,
      aggregateChecksum:release.aggregate_checksum,expectedNoteCount:release.expected_note_count,
      expectedCardCount:release.expected_card_count,expectedMediaCount:release.expected_media_count},
    afterCursor:parsed.data.after,nextCursor,remaining:Math.max(0,(count??0)-operations.length),
    operations,pageChecksum:checksum(operations),
  });
}
