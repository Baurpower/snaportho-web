import { CURRICULUM_EXPANSION_SEEDS } from '@/lib/student-curriculum/curriculum-expansion-seeds';
import type {
  CurriculumCase,
  CurriculumTopic,
  CurriculumTrack,
  DeepStudyTemplate,
  DifficultyLevel,
  FastStudyTemplate,
  LearningObjective,
  StudentLevel,
  StudentCurriculumValidationIssue,
  StudentCurriculumValidationResult,
} from '@/lib/student-curriculum/curriculum-types';

type TopicSeed = {
  id: string;
  title: string;
  aliases: string[];
  trackId: string;
  subspecialty: string;
  studentLevel: StudentLevel;
  difficulty: DifficultyLevel;
  tags: string[];
  commonCases: Array<{ name: string; scenario: string }>;
  learningObjectives: string[];
  prerequisites?: string[];
  relatedTopicIds: string[];
  estimatedFastMinutes?: number;
  estimatedDeepMinutes?: number;
  fast: Omit<FastStudyTemplate, 'overviewPrompt'> & { overviewPrompt?: string };
  deep: Omit<DeepStudyTemplate, 'overviewPrompt' | 'relatedTopics'> & {
    overviewPrompt?: string;
    relatedTopics?: string[];
  };
};

function toCaseId(topicId: string, index: number): string {
  return `${topicId}-case-${index + 1}`;
}

function toObjectiveId(topicId: string, index: number): string {
  return `${topicId}-objective-${index + 1}`;
}

function buildCases(
  topicId: string,
  cases: Array<{ name: string; scenario: string }>
): CurriculumCase[] {
  return cases.map((curriculumCase, index) => ({
    id: toCaseId(topicId, index),
    name: curriculumCase.name,
    scenario: curriculumCase.scenario,
  }));
}

function buildObjectives(
  topicId: string,
  objectives: string[]
): LearningObjective[] {
  return objectives.map((objective, index) => ({
    id: toObjectiveId(topicId, index),
    objective,
  }));
}

function createTopic(seed: TopicSeed): CurriculumTopic {
  return {
    id: seed.id,
    title: seed.title,
    aliases: seed.aliases,
    trackId: seed.trackId,
    subspecialty: seed.subspecialty,
    studentLevel: seed.studentLevel,
    difficulty: seed.difficulty,
    tags: seed.tags,
    commonCases: buildCases(seed.id, seed.commonCases),
    learningObjectives: buildObjectives(seed.id, seed.learningObjectives),
    prerequisites: seed.prerequisites ?? [],
    relatedTopicIds: seed.relatedTopicIds,
    estimatedFastMinutes: seed.estimatedFastMinutes ?? 12,
    estimatedDeepMinutes: seed.estimatedDeepMinutes ?? 35,
    fastStudyTemplate: {
      overviewPrompt:
        seed.fast.overviewPrompt ??
        `Review the essentials of ${seed.title} for a medical student preparing to see the problem in clinic, the ED, or the OR.`,
      mustKnow: seed.fast.mustKnow,
      anatomyFocus: seed.fast.anatomyFocus,
      caseSteps: seed.fast.caseSteps,
      pimpQuestions: seed.fast.pimpQuestions,
      orSurvivalTips: seed.fast.orSurvivalTips,
      oneLiner: seed.fast.oneLiner,
    },
    deepStudyTemplate: {
      overviewPrompt:
        seed.deep.overviewPrompt ??
        `Work through ${seed.title} as a structured orthopaedic study topic for a senior medical student.`,
      anatomy: seed.deep.anatomy,
      classification: seed.deep.classification,
      imaging: seed.deep.imaging,
      decisionMaking: seed.deep.decisionMaking,
      treatmentOptions: seed.deep.treatmentOptions,
      surgicalApproach: seed.deep.surgicalApproach,
      complications: seed.deep.complications,
      boardPearls: seed.deep.boardPearls,
      selfCheckQuestions: seed.deep.selfCheckQuestions,
      relatedTopics: seed.deep.relatedTopics ?? seed.relatedTopicIds,
    },
  };
}

const TOPIC_SEEDS: TopicSeed[] = [
  {
    id: 'distal-radius-fracture',
    title: 'Distal Radius Fracture',
    aliases: ['colles fracture', 'smith fracture', 'wrist fracture'],
    trackId: 'trauma',
    subspecialty: 'Trauma',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['fracture', 'wrist', 'reduction', 'casting'],
    commonCases: [
      { name: 'FOOSH wrist injury', scenario: 'Older adult after ground-level fall with dinner-fork deformity.' },
      { name: 'Post-reduction check', scenario: 'Need to assess alignment and median nerve status after closed reduction.' },
    ],
    learningObjectives: [
      'Recognize common distal radius fracture patterns and mechanism.',
      'Describe initial reduction, splinting, and neurovascular checks.',
      'Identify red flags that push management toward fixation.',
    ],
    prerequisites: ['fracture-healing', 'reading-xrays'],
    relatedTopicIds: ['metacarpal-fracture', 'open-fractures', 'compartment-syndrome'],
    fast: {
      mustKnow: ['Mechanism, alignment, median nerve exam, immobilization choice'],
      anatomyFocus: ['Distal radius articular surface', 'DRUJ relationship', 'Median nerve in carpal tunnel'],
      caseSteps: ['Describe mechanism', 'Check NV exam', 'Review AP/lateral films', 'State splint and follow-up plan'],
      pimpQuestions: ['What radiographic parameters matter?', 'When is dorsal comminution important?'],
      orSurvivalTips: ['Know acceptable radial height/inclination language', 'Mention finger ROM after splinting'],
      oneLiner: 'A distal radius fracture is a high-frequency trauma problem where alignment and median nerve status drive urgency.',
    },
    deep: {
      anatomy: ['Distal radius columns', 'Volar cortex as reduction reference', 'DRUJ stabilizers'],
      classification: ['Extra-articular vs intra-articular', 'Dorsally displaced vs volarly displaced'],
      imaging: ['Standard wrist radiographs', 'CT for complex articular injury'],
      decisionMaking: ['Assess displacement, instability, articular step-off, patient demand'],
      treatmentOptions: ['Splint/cast', 'Closed reduction', 'Percutaneous fixation', 'Volar plating'],
      surgicalApproach: ['Volar FCR approach basics', 'Restoring length and volar tilt'],
      complications: ['Loss of reduction', 'Median neuropathy', 'CRPS', 'Tendon irritation'],
      boardPearls: ['Malalignment tolerance is lower in active patients and articular injuries'],
      selfCheckQuestions: ['What defines instability?', 'How do you counsel about post-reduction films?'],
    },
  },
  {
    id: 'ankle-fracture',
    title: 'Ankle Fracture',
    aliases: ['bimalleolar fracture', 'trimalleolar fracture', 'malleolus fracture'],
    trackId: 'trauma',
    subspecialty: 'Trauma',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['ankle', 'mortise', 'syndesmosis', 'trauma'],
    commonCases: [
      { name: 'Twisting ankle injury', scenario: 'Swollen ankle after sports injury with inability to bear weight.' },
      { name: 'Unstable mortise', scenario: 'Emergency department consult with widened medial clear space.' },
    ],
    learningObjectives: [
      'Use exam and radiographs to identify stable versus unstable ankle fractures.',
      'Explain the importance of the mortise and syndesmotic injury.',
      'Outline ED immobilization and operative indications.',
    ],
    prerequisites: ['reading-xrays', 'musculoskeletal-exam'],
    relatedTopicIds: ['ankle-sprain', 'calcaneus-fracture', 'open-fractures'],
    fast: {
      mustKnow: ['Mortise congruity, skin status, NV exam, syndesmosis language'],
      anatomyFocus: ['Malleoli', 'Deltoid ligament', 'Syndesmosis'],
      caseSteps: ['Inspect skin', 'Describe fracture pattern', 'Comment on mortise', 'State splint and weight-bearing plan'],
      pimpQuestions: ['What makes the fracture unstable?', 'How do stress views help?'],
      orSurvivalTips: ['Say whether this is isolated fibula or bimalleolar equivalent', 'Mention posterior malleolus if present'],
      oneLiner: 'Ankle fracture management hinges on whether the mortise is stable and whether soft tissues are safe.',
    },
    deep: {
      anatomy: ['Ankle ring concept', 'Syndesmotic stabilizers', 'Posterior malleolus role'],
      classification: ['Weber', 'Supination-external rotation patterns'],
      imaging: ['AP/lateral/mortise views', 'Stress views', 'CT for posterior malleolus planning'],
      decisionMaking: ['Stable isolated fractures versus unstable patterns requiring fixation'],
      treatmentOptions: ['Boot/cast', 'Reduction and splint', 'ORIF with syndesmotic fixation when indicated'],
      surgicalApproach: ['Lateral malleolus exposure', 'Medial malleolus fixation basics', 'Syndesmotic assessment'],
      complications: ['Wound issues', 'Malreduction of syndesmosis', 'Post-traumatic arthritis'],
      boardPearls: ['A deltoid injury can make an isolated fibula fracture unstable'],
      selfCheckQuestions: ['How do you identify a bimalleolar equivalent?', 'When is CT useful?'],
    },
  },
  {
    id: 'hip-fracture',
    title: 'Hip Fracture',
    aliases: ['femoral neck fracture', 'intertrochanteric fracture', 'geriatric hip fracture'],
    trackId: 'trauma',
    subspecialty: 'Trauma',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['hip', 'geriatrics', 'fragility fracture', 'operative urgency'],
    commonCases: [
      { name: 'Shortened externally rotated leg', scenario: 'Elderly patient after fall with pain and inability to ambulate.' },
      { name: 'Occult hip fracture', scenario: 'Persistent groin pain with negative x-rays after a fall.' },
    ],
    learningObjectives: [
      'Differentiate femoral neck from intertrochanteric fractures.',
      'Explain why hip fractures are urgent multidisciplinary problems.',
      'Outline common operative strategies by fracture location.',
    ],
    prerequisites: ['fracture-healing', 'reading-xrays'],
    relatedTopicIds: ['hip-osteoarthritis', 'pathologic-fracture', 'open-fractures'],
    fast: {
      mustKnow: ['Fracture location, displacement, weight-bearing status, medical optimization'],
      anatomyFocus: ['Femoral neck blood supply', 'Intertrochanteric region', 'Abductor mechanics'],
      caseSteps: ['Confirm fracture location', 'State admission/optimization need', 'Describe likely implant category'],
      pimpQuestions: ['Why are displaced femoral neck fractures different?', 'What changes management in younger patients?'],
      orSurvivalTips: ['Use intracapsular versus extracapsular language', 'Mention DVT prophylaxis and mobilization'],
      oneLiner: 'Hip fracture is a time-sensitive fragility injury where anatomy determines fixation versus arthroplasty.',
    },
    deep: {
      anatomy: ['Retinacular blood supply', 'Intertrochanteric bone quality', 'Function of hemi versus THA biomechanics'],
      classification: ['Femoral neck displacement concepts', 'Stable versus unstable intertrochanteric patterns'],
      imaging: ['Pelvis and hip radiographs', 'MRI for occult fracture'],
      decisionMaking: ['Age, baseline function, fracture pattern, head viability, medical risk'],
      treatmentOptions: ['Cannulated screws', 'Cephalomedullary nail', 'Hemiarthroplasty', 'Total hip arthroplasty'],
      surgicalApproach: ['Traction table concepts', 'Arthroplasty positioning goals'],
      complications: ['Avascular necrosis', 'Nonunion', 'Delirium', 'Implant failure'],
      boardPearls: ['Displaced femoral neck fractures in older adults are often arthroplasty problems'],
      selfCheckQuestions: ['How does fracture location affect blood supply risk?', 'Who benefits from THA over hemi?'],
    },
  },
  {
    id: 'tibial-shaft-fracture',
    title: 'Tibial Shaft Fracture',
    aliases: ['tib-fib fracture', 'tibia fracture'],
    trackId: 'trauma',
    subspecialty: 'Trauma',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['leg fracture', 'intramedullary nail', 'compartment syndrome'],
    commonCases: [
      { name: 'High-energy leg injury', scenario: 'Motorcycle collision with deformity and soft tissue swelling.' },
      { name: 'Closed tibia fracture follow-up', scenario: 'Need to monitor pain and compartments after splinting.' },
    ],
    learningObjectives: [
      'Describe initial stabilization and soft-tissue priorities in tibial shaft fractures.',
      'Recognize the association with compartment syndrome.',
      'Compare nonoperative treatment with IM nailing indications.',
    ],
    prerequisites: ['compartment-syndrome', 'open-fractures'],
    relatedTopicIds: ['compartment-syndrome', 'open-fractures', 'calcaneus-fracture'],
    fast: {
      mustKnow: ['Soft tissue exam, compartments, alignment, weight-bearing plan'],
      anatomyFocus: ['Tibial shaft blood supply', 'Anterior compartment', 'Proximal entry point landmarks'],
      caseSteps: ['Describe wound status', 'Check compartments', 'Review alignment', 'State immobilization and operative plan'],
      pimpQuestions: ['What are compartment syndrome warning signs?', 'Why do open tibias need urgency?'],
      orSurvivalTips: ['Always mention soft tissues and compartment checks', 'Know common IM nail starting point language'],
      oneLiner: 'Tibial shaft fractures are soft-tissue injuries first and bony injuries second.',
    },
    deep: {
      anatomy: ['Subcutaneous tibial crest', 'Compartment layout', 'Proximal/distal metaphyseal challenges'],
      classification: ['Open versus closed', 'Simple versus segmental/comminuted'],
      imaging: ['Full-length tibia/fibula radiographs', 'Adjacent joint views'],
      decisionMaking: ['Closed stable injuries versus deformity/open/high-energy patterns'],
      treatmentOptions: ['Cast or brace in select cases', 'External fixation bridge', 'IM nail', 'Plate fixation in selected patterns'],
      surgicalApproach: ['Suprapatellar versus infrapatellar nailing concepts'],
      complications: ['Compartment syndrome', 'Malunion', 'Infection', 'Nonunion'],
      boardPearls: ['Serial exams matter because compartment syndrome is a clinical diagnosis'],
      selfCheckQuestions: ['What makes a tibia fracture unstable?', 'Why can fibula status matter for alignment?'],
    },
  },
  {
    id: 'compartment-syndrome',
    title: 'Compartment Syndrome',
    aliases: ['acute compartment syndrome', 'tense compartments'],
    trackId: 'trauma',
    subspecialty: 'Trauma',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['emergency', 'fasciotomy', 'ischemia', 'pain out of proportion'],
    commonCases: [
      { name: 'Escalating leg pain after fracture', scenario: 'Patient has severe pain with passive stretch after tibia fracture.' },
      { name: 'Forearm swelling after crush', scenario: 'Need to decide whether emergent fasciotomy is indicated.' },
    ],
    learningObjectives: [
      'Recognize the clinical diagnosis of compartment syndrome.',
      'Explain why delayed treatment leads to irreversible damage.',
      'Describe emergent management including fasciotomy principles.',
    ],
    prerequisites: ['fracture-healing'],
    relatedTopicIds: ['tibial-shaft-fracture', 'open-fractures', 'flexor-tendon-injury'],
    fast: {
      mustKnow: ['Pain out of proportion, pain with passive stretch, serial exam urgency'],
      anatomyFocus: ['Leg compartments', 'Forearm compartments', 'Muscle and nerve ischemia timeline'],
      caseSteps: ['State concern immediately', 'Repeat focused exam', 'Loosen dressings', 'Escalate for fasciotomy'],
      pimpQuestions: ['Why are pulses unreliable?', 'When do pressure measurements help?'],
      orSurvivalTips: ['Never reassure solely from present pulses', 'Use “time-sensitive limb emergency” language'],
      oneLiner: 'Compartment syndrome is a clinical emergency where worsening pain and tense compartments trump waiting for tests.',
    },
    deep: {
      anatomy: ['Compartments at risk', 'Perfusion pressure concept', 'Nerves commonly affected'],
      classification: ['Acute traumatic versus exertional'],
      imaging: ['No imaging should delay treatment', 'Pressure checks as adjuncts only'],
      decisionMaking: ['High suspicion and evolving exam findings favor fasciotomy'],
      treatmentOptions: ['Emergent fasciotomy', 'Return trips for debridement and closure'],
      surgicalApproach: ['Two-incision four-compartment leg release basics', 'Volar forearm release concepts'],
      complications: ['Muscle necrosis', 'Contracture', 'Rhabdomyolysis', 'Amputation'],
      boardPearls: ['Pulselessness is late; pain with passive stretch is earlier and more useful'],
      selfCheckQuestions: ['When would you measure pressures?', 'How do casts or dressings change the plan?'],
    },
  },
  {
    id: 'open-fractures',
    title: 'Open Fractures',
    aliases: ['compound fracture'],
    trackId: 'trauma',
    subspecialty: 'Trauma',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['antibiotics', 'irrigation and debridement', 'trauma bay', 'soft tissue'],
    commonCases: [
      { name: 'Open tibia fracture', scenario: 'Visible bone and contaminated wound after high-energy injury.' },
      { name: 'Open hand fracture', scenario: 'Small puncture wound over fracture with tendon concern.' },
    ],
    learningObjectives: [
      'Identify key priorities in the first evaluation of an open fracture.',
      'Explain timing of antibiotics, tetanus, and operative debridement.',
      'Describe why soft tissue coverage and fixation are linked decisions.',
    ],
    prerequisites: ['fracture-healing'],
    relatedTopicIds: ['tibial-shaft-fracture', 'distal-radius-fracture', 'metacarpal-fracture'],
    fast: {
      mustKnow: ['Antibiotics early, tetanus, sterile dressing, splint, serial NV exams'],
      anatomyFocus: ['Soft tissue envelope', 'Contamination pathways', 'Local blood supply'],
      caseSteps: ['Document wound', 'Start antibiotics', 'Photograph if appropriate', 'Plan debridement/fixation pathway'],
      pimpQuestions: ['How are open fractures classified?', 'Why is bedside irrigation not definitive treatment?'],
      orSurvivalTips: ['Lead with antibiotics timing', 'Describe wound size and contamination without probing deeply'],
      oneLiner: 'Open fractures are antibiotic-and-soft-tissue emergencies before they are definitive fixation cases.',
    },
    deep: {
      anatomy: ['Soft tissue coverage zones', 'Periosteal blood supply importance'],
      classification: ['Open fracture severity by wound size, energy, and contamination'],
      imaging: ['Injury radiographs plus adjacent joints', 'CT when articular extension matters'],
      decisionMaking: ['Balance contamination, stability, and coverage needs'],
      treatmentOptions: ['Urgent irrigation and debridement', 'External fixation', 'Definitive fixation when ready', 'Plastic surgery coverage'],
      surgicalApproach: ['Serial debridement concepts', 'Temporary stabilization principles'],
      complications: ['Infection', 'Nonunion', 'Hardware failure', 'Soft tissue loss'],
      boardPearls: ['Antibiotics should not wait for the OR'],
      selfCheckQuestions: ['How do you present an open fracture consult?', 'What changes antibiotic selection?'],
    },
  },
  {
    id: 'acl-tear',
    title: 'ACL Tear',
    aliases: ['anterior cruciate ligament tear', 'acl injury'],
    trackId: 'sports',
    subspecialty: 'Sports',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['knee', 'ligament', 'pivot shift', 'sports injury'],
    commonCases: [
      { name: 'Noncontact pivot injury', scenario: 'Athlete hears a pop and develops rapid knee effusion.' },
      { name: 'Return-to-play visit', scenario: 'Need to explain instability symptoms and rehab timeline.' },
    ],
    learningObjectives: [
      'Recognize the classic history and exam findings of ACL injury.',
      'Describe associated injuries and the role of MRI.',
      'Outline nonoperative versus reconstruction pathways at a student level.',
    ],
    prerequisites: ['musculoskeletal-exam', 'gait-basics'],
    relatedTopicIds: ['meniscus-tear', 'lumbar-disc-herniation', 'ankle-sprain'],
    fast: {
      mustKnow: ['Pop, effusion, Lachman, pivoting instability, rehab importance'],
      anatomyFocus: ['ACL bundles', 'Secondary stabilizers', 'Meniscus relationship'],
      caseSteps: ['Summarize mechanism', 'State key exam tests', 'Mention MRI and prehab'],
      pimpQuestions: ['Why is Lachman better than anterior drawer?', 'What associated injuries matter?'],
      orSurvivalTips: ['Mention bone bruise pattern on MRI', 'Do not ignore meniscus injury'],
      oneLiner: 'ACL tears are instability injuries diagnosed by history and exam, with reconstruction decisions shaped by goals and associated pathology.',
    },
    deep: {
      anatomy: ['ACL footprint', 'Rotational stabilizers', 'Anterolateral structures'],
      classification: ['Complete versus partial tear', 'Acute versus chronic instability'],
      imaging: ['MRI patterns', 'Associated bone bruise and meniscus findings'],
      decisionMaking: ['Instability symptoms, sport demands, age, concomitant injuries'],
      treatmentOptions: ['Rehab-only pathway', 'ACL reconstruction with graft selection concepts'],
      surgicalApproach: ['Tunnel positioning principles', 'Graft categories and fixation basics'],
      complications: ['Stiffness', 'Graft failure', 'Cyclops lesion', 'Persistent instability'],
      boardPearls: ['A good Lachman with hemarthrosis after a pivot injury is highly suggestive'],
      selfCheckQuestions: ['Who can be treated nonoperatively?', 'Why is regaining motion before surgery important?'],
    },
  },
  {
    id: 'meniscus-tear',
    title: 'Meniscus Tear',
    aliases: ['meniscal tear', 'bucket handle tear'],
    trackId: 'sports',
    subspecialty: 'Sports',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['knee', 'locking', 'joint line tenderness', 'sports'],
    commonCases: [
      { name: 'Twisting knee with locking', scenario: 'Patient cannot fully extend after a squat-twist injury.' },
      { name: 'Degenerative medial joint line pain', scenario: 'Older patient with intermittent swelling and catching.' },
    ],
    learningObjectives: [
      'Differentiate traumatic from degenerative meniscus tears.',
      'Use exam and MRI thoughtfully when symptoms suggest meniscal pathology.',
      'Explain repair versus meniscectomy considerations.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['acl-tear', 'knee-osteoarthritis', 'lumbar-disc-herniation'],
    fast: {
      mustKnow: ['Joint line tenderness, mechanical symptoms, tear location matters'],
      anatomyFocus: ['Medial vs lateral meniscus', 'Red-red and white-white zones'],
      caseSteps: ['Describe symptoms', 'State exam maneuvers', 'Mention when MRI helps', 'Outline basic treatment categories'],
      pimpQuestions: ['Why do some tears get repaired?', 'What symptoms favor surgery?'],
      orSurvivalTips: ['Use peripheral vascularity language', 'Mention locked knee urgency'],
      oneLiner: 'Meniscus tears range from rehab problems to repairable mechanical lesions depending on pattern and symptoms.',
    },
    deep: {
      anatomy: ['Meniscal roots and horn attachments', 'Hoop stress function'],
      classification: ['Radial, vertical, horizontal, root, bucket-handle tears'],
      imaging: ['MRI tear patterns and extrusion'],
      decisionMaking: ['Age, symptoms, tear pattern, ACL status, repairability'],
      treatmentOptions: ['PT and activity modification', 'Repair', 'Partial meniscectomy', 'Root repair concepts'],
      surgicalApproach: ['Arthroscopic portal basics', 'Inside-out versus all-inside concepts'],
      complications: ['Persistent pain', 'Re-tear', 'Accelerated arthritis after meniscectomy'],
      boardPearls: ['Peripheral longitudinal tears in young knees are the classic repairable lesion'],
      selfCheckQuestions: ['How does tear location affect healing?', 'What is a root tear consequence?'],
    },
  },
  {
    id: 'rotator-cuff-tear',
    title: 'Rotator Cuff Tear',
    aliases: ['supraspinatus tear', 'cuff tear'],
    trackId: 'sports',
    subspecialty: 'Sports',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['shoulder', 'impingement', 'abduction weakness'],
    commonCases: [
      { name: 'Night pain with weakness', scenario: 'Older patient struggles lifting overhead after minor injury.' },
      { name: 'Acute traumatic cuff tear', scenario: 'New inability to raise arm after a fall.' },
    ],
    learningObjectives: [
      'Recognize common cuff tear presentations and key exam findings.',
      'Explain the role of x-rays and MRI in workup.',
      'Outline initial conservative care and when surgery becomes more urgent.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['rotator-cuff-tear-shoulder', 'shoulder-instability', 'proximal-humerus-fracture'],
    fast: {
      mustKnow: ['Night pain, weakness, active versus passive ROM, traumatic acute tears'],
      anatomyFocus: ['Supraspinatus', 'Infraspinatus', 'Subscapularis', 'Biceps'],
      caseSteps: ['Describe active ROM', 'Localize weakness', 'Mention x-rays before MRI', 'State PT versus surgery framework'],
      pimpQuestions: ['Why are acute traumatic tears different?', 'What x-ray findings suggest chronic cuff disease?'],
      orSurvivalTips: ['Mention pseudoparalysis when severe', 'Know cuff muscle actions'],
      oneLiner: 'Rotator cuff tears are shoulder dysfunction problems where age, acuity, and functional loss shape urgency.',
    },
    deep: {
      anatomy: ['Force couples of the shoulder', 'Cuff insertion footprints'],
      classification: ['Partial versus full-thickness', 'Acute versus chronic', 'Massive tears'],
      imaging: ['X-ray findings', 'MRI for tendon quality, retraction, and atrophy'],
      decisionMaking: ['Symptoms, function, tear size, chronicity, patient goals'],
      treatmentOptions: ['PT', 'Injections in selected settings', 'Arthroscopic repair', 'Reverse arthroplasty for irreparable patterns'],
      surgicalApproach: ['Bursectomy and visualization concepts', 'Anchor repair basics'],
      complications: ['Stiffness', 'Re-tear', 'Persistent weakness'],
      boardPearls: ['Passive ROM preserved with weak active elevation suggests cuff pathology rather than adhesive capsulitis'],
      selfCheckQuestions: ['What makes a cuff tear urgent?', 'How do chronic tears alter options?'],
    },
  },
  {
    id: 'shoulder-instability',
    title: 'Shoulder Instability',
    aliases: ['anterior shoulder dislocation', 'recurrent shoulder instability'],
    trackId: 'sports',
    subspecialty: 'Sports',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['shoulder', 'labrum', 'dislocation', 'bankart'],
    commonCases: [
      { name: 'Anterior dislocation on the field', scenario: 'Young athlete with shoulder deformity after abduction-external rotation injury.' },
      { name: 'Recurrent instability', scenario: 'Multiple dislocations with apprehension during sports.' },
    ],
    learningObjectives: [
      'Recognize anterior instability presentation and reduction priorities.',
      'Explain recurrence risk in young athletes.',
      'Describe key associated lesions such as Bankart and Hill-Sachs injuries.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['rotator-cuff-tear', 'elbow-dislocation', 'proximal-humerus-fracture'],
    fast: {
      mustKnow: ['Check axillary nerve, confirm reduction, discuss recurrence risk'],
      anatomyFocus: ['Glenoid labrum', 'Capsulolabral complex', 'Hill-Sachs lesion'],
      caseSteps: ['Assess neurovascular status', 'Obtain pre/post-reduction films', 'State sling and follow-up plan'],
      pimpQuestions: ['Why do young athletes recur?', 'What is a Bankart lesion?'],
      orSurvivalTips: ['Always mention axillary nerve sensation', 'Use instability episode language'],
      oneLiner: 'Shoulder instability is usually a labral/capsular injury pattern whose recurrence risk is highest in young active patients.',
    },
    deep: {
      anatomy: ['Static and dynamic stabilizers', 'Glenoid track concept at a high level'],
      classification: ['Anterior versus posterior versus multidirectional instability'],
      imaging: ['Radiographs for reduction and bony injury', 'MRI for labral pathology', 'CT for bone loss'],
      decisionMaking: ['Age, sport, recurrence, bone loss, associated lesions'],
      treatmentOptions: ['Rehab', 'Arthroscopic stabilization', 'Bone block procedures in bone loss'],
      surgicalApproach: ['Bankart repair concepts', 'Addressing Hill-Sachs lesions conceptually'],
      complications: ['Recurrent instability', 'Stiffness', 'Nerve injury'],
      boardPearls: ['First-time anterior dislocation in a young athlete carries a high recurrence risk'],
      selfCheckQuestions: ['What exam finding suggests instability?', 'When does bone loss change the operation?'],
    },
  },
  {
    id: 'achilles-tendon-rupture',
    title: 'Achilles Tendon Rupture',
    aliases: ['achilles rupture'],
    trackId: 'sports',
    subspecialty: 'Sports',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['ankle', 'tendon', 'thompson test', 'push-off weakness'],
    commonCases: [
      { name: 'Weekend warrior pop', scenario: 'Patient felt kicked in the heel during sudden push-off.' },
      { name: 'Delayed diagnosis clinic visit', scenario: 'Persistent limp and weak plantarflexion after missed injury.' },
    ],
    learningObjectives: [
      'Identify classic Achilles rupture history and exam.',
      'Explain the Thompson test and resting tension findings.',
      'Compare operative and nonoperative treatment at a high level.',
    ],
    prerequisites: ['musculoskeletal-exam', 'gait-basics'],
    relatedTopicIds: ['achilles-tendon-rupture-foot-ankle', 'ankle-sprain', 'ankle-fracture-foot-ankle-perspective'],
    fast: {
      mustKnow: ['Sudden pop, Thompson test, plantarflexion weakness, early immobilization in equinus'],
      anatomyFocus: ['Achilles watershed zone', 'Gastrocnemius-soleus complex'],
      caseSteps: ['State mechanism', 'Describe Thompson test', 'Mention splinting in plantarflexion', 'Outline referral urgency'],
      pimpQuestions: ['Who can be treated nonoperatively?', 'Why does delay matter?'],
      orSurvivalTips: ['Do not forget comparison to the opposite side', 'Mention resting tendon tension'],
      oneLiner: 'Achilles rupture is usually a clinical diagnosis where early recognition preserves treatment options.',
    },
    deep: {
      anatomy: ['Tendon blood supply and rupture zone', 'Gastroc-soleus biomechanics'],
      classification: ['Acute versus chronic rupture', 'Insertional versus midsubstance'],
      imaging: ['Ultrasound or MRI only when exam is equivocal'],
      decisionMaking: ['Gap, patient activity level, treatment compliance, chronicity'],
      treatmentOptions: ['Functional nonoperative rehab', 'Open or percutaneous repair'],
      surgicalApproach: ['Sural nerve awareness', 'Tendon apposition concepts'],
      complications: ['Re-rupture', 'Wound issues', 'Tendon elongation'],
      boardPearls: ['A positive Thompson test in the right story is often enough to act'],
      selfCheckQuestions: ['What does chronic rupture look like?', 'Why is rehab protocol central?'],
    },
  },
  {
    id: 'hip-osteoarthritis',
    title: 'Hip Osteoarthritis',
    aliases: ['hip oa', 'degenerative hip arthritis'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['arthritis', 'groin pain', 'arthroplasty'],
    commonCases: [
      { name: 'Progressive groin pain', scenario: 'Pain with walking and putting on shoes, limited internal rotation.' },
      { name: 'Pre-op THA clinic visit', scenario: 'Need to connect symptoms and radiographs to surgical candidacy.' },
    ],
    learningObjectives: [
      'Recognize classic hip OA symptoms and exam findings.',
      'Interpret common radiographic features of degenerative hip disease.',
      'Explain the stepwise approach from conservative care to arthroplasty.',
    ],
    prerequisites: ['gait-basics', 'musculoskeletal-exam'],
    relatedTopicIds: ['total-hip-arthroplasty', 'knee-osteoarthritis', 'hip-fracture'],
    fast: {
      mustKnow: ['Groin pain, loss of internal rotation, joint space narrowing, nonoperative first-line care'],
      anatomyFocus: ['Hip joint surfaces', 'Abductor mechanics'],
      caseSteps: ['Localize pain', 'Describe ROM limits', 'Read AP pelvis x-ray', 'State conservative versus THA pathway'],
      pimpQuestions: ['How does hip OA pain present?', 'When does surgery make sense?'],
      orSurvivalTips: ['Mention groin pain rather than “hip pain” alone', 'Know common x-ray terms'],
      oneLiner: 'Hip OA is a clinical-plus-radiographic diagnosis where loss of function matters as much as imaging.',
    },
    deep: {
      anatomy: ['Acetabular and femoral head cartilage wear pattern', 'Abductor function in gait'],
      classification: ['Mild, moderate, severe degenerative change descriptively'],
      imaging: ['AP pelvis and lateral hip radiographs'],
      decisionMaking: ['Symptoms, function, failed conservative care, expectations'],
      treatmentOptions: ['NSAIDs/PT/activity modification', 'Injections selectively', 'Total hip arthroplasty'],
      surgicalApproach: ['Posterior versus anterior approach concepts without operative detail overload'],
      complications: ['Progressive stiffness', 'Post-op dislocation risk discussion', 'Leg-length concerns'],
      boardPearls: ['Internal rotation loss is a classic early exam clue'],
      selfCheckQuestions: ['How does referred pain complicate diagnosis?', 'What are common nonoperative options?'],
    },
  },
  {
    id: 'knee-osteoarthritis',
    title: 'Knee Osteoarthritis',
    aliases: ['knee oa', 'degenerative knee arthritis'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['arthritis', 'varus', 'pain with stairs', 'arthroplasty'],
    commonCases: [
      { name: 'Medial compartment pain', scenario: 'Older adult with progressive varus knee pain and stiffness.' },
      { name: 'Total knee counseling visit', scenario: 'Need to explain exhaustion of conservative options.' },
    ],
    learningObjectives: [
      'Recognize symptom patterns and exam findings in knee OA.',
      'Interpret common standing radiographic findings.',
      'Explain the broad pathway toward arthroplasty candidacy.',
    ],
    prerequisites: ['musculoskeletal-exam', 'gait-basics'],
    relatedTopicIds: ['total-knee-arthroplasty', 'meniscus-tear', 'hip-osteoarthritis'],
    fast: {
      mustKnow: ['Pain pattern, crepitus, alignment, standing films, nonoperative ladder'],
      anatomyFocus: ['Medial/lateral compartments', 'Patellofemoral joint', 'Mechanical axis'],
      caseSteps: ['Describe gait/alignment', 'Review ROM and effusion', 'Read weight-bearing x-rays', 'State treatment ladder'],
      pimpQuestions: ['Why are weight-bearing films important?', 'When is TKA appropriate?'],
      orSurvivalTips: ['Use compartment-specific language', 'Mention deformity and flexion contracture'],
      oneLiner: 'Knee OA is compartmental wear that becomes a TKA problem when pain and function fail conservative treatment.',
    },
    deep: {
      anatomy: ['Joint compartments and alignment mechanics', 'Extensor mechanism relevance'],
      classification: ['Tricompartmental versus unicompartmental wear descriptively'],
      imaging: ['Standing AP/lateral/sunrise views'],
      decisionMaking: ['Pain severity, instability, deformity, ROM, failed nonoperative care'],
      treatmentOptions: ['Weight loss/PT/meds', 'Injections', 'Unicompartmental arthroplasty in selected patients', 'TKA'],
      surgicalApproach: ['TKA exposure and balancing concepts at a high level'],
      complications: ['Persistent pain', 'Stiffness', 'Infection', 'DVT'],
      boardPearls: ['Standing films can reveal disease that non-weight-bearing views understate'],
      selfCheckQuestions: ['What exam findings support OA?', 'How do you talk through nonoperative care?'],
    },
  },
  {
    id: 'total-hip-arthroplasty',
    title: 'Total Hip Arthroplasty',
    aliases: ['tha', 'total hip replacement'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['arthroplasty', 'hip replacement', 'implants', 'dislocation precautions'],
    commonCases: [
      { name: 'Primary THA for OA', scenario: 'Elective arthroplasty patient with severe groin pain and functional decline.' },
      { name: 'Post-op rounding', scenario: 'Need to present pain control, mobilization, and dislocation precautions.' },
    ],
    learningObjectives: [
      'Describe the basic indications and goals of THA.',
      'Recognize common implant components and approach language.',
      'Discuss immediate post-op priorities and major complications.',
    ],
    prerequisites: ['hip-osteoarthritis'],
    relatedTopicIds: ['hip-osteoarthritis', 'periprosthetic-joint-infection', 'shoulder-arthroplasty'],
    fast: {
      mustKnow: ['Indications, components, dislocation risk, early mobilization'],
      anatomyFocus: ['Acetabulum', 'Femoral canal', 'Abductor mechanism'],
      caseSteps: ['State indication', 'Name implant components', 'Mention approach and post-op priorities'],
      pimpQuestions: ['What are the main THA components?', 'What are common early complications?'],
      orSurvivalTips: ['Know cup, liner, head, stem vocabulary', 'Always mention DVT prophylaxis and mobilization'],
      oneLiner: 'THA restores pain-free motion by resurfacing the acetabulum and femur with stable implants.',
    },
    deep: {
      anatomy: ['Hip center of rotation', 'Offset and leg length concepts'],
      classification: ['Primary versus revision context', 'Approach selection concepts'],
      imaging: ['Pre-op templating films', 'Post-op component position review'],
      decisionMaking: ['End-stage symptoms, anatomy, bone quality, infection exclusion'],
      treatmentOptions: ['Nonoperative measures before THA', 'Cementless/cemented concepts'],
      surgicalApproach: ['Posterior and anterior approach basics', 'Component positioning goals'],
      complications: ['Dislocation', 'Fracture', 'Infection', 'Leg length discrepancy'],
      boardPearls: ['Component position, soft tissue tension, and offset all matter for stability'],
      selfCheckQuestions: ['What do you look for on post-op x-ray?', 'How do you present a THA patient on rounds?'],
    },
  },
  {
    id: 'posterior-hip-approach',
    title: 'Posterior Hip Approach',
    aliases: ['posterior approach to hip', 'posterior approach tha', 'kocher-langenbeck hip exposure basics'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['approach', 'hip', 'posterior exposure', 'sciatic nerve', 'arthroplasty'],
    commonCases: [
      { name: 'Posterior approach THA', scenario: 'Elective THA where the student needs to follow positioning, exposure, and closure.' },
      { name: 'Posterior hip precautions teaching', scenario: 'Post-op rounding where stability and soft-tissue repair matter.' },
    ],
    learningObjectives: [
      'Describe patient positioning and surface landmarks for the posterior hip approach.',
      'Identify the short external rotators, capsule, and sciatic nerve danger zone.',
      'Explain how closure and soft-tissue repair affect posterior stability.',
    ],
    prerequisites: ['total-hip-arthroplasty', 'hip-osteoarthritis'],
    relatedTopicIds: ['total-hip-arthroplasty', 'total-hip-implant-fixation', 'hip-osteoarthritis'],
    fast: {
      mustKnow: ['Lateral decubitus positioning, posterior landmarks, short external rotators, sciatic nerve, posterior stability'],
      anatomyFocus: ['Greater trochanter', 'gluteus maximus split', 'piriformis and short external rotators', 'posterior capsule', 'sciatic nerve'],
      caseSteps: ['Position lateral', 'Mark posterior landmarks', 'Split gluteus maximus', 'Release and tag short external rotators/capsule', 'Repair posterior soft tissues'],
      pimpQuestions: ['What nerve is at risk posteriorly?', 'Why does posterior repair matter?', 'What positions risk posterior dislocation?'],
      orSurvivalTips: ['Know the sciatic nerve is posterior and medial to the short external rotators', 'Watch how the capsule and rotators are tagged for repair'],
      oneLiner: 'The posterior hip approach reaches the joint through a posterior soft-tissue interval where sciatic nerve awareness and posterior repair protect stability.',
    },
    deep: {
      anatomy: ['Greater trochanter as a landmark', 'Gluteus maximus split', 'Piriformis and short external rotators', 'Posterior capsule', 'Sciatic nerve danger zone'],
      classification: ['Posterior approach versus anterior/lateral approach tradeoffs', 'Posterior instability risk pattern'],
      imaging: ['Post-op AP pelvis and lateral to assess component position and dislocation direction if unstable'],
      decisionMaking: ['Exposure choice, patient anatomy, stability needs, surgeon preference'],
      treatmentOptions: ['Posterior THA exposure', 'Posterior capsular and rotator repair', 'Post-op posterior precautions when used'],
      surgicalApproach: ['Lateral decubitus positioning', 'Posterior incision and gluteus maximus split', 'Short external rotator release/tagging', 'Capsulotomy', 'Posterior repair'],
      complications: ['Sciatic nerve injury', 'Posterior dislocation', 'Abductor injury from retraction', 'Incomplete posterior repair'],
      boardPearls: ['The sciatic nerve is protected by staying oriented to the short external rotators and avoiding blind medial dissection'],
      selfCheckQuestions: ['What structures are released and repaired?', 'How does posterior repair affect stability?'],
    },
  },
  {
    id: 'total-hip-implant-fixation',
    title: 'Total Hip Implant Fixation',
    aliases: ['tha implant fixation', 'cemented versus cementless stem', 'femoral stem fixation', 'acetabular fixation'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['implant', 'arthroplasty', 'stem fixation', 'cementless', 'cemented', 'acetabular cup'],
    commonCases: [
      { name: 'Primary THA implant choice', scenario: 'Pre-op planning where bone quality affects fixation strategy.' },
      { name: 'Painful THA radiograph', scenario: 'Clinic visit where loosening and fixation must be recognized.' },
    ],
    learningObjectives: [
      'Distinguish cemented from cementless fixation in THA.',
      'Explain how stem geometry and bone quality affect load transfer.',
      'Recognize basic radiographic signs of fixation, loosening, and implant migration.',
    ],
    prerequisites: ['total-hip-arthroplasty'],
    relatedTopicIds: ['total-hip-arthroplasty', 'revision-arthroplasty', 'periprosthetic-fracture'],
    fast: {
      mustKnow: ['Cemented versus cementless fixation, bone ingrowth, stem geometry, cup press-fit, loosening signs'],
      anatomyFocus: ['Femoral canal', 'proximal femur metaphysis', 'acetabular rim', 'implant-bone interface'],
      caseSteps: ['Name fixation type', 'Relate bone quality to implant choice', 'Check component position', 'Look for migration or radiolucent lines'],
      pimpQuestions: ['What does cementless fixation rely on?', 'Why might older poor-quality bone favor cement?', 'What suggests loosening?'],
      orSurvivalTips: ['Say “initial mechanical stability before biologic ingrowth” for cementless implants', 'Look at both femoral and acetabular fixation'],
      oneLiner: 'THA fixation is the strategy for getting stable load transfer between implant and bone, either through cement interlock or cementless biologic ingrowth.',
    },
    deep: {
      anatomy: ['Femoral metaphyseal and diaphyseal fixation zones', 'Acetabular host bone contact', 'Implant-bone interface'],
      classification: ['Cemented versus cementless fixation', 'Proximal versus distal stem fixation', 'Initial stability versus biologic ingrowth'],
      imaging: ['Radiolucent lines', 'component migration', 'subsidence', 'stress shielding', 'spot welds around cementless stems'],
      decisionMaking: ['Bone quality, age, femoral morphology, activity level, fracture risk, revision context'],
      treatmentOptions: ['Cemented stem', 'cementless press-fit stem', 'cementless acetabular cup with screw augmentation when needed'],
      surgicalApproach: ['Broaching for press-fit stability', 'cement technique concepts', 'cup press-fit and screw fixation concepts'],
      complications: ['Aseptic loosening', 'intraoperative fracture', 'subsidence', 'stress shielding', 'periprosthetic fracture'],
      boardPearls: ['Cementless implants need initial mechanical stability so bone can grow onto or into the implant surface'],
      selfCheckQuestions: ['What x-ray findings suggest loosening?', 'How does poor bone quality change fixation choice?'],
    },
  },
  {
    id: 'postoperative-acl-rehabilitation',
    title: 'Postoperative ACL Rehabilitation',
    aliases: ['acl rehab protocol', 'acl reconstruction rehabilitation', 'post-op acl rehab'],
    trackId: 'sports',
    subspecialty: 'Sports',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['rehabilitation', 'acl', 'post-op rehab', 'return to sport', 'range of motion'],
    commonCases: [
      { name: 'Two-week ACL reconstruction follow-up', scenario: 'Student needs to assess swelling, extension, gait, and brace use.' },
      { name: 'Return-to-sport counseling', scenario: 'Athlete asks why they cannot return as soon as they feel strong.' },
    ],
    learningObjectives: [
      'Describe early goals after ACL reconstruction: swelling control, full extension, quad activation, and protected gait.',
      'Explain staged progression from range of motion to strengthening to return-to-sport testing.',
      'Recognize warning signs such as stiffness, loss of extension, effusion, and unsafe early pivoting.',
    ],
    prerequisites: ['acl-tear'],
    relatedTopicIds: ['acl-tear', 'meniscus-tear', 'musculoskeletal-exam'],
    fast: {
      mustKnow: ['Full extension early, swelling control, quad activation, protected weight-bearing, staged return to sport'],
      anatomyFocus: ['ACL graft', 'quadriceps mechanism', 'hamstrings', 'meniscus precautions when repaired'],
      caseSteps: ['Check incisions and effusion', 'Measure extension and flexion', 'Assess quad activation', 'Ask about brace/crutches/PT', 'Reinforce restrictions'],
      pimpQuestions: ['Why is extension so important early?', 'What delays return to sport?', 'How do meniscus repairs change rehab?'],
      orSurvivalTips: ['Loss of extension is an early problem worth taking seriously', 'Return to sport is criteria-based, not just calendar-based'],
      oneLiner: 'Postoperative ACL rehab protects the graft while restoring extension, quad control, strength, and sport-specific readiness in stages.',
    },
    deep: {
      anatomy: ['ACL graft incorporation concepts', 'Quadriceps inhibition after effusion', 'Meniscus repair protection considerations'],
      classification: ['Early recovery, strengthening phase, running/agility phase, return-to-sport testing'],
      imaging: ['Imaging is not routine for normal rehab but is considered for complications, tunnel concerns, or recurrent instability'],
      decisionMaking: ['Effusion, extension, quad control, graft type, concomitant meniscus repair, sport demands'],
      treatmentOptions: ['Supervised PT', 'home exercise program', 'brace/crutch weaning', 'criteria-based return-to-running and return-to-sport progression'],
      surgicalApproach: ['Rehab must respect graft fixation, tunnel biology, and concomitant procedures'],
      complications: ['Arthrofibrosis', 'persistent effusion', 'quad weakness', 'graft failure', 'premature return to pivoting'],
      boardPearls: ['Full extension and quiet swelling early are more important than impressive flexion numbers'],
      selfCheckQuestions: ['What should you check at the first post-op visit?', 'Why is return to sport not just six months on a calendar?'],
    },
  },
  {
    id: 'total-knee-arthroplasty',
    title: 'Total Knee Arthroplasty',
    aliases: ['tka', 'total knee replacement'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['arthroplasty', 'knee replacement', 'alignment', 'post-op rehab'],
    commonCases: [
      { name: 'Primary TKA for OA', scenario: 'Elective total knee replacement for pain and deformity.' },
      { name: 'Post-op ROM concern', scenario: 'Need to discuss swelling, extension lag, and rehab goals.' },
    ],
    learningObjectives: [
      'State common indications and goals of TKA.',
      'Describe alignment, balancing, and post-op rehab concepts at a student level.',
      'Identify common complications that matter on rounds and clinic follow-up.',
    ],
    prerequisites: ['knee-osteoarthritis'],
    relatedTopicIds: ['knee-osteoarthritis', 'periprosthetic-joint-infection', 'meniscus-tear'],
    fast: {
      mustKnow: ['Pain/function indication, implant components, mobilization, DVT prevention'],
      anatomyFocus: ['Femoral/tibial surfaces', 'Patella', 'Collateral ligaments'],
      caseSteps: ['State indication', 'Describe deformity/ROM', 'Name implant surfaces', 'Mention rehab priorities'],
      pimpQuestions: ['Why is pre-op ROM important?', 'What early complications matter most?'],
      orSurvivalTips: ['Use balancing/alignment language', 'Know why extension matters'],
      oneLiner: 'TKA treats end-stage knee OA by restoring alignment and stable motion with resurfacing implants.',
    },
    deep: {
      anatomy: ['Collateral ligaments and flexion-extension balance', 'Patellofemoral tracking'],
      classification: ['Primary varus/valgus and stiffness concepts'],
      imaging: ['Weight-bearing deformity films', 'Post-op alignment review'],
      decisionMaking: ['Symptoms, deformity, ROM, instability, failed nonoperative care'],
      treatmentOptions: ['Conservative care', 'Primary TKA implant constraint spectrum'],
      surgicalApproach: ['Medial parapatellar exposure basics', 'Bone cuts and balancing at a high level'],
      complications: ['Stiffness', 'Infection', 'DVT', 'Persistent instability'],
      boardPearls: ['TKA success depends on alignment, balance, and post-op motion'],
      selfCheckQuestions: ['How do you describe a post-op TKA knee on exam?', 'Why can stiffness develop?'],
    },
  },
  {
    id: 'periprosthetic-joint-infection',
    title: 'Periprosthetic Joint Infection',
    aliases: ['pji', 'infected arthroplasty'],
    trackId: 'adult-reconstruction',
    subspecialty: 'Adult Reconstruction',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['infection', 'arthroplasty complication', 'esr crp', 'aspiration'],
    commonCases: [
      { name: 'Painful total knee with drainage', scenario: 'Post-op wound drainage and elevated inflammatory markers.' },
      { name: 'Late painful THA', scenario: 'Need to differentiate loosening from infection.' },
    ],
    learningObjectives: [
      'Recognize the evaluation pathway when infection is suspected after arthroplasty.',
      'Understand the role of labs, aspiration, and timing from index surgery.',
      'Describe the major treatment buckets at a high level.',
    ],
    prerequisites: ['total-hip-arthroplasty', 'total-knee-arthroplasty'],
    relatedTopicIds: ['total-hip-arthroplasty', 'total-knee-arthroplasty', 'open-fractures'],
    fast: {
      mustKnow: ['Pain, drainage, ESR/CRP, aspiration, acute versus chronic timeline'],
      anatomyFocus: ['Implant-bone interface', 'Biofilm concept'],
      caseSteps: ['State concern', 'Order labs', 'Discuss aspiration', 'Outline debridement versus staged revision conceptually'],
      pimpQuestions: ['Why is aspiration important?', 'How does chronicity affect treatment?'],
      orSurvivalTips: ['Do not call it “cellulitis” casually in an arthroplasty patient', 'Mention biofilm and implant retention limits'],
      oneLiner: 'PJI workup is a structured infection pathway where timing and aspiration data shape whether implants can be retained.',
    },
    deep: {
      anatomy: ['Implant interfaces and dead space', 'Biofilm biology'],
      classification: ['Acute postoperative, acute hematogenous, chronic infection'],
      imaging: ['Radiographs for loosening or osteolysis; labs/aspiration carry more weight'],
      decisionMaking: ['Symptom duration, implant stability, host factors, organism profile'],
      treatmentOptions: ['Debridement and implant retention', 'One-stage revision in select settings', 'Two-stage revision'],
      surgicalApproach: ['Extensive debridement principles', 'Spacer concept'],
      complications: ['Persistent infection', 'Stiffness', 'Bone loss', 'Repeat revision'],
      boardPearls: ['Do not aspirate through overlying cellulitis; coordinate the workup thoughtfully'],
      selfCheckQuestions: ['When can implants be retained?', 'What data points support infection?'],
    },
  },
  {
    id: 'carpal-tunnel-syndrome',
    title: 'Carpal Tunnel Syndrome',
    aliases: ['median nerve compression at the wrist', 'cts'],
    trackId: 'hand',
    subspecialty: 'Hand',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['median nerve', 'numbness', 'thenar weakness', 'night symptoms'],
    commonCases: [
      { name: 'Nighttime hand numbness', scenario: 'Patient shakes out hand and reports thumb-index-middle finger paresthesias.' },
      { name: 'Pre-op CTR visit', scenario: 'Need to explain nonoperative treatment and release indications.' },
    ],
    learningObjectives: [
      'Recognize the classic distribution and symptoms of carpal tunnel syndrome.',
      'Describe provocative exam maneuvers and when studies are helpful.',
      'Outline splinting, injections, and release at a high level.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['trigger-finger', 'distal-radius-fracture-hand-perspective', 'flexor-tendon-injury'],
    fast: {
      mustKnow: ['Median distribution, night symptoms, thenar weakness, splint first-line'],
      anatomyFocus: ['Carpal tunnel contents', 'Transverse carpal ligament', 'Recurrent motor branch'],
      caseSteps: ['Describe symptom pattern', 'Mention provocative tests', 'State conservative options and surgical trigger'],
      pimpQuestions: ['What digits are affected?', 'When is surgery more urgent?'],
      orSurvivalTips: ['Always mention thenar atrophy if present', 'Know recurrent motor branch risk'],
      oneLiner: 'Carpal tunnel is median nerve compression at the wrist, usually diagnosed clinically from classic symptoms.',
    },
    deep: {
      anatomy: ['Tunnel boundaries', 'Median nerve branching', 'Flexor tendon relationship'],
      classification: ['Mild versus severe compressive neuropathy descriptively'],
      imaging: ['Electrodiagnostics when diagnosis is unclear or severity matters'],
      decisionMaking: ['Severity, weakness, duration, response to splinting'],
      treatmentOptions: ['Night splints', 'Steroid injection', 'Open or endoscopic release'],
      surgicalApproach: ['Release goals and motor branch protection concepts'],
      complications: ['Persistent symptoms', 'Pillar pain', 'Nerve injury'],
      boardPearls: ['Thenar weakness suggests more advanced disease'],
      selfCheckQuestions: ['What alternative diagnoses mimic CTS?', 'When do you order EMG?'],
    },
  },
  {
    id: 'trigger-finger',
    title: 'Trigger Finger',
    aliases: ['stenosing tenosynovitis'],
    trackId: 'hand',
    subspecialty: 'Hand',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['hand', 'locking digit', 'a1 pulley'],
    commonCases: [
      { name: 'Painful clicking finger', scenario: 'Digit catches when flexing and needs manual extension.' },
      { name: 'Diabetic recurrent trigger finger', scenario: 'Persistent locking after prior injection.' },
    ],
    learningObjectives: [
      'Recognize the clinical presentation of trigger finger.',
      'Explain the role of the A1 pulley and flexor tendon mismatch.',
      'Compare injection and release treatment pathways.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['carpal-tunnel-syndrome', 'flexor-tendon-injury', 'sutures-and-closure'],
    fast: {
      mustKnow: ['A1 pulley, painful clicking, locking, injection as common first treatment'],
      anatomyFocus: ['A1 pulley location', 'Flexor tendon excursion'],
      caseSteps: ['Describe catching/locking', 'Locate tenderness', 'State injection versus release plan'],
      pimpQuestions: ['Where is the pathology?', 'Who is more likely to fail injection?'],
      orSurvivalTips: ['Mention whether locking is fixed', 'Know common thumb location'],
      oneLiner: 'Trigger finger is stenosing tenosynovitis at the A1 pulley causing painful catching or locking.',
    },
    deep: {
      anatomy: ['Pulley system basics', 'Flexor tendon gliding'],
      classification: ['Intermittent catching versus fixed locked digit'],
      imaging: ['Usually clinical diagnosis'],
      decisionMaking: ['Symptom severity, diabetes, recurrence, fixed flexion'],
      treatmentOptions: ['Activity modification', 'Steroid injection', 'A1 pulley release'],
      surgicalApproach: ['Open release concepts and neurovascular awareness'],
      complications: ['Persistent triggering', 'Bowstringing is uncommon if targeted properly', 'Digital nerve irritation'],
      boardPearls: ['Most trigger fingers are A1 pulley problems, not tendon lacerations'],
      selfCheckQuestions: ['Why does diabetes matter?', 'How do you examine a locked trigger finger?'],
    },
  },
  {
    id: 'flexor-tendon-injury',
    title: 'Flexor Tendon Injury',
    aliases: ['zone ii flexor tendon injury', 'jersey finger differential'],
    trackId: 'hand',
    subspecialty: 'Hand',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['hand trauma', 'tendon repair', 'zone ii', 'finger laceration'],
    commonCases: [
      { name: 'Knife laceration to volar finger', scenario: 'Cannot flex DIP or PIP after kitchen injury.' },
      { name: 'Jersey finger consult', scenario: 'Ring finger FDP avulsion after grabbing a jersey.' },
    ],
    learningObjectives: [
      'Perform a focused flexor tendon exam in a finger laceration.',
      'Recognize why zone II injuries are high-stakes problems.',
      'Describe splinting and urgent specialist referral basics.',
    ],
    prerequisites: ['sutures-and-closure', 'sterile-technique'],
    relatedTopicIds: ['trigger-finger', 'metacarpal-fracture', 'compartment-syndrome'],
    fast: {
      mustKnow: ['Isolate FDS/FDP exam, document sensation, splint flexor-protective posture'],
      anatomyFocus: ['FDS/FDP function', 'Pulley system', 'Digital nerves'],
      caseSteps: ['Inspect wound', 'Test isolated flexion', 'Document sensation', 'Place dorsal blocking splint conceptually'],
      pimpQuestions: ['What makes zone II special?', 'How do you test FDP alone?'],
      orSurvivalTips: ['Do not probe aggressively in the ED', 'Write down tendon function before anesthetic if possible'],
      oneLiner: 'Flexor tendon injuries are exam-heavy hand emergencies where missing tendon dysfunction changes the whole plan.',
    },
    deep: {
      anatomy: ['Flexor zones', 'Camper and vincula relationship', 'Pulley preservation'],
      classification: ['Zone-based injuries', 'Laceration versus avulsion'],
      imaging: ['Usually clinical; x-ray if fracture or foreign body suspected'],
      decisionMaking: ['Zone, tendon ends, contamination, neurovascular injury'],
      treatmentOptions: ['Urgent repair with therapy pathway', 'Avulsion fixation or reconstruction depending on pattern'],
      surgicalApproach: ['Repair core suture concepts', 'Pulley preservation and gliding'],
      complications: ['Adhesions', 'Rupture', 'Stiffness', 'Pulley problems'],
      boardPearls: ['Zone II historically matters because repair and gliding are both challenging'],
      selfCheckQuestions: ['How do you examine FDS versus FDP?', 'What is jersey finger?'],
    },
  },
  {
    id: 'metacarpal-fracture',
    title: 'Metacarpal Fracture',
    aliases: ['boxer fracture', 'metacarpal neck fracture'],
    trackId: 'hand',
    subspecialty: 'Hand',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['hand fracture', 'rotation', 'splinting'],
    commonCases: [
      { name: 'Punch injury', scenario: 'Fifth metacarpal neck fracture after striking a wall.' },
      { name: 'Rotational deformity exam', scenario: 'Need to examine finger cascade before splinting.' },
    ],
    learningObjectives: [
      'Identify metacarpal fracture patterns that can be treated nonoperatively.',
      'Recognize rotational deformity as an important surgical clue.',
      'Describe common splinting strategies and follow-up needs.',
    ],
    prerequisites: ['reading-xrays', 'musculoskeletal-exam'],
    relatedTopicIds: ['distal-radius-fracture-hand-perspective', 'flexor-tendon-injury', 'open-fractures'],
    fast: {
      mustKnow: ['Check rotation, skin, and extensor lag; know ulnar gutter basics'],
      anatomyFocus: ['Metacarpal cascade', 'MCP collateral function'],
      caseSteps: ['Describe fracture location', 'Test rotation', 'State splint type', 'Mention operative red flags'],
      pimpQuestions: ['Why is rotation so important?', 'Which fractures tolerate angulation better?'],
      orSurvivalTips: ['Examine finger cascade before numbing when possible', 'Use neck/shaft/base language'],
      oneLiner: 'Metacarpal fractures are common hand injuries where rotational alignment matters more than mild angulation.',
    },
    deep: {
      anatomy: ['Metacarpal head and neck alignment', 'Intrinsic pull and deformity'],
      classification: ['Neck, shaft, base, intra-articular fractures'],
      imaging: ['Hand series with careful oblique review'],
      decisionMaking: ['Rotation, shortening, articular step-off, open injury'],
      treatmentOptions: ['Splint/cast', 'Closed reduction', 'Pinning or plating in unstable patterns'],
      surgicalApproach: ['Percutaneous pin concepts', 'Dorsal exposure basics'],
      complications: ['Malrotation', 'Stiffness', 'Extensor adhesions'],
      boardPearls: ['Rotational deformity is poorly tolerated even when x-rays look acceptable'],
      selfCheckQuestions: ['How do you check rotation?', 'What injuries need surgery sooner?'],
    },
  },
  {
    id: 'distal-radius-fracture-hand-perspective',
    title: 'Distal Radius Fracture for the Hand Team',
    aliases: ['distal radius fracture hand perspective'],
    trackId: 'hand',
    subspecialty: 'Hand',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['wrist fracture', 'articular congruity', 'dr uj'],
    commonCases: [
      { name: 'Intra-articular wrist fracture', scenario: 'Need to discuss articular step-off and DRUJ stability.' },
      { name: 'Post-fixation clinic review', scenario: 'Assess tendon irritation risk and stiffness prevention.' },
    ],
    learningObjectives: [
      'Reframe distal radius fracture around wrist function, DRUJ, and tendon issues.',
      'Recognize when intra-articular details matter more to the hand service.',
      'Describe common post-fixation problems relevant on hand rounds.',
    ],
    prerequisites: ['distal-radius-fracture'],
    relatedTopicIds: ['distal-radius-fracture', 'carpal-tunnel-syndrome', 'metacarpal-fracture'],
    fast: {
      mustKnow: ['DRUJ, articular surface, tendon irritation, finger motion after fixation'],
      anatomyFocus: ['Sigmoid notch', 'Volar flexor tendons', 'Extensor compartments'],
      caseSteps: ['Comment on articular involvement', 'Assess DRUJ', 'Mention hand therapy goals'],
      pimpQuestions: ['Why does the hand team care about DRUJ?', 'What tendon issue follows volar plates?'],
      orSurvivalTips: ['Mention EPL rupture risk and finger ROM early'],
      oneLiner: 'From a hand perspective, distal radius fractures are wrist mechanics and tendon-protection problems.',
    },
    deep: {
      anatomy: ['DRUJ stabilizers', 'Volar plate relationship to FPL', 'Lister tubercle and EPL'],
      classification: ['Articular involvement and lunate facet concerns'],
      imaging: ['Advanced review of lateral tilt and articular step-off', 'CT for key fragments'],
      decisionMaking: ['Articular congruity, DRUJ stability, tendon risk, rehab demands'],
      treatmentOptions: ['Casting', 'Volar plating', 'Fragment-specific strategies'],
      surgicalApproach: ['Volar approach details that affect tendon safety'],
      complications: ['EPL rupture', 'FPL irritation', 'Stiffness', 'DRUJ pain'],
      boardPearls: ['A small lunate facet fragment can be highly important functionally'],
      selfCheckQuestions: ['How do tendon complications present?', 'What indicates DRUJ instability?'],
    },
  },
  {
    id: 'supracondylar-humerus-fracture',
    title: 'Supracondylar Humerus Fracture',
    aliases: ['pediatric supracondylar fracture'],
    trackId: 'pediatrics',
    subspecialty: 'Pediatrics',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['peds trauma', 'elbow', 'vascular exam', 'pins'],
    commonCases: [
      { name: 'Child after fall from monkey bars', scenario: 'Swollen elbow with pain and potential extension-type fracture.' },
      { name: 'Pulseless but perfused hand', scenario: 'Need to explain neurovascular urgency and reduction priorities.' },
    ],
    learningObjectives: [
      'Recognize the classic pediatric elbow injury pattern and its urgency.',
      'Perform and present a focused neurovascular exam.',
      'Explain why many displaced fractures need urgent pinning.',
    ],
    prerequisites: ['reading-xrays', 'musculoskeletal-exam'],
    relatedTopicIds: ['pediatric-forearm-fracture', 'compartment-syndrome', 'elbow-dislocation'],
    fast: {
      mustKnow: ['Child elbow injury, posterior fat pad/anterior humeral line, vascular exam'],
      anatomyFocus: ['Brachial artery', 'Median/AIN and radial nerve', 'Distal humerus alignment'],
      caseSteps: ['Describe swelling', 'Document pulse and nerve exam', 'Interpret lateral x-ray alignment', 'State immobilization/OR urgency'],
      pimpQuestions: ['What nerve is most commonly injured?', 'Why is the vascular exam so important?'],
      orSurvivalTips: ['Always mention AIN exam', 'Do not forget compartment syndrome risk after reduction'],
      oneLiner: 'Supracondylar humerus fractures are pediatric elbow injuries where alignment and neurovascular status determine urgency.',
    },
    deep: {
      anatomy: ['Distal humerus anatomy in children', 'Cubital fossa neurovascular structures'],
      classification: ['Displacement-based supracondylar pattern framework'],
      imaging: ['Anterior humeral line', 'Baumann angle at a concept level'],
      decisionMaking: ['Nondisplaced casting versus urgent pinning for displaced injuries'],
      treatmentOptions: ['Long-arm cast', 'Closed reduction and percutaneous pinning'],
      surgicalApproach: ['Pin configuration and stability concepts'],
      complications: ['Nerve palsy', 'Vascular compromise', 'Cubitus varus', 'Compartment syndrome'],
      boardPearls: ['A pulseless, poorly perfused hand after this injury is an emergency'],
      selfCheckQuestions: ['How do you test AIN in a child?', 'What x-ray line is most famous here?'],
    },
  },
  {
    id: 'scfe',
    title: 'Slipped Capital Femoral Epiphysis',
    aliases: ['slipped capital femoral epiphysis', 'slipped epiphysis'],
    trackId: 'pediatrics',
    subspecialty: 'Pediatrics',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['adolescent hip', 'obligate external rotation', 'unstable slip'],
    commonCases: [
      { name: 'Adolescent with limp and knee pain', scenario: 'Overweight teen with vague thigh pain and limited internal rotation.' },
      { name: 'Acute unstable slip', scenario: 'Sudden inability to bear weight with severe hip pain.' },
    ],
    learningObjectives: [
      'Recognize SCFE even when pain is referred to the knee.',
      'Describe the exam finding of obligate external rotation.',
      'Explain why this diagnosis should not be missed or manipulated aggressively.',
    ],
    prerequisites: ['gait-basics', 'musculoskeletal-exam'],
    relatedTopicIds: ['developmental-dysplasia-hip', 'hip-fracture', 'lumbar-disc-herniation'],
    fast: {
      mustKnow: ['Teen with limp, knee pain referral, frog-leg caution if unstable, urgent ortho consult'],
      anatomyFocus: ['Proximal femoral physis', 'Retinacular blood supply'],
      caseSteps: ['Localize referred pain', 'Describe ROM loss', 'State x-ray views', 'Keep non-weight-bearing'],
      pimpQuestions: ['Why can SCFE look like knee pain?', 'Why avoid forceful range of motion?'],
      orSurvivalTips: ['Say “do not bear weight” clearly', 'Mention bilateral risk'],
      oneLiner: 'SCFE is the limping adolescent diagnosis you cannot miss, even when the complaint sounds like knee pain.',
    },
    deep: {
      anatomy: ['Proximal femoral physis and blood supply'],
      classification: ['Stable versus unstable slips'],
      imaging: ['AP pelvis and frog-leg views when safe', 'Klein line concept'],
      decisionMaking: ['Weight-bearing status and stability guide urgency'],
      treatmentOptions: ['In-situ pinning', 'Contralateral surveillance or prophylaxis discussion'],
      surgicalApproach: ['Pin placement principles without reduction maneuvers'],
      complications: ['Avascular necrosis', 'Chondrolysis', 'Residual impingement'],
      boardPearls: ['Knee pain in an adolescent can be a hip problem until proven otherwise'],
      selfCheckQuestions: ['What makes a slip unstable?', 'Why is internal rotation limited?'],
    },
  },
  {
    id: 'clubfoot',
    title: 'Clubfoot',
    aliases: ['congenital talipes equinovarus'],
    trackId: 'pediatrics',
    subspecialty: 'Pediatrics',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['ponseti', 'newborn', 'deformity'],
    commonCases: [
      { name: 'Newborn foot deformity', scenario: 'Infant referred for inward and downward foot posture.' },
      { name: 'Casting clinic follow-up', scenario: 'Need to explain the sequence of correction and bracing.' },
    ],
    learningObjectives: [
      'Recognize the components of the clubfoot deformity.',
      'Understand the basics of Ponseti casting and bracing.',
      'Differentiate flexible positional issues from true clubfoot at a high level.',
    ],
    prerequisites: ['gait-basics'],
    relatedTopicIds: ['developmental-dysplasia-hip', 'hallux-valgus', 'gait-basics'],
    fast: {
      mustKnow: ['Cavus, adductus, varus, equinus; Ponseti casting; brace compliance'],
      anatomyFocus: ['Hindfoot and midfoot deformity components'],
      caseSteps: ['Name the deformity parts', 'Explain serial casting', 'Mention Achilles tenotomy and bracing'],
      pimpQuestions: ['What does Ponseti correct first?', 'Why does brace compliance matter?'],
      orSurvivalTips: ['Use the deformity sequence language', 'Remember this is mostly a clinic education diagnosis for students'],
      oneLiner: 'Clubfoot is a structured deformity corrected gradually with Ponseti casting and long-term bracing.',
    },
    deep: {
      anatomy: ['Hindfoot varus and equinus', 'Midfoot adduction and cavus'],
      classification: ['Idiopathic versus syndromic clubfoot at a high level'],
      imaging: ['Usually a clinical diagnosis in infants'],
      decisionMaking: ['Flexibility, age at presentation, recurrence risk'],
      treatmentOptions: ['Ponseti serial casting', 'Percutaneous Achilles tenotomy', 'Foot abduction bracing'],
      surgicalApproach: ['Limited role for extensive release in modern care'],
      complications: ['Recurrence', 'Brace noncompliance', 'Residual stiffness'],
      boardPearls: ['Brace adherence is central to preventing relapse'],
      selfCheckQuestions: ['What are the four major deformity components?', 'Why is early treatment preferred?'],
    },
  },
  {
    id: 'developmental-dysplasia-hip',
    title: 'Developmental Dysplasia of the Hip',
    aliases: ['ddh', 'developmental hip dysplasia'],
    trackId: 'pediatrics',
    subspecialty: 'Pediatrics',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['newborn exam', 'pavlik harness', 'hip ultrasound'],
    commonCases: [
      { name: 'Newborn hip click evaluation', scenario: 'Infant with breech history and concern on screening exam.' },
      { name: 'Late-presenting limp', scenario: 'Toddler with gait asymmetry and limited abduction.' },
    ],
    learningObjectives: [
      'Recognize risk factors and screening exam principles for DDH.',
      'Understand when ultrasound is used in infancy.',
      'Explain the broad treatment progression from harness to reduction.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['clubfoot', 'scfe', 'gait-basics'],
    fast: {
      mustKnow: ['Breech risk, Ortolani/Barlow concepts, harness in infants'],
      anatomyFocus: ['Femoral head-acetabulum relationship', 'Hip stability in infancy'],
      caseSteps: ['State risk factors', 'Describe abduction exam', 'Mention ultrasound timing and harness'],
      pimpQuestions: ['What is Ortolani versus Barlow?', 'Why does age at presentation matter?'],
      orSurvivalTips: ['Do not overstate every click as DDH', 'Mention breech and family history'],
      oneLiner: 'DDH is an age-sensitive instability problem where early detection can avoid invasive treatment.',
    },
    deep: {
      anatomy: ['Acetabular development and femoral head containment'],
      classification: ['Instability versus dysplasia versus dislocation descriptively'],
      imaging: ['Ultrasound in infants', 'Radiographs later when ossification appears'],
      decisionMaking: ['Age, stability, reducibility, and acetabular development'],
      treatmentOptions: ['Observation for minor immaturity in selected infants', 'Pavlik harness', 'Closed or open reduction later'],
      surgicalApproach: ['Harness positioning concept', 'Role of spica casting after reduction'],
      complications: ['Avascular necrosis', 'Residual dysplasia', 'Harness failure'],
      boardPearls: ['The younger the patient, the more likely nonoperative containment can work'],
      selfCheckQuestions: ['When do radiographs become more useful than ultrasound?', 'What is the goal of a Pavlik harness?'],
    },
  },
  {
    id: 'pediatric-forearm-fracture',
    title: 'Pediatric Forearm Fracture',
    aliases: ['both-bone forearm fracture child', 'pediatric radius ulna fracture'],
    trackId: 'pediatrics',
    subspecialty: 'Pediatrics',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['peds trauma', 'remodeling', 'reduction', 'cast'],
    commonCases: [
      { name: 'Playground fall with deformity', scenario: 'Child with angulated both-bone forearm fracture.' },
      { name: 'Follow-up alignment check', scenario: 'Need to discuss remodeling potential and acceptable angulation.' },
    ],
    learningObjectives: [
      'Describe why remodeling makes pediatric forearm fractures different from adult fractures.',
      'Recognize fractures that still need reduction or fixation despite remodeling potential.',
      'Outline casting and follow-up priorities.',
    ],
    prerequisites: ['fracture-healing', 'reading-xrays'],
    relatedTopicIds: ['supracondylar-humerus-fracture', 'distal-radius-fracture', 'open-fractures'],
    fast: {
      mustKnow: ['Remodeling, acceptable alignment varies by age, cast quality matters'],
      anatomyFocus: ['Radius-ulna relationship and forearm rotation'],
      caseSteps: ['Describe fracture location', 'State age/remodeling relevance', 'Mention reduction need and cast checks'],
      pimpQuestions: ['Why do children tolerate more angulation?', 'When is surgery more likely?'],
      orSurvivalTips: ['Mention pronation-supination function', 'Know that distal fractures remodel more'],
      oneLiner: 'Pediatric forearm fractures blend excellent remodeling potential with a need to preserve rotation and cast alignment.',
    },
    deep: {
      anatomy: ['Forearm as a ring enabling rotation', 'Growth contribution by distal physes'],
      classification: ['Greenstick, complete, plastic deformation'],
      imaging: ['Forearm and adjacent joint views'],
      decisionMaking: ['Age, location, rotation, translation, ability to hold reduction'],
      treatmentOptions: ['Casting', 'Closed reduction', 'Flexible nails or pinning in unstable patterns'],
      surgicalApproach: ['Intramedullary fixation concepts in children'],
      complications: ['Loss of reduction', 'Malunion affecting rotation', 'Compartment syndrome rarely'],
      boardPearls: ['Rotational malalignment remodels poorly compared with angulation'],
      selfCheckQuestions: ['Why are adjacent joint views important?', 'Which deformities remodel poorly?'],
    },
  },
  {
    id: 'lumbar-disc-herniation',
    title: 'Lumbar Disc Herniation',
    aliases: ['herniated disc', 'lumbar radiculopathy'],
    trackId: 'spine',
    subspecialty: 'Spine',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['back pain', 'radiculopathy', 'straight leg raise'],
    commonCases: [
      { name: 'Sciatica after lifting', scenario: 'Back pain radiating below the knee with numbness in dermatomal distribution.' },
      { name: 'Weakness follow-up', scenario: 'Need to explain when progressive deficit changes urgency.' },
    ],
    learningObjectives: [
      'Distinguish lumbar radicular pain from nonspecific back pain.',
      'Use focused neuro exam and straight leg raise findings appropriately.',
      'Outline conservative care and when surgery is considered.',
    ],
    prerequisites: ['musculoskeletal-exam'],
    relatedTopicIds: ['lumbar-spinal-stenosis', 'cauda-equina-syndrome', 'gait-basics'],
    fast: {
      mustKnow: ['Leg-dominant pain, dermatomes, motor exam, red flags'],
      anatomyFocus: ['Lumbar nerve root exit/traversing patterns', 'Disc and canal anatomy'],
      caseSteps: ['Describe pain pattern', 'Perform neuro exam', 'State red flags and first-line treatment'],
      pimpQuestions: ['Why does pain below the knee matter?', 'When is MRI urgent?'],
      orSurvivalTips: ['Always give a motor and sensory level if possible', 'Separate radiculopathy from axial back pain'],
      oneLiner: 'Lumbar disc herniation is usually a leg-pain problem first, and weakness or red flags raise the stakes.',
    },
    deep: {
      anatomy: ['Traversing versus exiting nerve roots', 'Disc annulus and nucleus'],
      classification: ['Contained versus extruded/sequestered disc at a conceptual level'],
      imaging: ['MRI when symptoms persist, deficits progress, or red flags exist'],
      decisionMaking: ['Pain severity, neurologic deficit, duration, red flags'],
      treatmentOptions: ['Activity modification/PT/medications', 'Epidural injections in select cases', 'Microdiscectomy'],
      surgicalApproach: ['Posterior decompression and nerve root protection concepts'],
      complications: ['Persistent pain', 'Re-herniation', 'Weakness'],
      boardPearls: ['Most improve without surgery unless deficits or red flags intervene'],
      selfCheckQuestions: ['What findings make you worry about cauda equina?', 'Which root is affected at L4-L5?'],
    },
  },
  {
    id: 'lumbar-spinal-stenosis',
    title: 'Lumbar Spinal Stenosis',
    aliases: ['neurogenic claudication', 'lumbar stenosis'],
    trackId: 'spine',
    subspecialty: 'Spine',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['back pain', 'claudication', 'shopping cart sign'],
    commonCases: [
      { name: 'Leg heaviness with walking', scenario: 'Older adult relieved by sitting or leaning forward.' },
      { name: 'MRI review visit', scenario: 'Need to connect symptoms with multilevel narrowing.' },
    ],
    learningObjectives: [
      'Recognize neurogenic claudication symptoms and common exam findings.',
      'Differentiate stenosis from vascular claudication at a high level.',
      'Explain the broad treatment spectrum from PT to decompression.',
    ],
    prerequisites: ['lumbar-disc-herniation'],
    relatedTopicIds: ['lumbar-disc-herniation', 'adult-spinal-deformity', 'cauda-equina-syndrome'],
    fast: {
      mustKnow: ['Walking intolerance, relief with flexion, older patient pattern, MRI correlation'],
      anatomyFocus: ['Central canal', 'Lateral recess', 'Facet and ligamentum flavum contribution'],
      caseSteps: ['Describe claudication pattern', 'State neuro exam', 'Mention conservative care versus decompression'],
      pimpQuestions: ['What is the shopping cart sign?', 'How is this different from vascular claudication?'],
      orSurvivalTips: ['Mention posture-dependent symptoms', 'Do not overcall imaging without matching symptoms'],
      oneLiner: 'Lumbar stenosis is a posture-dependent walking intolerance syndrome driven by canal narrowing.',
    },
    deep: {
      anatomy: ['Canal and recess narrowing mechanisms', 'Facet hypertrophy and ligamentum flavum'],
      classification: ['Central, lateral recess, and foraminal stenosis'],
      imaging: ['MRI with symptom correlation'],
      decisionMaking: ['Function loss, neurologic symptoms, failure of nonoperative care'],
      treatmentOptions: ['PT and activity modification', 'Injections selectively', 'Decompression with or without fusion'],
      surgicalApproach: ['Posterior decompression concepts', 'When instability drives fusion discussion'],
      complications: ['Persistent symptoms', 'Dural tear', 'Adjacent segment issues after fusion'],
      boardPearls: ['Symptomatic stenosis is a clinical-radiographic correlation problem'],
      selfCheckQuestions: ['Why does flexion help?', 'When would fusion enter the discussion?'],
    },
  },
  {
    id: 'cervical-myelopathy',
    title: 'Cervical Myelopathy',
    aliases: ['degenerative cervical myelopathy', 'cord compression'],
    trackId: 'spine',
    subspecialty: 'Spine',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['cord compression', 'gait imbalance', 'upper motor neuron'],
    commonCases: [
      { name: 'Hand clumsiness and imbalance', scenario: 'Patient drops objects and has progressive gait difficulty.' },
      { name: 'Cord signal change MRI', scenario: 'Need to connect exam findings with cervical stenosis urgency.' },
    ],
    learningObjectives: [
      'Recognize the exam constellation suggesting spinal cord compression.',
      'Explain why progressive myelopathy is not just neck pain.',
      'Describe the high-level role of decompression surgery.',
    ],
    prerequisites: ['gait-basics', 'musculoskeletal-exam'],
    relatedTopicIds: ['cauda-equina-syndrome', 'adult-spinal-deformity', 'lumbar-spinal-stenosis'],
    fast: {
      mustKnow: ['Hand clumsiness, gait imbalance, hyperreflexia, Hoffmann, urgency of specialist eval'],
      anatomyFocus: ['Cervical cord', 'Canal stenosis', 'Long tract function'],
      caseSteps: ['Describe myelopathic symptoms', 'State UMN findings', 'Mention MRI and surgical referral urgency'],
      pimpQuestions: ['Why is this different from radiculopathy?', 'What exam signs point to the cord?'],
      orSurvivalTips: ['Lead with function decline and cord signs', 'Do not minimize subtle gait imbalance'],
      oneLiner: 'Cervical myelopathy is a progressive cord compression syndrome where exam clues often matter more than pain.',
    },
    deep: {
      anatomy: ['Cord tracts and canal narrowing', 'Dynamic compression concepts'],
      classification: ['Single-level versus multilevel degenerative myelopathy'],
      imaging: ['MRI for stenosis and cord signal change'],
      decisionMaking: ['Progression, functional loss, cord findings, alignment'],
      treatmentOptions: ['Observation only in select mild stable cases', 'Anterior or posterior decompression strategies'],
      surgicalApproach: ['ACDF versus posterior decompression/fusion concepts'],
      complications: ['Progression without treatment', 'Residual balance issues', 'C5 palsy discussion at high level'],
      boardPearls: ['Myelopathy is a spinal cord disease, not just a pinched nerve'],
      selfCheckQuestions: ['How do you separate myelopathy from radiculopathy?', 'What findings suggest long tract involvement?'],
    },
  },
  {
    id: 'cauda-equina-syndrome',
    title: 'Cauda Equina Syndrome',
    aliases: ['cauda equina', 'saddle anesthesia emergency'],
    trackId: 'spine',
    subspecialty: 'Spine',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['spine emergency', 'urinary retention', 'saddle anesthesia'],
    commonCases: [
      { name: 'Urinary retention with bilateral leg symptoms', scenario: 'Acute low back pain with saddle numbness and weakness.' },
      { name: 'Massive disc herniation consult', scenario: 'Need to communicate why emergent MRI and decompression matter.' },
    ],
    learningObjectives: [
      'Identify the red-flag symptoms and exam findings of cauda equina syndrome.',
      'Explain why this is a decompression emergency.',
      'Present a focused history and exam that helps triage urgency.',
    ],
    prerequisites: ['lumbar-disc-herniation'],
    relatedTopicIds: ['lumbar-disc-herniation', 'cervical-myelopathy', 'compartment-syndrome'],
    fast: {
      mustKnow: ['Urinary retention, saddle anesthesia, bilateral symptoms, emergent MRI'],
      anatomyFocus: ['Cauda equina nerve roots', 'Conus versus cauda distinction'],
      caseSteps: ['State red flags', 'Perform focused neuro exam', 'Escalate for urgent MRI and decompression'],
      pimpQuestions: ['What bladder symptom matters most?', 'How is this different from routine radiculopathy?'],
      orSurvivalTips: ['Use “cannot-miss spine emergency” language', 'Mention post-void residual if known'],
      oneLiner: 'Cauda equina syndrome is a bladder-bowel-saddle sensory emergency until proven otherwise.',
    },
    deep: {
      anatomy: ['Nerve root bundle below the conus', 'Root function relevant to bladder and saddle sensation'],
      classification: ['Incomplete versus retention-dominant presentations'],
      imaging: ['Emergent MRI without delaying care'],
      decisionMaking: ['Red flags plus neurologic deficits demand urgent decompression pathway'],
      treatmentOptions: ['Emergency decompression of compressive pathology'],
      surgicalApproach: ['Urgent posterior decompression conceptually'],
      complications: ['Persistent bladder dysfunction', 'Sexual dysfunction', 'Residual weakness'],
      boardPearls: ['Urinary retention is a major warning sign, not a minor symptom'],
      selfCheckQuestions: ['What questions screen for saddle dysfunction?', 'Why is timing emphasized?'],
    },
  },
  {
    id: 'adult-spinal-deformity',
    title: 'Adult Spinal Deformity',
    aliases: ['adult scoliosis', 'sagittal imbalance'],
    trackId: 'spine',
    subspecialty: 'Spine',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['deformity', 'sagittal balance', 'coronal balance'],
    commonCases: [
      { name: 'Stooped posture and back pain', scenario: 'Older adult with sagittal imbalance and neurogenic symptoms.' },
      { name: 'Pre-op deformity workup', scenario: 'Need to understand standing alignment films and global balance.' },
    ],
    learningObjectives: [
      'Describe the concept of global spinal alignment at a student level.',
      'Recognize why deformity evaluation requires standing imaging.',
      'Understand why surgery is complex and risk-heavy in this population.',
    ],
    prerequisites: ['lumbar-spinal-stenosis', 'gait-basics'],
    relatedTopicIds: ['lumbar-spinal-stenosis', 'cervical-myelopathy', 'cauda-equina-syndrome'],
    fast: {
      mustKnow: ['Standing balance, sagittal alignment, compensatory posture, symptom burden'],
      anatomyFocus: ['Sagittal profile', 'Pelvis-spine relationship'],
      caseSteps: ['Describe posture', 'Mention standing long-cassette films', 'State symptom drivers and complexity'],
      pimpQuestions: ['Why are standing films essential?', 'What is sagittal balance?'],
      orSurvivalTips: ['Use global alignment language', 'Acknowledge surgery magnitude'],
      oneLiner: 'Adult spinal deformity is a whole-patient alignment problem, not just a crooked x-ray.',
    },
    deep: {
      anatomy: ['Sagittal and coronal alignment goals', 'Pelvic parameters at a conceptual level'],
      classification: ['Coronal scoliosis and sagittal imbalance patterns'],
      imaging: ['Standing full-spine radiographs'],
      decisionMaking: ['Pain, neurologic symptoms, imbalance, bone quality, comorbidity'],
      treatmentOptions: ['PT/pain management', 'Decompression alone selectively', 'Long-segment reconstruction'],
      surgicalApproach: ['High-level osteotomy and fusion concepts'],
      complications: ['Blood loss', 'Neurologic injury', 'Proximal junctional failure', 'Pseudarthrosis'],
      boardPearls: ['Alignment restoration is often as important as decompression'],
      selfCheckQuestions: ['Why do patients bend their knees or retrovert the pelvis?', 'What makes surgery high risk?'],
    },
  },
  {
    id: 'ankle-fracture-foot-ankle-perspective',
    title: 'Ankle Fracture for Foot and Ankle',
    aliases: ['ankle fracture foot ankle perspective'],
    trackId: 'foot-ankle',
    subspecialty: 'Foot & Ankle',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['ankle', 'syndesmosis', 'mortise', 'foot ankle service'],
    commonCases: [
      { name: 'Syndesmotic injury planning', scenario: 'Need to understand why mortise restoration matters to foot and ankle surgeons.' },
      { name: 'Posterior malleolus review', scenario: 'Complex fracture pattern with CT planning.' },
    ],
    learningObjectives: [
      'Revisit ankle fractures through the lens of joint congruity and syndesmosis.',
      'Recognize posterior malleolus and syndesmotic details that matter more on the subspecialty service.',
      'Describe common fixation goals at a high level.',
    ],
    prerequisites: ['ankle-fracture'],
    relatedTopicIds: ['ankle-fracture', 'ankle-sprain', 'calcaneus-fracture'],
    fast: {
      mustKnow: ['Mortise congruity, syndesmosis, posterior malleolus, CT in complex patterns'],
      anatomyFocus: ['Syndesmosis complex', 'Posterior malleolus', 'Talus within the mortise'],
      caseSteps: ['Comment on syndesmosis', 'Describe posterior fragment', 'State stability goals'],
      pimpQuestions: ['How do you assess syndesmotic reduction?', 'Why does posterior malleolus size matter?'],
      orSurvivalTips: ['Use “mortise congruity” repeatedly', 'Know that tiny malreductions can matter'],
      oneLiner: 'On foot and ankle, ankle fractures are mortise-restoration problems with syndesmotic precision.',
    },
    deep: {
      anatomy: ['Syndesmotic stabilizers', 'Posterior malleolus contributions', 'Talar congruity'],
      classification: ['Pattern language tied to instability and posterior fragments'],
      imaging: ['Mortise views, stress views, CT for complex fractures'],
      decisionMaking: ['Need for fixation of posterior malleolus and syndesmosis', 'Soft tissue status'],
      treatmentOptions: ['Immobilization in stable patterns', 'ORIF with syndesmotic fixation as needed'],
      surgicalApproach: ['Posterior versus lateral fixation concepts'],
      complications: ['Syndesmotic malreduction', 'Post-traumatic arthritis', 'Wound issues'],
      boardPearls: ['A well-reduced fibula is not enough if the syndesmosis is malreduced'],
      selfCheckQuestions: ['Why does the foot and ankle team care so much about the mortise?', 'When is CT most helpful?'],
    },
  },
  {
    id: 'achilles-tendon-rupture-foot-ankle',
    title: 'Achilles Tendon Rupture for Foot and Ankle',
    aliases: ['achilles rupture foot ankle perspective'],
    trackId: 'foot-ankle',
    subspecialty: 'Foot & Ankle',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['achilles', 'tendon', 'sural nerve', 'rehab'],
    commonCases: [
      { name: 'Acute midsubstance rupture', scenario: 'Need to compare functional rehab with repair for an active patient.' },
      { name: 'Delayed presentation', scenario: 'Gap and tendon elongation complicate treatment.' },
    ],
    learningObjectives: [
      'Understand Achilles rupture management beyond the initial diagnosis.',
      'Recognize how rehab protocol and tendon length affect outcomes.',
      'Describe foot-and-ankle-specific operative considerations at a high level.',
    ],
    prerequisites: ['achilles-tendon-rupture'],
    relatedTopicIds: ['achilles-tendon-rupture', 'ankle-sprain', 'hallux-valgus'],
    fast: {
      mustKnow: ['Tendon length matters, rehab protocol matters, sural nerve matters'],
      anatomyFocus: ['Midsubstance rupture zone', 'Sural nerve course', 'Gastroc-soleus tension'],
      caseSteps: ['Assess gap/chronicity', 'State boot positioning', 'Compare rehab versus repair'],
      pimpQuestions: ['Why does elongation matter?', 'What nerve is at risk in surgery?'],
      orSurvivalTips: ['Use “functional rehab” language', 'Know delayed rupture is a different problem'],
      oneLiner: 'From a foot-and-ankle perspective, Achilles care is about restoring tendon length and a safe rehab arc.',
    },
    deep: {
      anatomy: ['Tendon watershed zone', 'Sural nerve anatomy', 'Calf tension mechanics'],
      classification: ['Acute midsubstance versus insertional or chronic rupture'],
      imaging: ['Selective MRI/ultrasound for equivocal or chronic injuries'],
      decisionMaking: ['Gap, chronicity, patient goals, wound risk'],
      treatmentOptions: ['Functional nonoperative rehab', 'Open or minimally invasive repair', 'Reconstruction for chronic defects'],
      surgicalApproach: ['Sural nerve protection and tendon apposition concepts'],
      complications: ['Tendon elongation', 'Re-rupture', 'Wound complications', 'Sural neuritis'],
      boardPearls: ['Two patients with the same rupture can need different treatment because compliance and chronicity matter'],
      selfCheckQuestions: ['Why can chronic ruptures need reconstruction?', 'How does rehab influence outcomes?'],
    },
  },
  {
    id: 'hallux-valgus',
    title: 'Hallux Valgus',
    aliases: ['bunion'],
    trackId: 'foot-ankle',
    subspecialty: 'Foot & Ankle',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['forefoot', 'bunion', '1st ray'],
    commonCases: [
      { name: 'Painful medial eminence', scenario: 'Forefoot pain and shoe wear difficulty from bunion deformity.' },
      { name: 'Operative counseling visit', scenario: 'Need to explain that surgery is for symptoms, not x-rays alone.' },
    ],
    learningObjectives: [
      'Recognize hallux valgus deformity and common symptom drivers.',
      'Understand the basics of first-ray alignment and sesamoid relationship.',
      'Explain why surgery depends on symptoms and deformity pattern.',
    ],
    prerequisites: ['gait-basics'],
    relatedTopicIds: ['clubfoot', 'ankle-sprain', 'calcaneus-fracture'],
    fast: {
      mustKnow: ['Symptomatic bunion, shoe wear issues, first-ray alignment, nonoperative shoe modification'],
      anatomyFocus: ['1st MTP joint', 'Sesamoids', 'First metatarsal alignment'],
      caseSteps: ['Describe symptoms', 'Examine callosity/alignment', 'Mention nonoperative care and surgical candidacy'],
      pimpQuestions: ['Why are x-rays alone not an indication?', 'What nonoperative measures help?'],
      orSurvivalTips: ['Say hallux valgus angle and 1-2 intermetatarsal conceptually, not necessarily numerically'],
      oneLiner: 'Hallux valgus is a symptomatic alignment problem of the first ray, not just a cosmetic bump.',
    },
    deep: {
      anatomy: ['First ray alignment', 'Sesamoid position', 'MTP congruity'],
      classification: ['Mild, moderate, severe deformity concepts'],
      imaging: ['Weight-bearing foot radiographs'],
      decisionMaking: ['Symptoms, deformity severity, joint congruity, first TMT instability'],
      treatmentOptions: ['Shoe modification and pads', 'Distal, shaft, or proximal correction concepts', 'Lapidus in selected instability'],
      surgicalApproach: ['Osteotomy versus fusion concepts'],
      complications: ['Recurrence', 'Transfer metatarsalgia', 'Stiffness'],
      boardPearls: ['Surgery is for pain/function problems, not appearance alone'],
      selfCheckQuestions: ['Why are weight-bearing films useful?', 'What is a Lapidus addressing conceptually?'],
    },
  },
  {
    id: 'ankle-sprain',
    title: 'Ankle Sprain',
    aliases: ['lateral ankle sprain', 'high ankle sprain differential'],
    trackId: 'foot-ankle',
    subspecialty: 'Foot & Ankle',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['ankle', 'atfl', 'rehab', 'sports injury'],
    commonCases: [
      { name: 'Inversion injury', scenario: 'Lateral swelling and pain after stepping off a curb.' },
      { name: 'Slow recovery visit', scenario: 'Need to explain rehab, bracing, and when to suspect more than a sprain.' },
    ],
    learningObjectives: [
      'Recognize common ankle sprain patterns and first-line management.',
      'Differentiate lateral ankle sprain from fractures that need imaging.',
      'Understand the importance of rehab and proprioception work.',
    ],
    prerequisites: ['musculoskeletal-exam', 'gait-basics'],
    relatedTopicIds: ['ankle-fracture', 'achilles-tendon-rupture', 'ankle-fracture-foot-ankle-perspective'],
    fast: {
      mustKnow: ['ATFL injury, Ottawa rules, early ROM, proprioception rehab'],
      anatomyFocus: ['ATFL/CFL', 'Syndesmosis differential'],
      caseSteps: ['Localize tenderness', 'Apply Ottawa logic', 'State bracing and rehab plan'],
      pimpQuestions: ['What makes you suspect syndesmotic injury?', 'Why is rehab more than rest?'],
      orSurvivalTips: ['Do not forget proximal fibula or syndesmotic exam', 'Mention balance retraining'],
      oneLiner: 'Most ankle sprains are ligament injuries that recover best with early protected motion and rehab.',
    },
    deep: {
      anatomy: ['Lateral ligament complex', 'Syndesmosis distinctions'],
      classification: ['Low-grade lateral sprain versus high ankle sprain conceptually'],
      imaging: ['Ottawa ankle rule-based radiographs; MRI selectively'],
      decisionMaking: ['Instability, swelling, inability to bear weight, prolonged symptoms'],
      treatmentOptions: ['Brace, rehab, activity progression', 'Further workup for persistent instability'],
      surgicalApproach: ['Limited role acutely; instability reconstruction at high level'],
      complications: ['Chronic instability', 'Missed osteochondral lesion', 'Stiffness'],
      boardPearls: ['Persistent symptoms after a “sprain” should trigger a broader differential'],
      selfCheckQuestions: ['How do you examine the ATFL?', 'When do you suspect a high ankle sprain?'],
    },
  },
  {
    id: 'calcaneus-fracture',
    title: 'Calcaneus Fracture',
    aliases: ['heel fracture'],
    trackId: 'foot-ankle',
    subspecialty: 'Foot & Ankle',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['hindfoot', 'bohler angle', 'high-energy injury'],
    commonCases: [
      { name: 'Fall from height', scenario: 'Heel pain after axial load injury with swollen hindfoot.' },
      { name: 'Soft tissue swollen waiting period', scenario: 'Need to explain delayed surgery because of swelling.' },
    ],
    learningObjectives: [
      'Recognize calcaneus fractures as high-energy hindfoot injuries.',
      'Describe why soft tissue swelling changes timing of surgery.',
      'Understand the difference between extra-articular and intra-articular patterns.',
    ],
    prerequisites: ['reading-xrays', 'open-fractures'],
    relatedTopicIds: ['ankle-fracture-foot-ankle-perspective', 'tibial-shaft-fracture', 'compartment-syndrome'],
    fast: {
      mustKnow: ['Axial load mechanism, hindfoot swelling, soft tissue delay, CT planning'],
      anatomyFocus: ['Posterior facet', 'Heel width', 'Subtalar joint'],
      caseSteps: ['Describe mechanism', 'Inspect skin/blisters', 'Mention CT and swelling-driven timing'],
      pimpQuestions: ['Why is surgery often delayed?', 'What joint is most at risk?'],
      orSurvivalTips: ['Lead with soft tissue condition', 'Remember associated spine injuries can coexist'],
      oneLiner: 'Calcaneus fractures are high-energy soft-tissue-sensitive hindfoot injuries, often requiring patience before fixation.',
    },
    deep: {
      anatomy: ['Posterior facet anatomy', 'Heel width and peroneal space', 'Subtalar mechanics'],
      classification: ['Intra-articular versus extra-articular; CT-based pattern concepts'],
      imaging: ['X-rays including Bohler angle concept', 'CT for articular planning'],
      decisionMaking: ['Displacement, articular involvement, soft tissues, patient factors'],
      treatmentOptions: ['Splinting and non-weight-bearing', 'Delayed ORIF or percutaneous fixation in select cases'],
      surgicalApproach: ['Soft tissue timing and extensile versus limited approaches conceptually'],
      complications: ['Wound problems', 'Subtalar arthritis', 'Heel widening pain'],
      boardPearls: ['Swollen calcaneus skin can dictate timing more than the x-ray'],
      selfCheckQuestions: ['What is Bohler angle telling you?', 'Why can these patients need spine imaging?'],
    },
  },
  {
    id: 'proximal-humerus-fracture',
    title: 'Proximal Humerus Fracture',
    aliases: ['prox humerus fracture'],
    trackId: 'shoulder-elbow',
    subspecialty: 'Shoulder & Elbow',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['shoulder fracture', 'elderly fracture', 'sling'],
    commonCases: [
      { name: 'Elderly fall onto shoulder', scenario: 'Painful shoulder with ecchymosis and limited motion.' },
      { name: 'Post-fracture stiffness prevention', scenario: 'Need to explain why early pendulums matter when safe.' },
    ],
    learningObjectives: [
      'Recognize common proximal humerus fracture patterns and demographic.',
      'Understand why many are treated nonoperatively.',
      'Describe the main complications and rehab priorities.',
    ],
    prerequisites: ['reading-xrays', 'musculoskeletal-exam'],
    relatedTopicIds: ['rotator-cuff-tear-shoulder', 'shoulder-instability', 'olecranon-fracture'],
    fast: {
      mustKnow: ['Often low-energy elderly injury, many nonoperative, check axillary nerve'],
      anatomyFocus: ['Tuberosities', 'Humeral head blood supply', 'Axillary nerve'],
      caseSteps: ['Describe fracture parts conceptually', 'Check neurovascular status', 'State sling and rehab plan'],
      pimpQuestions: ['Why are many treated without surgery?', 'What nerve do you check?'],
      orSurvivalTips: ['Mention tuberosity displacement and head split if present', 'Do not forget elbow motion during rehab'],
      oneLiner: 'Most proximal humerus fractures are elderly fragility injuries where acceptable alignment often beats risky surgery.',
    },
    deep: {
      anatomy: ['Tuberosity function and cuff attachments', 'Humeral head perfusion'],
      classification: ['Displacement-based part concept at a high level'],
      imaging: ['AP, scapular Y, axillary views if tolerated'],
      decisionMaking: ['Displacement, tuberosity involvement, age, bone quality, function'],
      treatmentOptions: ['Sling and early rehab', 'ORIF', 'Arthroplasty in select complex patterns'],
      surgicalApproach: ['Deltopectoral exposure concepts', 'Tuberosity fixation importance'],
      complications: ['Stiffness', 'Avascular necrosis', 'Malunion', 'Tuberosity failure'],
      boardPearls: ['Axillary nerve exam should be part of every shoulder trauma presentation'],
      selfCheckQuestions: ['When do tuberosities matter most?', 'Why can surgery fail in poor bone?'],
    },
  },
  {
    id: 'rotator-cuff-tear-shoulder',
    title: 'Rotator Cuff Tear for Shoulder Service',
    aliases: ['rotator cuff tear shoulder perspective'],
    trackId: 'shoulder-elbow',
    subspecialty: 'Shoulder & Elbow',
    studentLevel: 'subintern',
    difficulty: 'core',
    tags: ['shoulder', 'cuff repair', 'muscle quality', 'pseudoparalysis'],
    commonCases: [
      { name: 'Large retracted cuff tear', scenario: 'MRI shows retraction and atrophy affecting repairability.' },
      { name: 'Traumatic acute tear in active patient', scenario: 'Need to explain why early repair may matter.' },
    ],
    learningObjectives: [
      'Go beyond diagnosis into tear size, retraction, and muscle quality.',
      'Recognize when shoulder surgeons think about irreparability or arthroplasty.',
      'Understand rehab restrictions after repair at a high level.',
    ],
    prerequisites: ['rotator-cuff-tear'],
    relatedTopicIds: ['rotator-cuff-tear', 'shoulder-arthroplasty', 'proximal-humerus-fracture'],
    fast: {
      mustKnow: ['Retraction, atrophy, pseudoparalysis, traumatic acute tears, repair rehab'],
      anatomyFocus: ['Cuff force couples', 'Subscapularis significance', 'Footprint restoration'],
      caseSteps: ['Comment on MRI quality', 'State repairability considerations', 'Mention sling/rehab restrictions'],
      pimpQuestions: ['What makes a tear irreparable?', 'Why does fatty atrophy matter?'],
      orSurvivalTips: ['Use the terms retraction, atrophy, and force couple', 'Distinguish traumatic from degenerative tears'],
      oneLiner: 'On shoulder service, cuff tears become decisions about repairability, function, and rehab burden.',
    },
    deep: {
      anatomy: ['Force couple restoration', 'Subscapularis and infraspinatus roles', 'Biceps-labral interplay'],
      classification: ['Massive versus reparable versus irreparable tear concepts'],
      imaging: ['MRI review for retraction, fatty change, and tangent sign'],
      decisionMaking: ['Age, acuity, function, tissue quality, pseudoparalysis'],
      treatmentOptions: ['PT', 'Repair', 'Patch/partial repair concepts', 'Reverse arthroplasty in selected patients'],
      surgicalApproach: ['Arthroscopic repair strategy concepts and anchor goals'],
      complications: ['Re-tear', 'Stiffness', 'Persistent weakness'],
      boardPearls: ['Tissue quality can matter as much as tear size'],
      selfCheckQuestions: ['How does pseudoparalysis change thinking?', 'What MRI features suggest irreparability?'],
    },
  },
  {
    id: 'shoulder-arthroplasty',
    title: 'Shoulder Arthroplasty',
    aliases: ['anatomic tsa', 'reverse shoulder arthroplasty', 'shoulder replacement'],
    trackId: 'shoulder-elbow',
    subspecialty: 'Shoulder & Elbow',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['arthroplasty', 'reverse shoulder', 'glenoid'],
    commonCases: [
      { name: 'Cuff tear arthropathy', scenario: 'Need to explain why reverse shoulder arthroplasty exists.' },
      { name: 'Primary glenohumeral OA', scenario: 'Compare anatomic versus reverse options conceptually.' },
    ],
    learningObjectives: [
      'Differentiate anatomic and reverse shoulder arthroplasty indications.',
      'Understand the role of rotator cuff integrity in implant selection.',
      'Identify common post-op complications and restrictions.',
    ],
    prerequisites: ['rotator-cuff-tear-shoulder'],
    relatedTopicIds: ['rotator-cuff-tear-shoulder', 'total-hip-arthroplasty', 'proximal-humerus-fracture'],
    fast: {
      mustKnow: ['Anatomic needs a functional cuff, reverse changes deltoid mechanics, instability/scapular notching risk'],
      anatomyFocus: ['Glenoid version', 'Deltoid function', 'Rotator cuff role'],
      caseSteps: ['State indication', 'Pick anatomic vs reverse conceptually', 'Mention rehab and complications'],
      pimpQuestions: ['Why does reverse work without a normal cuff?', 'When is anatomic preferred?'],
      orSurvivalTips: ['Say glenoid and cuff status up front', 'Mention deltoid dependence in reverse'],
      oneLiner: 'Shoulder arthroplasty selection turns on whether the cuff can still center and power the joint.',
    },
    deep: {
      anatomy: ['Glenoid and humeral anatomy', 'Deltoid moment arm in reverse designs'],
      classification: ['Anatomic TSA versus reverse arthroplasty indications'],
      imaging: ['Pre-op glenoid wear and cuff imaging'],
      decisionMaking: ['Cuff integrity, arthritis pattern, fracture context, instability risk'],
      treatmentOptions: ['Anatomic TSA', 'Reverse shoulder arthroplasty', 'Hemiarthroplasty in selected fracture settings'],
      surgicalApproach: ['Deltopectoral exposure and subscapularis management concepts'],
      complications: ['Instability', 'Scapular notching', 'Loosening', 'Nerve injury'],
      boardPearls: ['Reverse arthroplasty succeeds by shifting reliance to the deltoid'],
      selfCheckQuestions: ['Why can cuff tear arthropathy push you toward reverse?', 'What are common complications?'],
    },
  },
  {
    id: 'elbow-dislocation',
    title: 'Elbow Dislocation',
    aliases: ['posterior elbow dislocation'],
    trackId: 'shoulder-elbow',
    subspecialty: 'Shoulder & Elbow',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['elbow', 'reduction', 'instability', 'terrible triad'],
    commonCases: [
      { name: 'Fall on outstretched hand with deformity', scenario: 'Posterior elbow dislocation needing reduction and post-reduction imaging.' },
      { name: 'Terrible triad concern', scenario: 'Dislocation plus radial head and coronoid injury pattern.' },
    ],
    learningObjectives: [
      'Recognize simple versus complex elbow dislocations.',
      'Explain reduction, stability assessment, and short-term immobilization basics.',
      'Identify associated injuries that raise concern.',
    ],
    prerequisites: ['musculoskeletal-exam', 'reading-xrays'],
    relatedTopicIds: ['shoulder-instability', 'olecranon-fracture', 'supracondylar-humerus-fracture'],
    fast: {
      mustKnow: ['Reduce, re-check NV, post-reduction films, early motion if stable'],
      anatomyFocus: ['Ulnohumeral stability', 'Collateral ligaments', 'Coronoid and radial head'],
      caseSteps: ['Document deformity and NV exam', 'State reduction and films', 'Assess stability and splint position'],
      pimpQuestions: ['What makes it complex?', 'Why avoid prolonged immobilization?'],
      orSurvivalTips: ['Always mention range in the stable arc after reduction', 'Remember terrible triad vocabulary'],
      oneLiner: 'Elbow dislocations need reduction plus a decision about whether the elbow is a simple stable injury or a fracture-dislocation.',
    },
    deep: {
      anatomy: ['Primary stabilizers of the elbow', 'Coronoid and radial head role'],
      classification: ['Simple versus complex dislocation', 'Terrible triad pattern'],
      imaging: ['Pre/post-reduction radiographs and CT when fractures are present'],
      decisionMaking: ['Stability arc, associated fractures, recurrent instability risk'],
      treatmentOptions: ['Brief immobilization and rehab for stable simple injuries', 'Fixation/repair for unstable complex patterns'],
      surgicalApproach: ['Lateral and medial sided repair concepts at a high level'],
      complications: ['Stiffness', 'Instability', 'Heterotopic ossification'],
      boardPearls: ['The elbow loves early motion once stability is secured'],
      selfCheckQuestions: ['What is the terrible triad?', 'Why do elbow injuries get stiff so easily?'],
    },
  },
  {
    id: 'olecranon-fracture',
    title: 'Olecranon Fracture',
    aliases: ['proximal ulna fracture'],
    trackId: 'shoulder-elbow',
    subspecialty: 'Shoulder & Elbow',
    studentLevel: 'clerkship',
    difficulty: 'core',
    tags: ['elbow fracture', 'triceps mechanism', 'tension band'],
    commonCases: [
      { name: 'Direct blow to elbow', scenario: 'Posterior elbow swelling and inability to extend against gravity.' },
      { name: 'Displaced articular fracture', scenario: 'Need to explain extensor mechanism disruption and fixation basics.' },
    ],
    learningObjectives: [
      'Recognize olecranon fracture presentation and extensor mechanism relevance.',
      'Differentiate nondisplaced from displaced fractures at a high level.',
      'Describe common fixation concepts and post-op priorities.',
    ],
    prerequisites: ['reading-xrays', 'musculoskeletal-exam'],
    relatedTopicIds: ['elbow-dislocation', 'proximal-humerus-fracture', 'open-fractures'],
    fast: {
      mustKnow: ['Check active extension, articular displacement, posterior splinting'],
      anatomyFocus: ['Triceps insertion', 'Ulnohumeral articular surface', 'Ulnar nerve nearby'],
      caseSteps: ['Describe fracture/displacement', 'Test extension', 'State splint and fixation indications'],
      pimpQuestions: ['Why does active extension matter?', 'What fixation methods are common?'],
      orSurvivalTips: ['Mention skin over the olecranon', 'Use extensor mechanism language'],
      oneLiner: 'Olecranon fractures are elbow articular injuries where extensor mechanism continuity shapes treatment.',
    },
    deep: {
      anatomy: ['Olecranon articular anatomy', 'Triceps insertion and pull'],
      classification: ['Nondisplaced versus displaced/comminuted patterns'],
      imaging: ['Elbow series and articular review'],
      decisionMaking: ['Displacement, extensor mechanism function, comminution, patient demand'],
      treatmentOptions: ['Immobilization in select nondisplaced injuries', 'Tension band or plate fixation'],
      surgicalApproach: ['Posterior exposure concepts and ulnar nerve awareness'],
      complications: ['Loss of motion', 'Hardware irritation', 'Nonunion'],
      boardPearls: ['Loss of active extension suggests extensor mechanism disruption'],
      selfCheckQuestions: ['How do you examine the triceps mechanism?', 'Why is hardware irritation common here?'],
    },
  },
  {
    id: 'pathologic-fracture',
    title: 'Pathologic Fracture',
    aliases: ['fracture through lesion'],
    trackId: 'tumor',
    subspecialty: 'Tumor',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['tumor', 'metastasis', 'lesion workup', 'staging'],
    commonCases: [
      { name: 'Fracture after minor trauma', scenario: 'Bone fails through a suspicious lytic lesion.' },
      { name: 'Unknown primary malignancy concern', scenario: 'Need to avoid rushing fixation before workup.' },
    ],
    learningObjectives: [
      'Recognize when a fracture may be pathologic rather than purely traumatic.',
      'Understand why lesion workup and staging matter before definitive fixation.',
      'Describe common treatment goals of stability and pain control.',
    ],
    prerequisites: ['reading-xrays', 'metastatic-bone-disease'],
    relatedTopicIds: ['metastatic-bone-disease', 'osteosarcoma', 'multiple-myeloma-bone-disease'],
    fast: {
      mustKnow: ['Lesion on x-ray, history of cancer, stage before you nail if possible'],
      anatomyFocus: ['Cortical destruction and bone failure concepts'],
      caseSteps: ['Describe lesion/fracture', 'State staging concern', 'Mention biopsy principles and fixation goals'],
      pimpQuestions: ['Why can fixation before workup be a mistake?', 'What cancers commonly metastasize to bone?'],
      orSurvivalTips: ['Say “pathologic until proven otherwise” when appropriate', 'Avoid assuming every lesion is metastatic'],
      oneLiner: 'A pathologic fracture is an oncologic problem as much as an orthopaedic one.',
    },
    deep: {
      anatomy: ['Weight-bearing bone failure in lytic lesions', 'Soft tissue extension implications'],
      classification: ['Impending versus complete pathologic fracture'],
      imaging: ['Orthogonal x-rays plus staging imaging guided by suspicion'],
      decisionMaking: ['Known malignancy, lesion appearance, need for biopsy, expected survival'],
      treatmentOptions: ['Stabilization, resection in selected primary tumors, adjuvant radiation/systemic therapy coordination'],
      surgicalApproach: ['Biopsy tract planning and durable fixation concepts'],
      complications: ['Hardware failure', 'Tumor progression', 'Missed primary sarcoma'],
      boardPearls: ['A solitary destructive lesion in an adult is not automatically metastasis without workup'],
      selfCheckQuestions: ['When should biopsy come before fixation?', 'What makes fixation “durable” in tumor patients?'],
    },
  },
  {
    id: 'metastatic-bone-disease',
    title: 'Metastatic Bone Disease',
    aliases: ['bone metastases', 'skeletal metastasis'],
    trackId: 'tumor',
    subspecialty: 'Tumor',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['oncology', 'impending fracture', 'pain control', 'multidisciplinary'],
    commonCases: [
      { name: 'Painful lytic femur lesion', scenario: 'Need to judge fracture risk and durability of fixation.' },
      { name: 'Known cancer with new bone pain', scenario: 'Staging and coordination with oncology matter.' },
    ],
    learningObjectives: [
      'Recognize common presentations of metastatic bone disease.',
      'Explain the concept of impending fracture and prophylactic fixation.',
      'Understand why treatment is multidisciplinary and goal-oriented.',
    ],
    prerequisites: ['pathologic-fracture'],
    relatedTopicIds: ['pathologic-fracture', 'multiple-myeloma-bone-disease', 'osteosarcoma'],
    fast: {
      mustKnow: ['Pain with weight-bearing, impending fracture risk, oncology coordination, palliative goals'],
      anatomyFocus: ['Common long-bone failure sites', 'Axial versus appendicular involvement'],
      caseSteps: ['Describe lesion and pain pattern', 'State fracture risk concern', 'Mention staging and durable fixation/radiation'],
      pimpQuestions: ['Why fix before fracture when possible?', 'What cancers commonly spread to bone?'],
      orSurvivalTips: ['Talk about goals of care and durability', 'Do not forget overall prognosis affects the plan'],
      oneLiner: 'Metastatic bone disease care balances fracture prevention, pain relief, and the patient’s overall cancer trajectory.',
    },
    deep: {
      anatomy: ['Lesion load in weight-bearing bone', 'Why proximal femur lesions are so consequential'],
      classification: ['Impending versus complete failure', 'Solitary versus multiple lesions'],
      imaging: ['Radiographs plus staging imaging and cross-sectional lesion detail when needed'],
      decisionMaking: ['Risk of fracture, diagnosis certainty, expected survival, systemic therapy response'],
      treatmentOptions: ['Radiation, systemic therapy, prophylactic fixation, endoprosthetic reconstruction'],
      surgicalApproach: ['Durable fixation and immediate weight-bearing goals'],
      complications: ['Hardware failure', 'Progression at other sites', 'Hypercalcemia context'],
      boardPearls: ['A durable implant matters because these lesions may never heal normally'],
      selfCheckQuestions: ['What makes a lesion “impending”?', 'Why is prognosis part of the ortho decision?'],
    },
  },
  {
    id: 'osteosarcoma',
    title: 'Osteosarcoma',
    aliases: ['primary osteogenic sarcoma'],
    trackId: 'tumor',
    subspecialty: 'Tumor',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['sarcoma', 'primary bone tumor', 'biopsy principle'],
    commonCases: [
      { name: 'Teen with painful metaphyseal lesion', scenario: 'Aggressive bone lesion with periosteal reaction near the knee.' },
      { name: 'Biopsy referral concern', scenario: 'Need to avoid an unplanned biopsy that compromises surgery.' },
    ],
    learningObjectives: [
      'Recognize osteosarcoma as a primary malignant bone tumor pattern.',
      'Understand why biopsy planning must involve the definitive tumor team.',
      'Describe the broad sequence of staging, chemotherapy, and resection.',
    ],
    prerequisites: ['pathologic-fracture'],
    relatedTopicIds: ['enchondroma', 'metastatic-bone-disease', 'pathologic-fracture'],
    fast: {
      mustKnow: ['Painful growing lesion, metaphysis, biopsy by tumor team, chemo plus resection'],
      anatomyFocus: ['Metaphyseal long-bone predilection', 'Soft tissue extension concern'],
      caseSteps: ['Describe aggressive imaging features', 'State tumor referral/biopsy principle', 'Mention staging and neoadjuvant therapy'],
      pimpQuestions: ['Why is biopsy planning so important?', 'What age group is classic?'],
      orSurvivalTips: ['Never casually stick a biopsy needle into a suspected sarcoma', 'Use oncologic referral language'],
      oneLiner: 'Osteosarcoma is a primary bone malignancy where the wrong biopsy can make the whole case worse.',
    },
    deep: {
      anatomy: ['Metaphyseal growth zones and aggressive cortical breakthrough'],
      classification: ['Conventional high-grade osteosarcoma at a concept level'],
      imaging: ['Radiographs plus MRI for local extent and chest imaging for staging'],
      decisionMaking: ['Location, resectability, metastases, chemo response'],
      treatmentOptions: ['Neoadjuvant chemotherapy', 'Limb-salvage or amputation depending on resection feasibility'],
      surgicalApproach: ['Wide oncologic margins and reconstruction concepts'],
      complications: ['Metastatic spread, local recurrence, treatment toxicity'],
      boardPearls: ['Biopsy tract placement must be planned as if it will need to be excised later'],
      selfCheckQuestions: ['What x-ray features look aggressive?', 'Why is MRI important before biopsy?'],
    },
  },
  {
    id: 'enchondroma',
    title: 'Enchondroma',
    aliases: ['cartilage lesion of bone'],
    trackId: 'tumor',
    subspecialty: 'Tumor',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['benign tumor', 'incidental lesion', 'cartilage'],
    commonCases: [
      { name: 'Incidental hand lesion', scenario: 'Lucent lesion with chondroid calcification found after minor injury x-ray.' },
      { name: 'Painful lesion workup', scenario: 'Need to decide whether symptoms fit a benign incidental enchondroma.' },
    ],
    learningObjectives: [
      'Recognize a common benign cartilage lesion pattern.',
      'Differentiate incidental benign-appearing lesions from aggressive features that need more workup.',
      'Understand why most are observed rather than urgently treated.',
    ],
    prerequisites: ['reading-xrays'],
    relatedTopicIds: ['osteosarcoma', 'metacarpal-fracture', 'pathologic-fracture'],
    fast: {
      mustKnow: ['Often incidental, chondroid matrix, usually observe unless concerning features'],
      anatomyFocus: ['Medullary cartilage lesion concept'],
      caseSteps: ['Describe lesion appearance', 'Note symptoms versus incidental finding', 'State observation versus referral concern'],
      pimpQuestions: ['What makes a cartilage lesion concerning?', 'Where are enchondromas common?'],
      orSurvivalTips: ['Use benign-appearing language carefully', 'Pain out of proportion deserves more thought'],
      oneLiner: 'Enchondromas are usually benign incidental cartilage lesions, but the context and radiographs still matter.',
    },
    deep: {
      anatomy: ['Intramedullary cartilage lesion distribution'],
      classification: ['Benign enchondroma versus more aggressive cartilage lesion concern conceptually'],
      imaging: ['Radiographs with chondroid calcification pattern', 'MRI selectively when concern exists'],
      decisionMaking: ['Symptoms, endosteal scalloping, cortical changes, growth over time'],
      treatmentOptions: ['Observation', 'Curettage in selected symptomatic or fracture-associated cases'],
      surgicalApproach: ['Curettage and grafting concepts'],
      complications: ['Pathologic fracture in small bones', 'Diagnostic uncertainty'],
      boardPearls: ['Many enchondromas are found by accident and simply watched'],
      selfCheckQuestions: ['What radiographic features are reassuring?', 'When does observation stop being enough?'],
    },
  },
  {
    id: 'multiple-myeloma-bone-disease',
    title: 'Multiple Myeloma Bone Disease',
    aliases: ['myeloma bone disease', 'plasma cell bone lesions'],
    trackId: 'tumor',
    subspecialty: 'Tumor',
    studentLevel: 'subintern',
    difficulty: 'advanced',
    tags: ['myeloma', 'lytic lesions', 'pathologic fracture'],
    commonCases: [
      { name: 'Diffuse lytic lesions', scenario: 'Back pain and long-bone pain in patient with plasma cell dyscrasia.' },
      { name: 'Impending femur fracture in myeloma', scenario: 'Need to pair fixation planning with systemic disease treatment.' },
    ],
    learningObjectives: [
      'Recognize the skeletal presentation of multiple myeloma.',
      'Understand why these lesions may behave differently from solid-tumor metastases.',
      'Describe high-level orthopaedic goals of fixation and pain relief.',
    ],
    prerequisites: ['metastatic-bone-disease', 'pathologic-fracture'],
    relatedTopicIds: ['metastatic-bone-disease', 'pathologic-fracture', 'osteosarcoma'],
    fast: {
      mustKnow: ['Diffuse lytic disease, fracture risk, marrow disease context, durable fixation'],
      anatomyFocus: ['Axial and appendicular skeletal involvement patterns'],
      caseSteps: ['Describe lesion burden', 'State fracture risk', 'Coordinate with oncology/radiation'],
      pimpQuestions: ['How is myeloma different from solid metastases?', 'Why can fixation still be necessary?'],
      orSurvivalTips: ['Mention systemic disease burden and bone fragility together'],
      oneLiner: 'Myeloma bone disease is a systemic marrow-driven fragility problem that often still needs orthopaedic stabilization.',
    },
    deep: {
      anatomy: ['Diffuse osteolysis and marrow infiltration concepts'],
      classification: ['Impending versus complete fractures in the context of systemic disease'],
      imaging: ['Skeletal survey or cross-sectional imaging depending on workup'],
      decisionMaking: ['Pain, location, fracture risk, expected systemic response'],
      treatmentOptions: ['Radiation/systemic therapy', 'Prophylactic fixation', 'Stabilization of pathologic fractures'],
      surgicalApproach: ['Durable intramedullary or endoprosthetic stabilization concepts'],
      complications: ['Hardware failure', 'Multiple site progression', 'Medical fragility'],
      boardPearls: ['An orthopaedic procedure may be palliative and still hugely beneficial'],
      selfCheckQuestions: ['When do you prophylactically fix?', 'Why do these lesions heal unpredictably?'],
    },
  },
  {
    id: 'fracture-healing',
    title: 'Fracture Healing',
    aliases: ['bone healing after fracture', 'callus formation'],
    trackId: 'basic-science',
    subspecialty: 'Basic Science',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['biology', 'callus', 'inflammation', 'union'],
    commonCases: [
      { name: 'Normal healing timeline review', scenario: 'Student needs to explain why callus appears when it does.' },
      { name: 'Delayed union discussion', scenario: 'Need to frame why biology and stability both matter.' },
    ],
    learningObjectives: [
      'Describe the major phases of fracture healing.',
      'Understand the relationship between biology, stability, and blood supply.',
      'Explain delayed union and nonunion at a basic level.',
    ],
    prerequisites: [],
    relatedTopicIds: ['bone-remodeling', 'open-fractures', 'tibial-shaft-fracture'],
    fast: {
      mustKnow: ['Inflammation, soft callus, hard callus, remodeling; stability and blood supply matter'],
      anatomyFocus: ['Periosteum', 'endosteum', 'vascular response'],
      caseSteps: ['Name phases', 'Link mechanics to biology', 'Give a simple delayed union explanation'],
      pimpQuestions: ['What helps secondary bone healing?', 'Why do open fractures heal slower?'],
      orSurvivalTips: ['Use primary vs secondary healing language only if you understand the mechanics'],
      oneLiner: 'Fracture healing is a staged biologic response shaped by blood supply and mechanical environment.',
    },
    deep: {
      anatomy: ['Periosteal and endosteal contribution', 'Vascular ingrowth'],
      classification: ['Primary versus secondary bone healing'],
      imaging: ['Callus and bridging concepts on serial x-rays'],
      decisionMaking: ['Biology, stability, infection, and host factors in union problems'],
      treatmentOptions: ['Improve stability or biology depending on the failure mode'],
      surgicalApproach: ['Compression versus relative stability concepts'],
      complications: ['Delayed union', 'Nonunion', 'Malunion'],
      boardPearls: ['Bone healing is both a biology problem and a mechanics problem'],
      selfCheckQuestions: ['What is the difference between primary and secondary healing?', 'Why can smoking impair union?'],
    },
  },
  {
    id: 'bone-remodeling',
    title: 'Bone Remodeling',
    aliases: ['wolff law basics', 'bone turnover'],
    trackId: 'basic-science',
    subspecialty: 'Basic Science',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['biology', 'osteoblast', 'osteoclast', 'wolff law'],
    commonCases: [
      { name: 'Stress response teaching', scenario: 'Need to connect loading and bone adaptation.' },
      { name: 'Pediatric remodeling discussion', scenario: 'Explain why some deformities correct over time.' },
    ],
    learningObjectives: [
      'Describe the roles of osteoblasts and osteoclasts in remodeling.',
      'Explain Wolff law at a practical student level.',
      'Connect remodeling concepts to fracture care and deformity correction.',
    ],
    prerequisites: [],
    relatedTopicIds: ['fracture-healing', 'gait-basics', 'pediatric-forearm-fracture'],
    fast: {
      mustKnow: ['Osteoblasts build, osteoclasts resorb, loading shapes bone'],
      anatomyFocus: ['Cortical and cancellous adaptation'],
      caseSteps: ['Define remodeling', 'Link to stress and healing', 'Give a clinical example'],
      pimpQuestions: ['What is Wolff law?', 'Why do kids remodel better?'],
      orSurvivalTips: ['Keep it clinical: load, blood supply, and age influence remodeling'],
      oneLiner: 'Bone remodeling is how the skeleton reshapes itself in response to stress, healing, and age.',
    },
    deep: {
      anatomy: ['Cortical versus trabecular remodeling behavior'],
      classification: ['Physiologic turnover versus pathologic remodeling problems'],
      imaging: ['Serial structural change concepts rather than specific imaging findings'],
      decisionMaking: ['Age, load, hormones, and stability influence remodeling capacity'],
      treatmentOptions: ['Optimize loading, biology, and alignment when remodeling is needed'],
      surgicalApproach: ['Respecting biology in fixation choices'],
      complications: ['Poor adaptation in low-load or poor-biology states'],
      boardPearls: ['Remodeling is not instant; alignment errors do not all correct equally'],
      selfCheckQuestions: ['Why do distal pediatric deformities remodel better?', 'What cell resorbs bone?'],
    },
  },
  {
    id: 'gait-basics',
    title: 'Gait Basics',
    aliases: ['gait cycle', 'normal gait'],
    trackId: 'basic-science',
    subspecialty: 'Basic Science',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['exam skills', 'biomechanics', 'hip abductors'],
    commonCases: [
      { name: 'Limp evaluation', scenario: 'Need a simple framework for stance and swing phase abnormalities.' },
      { name: 'Trendelenburg review', scenario: 'Connect abductor weakness to gait findings.' },
    ],
    learningObjectives: [
      'Describe stance and swing phases of gait.',
      'Recognize common gait deviations such as antalgic and Trendelenburg patterns.',
      'Apply gait basics to hip, spine, and foot-and-ankle presentations.',
    ],
    prerequisites: [],
    relatedTopicIds: ['hip-osteoarthritis', 'scfe', 'ankle-sprain'],
    fast: {
      mustKnow: ['Stance vs swing, antalgic gait, Trendelenburg, foot drop pattern'],
      anatomyFocus: ['Hip abductors', 'ankle dorsiflexors', 'pelvic control'],
      caseSteps: ['Name gait phase', 'Describe observed limp', 'Link it to likely anatomy'],
      pimpQuestions: ['What causes Trendelenburg gait?', 'How is antalgic gait different?'],
      orSurvivalTips: ['Watch the patient walk before touching them', 'Describe what you see, not just the diagnosis'],
      oneLiner: 'A basic gait framework turns vague limps into localizable orthopaedic clues.',
    },
    deep: {
      anatomy: ['Abductor mechanism', 'Ankle dorsiflexion during swing', 'Pelvic balance'],
      classification: ['Antalgic, Trendelenburg, steppage, stiff-knee gait patterns'],
      imaging: ['Gait is primarily a clinical observation topic'],
      decisionMaking: ['Pattern recognition guides the next focused exam'],
      treatmentOptions: ['Treat the underlying pathology rather than gait alone'],
      surgicalApproach: ['Not a surgery topic directly, but highly relevant to post-op assessment'],
      complications: ['Mislocalization if the gait exam is skipped'],
      boardPearls: ['The limp can tell you where to focus before imaging does'],
      selfCheckQuestions: ['What phase is shortened in antalgic gait?', 'What muscle group fails in Trendelenburg gait?'],
    },
  },
  {
    id: 'sterile-technique',
    title: 'Sterile Technique',
    aliases: ['scrub basics', 'or sterility'],
    trackId: 'or-fundamentals',
    subspecialty: 'OR Fundamentals',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['or basics', 'scrubbing', 'sterility'],
    commonCases: [
      { name: 'First day in the OR', scenario: 'Student needs to avoid contaminating the field.' },
      { name: 'Gown and glove setup', scenario: 'Need a practical checklist before scrubbing into a case.' },
    ],
    learningObjectives: [
      'Understand the basic principles that preserve sterility in the OR.',
      'Know where students commonly contaminate themselves or the field.',
      'Apply a repeatable mental checklist before and during scrubbed cases.',
    ],
    prerequisites: [],
    relatedTopicIds: ['sutures-and-closure', 'surgical-instruments', 'musculoskeletal-exam'],
    fast: {
      mustKnow: ['Hands above waist, front of gown is sterile, ask when unsure'],
      anatomyFocus: ['No anatomy focus; this is workflow and field awareness'],
      caseSteps: ['Scrub correctly', 'Gown/glove carefully', 'Protect the field', 'Own contamination early'],
      pimpQuestions: ['What parts of the gown are sterile?', 'What do you do if you think you contaminated?'],
      orSurvivalTips: ['When in doubt, freeze and ask', 'Own contamination immediately'],
      oneLiner: 'Good sterile technique is mostly awareness, positioning, and speaking up early.',
    },
    deep: {
      anatomy: ['Not anatomy-heavy; focus is sterile zones and field orientation'],
      classification: ['Scrubbed versus non-scrubbed roles and boundaries'],
      imaging: ['Not applicable'],
      decisionMaking: ['When to re-glove, when to back away, when to ask for help'],
      treatmentOptions: ['Immediate correction of contamination and safe re-entry'],
      surgicalApproach: ['Applies across all cases and services'],
      complications: ['Field contamination', 'Loss of trust if you hide errors'],
      boardPearls: ['Students are safest when they narrate uncertainty early'],
      selfCheckQuestions: ['What surfaces are sterile?', 'What is your move if you brush the drape with your arm?'],
    },
  },
  {
    id: 'sutures-and-closure',
    title: 'Sutures and Closure',
    aliases: ['basic closure', 'suturing basics'],
    trackId: 'or-fundamentals',
    subspecialty: 'OR Fundamentals',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['suturing', 'closure', 'or skills'],
    commonCases: [
      { name: 'Closing skin at end of case', scenario: 'Student needs a simple plan for handling tissue and tying knots.' },
      { name: 'Suture selection question', scenario: 'Need to explain absorbable versus nonabsorbable at a high level.' },
    ],
    learningObjectives: [
      'Recognize common suture categories and when they are used broadly.',
      'Understand simple principles of gentle tissue handling and tension.',
      'Prepare to help with basic closure safely as a student.',
    ],
    prerequisites: ['sterile-technique'],
    relatedTopicIds: ['surgical-instruments', 'flexor-tendon-injury', 'open-fractures'],
    fast: {
      mustKnow: ['Handle tissue gently, evert skin, keep tension even, know suture basics'],
      anatomyFocus: ['Skin layers and soft tissue planes'],
      caseSteps: ['Identify layer', 'Choose likely suture type', 'Place simple bites', 'Cut and maintain exposure'],
      pimpQuestions: ['Why evert skin edges?', 'When do you use absorbable suture?'],
      orSurvivalTips: ['Ask what layer you are closing before touching anything', 'Keep the needle visible'],
      oneLiner: 'Basic closure is about respect for tissue, even tension, and understanding what layer you are in.',
    },
    deep: {
      anatomy: ['Skin, dermis, subcutaneous tissue, fascia basics'],
      classification: ['Absorbable versus nonabsorbable; deep versus superficial closure'],
      imaging: ['Not applicable'],
      decisionMaking: ['Layer, tension, contamination, cosmetic priorities'],
      treatmentOptions: ['Simple interrupted, running, buried deep dermal concepts'],
      surgicalApproach: ['Needle driver handling and knot-tying workflow at a high level'],
      complications: ['Skin edge inversion, necrosis from tension, dehiscence'],
      boardPearls: ['If you do not know the layer, ask before placing a stitch'],
      selfCheckQuestions: ['Why is tissue eversion helpful?', 'What changes closure choices in contaminated wounds?'],
    },
  },
  {
    id: 'surgical-instruments',
    title: 'Surgical Instruments',
    aliases: ['or instruments', 'instrument basics'],
    trackId: 'or-fundamentals',
    subspecialty: 'OR Fundamentals',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['or basics', 'instruments', 'workflow'],
    commonCases: [
      { name: 'Student asked to pass an instrument', scenario: 'Need to identify common tools quickly and safely.' },
      { name: 'Setting up for closure', scenario: 'Recognize needle driver, pickups, and scissors without fumbling.' },
    ],
    learningObjectives: [
      'Identify common basic instruments students encounter in orthopaedic cases.',
      'Understand how instrument familiarity improves flow and trust in the OR.',
      'Use correct names when asking for or describing instruments.',
    ],
    prerequisites: ['sterile-technique'],
    relatedTopicIds: ['sutures-and-closure', 'sterile-technique', 'oral-presentation'],
    fast: {
      mustKnow: ['Needle driver, Adson pickups, DeBakey, Mayo scissors, Kocher, Army-Navy'],
      anatomyFocus: ['No anatomy focus; instrument recognition and function'],
      caseSteps: ['Identify tool', 'State its job', 'Pass it safely', 'Return it deliberately'],
      pimpQuestions: ['What is the difference between pickups?', 'Which retractor is which?'],
      orSurvivalTips: ['If unsure, repeat the instrument name before grabbing', 'Pass with the handle presented safely'],
      oneLiner: 'Knowing instrument names lowers cognitive load and makes you immediately more useful in the OR.',
    },
    deep: {
      anatomy: ['Not anatomy-heavy; function and workflow matter here'],
      classification: ['Cutting, grasping, retracting, driving, suctioning categories'],
      imaging: ['Not applicable'],
      decisionMaking: ['Choose instruments based on tissue job and the surgeon’s rhythm'],
      treatmentOptions: ['Practice recognition and repetition rather than theory alone'],
      surgicalApproach: ['Useful across all exposures and closures'],
      complications: ['Workflow slows when you guess or pass unsafely'],
      boardPearls: ['A calm, correct instrument pass can do more for trust than answering a pimp question'],
      selfCheckQuestions: ['What tool holds a needle?', 'How do you safely pass a scalpel or needle?'],
    },
  },
  {
    id: 'musculoskeletal-exam',
    title: 'Musculoskeletal Exam',
    aliases: ['msk exam', 'ortho physical exam'],
    trackId: 'clinic-fundamentals',
    subspecialty: 'Clinic Fundamentals',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['exam skills', 'inspection', 'range of motion', 'neurovascular'],
    commonCases: [
      { name: 'General orthopaedic clinic intake', scenario: 'Student needs a repeatable exam structure for any body region.' },
      { name: 'Presenting findings efficiently', scenario: 'Need to turn a long exam into a useful one-line summary.' },
    ],
    learningObjectives: [
      'Develop a reusable framework for orthopaedic physical examination.',
      'Understand the importance of inspection, ROM, strength, and neurovascular assessment.',
      'Present exam findings clearly and concisely in clinic.',
    ],
    prerequisites: [],
    relatedTopicIds: ['gait-basics', 'reading-xrays', 'oral-presentation'],
    fast: {
      mustKnow: ['Look, feel, move, strength, special tests, NV exam'],
      anatomyFocus: ['Region-specific anatomy is layered onto a common exam framework'],
      caseSteps: ['Inspect', 'Palpate', 'Assess ROM', 'Assess strength', 'Add special tests', 'Check NV status'],
      pimpQuestions: ['What is your exam sequence?', 'Why does comparison to the other side matter?'],
      orSurvivalTips: ['Watch them walk in first', 'Do the painful maneuver last when possible'],
      oneLiner: 'A good MSK exam is structured, comparative, and built around function and neurovascular safety.',
    },
    deep: {
      anatomy: ['Depends on region; the deeper lesson is localization through anatomy'],
      classification: ['General framework adaptable to trauma, sports, spine, and hand'],
      imaging: ['Exam guides whether imaging confirms or changes the differential'],
      decisionMaking: ['Use the exam to narrow location, severity, and urgency'],
      treatmentOptions: ['Not a treatment topic; it shapes every treatment conversation'],
      surgicalApproach: ['Vital for pre-op, post-op, and trauma evaluations'],
      complications: ['Missed neurovascular injury or mislocalized pain if the exam is sloppy'],
      boardPearls: ['A crisp focused exam often matters more than a long unfocused one'],
      selfCheckQuestions: ['What are the universal components of an MSK exam?', 'Why is comparison essential?'],
    },
  },
  {
    id: 'reading-xrays',
    title: 'Reading X-Rays',
    aliases: ['xray interpretation basics', 'plain film basics'],
    trackId: 'clinic-fundamentals',
    subspecialty: 'Clinic Fundamentals',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['imaging', 'xray', 'systematic review'],
    commonCases: [
      { name: 'Student asked to review films first', scenario: 'Need a systematic way to avoid freezing at the workstation.' },
      { name: 'Presenting fracture alignment', scenario: 'Need to describe findings clearly instead of saying “looks broken.”' },
    ],
    learningObjectives: [
      'Use a repeatable approach to reading orthopaedic radiographs.',
      'Describe alignment, fracture pattern, joint congruity, and soft tissue clues.',
      'Become more comfortable presenting imaging findings out loud.',
    ],
    prerequisites: [],
    relatedTopicIds: ['musculoskeletal-exam', 'distal-radius-fracture', 'oral-presentation'],
    fast: {
      mustKnow: ['Get the right view, know laterality, follow a sequence: bones, joints, alignment, soft tissues'],
      anatomyFocus: ['Radiographic anatomy of the region being studied'],
      caseSteps: ['Confirm patient/view', 'Describe overall alignment', 'Find the lesion', 'Comment on joint involvement and soft tissue'],
      pimpQuestions: ['What views are you looking at?', 'How would you describe displacement?'],
      orSurvivalTips: ['Start broad before zooming into the injury', 'Use anatomical terms, not vibes'],
      oneLiner: 'Reading x-rays gets easier when every film gets the same calm, systematic scan.',
    },
    deep: {
      anatomy: ['Regional radiographic landmarks and normal alignment cues'],
      classification: ['Fracture, degenerative, alignment, and lesion-oriented reads'],
      imaging: ['Plain radiographs first, then decide what extra imaging adds'],
      decisionMaking: ['Use the film to localize pathology and anticipate urgency'],
      treatmentOptions: ['Not treatment-heavy; this is about pattern recognition'],
      surgicalApproach: ['Operative planning starts with describing the x-ray correctly'],
      complications: ['Missing subtle malalignment, additional joints, or soft tissue clues'],
      boardPearls: ['A disciplined sequence prevents the “I only saw the obvious fracture” trap'],
      selfCheckQuestions: ['What is your reading sequence?', 'How do you describe displacement and angulation?'],
    },
  },
  {
    id: 'oral-presentation',
    title: 'Oral Presentation',
    aliases: ['ortho presentation', 'presenting a consult'],
    trackId: 'clinic-fundamentals',
    subspecialty: 'Clinic Fundamentals',
    studentLevel: 'clerkship',
    difficulty: 'introductory',
    tags: ['communication', 'presentation skills', 'consults'],
    commonCases: [
      { name: 'Presenting to resident in clinic', scenario: 'Need to summarize history, exam, and imaging in under a minute.' },
      { name: 'ED fracture consult', scenario: 'Need a concise structure for mechanism, exam, x-rays, and plan.' },
    ],
    learningObjectives: [
      'Build a clear structure for orthopaedic oral presentations.',
      'Highlight the data that orthopaedic teams care about most.',
      'Adjust the presentation for clinic versus consult settings.',
    ],
    prerequisites: ['musculoskeletal-exam', 'reading-xrays'],
    relatedTopicIds: ['musculoskeletal-exam', 'reading-xrays', 'sterile-technique'],
    fast: {
      mustKnow: ['Chief problem, mechanism, focused exam, imaging summary, plan or question'],
      anatomyFocus: ['Anatomy appears only insofar as it sharpens localization'],
      caseSteps: ['Lead with who/why', 'Give mechanism and timeline', 'Summarize focused exam', 'Read films out loud', 'State plan/question'],
      pimpQuestions: ['What are the most important exam details?', 'How do you present a fracture consult?'],
      orSurvivalTips: ['Give the answer early', 'Do not bury the neurovascular exam'],
      oneLiner: 'A strong ortho presentation is short, localizing, and ends with a useful next step.',
    },
    deep: {
      anatomy: ['Relevant anatomy should sharpen, not lengthen, the presentation'],
      classification: ['Clinic follow-up, trauma consult, post-op rounding, and OR pre-brief patterns'],
      imaging: ['You should be able to describe the key film finding in one sentence'],
      decisionMaking: ['Tailor the presentation to what the listener needs next'],
      treatmentOptions: ['Presenting well does not replace a plan, but it makes plans faster and safer'],
      surgicalApproach: ['Useful before clinic, on rounds, and in the OR'],
      complications: ['Teams lose trust when the key exam/imaging facts are missing'],
      boardPearls: ['A concise accurate presentation feels senior even if you are brand new'],
      selfCheckQuestions: ['What belongs in every fracture consult presentation?', 'What detail should never be omitted?'],
    },
  },
  ...CURRICULUM_EXPANSION_SEEDS,
];

export const CURRICULUM_TOPICS: CurriculumTopic[] = TOPIC_SEEDS.map(createTopic);

export const CURRICULUM_TOPIC_BY_ID: Record<string, CurriculumTopic> =
  CURRICULUM_TOPICS.reduce<Record<string, CurriculumTopic>>((accumulator, topic) => {
    accumulator[topic.id] = topic;
    return accumulator;
  }, {});

export const CURRICULUM_TRACKS: CurriculumTrack[] = [
  {
    id: 'trauma',
    title: 'Trauma',
    description: 'High-yield fracture patterns, urgent limb threats, and common inpatient consult logic.',
    rotationRelevance: 'Best for trauma call, ED consults, and early fracture presentations.',
    iconName: 'shield-alert',
    suggestedStartTopicId: 'ankle-fracture',
    topicIds: [
      'distal-radius-fracture',
      'ankle-fracture',
      'hip-fracture',
      'tibial-shaft-fracture',
      'tibial-plateau-fracture',
      'pilon-fracture',
      'pelvic-fracture',
      'acetabulum-fracture',
      'external-fixation',
      'compartment-syndrome',
      'open-fractures',
      'polytrauma',
    ],
  },
  {
    id: 'sports',
    title: 'Sports',
    description: 'Common ligament, tendon, and instability injuries seen in clinic and on the sideline.',
    rotationRelevance: 'Useful for sports clinic, busy ambulatory rotations, and anatomy-heavy shoulder or knee discussions.',
    iconName: 'activity',
    suggestedStartTopicId: 'acl-tear',
    topicIds: [
      'acl-tear',
      'postoperative-acl-rehabilitation',
      'meniscus-tear',
      'rotator-cuff-tear',
      'shoulder-instability',
      'achilles-tendon-rupture',
      'cartilage-restoration',
    ],
  },
  {
    id: 'adult-reconstruction',
    title: 'Adult Reconstruction',
    description: 'Arthritis fundamentals, arthroplasty indications, and common implant-related complications.',
    rotationRelevance: 'Best for arthroplasty clinic, postop rounding, and pre-op counseling exposure.',
    iconName: 'circle-gauge',
    suggestedStartTopicId: 'hip-osteoarthritis',
    topicIds: [
      'hip-osteoarthritis',
      'knee-osteoarthritis',
      'total-hip-arthroplasty',
      'posterior-hip-approach',
      'total-hip-implant-fixation',
      'total-knee-arthroplasty',
      'periprosthetic-joint-infection',
      'revision-arthroplasty',
      'periprosthetic-fracture',
    ],
  },
  {
    id: 'hand',
    title: 'Hand',
    description: 'Common clinic complaints, foundational hand trauma, and tendon or nerve concepts students encounter often.',
    rotationRelevance: 'Useful for hand clinic, consults, and high-yield wrist and finger problems.',
    iconName: 'hand',
    suggestedStartTopicId: 'carpal-tunnel-syndrome',
    topicIds: [
      'carpal-tunnel-syndrome',
      'trigger-finger',
      'flexor-tendon-injury',
      'metacarpal-fracture',
      'distal-radius-fracture-hand-perspective',
    ],
  },
  {
    id: 'pediatrics',
    title: 'Pediatrics',
    description: 'Classic pediatric orthopaedic diagnoses, physeal awareness, and counseling themes for families.',
    rotationRelevance: 'Best for peds clinic, pediatric trauma, and limping-child workups.',
    iconName: 'baby',
    suggestedStartTopicId: 'supracondylar-humerus-fracture',
    topicIds: [
      'supracondylar-humerus-fracture',
      'scfe',
      'clubfoot',
      'developmental-dysplasia-hip',
      'pediatric-forearm-fracture',
    ],
  },
  {
    id: 'spine',
    title: 'Spine',
    description: 'High-yield back and neurologic syndromes with emphasis on red flags and localization.',
    rotationRelevance: 'Helpful for spine clinic, consults, and any service where neurologic urgency matters.',
    iconName: 'align-vertical-space-around',
    suggestedStartTopicId: 'lumbar-disc-herniation',
    topicIds: [
      'lumbar-disc-herniation',
      'lumbar-spinal-stenosis',
      'lumbar-decompression',
      'cervical-myelopathy',
      'cervical-trauma',
      'cauda-equina-syndrome',
      'acdf',
      'tlif',
      'adult-spinal-deformity',
    ],
  },
  {
    id: 'foot-ankle',
    title: 'Foot & Ankle',
    description: 'Common lower-extremity injuries, forefoot problems, and subspecialty-specific ankle reasoning.',
    rotationRelevance: 'Useful for ankle clinic, foot and ankle OR days, and common ambulatory injuries.',
    iconName: 'footprints',
    suggestedStartTopicId: 'ankle-sprain',
    topicIds: [
      'ankle-fracture-foot-ankle-perspective',
      'achilles-tendon-rupture-foot-ankle',
      'hallux-valgus',
      'ankle-sprain',
      'calcaneus-fracture',
    ],
  },
  {
    id: 'shoulder-elbow',
    title: 'Shoulder & Elbow',
    description: 'Fracture, cuff, instability, and arthroplasty topics commonly seen on upper-extremity services.',
    rotationRelevance: 'Best for shoulder clinic, upper-extremity trauma, and postop rounding.',
    iconName: 'armchair',
    suggestedStartTopicId: 'proximal-humerus-fracture',
    topicIds: [
      'proximal-humerus-fracture',
      'rotator-cuff-tear-shoulder',
      'shoulder-arthroplasty',
      'elbow-dislocation',
      'olecranon-fracture',
    ],
  },
  {
    id: 'tumor',
    title: 'Oncology',
    description: 'Common lesion workups, oncologic guardrails, and durable-fixation thinking for bone disease.',
    rotationRelevance: 'Helpful for oncology clinic, inpatient lesion consults, and “do not biopsy casually” situations.',
    iconName: 'scan-search',
    suggestedStartTopicId: 'metastatic-bone-disease',
    topicIds: [
      'pathologic-fracture',
      'metastatic-bone-disease',
      'osteosarcoma',
      'enchondroma',
      'multiple-myeloma-bone-disease',
    ],
  },
  {
    id: 'basic-science',
    title: 'Basic Science / OITE Review',
    description: 'Core orthopaedic biology, biomechanics, and high-yield OITE review topics.',
    rotationRelevance: 'Best as pre-rotation groundwork or quick review before cases and teaching rounds.',
    iconName: 'atom',
    suggestedStartTopicId: 'fracture-healing',
    topicIds: ['fracture-healing', 'bone-remodeling', 'gait-basics'],
  },
  {
    id: 'or-fundamentals',
    title: 'OR Fundamentals',
    description: 'Practical operating-room habits and vocabulary to help students be safe and useful.',
    rotationRelevance: 'Best before first scrub days, trauma nights, or any operative-heavy week.',
    iconName: 'scissors',
    suggestedStartTopicId: 'sterile-technique',
    topicIds: ['sterile-technique', 'sutures-and-closure', 'surgical-instruments'],
  },
  {
    id: 'clinic-fundamentals',
    title: 'Clinic Fundamentals',
    description: 'Exam, imaging, and presentation skills that support every orthopaedic rotation.',
    rotationRelevance: 'Useful on day one of clinic, consult services, or broad generalist exposure.',
    iconName: 'stethoscope',
    suggestedStartTopicId: 'musculoskeletal-exam',
    topicIds: ['musculoskeletal-exam', 'reading-xrays', 'oral-presentation'],
  },
];

export const CURRICULUM_TRACK_BY_ID: Record<string, CurriculumTrack> =
  CURRICULUM_TRACKS.reduce<Record<string, CurriculumTrack>>((accumulator, track) => {
    accumulator[track.id] = track;
    return accumulator;
  }, {});

function hasContent(value: string): boolean {
  return value.trim().length > 0;
}

function hasNonEmptyEntries(values: string[]): boolean {
  return values.length > 0 && values.every((value) => hasContent(value));
}

function hasValidFastTemplate(topic: CurriculumTopic): boolean {
  const template = topic.fastStudyTemplate;

  return (
    hasContent(template.overviewPrompt) &&
    hasNonEmptyEntries(template.mustKnow) &&
    hasNonEmptyEntries(template.anatomyFocus) &&
    hasNonEmptyEntries(template.caseSteps) &&
    hasNonEmptyEntries(template.pimpQuestions) &&
    hasNonEmptyEntries(template.orSurvivalTips) &&
    hasContent(template.oneLiner)
  );
}

function hasValidDeepTemplate(topic: CurriculumTopic): boolean {
  const template = topic.deepStudyTemplate;

  return (
    hasContent(template.overviewPrompt) &&
    hasNonEmptyEntries(template.anatomy) &&
    hasNonEmptyEntries(template.classification) &&
    hasNonEmptyEntries(template.imaging) &&
    hasNonEmptyEntries(template.decisionMaking) &&
    hasNonEmptyEntries(template.treatmentOptions) &&
    hasNonEmptyEntries(template.surgicalApproach) &&
    hasNonEmptyEntries(template.complications) &&
    hasNonEmptyEntries(template.boardPearls) &&
    hasNonEmptyEntries(template.selfCheckQuestions) &&
    hasNonEmptyEntries(template.relatedTopics)
  );
}

function hasValidCommonCases(topic: CurriculumTopic): boolean {
  return (
    topic.commonCases.length > 0 &&
    topic.commonCases.every(
      (curriculumCase) =>
        hasContent(curriculumCase.name) && hasContent(curriculumCase.scenario)
    )
  );
}

function hasValidLearningObjectives(topic: CurriculumTopic): boolean {
  return (
    topic.learningObjectives.length > 0 &&
    topic.learningObjectives.every((objective) =>
      hasContent(objective.objective)
    )
  );
}

function createIssue(
  issue: StudentCurriculumValidationIssue
): StudentCurriculumValidationIssue {
  return issue;
}

/**
 * Development helper for manually auditing the seeded curriculum library.
 * Example:
 * `if (process.env.NODE_ENV !== "production") console.log(validateStudentCurriculum())`
 */
export function validateStudentCurriculum(): StudentCurriculumValidationResult {
  const errors: StudentCurriculumValidationIssue[] = [];
  const warnings: StudentCurriculumValidationIssue[] = [];
  const seenTopicIds = new Set<string>();
  const seenTrackIds = new Set<string>();

  for (const track of CURRICULUM_TRACKS) {
    if (seenTrackIds.has(track.id)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'duplicate-track-id',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.id`,
          message: `Track id "${track.id}" is duplicated.`,
        })
      );
    }
    seenTrackIds.add(track.id);

    if (!hasContent(track.title)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-track-title',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.title`,
          message: `Track "${track.id}" is missing a title.`,
        })
      );
    }

    if (!hasContent(track.description)) {
      warnings.push(
        createIssue({
          severity: 'warning',
          code: 'empty-track-description',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.description`,
          message: `Track "${track.id}" has an empty description.`,
        })
      );
    }

    if (!hasContent(track.rotationRelevance)) {
      warnings.push(
        createIssue({
          severity: 'warning',
          code: 'empty-track-rotation-relevance',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.rotationRelevance`,
          message: `Track "${track.id}" has an empty rotation relevance summary.`,
        })
      );
    }

    if (track.topicIds.length === 0) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-track-topic-ids',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.topicIds`,
          message: `Track "${track.id}" has no topic ids.`,
        })
      );
    }

    for (const topicId of track.topicIds) {
      if (!CURRICULUM_TOPIC_BY_ID[topicId]) {
        errors.push(
          createIssue({
            severity: 'error',
            code: 'missing-topic-for-track',
            entityType: 'track',
            entityId: track.id,
            path: `track:${track.id}.topicIds`,
            message: `Track "${track.id}" references missing topic "${topicId}".`,
          })
        );
      }
    }

    const suggestedStartTopic = CURRICULUM_TOPIC_BY_ID[track.suggestedStartTopicId];
    if (!suggestedStartTopic) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'missing-suggested-start-topic',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.suggestedStartTopicId`,
          message: `Track "${track.id}" references missing suggested start topic "${track.suggestedStartTopicId}".`,
        })
      );
    } else if (!track.topicIds.includes(track.suggestedStartTopicId)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'suggested-start-topic-outside-track',
          entityType: 'track',
          entityId: track.id,
          path: `track:${track.id}.suggestedStartTopicId`,
          message: `Track "${track.id}" suggested start topic "${track.suggestedStartTopicId}" is not included in the track topic list.`,
        })
      );
    }
  }

  for (const topic of CURRICULUM_TOPICS) {
    if (seenTopicIds.has(topic.id)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'duplicate-topic-id',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.id`,
          message: `Topic id "${topic.id}" is duplicated.`,
        })
      );
    }
    seenTopicIds.add(topic.id);

    if (!CURRICULUM_TRACK_BY_ID[topic.trackId]) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'missing-track-for-topic',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.trackId`,
          message: `Topic "${topic.id}" references missing track "${topic.trackId}".`,
        })
      );
    }

    if (!hasContent(topic.title)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-topic-title',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.title`,
          message: `Topic "${topic.id}" has an empty title.`,
        })
      );
    }

    if (!hasNonEmptyEntries(topic.aliases)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-topic-aliases',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.aliases`,
          message: `Topic "${topic.id}" must include at least one non-empty alias.`,
        })
      );
    }

    if (!hasValidCommonCases(topic)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-topic-common-cases',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.commonCases`,
          message: `Topic "${topic.id}" must include at least one common case.`,
        })
      );
    }

    if (!hasValidLearningObjectives(topic)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-topic-learning-objectives',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.learningObjectives`,
          message: `Topic "${topic.id}" must include at least one learning objective.`,
        })
      );
    }

    if (!hasValidFastTemplate(topic) || !hasValidDeepTemplate(topic)) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'empty-topic-template',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.templates`,
          message: `Topic "${topic.id}" has an incomplete fast or deep study template.`,
        })
      );
    }

    if (
      topic.estimatedFastMinutes <= 0 ||
      topic.estimatedDeepMinutes <= 0 ||
      topic.estimatedFastMinutes >= topic.estimatedDeepMinutes
    ) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'invalid-estimated-minutes',
          entityType: 'topic',
          entityId: topic.id,
          path: `topic:${topic.id}.estimatedMinutes`,
          message: `Topic "${topic.id}" has invalid estimated minutes (${topic.estimatedFastMinutes}/${topic.estimatedDeepMinutes}).`,
        })
      );
    }

    for (const relatedTopicId of topic.relatedTopicIds) {
      if (relatedTopicId === topic.id) {
        warnings.push(
          createIssue({
            severity: 'warning',
            code: 'self-related-topic',
            entityType: 'topic',
            entityId: topic.id,
            path: `topic:${topic.id}.relatedTopicIds`,
            message: `Topic "${topic.id}" references itself as a related topic.`,
          })
        );
      } else if (!CURRICULUM_TOPIC_BY_ID[relatedTopicId]) {
        errors.push(
          createIssue({
            severity: 'error',
            code: 'missing-related-topic',
            entityType: 'topic',
            entityId: topic.id,
            path: `topic:${topic.id}.relatedTopicIds`,
            message: `Topic "${topic.id}" references missing related topic "${relatedTopicId}".`,
          })
        );
      }
    }

    for (const prerequisiteId of topic.prerequisites) {
      if (prerequisiteId === topic.id) {
        warnings.push(
          createIssue({
            severity: 'warning',
            code: 'self-prerequisite-topic',
            entityType: 'topic',
            entityId: topic.id,
            path: `topic:${topic.id}.prerequisites`,
            message: `Topic "${topic.id}" references itself as a prerequisite.`,
          })
        );
      } else if (!CURRICULUM_TOPIC_BY_ID[prerequisiteId]) {
        errors.push(
          createIssue({
            severity: 'error',
            code: 'missing-prerequisite-topic',
            entityType: 'topic',
            entityId: topic.id,
            path: `topic:${topic.id}.prerequisites`,
            message: `Topic "${topic.id}" references missing prerequisite "${prerequisiteId}".`,
          })
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
