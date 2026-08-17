export type ScreenDecision = "auto_confirm" | "llm_review";
export type ScreenReason =
  | "no_prior"
  | "untagged_published"
  | "prior_not_in_text"
  | "codex_lexical_mismatch"
  | "dx_tx_teaching_unset"
  | "confirmed_codex_lexical";

export type ScreenPrior = {
  facet: string;
  termId: string;
  preferredLabel: string;
  decision: string;
};

export type ScreenLexicalHit = {
  facet: string;
  termId: string;
  preferredLabel: string;
  retrievalScore: number;
};

export type ScreenInput = {
  front: string;
  back: string;
  deckPath: string;
  governedTags: string[];
  priorAccepted: ScreenPrior[];
  lexicalTop: ScreenLexicalHit[];
};

export type ScreenResult = {
  decision: ScreenDecision;
  reasons: ScreenReason[];
};

const DX_TX_HINT =
  /\b(treatment|treat|manage|management|orif|reconstruct|arthroplast|nonoperative|operative|indication|rehab|repair|fusion|osteotom|approach)\b/i;

function haystack(input: ScreenInput) {
  return `${input.front}\n${input.back}\n${input.deckPath}`.toLowerCase();
}

function labelInText(label: string, text: string) {
  const needle = label.toLowerCase().trim();
  if (needle.length < 3) return text.includes(needle);
  if (text.includes(needle)) return true;
  const tokens = needle.split(/[^a-z0-9]+/).filter((token) => token.length > 3);
  if (!tokens.length) return false;
  return tokens.filter((token) => text.includes(token)).length / tokens.length >= 0.6;
}

export function screenOfficialNote(input: ScreenInput): ScreenResult {
  const reasons: ScreenReason[] = [];
  const text = haystack(input);
  const accepted = input.priorAccepted.filter((row) => row.decision === "accepted");
  const hasGoverned = input.governedTags.some((tag) =>
    tag.startsWith("SnapOrtho::Anatomy::")
    || tag.startsWith("SnapOrtho::Diagnosis::")
    || tag.startsWith("SnapOrtho::Treatment::")
    || tag.startsWith("SnapOrtho::Specialty::"),
  );

  if (!accepted.length) reasons.push("no_prior");
  if (!hasGoverned) reasons.push("untagged_published");

  for (const prior of accepted) {
    if (!labelInText(prior.preferredLabel, text)) reasons.push("prior_not_in_text");
  }

  const lexicalByFacet = new Map<string, ScreenLexicalHit[]>();
  for (const hit of input.lexicalTop) {
    const rows = lexicalByFacet.get(hit.facet) ?? [];
    rows.push(hit);
    lexicalByFacet.set(hit.facet, rows);
  }
  for (const prior of accepted) {
    const top = (lexicalByFacet.get(prior.facet) ?? []).slice(0, 8);
    if (!top.length) continue;
    if (top[0].retrievalScore >= 0.5 && top[0].termId !== prior.termId
      && !top.some((hit) => hit.termId === prior.termId)) {
      reasons.push("codex_lexical_mismatch");
    }
  }

  const looksClinical = DX_TX_HINT.test(input.front) || DX_TX_HINT.test(input.back.slice(0, 400));
  const hasDx = accepted.some((row) => row.facet === "diagnosis");
  const hasTx = accepted.some((row) => row.facet === "treatment");
  if (looksClinical && !hasDx && !hasTx) reasons.push("dx_tx_teaching_unset");

  const unique = [...new Set(reasons)];
  if (unique.some((reason) => reason !== "confirmed_codex_lexical")) {
    return { decision: "llm_review", reasons: unique };
  }
  return { decision: "auto_confirm", reasons: ["confirmed_codex_lexical"] };
}
