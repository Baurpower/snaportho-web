"use client";
import { useEffect, useState } from "react";
import { LockKeyhole, Plus } from "lucide-react";
import type { MyCasesCase, MyCasesLearningItem, MyCasesLearningKind } from "@/lib/mycases/types";
import type { MyCasesFixtureMediaMap, MyCasesSection } from "./ui-types";
import { MyCasesSectionNav } from "./MyCasesSectionNav";
import { useCaseMedia } from "./hooks/useCaseMedia";
import { MyCasesOverview } from "./overview/MyCasesOverview";
import { CasesLibrary } from "./cases/CasesLibrary";
import { CaseDetail } from "./cases/CaseDetail";
import { KnowledgeLibrary } from "./knowledge/KnowledgeLibrary";
import { CollectionsView } from "./collections/CollectionsView";
import { SearchView } from "./search/SearchView";
import { ItemForm } from "./forms/MyCasesForms";
import { CaseCreateDialog } from "./forms/CaseCreateDialog";

export function MyCasesWorkspace({initialCases,initialItems,initialMedia,audience}:{initialCases:MyCasesCase[];initialItems:MyCasesLearningItem[];initialMedia?:MyCasesFixtureMediaMap;audience:"student"|"resident"}){
  const [cases,setCases]=useState(initialCases),[items,setItems]=useState(initialItems),[section,setSection]=useState<MyCasesSection>("overview"),[knowledgeKind,setKnowledgeKind]=useState<MyCasesLearningKind|"all">("all"),[caseForm,setCaseForm]=useState(false),[itemFormCaseId,setItemFormCaseId]=useState<string|undefined|false>(false),[selectedCaseId,setSelectedCaseId]=useState<string|null>(null);const {media,refreshCaseMedia}=useCaseMedia(cases,initialMedia);const selectedCase=cases.find(item=>item.id===selectedCaseId)??null;const fixtureMode=Boolean(initialMedia);
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("view");if(requested==="notes"){setKnowledgeKind("note");setSection("knowledge")}},[]);
  const refresh=async()=>{if(fixtureMode)return;const [caseResponse,itemResponse]=await Promise.all([fetch("/api/mycases/cases?archived=true",{cache:"no-store"}),fetch("/api/mycases/learning-items?archived=true",{cache:"no-store"})]);if(caseResponse.ok)setCases((await caseResponse.json()).cases);if(itemResponse.ok)setItems((await itemResponse.json()).items)};
  const mutateItem=async(item:MyCasesLearningItem,patch:Partial<MyCasesLearningItem>)=>{if(fixtureMode){setItems(current=>current.map(entry=>entry.id===item.id?{...entry,...patch}:entry));return}await fetch(`/api/mycases/learning-items/${item.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)});await refresh()};
  const archiveCase=async(item:MyCasesCase)=>{if(fixtureMode){setCases(current=>current.map(entry=>entry.id===item.id?{...entry,is_archived:!entry.is_archived}:entry));return}await fetch(`/api/mycases/cases/${item.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({is_archived:!item.is_archived})});await refresh()};
  const openCreatedCase=async(item:MyCasesCase)=>{setCaseForm(false);setCases(current=>[item,...current.filter(entry=>entry.id!==item.id)]);setSection("cases");setSelectedCaseId(item.id);if(!fixtureMode){await refresh();await refreshCaseMedia(item.id)}};
  return <div className="min-h-[calc(100vh-52px)] bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">{audience==="resident"?<div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Private visual case library</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">MyCases</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">A structured operative learning journal built around the cases you want to remember.</p></div>:<div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Your private visual library</p><p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Recognize prior case exposure, connect it to what you learned, and prepare for what comes next.</p></div>}<div className="flex flex-wrap gap-2"><button onClick={()=>setCaseForm(true)} className="inline-flex min-h-11 items-center gap-2 border border-slate-300 bg-white px-4 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Plus className="h-4 w-4"/>Add case</button><button onClick={()=>setItemFormCaseId(undefined)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><Plus className="h-4 w-4"/>Add knowledge</button></div></div></header>
    <MyCasesSectionNav section={section} onChange={setSection}/>
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><div className="mb-7 flex items-start gap-2 border-l-2 border-blue-500 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-slate-600"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"/><p><strong className="text-slate-800">Educational content only.</strong> Never enter patient names, identifiers, encounter details, reports, or patient-specific information.</p></div>
      {section==="overview"&&<MyCasesOverview cases={cases} items={items} media={media} audience={audience} onCase={item=>setSelectedCaseId(item.id)} onSection={setSection} onAddItem={caseId=>setItemFormCaseId(caseId)} onAddCase={()=>setCaseForm(true)} onRetryMedia={refreshCaseMedia}/>} 
      {section==="cases"&&<CasesLibrary cases={cases} items={items} media={media} onCase={item=>setSelectedCaseId(item.id)} onRetryMedia={refreshCaseMedia}/>} 
      {section==="knowledge"&&<KnowledgeLibrary key={knowledgeKind} items={items} cases={cases} media={media} initialKind={knowledgeKind} onMutate={mutateItem} onAdd={caseId=>setItemFormCaseId(caseId)} onCase={item=>setSelectedCaseId(item.id)} onRetryMedia={refreshCaseMedia}/>} 
      {section==="collections"&&<CollectionsView cases={cases} items={items} media={media} onCase={item=>setSelectedCaseId(item.id)} onRetryMedia={refreshCaseMedia}/>} 
      {section==="search"&&<SearchView cases={cases} items={items} media={media} onCase={item=>setSelectedCaseId(item.id)} onRetryMedia={refreshCaseMedia}/>} 
    </main>
    {caseForm&&<CaseCreateDialog close={()=>setCaseForm(false)} onOpenCase={openCreatedCase}/>} 
    {itemFormCaseId!==false&&<ItemForm cases={cases} initialCaseId={itemFormCaseId} close={()=>setItemFormCaseId(false)} done={async()=>{setItemFormCaseId(false);await refresh()}}/>}
    {selectedCase&&<CaseDetail item={selectedCase} learning={items.filter(entry=>entry.case_id===selectedCase.id)} fixtureAssets={initialMedia?.[selectedCase.id]} close={()=>setSelectedCaseId(null)} onArchive={()=>void archiveCase(selectedCase)} onAddKnowledge={()=>setItemFormCaseId(selectedCase.id)} onMediaChanged={()=>void refreshCaseMedia(selectedCase.id)}/>} 
  </div>;
}
