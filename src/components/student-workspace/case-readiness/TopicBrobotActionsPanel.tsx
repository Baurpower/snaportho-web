"use client";

import { CaseReadinessActions } from "@/components/student-workspace/case-readiness/CaseReadinessActions";
import type { CaseReadinessBrobotAction } from "@/lib/student-curriculum";

export function TopicBrobotActionsPanel({
  actions,
  onActionLaunch,
}: {
  actions: CaseReadinessBrobotAction[];
  onActionLaunch?: () => void;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        BroBot Surgical Mentor
      </p>
      <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">
        Contextual study actions
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Launch BroBot with procedure context already loaded for this topic.
      </p>
      <div className="mt-4">
        <CaseReadinessActions actions={actions} onLaunch={onActionLaunch} />
      </div>
    </section>
  );
}