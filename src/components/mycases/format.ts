import type { MyCasesLearningKind } from "@/lib/mycases/types";

export const LEARNING_KINDS: MyCasesLearningKind[] = ["note","pearl","reflection","preparation","question","preference","checklist","postop_learning"];
export const LEARNING_LABELS: Record<MyCasesLearningKind,string> = {note:"Notes",pearl:"Pearls",reflection:"Reflections",preparation:"Preparation",question:"Questions",preference:"Preferences",checklist:"Checklists",postop_learning:"Post-op learning"};
export function relativeDate(value:string) {
  const days=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/86_400_000));
  if(days===0)return "Updated today"; if(days===1)return "Updated yesterday"; if(days<30)return `Updated ${days} days ago`;
  return `Updated ${new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}`;
}
export function statusLabel(value:string){return value.charAt(0).toUpperCase()+value.slice(1)}
