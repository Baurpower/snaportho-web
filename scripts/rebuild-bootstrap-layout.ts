/** Repackage the published bootstrap without changing teaching content or media.
 * Prepare: --prepare (writes a local report); publish: --publish=<report.json>.
 * Old artifacts remain intact. The download endpoint selects the newest published artifact.
 */
import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream, readFileSync, writeFileSync, mkdtempSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createClient} from '@supabase/supabase-js';
import {signAnkiAwsDownload, uploadAnkiAwsObject} from '../src/lib/education/anki-aws-storage.ts';
import {computeCentralSyncHash} from '../src/lib/education/anki-deck-incorporation.ts';

const env = {...Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]})),...process.env};
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
async function rows(query:any){const {data,error}=await query;if(error)throw new Error(error.message);return data;}
async function all(make:()=>any){const out:any[]=[];for(let start=0;;start+=500){const batch=await rows(make().range(start,start+499));out.push(...batch);if(batch.length<500)return out;}}
async function digest(path:string){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
async function current(){return (await rows(db.from('anki_deck_releases').select('id,release_version').eq('status','published').order('published_at',{ascending:false}).limit(1)))[0];}
async function artifact(id:string){return (await rows(db.from('anki_deck_release_artifacts').select('*').eq('deck_release_id',id).eq('artifact_type','bootstrap_apkg').eq('status','published').order('published_at',{ascending:false}).limit(1)))[0];}
async function main(){
 const publish=process.argv.find(a=>a.startsWith('--publish='))?.slice(10);
 if(publish){
  const report=JSON.parse(readFileSync(publish,'utf8'));
  if(!report.validated||await digest(report.output)!==report.checksum)throw new Error('local_artifact_validation_failed');
  const release=await current(),previous=await artifact(release.id);
  if(release.id!==report.release.id||previous.artifact_checksum!==report.previous.artifact_checksum)throw new Error('release_changed_since_prepare');
  const tagRelease=(await rows(db.from('anki_sync_v2_releases').select('id').eq('status','published').order('release_sequence',{ascending:false}).limit(1)))[0];
  if(tagRelease.id!==report.tagRelease.id)throw new Error('tags_changed_since_prepare');
  const objectKey=`deck-releases/${release.id}/bootstrap/${report.checksum}.apkg`;
  const upload=await uploadAnkiAwsObject({objectKey,body:readFileSync(report.output),contentType:'application/apkg',checksumSha256:report.checksum,env,onProgress:(n,total)=>console.log(JSON.stringify({uploadBytes:n,total}))});
  // Verify the actual CDN bytes before making this artifact selectable.
  const response=await fetch(signAnkiAwsDownload(objectKey,3600,env));
  if(!response.ok||!response.body)throw new Error('cdn_verification_failed');
  const hash=createHash('sha256');for await(const chunk of Readable.fromWeb(response.body as any))hash.update(chunk);
  if(hash.digest('hex')!==report.checksum)throw new Error('cdn_checksum_mismatch');
  await rows(db.from('anki_deck_release_artifacts').insert({deck_release_id:release.id,artifact_type:'bootstrap_apkg',artifact_schema_version:report.previous.artifact_schema_version,artifact_checksum:report.checksum,object_key:objectKey,byte_size:upload.byteSize,media_type:'application/apkg',storage_provider:'aws_s3',storage_bucket:upload.bucket,status:'published',published_at:new Date().toISOString(),delivery_metadata:{...report.previous.delivery_metadata,cardCount:report.cardCount,mediaCount:report.mediaCount,deckLayout:'single-SnapOrtho',tagReleaseId:report.tagRelease.id,replacesChecksum:report.previous.artifact_checksum}}).select('id'));
  const live=await artifact(release.id);
  if(live.artifact_checksum!==report.checksum)throw new Error('published_selection_mismatch');
  console.log(JSON.stringify({published:true,release,checksum:report.checksum,objectKey,cardCount:report.cardCount,mediaCount:report.mediaCount}));return;
 }
 if(!process.argv.includes('--prepare'))throw new Error('use --prepare or --publish=<report>');
 const release=await current(),previous=await artifact(release.id);
 if(previous.storage_provider!=='aws_s3')throw new Error('unsupported_source_storage');
 const dir=mkdtempSync(resolve('tmp/bootstrap-layout-')),source=join(dir,'source.apkg');
 console.log(JSON.stringify({stage:'download',release,dir,bytes:previous.byte_size}));
 const response=await fetch(signAnkiAwsDownload(previous.object_key,3600,env));
 if(!response.ok||!response.body)throw new Error('source_download_failed');
 await pipeline(Readable.fromWeb(response.body as any),createWriteStream(source));
 if(await digest(source)!==previous.artifact_checksum)throw new Error('source_checksum_mismatch');
 const entries=execFileSync('unzip',['-Z1',source],{encoding:'utf8'}).trim().split('\n');
 if(entries.some(n=>!['collection.anki2','media'].includes(n)&&!/^\d+$/.test(n)))throw new Error('unexpected_zip_entries');
 execFileSync('unzip',['-q',source,'collection.anki2','media','-d',dir]);
 const media=JSON.parse(readFileSync(join(dir,'media'),'utf8'));
 if(Object.keys(media).some(n=>!entries.includes(n)))throw new Error('missing_media_entry');
 const col=new DatabaseSync(join(dir,'collection.anki2'));
 const header=col.prepare('select models,decks from col').get() as any;
 const models=JSON.parse(header.models),decks=JSON.parse(header.decks);
 if(Object.values(models).some((m:any)=>m.name!=='SnapOrtho Master'))throw new Error('unexpected_note_type');
 const notes=col.prepare('select * from notes order by id').all() as any[];
 const cards=col.prepare('select * from cards order by id').all() as any[];
 if(cards.length!==previous.delivery_metadata.cardCount||Object.keys(media).length!==previous.delivery_metadata.mediaCount)throw new Error('source_count_mismatch');
 if(new Set(notes.map(n=>n.guid)).size!==notes.length)throw new Error('duplicate_guid');
 const tagRelease=(await rows(db.from('anki_sync_v2_releases').select('id,release_version,expected_note_count').eq('status','published').order('release_sequence',{ascending:false}).limit(1)))[0];
 const members=await all(()=>db.from('anki_sync_v2_release_notes').select('note_id,note_version_id').eq('release_id',tagRelease.id).order('note_id'));
 if(members.length!==tagRelease.expected_note_count)throw new Error('tag_membership_count_mismatch');
 const tags=new Map<string,string[]>();
 for(let i=0;i<members.length;i+=100){
  const batch=members.slice(i,i+100);
  const identities=await rows(db.from('anki_sync_v2_notes').select('id,stable_guid').in('id',batch.map(m=>m.note_id)));
  const versions=await rows(db.from('anki_sync_v2_note_versions').select('id,governed_tags').in('id',batch.map(m=>m.note_version_id)));
  const guids=new Map(identities.map((n:any)=>[n.id,n.stable_guid])),values=new Map(versions.map((n:any)=>[n.id,n.governed_tags]));
  for(const m of batch){const guid=guids.get(m.note_id),value=values.get(m.note_version_id);if(!guid||!Array.isArray(value))throw new Error('missing_tag_identity');tags.set(String(guid),value);}
 }
 let tagAssignments=0;
 for(const note of notes){
  if(!tags.has(note.guid))throw new Error('bootstrap_note_missing_from_tag_release');
  const ts=[...new Set(tags.get(note.guid)!)].sort();
  if(ts.some(t=>!t.startsWith('SnapOrtho::')||/\s/.test(t)))throw new Error('invalid_governed_tag');
  const fields=note.flds.split('\u001f'),names=models[note.mid].flds.map((f:any)=>f.name),hashIndex=names.indexOf('SnapOrtho_Installed_Hash');
  if(hashIndex<0)throw new Error('missing_hash_marker');
  const siblings=cards.filter(c=>c.nid===note.id);if(siblings.length!==1)throw new Error('unsupported_sibling_markers');
  fields[hashIndex]=computeCentralSyncHash(names.map((name:string,i:number)=>({name,value:fields[i]})),ts,siblings[0].ord);
  col.prepare('update notes set tags=?,flds=? where id=?').run(ts.length?` ${ts.join(' ')} `:'',fields.join('\u001f'),note.id);tagAssignments+=ts.length;
 }
 const deckId=Number(cards[0].did),root={...decks[String(deckId)],id:deckId,name:'SnapOrtho'};
 col.prepare('update cards set did=?').run(deckId);
 const exportDecks={...(deckId!==1&&decks['1']?{'1':decks['1']}:{}),[deckId]:root};
 col.prepare('update col set decks=?,tags=?').run(JSON.stringify(exportDecks),JSON.stringify({}));
 const after=col.prepare('select * from cards order by id').all();
 if(JSON.stringify(after)!==JSON.stringify(cards.map(c=>({...c,did:deckId}))))throw new Error('card_identity_or_scheduling_changed');
 const afterNotes=col.prepare('select * from notes order by id').all() as any[];
 for(let i=0;i<notes.length;i++){
  const a=notes[i],b=afterNotes[i],names=models[a.mid].flds.map((f:any)=>f.name);
  const af=a.flds.split('\u001f'),bf=b.flds.split('\u001f');
  if(names.some((name:string,j:number)=>name!=='SnapOrtho_Installed_Hash'&&af[j]!==bf[j]))throw new Error('teaching_content_changed');
  if(a.id!==b.id||a.guid!==b.guid||a.mid!==b.mid)throw new Error('note_identity_changed');
 }
 if((col.prepare('pragma integrity_check').get() as any).integrity_check!=='ok')throw new Error('sqlite_integrity_failed');col.close();
 // zip copy mode preserves every original compressed media entry byte-for-byte.
 const output=join(dir,'SnapOrtho-Master-single-deck.apkg');
 execFileSync('zip',[source,'--out',output],{stdio:'ignore'});
 execFileSync('zip',['-q',output,'collection.anki2'],{cwd:dir});
 execFileSync('unzip',['-tq',output],{stdio:'ignore'});
 const report={validated:true,release,previous,tagRelease,output,checksum:await digest(output),byteSize:statSync(output).size,noteCount:notes.length,cardCount:cards.length,mediaCount:Object.keys(media).length,tagAssignments,deck:'SnapOrtho'};
 writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,previous:previous.artifact_checksum,report:join(dir,'report.json')}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
