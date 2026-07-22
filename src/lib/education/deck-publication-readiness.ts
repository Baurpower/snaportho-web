// @ts-expect-error TS5097 direct Node tooling imports the source module.
import { computeDeckManifestChecksum, type DeckManifestCardV1, type PublishedDeckManifestV1, validateReviewRow } from "./deck-foundation.ts";

export const NO_CANDIDATE_CLASSIFICATIONS = [
  "correctly_unmapped", "missing_alias", "missing_canonical_entity", "extraction_failure",
  "threshold_too_conservative", "nonclinical_or_low_value", "multiconcept_or_ambiguous",
] as const;
export type NoCandidateClassification = typeof NO_CANDIDATE_CLASSIFICATIONS[number];
export type CandidateContext = { currentVersionId: string; entityActive: boolean; entitySuperseded: boolean; entityType: string };

export type ReadinessResult = {
  ready: boolean; recommendation: "PUBLISH" | "DO_NOT_PUBLISH"; errors: string[];
  candidateCounts: { approved: number; rejected: number; needsChanges: number; incomplete: number; eligible: number };
  mappedCardCount: number; totalCardCount: number; mappedCardCoveragePct: number;
  coverageByEntityType: Record<string, number>; coverageByMappingRole: Record<string, number>;
  unresolvedAmbiguities: string[]; staleCardVersions: string[]; inactiveOrSupersededEntities: string[];
  noCandidateClassifications: Record<string, number>; missingAliasBacklog: string[]; missingEntityBacklog: string[];
  extractionOrRulesFailures: string[]; remainingClinicianDecisions: string[]; excludedCardIds: string[];
  eligibleEntityIdsByCard: Record<string, string[]>; proposedManifest: PublishedDeckManifestV1;
};

const SHA256 = /^[0-9a-f]{64}$/;
function split(value: string): string[] { return value.split("|").map((v)=>v.trim()).filter(Boolean); }

export function calculateDeckPublicationReadiness(input: {
  manifest: PublishedDeckManifestV1;
  candidateRows: Array<Record<string,string>>;
  noCandidateRows: Array<Record<string,string>>;
  contexts: Map<string,CandidateContext>;
}): ReadinessResult {
  const errors: string[]=[]; const eligibleRows: Array<Record<string,string>>=[];
  const counts={approved:0,rejected:0,needsChanges:0,incomplete:0,eligible:0};
  const unresolved=new Set<string>(); const stale=new Set<string>(); const inactive=new Set<string>();
  const decisions=new Set<string>(); const candidateCards=new Set(input.candidateRows.map((r)=>r.canonicalCardId));
  for(const row of input.candidateRows){
    const context=input.contexts.get(`${row.canonicalCardId}:${row.canonicalEntityId}`);
    if(!row.reviewerDecision){counts.incomplete++;decisions.add(`candidate ${row.candidateId}: reviewer decision`);}
    else if(row.reviewerDecision==="approved")counts.approved++; else if(row.reviewerDecision==="rejected")counts.rejected++; else if(row.reviewerDecision==="needs_changes")counts.needsChanges++; else errors.push(`candidate ${row.candidateId}: invalid decision`);
    if(!row.reviewerIdentity)decisions.add(`candidate ${row.candidateId}: named reviewer`);
    if(!row.reviewerConfidence)decisions.add(`candidate ${row.candidateId}: reviewer confidence`);
    if(!context){errors.push(`candidate ${row.candidateId}: missing database context`);continue;}
    const rowErrors=validateReviewRow(row,{currentVersionId:context.currentVersionId,entityActive:context.entityActive&&!context.entitySuperseded});
    if(row.canonicalCardVersionId!==context.currentVersionId)stale.add(row.canonicalCardId);
    if(!context.entityActive||context.entitySuperseded)inactive.add(row.canonicalEntityId);
    const ambiguity=split(row.ambiguityFlags); if(ambiguity.length)unresolved.add(row.candidateId);
    const evidenceHashes=split(row.evidenceHashes); if(!evidenceHashes.length||evidenceHashes.some((h)=>!SHA256.test(h)))rowErrors.push("invalid_evidence_hash");
    const signals=split(row.signalTypes); const directSignals=signals.filter((s)=>!["curriculum_history","tag","deck_path"].includes(s));
    if(row.reviewerDecision==="approved"&&directSignals.length===0)rowErrors.push("approval_has_only_curriculum_tag_or_deck_evidence");
    if(row.reviewerDecision==="approved"&&Number(row.reviewerConfidence)<0.95)rowErrors.push("approval_confidence_below_0_95");
    if(row.reviewerDecision==="approved"&&ambiguity.length)rowErrors.push("approval_has_unresolved_ambiguity");
    if(rowErrors.length)errors.push(...rowErrors.map((e)=>`candidate ${row.candidateId}: ${e}`));
    else if(row.reviewerDecision==="approved"){eligibleRows.push(row);counts.eligible++;}
  }

  const manifestIds=new Set(input.manifest.cards.map((c)=>c.canonicalCardId));
  const noCandidateIds=new Set<string>(); const classifications=Object.fromEntries(NO_CANDIDATE_CLASSIFICATIONS.map((v)=>[v,0])) as Record<string,number>;
  const missingAlias:string[]=[];const missingEntity:string[]=[];const extraction:string[]=[];
  for(const row of input.noCandidateRows){
    const cardId=row.canonicalCardId; if(noCandidateIds.has(cardId))errors.push(`no-candidate ${cardId}: duplicate classification`); noCandidateIds.add(cardId);
    if(!manifestIds.has(cardId))errors.push(`no-candidate ${cardId}: card not in manifest`);
    if(candidateCards.has(cardId))errors.push(`no-candidate ${cardId}: card has generated candidate`);
    if(!NO_CANDIDATE_CLASSIFICATIONS.includes(row.classification as NoCandidateClassification)){errors.push(`no-candidate ${cardId}: invalid or missing classification`);decisions.add(`no-candidate ${cardId}: classification`);continue;}
    classifications[row.classification]++;
    if(row.classification==="missing_alias")missingAlias.push(cardId);
    if(row.classification==="missing_canonical_entity")missingEntity.push(cardId);
    if(["extraction_failure","threshold_too_conservative"].includes(row.classification))extraction.push(cardId);
  }
  const expectedNoCandidate=input.manifest.cards.filter((c)=>!candidateCards.has(c.canonicalCardId));
  for(const card of expectedNoCandidate)if(!noCandidateIds.has(card.canonicalCardId))decisions.add(`no-candidate ${card.canonicalCardId}: classification`);

  const entitiesByCard:Record<string,string[]>={}; for(const row of eligibleRows)(entitiesByCard[row.canonicalCardId]??=[]).push(row.canonicalEntityId);
  const correctlyUnmapped=new Set(input.noCandidateRows.filter((r)=>r.classification==="correctly_unmapped").map((r)=>r.canonicalCardId));
  const included=new Set([...Object.keys(entitiesByCard),...correctlyUnmapped]);
  const proposedCards:DeckManifestCardV1[]=input.manifest.cards.map((card)=>({...card,inclusionStatus:included.has(card.canonicalCardId)?"included":"excluded",canonicalEntityIds:[...(entitiesByCard[card.canonicalCardId]??[])].sort(),metadata:{}}));
  const proposedManifest:PublishedDeckManifestV1={...input.manifest,releaseStatus:"draft",cards:proposedCards,manifestChecksum:computeDeckManifestChecksum(proposedCards),metadata:{validationStatus:"publication_readiness_only"}};
  const excluded=proposedCards.filter((c)=>c.inclusionStatus!=="included").map((c)=>c.canonicalCardId).sort();
  const byType:Record<string,number>={};const byRole:Record<string,number>={};for(const row of eligibleRows){const ctx=input.contexts.get(`${row.canonicalCardId}:${row.canonicalEntityId}`)!;byType[ctx.entityType]=(byType[ctx.entityType]??0)+1;byRole[row.mappingRole]=(byRole[row.mappingRole]??0)+1;}
  if(decisions.size)errors.push("clinician_review_incomplete"); if(unresolved.size)errors.push("unresolved_ambiguity"); if(stale.size)errors.push("stale_versions"); if(inactive.size)errors.push("inactive_or_superseded_entities");
  const ready=errors.length===0&&excluded.length===0&&counts.eligible>0;
  return {ready,recommendation:ready?"PUBLISH":"DO_NOT_PUBLISH",errors:[...new Set(errors)].sort(),candidateCounts:counts,
    mappedCardCount:Object.keys(entitiesByCard).length,totalCardCount:input.manifest.cards.length,mappedCardCoveragePct:Math.round(Object.keys(entitiesByCard).length/input.manifest.cards.length*1000)/10,
    coverageByEntityType:byType,coverageByMappingRole:byRole,unresolvedAmbiguities:[...unresolved].sort(),staleCardVersions:[...stale].sort(),inactiveOrSupersededEntities:[...inactive].sort(),
    noCandidateClassifications:classifications,missingAliasBacklog:missingAlias.sort(),missingEntityBacklog:missingEntity.sort(),extractionOrRulesFailures:extraction.sort(),
    remainingClinicianDecisions:[...decisions].sort(),excludedCardIds:excluded,eligibleEntityIdsByCard:entitiesByCard,proposedManifest};
}
