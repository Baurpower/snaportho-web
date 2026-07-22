/** Strictly read-only validation of clinician-completed cohort review inputs. */
import {existsSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import path from "node:path";
import pg from "pg";
// @ts-expect-error TS5097 direct Node runner.
import {calculateDeckPublicationReadiness,type CandidateContext} from "../src/lib/education/deck-publication-readiness.ts";
import {parseCsv} from "./lib/education/review-csv.ts";

const {Client}=pg;
function arg(name:string,fallback:string){return path.resolve(process.argv.find((v)=>v.startsWith(`--${name}=`))?.slice(name.length+3)??fallback);}
function loadEnv(file:string){const out:Record<string,string>={};if(!existsSync(file))return out;for(const line of readFileSync(file,"utf8").split(/\r?\n/)){const v=line.trim();if(!v||v.startsWith("#")||!v.includes("="))continue;const i=v.indexOf("=");out[v.slice(0,i).trim()]=v.slice(i+1).trim().replace(/^['"]|['"]$/g,"");}return out;}
async function main(){
  const base=arg("input","/tmp/snaportho-deck-foundation-20260720-final3");const out=arg("out","/tmp/snaportho-deck-readiness-20260720");
  const manifestPath=arg("manifest",path.join(base,"draft-deck-manifest.json"));const reviewPath=arg("reviews",path.join(base,"mapping-review-packet.csv"));const classPath=arg("classifications",path.join(base,"no-candidate-classifications.csv"));
  if(!existsSync(manifestPath)||!existsSync(reviewPath))throw new Error("Draft manifest and candidate review packet are required");
  const manifest=JSON.parse(readFileSync(manifestPath,"utf8"));const candidateRows=parseCsv(readFileSync(reviewPath,"utf8"));const noCandidateRows=existsSync(classPath)?parseCsv(readFileSync(classPath,"utf8")):[];
  const env={...loadEnv(path.resolve(".env.local")),...process.env};if(!env.DATABASE_URL?.trim())throw new Error("DATABASE_URL required for current-version/entity verification");
  const db=new Client({connectionString:env.DATABASE_URL.trim(),ssl:{rejectUnauthorized:false},application_name:"anki_deck_readiness_readonly"});await db.connect();let rolled=false;
  try{await db.query("begin");await db.query("set transaction read only");const mode=(await db.query<{transaction_read_only:string}>("show transaction_read_only")).rows[0]?.transaction_read_only;if(mode!=="on")throw new Error("Read-only guard failed");
    const pairs=[...new Set(candidateRows.map((r)=>`${r.canonicalCardId}:${r.canonicalEntityId}`))];const contexts=new Map<string,CandidateContext>();
    for(const pair of pairs){const [cardId,entityId]=pair.split(":");const result=await db.query<{current_version_id:string;is_active:boolean;status:string;entity_type:string}>(`select c.current_version_id,e.is_active,e.status,e.entity_type from public.canonical_cards c cross join public.canonical_entities e where c.id=$1 and e.id=$2`,[cardId,entityId]);const row=result.rows[0];if(row)contexts.set(pair,{currentVersionId:row.current_version_id,entityActive:row.is_active,entitySuperseded:["deprecated","replaced","merged","split"].includes(row.status),entityType:row.entity_type});}
    const result=calculateDeckPublicationReadiness({manifest,candidateRows,noCandidateRows,contexts});
    if(!existsSync(classPath)){result.errors.push("no_candidate_classification_file_missing");result.recommendation="DO_NOT_PUBLISH";result.ready=false;}
    const report={generatedAt:new Date().toISOString(),safety:{transactionReadOnly:mode,transactionDisposition:"rollback",mutations:0},inputs:{manifestPath,reviewPath,classPath,classificationFilePresent:existsSync(classPath),candidateRows:candidateRows.length,noCandidateRows:noCandidateRows.length},...result,proposedManifest:undefined};
    const markdown=["# Deck publication-readiness validation","",`Recommendation: **${result.recommendation}**`,"",`- Candidate decisions: ${result.candidateCounts.approved} approved, ${result.candidateCounts.rejected} rejected, ${result.candidateCounts.needsChanges} needs changes, ${result.candidateCounts.incomplete} incomplete`,`- Production-gate mappings: ${result.candidateCounts.eligible}`,`- Mapped-card coverage: ${result.mappedCardCount}/${result.totalCardCount} (${result.mappedCardCoveragePct}%)`,`- Remaining clinician decisions: ${result.remainingClinicianDecisions.length}`,`- Excluded cards: ${result.excludedCardIds.length}`,`- Classification file present: ${existsSync(classPath)}`,"","## Blocking errors","",...result.errors.map((e)=>`- ${e}`),"","## Remaining clinician decisions","",...result.remainingClinicianDecisions.map((e)=>`- ${e}`),"","## Missing alias backlog","",...(result.missingAliasBacklog.length?result.missingAliasBacklog.map((e)=>`- ${e}`):["- None classified; classification input is incomplete."]),"","## Missing entity backlog","",...(result.missingEntityBacklog.length?result.missingEntityBacklog.map((e)=>`- ${e}`):["- None classified; classification input is incomplete."]),"","## Proposed exclusions","",...result.excludedCardIds.map((e)=>`- ${e}`),""].join("\n");
    mkdirSync(out,{recursive:true});writeFileSync(path.join(out,"publication-readiness.json"),JSON.stringify(report,null,2)+"\n");writeFileSync(path.join(out,"publication-readiness.md"),markdown);writeFileSync(path.join(out,"proposed-draft-manifest.json"),JSON.stringify(result.proposedManifest,null,2)+"\n");
    await db.query("rollback");rolled=true;process.stdout.write(JSON.stringify({out,recommendation:result.recommendation,ready:result.ready,candidateCounts:result.candidateCounts,remainingClinicianDecisions:result.remainingClinicianDecisions.length,excludedCards:result.excludedCardIds.length,classificationFilePresent:existsSync(classPath)},null,2)+"\n");
  }finally{if(!rolled)try{await db.query("rollback");}catch{}await db.end();}
}
main().catch((e)=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
