import{submitProposal}from"../../../_lib";export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return submitProposal(request,(await params).id);}
