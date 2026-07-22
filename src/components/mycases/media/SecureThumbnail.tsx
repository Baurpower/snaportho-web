/* eslint-disable @next/next/no-img-element -- short-lived signed URLs must not pass through the image optimizer */
"use client";
import { ImageOff, Images } from "lucide-react";
import type { CaseMediaSummary } from "../ui-types";

export function ProcedurePlaceholder({procedure,compact=false}:{procedure:string;compact?:boolean}){
  const initials=procedure.split(/\s+/).filter(Boolean).slice(0,3).map(word=>word[0]).join("").toUpperCase();
  return <div className="absolute inset-0 overflow-hidden bg-slate-900" aria-hidden="true"><div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_20%_20%,#3b82f6_0,transparent_38%),radial-gradient(circle_at_85%_85%,#334155_0,transparent_40%)]"/><div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:32px_32px]"/><div className="relative flex h-full items-end justify-between p-4 text-white"><span className={`${compact?"text-xl":"text-3xl"} font-black tracking-tight text-white/90`}>{initials||"MC"}</span><Images className="h-5 w-5 text-blue-300"/></div></div>
}

export function SecureThumbnail({media,procedure,alt,className="",onRetry}:{media?:CaseMediaSummary;procedure:string;alt:string;className?:string;onRetry?:()=>void}){
  if(media?.loading)return <div className={`relative overflow-hidden bg-slate-200 ${className}`}><div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 motion-reduce:animate-none"/></div>;
  return <div className={`group relative overflow-hidden bg-slate-200 ${className}`}>
    {media?.thumbnailUrl&&!media.failed?<img src={media.thumbnailUrl} alt={alt} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transition-none" onError={onRetry}/>:<ProcedurePlaceholder procedure={procedure}/>} 
    {media?.failed&&<button type="button" onClick={(event)=>{event.stopPropagation();onRetry?.()}} className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-lg bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur focus-visible:ring-2 focus-visible:ring-white"><ImageOff className="h-4 w-4"/>Preview unavailable · Retry</button>}
  </div>
}
