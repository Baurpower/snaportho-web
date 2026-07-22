import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
// @ts-expect-error Direct Node runner imports TypeScript source files.
import { checksum, runFactory, stableJson } from "../src/lib/education/deck-mapping-factory.ts";
import type { PublishedDeckManifestV1, VersionMappingCandidate } from "../src/lib/education/deck-foundation";

const args=new Map(process.argv.slice(2).map(v=>{const [k,...rest]=v.split("=");return[k,rest.join("=")||"true"];}));
if(args.has("--apply"))throw new Error("factory_has_no_apply_mode");
const inputDir=args.get("--input")??"/tmp/snaportho-deck-foundation-20260720-final3";
const outRoot=args.get("--out")??"/tmp/snaportho-anki-kg-factory";
const manifest=JSON.parse(await readFile(path.join(inputDir,"draft-deck-manifest.json"),"utf8")) as PublishedDeckManifestV1;
const candidates=JSON.parse(await readFile(path.join(inputDir,"mapping-candidates.json"),"utf8")) as VersionMappingCandidate[];
const kgSnapshot=args.get("--kg-snapshot")??"kg-beta-20260716-002";
const aliasSnapshot=args.get("--alias-snapshot")??"canonical-alias-snapshot-2026-07-20";
const result=runFactory({manifest,candidates,kgSnapshot,aliasSnapshot,cohortName:"foot-ankle-general-anatomy-62",expectedCardCount:62,now:"2026-07-20T00:00:00.000Z"});
const runId=String(result.runManifest.factoryRunId), out=path.join(outRoot,runId);
try{await access(out);if(!args.has("--resume"))throw new Error(`output_exists_use_resume:${out}`);}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
await mkdir(out,{recursive:true});
const artifacts:Record<string,unknown>={"factory-run-manifest.json":result.runManifest,"batch-manifest.json":result.batchManifest,"card-assignments.json":result.assignments,"stage-results.json":result.stageResults,"deterministic-candidates.json":result.deterministicCandidates,"extracted-concepts.json":result.extractedConcepts,"entity-resolution-candidates.json":result.entityResolutionCandidates,"critic-findings.json":result.criticFindings,"coverage-findings.json":result.coverageFindings,"cross-card-consistency.json":result.consistencyFindings,"machine-reviews.json":result.machineReviews,"consensus-decisions.json":result.consensusDecisions,"risk-classifications.json":result.riskClassifications,"queue-items.json":result.queueItems,"blank-human-review-packet.json":result.humanReviewPacket,"kg-alias-backlog.json":result.kgAliasBacklog,"deck-improvement-backlog.json":result.deckImprovementBacklog,"publication-readiness-preview.json":result.publicationReadinessPreview,"metrics.json":result.metrics};
for(const [name,value] of Object.entries(artifacts).sort(([a],[b])=>a.localeCompare(b)))await writeFile(path.join(out,name),`${stableJson(value)}\n`);
const inventory=Object.entries(artifacts).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>({name,checksum:checksum(value)}));await writeFile(path.join(out,"artifact-inventory.json"),`${stableJson(inventory)}\n`);
const m=result.metrics as Record<string,unknown>;const summary=`# Anki-to-KG mapping factory calibration\n\n- Mode: deterministic, filesystem-only dry run\n- Cohort: Foot & Ankle General Anatomy\n- Cards: ${m.cardsProcessed}\n- Machine proposals: ${m.proposedLinks} links across ${m.proposedMappedCards} cards\n- Proposed no mapping: ${m.proposedNoMappingCards} cards\n- Terminal routes: ${JSON.stringify(m.terminalRouteDistribution)}\n- Publication eligible: 0 (human review intentionally blank)\n- Run ID: ${runId}\n- Artifact inventory checksum: ${checksum(inventory)}\n\nNo card bodies are stored in these artifacts. No database write, human approval, ingestion, or publication occurred.\n`;await writeFile(path.join(out,"summary.md"),summary);
console.log(JSON.stringify({dryRun:true,mode:"deterministic",out,runId,metrics:m},null,2));
