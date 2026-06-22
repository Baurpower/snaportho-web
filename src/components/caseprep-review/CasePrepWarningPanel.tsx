import type { ValidationWarning } from "@/lib/caseprep-review/types";

interface CasePrepWarningPanelProps {
  warnings: ValidationWarning[];
}

const SEVERITY_STYLES = {
  blocking: "bg-red-50 border-red-300 text-red-900",
  warning: "bg-yellow-50 border-yellow-300 text-yellow-900",
  info: "bg-blue-50 border-blue-300 text-blue-900",
} as const;

const SEVERITY_ICON = {
  blocking: "🚫",
  warning: "⚠️",
  info: "ℹ️",
} as const;

export function CasePrepWarningPanel({ warnings }: CasePrepWarningPanelProps) {
  if (!warnings || warnings.length === 0) return null;

  const blocking = warnings.filter((w) => w.severity === "blocking");
  const rest = warnings.filter((w) => w.severity !== "blocking");
  const sorted = [...blocking, ...rest];

  return (
    <div className="space-y-2 mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
        Validation Issues ({warnings.length})
      </h3>
      {sorted.map((w, i) => (
        <div
          key={i}
          className={`border rounded-lg p-4 ${SEVERITY_STYLES[w.severity]}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">{SEVERITY_ICON[w.severity]}</span>
            <div className="min-w-0">
              <p className="font-medium text-sm">{w.message}</p>
              {w.detail && <p className="mt-1 text-sm opacity-80">{w.detail}</p>}
              {w.section_key && (
                <p className="mt-1 text-xs opacity-60">Section: {w.section_key}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
