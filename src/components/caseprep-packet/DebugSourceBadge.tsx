import type { PacketSectionState } from "@/lib/caseprep-v1-1/stream-schema";

const SOURCE_STYLES: Record<string, string> = {
  certified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  curated_uncertified: "border-teal-200 bg-teal-50 text-teal-800",
  rag: "border-indigo-200 bg-indigo-50 text-indigo-800",
  generated: "border-amber-200 bg-amber-50 text-amber-800",
  mixed: "border-slate-200 bg-slate-50 text-slate-700",
  kg: "border-purple-200 bg-purple-50 text-purple-800",
};

/** Internal-only provenance chip; rendered when the ?debug=1 toggle is on. */
export function DebugSourceBadge({
  section,
  show,
}: {
  section: PacketSectionState;
  show: boolean;
}) {
  if (!show) return null;
  const generatedCount = section.generatedFieldPaths.length;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        SOURCE_STYLES[section.source] ?? SOURCE_STYLES.mixed
      }`}
      title={section.generatedFieldPaths.join(", ")}
    >
      {section.source}
      {generatedCount > 0 ? ` · ${generatedCount} gen` : ""}
    </span>
  );
}
