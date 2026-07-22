import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = new Map(process.argv.slice(2).map((value) => { const [key, ...rest] = value.split("="); return [key, rest.join("=") || "true"]; }));
if (args.has("--apply")) throw new Error("assignment preparation has no apply mode");
const semantic = path.resolve(args.get("--semantic") ?? "/tmp/snaportho-anki-kg-semantic-20260720/4f873c45-396a-457c-8760-eb1b1acf2f7b");
const foundation = path.resolve(args.get("--foundation") ?? "/tmp/snaportho-deck-foundation-20260720-final3");
const out = path.resolve(args.get("--out") ?? "/tmp/snaportho-anki-reviewer-assignment");
const sample = JSON.parse(readFileSync(path.join(semantic,"calibration-sample.json"),"utf8"));
const packet = JSON.parse(readFileSync(path.join(semantic,"blank-human-calibration-packet.json"),"utf8"));
const manifest = JSON.parse(readFileSync(path.join(foundation,"draft-deck-manifest.json"),"utf8"));
if (sample.length !== 18) throw new Error("expected exact 18-card calibration sample");
const cards = new Map(manifest.cards.map((card: Record<string,unknown>) => [card.canonicalCardId,card]));
const items = sample.map((sampleItem: Record<string,any>, index: number) => {
  const card = cards.get(sampleItem.canonicalCardId) as Record<string,any> | undefined;
  if (!card || card.canonicalCardVersionId !== sampleItem.canonicalCardVersionId) throw new Error(`sample identity mismatch:${sampleItem.canonicalCardId}`);
  const rows = packet.filter((row: Record<string,any>) => row.canonicalCardId === sampleItem.canonicalCardId);
  return { canonicalCardId:card.canonicalCardId, canonicalCardVersionId:card.canonicalCardVersionId, baseContentHash:card.contentHash,
    noteGuid:card.noteGuid, cardOrdinal:card.cardOrdinal, nativeCardIdHint:card.nativeCardIdHint, deckPath:card.deckPath,
    factoryTerminalQueue:sampleItem.queue, riskTier:sampleItem.riskTier,
    proposals:rows.map((row:Record<string,any>)=>({canonicalEntityId:row.proposedEntityId||null,entityType:row.entityType||null,
      mappingRole:row.proposedMappingRole||null,machineConsensus:row.machineConsensus,criticDecisions:row.criticDecisions,
      competingCandidates:row.competingCandidates,evidenceHashes:row.evidenceHashes})),
    requiredHumanAction:rows[0]?.requiredHumanAction??"classify_no_mapping",itemStatus:"pending",sortOrder:index+1 };
});
function stable(value:any):string { if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(stable).join(",")}]`;return`{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,nested])=>`${JSON.stringify(k)}:${stable(nested)}`).join(",")}}`; }
const sha=(value:any)=>createHash("sha256").update(stable(value)).digest("hex");
const preview={contractVersion:"snaportho-anki-reviewer-assignment.v1",dryRun:true,assignmentType:"mapping_calibration",requiredReviewerRole:"mapping_reviewer",
  clinicalEditorRoleRequiredForChanges:true,deckReleaseId:manifest.releaseId,inputManifestChecksum:manifest.manifestChecksum,
  sourceArtifactChecksums:{calibrationSample:sha(sample),humanPacket:sha(packet)},reviewerUserId:null,status:"draft",cardCount:items.length,
  riskDistribution:Object.fromEntries(["A","B","C","D"].map(tier=>[tier,items.filter((item:any)=>item.riskTier===tier).length])),items};
const result={...preview,assignmentChecksum:sha(preview)};
if(existsSync(out)&&!args.has("--overwrite"))throw new Error(`output exists:${out}`);mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,"assignment-preview.json"),JSON.stringify(result,null,2)+"\n");
writeFileSync(path.join(out,"assignment-preview.md"),`# Reviewer calibration assignment preview\n\n- Dry run: yes\n- Cards: 18\n- Required role: mapping_reviewer\n- Risk: ${JSON.stringify(result.riskDistribution)}\n- Checksum: ${result.assignmentChecksum}\n\nNo reviewer is assigned and no database write occurred.\n`);
console.log(JSON.stringify({out,cardCount:18,riskDistribution:result.riskDistribution,checksum:result.assignmentChecksum},null,2));
