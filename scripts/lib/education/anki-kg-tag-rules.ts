export type AnkiTagRole =
  | "topic"
  | "anatomy"
  | "procedure"
  | "condition"
  | "source_provenance"
  | "broad_bucket"
  | "deck_navigation"
  | "unknown";

const SOURCE_PREFIXES = [
  "snap ortho",
  "ortho aaos res study",
  "ortho hip and knee book",
  "ortho netters",
];

const SOURCE_EXACT = new Set([
  "pocket pimped",
  "netters concise orthopaedic anatomy",
  "orthobullets",
  "aaos res study",
  "hip and knee book",
]);

const BROAD_BUCKETS = new Set([
  "anatomy",
  "arm",
  "bones",
  "disorders",
  "elbow",
  "femur",
  "foot",
  "foot ankle",
  "forearm",
  "general anatomy",
  "general knowledge",
  "general trauma",
  "hand",
  "hip",
  "joints",
  "knee",
  "leg",
  "lower extremity",
  "lower extremity hip",
  "lower extremity knee",
  "msk science",
  "muscles",
  "nerves",
  "osteology",
  "pathology",
  "pelvis",
  "pediatric pediatrics",
  "physical exam",
  "radiology",
  "recon",
  "shoulder",
  "shoulder and elbow",
  "shoulder girdle",
  "spine",
  "sports",
  "the basics",
  "thigh hip",
  "trauma",
  "upper extremity",
  "xrays",
]);

const ANATOMY_HINTS = [
  "anatomy",
  "artery",
  "arteries",
  "bone",
  "bones",
  "forearm",
  "hand",
  "hip",
  "insertion",
  "joint",
  "joints",
  "muscle",
  "muscles",
  "nerve",
  "nerves",
  "origin",
  "osteology",
  "pelvis",
  "shoulder",
  "spine",
  "thigh",
];

const PROCEDURE_HINTS = [
  "arthroplasty",
  "arthroscopy",
  "fixation",
  "fusion",
  "nailing",
  "orif",
  "osteotomy",
  "reconstruction",
  "replacement",
  "revision",
];

const CONDITION_HINTS = [
  "fracture",
  "injury",
  "syndrome",
  "dysplasia",
  "arthritis",
  "instability",
  "infection",
  "deformity",
  "tumor",
  "tear",
  "necrosis",
  "dislocation",
];

const DECK_NAVIGATION_HINTS = ["chapter", "chapters", "section", "unit", "module"];

export function normalizeTagToken(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/::/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function classifyAnkiTagRole(rawTag: string): AnkiTagRole {
  const normalized = normalizeTagToken(rawTag);

  if (!normalized) {
    return "unknown";
  }

  if (SOURCE_EXACT.has(normalized) || SOURCE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return "source_provenance";
  }

  if (BROAD_BUCKETS.has(normalized)) {
    return "broad_bucket";
  }

  if (DECK_NAVIGATION_HINTS.some((hint) => normalized.includes(hint))) {
    return "deck_navigation";
  }

  if (PROCEDURE_HINTS.some((hint) => normalized.includes(hint))) {
    return "procedure";
  }

  if (CONDITION_HINTS.some((hint) => normalized.includes(hint))) {
    return "condition";
  }

  if (ANATOMY_HINTS.some((hint) => normalized.includes(hint))) {
    return "anatomy";
  }

  if (normalized.length > 2) {
    return "topic";
  }

  return "unknown";
}
