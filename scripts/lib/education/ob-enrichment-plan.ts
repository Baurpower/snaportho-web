/** Select a bounded, resumable slice of immutable enrichment inputs. */
export function planEnrichmentBatch<T extends {claim_version_id:string;input_hash:string}>(inputs:readonly T[],previous:readonly {claim_version_id:string;input_hash:string;status:string}[],limit:number):T[]{
 if(!Number.isInteger(limit)||limit<1||limit>500) throw new Error('invalid enqueue limit');
 const terminal=new Set(previous.filter(row=>row.status==='complete'||row.status==='exhausted').map(row=>`${row.claim_version_id}:${row.input_hash}`));
 const seen=new Set<string>();
 return inputs.filter(row=>{
  const key=`${row.claim_version_id}:${row.input_hash}`;
  if(terminal.has(key)||seen.has(key))return false;
  seen.add(key);return true;
 }).slice(0,limit);
}
