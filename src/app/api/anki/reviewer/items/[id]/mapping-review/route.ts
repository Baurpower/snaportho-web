import{submitMapping}from"../../../_lib";export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return submitMapping(request,(await params).id);}
