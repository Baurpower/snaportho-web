import { fieldsFromSnapshot, plainText } from "./orthobullets-enrichment-packet";

export type PageCardProvider = "orthobullets" | "rock";

export function canonicalLearningPageUrl(raw: string, provider: PageCardProvider): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (provider === "orthobullets") {
      if (!/(^|\.)orthobullets\.com$/i.test(url.hostname)) return null;
      url.hostname = "www.orthobullets.com";
      url.search = "";
    } else {
      if (!/(^|\.)rock\.aaos\.org$/i.test(url.hostname)) return null;
      const id = url.searchParams.get("id")?.trim();
      if (!id || !/^\d{1,20}$/.test(id)) return null;
      url.hostname = "rock.aaos.org";
      url.pathname = "/coursecontent.aspx";
      url.search = `?id=${id}`;
    }
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

function revealClozes(value: string) {
  return value.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, "$1");
}

function hideClozes(value: string) {
  return value.replace(/\{\{c\d+::([^{}]*?)(?:::[^{}]*?)?\}\}/gi, "[…]");
}

export function pageReviewCard(row: {
  note_guid: string;
  card_ordinal: number;
  field_snapshot: unknown;
  overlay_fields?: unknown;
}) {
  const fields = { ...fieldsFromSnapshot(row.field_snapshot), ...fieldsFromSnapshot(row.overlay_fields) };
  const text = fields.Text ?? fields.Front ?? "";
  const extra = plainText(fields.Extra ?? "").slice(0, 4000) || null;
  return {
    noteGuid: row.note_guid,
    cardOrdinal: row.card_ordinal,
    prompt: plainText(hideClozes(text)).slice(0, 4000),
    answer: plainText(revealClozes(text)).slice(0, 6000),
    extra,
  };
}

