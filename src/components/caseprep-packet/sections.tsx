import type {
  EssentialsPayload,
  PacketItem,
  PacketSectionState,
} from "@/lib/caseprep-v1-1/stream-schema";
import { sourceLabel } from "./approach-decision";

/* Section body renderers. The SectionShell handles collapse/skeleton/error;
   these only render items. */

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm leading-6 text-slate-700">
      <span className="font-bold text-slate-950">{label}:</span> {value}
    </p>
  );
}

export function EssentialsSection({ payload }: { payload: EssentialsPayload }) {
  const sections = [
    {
      key: "indications",
      eyebrow: "Why we operate",
      title: "Indications",
      summary: payload.indications.summary,
      points: payload.indications.key_points,
      footer: payload.indications.case_specific_note,
    },
    {
      key: "critical",
      eyebrow: "Where the case is won or lost",
      title: payload.critical_portion.name,
      summary: payload.critical_portion.summary,
      points: payload.critical_portion.execution_points,
      footer: null,
    },
  ];
  const postop = payload.postop_protocol;
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <article
          key={section.key}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            {section.eyebrow}
          </p>
          <h3 className="mt-1 text-base font-black text-slate-950">
            {section.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {section.summary}
          </p>
          {section.key === "critical" ? (
            <p className="mt-2 text-sm leading-6 text-slate-700">
              <span className="font-bold text-slate-950">Why it matters:</span>{" "}
              {payload.critical_portion.why_it_matters}
            </p>
          ) : null}
          {section.points.length ? (
            <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-6 text-slate-700 marker:text-emerald-600">
              {section.points.map((point) => (
                <li key={point} className="list-disc">
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
          {section.key === "critical" ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
              <span className="font-bold">Failure mode:</span>{" "}
              {payload.critical_portion.failure_mode}
            </p>
          ) : section.footer ? (
            <p className="mt-3 text-sm italic leading-6 text-slate-600">
              {section.footer}
            </p>
          ) : null}
        </article>
      ))}
      <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
          After surgery
        </p>
        <h3 className="mt-1 text-base font-black text-slate-950">
          Post-op protocol
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {postop.summary}
        </p>
        {postop.immediate_priorities.length ? (
          <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-6 text-slate-700 marker:text-emerald-600">
            {postop.immediate_priorities.map((point) => (
              <li key={point} className="list-disc">
                {point}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 space-y-1">
          <DetailRow label="Immobilization" value={postop.immobilization} />
          <DetailRow label="Weight bearing" value={postop.weight_bearing} />
          <DetailRow label="Motion" value={postop.motion} />
          <DetailRow label="Follow-up" value={postop.follow_up} />
        </div>
        {postop.red_flags.length ? (
          <p className="mt-3 text-sm leading-6 text-slate-700">
            <span className="font-bold text-slate-950">Red flags:</span>{" "}
            {postop.red_flags.join("; ")}
          </p>
        ) : null}
        {postop.variability_note ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {postop.variability_note}
          </p>
        ) : null}
      </article>
    </div>
  );
}

export function KeyTakeaways({ items }: { items: PacketItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2.5 text-sm leading-6">
          <span aria-hidden className="mt-0.5 shrink-0 text-emerald-600">
            ✓
          </span>
          <span>
            <span className="font-bold text-slate-950">{item.question}: </span>
            <span className="text-slate-700">{item.answer}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TopThingsToKnow({ items }: { items: PacketItem[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-2.5 text-sm leading-6">
          <span className="shrink-0 font-black text-emerald-700">
            {index + 1}.
          </span>
          <span>
            <span className="font-bold text-slate-950">{item.question}</span>
            {item.answer ? (
              <span className="text-slate-700"> — {item.answer}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function groupByCategory(items: PacketItem[]): Array<[string, PacketItem[]]> {
  const groups = new Map<string, PacketItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()];
}

const ANATOMY_GROUP_LABELS: Record<string, string> = {
  must_know_anatomy: "Must-Know Anatomy",
  structure_at_risk: "Structures at Risk",
  danger_zone: "Danger Zones",
  surface_landmark: "Surface Landmarks",
  blood_supply: "Blood Supply",
  motor_innervation: "Motor Innervation",
  sensory_innervation: "Sensory Innervation",
};

export function AnatomySection({ items }: { items: PacketItem[] }) {
  return (
    <div className="space-y-4">
      {groupByCategory(items).map(([category, groupItems]) => (
        <div key={category}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {ANATOMY_GROUP_LABELS[category] ?? category.replace(/_/g, " ")}
          </p>
          <ul className="mt-2 space-y-2">
            {groupItems.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-slate-50 p-3 text-sm leading-6"
              >
                {category === "structure_at_risk" ? (
                  <>
                    <span className="font-bold text-slate-950">
                      {item.question}
                    </span>
                    <span className="text-slate-700"> — {item.answer}</span>
                    {item.supporting_detail ? (
                      <p className="mt-1 text-emerald-800">
                        <span className="font-semibold">Avoid it:</span>{" "}
                        {item.supporting_detail}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-800">{item.answer}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const FLOW_PHASE_ORDER = [
  "position",
  "equipment",
  "incision",
  "exposure",
  "critical_step",
  "checkpoint",
  "closure",
  "pearl",
];
const FLOW_PHASE_LABELS: Record<string, string> = {
  position: "Positioning",
  equipment: "Equipment",
  incision: "Incision",
  exposure: "Exposure",
  critical_step: "Critical Steps",
  checkpoint: "Fluoro / Checkpoints",
  closure: "Closure",
  pearl: "Pearls",
};

export function OperativeFlowSection({ items }: { items: PacketItem[] }) {
  const groups = groupByCategory(items).sort(
    ([a], [b]) => FLOW_PHASE_ORDER.indexOf(a) - FLOW_PHASE_ORDER.indexOf(b),
  );
  return (
    <div className="space-y-4">
      {groups.map(([phase, groupItems]) => (
        <div
          key={phase}
          className="relative border-l-2 border-emerald-100 pl-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {FLOW_PHASE_LABELS[phase] ?? phase.replace(/_/g, " ")}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {groupItems.map((item) => (
              <li key={item.id} className="text-sm leading-6 text-slate-800">
                {item.question && item.question !== FLOW_PHASE_LABELS[phase] ? (
                  <span className="font-semibold text-slate-950">
                    {item.question}:{" "}
                  </span>
                ) : null}
                {item.answer}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const DECISION_LABELS: Record<string, string> = {
  when_to_operate: "When do we operate?",
  who_should_not: "Who should NOT get surgery?",
  when_to_convert: "When do we convert?",
  when_to_stop: "When do we stop / bail out?",
  alternatives: "Alternatives",
  decision_point: "Key decisions",
};

export function DecisionPointsSection({ items }: { items: PacketItem[] }) {
  return (
    <dl className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl bg-slate-50 p-3">
          <dt className="text-sm font-bold text-slate-950">
            {DECISION_LABELS[item.category] ?? item.question}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-slate-700">
            {item.answer}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CalloutListSection({
  items,
  tone,
}: {
  items: PacketItem[];
  tone: "amber" | "slate";
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-xl border p-3 text-sm leading-6 ${toneClasses}`}
        >
          {item.answer}
        </li>
      ))}
    </ul>
  );
}

export function EvidenceSection({ items }: { items: PacketItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const isUrl = item.answer.startsWith("http");
        return (
          <li key={item.id} className="text-sm leading-6">
            {isUrl ? (
              <a
                className="text-teal-700 underline"
                href={item.answer}
                rel="noreferrer"
                target="_blank"
              >
                {item.answer.replace(/^https?:\/\/(www\.)?/, "").slice(0, 80)}
              </a>
            ) : (
              <>
                <span className="font-bold text-slate-950">
                  {item.question}
                </span>
                <span className="text-slate-700"> — {item.answer}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RelatedConceptsSection({ items }: { items: PacketItem[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          title={item.answer}
          className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-900"
        >
          {item.question}
        </span>
      ))}
    </div>
  );
}

export function SourcesSection({ section }: { section: PacketSectionState }) {
  const sources = (section.payload?.sources ?? []) as Array<{
    source_id: string;
    url: string;
    title: string;
    publisher?: string;
    resource_type?: string;
    recommended_for?: string;
    badges?: string[];
    journal?: string | null;
    year?: number | null;
  }>;
  const linked = sources.filter((source) => source.url?.startsWith("https://"));
  if (linked.length === 0)
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No strong case-specific resources were found yet.</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {linked.map((source) => (
        <li key={source.source_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap gap-1.5">
            {(source.badges ?? []).slice(0, 2).map((badge) => (
              <span key={badge} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">{badge}</span>
            ))}
          </div>
          <a
            className="mt-2 block text-sm font-bold text-slate-950 underline decoration-teal-200 underline-offset-2"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            {source.title}
          </a>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {[source.publisher, source.journal, source.year].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Best for: {source.recommended_for ?? "Diving deeper into this case"}</p>
        </li>
      ))}
    </ul>
  );
}

const APPROACH_LABELS: Record<string, string> = {
  corridor: "Corridor",
  position: "Positioning",
  equipment: "Setup",
  landmark: "Surface Landmarks",
  incision: "Incision",
  superficial_interval: "Superficial Interval",
  deep_interval: "Deep Interval",
  layer: "Layers",
  structure_encountered: "Structures Encountered",
  exposure: "Exposure",
  structure_at_risk: "Structures at Risk",
  danger_zone: "Danger Zones",
  retraction_hazard: "Retraction Hazards",
  complication: "Approach Complications",
  indication: "Indications",
  contraindication: "When to Consider Another Approach",
  limitation: "Limitations",
  extension: "Extensions",
  implant: "Implant Implications",
  fluoroscopy: "Fluoroscopy",
  closure: "Closure",
  bailout: "Bailouts",
};

export function ApproachPrepSection({ items }: { items: PacketItem[] }) {
  return (
    <div className="space-y-4">
      {groupByCategory(items).map(([category, rows]) => (
        <div key={category}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
            {APPROACH_LABELS[category] ?? category.replace(/_/g, " ")}
          </p>
          <ul className="mt-2 space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`rounded-xl border p-3 text-sm leading-6 ${
                  row.risk_level === "high" || row.risk_level === "critical"
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-slate-100 bg-slate-50 text-slate-800"
                }`}
              >
                {typeof row.approach_name === "string" ? (
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-teal-700">
                    {row.approach_name}
                  </span>
                ) : null}
                {row.answer}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ApproachSourcesSection({
  section,
}: {
  section: PacketSectionState;
}) {
  const payload = section.payload ?? {};
  const coverage = (payload.coverage ?? {}) as Record<string, unknown>;
  const sources = (payload.sources ?? []) as Array<{
    source_id?: string;
    title?: string;
    url?: string;
  }>;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {String(coverage.content_status ?? "coverage unknown").replaceAll(
            "_",
            " ",
          )}
        </span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
          {String(coverage.review_status ?? "not reviewed").replaceAll(
            "_",
            " ",
          )}
        </span>
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          {Number(coverage.claim_count ?? 0)} claims ·{" "}
          {Number(coverage.source_count ?? 0)} sources
        </span>
      </div>
      {sources.length > 0 ? (
        <ul className="space-y-1.5">
          {sources.map((source, index) => (
            <li key={source.source_id ?? source.url ?? index}>
              {source.url ? (
                <a
                  className="font-semibold text-teal-800 underline decoration-teal-200 underline-offset-2"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title || sourceLabel(source.url)}
                </a>
              ) : (
                source.title
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-600">
          This approach is indexed in the library, but detailed clinical content
          is not yet available.
        </p>
      )}
    </div>
  );
}
