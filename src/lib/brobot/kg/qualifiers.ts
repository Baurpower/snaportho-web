import { normalizeRetrievalText } from "./query-understanding";

export const BROBOT_QUALIFIERS_VERSION = "brobot-clinical-qualifiers.v1" as const;

/**
 * Clinically discriminative qualifier dimensions. Query-vs-claim comparison
 * per dimension yields match / unknown / conflict. Conflicts on veto
 * dimensions hard-exclude the claim; conflicts on penalty dimensions
 * demote it and protect the dimension's query terms from maxCov excuse.
 * Unknown (either side unspecified, or specificity-asymmetric) never
 * penalizes: unknown is not conflict.
 */
export type BroBotQualifierDimension =
  | "laterality"
  | "proximodistal"
  | "mediolateral"
  | "dorsovolar"
  | "anteroposterior"
  | "flexionextension"
  | "abductionadduction"
  | "rotation"
  | "pronationsupination"
  | "nerve"
  | "tendon"
  | "ligament"
  | "vessel"
  | "bone_region"
  | "injury_subtype"
  | "spinal_level"
  | "approach"
  | "acuity"
  | "trauma"
  | "surgical_timing"
  | "population"
  | "intent_polarity"
  | "infection";

export type BroBotQualifierState = "match" | "unknown" | "conflict";

export type BroBotQualifierDimensionResult = {
  state: BroBotQualifierState;
  queryValues: string[];
  claimValues: string[];
  /**
   * Query keywords evidencing this dimension (for term protection): the
   * canonical label plus the matched surface text, because protection
   * matching runs against surface query terms ("finger", not "hand").
   */
  queryKeywords: string[];
};

/** Hard exclusions: a conflict here vetoes the claim outright. */
export const QUALIFIER_VETO_DIMENSIONS: ReadonlySet<BroBotQualifierDimension> = new Set([
  "laterality",
  "proximodistal",
  "dorsovolar",
  "flexionextension",
  "nerve",
  "spinal_level",
  "population",
  "intent_polarity",
]);

type Extraction = { values: Set<string>; keywords: Set<string> };

const emptyExtraction = (): Extraction => ({ values: new Set(), keywords: new Set() });

function pad(text: string): string {
  return ` ${normalizeRetrievalText(text)} `;
}

/** Remove matched spans so longer/opposed forms match before substrings. */
function consume(text: string, pattern: RegExp): { rest: string; matched: boolean } {
  const next = text.replace(pattern, (m) => " ".repeat(m.length));
  return { rest: next, matched: next !== text };
}



//__DIM1__

function extractLaterality(text: string): Extraction {
  const out = emptyExtraction();
  let t = pad(text);
  // "the right treatment" (correct) and "left untreated" (abandoned) are not sides.
  t = consume(t, /\bright\s+(treatment|choice|answer|option|options|management|indication|approach|time|moment|away|now|here|way)\b/g).rest;
  t = consume(t, /\bleft\s+(untreated|alone|behind|intact|unreduced|in\s+place)\b/g).rest;
  if (/\b(bilateral|bilat|both sides|right and left|left and right)\b/.test(t)) {
    out.values.add("left").add("right");
    out.keywords.add("bilateral");
    t = consume(t, /\b(bilateral|bilat|both sides|right and left|left and right)\b/g).rest;
  }
  if (/\bleft\b/.test(t)) { out.values.add("left"); out.keywords.add("left"); }
  if (/\bright\b/.test(t)) { out.values.add("right"); out.keywords.add("right"); }
  return out;
}

function extractAxis(
  text: string,
  first: { value: string; pattern: RegExp; keyword: string },
  second: { value: string; pattern: RegExp; keyword: string },
): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  const firstHit = first.pattern.test(t);
  // Match the second alternative on text with the first removed so embedded
  // forms ("adduction" inside "abduction") do not double-fire.
  const stripped = firstHit ? t.replace(first.pattern, (m) => " ".repeat(m.length)) : t;
  if (firstHit) { out.values.add(first.value); out.keywords.add(first.keyword); }
  if (second.pattern.test(stripped)) { out.values.add(second.value); out.keywords.add(second.keyword); }
  return out;
}

function extractProximodistal(text: string): Extraction {
  return extractAxis(
    text,
    { value: "proximal", pattern: /\bproximal\w*\b/g, keyword: "proximal" },
    { value: "distal", pattern: /\bdistal\w*\b/g, keyword: "distal" },
  );
}

function extractMediolateral(text: string): Extraction {
  return extractAxis(
    text,
    { value: "medial", pattern: /\bmedial\w*\b/g, keyword: "medial" },
    { value: "lateral", pattern: /\blater\w*\b/g, keyword: "lateral" },
  );
}

function extractDorsovolar(text: string): Extraction {
  const out = extractAxis(
    text,
    { value: "dorsal", pattern: /\bdors\w*\b/g, keyword: "dorsal" },
    { value: "volar", pattern: /\bvolar\b|\bpalmar\b/g, keyword: "volar" },
  );
  if (out.values.has("volar") && /\bpalmar\b/.test(pad(text))) out.keywords.add("palmar");
  return out;
}

function extractAnteroposterior(text: string): Extraction {
  return extractAxis(
    text,
    { value: "anterior", pattern: /\banterior\w*\b/g, keyword: "anterior" },
    { value: "posterior", pattern: /\bposterior\w*\b/g, keyword: "posterior" },
  );
}

function extractFlexionextension(text: string): Extraction {
  // "extend"/"extended" excluded: "extended approach" is not extension motion.
  return extractAxis(
    text,
    { value: "flexion", pattern: /\bflexion\b|\bflexed\b|\bflexing\b|\bhyperflexion\b/g, keyword: "flexion" },
    { value: "extension", pattern: /\bextension\b|\bhyperextension\b/g, keyword: "extension" },
  );
}

function extractAbductionadduction(text: string): Extraction {
  return extractAxis(
    text,
    { value: "abduction", pattern: /\babduct\w*\b/g, keyword: "abduction" },
    { value: "adduction", pattern: /\badduct\w*\b/g, keyword: "adduction" },
  );
}

function extractRotation(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  if (/\binternal\w*\s+rotat\w*\b/.test(t)) { out.values.add("internal"); out.keywords.add("internal rotation"); }
  if (/\bexternal\w*\s+rotat\w*\b|\bexternally\s+rotat\w+\b/.test(t)) { out.values.add("external"); out.keywords.add("external rotation"); }
  return out;
}

function extractPronationsupination(text: string): Extraction {
  // "prone"/"supine" are positioning, not forearm rotation: excluded.
  return extractAxis(
    text,
    { value: "pronation", pattern: /\bpronat\w*\b/g, keyword: "pronation" },
    { value: "supination", pattern: /\bsupinat\w*\b/g, keyword: "supination" },
  );
}

const NERVE_CONTEXT = "(?:nerve|nerves|palsy|palsies|neuropraxia|neuropathy|neuritis|entrapment)";

/** Multiword nerve names first (PIN/AIN need nerve context: "pin the hip" is a verb). */
const NAMED_NERVES: ReadonlyArray<{ value: string; patterns: RegExp[]; keyword: string }> = [
  { value: "ain", patterns: [new RegExp(`\\banterior\\s+interosseous\\s+${NERVE_CONTEXT}`), new RegExp(`\\bain\\b\\s+${NERVE_CONTEXT}`)], keyword: "anterior interosseous nerve" },
  { value: "pin", patterns: [new RegExp(`\\bposterior\\s+interosseous\\s+${NERVE_CONTEXT}`), new RegExp(`\\bpin\\b\\s+${NERVE_CONTEXT}`)], keyword: "posterior interosseous nerve" },
  { value: "recurrent_motor", patterns: [/\brecurrent\s+(motor\s+)?branch\b/], keyword: "recurrent motor branch" },
  { value: "palmar_cutaneous", patterns: [new RegExp(`\\bpalmar\\s+cutaneous\\s+(?:branch|${NERVE_CONTEXT})`)], keyword: "palmar cutaneous" },
  { value: "peroneal_common", patterns: [/\bcommon\s+(fibular|peroneal)\b/], keyword: "common peroneal" },
  { value: "peroneal_superficial", patterns: [/\bsuperficial\s+(fibular|peroneal)\b/], keyword: "superficial peroneal" },
  { value: "radial", patterns: [new RegExp(`\\bradial\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`), /\bwrist\s+drop\b/], keyword: "radial nerve" },
  { value: "median", patterns: [new RegExp(`\\bmedian\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "median nerve" },
  { value: "ulnar", patterns: [new RegExp(`\\bulnar\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "ulnar nerve" },
  { value: "axillary", patterns: [new RegExp(`\\baxillary\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "axillary nerve" },
  { value: "musculocutaneous", patterns: [new RegExp(`\\bmusculocutaneous\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "musculocutaneous nerve" },
  { value: "femoral", patterns: [new RegExp(`\\bfemoral\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "femoral nerve" },
  { value: "sciatic", patterns: [new RegExp(`\\bsciatic\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "sciatic nerve" },
  { value: "peroneal", patterns: [new RegExp(`\\b(peroneal|fibular)\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`), /\bfoot\s+drop\b/], keyword: "peroneal nerve" },
  { value: "tibial", patterns: [new RegExp(`\\btibial\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "tibial nerve" },
  { value: "sural", patterns: [new RegExp(`\\bsural\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "sural nerve" },
  { value: "saphenous", patterns: [new RegExp(`\\bsaphenous\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "saphenous nerve" },
  { value: "obturator", patterns: [new RegExp(`\\bobturator\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "obturator nerve" },
  { value: "suprascapular", patterns: [new RegExp(`\\bsuprascapular\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "suprascapular nerve" },
  { value: "long_thoracic", patterns: [new RegExp(`\\blong\\s+thoracic\\b(\\s+\\w+){0,2}\\s+${NERVE_CONTEXT}`)], keyword: "long thoracic nerve" },
];

/** Branch -> parent trunk: a branch is compatible with (not in conflict with) its trunk. */
const NERVE_PARENTS: Readonly<Record<string, string>> = {
  ain: "median",
  recurrent_motor: "median",
  palmar_cutaneous: "median",
  pin: "radial",
  peroneal_common: "sciatic",
  peroneal_superficial: "sciatic",
  peroneal: "sciatic",
  tibial: "sciatic",
  sural: "sciatic",
};

function extractNerve(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  for (const nerve of NAMED_NERVES) {
    if (nerve.patterns.some((pattern) => pattern.test(t))) {
      out.values.add(nerve.value);
      out.keywords.add(nerve.keyword);
    }
  }
  return out;
}

const TENDON_CONTEXT = "(?:tendon|tendons|tendinopathy|tendinitis|tendinosis|tenosynovitis|tenodesis)";
const NAMED_TENDONS: ReadonlyArray<{ value: string; bare: boolean; keyword: string }> = [
  { value: "achilles", bare: true, keyword: "achilles" },
  { value: "patellar", bare: false, keyword: "patellar tendon" },
  { value: "quadriceps", bare: false, keyword: "quadriceps tendon" },
  { value: "biceps", bare: false, keyword: "biceps tendon" },
  { value: "triceps", bare: false, keyword: "triceps tendon" },
  { value: "supraspinatus", bare: true, keyword: "supraspinatus" },
  { value: "infraspinatus", bare: true, keyword: "infraspinatus" },
  { value: "subscapularis", bare: true, keyword: "subscapularis" },
  { value: "teres_minor", bare: false, keyword: "teres minor" },
  { value: "peroneal", bare: false, keyword: "peroneal tendon" },
  { value: "tibialis_anterior", bare: false, keyword: "tibialis anterior" },
  { value: "tibialis_posterior", bare: false, keyword: "tibialis posterior" },
  { value: "fhl", bare: false, keyword: "flexor hallucis longus" },
  { value: "hamstring", bare: false, keyword: "hamstring" },
  { value: "gluteus_medius", bare: false, keyword: "gluteus medius" },
  { value: "iliopsoas", bare: false, keyword: "iliopsoas" },
  { value: "epl", bare: false, keyword: "extensor pollicis longus" },
  { value: "fcr", bare: false, keyword: "flexor carpi radialis" },
  { value: "fcu", bare: false, keyword: "flexor carpi ulnaris" },
];

const TENDON_PARENTS: Readonly<Record<string, string>> = {
  supraspinatus: "cuff",
  infraspinatus: "cuff",
  subscapularis: "cuff",
  teres_minor: "cuff",
};

function extractTendon(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  if (/\brota\w*\s+cuff\b/.test(t)) { out.values.add("cuff"); out.keywords.add("rotator cuff"); }
  for (const tendon of NAMED_TENDONS) {
    const name = tendon.value.replace(/_/g, " ");
    const bare = new RegExp(`\\b${name.replace(/ /g, "\\s+")}\\b`);
    const withContext = new RegExp(`\\b${name.replace(/ /g, "\\s+")}\\b(\\s+\\w+){0,2}\\s+${TENDON_CONTEXT}`);
    if ((tendon.bare && bare.test(t)) || withContext.test(t)) {
      out.values.add(tendon.value);
      out.keywords.add(tendon.keyword);
    }
  }
  return out;
}

function extractLigament(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  const bare: Array<[RegExp, string, string]> = [
    [/\bacl\b/, "acl", "acl"],
    [/\bpcl\b/, "pcl", "pcl"],
    [/\bmpfl\b/, "mpfl", "mpfl"],
    [/\batfl\b/, "atfl", "atfl"],
    [/\bcfl\b/, "cfl", "cfl"],
    [/\bptfl\b/, "ptfl", "ptfl"],
    [/\baitfl\b/, "aitfl", "aitfl"],
    [/\bpitfl\b/, "pitfl", "pitfl"],
    [/\bscapholunate\b/, "scapholunate", "scapholunate"],
    [/\blunotriquetral\b/, "lunotriquetral", "lunotriquetral"],
    [/\bcoracoclavicular\b/, "coracoclavicular", "coracoclavicular"],
    [/\bdeltoid\s+ligament\b/, "deltoid_ankle", "deltoid ligament"],
  ];
  for (const [pattern, value, keyword] of bare) {
    if (pattern.test(t)) { out.values.add(value); out.keywords.add(keyword); }
  }
  // Joint-qualified abbreviations: MCL/LCL/UCL resolve by nearby joint words.
  const kneeish = /\bknee\b|\bpatell|tibial\s+plateau|\bplateau\b|femoral\s+condyle/.test(t);
  const ankleist = /\bankle\b|\bmalleol|plafond|\bmortise\b|tibiotalar/.test(t);
  const elbowish = /\belbow\b|\bthrowing\b|\bpitcher\b/.test(t);
  const thumbish = /\bthumb\b|\bmcp\b|\bgamekeeper\b/.test(t);
  if (/\bmcl\b/.test(t)) {
    out.values.add(kneeish ? "mcl_knee" : "mcl");
    out.keywords.add("mcl");
  }
  if (/\blcl\b/.test(t)) {
    out.values.add(ankleist ? "lcl_ankle" : kneeish ? "lcl_knee" : elbowish ? "lcl_elbow" : "lcl");
    out.keywords.add("lcl");
  }
  if (/\bucl\b/.test(t)) {
    out.values.add(thumbish ? "ucl_thumb" : elbowish ? "ucl_elbow" : "ucl");
    out.keywords.add("ucl");
  }
  if (/\bsyndesmo\w*\b/.test(t)) { out.values.add("syndesmosis"); out.keywords.add("syndesmosis"); }
  return out;
}

const LIGAMENT_PARENTS: Readonly<Record<string, string>> = {
  atfl: "lcl_ankle",
  cfl: "lcl_ankle",
  ptfl: "lcl_ankle",
  aitfl: "syndesmosis",
  pitfl: "syndesmosis",
};

/** Unspecified abbreviations stay compatible with every resolved form. */
const LIGAMENT_COMPATIBLE: Readonly<Record<string, readonly string[]>> = {
  mcl: ["mcl_knee"],
  lcl: ["lcl_knee", "lcl_ankle", "lcl_elbow"],
  ucl: ["ucl_thumb", "ucl_elbow"],
};

function extractVessel(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  const names: Array<[RegExp, string, string]> = [
    [/\bradial\b/, "radial", "radial artery"],
    [/\bulnar\b/, "ulnar", "ulnar artery"],
    [/\bbrachial\b/, "brachial", "brachial artery"],
    [/\baxillary\b/, "axillary", "axillary artery"],
    [/\bfemoral\b/, "femoral", "femoral artery"],
    [/\bpopliteal\b/, "popliteal", "popliteal artery"],
    [/\banterior\s+tibial\b/, "tibial_anterior", "anterior tibial artery"],
    [/\bposterior\s+tibial\b/, "tibial_posterior", "posterior tibial artery"],
    [/\bperoneal\b/, "peroneal", "peroneal artery"],
    [/\bprofunda\s+brachii\b/, "profunda", "profunda brachii"],
  ];
  for (const [name, value, keyword] of names) {
    const pattern = new RegExp(`${name.source}(\\s+\\w+){0,2}\\s+(?:artery|arteries|arterial|pulse|pulses)`);
    if (pattern.test(t)) { out.values.add(value); out.keywords.add(keyword); }
  }
  return out;
}

/** Anatomic region lexicon: member pattern -> regions. Long bones span both ends. */
const BONE_REGIONS: ReadonlyArray<{ pattern: RegExp; regions: readonly string[]; keyword: string }> = [
  { pattern: /\bshoulder\b|\bglenoid\b|\bglenohumeral\b|\bacromi\w+\b|\bclavicle\b|\bscapul\w+\b|\bcoracoid\b|\brota\w*\s+cuff\b|\bsupraspinatus\b|\binfraspinatus\b|\bsubscapularis\b/, regions: ["shoulder"], keyword: "shoulder" },
  { pattern: /\belbow\b|\bolecrano\w+\b|\bcoronoid\b|\bcapitellum\b|\btrochlea\b|\bradial\s+head\b|\blateral\s+epicondyle\b|\bmedial\s+epicondyle\b|\btennis\s+elbow\b/, regions: ["elbow"], keyword: "elbow" },
  { pattern: /\bwrist\b|\bscaphoid\b|\blunate\b|\btriquetrum\b|\bpisiform\b|\btrapezium\b|\btrapezoid\b|\bcapitate\b|\bhamate\b|\bcarp\w+\b|\btfcc\b|\bdruj\b|\bradiocarpal\b|\bulnocarpal\b|\bkienbock\b/, regions: ["wrist"], keyword: "wrist" },
  { pattern: /\bhand\b|\bfinger\b|\bthumb\b|\bphalan\w+\b|\bmetacarpal\b|\bmcp\b|\bpip\b|\bdip\b|\bmallet\b|\bjersey\b|\bboutonniere\b|\bswan\s+neck\b|\bgamekeeper\b|\bboxer\b/, regions: ["hand"], keyword: "hand" },
  { pattern: /\bhip\b|\bacetabul\w+\b|\bfemoral\s+head\b|\bfemoral\s+neck\b|\bintertrochanteric\b|\bsubtrochanteric\b|\bscfe\b|\bslipped\s+capital\b|\bperthes\b|\blegg[\s-]*calv[\s-]*perthes\b|\bfemoroacetabular\b|\bfai\b|\bpiriformis\b/, regions: ["hip"], keyword: "hip" },
  { pattern: /\bknee\b|\bpatell\w+\b|\bplateau\b|\btibial\s+spine\b|\btibial\s+tubercle\b|\bosgood|\bmpfl\b|\bquadriceps\b/, regions: ["knee"], keyword: "knee" },
  { pattern: /\bankle\b|\btalus\b|\btalar\b|\bmalleol\w+\b|\bplafond\b|\bpilon\b|\bmortise\b|\btibiotalar\b|\bsyndesmo\w+\b|\bmaisonneuve\b|\bbosworth\b|\bweber\b|\blauge/, regions: ["ankle"], keyword: "ankle" },
  { pattern: /\bfoot\b|\bcalcane\w+\b|\bmidfoot\b|\bforefoot\b|\blisfranc\b|\bchopart\b|\bmetatarsal\b|\bjones\b|\bbunion\b|\bhallux\b|\bplantar\b/, regions: ["foot"], keyword: "foot" },
  { pattern: /\bsesamoid\b/, regions: ["foot", "hand"], keyword: "sesamoid" },
  { pattern: /\bpelvis\b|\bpelvic\b|\bpubic\s+rami?\b|\bsacroiliac\b|\bsi\s+joint\b|\biliac\b|\bischium\b/, regions: ["pelvis"], keyword: "pelvis" },
  { pattern: /\bcervical\b|\bc-spine\b|\bc[\s-]*collar\b|\bmiami\b|\bcervical\s+collar\b/, regions: ["spine_cervical"], keyword: "cervical" },
  { pattern: /\bthoracic\b|\bt-spine\b/, regions: ["spine_thoracic"], keyword: "thoracic" },
  { pattern: /\blumbar\b|\blumbosacral\b|\bl-spine\b|\bspondylolisthesis\b|\bspondylolysis\b/, regions: ["spine_lumbar"], keyword: "lumbar" },
  { pattern: /\bsacrum\b|\bsacral\b|\bcoccyx\b/, regions: ["spine_sacral"], keyword: "sacral" },
  { pattern: /\bscoliosis\b|\bkyphosis\b/, regions: ["spine_thoracic", "spine_lumbar"], keyword: "scoliosis" },
  { pattern: /\bhumerus\b|\bhumeral\b/, regions: ["shoulder", "elbow"], keyword: "humerus" },
  { pattern: /\bradius\b(?!\s+and\s+ulna)|\bradial\b(?!\s+(nerve|artery|head|tunnel))/, regions: ["elbow", "wrist"], keyword: "radius" },
  { pattern: /\bulna\b|\bulnar\b(?!\s+(nerve|artery|head|variance))|\bradioulnar\b/, regions: ["elbow", "wrist"], keyword: "ulna" },
  { pattern: /\bfemur\b|\bfemoral\b(?!\s+(head|neck|nerve|artery|condyle))|\bfemur\b/, regions: ["hip", "knee"], keyword: "femur" },
  { pattern: /\btibia\b|\btibial\b(?!\s+(plateau|spine|tubercle|nerve|artery|plafond))/, regions: ["knee", "ankle"], keyword: "tibia" },
  { pattern: /\bfibula\b|\bfibular\b(?!\s+nerve)/, regions: ["knee", "ankle"], keyword: "fibula" },
  { pattern: /\bproximal\s+humerus\b/, regions: ["shoulder"], keyword: "proximal humerus" },
  { pattern: /\bdistal\s+(radius|radial)\b/, regions: ["wrist"], keyword: "distal radius" },
  { pattern: /\bforearm\b/, regions: ["elbow", "wrist"], keyword: "forearm" },
  { pattern: /\barm\b/, regions: ["shoulder", "elbow"], keyword: "arm" },
  { pattern: /\bleg\b/, regions: ["knee", "ankle"], keyword: "leg" },
  { pattern: /\bthigh\b/, regions: ["hip", "knee"], keyword: "thigh" },
  { pattern: /\btka\b|\bknee\s+(replacement|arthroplasty)\b|\btkr\b/, regions: ["knee"], keyword: "knee arthroplasty" },
  { pattern: /\btha\b|\bhip\s+(replacement|arthroplasty)\b|\bthr\b|\bhemiarthroplasty\b/, regions: ["hip"], keyword: "hip arthroplasty" },
  { pattern: /\btsa\b|\brtsa\b|\bshoulder\s+(replacement|arthroplasty)\b|\breverse\s+shoulder\b/, regions: ["shoulder"], keyword: "shoulder arthroplasty" },
  { pattern: /\bankle\s+(replacement|arthroplasty)\b|\btar\b/, regions: ["ankle"], keyword: "ankle arthroplasty" },
  { pattern: /\bback\b/, regions: ["spine_thoracic", "spine_lumbar"], keyword: "back" },
];

const BONE_NECK_COMPOUNDS = new Set([
  "femoral", "femur", "talar", "talus", "radial", "radius", "humeral", "humerus",
  "metatarsal", "fibular", "tibial", "scaphoid", "tooth",
]);

function extractBoneRegion(text: string): Extraction {
  const out = emptyExtraction();
  let t = pad(text);
  // "Back to sports" is return-to-activity, not the spine.
  t = consume(t, /\bback\s+to\b|\bgo(ing)?\s+back\b|\bget(ting)?\s+back\b|\bcome\s+back\b|\breturn\s+back\b|\bback\s+in\b/g).rest;
  for (const entry of BONE_REGIONS) {
    const surface = t.match(entry.pattern);
    if (surface) {
      for (const region of entry.regions) out.values.add(region);
      out.keywords.add(entry.keyword);
      const evidence = surface[0].toLowerCase().trim();
      if (evidence) out.keywords.add(evidence);
    }
  }
  // Bare "neck" is cervical; "femoral neck" etc. are bone compounds (the
  // compound's own region entry already fired above).
  const tokens = t.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === "neck" && !BONE_NECK_COMPOUNDS.has(tokens[i - 1] ?? "")) {
      out.values.add("spine_cervical");
      out.keywords.add("neck");
      break;
    }
  }
  return out;
}

/**
 * True when the text names any orthopaedic structure (region, nerve,
 * tendon, ligament, vessel, or spinal level). Used by support assessment
 * so "fever after TKA" stays supported while "fever and cough" does not.
 */
export function containsOrthoStructure(text: string): boolean {
  return (
    extractBoneRegion(text).values.size > 0 ||
    extractNerve(text).values.size > 0 ||
    extractTendon(text).values.size > 0 ||
    extractLigament(text).values.size > 0 ||
    extractVessel(text).values.size > 0 ||
    extractSpinalLevel(text).values.size > 0
  );
}

function extractInjurySubtype(text: string): Extraction {
  const out = emptyExtraction();
  let t = pad(text);
  // "Open reduction/fixation" is a procedure, not an open fracture.
  t = consume(t, /\bopen\s+(reduction|fixation|orif|approach|procedure|surgery|treatment)\b/g).rest;
  // Open vs closed: Gustilo/compound imply open; match opposed forms first.
  const openFirst = /\bopen\s+fracture\b|\bopen\b.{0,12}\bfracture\b|\bgustilo\b|\bcompound\s+fracture\b/;
  if (openFirst.test(t)) {
    out.values.add("open"); out.keywords.add("open fracture");
    t = consume(t, /\bopen\b|\bgustilo\b|\bcompound\b/g).rest;
  }
  if (/\bclosed\s+fracture\b|\bclosed\b.{0,12}\bfracture\b/.test(t)) { out.values.add("closed"); out.keywords.add("closed fracture"); }
  if (/\bdisplaced\b/.test(t) && !/\b(nondisplaced|non-displaced|minimally\s+displaced|undisplaced)\b/.test(t)) {
    out.values.add("displaced"); out.keywords.add("displaced");
  }
  if (/\b(nondisplaced|non-displaced|minimally\s+displaced|undisplaced)\b/.test(t)) {
    out.values.add("nondisplaced"); out.keywords.add("nondisplaced");
  }
  if (/\bcomminut\w+\b/.test(t)) { out.values.add("comminuted"); out.keywords.add("comminuted"); }
  const intraFirst = /\bextra[\s-]*articular\b/;
  if (intraFirst.test(t)) {
    out.values.add("extra_articular"); out.keywords.add("extra-articular");
    t = consume(t, /\bextra[\s-]*articular\b/g).rest;
  }
  if (/\bintra[\s-]*articular\b/.test(t)) { out.values.add("intra_articular"); out.keywords.add("intra-articular"); }
  return out;
}

const SPINE_CONTEXT = /\b(thoracic|spine|spinal|vertebr\w+|level|levels|fracture|burst|compression|dislocation|laminectomy|fusion|pedicle|scoliosis|kyphosis|disc|stenosis|spondy\w+)\b/;

function extractSpinalLevel(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  const addLevel = (level: string, keyword: string) => {
    out.values.add(level);
    out.keywords.add(keyword);
    const region = level.startsWith("C") ? "cervical" : level.startsWith("T") ? "thoracic" : level.startsWith("S") ? "sacral" : "lumbar";
    out.values.add(`region:${region}`);
    out.keywords.add(region);
  };
  // Ranges first: L4-L5, L4/L5, L5/S1, C5-C7. The separator must be
  // explicit (-, /, "to") so "L4 5mm slip" does not become L4-L5.
  const rangePattern = /\b([ctl])(\d{1,2})\s*(?:-+|\/+|\bto\b)\s*([ctls])?(\d{1,2})\b/gi;
  let rest = t;
  let match: RegExpExecArray | null;
  rangePattern.lastIndex = 0;
  while ((match = rangePattern.exec(t)) !== null) {
    const aKind = match[1].toUpperCase();
    const aNum = Number(match[2]);
    const bKind = (match[3] ?? match[1]).toUpperCase();
    const bNum = Number(match[4]);
    if (aKind === "T" && !SPINE_CONTEXT.test(t)) continue;
    if (aNum < 1 || aNum > 12 || bNum < 1 || bNum > 12) continue;
    if (aKind === bKind && Math.abs(aNum - bNum) <= 4) {
      const [lo, hi] = aNum < bNum ? [aNum, bNum] : [bNum, aNum];
      for (let n = lo; n <= hi; n += 1) addLevel(`${aKind}${n}`, `${aKind.toLowerCase()}${n}`);
    } else {
      addLevel(`${aKind}${aNum}`, `${aKind.toLowerCase()}${aNum}`);
      addLevel(`${bKind}${bNum}`, `${bKind.toLowerCase()}${bNum}`);
    }
    rest = rest.replace(match[0], (m) => " ".repeat(m.length));
  }
  const single = (pattern: RegExp, kind: string, max: number) => {
    const re = new RegExp(pattern.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(rest)) !== null) {
      const n = Number(m[1]);
      if (n >= 1 && n <= max) addLevel(`${kind}${n}`, `${kind.toLowerCase()}${n}`);
    }
  };
  single(/\bl(\d{1,2})\b/, "L", 6);
  single(/\bc(\d)\b/, "C", 8);
  if (/\bs1\b/.test(rest)) addLevel("S1", "s1");
  if (SPINE_CONTEXT.test(t)) single(/\bt(\d{1,2})\b/, "T", 12);
  if (/\bcervical\b/.test(t)) { out.values.add("region:cervical"); out.keywords.add("cervical"); }
  if (/\bthoracic\b/.test(t)) { out.values.add("region:thoracic"); out.keywords.add("thoracic"); }
  if (/\blumbar\b|\blumbosacral\b/.test(t)) { out.values.add("region:lumbar"); out.keywords.add("lumbar"); }
  if (/\blumbosacral\b|\bsacrum\b|\bsacral\b/.test(t)) { out.values.add("region:sacral"); out.keywords.add("sacral"); }
  return out;
}

const NAMED_APPROACHES: ReadonlyArray<{ value: string; pattern: RegExp; keyword: string }> = [
  { value: "deltopectoral", pattern: /\bdeltopectoral\b/, keyword: "deltopectoral" },
  { value: "deltoid_split", pattern: /\bdeltoid[\s-]*split\b/, keyword: "deltoid split" },
  { value: "hardinge", pattern: /\bhardinge\b|\bdirect\s+lateral\b/, keyword: "hardinge" },
  { value: "smith_petersen", pattern: /\bsmith[\s-]*petersen\b|\bdirect\s+anterior\b/, keyword: "smith-petersen" },
  { value: "kocher", pattern: /\bkocher\b/, keyword: "kocher" },
  { value: "kaplan", pattern: /\bkaplan\b/, keyword: "kaplan" },
  { value: "henry", pattern: /\bhenry\b/, keyword: "henry" },
  { value: "thompson", pattern: /\bthompson\b/, keyword: "thompson" },
  { value: "wagner", pattern: /\bwagner\b/, keyword: "wagner" },
  { value: "stoppa", pattern: /\bstoppa\b/, keyword: "stoppa" },
  { value: "ilioinguinal", pattern: /\bilioinguinal\b/, keyword: "ilioinguinal" },
  { value: "kocher_langenbeck", pattern: /\bkocher[\s-]*langenbeck\b|\bkl\b\s+approach/, keyword: "kocher-langenbeck" },
];

function extractApproach(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  for (const entry of NAMED_APPROACHES) {
    if (entry.pattern.test(t)) { out.values.add(entry.value); out.keywords.add(entry.keyword); }
  }
  // Directional approaches need approach context (else "anterior compartment").
  if (/\b(approach|approaches|incision|exposure|interval|portal)\b/.test(t)) {
    if (/\banterior\b/.test(t)) { out.values.add("dir:anterior"); out.keywords.add("anterior approach"); }
    if (/\bposterior\b/.test(t)) { out.values.add("dir:posterior"); out.keywords.add("posterior approach"); }
    if (/\blateral\b/.test(t)) { out.values.add("dir:lateral"); out.keywords.add("lateral approach"); }
    if (/\bmedial\b/.test(t)) { out.values.add("dir:medial"); out.keywords.add("medial approach"); }
    if (/\bvolar\b/.test(t)) { out.values.add("dir:volar"); out.keywords.add("volar approach"); }
    if (/\bdorsal\b/.test(t)) { out.values.add("dir:dorsal"); out.keywords.add("dorsal approach"); }
  }
  return out;
}

const ACUITY_COMORBIDITIES = /\bchronic\w*\s+(alcoholism|alcohol\s+use|kidney|renal|liver|hepatic|heart|cardiac|lung|pulmonary|disease|diabetes|hypertension|ckd|esrd|copd|asthma|smok\w+|steroid\s+use)\b/;

function extractAcuity(text: string): Extraction {
  const out = emptyExtraction();
  let t = pad(text);
  t = consume(t, ACUITY_COMORBIDITIES).rest;
  if (/\bacut\w*\b/.test(t)) { out.values.add("acute"); out.keywords.add("acute"); }
  if (/\bchronic\w*\b/.test(t)) { out.values.add("chronic"); out.keywords.add("chronic"); }
  return out;
}

function extractTrauma(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  if (/\btrauma\w*\b|\bhigh[\s-]*energy\b|\bmva\b|\bmvc\b|\bgunshot\b|\bgsw\b|\bfall\s+from\b|\bassault\b/.test(t)) {
    out.values.add("traumatic"); out.keywords.add("traumatic");
  }
  if (/\batraumatic\b|\bdegenerat\w+\b|\boveruse\b|\binsufficiency\b|\bstress\s+(fracture|reaction|injury)\b/.test(t)) {
    out.values.add("atraumatic"); out.keywords.add("atraumatic");
  }
  return out;
}

function extractSurgicalTiming(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  if (/\bpre[\s-]*op\w*\b|\bpreoperative\b/.test(t)) { out.values.add("pre"); out.keywords.add("preop"); }
  if (/\bpost[\s-]*op\w*\b|\bpostoperative\b/.test(t)) { out.values.add("post"); out.keywords.add("postop"); }
  return out;
}

const PEDS_MARKERS = /\bpediatr\w+\b|\bpaediatr\w+\b|\bchildren\b|\bchildhood\b|\bchild\b|\binfants?\b|\bneonat\w+\b|\btoddlers?\b|\badolescen\w+\b|\bphyseal\b|\bphysis\b|\bgrowth\s+plate\b|\bopen\s+physis\b|\bskeletally\s+immature\b|\bjuveniles?\b|\bkids?\b/;
const ADULT_MARKERS = /\badults?\b|\bgrown\b|\bskeletally\s+mature\b|\bskeletal\s+maturity\b/;
const GERI_MARKERS = /\bgeriatric\b|\belderly\b|\bolder\s+adults?\b|\bnursing\s+home\b|\bnonagenarian\b|\boctogenarian\b/;

function extractPopulation(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  const peds = t.match(PEDS_MARKERS);
  if (peds) { out.values.add("peds"); out.keywords.add("pediatric"); out.keywords.add(peds[0].toLowerCase().trim()); }
  const adult = t.match(ADULT_MARKERS);
  if (adult) { out.values.add("adult"); out.keywords.add("adult"); out.keywords.add(adult[0].toLowerCase().trim()); }
  const geri = t.match(GERI_MARKERS);
  if (geri) { out.values.add("geriatric"); out.keywords.add("geriatric"); out.keywords.add(geri[0].toLowerCase().trim()); }
  return out;
}

function extractIntentPolarity(text: string, predicate?: string | null): Extraction {
  const out = emptyExtraction();
  let t = pad(text);
  if (/\bcontraindicat\w*\b/.test(t)) {
    out.values.add("contra"); out.keywords.add("contraindication");
    t = consume(t, /\bcontraindicat\w*\b/g).rest;
  }
  if (/\bnot\s+indicat\w+\b|\bshould\s+not\b|\bshould\s+be\s+avoided\b|\bnever\s+indicat\w+\b/.test(t)) {
    out.values.add("contra"); out.keywords.add("not indicated");
  }
  if (/\bindicat\w+\b/.test(t)) { out.values.add("ind"); out.keywords.add("indication"); }
  if (predicate === "indication" || predicate === "preferred_treatment") {
    out.values.add("ind"); out.keywords.add("indication");
  }
  if (predicate === "contraindication") {
    out.values.add("contra"); out.keywords.add("contraindication");
  }
  return out;
}

const ORGANISMS: ReadonlyArray<{ value: string; pattern: RegExp }> = [
  { value: "mrsa", pattern: /\bmrsa\b/ },
  { value: "staph", pattern: /\bstaph\w*\b|\baureus\b/ },
  { value: "strep", pattern: /\bstrep\w*\b|\bpyogenes\b|\bpneumoniae\b/ },
  { value: "pseudomonas", pattern: /\bpseudomonas\b|\bpaeruginosa\b/ },
  { value: "ecoli", pattern: /\be\.?\s?coli\b/ },
  { value: "klebsiella", pattern: /\bklebsiella\b/ },
  { value: "proteus", pattern: /\bproteus\b/ },
  { value: "serratia", pattern: /\bserratia\b/ },
  { value: "enterobacter", pattern: /\benterobacter\b/ },
  { value: "anaerobe", pattern: /\banaerob\w+\b/ },
  { value: "neisseria", pattern: /\bneisseria\b|\bgonococc\w+\b/ },
  { value: "salmonella", pattern: /\bsalmonella\b/ },
  { value: "borrelia", pattern: /\bborrelia\b|\blyme\b/ },
  { value: "mycobacterium", pattern: /\bmycobacter\w+\b|\btuberculosis\b|\btb\b(?=\s+(spine|hip|joint|arthritis))/ },
  { value: "fungal", pattern: /\bfungal\b|\bcandida\b|\baspergill\w+\b/ },
  { value: "cutibacterium", pattern: /\bcutibacterium\b|\bp\.\s?acnes\b|\bacnes\b/ },
];

function extractInfection(text: string): Extraction {
  const out = emptyExtraction();
  const t = pad(text);
  for (const org of ORGANISMS) {
    if (org.pattern.test(t)) { out.values.add(`org:${org.value}`); out.keywords.add(org.value); }
  }
  if (/\bsepti\w+\b|\binfect\w+\b|\bpurulent\b|\bosteomyelitis\b|\bprosthetic\s+joint\s+infection\b|\bpji\b/.test(t)) {
    out.values.add("infected"); out.keywords.add("infection");
  }
  if (/\bclean\b|\baseptic\b/.test(t)) { out.values.add("clean"); out.keywords.add("clean"); }
  return out;
}

const EXTRACTORS: Readonly<Record<BroBotQualifierDimension, (text: string, predicate?: string | null) => Extraction>> = {
  laterality: extractLaterality,
  proximodistal: extractProximodistal,
  mediolateral: extractMediolateral,
  dorsovolar: extractDorsovolar,
  anteroposterior: extractAnteroposterior,
  flexionextension: extractFlexionextension,
  abductionadduction: extractAbductionadduction,
  rotation: extractRotation,
  pronationsupination: extractPronationsupination,
  nerve: extractNerve,
  tendon: extractTendon,
  ligament: extractLigament,
  vessel: extractVessel,
  bone_region: extractBoneRegion,
  injury_subtype: extractInjurySubtype,
  spinal_level: extractSpinalLevel,
  approach: extractApproach,
  acuity: extractAcuity,
  trauma: extractTrauma,
  surgical_timing: extractSurgicalTiming,
  population: extractPopulation,
  intent_polarity: extractIntentPolarity,
  infection: extractInfection,
};

/** Values compatible via hierarchy (branch/trunk, specific/region, specified/unspecified). */
function valuesCompatible(dimension: BroBotQualifierDimension, a: string, b: string): boolean {
  if (a === b) return true;
  const parents: Readonly<Record<string, string>> | null =
    dimension === "nerve" ? NERVE_PARENTS
    : dimension === "tendon" ? TENDON_PARENTS
    : dimension === "ligament" ? LIGAMENT_PARENTS
    : null;
  if (parents && (parents[a] === b || parents[b] === a)) return true;
  if (dimension === "ligament") {
    if (LIGAMENT_COMPATIBLE[a]?.includes(b) || LIGAMENT_COMPATIBLE[b]?.includes(a)) return true;
  }
  if (dimension === "population") {
    // Adult vs geriatric share most management; only pediatric opposition vetoes.
    if ((a === "adult" && b === "geriatric") || (a === "geriatric" && b === "adult")) return true;
  }
  if (dimension === "approach") {
    if (APPROACH_COMPATIBLE[a]?.includes(b) || APPROACH_COMPATIBLE[b]?.includes(a)) return true;
  }
  return false;
}

/** Named approaches compatible with their directional equivalent. */
const APPROACH_COMPATIBLE: Readonly<Record<string, readonly string[]>> = {
  deltopectoral: ["dir:anterior"],
  smith_petersen: ["dir:anterior"],
  henry: ["dir:anterior", "dir:volar"],
  stoppa: ["dir:anterior"],
  ilioinguinal: ["dir:anterior"],
  hardinge: ["dir:lateral"],
  kaplan: ["dir:lateral"],
  wagner: ["dir:lateral"],
  kocher: ["dir:lateral"],
  kocher_langenbeck: ["dir:posterior"],
  thompson: ["dir:dorsal"],
};

/** Opposition pairs: only these value splits conflict (comminuted opposes nothing). */
const INJURY_OPPOSITES: Readonly<Record<string, string>> = {
  open: "closed",
  closed: "open",
  displaced: "nondisplaced",
  nondisplaced: "displaced",
  intra_articular: "extra_articular",
  extra_articular: "intra_articular",
};

function compareSpinalLevel(queryValues: string[], claimValues: string[]): BroBotQualifierState {
  if (queryValues.length === 0 || claimValues.length === 0) return "unknown";
  const qSpec = queryValues.filter((v) => !v.startsWith("region:"));
  const cSpec = claimValues.filter((v) => !v.startsWith("region:"));
  if (qSpec.length > 0 && cSpec.length > 0) {
    return qSpec.some((a) => cSpec.includes(a)) ? "match" : "conflict";
  }
  // Specificity asymmetry (L5 vs "lumbar") is compatible, never conflict.
  if (qSpec.length > 0 || cSpec.length > 0) return "unknown";
  const qReg = queryValues.filter((v) => v.startsWith("region:"));
  const cReg = claimValues.filter((v) => v.startsWith("region:"));
  if (qReg.length === 0 || cReg.length === 0) return "unknown";
  return qReg.some((a) => cReg.includes(a)) ? "match" : "conflict";
}

function compareInfection(queryValues: string[], claimValues: string[]): BroBotQualifierState {
  if (queryValues.length === 0 || claimValues.length === 0) return "unknown";
  const qOrg = queryValues.filter((v) => v.startsWith("org:"));
  const cOrg = claimValues.filter((v) => v.startsWith("org:"));
  if (qOrg.length > 0 && cOrg.length > 0 && !qOrg.some((a) => cOrg.includes(a))) return "conflict";
  const qCtx = new Set(queryValues.filter((v) => !v.startsWith("org:")));
  const cCtx = new Set(claimValues.filter((v) => !v.startsWith("org:")));
  if (qCtx.size > 0 && cCtx.size > 0) {
    const overlap = [...qCtx].some((v) => cCtx.has(v));
    if (!overlap) return "conflict";
    return "match";
  }
  if (qOrg.length > 0 && cOrg.length > 0) return "match";
  return "unknown";
}

function compareInjurySubtype(queryValues: string[], claimValues: string[]): BroBotQualifierState {
  if (queryValues.length === 0 || claimValues.length === 0) return "unknown";
  for (const a of queryValues) {
    if (claimValues.includes(a)) return "match";
    const opposite = INJURY_OPPOSITES[a];
    if (opposite && claimValues.includes(opposite)) return "conflict";
  }
  return "unknown";
}

export type BroBotQualifierComparison = Record<BroBotQualifierDimension, BroBotQualifierDimensionResult>;

export function compareQualifiers(
  queryText: string,
  claimText: string,
  claimPredicate?: string | null,
): BroBotQualifierComparison {
  const out = {} as BroBotQualifierComparison;
  for (const [dimension, extract] of Object.entries(EXTRACTORS) as Array<
    [BroBotQualifierDimension, (text: string, predicate?: string | null) => Extraction]
  >) {
    const query = extract(queryText);
    const claim = extract(claimText, dimension === "intent_polarity" ? claimPredicate : undefined);
    const queryValues = [...query.values];
    const claimValues = [...claim.values];
    let state: BroBotQualifierState = "unknown";
    if (queryValues.length > 0 && claimValues.length > 0) {
      if (dimension === "spinal_level") {
        state = compareSpinalLevel(queryValues, claimValues);
      } else if (dimension === "infection") {
        state = compareInfection(queryValues, claimValues);
      } else if (dimension === "injury_subtype") {
        state = compareInjurySubtype(queryValues, claimValues);
      } else {
        const overlap = queryValues.some((a) => claimValues.some((b) => valuesCompatible(dimension, a, b)));
        state = overlap ? "match" : "conflict";
      }
    }
    out[dimension] = {
      state,
      queryValues,
      claimValues,
      queryKeywords: [...query.keywords],
    };
  }
  return out;
}

/** First veto-dimension conflict, if any. */
export function qualifierVeto(comparison: BroBotQualifierComparison): BroBotQualifierDimension | null {
  for (const dimension of QUALIFIER_VETO_DIMENSIONS) {
    if (comparison[dimension].state === "conflict") return dimension;
  }
  return null;
}

/** Penalty-dimension conflicts (veto dimensions excluded; they drop the claim). */
export function qualifierPenaltyDimensions(comparison: BroBotQualifierComparison): BroBotQualifierDimension[] {
  return (Object.keys(comparison) as BroBotQualifierDimension[]).filter(
    (dimension) => !QUALIFIER_VETO_DIMENSIONS.has(dimension) && comparison[dimension].state === "conflict"
  );
}

function foldTerm(term: string): string {
  const lower = term.toLowerCase();
  if (lower.length > 3 && lower.endsWith("s") && !lower.endsWith("ss")) return lower.slice(0, -1);
  return lower;
}

function keywordsProtectTerms(
  keywords: readonly string[],
  queryTerms: readonly string[],
  out: Set<string>,
): void {
  const folded = keywords.flatMap((keyword) => keyword.split(" ").map(foldTerm));
  for (const term of queryTerms) {
    const foldedTerm = foldTerm(term);
    if (foldedTerm.length < 3) continue;
    if (folded.some((keyword) => keyword === foldedTerm || (keyword.length >= 4 && (keyword.includes(foldedTerm) || foldedTerm.includes(keyword))))) {
      out.add(term);
    }
  }
}

/**
 * Query terms evidencing ANY query-side qualifier value, on any dimension.
 * Qualifier-evidencing terms are high-information by definition (anatomy,
 * identity, level, polarity) and are never excused by maxCov, no matter
 * the candidate's state: a plateau claim missing "ankle" always counts
 * the miss, even without an explicit region conflict. Terms nobody covers
 * wash out via min-subtraction, so incidental qualifiers are harmless.
 */
export function qualifierQueryTerms(
  comparison: BroBotQualifierComparison,
  queryTerms: readonly string[],
): string[] {
  const out = new Set<string>();
  for (const result of Object.values(comparison)) {
    if (result.queryValues.length === 0) continue;
    keywordsProtectTerms(result.queryKeywords, queryTerms, out);
  }
  return [...out];
}
/**
 * Query terms evidencing conflicted dimensions. A term is protected when it
 * shares a folded form with a dimension keyword (plural folding both sides).
 */
export function qualifierProtectedTerms(
  comparison: BroBotQualifierComparison,
  queryTerms: readonly string[],
  penaltyOnly: boolean,
): string[] {
  const out = new Set<string>();
  for (const [dimension, result] of Object.entries(comparison) as Array<
    [BroBotQualifierDimension, BroBotQualifierDimensionResult]
  >) {
    if (result.state !== "conflict") continue;
    if (penaltyOnly && QUALIFIER_VETO_DIMENSIONS.has(dimension)) continue;
    keywordsProtectTerms(result.queryKeywords, queryTerms, out);
  }
  return [...out];
}
