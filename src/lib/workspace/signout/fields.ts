import { sectionTitle } from "@/lib/workspace/signout/tokens";

/**
 * Structured clinical fields for the card editor, mirroring the real handoff layout
 * (HPI/Exam · Labs/Imaging/PT · Plan · Dispo · To-do). Fields are stored inside the single encrypted
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
    label: "Plan",
    placeholder: "Clinical plan — what we’re doing overnight / next steps…",
  },
  {
    title: "Dispo",
    label: "Disposition",
    placeholder: "Destination and current status — e.g. home pending PT clearance",
  },
  {
    title: "Dispo barriers",
    label: "Barriers to sign-off",
    placeholder: "What must improve or be completed before orthopaedics can sign off?",
  },
  {
    title: "To-do",
    label: "To-do",
    placeholder: "Overnight action items",
  },
] as const;

const KNOWN = new Set<string>(SIGNOUT_FIELDS.map((f) => f.title));

export type SignoutFields = {
  lead: string;
  values: Record<string, string>; // keyed by section title
  extras: { title: string; text: string }[]; // preserved unknown sections
};

export type TodoItem = {
  checked: boolean;
  text: string;
};

const TODO_LINE_RE = /^(\s*)\[([ xX])\]\s?(.*)$/;

/** Parse a To-do section body into checklist items. Non-checkbox lines become open items. */
export function parseTodoLines(text: string): TodoItem[] {
  if (!text.trim()) return [];
  const items: TodoItem[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const match = TODO_LINE_RE.exec(line);
    if (match) {
      items.push({
        checked: match[2] !== " ",
        text: match[3].trimEnd(),
      });
    } else {
      items.push({ checked: false, text: line.trim() });
    }
  }
  return items;
}

/** Serialize checklist items to `[ ]` / `[x]` lines for the To-do section. */
export function serializeTodoLines(items: TodoItem[]): string {
  return items
    .map((item) => {
      const text = item.text.trim();
      if (!text) return "";
      return `${item.checked ? "[x]" : "[ ]"} ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

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
