/** Improved entity-type inference over the existing canonical enum.
 *
 * The Phase 2 factory defaulted nearly every proposed entity to `condition`
 * (89% skew) via ontologyEntityType's silent fallback. This module replaces
 * the silent default with explicit lexical rules plus a *reported* fallback:
 * every result carries reasons, and prior-fallback results are flagged so
 * type skew stays measurable instead of invisible.
 *
 * Label-only signals are conservative. Claim context (passed by the caller)
 * can upgrade confidence but never overrides a strong lexical signal.
 */

import type { CanonicalEntityType } from "./entity-review-dispositions";
import { normalizeEntityLabelForMatch } from "./entity-label-normalization";

export const ENTITY_TYPE_INFERENCE_VERSION = "entity-type-inference.v1" as const;

export type EntityTypeFlag =
  | "prior_fallback"
  | "ambiguous_elision"
  | "likely_verb_fragment"
  | "measurement_like"
  | "generic_single_token"
  | "multi_sense_risk";

export type EntityTypeInference = {
  type: CanonicalEntityType;
  confidence: number;
  reasons: string[];
  flags: EntityTypeFlag[];
};

type LexicalRule = {
  type: CanonicalEntityType;
  confidence: number;
  reason: string;
  patterns: RegExp[];
};

const RULES: LexicalRule[] = [
  // Complication precedes anatomy: "compartment syndrome" must not match the
  // bare "compartment" anatomy signal.
  {
    type: "complication",
    confidence: 0.85,
    reason: "complication_head_noun",
    patterns: [
      /\b(nonunion|malunion|delayed union|pseudarthrosis|refracture|hardware failure|implant failure|loosening|subsidence)\b/,
      /\b(stiffness|contracture|recurrent instability|recurrence|re-?dislocation|compartment syndrome|fat embolism|heterotopic ossification)\b/,
      /\b(surgical site infection|pin tract infection|osteomyelitis|septic arthritis|wound dehiscence)\b/,
    ],
  },
  // Condition precedes anatomy: injury/disease entities name anatomy
  // ("ulnar collateral ligament tear", "hip dysplasia") but are diagnoses.
  {
    type: "condition",
    confidence: 0.85,
    reason: "condition_head_noun",
    patterns: [
      /\b(fracture|dislocation|subluxation|sprain|strain|rupture|tear|avulsion)\b/,
      /\b(disease|syndrome|deformity|dysplasia|arthritis|arthrosis|necrosis|tumor|tumour|cyst|lesion|infection)\b/,
      /\b(sarcoma|osteosarcoma|chondrosarcoma|ewing|lymphoma|myeloma|chordoma|adamantinoma)\b/,
      /\b(scoliosis|kyphosis|lordosis|spondylolisthesis|spondylolysis|stenosis|herniation|myelopathy|radiculopathy)\b/,
      /\b(bursitis|tendinitis|tendinopathy|fasciitis|epicondylitis|synovitis|osteoporosis|rickets|paget|sequestrum|involucrum)\b/,
      /\b(neuropathy|palsy|neuritis|plexopathy|radiculitis)\b/,
      // Mechanical-symptom descriptors ("snapping ECU", "trigger finger").
      // "locking" excluded: ambiguous with locking hardware.
      /\b(snapping|triggering|clicking|catching)\b/,
      /\b(baja|alta)\b/,
      /\b(instability|impingement|laxity|synostosis)\b/,
      /\b\w+ (injury|injuries)\b/,
    ],
  },
  // Symptom precedes anatomy ("muscle weakness" is a symptom, not a
  // muscle) but follows condition/complication ("complex regional pain
  // syndrome" stays a condition; "elbow stiffness" stays a complication).
  // Step 4 ruling: patient-reported phenomena only. Examiner-observed
  // findings stay deferred until a clinical_sign ruling lands.
  {
    type: "symptom",
    confidence: 0.8,
    reason: "symptom_head_noun",
    patterns: [
      /\b(pain|painful|ache|aching|numb|numbness|weakness|weak|swelling|swollen|paresthesia|tingling)\b/,
    ],
  },
  {
    type: "anatomy_structure",
    confidence: 0.9,
    reason: "anatomy_head_noun",
    patterns: [
      /\b(nerve|artery|vein|muscle|tendon|ligament|retinaculum|fascia|rotator cuff)\b/,
      /\b(bone|joint|compartment|fossa|canal|foramen|membrane|cartilage|capsule|bursa|sheath)\b/,
      /\b(meniscus|labrum|physis|epiphysis|metaphysis|diaphysis|condyle|trochanter|malleolus|olecranon|patella|clavicle|scapula|pelvis|sacrum|coccyx)\b/,
      /\b(spine|spinous process|transverse process|tuberosity|tubercle|crest|notch|groove|facet|pedicle|lamina|articulation)\b/,
      /\b(pulley|carpal|tarsal|metacarpal|metatarsal|phalanx|vertebra|femoral neck|surgical neck|anatomical neck)\b/,
      /\b(radial head|ulnar head|femoral head|humeral head|fibular head|talar head)\b/,
      /\b(humerus|femur|tibia|fibula|radius|ulna|carpus|talus|calcaneus)\b/,
      // Bare joint singles only ("Knee"); phrases ("SLAC wrist", "hip pain")
      // need head-noun analysis and stay on the prior.
      /^(knee|hip|shoulder|elbow|wrist|ankle)$/,
      /\b(semimembranosus|semitendinosus|biceps femoris|biceps brachii|triceps|quadriceps|hamstring|gastrocnemius|soleus|gracilis|sartorius|gluteus|deltoid|pectoralis|latissimus dorsi|supraspinatus|infraspinatus|teres minor|subscapularis|brachialis|brachioradialis|pronator|tibialis|peroneus|adductor|abductor pollicis|psoas|iliacus|rectus femoris|vastus|opponens|thenar|hypothenar|lumbrical|palmaris|anconeus|coracobrachialis|popliteus|plantaris|trapezius|rhomboid|serratus)\b/,
    ],
  },
  {
    type: "procedure",
    confidence: 0.9,
    reason: "procedure_head_noun",
    patterns: [
      /\b(arthroplasty|osteotomy|arthrodesis|arthroscopy|reconstruction|decompression|resection|amputation|osteosynthesis)\b/,
      // Fixation techniques (orif/crpp/nailing/plating/pinning) map to
      // fixation_method via the more specific rule below, not procedure.
      /\b(grafting|tenodesis|tendon transfer|lengthening|epiphysiodesis|meniscectomy|synovectomy|embolization|fusion|transplantation)\b/,
      /(ectomy|otomy|oplasty|odesis|rrhaphy)\b/,
      /\b(release|repair|revision|excision|debridement|hemiepiphysiodesis)\b/,
    ],
  },
  {
    type: "diagnostic_test",
    confidence: 0.9,
    reason: "diagnostic_modality",
    patterns: [
      /\bmri\b/,
      /\bct\b|\bct scan\b|\bcomputed tomography\b/,
      /\b(x-?ray|radiograph|radiography|ultrasound|bone scan|pet scan|arthrogram|myelogram|emg|ncs)\b/,
      /\b(esr|crp|wbc|blood culture|synovial fluid|biopsy|aspiration)\b/,
    ],
  },
  {
    type: "exam_maneuver",
    confidence: 0.85,
    reason: "exam_maneuver_pattern",
    patterns: [
      /\b(lachman|mcmurray|pivot shift|anterior drawer|posterior drawer|tinnel|tinel|phalen|finkelstein|neer impingement|hawkins|jobe|drop arm|apprehension|relocation|sulcus|yergason|speed|o'brien|fadir|faber|thomas|trendelenburg|galeazzi|barlow|ortolani|thompson|homans|shuck|grind)\b/,
      /\b(range of motion|straight leg raise|lift off|belly press|empty can|external rotation lag)\b/,
    ],
  },
  {
    type: "surgical_approach",
    confidence: 0.85,
    reason: "surgical_approach_pattern",
    patterns: [
      /\b(approach|interval)\b/,
      /\b(kocher|kaplan|henry|smith-?petersen|watson-?jones|hardinge|deltopectoral|deltoid split|parapatellar|paraspinal|posterior approach|anterior approach|lateral approach|medial approach)\b/,
    ],
  },
  {
    type: "fixation_method",
    confidence: 0.85,
    reason: "fixation_method_pattern",
    patterns: [
      /\b(orif|crpp|closed reduction|open reduction|percutaneous pinning|intramedullary nailing|im nailing)\b/,
      /\b(nailing|plating|pinning|screw fixation|plate fixation|tension band|cerclage wiring|external fixation)\b/,
    ],
  },
  {
    type: "classification_grade",
    confidence: 0.85,
    reason: "classification_grade_pattern",
    patterns: [
      /\b(grade|stage|type) [ivx0-9]+\b/,
      /\b(garden|neer|pauwels|schatzker|salter-?harris) (type|grade|stage)?\s*[ivx0-9]+\b/,
    ],
  },
  {
    type: "classification_system",
    confidence: 0.9,
    reason: "classification_pattern",
    patterns: [
      /\bclassification\b/,
      /\b(garden|neer|pauwels|schatzker|lauge-?hansen|danis-?weber|salter-?harris|tonnis|tonn?is|klatskin|rockwood|allman|ideberg|regan-?morrey|masquelet|winquist|seinsheimer|russell-?taylor)\b/,
      /\b(scoring system|severity score|mirels|enneking)\b/,
      /\bao\/?ota\b/,
    ],
  },
  {
    type: "imaging_finding",
    confidence: 0.75,
    reason: "imaging_finding_pattern",
    patterns: [
      /\b(absent|displaced|widened|effusion|edema|signal change|radiolucen|radiopaque|sclerotic|lytic|blastic)\b.*\b(on|sign|line)\b/,
      /\b(fat pad sign|sail sign|double bubble|fallen fragment|piece of pie|crescent sign|rim sign|empty thecal sac)\b/,
      /\bterrible triad\b|\bunhappy triad\b/,
    ],
  },
  {
    type: "implant",
    confidence: 0.9,
    reason: "implant_head_noun",
    patterns: [
      /\b(implant|prosthesis|nail|plate|screw|rod|wire|anchor|button|cage|stem|cup|liner|peg|staple|cerclage)\b/,
      /\b(k-?wire|steinmann pin|schuhli|external fixator|intramedullary)\b/,
    ],
  },
  {
    type: "biomechanics_concept",
    confidence: 0.8,
    reason: "biomechanics_pattern",
    patterns: [
      /\b(varus|valgus|anteversion|retroversion|procurvatum|recurvatum)\b/,
      /\b(flexion|extension|abduction|adduction|rotation|pronation|supination|dorsiflexion|plantarflexion|inversion|eversion)\b/,
      /\b(leg length|mechanical axis|joint reactive force|moment arm|center of rotation|safe zone|working length)\b/,
    ],
  },
  {
    type: "treatment_principle",
    confidence: 0.7,
    reason: "treatment_principle_pattern",
    patterns: [
      /\b(early mobilization|weight bearing|non-?weight ?bearing|protected weight|relative stability|absolute stability)\b/,
      /\b(damage control|spanning|biologic fixation|soft tissue envelope|dead space management)\b/,
    ],
  },
];

const VERB_FRAGMENT_RE =
  /^(extend|flex|abduct|adduct|rotate|pronate|supinate|invert|evert|dorsiflex|plantarflex|elevate|depress|protract|retract|internally|externally)\b/i;
const MEASUREMENT_RE = /[<>≥≤]|°|\bmm\b|\bcm\b|\bdegrees?\b|\bpercent\b|%|\d/;
const GENERIC_SINGLE_TOKENS = new Set([
  "treatment",
  "management",
  "observation",
  "injury",
  "fracture",
  "pain",
  "higher",
  "lower",
  "increased",
  "decreased",
  "anterior",
  "posterior",
  "medial",
  "lateral",
  "proximal",
  "distal",
]);
/** Adjectives that usually elide a head noun ("femoral" -> nerve/artery),
 * bare or as the trailing token ("deep peroneal" -> nerve). */
export function isElidedLabel(normalized: string): boolean {
  if (ELIDED_ADJECTIVES.has(normalized)) return true;
  const tokens = normalized.split(" ").filter(Boolean);
  return tokens.length > 1 && ELIDED_ADJECTIVES.has(tokens[tokens.length - 1]);
}

const ELIDED_ADJECTIVES = new Set([
  "radial",
  "ulnar",
  "median",
  "femoral",
  "tibial",
  "fibular",
  "peroneal",
  "sciatic",
  "obturator",
  "musculocutaneous",
  "axillary",
  "brachial",
  "popliteal",
  "plantar",
  "palmar",
  "volar",
  "dorsal",
  "collateral",
  "cruciate",
  "anterolateral",
  "posterolateral",
  "posteromedial",
  "anteromedial",
]);

export function inferEntityType(
  preferredLabel: string,
  normalizedLabel?: string,
  claimHints?: { texts: string[] },
): EntityTypeInference {
  const normalized = (normalizedLabel ?? preferredLabel).toLowerCase().trim();
  const flags: EntityTypeFlag[] = [];

  if (VERB_FRAGMENT_RE.test(normalized)) flags.push("likely_verb_fragment");
  if (MEASUREMENT_RE.test(normalized)) flags.push("measurement_like");
  if (!normalized.includes(" ") && GENERIC_SINGLE_TOKENS.has(normalized)) {
    flags.push("generic_single_token");
  }
  if (ELIDED_ADJECTIVES.has(normalized)) flags.push("ambiguous_elision");

  // Lexical rules run on the plural-folded match form so "dislocations"
  // matches the "dislocation" signal. Flags above stay on the raw label.
  const ruleText = normalizeEntityLabelForMatch(preferredLabel);
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(ruleText))) {
      const inference: EntityTypeInference = {
        type: rule.type,
        confidence: rule.confidence,
        reasons: [rule.reason],
        flags: [...flags],
      };
      return applyClaimHints(inference, normalized, claimHints);
    }
  }

  // Reported fallback: condition prior is explicit and flagged, never silent.
  const fallback: EntityTypeInference = {
    type: "condition",
    confidence: 0.35,
    reasons: ["condition_prior_fallback"],
    flags: [...flags, "prior_fallback"],
  };
  return applyClaimHints(fallback, normalized, claimHints);
}

function applyClaimHints(
  inference: EntityTypeInference,
  normalizedLabel: string,
  claimHints?: { texts: string[] },
): EntityTypeInference {
  if (!claimHints || claimHints.texts.length === 0) return inference;
  const joined = claimHints.texts.join(" ").toLowerCase();
  const reasons = [...inference.reasons];
  let { confidence } = inference;
  // Innervation context disambiguates elided nerve adjectives, bare or
  // trailing ("femoral", "deep peroneal").
  if (
    (inference.flags.includes("ambiguous_elision") || isElidedLabel(normalizedLabel))
    && /\binnervat/.test(joined)
  ) {
    return {
      type: "anatomy_structure",
      confidence: 0.8,
      reasons: [...reasons, "innervation_context_disambiguation"],
      flags: inference.flags,
    };
  }
  // Origin/insertion/composition context disambiguates short anatomy labels
  // ("3rd MC originates from", "gracilis is one of the tendons").
  if (
    inference.flags.includes("prior_fallback")
    && /\b(originates?|origin of|insertion|inserts on|is one of the (tendon|muscle|ligament)s?|made up of)\b/.test(joined)
  ) {
    return {
      type: "anatomy_structure",
      confidence: 0.6,
      reasons: [...reasons, "musculoskeletal_context_disambiguation"],
      flags: inference.flags,
    };
  }
  // Imaging-modality context: "best test ... is X" supports diagnostic_test.
  if (/\bbest test\b|\btest of choice\b|\bevaluate\b.*\bwith\b/.test(joined)) {
    if (inference.type === "diagnostic_test") {
      confidence = Math.min(0.95, confidence + 0.05);
      reasons.push("best_test_context_support");
    } else if (inference.flags.includes("prior_fallback")) {
      return {
        type: "diagnostic_test",
        confidence: 0.65,
        reasons: [...reasons, "best_test_context_override"],
        flags: inference.flags,
      };
    }
  }
  // Multi-claim sense divergence cannot be detected from labels alone; the
  // caller (review packet) flags mixed contexts separately.
  return { ...inference, confidence, reasons };
}
