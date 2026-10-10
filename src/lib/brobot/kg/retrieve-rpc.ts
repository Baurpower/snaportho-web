export type KnowledgeRpcResult = {data:unknown;error:{code?:string;message:string}|null};
export type KnowledgeRpcClient = {rpc(name:string,args:Record<string,unknown>):{abortSignal(signal:AbortSignal):PromiseLike<KnowledgeRpcResult>}};
/** Keep dispatch, fallback eligibility, and cancellation shared by both retrieval versions. */
export async function retrieveKnowledgeRpc(client:KnowledgeRpcClient,input:{version:'v2'|'v3';query:string;commonArgs:Record<string,unknown>;signal:AbortSignal}):Promise<{result:KnowledgeRpcResult;version:'v2'|'v3'}>{
 if(input.signal.aborted)throw new DOMException('KG retrieval cancelled','AbortError');
 if(input.version==='v3'){
  const result=await client.rpc('retrieve_brobot_knowledge_v3',{...input.commonArgs,p_variants:[input.query],p_terms:input.query.split(/\s+/).filter(term=>term.length>=2),p_facets:[],p_pool_size:48}).abortSignal(input.signal);
  if(!result.error||!['PGRST202','42883'].includes(result.error.code??''))return {result,version:'v3'};
  if(input.signal.aborted)throw new DOMException('KG retrieval cancelled','AbortError');
 }
 const result=await client.rpc('retrieve_brobot_knowledge_v2',{...input.commonArgs,p_neighborhood_hints:[]}).abortSignal(input.signal);
 return {result,version:'v2'};
}
