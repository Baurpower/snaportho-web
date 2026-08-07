import { sectionTitle } from "@/lib/workspace/signout/tokens";

/**
 * Structured clinical fields for the card editor, mirroring the real handoff layout
 * (HPI/Exam · Labs/Imaging/PT · Plan). Fields are stored inside the single encrypted
 * body as `## Title` sections, so there is no schema or crypto change — the editor just
 * presents labeled boxes instead of raw markdown, and display still renders the sections.
 */

export const SIGNOUT_FIELDS = [
  {
    title: "HPI/Exam",
    label: "HPI / Exam",
    placeholder: "One-liner history, interval events, exam findings…",
  },
  {
    title: "Labs/Imaging/PT",
    label: "Labs / Imaging / PT",
    placeholder: "Vitals, labs, cultures, imaging, PT status…",
  },
  {
    title: "Plan",
    label: "Plan / to-do",
    placeholder: "Plan and overnight to-dos — use [ ] for checkboxes, #tags to flag…",
  },
] as const;

const KNOWN = new Set<string>(SIGNOUT_FIELDS.map((f) => f.title));

export type SignoutFields = {
  lead: string;
  values: Record<string, string>; // keyed by section title
  extras: { title: string; text: string }[]; // preserved unknown sections
};

function trimEdges(text: string): string {
  return text.replace(/^\n+/, "").replace(/\n+$/, "");
}

/** Parse a body into the lead line, known field values, and preserved extras. */
export function splitFields(body: string): SignoutFields {
  const lead: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const raw of body.split("\n")) {
    const title = sectionTitle(raw);
    if (title !== null) {
      current = { title, lines: [] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : lead).push(raw);
  }

  const values: Record<string, string> = {};
  const extras: { title: string; text: string }[] = [];
  for (const section of sections) {
    const text = trimEdges(section.lines.join("\n"));
    if (KNOWN.has(section.title)) {
      values[section.title] = values[section.title]
        ? `${values[section.title]}\n${text}`
        : text;
    } else {
      extras.push({ title: section.title, text });
    }
  }

  return { lead: trimEdges(lead.join("\n")), values, extras };
}

/** Rebuild a body from fields. Empty fields are omitted; extras are preserved. */
export function serializeFields(fields: SignoutFields): string {
  const parts: string[] = [];
  const lead = fields.lead.trim();
  if (lead) parts.push(lead);
  for (const field of SIGNOUT_FIELDS) {
    const text = (fields.values[field.title] ?? "").trim();
    if (text) parts.push(`## ${field.title}\n${text}`);
  }
  for (const extra of fields.extras) {
    const text = extra.text.trim();
    if (text) parts.push(`## ${extra.title}\n${text}`);
  }
  return parts.join("\n");
}
