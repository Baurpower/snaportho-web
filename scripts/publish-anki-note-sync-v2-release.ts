import fs from"node:fs";import{createClient}from"@supabase/supabase-js";
import{normalizeFieldSnapshotToMaster}from"../src/lib/education/anki-normalize-to-master";
import{buildInitialNoteRelease,GOVERNED_PREFIXES}from"../src/lib/education/anki-note-release-v2";
import{checksum}from"../src/lib/education/anki-note-sync-v2";
function env(){return Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.trim().startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i),l.slice(i+1).trim().replace(/^['\"]|['\"]$/g,"")] }));}
async function main(){
const args=new Set(process.argv.slice(2)),value=(name:string)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null};
const apply=args.has("--apply"),releaseVersion=value("--release-version");if(!releaseVersion)throw new Error("--release-version is required");
const e=env(),supabase=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
async function pages(table:string,select:string,filter:(q:any)=>any){const out:any[]=[];for(let from=0;;from+=1000){const{data,error}=await filter(supabase.from(table).select(select).range(from,from+999));if(error)throw error;out.push(...(data??[]));if(!data||data.length<1000)break;}return out;}
const sourceId=value("--source-release-id")??(await supabase.from("anki_deck_releases").select("id").eq("status","published").order("published_at",{ascending:false}).limit(1).single()).data?.id;
if(!sourceId)throw new Error("published source release not found");
const members=await pages("anki_deck_release_cards","canonical_card_version_id,note_guid,card_ordinal,deck_path,ordering_key,inclusion_status",q=>q.eq("deck_release_id",sourceId).eq("inclusion_status","included").order("ordering_key"));
const versionIds=[...new Set(members.map(m=>m.canonical_card_version_id))],versions:any[]=[];
for(let i=0;i<versionIds.length;i+=100){const{data,error}=await supabase.from("canonical_card_versions").select("id,field_snapshot,tag_snapshot").in("id",versionIds.slice(i,i+100));if(error)throw error;versions.push(...(data??[]));}
const versionMap=new Map(versions.map(v=>[v.id,v]));
const{data:tagManifest}=await supabase.from("rendered_anki_tag_manifests").select("id").eq("status","published").order("published_at",{ascending:false}).limit(1).maybeSingle();
const rendered:any[]=[];if(tagManifest)for(let i=0;i<versionIds.length;i+=100){const{data,error}=await supabase.from("rendered_anki_tag_manifest_cards").select("canonical_card_version_id,rendered_tags").eq("manifest_id",tagManifest.id).in("canonical_card_version_id",versionIds.slice(i,i+100));if(error)throw error;rendered.push(...(data??[]));}
const tagMap=new Map(rendered.map(r=>[r.canonical_card_version_id,r.rendered_tags]));
// Resource-field overlay: layered enrichment (Orthobullets and future resource fields) merged
// into the master field snapshot at build time, mirroring the governed-tag overlay above.
// Canonical content is never mutated; a published overlay for this deck release wins per note.
const{data:fieldOverlay}=await supabase.from("anki_resource_field_overlays").select("id,note_count").eq("deck_release_id",sourceId).eq("status","published").order("published_at",{ascending:false}).limit(1).maybeSingle();
const overlayCards=fieldOverlay?await pages("anki_resource_field_overlay_cards","note_guid,fields",q=>q.eq("overlay_id",fieldOverlay.id)):[];
const overlayByGuid=new Map(overlayCards.map(r=>[String(r.note_guid),r.fields as Record<string,string>]));
if(fieldOverlay)console.log(`resource-field overlay: ${overlayCards.length} notes (overlay ${fieldOverlay.id})`);
const cards=members.map(member=>{const source=versionMap.get(member.canonical_card_version_id);if(!source)throw new Error(`missing_version:${member.canonical_card_version_id}`);const sourceTags=(source.tag_snapshot??[]).map(String),governed=tagMap.get(member.canonical_card_version_id);const tags=governed?[...sourceTags.filter((t:string)=>!t.startsWith("SnapOrtho::")),...governed]:sourceTags;const normalized=normalizeFieldSnapshotToMaster(source.field_snapshot??[],tags,member.card_ordinal);let fieldSnapshot=normalized.fieldSnapshot;const overlay=overlayByGuid.get(String(member.note_guid));if(overlay){const m=new Map(fieldSnapshot.map((f:{name:string;rawValue:string})=>[f.name,f.rawValue]));for(const[name,value]of Object.entries(overlay)){if(typeof value==="string"&&value.length>0)m.set(name,value);}fieldSnapshot=[...m].map(([name,rawValue])=>({name,rawValue}));}return{noteGuid:member.note_guid,cardOrdinal:member.card_ordinal,deckPath:member.deck_path.startsWith("SnapOrtho::")?member.deck_path:`SnapOrtho::${member.deck_path}`,fieldSnapshot,centralTags:tags.filter((t:string)=>t.startsWith("SnapOrtho::"))};});
const built=buildInitialNoteRelease(cards,releaseVersion);
const mediaAssets=await pages("anki_deck_media_assets","logical_filename,content_sha256,mime_type,byte_size,object_key,storage_provider,storage_bucket",q=>q.eq("deck_release_id",sourceId).neq("license_status","excluded").order("logical_filename"));
const mediaChecksum=checksum(mediaAssets.map(a=>[a.logical_filename,a.content_sha256,a.byte_size])),zero="0".repeat(64),aggregateChecksum=checksum({notes:built.aggregateChecksum,media:mediaChecksum});
const summary={sourceId,apply,version:releaseVersion,notes:built.expectedNoteCount,cards:built.expectedCardCount,media:mediaAssets.length,aggregateChecksum};
if(!apply){console.log(JSON.stringify(summary,null,2));process.exit(0);}
const{data:predecessor}=await supabase.from("anki_sync_v2_releases").select("id,release_sequence").eq("status","published").order("release_sequence",{ascending:false}).limit(1).maybeSingle();
const{data:existingDraft}=await supabase.from("anki_sync_v2_releases").select("id,release_sequence,release_version,aggregate_checksum").eq("release_version",releaseVersion).eq("status","draft").maybeSingle();
let release:any=existingDraft;
if(!release){const{data,error:releaseError}=await supabase.from("anki_sync_v2_releases").insert({release_version:releaseVersion,predecessor_release_id:predecessor?.id??null,status:"draft",notes_checksum:built.notesChecksum,tags_checksum:built.tagsChecksum,media_checksum:mediaChecksum,note_types_checksum:zero,aggregate_checksum:aggregateChecksum,expected_note_count:built.expectedNoteCount,expected_card_count:built.expectedCardCount,expected_media_count:mediaAssets.length,minimum_addon_version:"1.0.0"}).select("id,release_sequence,release_version,aggregate_checksum").single();if(releaseError)throw releaseError;release=data;}
if(release.aggregate_checksum!==aggregateChecksum)throw new Error("existing_draft_checksum_mismatch");
const NOTE_OPERATION_BASE=0,RETIRED_NOTE_OPERATION_BASE=1_000_000,MEDIA_ADD_OPERATION_BASE=2_000_000,MEDIA_REMOVE_OPERATION_BASE=3_000_000,BATCH_SIZE=25;
const currentNoteIds=new Set<string>();
async function processNote(note:any,noteOrder:number){
 const{data:canonical,error:noteError}=await supabase.from("anki_sync_v2_notes").upsert({stable_guid:note.noteGuid},{onConflict:"stable_guid"}).select("id").single();if(noteError)throw noteError;
 currentNoteIds.add(canonical.id);
 const fieldHashes=Object.fromEntries(Object.entries(note.fields).map(([name,val])=>[name,checksum(val)]));
 const{data:priorVersion}=await supabase.from("anki_sync_v2_note_versions").select("id,version_number,content_checksum,tags_checksum,deck_path").eq("note_id",canonical.id).order("version_number",{ascending:false}).limit(1).maybeSingle();
 const changed=!priorVersion||priorVersion.content_checksum!==note.contentChecksum||priorVersion.tags_checksum!==note.tagsChecksum||priorVersion.deck_path!==note.deckPath,needsOperation=!predecessor||changed;
 let versionRow:any=priorVersion;
 if(changed){const{data,error:versionError}=await supabase.from("anki_sync_v2_note_versions").insert({note_id:canonical.id,version_number:Number(priorVersion?.version_number??0)+1,predecessor_version_id:priorVersion?.id??null,note_type_key:"SnapOrtho Master",field_snapshot:note.fields,field_hashes:fieldHashes,governed_tags:note.governedTags,content_checksum:note.contentChecksum,tags_checksum:note.tagsChecksum,deck_path:note.deckPath}).select("id,version_number").single();if(versionError)throw versionError;versionRow=data;}
 await supabase.from("anki_sync_v2_release_notes").upsert({release_id:release.id,note_id:canonical.id,note_version_id:versionRow.id,ordering_key:String(noteOrder).padStart(8,"0"),expected_card_ordinals:note.expectedCardOrdinals},{onConflict:"release_id,note_id"}).throwOnError();
 if(needsOperation){const payload={noteGuid:note.noteGuid,noteTypeName:"SnapOrtho Master",deckPath:note.deckPath,fields:note.fields,governedTags:note.governedTags,governedPrefixes:GOVERNED_PREFIXES,protectedFields:[],contentChecksum:note.contentChecksum,tagsChecksum:note.tagsChecksum,expectedCardOrdinals:note.expectedCardOrdinals};await supabase.from("anki_sync_v2_delta_operations").upsert({release_id:release.id,operation_index:NOTE_OPERATION_BASE+noteOrder,operation:"upsert_note",note_id:canonical.id,note_version_id:versionRow.id,payload_checksum:checksum(payload),payload},{onConflict:"release_id,operation_index"}).throwOnError();}
}
for(let start=0;start<built.notes.length;start+=BATCH_SIZE){
 await Promise.all(built.notes.slice(start,start+BATCH_SIZE).map((note,index)=>processNote(note,start+index)));
 console.log(`notes ${Math.min(start+BATCH_SIZE,built.notes.length)}/${built.notes.length}`);
}
if(predecessor){const priorMembers=await pages("anki_sync_v2_release_notes","note_id",q=>q.eq("release_id",predecessor.id));let retireIndex=0;for(const row of priorMembers)if(!currentNoteIds.has(row.note_id)){const payload={reason:"removed_from_successor_release"};await supabase.from("anki_sync_v2_delta_operations").upsert({release_id:release.id,operation_index:RETIRED_NOTE_OPERATION_BASE+retireIndex++,operation:"retire_note",note_id:row.note_id,note_version_id:null,payload_checksum:checksum(payload),payload},{onConflict:"release_id,operation_index"}).throwOnError();}}
const priorMedia=predecessor?await pages("anki_sync_v2_release_media","logical_filename,content_sha256",q=>q.eq("release_id",predecessor.id)):[];
const priorMediaMap=new Map(priorMedia.map(a=>[a.logical_filename,a.content_sha256])),currentMediaNames=new Set<string>();
for(const asset of mediaAssets)currentMediaNames.add(asset.logical_filename);
for(let start=0;start<mediaAssets.length;start+=BATCH_SIZE){
 await Promise.all(mediaAssets.slice(start,start+BATCH_SIZE).map(async(asset,index)=>{const mediaIndex=start+index;await supabase.from("anki_sync_v2_release_media").upsert({release_id:release.id,...asset},{onConflict:"release_id,logical_filename"}).throwOnError();if(priorMediaMap.get(asset.logical_filename)!==asset.content_sha256){const payload={releaseId:release.id,filename:asset.logical_filename,sha256:asset.content_sha256,byteSize:asset.byte_size,mimeType:asset.mime_type};await supabase.from("anki_sync_v2_delta_operations").upsert({release_id:release.id,operation_index:MEDIA_ADD_OPERATION_BASE+mediaIndex,operation:"media_add",payload_checksum:checksum(payload),payload},{onConflict:"release_id,operation_index"}).throwOnError();}}));
 console.log(`media ${Math.min(start+BATCH_SIZE,mediaAssets.length)}/${mediaAssets.length}`);
}
let removedMediaIndex=0;for(const asset of priorMedia)if(!currentMediaNames.has(asset.logical_filename)){const payload={filename:asset.logical_filename,sha256:asset.content_sha256};await supabase.from("anki_sync_v2_delta_operations").upsert({release_id:release.id,operation_index:MEDIA_REMOVE_OPERATION_BASE+removedMediaIndex++,operation:"media_remove",payload_checksum:checksum(payload),payload},{onConflict:"release_id,operation_index"}).throwOnError();}
const[{count:publishedNoteCount,error:noteCountError},{count:publishedMediaCount,error:mediaCountError}]=await Promise.all([
 supabase.from("anki_sync_v2_release_notes").select("*",{count:"exact",head:true}).eq("release_id",release.id),
 supabase.from("anki_sync_v2_release_media").select("*",{count:"exact",head:true}).eq("release_id",release.id)
]);
if(noteCountError)throw noteCountError;if(mediaCountError)throw mediaCountError;
if(publishedNoteCount!==built.expectedNoteCount)throw new Error(`release_note_count_mismatch:${publishedNoteCount}/${built.expectedNoteCount}`);
if(publishedMediaCount!==mediaAssets.length)throw new Error(`release_media_count_mismatch:${publishedMediaCount}/${mediaAssets.length}`);
await supabase.from("anki_sync_v2_releases").update({status:"published",published_at:new Date().toISOString()}).eq("id",release.id).throwOnError();
if(predecessor)await supabase.from("anki_sync_v2_releases").update({status:"superseded"}).eq("id",predecessor.id).throwOnError();
console.log(JSON.stringify({...summary,releaseId:release.id,releaseSequence:release.release_sequence},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
