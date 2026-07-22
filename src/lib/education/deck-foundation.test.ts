import assert from "node:assert/strict";
// @ts-expect-error TS5097: direct Node runner requires the source suffix.
import * as foundation from "./deck-foundation.ts";

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const card = { canonicalCardId:id("1"),canonicalCardVersionId:id("2"),noteGuid:"guid-1",cardOrdinal:0,nativeCardIdHint:"1",contentHash:"a".repeat(64),deckPath:"Deck::Branch",orderingKey:"0001/guid-1/0",inclusionStatus:"included",canonicalEntityIds:[id("3")],metadata:{} };
const manifest = { contractVersion:foundation.DECK_MANIFEST_CONTRACT_VERSION,releaseId:id("4"),releaseKey:"deck-1",releaseVersion:"1.0.0",releaseStatus:"published",manifestChecksum:foundation.computeDeckManifestChecksum([card] as foundation.DeckManifestCardV1[]),minimumAddonVersion:null,cards:[card],metadata:{} };
const options = { requirePublished:true, expectedVersionByCard:new Map([[id("1"),id("2")]]), approvedEntityIdsByCardVersion:new Map([[id("2"),new Set([id("3")])]]) };
assert.deepEqual(foundation.validatePublishedDeckManifest(manifest,options),[]);
assert.ok(foundation.validatePublishedDeckManifest({...manifest,contractVersion:"v2"},options).includes("unknown_contract_version"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,releaseStatus:"draft"},options).includes("manifest_not_published"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,cards:[card,{...card}]},options).includes("duplicate_guid_ordinal"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,cards:[{...card,canonicalCardVersionId:id("5")}]},options).includes("card_0_version_mismatch"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,cards:[{...card,contentHash:""}]},options).includes("card_0_missing_hash"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,manifestChecksum:"b".repeat(64)},options).includes("manifest_checksum_mismatch"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,cards:[{...card,metadata:{front:"unsafe"}}]},options).includes("card_0_unsafe_metadata"));
assert.ok(foundation.validatePublishedDeckManifest({...manifest,cards:[{...card,canonicalEntityIds:[id("5")]}]},options).includes("card_0_unapproved_entity"));

const metrics = [
  {deckBranch:"B",cardCount:75,uniqueNoteCount:70,curriculumMappedCount:30,canonicalLinkedCount:10,entityTypes:["condition","procedure"],duplicateIdentityCount:0,missingIdentityCount:0,currentVersionErrorCount:0,ambiguousAliasCount:0,tagSignalCardCount:70},
  {deckBranch:"A",cardCount:75,uniqueNoteCount:70,curriculumMappedCount:5,canonicalLinkedCount:0,entityTypes:["condition"],duplicateIdentityCount:0,missingIdentityCount:0,currentVersionErrorCount:0,ambiguousAliasCount:3,tagSignalCardCount:20},
  {deckBranch:"Too small",cardCount:20,uniqueNoteCount:20,curriculumMappedCount:20,canonicalLinkedCount:20,entityTypes:["condition","procedure","complication"],duplicateIdentityCount:0,missingIdentityCount:0,currentVersionErrorCount:0,ambiguousAliasCount:0,tagSignalCardCount:20},
];
assert.equal(foundation.selectRepresentativeCohort(metrics).selected?.deckBranch,"B");
assert.equal(foundation.selectRepresentativeCohort([...metrics].reverse()).selected?.deckBranch,"B");

const cardInput = {canonicalCardId:id("1"),canonicalCardVersionId:id("2"),currentVersionId:id("2"),noteId:id("6"),noteGuid:"guid-1",cardOrdinal:0,nativeCardIdHint:"1",contentHash:"a".repeat(64),deckPath:"Knee ACL",tags:["acl","reconstruction"],fieldNames:["Front"],normalizedContentTokens:["anterior","cruciate","ligament","reconstruction"],active:true,curriculumMapped:true,existingCanonicalEntityIds:[]};
const entities = [
  {id:id("3"),preferredLabel:"Anterior cruciate ligament reconstruction",normalizedLabel:"anterior cruciate ligament reconstruction",entityType:"procedure",aliases:["ACL reconstruction"],sourceAliases:[],active:true,lifecycleStatus:"canonical"},
  {id:id("4"),preferredLabel:"ACL injury",normalizedLabel:"acl injury",entityType:"condition",aliases:["ACL","ACL reconstruction"],sourceAliases:[],active:true,lifecycleStatus:"canonical"},
  {id:id("5"),preferredLabel:"Body region",normalizedLabel:"knee",entityType:"anatomy_structure",aliases:[],sourceAliases:[],active:true,lifecycleStatus:"canonical"},
];
const candidates = foundation.generateVersionMappingCandidates([cardInput],entities);
assert.ok(candidates.some((row) => row.canonicalEntityId===id("3")));
assert.ok(candidates.some((row) => row.ambiguityFlags.includes("alias_collision_or_ambiguous_abbreviation")));
assert.equal(candidates.some((row) => row.canonicalEntityId===id("5")),false,"deck-only broad match is rejected");
assert.deepEqual(candidates,foundation.generateVersionMappingCandidates([cardInput],entities),"candidate ordering is stable");
assert.equal(candidates.every((row)=>row.lifecycleStatus==="needs_review"&&row.reviewerDecision===""),true);
assert.equal(foundation.detectStaleVersion(id("2"),id("2")),"current");
assert.equal(foundation.detectStaleVersion(id("2"),id("3")),"stale");
assert.deepEqual(foundation.validateReviewRow({reviewerIdentity:"reviewer",reviewerDecision:"approved",mappingRole:"teaches",reviewerConfidence:"0.96",canonicalCardVersionId:id("2"),provenanceMethod:"direct_human_review"},{currentVersionId:id("2"),entityActive:true}),[]);
assert.ok(foundation.validateReviewRow({reviewerIdentity:"",reviewerDecision:"approved",mappingRole:"teaches",reviewerConfidence:"0.96",canonicalCardVersionId:id("2"),provenanceMethod:"curriculum_node_bridge"},{currentVersionId:id("3"),entityActive:false}).length>=4);
assert.throws(()=>foundation.safeJson({nested:{explanation:"unsafe"}}));

console.log("deck-foundation.test.ts: all assertions passed");
