import{checksum}from"./anki-note-sync-v2";
import{PRODUCT_PARENT_DECK}from"./anki-deck-path";
export type V1ManifestCard={noteGuid:string;cardOrdinal:number;deckPath:string;fieldSnapshot:Array<{name:string;rawValue?:string;value?:string}>;centralTags:string[]};
export const GOVERNED_PREFIXES=["SnapOrtho::Anatomy","SnapOrtho::Diagnosis","SnapOrtho::Treatment","SnapOrtho::Specialty","SnapOrtho::Workflow"];
function fieldsObject(fields:V1ManifestCard["fieldSnapshot"]){return Object.fromEntries(fields.map(f=>[f.name,f.value??f.rawValue??""]));}
export function buildInitialNoteRelease(cards:V1ManifestCard[],version:string){
 const groups=new Map<string,V1ManifestCard[]>();
 for(const card of cards){const rows=groups.get(card.noteGuid)??[];rows.push(card);groups.set(card.noteGuid,rows);}
 const notes=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([noteGuid,rows])=>{
  const ordered=[...rows].sort((a,b)=>a.cardOrdinal-b.cardOrdinal),fields=fieldsObject(ordered[0].fieldSnapshot);
  const fieldChecksum=checksum(fields);
  if(ordered.some(row=>checksum(fieldsObject(row.fieldSnapshot))!==fieldChecksum))throw new Error(`cloze_sibling_field_mismatch:${noteGuid}`);
  const governedTags=[...new Set(ordered.flatMap(row=>row.centralTags).filter(tag=>GOVERNED_PREFIXES.some(prefix=>tag===prefix||tag.startsWith(`${prefix}::`))))].sort();
  return{noteGuid,fields,governedTags,deckPath:PRODUCT_PARENT_DECK,expectedCardOrdinals:ordered.map(row=>row.cardOrdinal),contentChecksum:fieldChecksum,tagsChecksum:checksum(governedTags)};
 });
 const notesChecksum=checksum(notes.map(n=>[n.noteGuid,n.contentChecksum,n.deckPath,n.expectedCardOrdinals]));
 const tagsChecksum=checksum(notes.map(n=>[n.noteGuid,n.tagsChecksum]));
 return{version,notes,notesChecksum,tagsChecksum,aggregateChecksum:checksum({version,notesChecksum,tagsChecksum}),expectedNoteCount:notes.length,expectedCardCount:cards.length};
}
