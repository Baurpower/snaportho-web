import assert from "node:assert/strict";
// @ts-expect-error TS5097 direct Node runner.
import {calculateDeckPublicationReadiness} from "./deck-publication-readiness.ts";
// @ts-expect-error TS5097 direct Node runner.
import {computeDeckManifestChecksum,DECK_MANIFEST_CONTRACT_VERSION,type DeckManifestCardV1} from "./deck-foundation.ts";
const id=(d:string)=>`${d.repeat(8)}-${d.repeat(4)}-4${d.repeat(3)}-8${d.repeat(3)}-${d.repeat(12)}`;
const card:DeckManifestCardV1={canonicalCardId:id("1"),canonicalCardVersionId:id("2"),noteGuid:"guid",cardOrdinal:0,nativeCardIdHint:"1",contentHash:"a".repeat(64),deckPath:"Deck",orderingKey:"0001/a",inclusionStatus:"included",canonicalEntityIds:[],metadata:{}};
const manifest={contractVersion:DECK_MANIFEST_CONTRACT_VERSION,releaseId:id("4"),releaseKey:"draft",releaseVersion:"0.1",releaseStatus:"draft" as const,manifestChecksum:computeDeckManifestChecksum([card]),minimumAddonVersion:null,cards:[card],metadata:{}};
const base={candidateId:id("5"),canonicalCardId:id("1"),canonicalCardVersionId:id("2"),canonicalEntityId:id("3"),reviewerIdentity:"Dr Reviewer",reviewerDecision:"approved",mappingRole:"teaches",reviewerConfidence:"0.96",provenanceMethod:"direct_human_review",evidenceHashes:"b".repeat(64),signalTypes:"content_token",ambiguityFlags:""};
const contexts=new Map([[`${id("1")}:${id("3")}`,{currentVersionId:id("2"),entityActive:true,entitySuperseded:false,entityType:"anatomy_structure"}]]);
const ready=calculateDeckPublicationReadiness({manifest,candidateRows:[base],noCandidateRows:[],contexts});assert.equal(ready.ready,true);assert.equal(ready.mappedCardCoveragePct,100);assert.equal(ready.proposedManifest.cards[0].canonicalEntityIds[0],id("3"));
for(const bad of [{...base,reviewerIdentity:""},{...base,reviewerConfidence:"0.90"},{...base,provenanceMethod:"curriculum_node_bridge"},{...base,evidenceHashes:"bad"},{...base,signalTypes:"tag|deck_path"},{...base,ambiguityFlags:"alias_collision"},{...base,canonicalCardVersionId:id("6")}])assert.equal(calculateDeckPublicationReadiness({manifest,candidateRows:[bad],noCandidateRows:[],contexts}).ready,false);
const incomplete=calculateDeckPublicationReadiness({manifest,candidateRows:[{...base,reviewerIdentity:"",reviewerDecision:"",reviewerConfidence:""}],noCandidateRows:[],contexts});assert.equal(incomplete.recommendation,"DO_NOT_PUBLISH");assert.equal(incomplete.excludedCardIds.length,1);
const classified=calculateDeckPublicationReadiness({manifest,candidateRows:[],noCandidateRows:[{canonicalCardId:id("1"),classification:"correctly_unmapped"}],contexts:new Map()});assert.equal(classified.ready,false,"a manifest with no eligible mapping fails closed");assert.equal(classified.proposedManifest.cards[0].inclusionStatus,"included");
console.log("deck-publication-readiness.test.ts: all assertions passed");
