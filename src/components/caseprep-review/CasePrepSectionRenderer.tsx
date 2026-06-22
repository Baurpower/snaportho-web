import type { ClinicalSection, ClinicalSectionItem } from "@/lib/caseprep-review/types";

interface CasePrepSectionRendererProps {
  section: ClinicalSection;
}

function BulletItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 py-1">
      <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-400" />
      <span className="text-gray-800 text-sm leading-relaxed">{text}</span>
    </li>
  );
}

function StructureAtRiskCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "structure_at_risk" }>;
}) {
  return (
    <div className="border border-red-100 rounded-xl p-5 bg-red-50 space-y-3">
      <div className="font-semibold text-red-900 text-base">{item.structure}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
            Why at Risk
          </div>
          <div className="text-gray-800">{item.why_at_risk}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
            How to Avoid
          </div>
          <div className="text-gray-800">{item.how_to_avoid_injury}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            If Injured
          </div>
          <div className="text-gray-800">{item.consequence_of_injury}</div>
        </div>
      </div>
      {item.approach_context && (
        <div className="text-xs text-gray-500 italic">{item.approach_context}</div>
      )}
    </div>
  );
}

function SurgicalLayerCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "surgical_layer" }>;
}) {
  return (
    <div className="border border-blue-100 rounded-xl p-5 bg-blue-50 space-y-3">
      <div className="font-semibold text-blue-900 text-base">{item.layer_name}</div>
      <p className="text-sm text-gray-800 leading-relaxed">{item.what_user_should_know}</p>
      {item.key_structures.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            Key Structures
          </div>
          <div className="flex flex-wrap gap-1">
            {item.key_structures.map((s, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {item.structures_at_risk.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
            Structures at Risk
          </div>
          <div className="flex flex-wrap gap-1">
            {item.structures_at_risk.map((s, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full border border-red-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {item.surgical_relevance && (
        <div className="text-xs text-gray-600 italic">{item.surgical_relevance}</div>
      )}
    </div>
  );
}

function PimpQuestionCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "pimp_question" }>;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-2">Q</span>
        <span className="font-medium text-gray-900 text-sm">{item.question}</span>
      </div>
      <div className="px-5 py-3 bg-white">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mr-2">A</span>
        <span className="text-sm text-gray-800 leading-relaxed">{item.answer}</span>
      </div>
    </div>
  );
}

function SourceCard({
  item,
}: {
  item: Extract<ClinicalSectionItem, { kind: "source" }>;
}) {
  return (
    <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
      <div className="shrink-0">
        <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-medium uppercase">
          {item.source_type}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {item.title && (
          <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 hover:underline truncate block"
        >
          {item.url}
        </a>
      </div>
      {item.consumed && (
        <span className="shrink-0 text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
          Used
        </span>
      )}
    </div>
  );
}

function renderItem(item: ClinicalSectionItem, index: number) {
  switch (item.kind) {
    case "bullet":
      return <BulletItem key={index} text={item.text} />;
    case "text":
      return (
        <p key={index} className="text-sm text-gray-800 leading-relaxed">
          {item.text}
        </p>
      );
    case "structure_at_risk":
      return <StructureAtRiskCard key={index} item={item} />;
    case "surgical_layer":
      return <SurgicalLayerCard key={index} item={item} />;
    case "pimp_question":
      return <PimpQuestionCard key={index} item={item} />;
    case "source":
      return <SourceCard key={index} item={item} />;
    default:
      return null;
  }
}

export function CasePrepSectionRenderer({ section }: CasePrepSectionRendererProps) {
  if (section.is_empty || section.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
        <div className="text-gray-400 text-sm">Not drafted yet</div>
        {section.is_required && (
          <div className="mt-1 text-xs text-red-500">Required section</div>
        )}
      </div>
    );
  }

  const hasBullets = section.items.every(
    (item) => item.kind === "bullet" || item.kind === "text"
  );

  const content = hasBullets ? (
    <ul className="space-y-1 pl-1">
      {section.items.map((item, i) => renderItem(item, i))}
    </ul>
  ) : (
    <div className="space-y-4">
      {section.items.map((item, i) => renderItem(item, i))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">
            {section.items.length} item{section.items.length !== 1 ? "s" : ""}
          </div>
          {section.coverage_weight > 0 && (
            <div className="text-xs text-gray-400">
              Weight: {section.coverage_weight}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            title="Coming in Phase 2"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            Approve Section
          </button>
          <button
            disabled
            title="Coming in Phase 2"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
          >
            Request Changes
          </button>
        </div>
      </div>
      {content}
    </div>
  );
}
