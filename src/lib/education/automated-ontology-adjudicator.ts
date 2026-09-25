/** Autonomous, conservative adjudication for card-derived ontology candidates.
 * It is deliberately fail-closed: unclear candidates remain quarantined and
 * are re-scored when independent Anki/OB/ROCK evidence arrives. */
export type AutoEntityType = "anatomy_structure" | "procedure" | "imaging_finding" | "classification_system" | "condition";
export type AutoDecision = "promote" | "quarantine" | "reject";
export type AutoAdjudication = { decision: AutoDecision; entityType: AutoEntityType | null; score: number; reasons: string[] };

const FRAGMENT = /^(?:no difference|higher|lower|dark|light|general|force|compression|elastic|stimulate|upper|laterally|dorsally|life expectancy|viscoelastic)$/i;
const STATEMENT = /\b(?:is|are|with|without|overpowers|prevents|promotes|treated with|greater than|less than)\b/i;
const ANATOMY = /\b(?:nerve|artery|vein|tendon|muscle|ligament|bone|crest|fossa|tubercle|condyle|meniscus|cartilage|bursa|labrum|fascia|somite)s?$/i;
const PROCEDURE = /\b(?:orif|arthroplasty|osteotomy|tenotomy|tenodesis|fixation|repair|reconstruction|release|fusion|arthroscopy|debridement|graft)\b/i;
const IMAGING = /\b(?:view|sign|radiograph|x-ray|mri|ct|ultrasound|grashey)\b/i;
const CLASSIFICATION = /\b(?:classification|grade|stage|type)\b/i;
const CONDITION = /\b(?:fracture|tear|injury|syndrome|disease|arthritis|instability|infection|rupture|dislocation|lesion|deformity|necrosis|tendinitis|tenosynovitis)$/i;

export function adjudicateOntologyCandidate(input: { label: string; sourceCount: number; crossSourceCount?: number; duplicateConflict?: boolean }): AutoAdjudication {
  const label = input.label.trim().replace(/\s+/g, " ");
  const reasons: string[] = [];
  if (label.length < 4 || label.length > 90 || FRAGMENT.test(label) || STATEMENT.test(label) || /\b\d+(?:\.\d+)?\s*(?:mm|cm|%|°)\b/.test(label)) {
    return { decision: "reject", entityType: null, score: 0, reasons: ["non_atomic_or_generic_label"] };
  }
  if (input.duplicateConflict) return { decision: "quarantine", entityType: null, score: 0.35, reasons: ["duplicate_conflict"] };
  const entityType: AutoEntityType = ANATOMY.test(label) ? "anatomy_structure" : PROCEDURE.test(label) ? "procedure" : IMAGING.test(label) ? "imaging_finding" : CLASSIFICATION.test(label) ? "classification_system" : "condition";
  const typedEvidence = entityType !== "condition" || CONDITION.test(label);
  let score = typedEvidence ? 0.76 : 0.48;
  score += Math.min(0.12, Math.max(0, input.sourceCount - 1) * 0.04);
  score += Math.min(0.12, (input.crossSourceCount ?? 0) * 0.06);
  reasons.push(`type:${entityType}`, `sources:${input.sourceCount}`, `cross_sources:${input.crossSourceCount ?? 0}`);
  if (!typedEvidence) reasons.push("condition_type_not_lexically_supported");
  return { decision: score >= 0.82 ? "promote" : "quarantine", entityType, score: Number(score.toFixed(3)), reasons };
}
