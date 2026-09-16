import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("./.env.local","utf8").split("\n").filter(l=>l.includes("=")).map(l=>{const i=l.indexOf("=");let v=l.slice(i+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);return[l.slice(0,i).trim(),v];}));
const sb=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data:ents}=await sb.from("canonical_entities").select("id,preferred_label,normalized_label,entity_type").eq("is_active",true).range(0,1999);
const sing=(w)=>w.replace(/ies\b/g,"y").replace(/([sxz]|ch|sh)es\b/g,"$1").replace(/([^s])s\b/g,"$1");
const norm=(s)=>sing(String(s||"").toLowerCase().trim().replace(/\s+/g," "));
const clusters=new Map();
for(const e of ents){const k=norm(e.preferred_label);if(!clusters.has(k))clusters.set(k,[]);clusters.get(k).push(e);}
const dups=[...clusters.entries()].filter(([,a])=>a.length>1);
console.log(`entities: ${ents.length}`);
console.log(`singular-normalized clusters: ${clusters.size}`);
console.log(`clusters with >1 entity (near-duplicates): ${dups.length}`);
console.log(`redundant entities collapsible: ${dups.reduce((s,[,a])=>s+a.length-1,0)}`);
console.log("\nsample duplicate clusters:");
for(const [k,a] of dups.slice(0,20)) console.log(`  "${k}" (${a.length}): ${a.map(e=>`"${e.preferred_label}"[${e.entity_type}]`).join(" | ")}`);
