import { createHash } from "node:crypto";

export const NOTE_SYNC_V2 = "snaportho-anki-note-sync.v2" as const;
export const V2_OPERATIONS = [
  "upsert_note","retire_note","update_tags","move_note","update_note_type","media_add","media_remove",
] as const;
export type V2OperationKind = (typeof V2_OPERATIONS)[number];
export type FieldMap = Record<string,string>;
export type FieldMerge = { fields:FieldMap; remoteBaseline:FieldMap; preserved:string[]; overwrittenLocal:string[] };
const personal=/^(personal|user|local)(_|::)/i;
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
const stable=(value:unknown):string=>Array.isArray(value)?`[${value.map(stable).join(",")}]`:value&&typeof value==="object"?`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(",")}}`:JSON.stringify(value);
export function checksum(value:unknown){return sha(stable(value));}
export function mergeFields(input:{base:FieldMap;local:FieldMap;remote:FieldMap;protectedFields?:Iterable<string>}):FieldMerge{
  const protectedSet=new Set([...(input.protectedFields??[])].map(v=>v.toLowerCase()));
  const fields:{[key:string]:string}={...input.local},preserved:string[]=[],overwrittenLocal:string[]=[];
  for(const name of new Set([...Object.keys(input.base),...Object.keys(input.remote)])){
    const base=input.base[name]??"",local=input.local[name]??"",remote=input.remote[name]??"";
    const protect=personal.test(name)||protectedSet.has(name.toLowerCase());
    if(protect){fields[name]=local;preserved.push(name);continue;}
    if(remote===base||local===remote){fields[name]=local;continue;}
    if(local===base){fields[name]=remote;continue;}
    overwrittenLocal.push(name);
    fields[name]=local;
  }
  return{fields,remoteBaseline:{...input.remote},preserved:preserved.sort(),overwrittenLocal:overwrittenLocal.sort()};
}
export function mergeGovernedTags(local:string[],remote:string[],prefixes:string[]){
  const governed=(tag:string)=>prefixes.some(prefix=>tag===prefix||tag.startsWith(`${prefix}::`));
  return[...new Set([...local.filter(tag=>!governed(tag)),...remote])].sort();
}
export type DeltaOperation={cursor:number;releaseId:string;operationIndex:number;operation:V2OperationKind;noteId:string|null;noteVersionId:string|null;payloadChecksum:string;payload:Record<string,unknown>};
export function validateDeltaPage(input:{afterCursor:number;operations:DeltaOperation[];nextCursor:number;remaining:number;pageChecksum:string}):string[]{
  const errors:string[]=[];let previous=input.afterCursor;
  for(const op of input.operations){
    if(op.cursor<=previous)errors.push("cursor_not_strictly_increasing");
    if(!V2_OPERATIONS.includes(op.operation))errors.push("unknown_operation");
    if(checksum(op.payload)!==op.payloadChecksum)errors.push("payload_checksum_mismatch");
    previous=op.cursor;
  }
  if(input.nextCursor!==previous)errors.push("next_cursor_mismatch");
  if(input.remaining<0)errors.push("negative_remaining");
  if(checksum(input.operations)!==input.pageChecksum)errors.push("page_checksum_mismatch");
  return[...new Set(errors)].sort();
}
