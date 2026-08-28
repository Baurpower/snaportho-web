/* eslint-disable @typescript-eslint/no-explicit-any -- v2 tables precede generated Supabase types. */
import { NextResponse } from "next/server";
import { deviceAuth, requireAddonVersion } from "../../_lib";
import { NOTE_SYNC_V2 } from "@/lib/education/anki-note-sync-v2";

export async function GET(request:Request){
  const auth=await deviceAuth(request);if("response"in auth)return auth.response;
  const db=auth.supabase as any;
  const{data,error}=await db.from("anki_sync_v2_releases")
    .select("id,release_sequence,release_version,aggregate_checksum,expected_note_count,expected_card_count,expected_media_count,minimum_addon_version,published_at")
    .eq("status","published").order("release_sequence",{ascending:false}).limit(1).maybeSingle();
  if(error)return NextResponse.json({error:"v2 release lookup unavailable"},{status:500});
  if(!data)return NextResponse.json({error:"no published SnapOrtho sync v2 release"},{status:404});
  const blocked=requireAddonVersion(request,data.minimum_addon_version);if(blocked)return blocked;
  return NextResponse.json({contractVersion:NOTE_SYNC_V2,release:{
    id:data.id,sequence:Number(data.release_sequence),version:data.release_version,
    aggregateChecksum:data.aggregate_checksum,expectedNoteCount:data.expected_note_count,
    expectedCardCount:data.expected_card_count,expectedMediaCount:data.expected_media_count,
    minimumAddonVersion:data.minimum_addon_version,publishedAt:data.published_at,
  }});
}
