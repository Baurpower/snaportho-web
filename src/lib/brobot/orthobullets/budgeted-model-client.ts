import {createHash,randomUUID} from 'node:crypto';
import type {ObProdModelClient} from './claim-review-pipeline';
export type InvocationReservation={id:string;model:string;inputHash:string;inputBytes:number;maxOutputTokens:number};
/** Reserve before a provider request; settle once. Unknown usage retains its full reservation. */
export function createBudgetedModelClient(client:ObProdModelClient,ledger:{reserve:(input:InvocationReservation)=>Promise<void>;settle:(id:string,prompt:number|null,completion:number|null)=>Promise<void>}):ObProdModelClient{
 return {chat:{completions:{create:async(args,options)=>{
  const model=String(args.model??'');if(!/^[A-Za-z0-9._:-]{1,120}$/.test(model))throw new Error('model pricing unavailable');
  const maxOutputTokens=typeof args.max_completion_tokens==='number'?args.max_completion_tokens:4096;
  if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<1||maxOutputTokens>8192)throw new Error('invalid model output bound');
  const bounded={...args,max_completion_tokens:maxOutputTokens};
  const encoded=JSON.stringify(bounded);const id=randomUUID();
  await ledger.reserve({id,model,inputHash:createHash('sha256').update(encoded).digest('hex'),inputBytes:Buffer.byteLength(encoded,'utf8')+1024,maxOutputTokens});
  let result;
  try{result=await client.chat.completions.create(bounded,{...options,maxRetries:0});}
  catch(error){await ledger.settle(id,null,null);throw error;}
  const prompt=result.usage?.prompt_tokens,completion=result.usage?.completion_tokens;
  const known=Number.isInteger(prompt)&&Number.isInteger(completion)&&prompt!>=0&&completion!>=0;
  await ledger.settle(id,known?prompt!:null,known?completion!:null);
  return result;
 }}}};
}
