"use client";
import { BookOpenText, FolderKanban, Images, LayoutDashboard, Search } from "lucide-react";
import type { MyCasesSection } from "./ui-types";

const sections:[MyCasesSection,string,typeof LayoutDashboard][]=[
  ["overview","Overview",LayoutDashboard],["cases","Cases",Images],["knowledge","Knowledge",BookOpenText],["collections","Collections",FolderKanban],["search","Search",Search],
];
export function MyCasesSectionNav({section,onChange}:{section:MyCasesSection;onChange:(section:MyCasesSection)=>void}){
  return <nav aria-label="MyCases sections" className="border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8" role="tablist">
      {sections.map(([id,label,Icon])=><button key={id} type="button" role="tab" aria-selected={section===id} onClick={()=>onChange(id)} className={`relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4 ${section===id?"text-slate-950":"text-slate-500 hover:text-slate-900"}`}><Icon className="h-4 w-4"/>{label}{section===id&&<span className="absolute inset-x-2 bottom-0 h-0.5 bg-blue-600"/>}</button>)}
    </div>
  </nav>
}
