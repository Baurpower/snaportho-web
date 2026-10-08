/**
 * Versioned standard orthopaedic abbreviation expansions for retrieval query
 * understanding.
 *
 * This is ONE input to deterministic query-variant generation, not the
 * retrieval solution itself: candidates are also generated through token,
 * trigram, full-text, card-text, and graph channels that do not depend on
 * this map. Entries must be standard, unambiguous-in-ortho-context
 * abbreviations; ambiguous forms (IP, PIN, AIN) stay in the hand lexicon with
 * its ambiguity handling.
 */
export const ORTHO_ABBREVIATION_MAP_VERSION = "brobot-ortho-abbrev.v1" as const;

/** Uppercase abbreviation -> expansions (first is canonical). */
export const ORTHO_ABBREVIATIONS: Readonly<Record<string, readonly string[]>> = {
  ACL: ["anterior cruciate ligament"],
  PCL: ["posterior cruciate ligament"],
  MCL: ["medial collateral ligament"],
  LCL: ["lateral collateral ligament"],
  PLC: ["posterolateral corner"],
  MPFL: ["medial patellofemoral ligament"],
  ORIF: ["open reduction internal fixation"],
  CRPP: ["closed reduction percutaneous pinning"],
  CTR: ["carpal tunnel release"],
  CTS: ["carpal tunnel syndrome"],
  SCFE: ["slipped capital femoral epiphysis"],
  DRUJ: ["distal radioulnar joint"],
  THA: ["total hip arthroplasty"],
  TKA: ["total knee arthroplasty"],
  TSA: ["total shoulder arthroplasty"],
  RSA: ["reverse shoulder arthroplasty", "reverse total shoulder arthroplasty"],
  HEMI: ["hemiarthroplasty"],
  AVN: ["avascular necrosis"],
  ON: ["osteonecrosis"],
  PJI: ["periprosthetic joint infection"],
  SSI: ["surgical site infection"],
  DVT: ["deep vein thrombosis"],
  OCD: ["osteochondritis dissecans"],
  OCA: ["osteochondral allograft"],
  ACI: ["autologous chondrocyte implantation"],
  HTO: ["high tibial osteotomy"],
  TTO: ["tibial tubercle osteotomy"],
  DDH: ["developmental dysplasia of the hip", "hip dysplasia"],
  SH: ["Salter-Harris"],
  NWB: ["non weight bearing"],
  WBAT: ["weight bearing as tolerated"],
  PWB: ["partial weight bearing"],
  ROM: ["range of motion"],
  DASH: ["disabilities of the arm shoulder and hand"],
  PROMIS: ["patient reported outcomes"],
  VAS: ["visual analog scale"],
  BMI: ["body mass index"],
  DM: ["diabetes mellitus"],
  CKD: ["chronic kidney disease"],
  ESR: ["erythrocyte sedimentation rate"],
  CRP: ["c reactive protein"],
  WBC: ["white blood cell count"],
  MRI: ["magnetic resonance imaging"],
  CT: ["computed tomography"],
  XR: ["radiograph", "x-ray"],
  US: ["ultrasound"],
  EMG: ["electromyography"],
  NCS: ["nerve conduction study"],
  IV: ["intravenous"],
  PO: ["oral"],
  IM: ["intramedullary"],
  TCL: ["transverse carpal ligament"],
  AITFL: ["anterior inferior tibiofibular ligament"],
  PITFL: ["posterior inferior tibiofibular ligament"],
  IOL: ["interosseous ligament"],
  TTFL: ["transverse tibiofibular ligament"],
  ATFL: ["anterior talofibular ligament"],
  CFL: ["calcaneofibular ligament"],
  PTFL: ["posterior talofibular ligament"],
  FCR: ["flexor carpi radialis"],
  FCU: ["flexor carpi ulnaris"],
  ECRL: ["extensor carpi radialis longus"],
  ECRB: ["extensor carpi radialis brevis"],
  APL: ["abductor pollicis longus"],
  EPB: ["extensor pollicis brevis"],
  EPL: ["extensor pollicis longus"],
  FPL: ["flexor pollicis longus"],
  FDP: ["flexor digitorum profundus"],
  FDS: ["flexor digitorum superficialis"],
  EIP: ["extensor indicis proprius"],
  EDC: ["extensor digitorum communis"],
  APB: ["abductor pollicis brevis"],
  MCP: ["metacarpophalangeal"],
  PIP: ["proximal interphalangeal"],
  DIP: ["distal interphalangeal"],
  CMC: ["carpometacarpal"],
  MTP: ["metatarsophalangeal"],
  TMT: ["tarsometatarsal"],
  ST: ["subtalar"],
  TN: ["talonavicular"],
  CC: ["calcaneocuboid"],
  SNAC: ["scaphoid nonunion advanced collapse"],
  SLAC: ["scapholunate advanced collapse"],
  DISI: ["dorsal intercalated segment instability"],
  VISI: ["volar intercalated segment instability"],
  ESIN: ["elastic stable intramedullary nailing"],
  TENS: ["titanium elastic nailing"],
  GSW: ["gunshot wound"],
  MVC: ["motor vehicle collision"],
  MCC: ["motorcycle collision"],
  FOOSH: ["fall on outstretched hand"],
  ATLS: ["advanced trauma life support"],
  GCS: ["Glasgow coma scale"],
  ISS: ["injury severity score"],
  MESS: ["mangled extremity severity score"],
  ABI: ["ankle brachial index"],
  "C-SPINE": ["cervical spine"],
};

function canonicalKey(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Expand a single abbreviation token; returns [] when unknown. */
export function expandAbbreviation(token: string): readonly string[] {
  const hit = ORTHO_ABBREVIATIONS[canonicalKey(token)];
  return hit && hit.length > 0 ? hit : [];
}

/**
 * Scan free text for known abbreviations (word-boundary). Two-letter forms
 * (ON, US, IM, PO, ST, CC, IV, SH, ...) match uppercase only: lowercase
 * collisions with English words (on, us, im, st, cc) are near-certain.
 * Longer forms match case-insensitively. Returns abbreviation -> expansion
 * pairs in first-seen order.
 */
export function findAbbreviations(text: string): Array<{ abbreviation: string; expansion: string }> {
  const found: Array<{ abbreviation: string; expansion: string }> = [];
  const seen = new Set<string>();
  for (const [abbrev, expansions] of Object.entries(ORTHO_ABBREVIATIONS)) {
    if (abbrev.length < 2 || expansions.length === 0) continue;
    const pattern = abbrev.replace(/[-/]/g, "[-/ ]");
    const hit =
      abbrev.length <= 2
        ? new RegExp(`\\b${pattern}\\b`).test(text)
        : new RegExp(`\\b${pattern}\\b`, "i").test(text);
    if (!hit) continue;
    const key = abbrev.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ abbreviation: abbrev, expansion: expansions[0] });
  }
  const upper = text.toUpperCase();
  return found.sort((a, b) => upper.indexOf(a.abbreviation) - upper.indexOf(b.abbreviation));
}
