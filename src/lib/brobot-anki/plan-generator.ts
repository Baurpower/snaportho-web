export type GeneratedTopic = {
  category: string;
  topic: string;
  priority: number;
};

export type SearchProfile = {
  anchors: string[];
  highYield: string[];
  supporting: string[];
  broad: string[];
  excludeUnlessAnchored: string[];
  preferredTags: string[];
  penaltyTags: string[];
};

export type ParsedCase = {
  id: string;
  rawText: string;
  diagnosis: string;
  procedure: string;
  bodyRegion: string;
  subspecialty: string;
  generatedKeywords: string[];
  generatedTopics: GeneratedTopic[];
  suggestedTags: string[];
  searchProfile: SearchProfile;
};

export type BroBotDeckPlan = {
  title: string;
  rawCaseInput: string;
  generatedSummary: string;
  parsedCases: ParsedCase[];
  generatedKeywords: string[];
  generatedTopics: GeneratedTopic[];
  suggestedTags: string[];
  searchProfile: SearchProfile;
};

type KeywordRule = {
  matchers: string[];
  diagnosis: string;
  procedure: string;
  bodyRegion: string;
  subspecialty: string;
  keywords: string[];
  topics?: GeneratedTopic[];
  searchProfile: SearchProfile;
};

type InferredFields = {
  diagnosis: string;
  procedure: string;
  bodyRegion: string;
  subspecialty: string;
};

const GENERIC_KEYWORDS = [
  "anatomy",
  "approach",
  "classification",
  "complications",
  "fixation",
  "postoperative protocol",
  "surgical indications",
  "contraindications",
  "implants",
  "pimp questions",
];

const GENERIC_BROAD_TERMS = [
  "anatomy",
  "approach",
  "classification",
  "complications",
  "fixation",
  "fracture",
  "implants",
  "orif",
  "postoperative protocol",
  "surgery",
  "trauma",
];

const GENERIC_IGNORE_TERMS = new Set([
  "and",
  "anki",
  "approach",
  "case",
  "cases",
  "complications",
  "fixation",
  "for",
  "fracture",
  "implant",
  "implants",
  "internal",
  "management",
  "operative",
  "or",
  "orif",
  "open",
  "postoperative",
  "preop",
  "prep",
  "protocol",
  "questions",
  "reduction",
  "review",
  "surgical",
  "surgery",
  "the",
  "trauma",
  "with",
]);

const DEFAULT_TOPICS: GeneratedTopic[] = [
  { category: "core", topic: "Anatomy", priority: 1 },
  { category: "core", topic: "Surgical approach", priority: 1 },
  { category: "core", topic: "Classification", priority: 2 },
  { category: "core", topic: "Fixation strategy", priority: 1 },
  { category: "core", topic: "Complications", priority: 1 },
  { category: "core", topic: "Postoperative protocol", priority: 2 },
  { category: "core", topic: "Pimp questions", priority: 2 },
];

const KEYWORD_RULES: KeywordRule[] = [
  {
    matchers: ["distal radius", "drf", "wrist orif"],
    diagnosis: "Distal radius fracture",
    procedure: "Distal radius fixation",
    bodyRegion: "Wrist",
    subspecialty: "Hand",
    keywords: [
      "distal radius",
      "DRF",
      "volar approach",
      "FCR",
      "watershed line",
      "median nerve",
      "dorsal spanning plate",
      "radial styloid",
      "lunate facet",
    ],
    topics: [
      { category: "approach", topic: "Volar approach landmarks", priority: 1 },
      { category: "complications", topic: "Median nerve and tendon complications", priority: 2 },
    ],
    searchProfile: {
      anchors: [
        "distal radius",
        "distal radial",
        "drf",
        "distalradius",
        "distal radius fracture",
      ],
      highYield: [
        "volar approach",
        "fcr",
        "watershed line",
        "fpl rupture",
        "epl rupture",
        "lunate facet",
        "radial styloid",
        "dorsal spanning plate",
      ],
      supporting: [
        "median nerve",
        "acute carpal tunnel",
        "radial inclination",
        "volar tilt",
        "radial height",
        "ulnar styloid",
        "druj",
      ],
      broad: ["wrist", "hand", "orif", "fixation", "fracture"],
      excludeUnlessAnchored: [
        "scaphoid",
        "perilunate",
        "lunate dislocation",
        "carpal tunnel syndrome",
        "trigger finger",
        "metacarpal",
      ],
      preferredTags: [
        "DistalRadius",
        "DistalRadiusFx",
        "Distal_Radius",
        "ForearmWrist::Trauma",
        "OB::Approaches::DistalRadius",
      ],
      penaltyTags: [
        "Scaphoid",
        "Carpal_Tunnel",
        "Perilunate",
        "LunateDislocation",
        "Volar_Scaphoid",
      ],
    },
  },
  {
    matchers: ["tibial plateau", "plateau fracture", "schatzker"],
    diagnosis: "Tibial plateau fracture",
    procedure: "Tibial plateau fixation",
    bodyRegion: "Knee",
    subspecialty: "Trauma",
    keywords: [
      "tibial plateau",
      "Schatzker",
      "split depression",
      "lateral plateau",
      "posteromedial fragment",
      "meniscus",
      "meniscal entrapment",
      "compartment syndrome",
      "lateral locking plate",
      "staged fixation",
    ],
    topics: [
      { category: "classification", topic: "Schatzker classification", priority: 1 },
      { category: "approach", topic: "Plateau exposure and meniscus handling", priority: 1 },
    ],
    searchProfile: {
      anchors: [
        "tibial plateau",
        "schatzker",
        "lateral plateau",
        "medial plateau",
        "posteromedial fragment",
      ],
      highYield: [
        "split depression",
        "meniscal entrapment",
        "compartment syndrome",
        "submeniscal arthrotomy",
        "rafting screws",
      ],
      supporting: [
        "lateral locking plate",
        "staged fixation",
        "external fixation",
        "post traumatic arthritis",
      ],
      broad: ["knee", "trauma", "orif", "fracture"],
      excludeUnlessAnchored: ["acl", "tka", "meniscus tear", "patella"],
      preferredTags: ["TibialPlateau", "Tibial_Plateau", "Trauma::Knee"],
      penaltyTags: ["ACL", "Arthroplasty", "TKA"],
    },
  },
  {
    matchers: ["tibial shaft", "tibia shaft", "tibial nail", "tibial nailing"],
    diagnosis: "Tibial shaft fracture",
    procedure: "Tibial shaft fixation",
    bodyRegion: "Tibia",
    subspecialty: "Trauma",
    keywords: [
      "tibial shaft",
      "intramedullary nail",
      "suprapatellar",
      "infrapatellar",
      "compartment syndrome",
      "malrotation",
      "anterior knee pain",
      "locking screws",
    ],
    topics: [
      { category: "technique", topic: "Nailing start point and alignment control", priority: 1 },
      { category: "complications", topic: "Compartment syndrome and malrotation", priority: 1 },
    ],
    searchProfile: {
      anchors: ["tibial shaft", "tibia shaft", "tibial nail", "intramedullary nail"],
      highYield: ["suprapatellar", "infrapatellar", "blocking screws", "malrotation"],
      supporting: ["anterior knee pain", "compartment syndrome", "locking screws", "start point"],
      broad: ["tibia", "leg", "fracture", "fixation", "orif"],
      excludeUnlessAnchored: ["tibial plateau", "pilon", "acl", "ankle fracture"],
      preferredTags: ["TibialShaft", "Tibial_Nail", "Trauma::Tibia"],
      penaltyTags: ["Plateau", "Pilon", "ACL"],
    },
  },
  {
    matchers: ["ankle fracture", "bimalleolar", "trimalleolar", "weber"],
    diagnosis: "Ankle fracture",
    procedure: "Ankle fixation",
    bodyRegion: "Ankle",
    subspecialty: "Foot & Ankle",
    keywords: [
      "ankle fracture",
      "syndesmosis",
      "deltoid ligament",
      "Weber",
      "Lauge Hansen",
      "medial malleolus",
      "posterior malleolus",
      "fibula",
      "talar shift",
    ],
    topics: [
      { category: "classification", topic: "Weber and Lauge-Hansen classification", priority: 1 },
      { category: "strategy", topic: "Syndesmosis and posterior malleolus strategy", priority: 1 },
    ],
    searchProfile: {
      anchors: [
        "ankle fracture",
        "bimalleolar",
        "trimalleolar",
        "posterior malleolus",
        "syndesmosis",
      ],
      highYield: ["weber", "lauge hansen", "deltoid ligament", "talar shift", "medial malleolus"],
      supporting: ["fibula", "posterior malleolus fixation", "stress view", "syndesmotic screw"],
      broad: ["ankle", "fracture", "orif", "fixation"],
      excludeUnlessAnchored: ["achilles", "total ankle", "calcaneus", "peroneal tendon"],
      preferredTags: ["AnkleFracture", "Trauma::Ankle", "FootAnkle::Trauma"],
      penaltyTags: ["Achilles", "Arthroplasty", "Calcaneus"],
    },
  },
  {
    matchers: ["pilon", "plafond", "tibial plafond"],
    diagnosis: "Pilon fracture",
    procedure: "Pilon fixation",
    bodyRegion: "Ankle",
    subspecialty: "Trauma",
    keywords: [
      "pilon",
      "tibial plafond",
      "staged fixation",
      "external fixator",
      "anterolateral approach",
      "soft tissue envelope",
      "articular impaction",
    ],
    topics: [
      { category: "staging", topic: "Staged fixation and soft tissue timing", priority: 1 },
      { category: "approach", topic: "Plafond exposure and articular reduction", priority: 1 },
    ],
    searchProfile: {
      anchors: ["pilon", "plafond", "tibial plafond", "pilon fracture"],
      highYield: ["soft tissue envelope", "staged fixation", "articular impaction", "external fixator"],
      supporting: ["anterolateral approach", "ct planning", "metaphyseal comminution"],
      broad: ["ankle", "fracture", "orif", "fixation"],
      excludeUnlessAnchored: ["bimalleolar", "achilles", "calcaneus", "ankle arthroplasty"],
      preferredTags: ["Pilon", "Plafond", "Trauma::Ankle"],
      penaltyTags: ["Achilles", "Calcaneus", "Arthroplasty"],
    },
  },
  {
    matchers: ["acetabulum", "acetabular", "posterior wall", "anterior column"],
    diagnosis: "Acetabular fracture",
    procedure: "Acetabular fixation",
    bodyRegion: "Pelvis",
    subspecialty: "Trauma",
    keywords: [
      "acetabulum",
      "Letournel",
      "Kocher-Langenbeck",
      "ilioinguinal",
      "sciatic nerve",
      "corona mortis",
      "posterior wall",
      "anterior column",
    ],
    topics: [
      { category: "classification", topic: "Letournel fracture patterns", priority: 1 },
      { category: "approach", topic: "Kocher-Langenbeck versus ilioinguinal", priority: 1 },
    ],
    searchProfile: {
      anchors: ["acetabulum", "acetabular", "posterior wall", "anterior column"],
      highYield: ["letournel", "kocher langenbeck", "ilioinguinal", "corona mortis"],
      supporting: ["sciatic nerve", "quadrilateral surface", "column fixation"],
      broad: ["pelvis", "hip", "fracture", "fixation"],
      excludeUnlessAnchored: ["tha", "femoral neck", "hemiarthroplasty", "pelvic ring"],
      preferredTags: ["Acetabulum", "Acetabular", "Trauma::Pelvis"],
      penaltyTags: ["THA", "FemoralNeck", "PelvicRing"],
    },
  },
  {
    matchers: ["femoral neck", "hemiarthroplasty", "hemi"],
    diagnosis: "Femoral neck fracture",
    procedure: "Hip hemiarthroplasty",
    bodyRegion: "Hip",
    subspecialty: "Trauma",
    keywords: [
      "femoral neck fracture",
      "hemiarthroplasty",
      "posterior approach",
      "anterolateral approach",
      "dislocation",
      "cemented stem",
      "calcar",
      "leg length",
    ],
    topics: [
      { category: "approach", topic: "Posterior versus anterolateral hemiarthroplasty approach", priority: 1 },
      { category: "implants", topic: "Stem fixation and leg length restoration", priority: 2 },
    ],
    searchProfile: {
      anchors: ["femoral neck", "femoral neck fracture", "hemiarthroplasty", "hip hemiarthroplasty"],
      highYield: ["cemented stem", "calcar", "leg length", "posterior approach", "anterolateral approach"],
      supporting: ["dislocation", "broach", "offset", "canal fill"],
      broad: ["hip", "fracture", "arthroplasty", "hemi"],
      excludeUnlessAnchored: ["tha", "intertrochanteric", "acetabulum", "femoral shaft"],
      preferredTags: ["FemoralNeck", "Hemiarthroplasty", "Hip::Trauma"],
      penaltyTags: ["THA", "Intertroch", "Acetabulum"],
    },
  },
  {
    matchers: ["rotator cuff", "supraspinatus", "subscapularis"],
    diagnosis: "Rotator cuff tear",
    procedure: "Rotator cuff repair",
    bodyRegion: "Shoulder",
    subspecialty: "Sports",
    keywords: [
      "rotator cuff",
      "supraspinatus",
      "subscapularis",
      "anchor",
      "footprint",
      "biceps tenodesis",
      "acromion",
    ],
    topics: [
      { category: "anatomy", topic: "Cuff anatomy and footprint restoration", priority: 1 },
      { category: "technique", topic: "Anchor strategy and biceps management", priority: 2 },
    ],
    searchProfile: {
      anchors: ["rotator cuff", "supraspinatus", "subscapularis", "rotator cuff repair"],
      highYield: ["footprint", "double row", "suture bridge", "biceps tenodesis", "subscap repair"],
      supporting: ["anchor", "acromion", "greater tuberosity", "posterosuperior cuff"],
      broad: ["shoulder", "repair", "sports"],
      excludeUnlessAnchored: ["labrum", "bankart", "instability", "ac separation"],
      preferredTags: ["RotatorCuff", "Shoulder::Sports", "OB::Shoulder"],
      penaltyTags: ["Bankart", "Labrum", "Instability"],
    },
  },
  {
    matchers: [" acl ", "acl tear", "acl reconstruction", "anterior cruciate"],
    diagnosis: "ACL tear",
    procedure: "ACL reconstruction",
    bodyRegion: "Knee",
    subspecialty: "Sports",
    keywords: [
      "ACL",
      "femoral tunnel",
      "tibial tunnel",
      "Lachman",
      "pivot shift",
      "graft choice",
      "notch",
      "cyclops lesion",
    ],
    topics: [
      { category: "exam", topic: "Lachman and pivot shift exam", priority: 1 },
      { category: "technique", topic: "Tunnel placement and graft choice", priority: 1 },
    ],
    searchProfile: {
      anchors: ["acl", "acl tear", "acl reconstruction", "anterior cruciate ligament"],
      highYield: ["femoral tunnel", "tibial tunnel", "lachman", "pivot shift", "graft choice"],
      supporting: ["notch", "cyclops lesion", "anterolateral ligament", "btb graft"],
      broad: ["knee", "sports", "reconstruction"],
      excludeUnlessAnchored: ["pcl", "meniscus tear", "tka", "patella instability"],
      preferredTags: ["ACL", "Knee::Sports", "Sports::Knee"],
      penaltyTags: ["PCL", "Arthroplasty", "Patella"],
    },
  },
  {
    matchers: ["tka", "total knee arthroplasty", "knee replacement"],
    diagnosis: "Knee arthritis",
    procedure: "Total knee arthroplasty",
    bodyRegion: "Knee",
    subspecialty: "Arthroplasty",
    keywords: [
      "total knee arthroplasty",
      "TKA",
      "mechanical axis",
      "femoral cuts",
      "tibial slope",
      "gap balancing",
      "patellar tracking",
    ],
    topics: [
      { category: "alignment", topic: "Mechanical axis and bone cuts", priority: 1 },
      { category: "balancing", topic: "Gap balancing and patellar tracking", priority: 1 },
    ],
    searchProfile: {
      anchors: ["tka", "total knee arthroplasty", "knee replacement"],
      highYield: ["mechanical axis", "gap balancing", "patellar tracking", "femoral cuts", "tibial slope"],
      supporting: ["extension gap", "flexion gap", "posterior stabilized", "alignment"],
      broad: ["knee", "arthroplasty", "replacement"],
      excludeUnlessAnchored: ["acl", "tibial plateau", "meniscus", "patella fracture"],
      preferredTags: ["TKA", "Arthroplasty::Knee", "TotalKnee"],
      penaltyTags: ["ACL", "TibialPlateau", "Meniscus"],
    },
  },
  {
    matchers: ["tha", "total hip arthroplasty", "hip replacement"],
    diagnosis: "Hip arthritis",
    procedure: "Total hip arthroplasty",
    bodyRegion: "Hip",
    subspecialty: "Arthroplasty",
    keywords: [
      "total hip arthroplasty",
      "THA",
      "acetabulum",
      "femoral stem",
      "dislocation",
      "leg length",
      "abductor",
      "offset",
    ],
    topics: [
      { category: "templating", topic: "Acetabular and femoral reconstruction goals", priority: 1 },
      { category: "complications", topic: "Dislocation, leg length, and offset", priority: 2 },
    ],
    searchProfile: {
      anchors: ["tha", "total hip arthroplasty", "hip replacement"],
      highYield: ["acetabular cup", "femoral stem", "offset", "leg length", "abductor"],
      supporting: ["dislocation", "templating", "anteversion", "broach"],
      broad: ["hip", "arthroplasty", "replacement"],
      excludeUnlessAnchored: ["femoral neck fracture", "hemiarthroplasty", "acetabulum fracture"],
      preferredTags: ["THA", "Arthroplasty::Hip", "TotalHip"],
      penaltyTags: ["Hemiarthroplasty", "FemoralNeck", "Acetabulum"],
    },
  },
];

export function buildBroBotAnkiPlan(rawCaseInput: string): BroBotDeckPlan {
  const normalizedInput = rawCaseInput.trim();
  const caseLines = splitRawCaseLines(normalizedInput);
  const parsedCases = caseLines.map((caseLine, index) => buildParsedCase(caseLine, index));
  const generatedKeywords = aggregatePlanKeywords(parsedCases);
  const generatedTopics = aggregatePlanTopics(parsedCases);
  const suggestedTags = aggregatePlanTags(parsedCases);
  const searchProfile = mergeSearchProfiles(
    parsedCases.map((parsedCase) => parsedCase.searchProfile)
  );

  const caseCountLabel = parsedCases.length === 1 ? "1 case" : `${parsedCases.length} cases`;
  const title =
    parsedCases.length > 0
      ? `BroBot Decks - ${parsedCases[0].rawText}${
          parsedCases.length > 1 ? ` + ${parsedCases.length - 1} more` : ""
        }`
      : "BroBot Decks Study Plan";

  const generatedSummary =
    parsedCases.length > 0
      ? `Focused Anki review for ${caseCountLabel}: ${parsedCases
          .map((parsedCase) => parsedCase.rawText)
          .join("; ")}. Prioritize anatomy, approach, classification, fixation strategy, complications, and postoperative management.`
      : "Focused Anki review for orthopaedic case preparation.";

  return {
    title,
    rawCaseInput: normalizedInput,
    generatedSummary,
    parsedCases,
    generatedKeywords,
    generatedTopics,
    suggestedTags,
    searchProfile,
  };
}

export function splitRawCaseLines(rawCaseInput: string): string[] {
  return rawCaseInput
    .split(/\r?\n/)
    .map((line) => stripListPrefix(line.trim()))
    .filter((line) => line.length > 0);
}

export function aggregatePlanKeywords(
  parsedCases: ParsedCase[],
  manualKeywords: string[] = []
): string[] {
  return dedupeStrings([
    ...parsedCases.flatMap((parsedCase) => parsedCase.generatedKeywords),
    ...manualKeywords,
  ]);
}

export function aggregatePlanTopics(
  parsedCases: ParsedCase[],
  manualTopics: GeneratedTopic[] = []
): GeneratedTopic[] {
  return dedupeTopics([
    ...parsedCases.flatMap((parsedCase) => parsedCase.generatedTopics),
    ...manualTopics,
  ]);
}

export function aggregatePlanTags(parsedCases: ParsedCase[]): string[] {
  return dedupeStrings(parsedCases.flatMap((parsedCase) => parsedCase.suggestedTags));
}

export function aggregateCaseField(
  parsedCases: ParsedCase[],
  key: "diagnosis" | "procedure" | "bodyRegion" | "subspecialty"
): string {
  return joinUnique(
    parsedCases.map((parsedCase) => parsedCase[key]),
    ""
  );
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function mergeSearchProfiles(profiles: SearchProfile[]): SearchProfile {
  return {
    anchors: dedupeStrings(profiles.flatMap((profile) => profile.anchors)),
    highYield: dedupeStrings(profiles.flatMap((profile) => profile.highYield)),
    supporting: dedupeStrings(profiles.flatMap((profile) => profile.supporting)),
    broad: dedupeStrings([
      ...profiles.flatMap((profile) => profile.broad),
      ...GENERIC_BROAD_TERMS,
    ]),
    excludeUnlessAnchored: dedupeStrings(
      profiles.flatMap((profile) => profile.excludeUnlessAnchored)
    ),
    preferredTags: dedupeStrings(
      profiles.flatMap((profile) => profile.preferredTags)
    ),
    penaltyTags: dedupeStrings(profiles.flatMap((profile) => profile.penaltyTags)),
  };
}

export function makeGenericSearchProfile(
  caseLine: string,
  inferredFields: InferredFields
): SearchProfile {
  const normalizedLine = normalizeText(caseLine);
  const tokens = normalizedLine.split(" ").filter(Boolean);
  const strongPhrases = extractStrongPhrases(caseLine);
  const diagnosisAnchors = extractStrongPhrases(inferredFields.diagnosis);
  const procedureAnchors = extractStrongPhrases(inferredFields.procedure);
  const anchors = dedupeStrings([
    ...strongPhrases,
    ...diagnosisAnchors,
    ...procedureAnchors,
  ]);

  const highYield = dedupeStrings([
    ...extractStrongPhrases(inferredFields.procedure),
    ...extractStrongPhrases(inferredFields.diagnosis),
  ]).filter((term) => !anchors.includes(term));

  const supporting = dedupeStrings([
    inferredFields.bodyRegion,
    inferredFields.subspecialty,
    ...tokens.filter(
      (token) => token.length > 3 && !GENERIC_IGNORE_TERMS.has(token)
    ),
  ]).filter((term) => !anchors.includes(term) && !highYield.includes(term));

  return {
    anchors,
    highYield,
    supporting,
    broad: dedupeStrings([
      inferredFields.bodyRegion,
      inferredFields.subspecialty,
      ...GENERIC_BROAD_TERMS,
    ]),
    excludeUnlessAnchored: [],
    preferredTags: dedupeStrings([
      slugifyTag(inferredFields.bodyRegion),
      slugifyTag(inferredFields.subspecialty),
      `${slugifyTag(inferredFields.subspecialty)}::${slugifyTag(
        inferredFields.bodyRegion
      )}`,
    ]),
    penaltyTags: [],
  };
}

export function slugifyTag(value: string): string {
  const collapsed = value
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, " ");

  return collapsed
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function buildParsedCase(rawText: string, index: number): ParsedCase {
  const matchedRules = getMatchedRules(rawText);
  const diagnosis = joinUnique(
    matchedRules.map((rule) => rule.diagnosis),
    inferFallbackDiagnosis(rawText)
  );
  const procedure = joinUnique(
    matchedRules.map((rule) => rule.procedure),
    inferFallbackProcedure(rawText)
  );
  const bodyRegion = joinUnique(
    matchedRules.map((rule) => rule.bodyRegion),
    inferFallbackBodyRegion(rawText)
  );
  const subspecialty = joinUnique(
    matchedRules.map((rule) => rule.subspecialty),
    inferFallbackSubspecialty(rawText)
  );
  const generatedKeywords = dedupeStrings([
    ...matchedRules.flatMap((rule) => rule.keywords),
    ...GENERIC_KEYWORDS,
  ]);
  const generatedTopics = dedupeTopics([
    ...DEFAULT_TOPICS,
    ...matchedRules.flatMap((rule) => rule.topics ?? []),
  ]);
  const slug = slugifyCaseName(rawText);
  const suggestedTags = dedupeStrings([
    "SnapOrtho::CasePrep",
    `SnapOrtho::CasePrep::${slug}`,
    `SnapOrtho::${subspecialty}`,
    `SnapOrtho::${bodyRegion}`,
  ]);
  const inferredFields = {
    diagnosis,
    procedure,
    bodyRegion,
    subspecialty,
  };
  const searchProfile =
    matchedRules.length > 0
      ? mergeSearchProfiles(matchedRules.map((rule) => rule.searchProfile))
      : makeGenericSearchProfile(rawText, inferredFields);

  return {
    id: `case-${index + 1}-${slug}`,
    rawText,
    diagnosis,
    procedure,
    bodyRegion,
    subspecialty,
    generatedKeywords,
    generatedTopics,
    suggestedTags,
    searchProfile,
  };
}

function getMatchedRules(rawText: string): KeywordRule[] {
  const normalized = ` ${normalizeText(rawText)} `;
  return KEYWORD_RULES.filter((rule) =>
    rule.matchers.some((matcher) => normalized.includes(` ${normalizeText(matcher)} `))
  );
}

function stripListPrefix(value: string): string {
  return value.replace(/^\s*(?:\d+[.)]|[-•])\s*/, "").trim();
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugifyCaseName(value: string): string {
  const slug = normalizeText(stripListPrefix(value)).replace(/\s+/g, "-");
  return slug.length > 0 ? slug : "untitled-case";
}

function dedupeTopics(values: GeneratedTopic[]): GeneratedTopic[] {
  const seen = new Set<string>();
  const result: GeneratedTopic[] = [];

  for (const value of values) {
    const key = `${value.category.toLowerCase()}::${value.topic.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result.sort((left, right) => left.priority - right.priority);
}

function joinUnique(values: string[], fallback: string): string {
  const uniqueValues = dedupeStrings(values);
  return uniqueValues.length > 0 ? uniqueValues.join("; ") : fallback;
}

function inferFallbackDiagnosis(rawText: string): string {
  const normalized = normalizeText(rawText);

  if (normalized.includes("fracture")) {
    return toTitleCase(rawText).replace(/\borif\b/gi, "").trim();
  }

  if (normalized.includes("tear")) {
    return toTitleCase(rawText).trim();
  }

  return "Orthopaedic condition";
}

function inferFallbackProcedure(rawText: string): string {
  const normalized = normalizeText(rawText);

  if (normalized.includes("orif")) {
    return "Open reduction internal fixation";
  }

  if (normalized.includes("im nail") || normalized.includes("intramedullary nail")) {
    return "Intramedullary nail fixation";
  }

  if (normalized.includes("arthroplasty")) {
    return toTitleCase(rawText).trim();
  }

  if (normalized.includes("repair")) {
    return toTitleCase(rawText).trim();
  }

  return "Orthopaedic operative review";
}

function inferFallbackBodyRegion(rawText: string): string {
  const normalized = normalizeText(rawText);

  const regionMatchers: Array<{ matcher: string; bodyRegion: string }> = [
    { matcher: "shoulder", bodyRegion: "Shoulder" },
    { matcher: "hip", bodyRegion: "Hip" },
    { matcher: "pelvis", bodyRegion: "Pelvis" },
    { matcher: "acetabul", bodyRegion: "Pelvis" },
    { matcher: "knee", bodyRegion: "Knee" },
    { matcher: "tibia", bodyRegion: "Tibia" },
    { matcher: "ankle", bodyRegion: "Ankle" },
    { matcher: "wrist", bodyRegion: "Wrist" },
    { matcher: "radius", bodyRegion: "Wrist" },
    { matcher: "femur", bodyRegion: "Hip" },
  ];

  for (const rule of regionMatchers) {
    if (normalized.includes(rule.matcher)) {
      return rule.bodyRegion;
    }
  }

  return "Unspecified region";
}

function inferFallbackSubspecialty(rawText: string): string {
  const normalized = normalizeText(rawText);

  if (
    normalized.includes("arthroplasty") ||
    normalized.includes("replacement") ||
    normalized.includes("arthritis")
  ) {
    return "Arthroplasty";
  }

  if (
    normalized.includes("acl") ||
    normalized.includes("rotator cuff") ||
    normalized.includes("labrum")
  ) {
    return "Sports";
  }

  if (
    normalized.includes("wrist") ||
    normalized.includes("radius") ||
    normalized.includes("hand")
  ) {
    return "Hand";
  }

  if (normalized.includes("ankle") || normalized.includes("foot")) {
    return "Foot & Ankle";
  }

  if (
    normalized.includes("fracture") ||
    normalized.includes("orif") ||
    normalized.includes("fixation")
  ) {
    return "Trauma";
  }

  return "Orthopaedics";
}

function extractStrongPhrases(value: string): string[] {
  const cleaned = stripListPrefix(value).trim();
  const normalized = normalizeText(cleaned);
  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const phrases: string[] = [];
  if (tokens.length >= 2) {
    phrases.push(tokens.join(" "));
    phrases.push(...buildNgrams(tokens, 2, 3));
  } else if (tokens[0] && !GENERIC_IGNORE_TERMS.has(tokens[0])) {
    phrases.push(tokens[0]);
  }

  return dedupeStrings(
    phrases.filter((phrase) => {
      const phraseTokens = phrase.split(" ");
      return phraseTokens.some(
        (token) => token.length > 2 && !GENERIC_IGNORE_TERMS.has(token)
      );
    })
  );
}

function buildNgrams(tokens: string[], minSize: number, maxSize: number): string[] {
  const results: string[] = [];

  for (let size = minSize; size <= maxSize; size += 1) {
    for (let index = 0; index + size <= tokens.length; index += 1) {
      const phrase = tokens.slice(index, index + size).join(" ");
      if (phrase.length > 0) {
        results.push(phrase);
      }
    }
  }

  return results;
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
