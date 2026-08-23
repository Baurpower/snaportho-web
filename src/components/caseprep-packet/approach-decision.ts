export type ApproachRisk = {
  name: string;
  why?: string;
  protection?: string;
};

export type ApproachOption = {
  approach_id?: string;
  name?: string;
  role?: string;
  content_status?: string;
  review_status?: string;
  selection_indications?: string[];
  selection_limitations?: string[];
  positioning?: string[];
  exposure?: string[];
  layers?: string[];
  landmarks?: string[];
  pitfalls?: string[];
  source_urls?: string[];
  coverage_notes?: string;
  corridor?: string;
  aliases?: string[];
  structures_at_risk?: unknown[];
};

export type ApproachDecision = {
  status?: string;
  selected_approach_id?: string | null;
  selected_approach_ids?: string[];
  message?: string;
  approaches?: ApproachOption[];
  coverage?: {
    complete_count?: number;
    known_count?: number;
    gap_count?: number;
  };
  review?: {
    status?: string;
    label?: string;
  };
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function shortRiskName(text: string): string {
  const match = text.match(
    /^(?:the\s+)?(.+?)\s+(?:is|are|lies|runs|can be|may be|should be)\b/i,
  );
  if (match?.[1] && match[1].length <= 80) {
    return match[1].replace(/^the\s+/i, "").trim();
  }
  const clause = text.split(/[.,;:]/, 1)[0]?.trim() ?? text;
  return clause.length <= 80 ? clause : `${clause.slice(0, 77)}…`;
}

/** Library packets send risk strings; legacy cards send objects. */
export function normalizeApproachRisks(raw: unknown): ApproachRisk[] {
  if (!Array.isArray(raw)) return [];
  const risks: ApproachRisk[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const why = asText(item);
      if (!why) continue;
      risks.push({ name: shortRiskName(why), why });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = asText(rec.structure ?? rec.name);
    const why = asText(rec.why_at_risk ?? rec.why ?? rec.text);
    const protection = asText(
      rec.how_to_avoid_injury ?? rec.protection ?? rec.supporting_detail,
    );
    if (!name && !why) continue;
    risks.push({
      name: name || shortRiskName(why),
      why: why && why !== name ? why : undefined,
      protection: protection || undefined,
    });
  }
  return risks;
}

/** Drop the “Performed via …” lock-in that fights multi-approach choice. */
export function caseFrameFromOverview(overview: string): string {
  const text = asText(overview);
  if (!text) return "";
  const marker = " performed via ";
  const idx = text.toLowerCase().indexOf(marker);
  if (idx === -1) return text;
  return text.slice(0, idx).replace(/[.;:\s]+$/, "") || text;
}

export function sourceLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const tail = parsed.pathname
      .replace(/\/$/, "")
      .split("/")
      .filter(Boolean)
      .slice(-2)
      .join("/");
    return tail ? `${host}/${tail}` : host;
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

export function texts(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map(asText).filter(Boolean);
}
