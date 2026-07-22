import assert from "node:assert/strict";
// @ts-expect-error Direct Node test imports TypeScript source files.
import * as f from "./deck-mapping-factory.ts";
// @ts-expect-error Direct Node test imports TypeScript source files.
import { computeDeckManifestChecksum } from "./deck-foundation.ts";
const id=(d:string)=>`${d.repeat(8)}-${d.repeat(4)}-4${d.repeat(3)}-8${d.repeat(3)}-${d.repeat(12)}`;
const cards=["1","2"].map((d,i)=>({canonicalCardId:id(d),canonicalCardVersionId:id(String(i+3)),noteGuid:`guid-${d}`,cardOrdinal:0,nativeCardIdHint:null,contentHash:d.repeat(64),deckPath:"Deck::Branch",orderingKey:`000${i}/${d}`,inclusionStatus:"included",canonicalEntityIds:[],metadata:{}}));
const manifest={contractVersion:"snaportho-deck-manifest.v1",releaseId:id("5"),releaseKey:"draft-test",releaseVersion:"0.1.0",releaseStatus:"draft",manifestChecksum:computeDeckManifestChecksum(cards as never),minimumAddonVersion:null,cards,metadata:{}} as never;
const candidate={candidateId:id("6"),canonicalCardId:id("1"),canonicalCardVersionId:id("3"),canonicalEntityId:id("7"),proposedMappingRole:"teaches",confidence:.79,candidateMethod:"exact_preferred_label",signalTypes:["content_token"],evidenceHashes:["a".repeat(64)],ambiguityFlags:[],curriculumEvidenceContributed:false,lifecycleStatus:"needs_review",reviewerDecision:"",reviewerConfidence:"",reviewerNotes:"",reviewerIdentity:"",competingCandidateIds:[]};
const run=()=>f.runFactory({manifest,candidates:[candidate] as never,kgSnapshot:"kg-1",aliasSnapshot:"alias-1",cohortName:"test",expectedCardCount:2});
const a=run(),b=run();assert.equal(f.checksum(a),f.checksum(b),"run is reproducible");assert.equal(a.queueItems.length,2);assert.equal(new Set(a.queueItems.map(x=>x.canonicalCardId)).size,2);assert.equal(a.queueItems.find(x=>x.canonicalCardId===id("2"))?.queue,"no_mapping_confirm");assert.equal(a.publicationReadinessPreview.ready,false);assert.equal(a.humanReviewPacket.every(x=>Object.values(x).filter(v=>v==="approved"||v==="direct_human_review").length===0),true);
assert.throws(()=>f.runFactory({manifest,candidates:[{...candidate,canonicalCardVersionId:id("9")}] as never,kgSnapshot:"kg",aliasSnapshot:"alias",cohortName:"test"}),/stale_candidate_version/);
assert.throws(()=>f.runFactory({manifest,candidates:[] as never,kgSnapshot:"",aliasSnapshot:"alias",cohortName:"test"}),/snapshot_unavailable/);
assert.throws(()=>f.runFactory({manifest,candidates:[] as never,kgSnapshot:"kg",aliasSnapshot:"alias",cohortName:"test",stageSelection:["identity_validation"]}),/required_stage_skipped/);
const result=a.stageResults[0];assert.deepEqual(f.validateStageResult(result),[]);assert.ok(f.validateStageResult({...result,contractVersion:"v2"}).includes("unknown_contract_version"));assert.ok(f.validateStageResult({...result,outputChecksum:"b".repeat(64)}).includes("output_checksum_mismatch"));assert.equal(f.validateConceptRole("negated"),true);assert.equal(f.validateConceptRole("invented"),false);
const resumed=f.runFactory({manifest,candidates:[candidate] as never,kgSnapshot:"kg-1",aliasSnapshot:"alias-1",cohortName:"test",resumeResults:a.stageResults});assert.equal(resumed.stageResults[0],a.stageResults[0],"completed stage is idempotently resumed");
const failed={...a.stageResults[0],status:"failed" as const,retryCount:1};const retried=f.runFactory({manifest,candidates:[candidate] as never,kgSnapshot:"kg-1",aliasSnapshot:"alias-1",cohortName:"test",resumeResults:[failed],retryFailed:true});assert.equal(retried.stageResults[0].retryCount,2);
assert.deepEqual(a.queueItems,b.queueItems,"artifact ordering stable");
assert.throws(()=>f.assertBlankHumanReview([{...a.humanReviewPacket[0],decision:"approved"} as never]),/machine_populated_human_field/);
console.log("deck-mapping-factory.test.ts: all assertions passed");
