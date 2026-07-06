/**
 * Sports Medicine Prepare cluster — condition manufacturing seeds.
 * Diagnosis-first neighborhoods; procedures connect as secondary entities.
 */

import type {
  PilotClaimDraft,
  PilotDecisionPointDraft,
  PilotEntitySpec,
  PilotRelationshipSpec,
} from "./kg-ankle-pilot-spec.ts";

export type SportsRegion = "knee" | "shoulder" | "elbow" | "foot_ankle";

export type SportsConditionSeed = {
  topicKey: string;
  displayName: string;
  primaryEntitySlug: string;
  curriculumNodeSlug: string;
  prepareTopicId: string;
  region: SportsRegion;
  description: string;
  oneLiner: string;
  aliases: string[];
  ankiCount: number;
  obCount: number;
  anatomySlugs: string[];
  crossNeighborhoodSlugs: string[];
  traumaCrossLinks: string[];
  specificEntities: PilotEntitySpec[];
  extraRelationships: PilotRelationshipSpec[];
  claimTemplates: Array<{
    suffix: string;
    claimType: string;
    claimText: string;
    entitySlug?: string;
    contextRelevance?: string[];
  }>;
  decisionPointTemplates: Array<{
    suffix: string;
    patternType: string;
    trigger: string;
    action: string;
    urgency: PilotDecisionPointDraft["urgency"];
    safetyCriticality: PilotDecisionPointDraft["safetyCriticality"];
    requiresAttendingReview: boolean;
  }>;
  isSharedAnatomyOwner?: boolean;
};

const entity = (
  slug: string,
  entityType: string,
  preferredLabel: string,
  description: string,
  pilotKey: string,
  extra: Record<string, unknown> = {}
): PilotEntitySpec => ({
  slug,
  entityType,
  preferredLabel,
  description,
  metadata: { pilot: pilotKey, ...extra },
});

const rel = (
  subjectSlug: string,
  predicate: string,
  objectSlug: string,
  metadata: Record<string, unknown> = {}
): PilotRelationshipSpec => ({ subjectSlug, predicate, objectSlug, metadata });

function kneeBase(slug: string, label: string, desc: string, pilotKey: string): PilotEntitySpec[] {
  return [
    entity(slug, "condition", label, desc, pilotKey, { clinical_kind: "sports_soft_tissue", maturity_target: 6 }),
    entity(`${slug}-classification`, "classification_system", `${label} Classification`, `Educational classification framework for ${label.toLowerCase()}.`, pilotKey),
    entity(`${slug}-mri-finding`, "imaging_finding", `${label} MRI Pattern`, `Characteristic MRI findings in ${label.toLowerCase()}.`, pilotKey),
    entity(`${slug}-reconstruction`, "procedure", `${label} Reconstruction`, `Operative reconstruction concept for ${label.toLowerCase()}.`, pilotKey),
    entity(`${slug}-rehab-protocol`, "treatment_principle", `${label} Rehabilitation`, `Return-to-play rehabilitation milestones for ${label.toLowerCase()}.`, pilotKey),
    entity(`${slug}-complication`, "complication", `${label} Complication`, `Common post-injury complication in ${label.toLowerCase()}.`, pilotKey),
    entity(`${slug}-exam-maneuver`, "exam_maneuver", `${label} Physical Exam`, `Key physical examination maneuver for ${label.toLowerCase()}.`, pilotKey),
  ];
}

function shoulderBase(slug: string, label: string, desc: string, pilotKey: string): PilotEntitySpec[] {
  return kneeBase(slug, label, desc, pilotKey);
}

function elbowBase(slug: string, label: string, desc: string, pilotKey: string): PilotEntitySpec[] {
  return kneeBase(slug, label, desc, pilotKey);
}

function footAnkleBase(slug: string, label: string, desc: string, pilotKey: string): PilotEntitySpec[] {
  return kneeBase(slug, label, desc, pilotKey);
}

function standardRelationships(
  seed: SportsConditionSeed,
  pilotKey: string,
  hubSlug: string
): PilotRelationshipSpec[] {
  const p = seed.primaryEntitySlug;
  const out: PilotRelationshipSpec[] = [
    rel(hubSlug, "prerequisite_for", p, {
      anatomy_role: "essential",
      relevance_reason: "diagnosis",
      educational_importance: "high",
      context_relevance: ["clinic", "call"],
    }),
    rel(p, "involves_anatomy", hubSlug, {
      anatomy_role: "essential",
      relevance_reason: "diagnosis",
      relationship_strength: "core",
      clinical_importance: "high",
    }),
    rel(p, "has_classification", `${p}-classification`, {
      educational_importance: "high",
      context_relevance: ["clinic", "oite"],
    }),
    rel(p, "has_imaging_finding", `${p}-mri-finding`, {
      relevance_reason: "workup",
      management_importance: "high",
    }),
    rel(p, "tested_by", `${p}-exam-maneuver`, {
      educational_importance: "high",
      context_relevance: ["clinic", "call"],
    }),
    rel(`${p}-mri-finding`, "indicates_treatment", `${p}-reconstruction`, {
      management_importance: "high",
      confidence: 0.75,
      review_status: "needs_review",
      note: "operative indication attending-dependent",
    }),
    rel(p, "treated_by", `${p}-reconstruction`, {
      management_importance: "high",
      context_relevance: ["or"],
    }),
    rel(p, "treated_by", `${p}-rehab-protocol`, {
      management_importance: "high",
      context_relevance: ["clinic"],
    }),
    rel(p, "has_complication", `${p}-complication`),
  ];
  for (const anatomySlug of seed.anatomySlugs) {
    out.push(
      rel(p, "involves_anatomy", anatomySlug, {
        anatomy_role: "essential",
        relevance_reason: "pathoanatomy",
        clinical_importance: "high",
      })
    );
  }
  for (const crossSlug of seed.crossNeighborhoodSlugs) {
    out.push(
      rel(p, "differential_for", crossSlug, {
        cross_neighborhood: true,
        educational_importance: "high",
        relevance_reason: "associated_injury",
      })
    );
  }
  for (const traumaSlug of seed.traumaCrossLinks) {
    out.push(
      rel(p, "differential_for", traumaSlug, {
        cross_cluster: true,
        cross_neighborhood: true,
        educational_importance: "high",
        relevance_reason: "trauma_overlap",
      })
    );
  }
  return [...out, ...seed.extraRelationships];
}

function standardClaims(seed: SportsConditionSeed): PilotClaimDraft[] {
  const p = seed.primaryEntitySlug;
  const prefix = seed.topicKey.replace(/-/g, "");
  const claims: PilotClaimDraft[] = [
    {
      draftId: `claim-${prefix}-oneliner`,
      claimType: "fact",
      claimText: seed.oneLiner,
      primaryEntitySlug: p,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId}`,
      contextRelevance: ["clinic", "call"],
    },
    {
      draftId: `claim-${prefix}-anatomy-pearl`,
      claimType: "anatomy_pearl",
      claimText: `${seed.displayName} pathoanatomy centers on ${seed.anatomySlugs.slice(0, 3).join(", ")} and related stabilizers.`,
      primaryEntitySlug: seed.anatomySlugs[0] ?? p,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} anatomyFocus`,
      contextRelevance: ["clinic", "oite"],
    },
    {
      draftId: `claim-${prefix}-board-trap`,
      claimType: "board_trap",
      claimText: `Students often underweight exam findings and over-rely on imaging when evaluating ${seed.displayName.toLowerCase()}.`,
      primaryEntitySlug: p,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} boardPearls`,
      contextRelevance: ["oite"],
    },
    {
      draftId: `claim-${prefix}-cognitive-trap`,
      claimType: "cognitive_trap",
      claimText: `Do not anchor on a single exam maneuver for ${seed.displayName.toLowerCase()} — integrate mechanism, instability symptoms, and imaging pattern.`,
      primaryEntitySlug: p,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} pimpQuestions`,
      contextRelevance: ["call", "clinic"],
    },
    {
      draftId: `claim-${prefix}-clinical-script`,
      claimType: "clinical_script",
      claimText: `State mechanism, key exam findings, imaging role, treatment concept, and return-to-play framework for ${seed.displayName.toLowerCase()}.`,
      primaryEntitySlug: p,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} caseSteps`,
      contextRelevance: ["call", "clinic"],
    },
    {
      draftId: `claim-${prefix}-rehab-milestone`,
      claimType: "fact",
      claimText: `Rehabilitation milestones and return-to-play criteria for ${seed.displayName.toLowerCase()} require attending-defined progression gates.`,
      primaryEntitySlug: `${p}-rehab-protocol`,
      importanceLevel: "L2",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} treatmentOptions`,
      contextRelevance: ["clinic"],
    },
  ];
  for (const tmpl of seed.claimTemplates) {
    claims.push({
      draftId: `claim-${prefix}-${tmpl.suffix}`,
      claimType: tmpl.claimType,
      claimText: tmpl.claimText,
      primaryEntitySlug: tmpl.entitySlug ?? p,
      importanceLevel: "L1",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId}`,
      contextRelevance: tmpl.contextRelevance,
    });
  }
  return claims;
}

function standardDecisionPoints(seed: SportsConditionSeed): PilotDecisionPointDraft[] {
  const p = seed.primaryEntitySlug;
  const prefix = seed.topicKey.replace(/-/g, "");
  const dps: PilotDecisionPointDraft[] = [
    {
      draftId: `dp-${prefix}-operative-indication`,
      subjectEntitySlug: p,
      patternType: "operative_indication",
      trigger: `Active athlete with functional instability or mechanical symptoms from ${seed.displayName.toLowerCase()} despite appropriate initial management`,
      action: `Discuss operative reconstruction versus continued rehabilitation; graft selection and fixation are attending decisions`,
      urgency: "urgent",
      safetyCriticality: "moderate",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} decisionMaking`,
      requiresAttendingReview: true,
    },
    {
      draftId: `dp-${prefix}-return-to-play`,
      subjectEntitySlug: p,
      patternType: "return_to_play",
      trigger: `Athlete approaching return-to-sport after ${seed.displayName.toLowerCase()} treatment`,
      action: `Apply sport-specific return-to-play criteria with strength, stability, and functional testing milestones`,
      urgency: "routine",
      safetyCriticality: "moderate",
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId} treatmentOptions`,
      requiresAttendingReview: true,
    },
  ];
  for (const tmpl of seed.decisionPointTemplates) {
    dps.push({
      draftId: `dp-${prefix}-${tmpl.suffix}`,
      subjectEntitySlug: p,
      patternType: tmpl.patternType,
      trigger: tmpl.trigger,
      action: tmpl.action,
      urgency: tmpl.urgency,
      safetyCriticality: tmpl.safetyCriticality,
      contentSource: "generated_draft",
      reviewStatus: "needs_review",
      sourceNote: `curriculum-data.ts ${seed.prepareTopicId}`,
      requiresAttendingReview: tmpl.requiresAttendingReview,
    });
  }
  return dps;
}

export const SPORTS_CONDITION_SEEDS: SportsConditionSeed[] = [
  {
    topicKey: "acl-tear",
    displayName: "ACL Tear",
    primaryEntitySlug: "acl-tear",
    curriculumNodeSlug: "knee-sports-acl-tear",
    prepareTopicId: "acl-tear",
    region: "knee",
    description: "Anterior cruciate ligament tear causing rotational knee instability after pivoting injury.",
    oneLiner: "ACL tears are instability injuries diagnosed by history and exam, with reconstruction decisions shaped by goals and associated pathology.",
    aliases: ["acl injury", "anterior cruciate ligament tear", "acl-tear-neighborhood"],
    ankiCount: 18,
    obCount: 21,
    anatomySlugs: ["acl", "medial-meniscus", "lateral-meniscus", "femoral-condyles"],
    crossNeighborhoodSlugs: ["meniscus-tear", "patellar-instability", "multiligament-knee-injury"],
    traumaCrossLinks: ["tibial-plateau-fracture"],
    isSharedAnatomyOwner: true,
    specificEntities: kneeBase("acl-tear", "ACL Tear", "Anterior cruciate ligament tear causing rotational knee instability.", "acl-tear-neighborhood"),
    extraRelationships: [
      rel("acl-tear", "involves_anatomy", "acl", { anatomy_role: "essential", relevance_reason: "primary_pathology" }),
      rel("acl-tear-exam-maneuver", "examines", "acl", { educational_importance: "high" }),
    ],
    claimTemplates: [
      { suffix: "lachman", claimType: "fact", claimText: "Lachman test is more sensitive than anterior drawer for ACL insufficiency in the acute setting.", entitySlug: "acl-tear-exam-maneuver" },
      { suffix: "bone-bruise", claimType: "fact", claimText: "Lateral femoral condyle and posterior tibial plateau bone bruise pattern on MRI supports ACL injury mechanism.", entitySlug: "acl-tear-mri-finding" },
    ],
    decisionPointTemplates: [
      {
        suffix: "prehab",
        patternType: "rehabilitation_protocol",
        trigger: "ACL tear planned for reconstruction with limited preoperative motion",
        action: "Prioritize prehab to regain extension and reduce arthrofibrosis risk before surgery",
        urgency: "routine",
        safetyCriticality: "moderate",
        requiresAttendingReview: true,
      },
    ],
  },
  {
    topicKey: "pcl-injury",
    displayName: "PCL Injury",
    primaryEntitySlug: "pcl-injury",
    curriculumNodeSlug: "knee-sports-pcl-injury",
    prepareTopicId: "pcl-injury",
    region: "knee",
    description: "Posterior cruciate ligament injury from posteriorly directed force or hyperflexion.",
    oneLiner: "PCL injuries range from posterior sag management to operative reconstruction in high-demand or multiligament settings.",
    aliases: ["pcl tear", "posterior cruciate ligament injury"],
    ankiCount: 8,
    obCount: 15,
    anatomySlugs: ["pcl", "tibial-plateau", "popliteal-artery"],
    crossNeighborhoodSlugs: ["acl-tear", "multiligament-knee-injury"],
    traumaCrossLinks: ["tibial-plateau-fracture"],
    specificEntities: kneeBase("pcl-injury", "PCL Injury", "Posterior cruciate ligament injury.", "pcl-injury-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "sag-sign", claimType: "fact", claimText: "Posterior sag and posterior drawer are key exam clues for PCL insufficiency." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "meniscus-tear",
    displayName: "Meniscus Tear",
    primaryEntitySlug: "meniscus-tear",
    curriculumNodeSlug: "knee-sports-meniscus-tear",
    prepareTopicId: "meniscus-tear",
    region: "knee",
    description: "Meniscal tear causing mechanical symptoms, joint line pain, or locking.",
    oneLiner: "Meniscus tears range from rehab problems to repairable mechanical lesions depending on pattern and symptoms.",
    aliases: ["meniscal tear", "bucket handle tear"],
    ankiCount: 14,
    obCount: 28,
    anatomySlugs: ["medial-meniscus", "lateral-meniscus", "acl"],
    crossNeighborhoodSlugs: ["acl-tear", "osteochondral-defect-knee"],
    traumaCrossLinks: ["tibial-plateau-fracture"],
    specificEntities: kneeBase("meniscus-tear", "Meniscus Tear", "Meniscal tear with mechanical or degenerative patterns.", "meniscus-tear-neighborhood"),
    extraRelationships: [
      rel("meniscus-tear", "involves_anatomy", "medial-meniscus", { anatomy_role: "essential" }),
      rel("meniscus-tear", "involves_anatomy", "lateral-meniscus", { anatomy_role: "essential" }),
    ],
    claimTemplates: [{ suffix: "repair-zone", claimType: "board_trap", claimText: "Peripheral longitudinal tears in vascular zones are the classic repairable meniscus lesion." }],
    decisionPointTemplates: [
      {
        suffix: "locked-knee",
        patternType: "operative_indication",
        trigger: "Locked knee with displaced bucket-handle meniscus tear",
        action: "Urgent arthroscopic reduction and repair or meniscectomy as pattern dictates",
        urgency: "urgent",
        safetyCriticality: "high",
        requiresAttendingReview: true,
      },
    ],
  },
  {
    topicKey: "patellar-instability",
    displayName: "Patellar Instability",
    primaryEntitySlug: "patellar-instability",
    curriculumNodeSlug: "knee-sports-patellar-instability",
    prepareTopicId: "patellar-instability",
    region: "knee",
    description: "Patellar subluxation or dislocation with extensor mechanism malalignment risk.",
    oneLiner: "Patellar instability is a tracking and soft-tissue restraint problem whose recurrence risk guides MPFL and bony procedure discussion.",
    aliases: ["patellar dislocation", "mpfl injury"],
    ankiCount: 10,
    obCount: 18,
    anatomySlugs: ["patella", "extensor-mechanism", "femoral-condyles"],
    crossNeighborhoodSlugs: ["acl-tear", "osteochondral-defect-knee"],
    traumaCrossLinks: ["patella-fracture"],
    specificEntities: kneeBase("patellar-instability", "Patellar Instability", "Recurrent or acute patellar instability.", "patellar-instability-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "j-sign", claimType: "fact", claimText: "Apprehension and J-sign suggest lateral patellar tracking and instability." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "multiligament-knee-injury",
    displayName: "Multiligament Knee Injury",
    primaryEntitySlug: "multiligament-knee-injury",
    curriculumNodeSlug: "knee-sports-multiligament-knee-injury",
    prepareTopicId: "multiligament-knee-injury",
    region: "knee",
    description: "Combined cruciate and collateral knee ligament disruption with vascular and nerve risk.",
    oneLiner: "Multiligament knee injuries demand vascular exam, reduction, and staged reconstruction planning.",
    aliases: ["knee dislocation", "multi-ligament knee injury"],
    ankiCount: 6,
    obCount: 12,
    anatomySlugs: ["acl", "pcl", "mcl", "lcl", "posterolateral-corner", "popliteal-artery", "common-peroneal-nerve"],
    crossNeighborhoodSlugs: ["acl-tear", "pcl-injury"],
    traumaCrossLinks: ["tibial-plateau-fracture", "distal-femur-fracture"],
    specificEntities: kneeBase("multiligament-knee-injury", "Multiligament Knee Injury", "Combined knee ligament injury pattern.", "multiligament-knee-injury-neighborhood"),
    extraRelationships: [
      rel("multiligament-knee-injury", "at_risk_structure", "popliteal-artery", { clinical_importance: "high", context_relevance: ["call", "or"] }),
      rel("multiligament-knee-injury", "at_risk_structure", "common-peroneal-nerve", { clinical_importance: "high", context_relevance: ["call", "or"] }),
    ],
    claimTemplates: [{ suffix: "vascular", claimType: "red_flag", claimText: "Knee dislocation and multiligament injury require documented distal perfusion and ABI when indicated." }],
    decisionPointTemplates: [
      {
        suffix: "vascular-emergency",
        patternType: "operative_indication",
        trigger: "Multiligament knee injury with absent or diminished distal pulses",
        action: "Emergent vascular evaluation and revascularization before definitive ligament reconstruction",
        urgency: "emergent",
        safetyCriticality: "emergency",
        requiresAttendingReview: true,
      },
    ],
  },
  {
    topicKey: "osteochondral-defect-knee",
    displayName: "Osteochondral Defect of the Knee",
    primaryEntitySlug: "osteochondral-defect-knee",
    curriculumNodeSlug: "knee-sports-osteochondral-defect-knee",
    prepareTopicId: "osteochondral-defect-knee",
    region: "knee",
    description: "Focal articular cartilage and subchondral bone defect of the knee.",
    oneLiner: "Osteochondral knee defects are focal cartilage-bone lesions where lesion stability, location, and symptoms drive operative strategy.",
    aliases: ["osteochondritis dissecans knee", "ocd knee"],
    ankiCount: 5,
    obCount: 14,
    anatomySlugs: ["articular-cartilage", "femoral-condyles", "tibial-plateau"],
    crossNeighborhoodSlugs: ["meniscus-tear", "patellar-instability"],
    traumaCrossLinks: ["tibial-plateau-fracture"],
    specificEntities: kneeBase("osteochondral-defect-knee", "Osteochondral Defect of the Knee", "Focal knee osteochondral lesion.", "osteochondral-defect-knee-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "stable-unstable", claimType: "fact", claimText: "Lesion stability on imaging and exam separates observation from operative fixation or grafting." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "anterior-shoulder-instability",
    displayName: "Anterior Shoulder Instability",
    primaryEntitySlug: "anterior-shoulder-instability",
    curriculumNodeSlug: "shoulder-elbow-anterior-shoulder-instability",
    prepareTopicId: "shoulder-instability",
    region: "shoulder",
    description: "Anterior glenohumeral instability with labral and capsular injury.",
    oneLiner: "Shoulder instability is usually a labral/capsular injury pattern whose recurrence risk is highest in young active patients.",
    aliases: ["shoulder instability", "anterior dislocation", "bankart lesion"],
    ankiCount: 12,
    obCount: 24,
    anatomySlugs: ["labrum", "glenoid", "humeral-head", "axillary-nerve"],
    crossNeighborhoodSlugs: ["rotator-cuff-tear", "slap-tear"],
    traumaCrossLinks: ["proximal-humerus-fracture"],
    specificEntities: shoulderBase("anterior-shoulder-instability", "Anterior Shoulder Instability", "Anterior shoulder instability pattern.", "anterior-shoulder-instability-neighborhood"),
    extraRelationships: [
      rel("anterior-shoulder-instability", "at_risk_structure", "axillary-nerve", { clinical_importance: "high", context_relevance: ["call"] }),
    ],
    claimTemplates: [{ suffix: "recurrence", claimType: "board_trap", claimText: "First-time anterior dislocation in a young athlete carries high recurrence risk without stabilization." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "rotator-cuff-tear",
    displayName: "Rotator Cuff Tear",
    primaryEntitySlug: "rotator-cuff-tear",
    curriculumNodeSlug: "shoulder-elbow-rotator-cuff-tear",
    prepareTopicId: "rotator-cuff-tear",
    region: "shoulder",
    description: "Rotator cuff tendon tear causing pain and weakness with preserved passive motion.",
    oneLiner: "Rotator cuff tears are shoulder dysfunction problems where age, acuity, and functional loss shape urgency.",
    aliases: ["cuff tear", "supraspinatus tear"],
    ankiCount: 16,
    obCount: 32,
    anatomySlugs: ["rotator-cuff", "supraspinatus", "infraspinatus", "subscapularis", "humeral-head"],
    crossNeighborhoodSlugs: ["anterior-shoulder-instability", "proximal-biceps-tendon-pathology"],
    traumaCrossLinks: ["proximal-humerus-fracture"],
    specificEntities: shoulderBase("rotator-cuff-tear", "Rotator Cuff Tear", "Rotator cuff tendon tear.", "rotator-cuff-tear-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "pseudoparalysis", claimType: "fact", claimText: "Weak active elevation with preserved passive ROM suggests cuff tear rather than adhesive capsulitis." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "ac-joint-separation",
    displayName: "AC Joint Separation",
    primaryEntitySlug: "ac-joint-separation",
    curriculumNodeSlug: "shoulder-elbow-ac-joint-separation",
    prepareTopicId: "ac-joint-separation",
    region: "shoulder",
    description: "Acromioclavicular joint disruption with coracoclavicular ligament injury.",
    oneLiner: "AC separations are graded shoulder girdle injuries where displacement and patient demand guide operative versus nonoperative care.",
    aliases: ["ac separation", "acromioclavicular separation"],
    ankiCount: 6,
    obCount: 16,
    anatomySlugs: ["ac-joint", "clavicle"],
    crossNeighborhoodSlugs: ["anterior-shoulder-instability", "rotator-cuff-tear"],
    traumaCrossLinks: ["clavicle-fracture", "proximal-humerus-fracture"],
    specificEntities: shoulderBase("ac-joint-separation", "AC Joint Separation", "Acromioclavicular joint separation.", "ac-joint-separation-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "rockwood", claimType: "fact", claimText: "Rockwood classification communicates AC joint displacement and CC ligament injury severity." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "slap-tear",
    displayName: "SLAP Tear",
    primaryEntitySlug: "slap-tear",
    curriculumNodeSlug: "shoulder-elbow-slap-tear",
    prepareTopicId: "slap-tear",
    region: "shoulder",
    description: "Superior labrum anterior-posterior tear involving biceps anchor.",
    oneLiner: "SLAP tears are superior labrum-biceps anchor injuries that mimic instability and impingement presentations.",
    aliases: ["superior labrum tear", "slap lesion"],
    ankiCount: 5,
    obCount: 14,
    anatomySlugs: ["labrum", "biceps-anchor", "glenoid"],
    crossNeighborhoodSlugs: ["anterior-shoulder-instability", "proximal-biceps-tendon-pathology", "rotator-cuff-tear"],
    traumaCrossLinks: ["proximal-humerus-fracture"],
    specificEntities: shoulderBase("slap-tear", "SLAP Tear", "Superior labrum anterior-posterior tear.", "slap-tear-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "obriens", claimType: "fact", claimText: "O'Brien and crank tests help screen for superior labrum pathology in overhead athletes." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "proximal-biceps-tendon-pathology",
    displayName: "Proximal Biceps Tendon Pathology",
    primaryEntitySlug: "proximal-biceps-tendon-pathology",
    curriculumNodeSlug: "shoulder-elbow-proximal-biceps-tendon-pathology",
    prepareTopicId: "proximal-biceps-tendon-pathology",
    region: "shoulder",
    description: "Proximal biceps tendinitis, partial tear, or rupture at the shoulder.",
    oneLiner: "Proximal biceps pathology presents with anterior shoulder pain and Popeye deformity after rupture.",
    aliases: ["biceps tendinitis", "proximal biceps rupture"],
    ankiCount: 4,
    obCount: 12,
    anatomySlugs: ["biceps-anchor", "labrum", "rotator-cuff"],
    crossNeighborhoodSlugs: ["rotator-cuff-tear", "slap-tear"],
    traumaCrossLinks: ["proximal-humerus-fracture"],
    specificEntities: shoulderBase("proximal-biceps-tendon-pathology", "Proximal Biceps Tendon Pathology", "Proximal biceps tendon disorder.", "proximal-biceps-tendon-pathology-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "popeye", claimType: "fact", claimText: "Distal migration of the biceps muscle belly suggests long head rupture (Popeye sign)." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "ucl-injury",
    displayName: "UCL Injury",
    primaryEntitySlug: "ucl-injury",
    curriculumNodeSlug: "shoulder-elbow-ucl-injury",
    prepareTopicId: "ucl-injury",
    region: "elbow",
    description: "Ulnar collateral ligament injury in throwing athletes.",
    oneLiner: "UCL injuries in throwers present with medial elbow pain and valgus instability requiring graded return-to-throw planning.",
    aliases: ["ucl tear", "tommy john injury"],
    ankiCount: 7,
    obCount: 18,
    anatomySlugs: ["ucl", "elbow-joint", "radial-collateral-ligament"],
    crossNeighborhoodSlugs: ["distal-biceps-tendon-rupture"],
    traumaCrossLinks: ["distal-humerus-fracture"],
    specificEntities: elbowBase("ucl-injury", "UCL Injury", "Ulnar collateral ligament injury.", "ucl-injury-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "valgus", claimType: "fact", claimText: "Valgus stress testing and throwing history are central to UCL injury evaluation." }],
    decisionPointTemplates: [
      {
        suffix: "tommy-john",
        patternType: "operative_indication",
        trigger: "Throwing athlete with confirmed UCL tear and inability to return to sport after rehab",
        action: "Discuss UCL reconstruction (Tommy John) with graft selection and return-to-throw timeline",
        urgency: "routine",
        safetyCriticality: "moderate",
        requiresAttendingReview: true,
      },
    ],
  },
  {
    topicKey: "distal-biceps-tendon-rupture",
    displayName: "Distal Biceps Tendon Rupture",
    primaryEntitySlug: "distal-biceps-tendon-rupture",
    curriculumNodeSlug: "shoulder-elbow-distal-biceps-tendon-rupture",
    prepareTopicId: "distal-biceps-tendon-rupture",
    region: "elbow",
    description: "Distal biceps tendon rupture with flexion and supination weakness.",
    oneLiner: "Distal biceps rupture causes weakness and hook test abnormality; early repair preserves supination strength.",
    aliases: ["distal biceps rupture", "biceps avulsion"],
    ankiCount: 4,
    obCount: 10,
    anatomySlugs: ["distal-biceps-tendon", "radial-nerve", "elbow-joint"],
    crossNeighborhoodSlugs: ["ucl-injury"],
    traumaCrossLinks: ["distal-humerus-fracture"],
    specificEntities: elbowBase("distal-biceps-tendon-rupture", "Distal Biceps Tendon Rupture", "Distal biceps tendon rupture.", "distal-biceps-tendon-rupture-neighborhood"),
    extraRelationships: [
      rel("distal-biceps-tendon-rupture", "at_risk_structure", "radial-nerve", { clinical_importance: "moderate", context_relevance: ["or"] }),
    ],
    claimTemplates: [{ suffix: "hook-test", claimType: "fact", claimText: "Hook test loss and ecchymosis over the antecubital fossa support distal biceps rupture." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "achilles-tendon-rupture",
    displayName: "Achilles Tendon Rupture",
    primaryEntitySlug: "achilles-tendon-rupture",
    curriculumNodeSlug: "foot-ankle-achilles-tendon-rupture",
    prepareTopicId: "achilles-tendon-rupture",
    region: "foot_ankle",
    description: "Achilles tendon rupture with sudden pop and plantarflexion weakness.",
    oneLiner: "Achilles rupture is usually a clinical diagnosis where early recognition preserves treatment options.",
    aliases: ["achilles rupture"],
    ankiCount: 10,
    obCount: 20,
    anatomySlugs: ["achilles-tendon", "calcaneus"],
    crossNeighborhoodSlugs: ["chronic-lateral-ankle-instability", "osteochondral-lesion-talus"],
    traumaCrossLinks: ["calcaneus-fracture", "talus-fracture", "ankle-fracture"],
    specificEntities: footAnkleBase("achilles-tendon-rupture", "Achilles Tendon Rupture", "Achilles tendon rupture.", "achilles-tendon-rupture-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "thompson", claimType: "fact", claimText: "Positive Thompson test with sudden pop history is often sufficient to diagnose Achilles rupture." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "chronic-lateral-ankle-instability",
    displayName: "Chronic Lateral Ankle Instability",
    primaryEntitySlug: "chronic-lateral-ankle-instability",
    curriculumNodeSlug: "foot-ankle-chronic-lateral-ankle-instability",
    prepareTopicId: "chronic-lateral-ankle-instability",
    region: "foot_ankle",
    description: "Recurrent lateral ankle giving-way after inversion sprain with ATFL/CFL incompetence.",
    oneLiner: "Chronic lateral ankle instability follows inadequately rehabilitated inversion injuries with ATFL/CFL laxity.",
    aliases: ["ankle instability", "lateral ankle instability"],
    ankiCount: 6,
    obCount: 14,
    anatomySlugs: ["atfl", "cfl", "talus"],
    crossNeighborhoodSlugs: ["syndesmotic-sprain", "achilles-tendon-rupture"],
    traumaCrossLinks: ["ankle-fracture"],
    specificEntities: footAnkleBase("chronic-lateral-ankle-instability", "Chronic Lateral Ankle Instability", "Recurrent lateral ankle instability.", "chronic-lateral-ankle-instability-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "brostrom", claimType: "fact", claimText: "Failed bracing and PT in functional athletes may lead to Brostrom lateral ligament repair discussion." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "syndesmotic-sprain",
    displayName: "Syndesmotic Sprain",
    primaryEntitySlug: "syndesmotic-sprain",
    curriculumNodeSlug: "foot-ankle-syndesmotic-sprain",
    prepareTopicId: "syndesmotic-sprain",
    region: "foot_ankle",
    description: "High ankle sprain with syndesmotic ligament disruption.",
    oneLiner: "Syndesmotic sprains cause prolonged recovery when missed; external rotation and squeeze tests raise suspicion.",
    aliases: ["high ankle sprain", "syndesmosis injury"],
    ankiCount: 5,
    obCount: 16,
    anatomySlugs: ["syndesmosis", "talus", "deltoid-ligament"],
    crossNeighborhoodSlugs: ["chronic-lateral-ankle-instability"],
    traumaCrossLinks: ["ankle-fracture", "pilon-fracture"],
    specificEntities: footAnkleBase("syndesmotic-sprain", "Syndesmotic Sprain", "Syndesmotic high ankle sprain.", "syndesmotic-sprain-neighborhood"),
    extraRelationships: [
      rel("syndesmotic-sprain", "involves_anatomy", "syndesmosis", { anatomy_role: "essential", relevance_reason: "primary_pathology" }),
      rel("syndesmotic-sprain", "differential_for", "ankle-fracture", { cross_cluster: true, educational_importance: "high" }),
    ],
    claimTemplates: [{ suffix: "weber-link", claimType: "board_trap", claimText: "Weber B/C ankle fracture patterns and syndesmotic injury share instability language — evaluate mortise and syndesmosis integrity." }],
    decisionPointTemplates: [],
  },
  {
    topicKey: "osteochondral-lesion-talus",
    displayName: "Osteochondral Lesion of the Talus",
    primaryEntitySlug: "osteochondral-lesion-talus",
    curriculumNodeSlug: "foot-ankle-osteochondral-lesion-talus",
    prepareTopicId: "osteochondral-lesion-talus",
    region: "foot_ankle",
    description: "Focal osteochondral defect of the talar dome after ankle injury.",
    oneLiner: "Osteochondral talar lesions cause persistent ankle pain after sprain and may need operative cartilage restoration.",
    aliases: ["olt", "talus ocd"],
    ankiCount: 4,
    obCount: 12,
    anatomySlugs: ["talus", "articular-cartilage"],
    crossNeighborhoodSlugs: ["chronic-lateral-ankle-instability", "syndesmotic-sprain"],
    traumaCrossLinks: ["talus-fracture", "ankle-fracture"],
    specificEntities: footAnkleBase("osteochondral-lesion-talus", "Osteochondral Lesion of the Talus", "Talar osteochondral lesion.", "osteochondral-lesion-talus-neighborhood"),
    extraRelationships: [],
    claimTemplates: [{ suffix: "berndt-harty", claimType: "fact", claimText: "Berndt and Harty classification describes talar osteochondral lesion stage and subchondral involvement." }],
    decisionPointTemplates: [],
  },
];

export function regionHubSlug(region: SportsRegion): string {
  switch (region) {
    case "knee":
      return "sports-knee-anatomy-hub";
    case "shoulder":
      return "sports-shoulder-anatomy-hub";
    case "elbow":
      return "sports-elbow-anatomy-hub";
    case "foot_ankle":
      return "sports-foot-ankle-anatomy-hub";
  }
}

export function buildClaimsForSeed(seed: SportsConditionSeed): PilotClaimDraft[] {
  return standardClaims(seed);
}

export function buildDecisionPointsForSeed(seed: SportsConditionSeed): PilotDecisionPointDraft[] {
  return standardDecisionPoints(seed);
}

export function buildRelationshipsForSeed(seed: SportsConditionSeed, pilotKey: string): PilotRelationshipSpec[] {
  return standardRelationships(seed, pilotKey, regionHubSlug(seed.region));
}

export function getPilotKeyForSeed(seed: SportsConditionSeed): string {
  return `${seed.topicKey}-neighborhood`;
}