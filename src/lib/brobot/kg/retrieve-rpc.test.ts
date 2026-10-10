import assert from 'node:assert/strict';
import {retrieveKnowledgeRpc,type KnowledgeRpcResult} from './retrieve-rpc.ts';
const controller=new AbortController();
const input={version:'v3' as const,query:'radial nerve',commonArgs:{p_release_id:'pinned'},signal:controller.signal};
function client(results:KnowledgeRpcResult[],onReply?:()=>void){
 const calls:Array<{name:string;args:Record<string,unknown>;signal:AbortSignal}>=[];
 return {calls,rpc:(name:string,args:Record<string,unknown>)=>({abortSignal:async(signal:AbortSignal)=>{calls.push({name,args,signal});onReply?.();return results.shift()!;}})};
}
const ok={data:{claims:[]},error:null};
const direct=client([ok,ok]);
assert.equal((await retrieveKnowledgeRpc(direct,input)).version,'v3');
assert.equal(direct.calls[0].name,'retrieve_brobot_knowledge_v3');
assert.deepEqual(direct.calls[0].args.p_terms,['radial','nerve']);
assert.equal(direct.calls[0].args.p_release_id,'pinned');
await retrieveKnowledgeRpc(direct,input);assert.equal(direct.calls.length,2,'repeated retrieval must reach the database for revocation');
for(const code of ['PGRST202','42883']){
 const fallback=client([{data:null,error:{code,message:'missing'}},ok]);
 assert.equal((await retrieveKnowledgeRpc(fallback,input)).version,'v2');
 assert.equal(fallback.calls[1].name,'retrieve_brobot_knowledge_v2');
 assert.equal(fallback.calls[1].signal,controller.signal,'fallback retains the original deadline');
 assert.deepEqual(fallback.calls[1].args.p_neighborhood_hints,[]);
}
for(const code of ['57014','42501','PGRST301']){
 const failed=client([{data:null,error:{code,message:'failed'}}]);
 assert.equal((await retrieveKnowledgeRpc(failed,input)).result.error?.code,code);
 assert.equal(failed.calls.length,1,'timeouts, permissions and authentication must not trigger fallback');
}
const cancelled=new AbortController();
const late=client([{data:null,error:{code:'PGRST202',message:'missing'}}],()=>cancelled.abort());
await assert.rejects(()=>retrieveKnowledgeRpc(late,{...input,signal:cancelled.signal}),{name:'AbortError'});
assert.equal(late.calls.length,1);
const v2=client([ok]);await retrieveKnowledgeRpc(v2,{...input,version:'v2'});assert.equal(v2.calls[0].name,'retrieve_brobot_knowledge_v2');
console.log('retrieve-rpc: dispatch, bounded fallback, cancellation and uncached revocation checks passed');
