import { splitFields } from "@/lib/workspace/signout/fields";
import { shortDate } from "@/lib/workspace/signout/pod";
import type { SignoutCard } from "@/lib/workspace/signout/types";
import { formatDiagnosticsText } from "@/lib/workspace/signout/diagnostics";

function inlineText(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function sentence(value: string): string {
  const text = inlineText(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * Build a predictable, copy-ready attending update without sending clinical text to
 * a model. Stored wording is preserved; only whitespace and terminal punctuation are
 * normalized. Dates remain dates and are never interpreted as POD/pre-op state.
 */
export function buildCopyUpdate(card: SignoutCard, patientName?: string | null): string {
  const fields = splitFields(card.body);
  const name = patientName?.trim() || "[Name]";
  const parts: string[] = [];
  const lead = inlineText(fields.lead);

  parts.push(sentence(lead ? `${name}, ${lead}` : name));

  const add = (label: string, value: string) => {
    const text = inlineText(value);
    if (text) parts.push(sentence(`${label}: ${text}`));
  };

  const procedure = [card.surgery, card.surgeryDate ? `(${shortDate(card.surgeryDate)})` : ""]
    .filter(Boolean)
    .join(" ");
  add(card.managementMode === "nonop" ? "Treatment" : "Procedure", procedure);

  const nextProcedure = [
    card.nextSurgery,
    card.nextSurgeryDate ? `(${shortDate(card.nextSurgeryDate)})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  add("Next OR", nextProcedure);

  add("HPI/Exam", fields.values["HPI/Exam"] ?? "");
  add(
    "Labs/Imaging/PT",
    [formatDiagnosticsText(card.diagnostics), fields.values["Labs/Imaging/PT"] ?? ""]
      .filter(Boolean)
      .join("\n")
  );
  add("Plan", fields.values["Plan"] ?? "");
  add("Dispo", fields.values["Dispo"] ?? "");
  add("Dispo barriers", fields.values["Dispo barriers"] ?? "");
  add("To-do", fields.values["To-do"] ?? "");
  for (const extra of fields.extras) add(extra.title, extra.text);

  return parts.filter(Boolean).join(" ");
}
