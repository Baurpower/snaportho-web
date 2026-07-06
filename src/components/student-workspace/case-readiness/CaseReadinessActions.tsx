"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Sparkles } from "lucide-react";
import { savePendingBroBotRequest } from "@/lib/brobot/pending-request";
import type { CaseReadinessBrobotAction } from "@/lib/student-curriculum";

export function CaseReadinessActions({
  actions,
  onLaunch,
}: {
  actions: CaseReadinessBrobotAction[];
  onLaunch?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={`${action.actionKind}-${action.label}`}
          type="button"
          onClick={() => {
            onLaunch?.();
            savePendingBroBotRequest({
              prompt: action.prompt,
              mode: action.brobotMode,
              responseDepth: action.responseDepth,
              trainingLevel: "med_student",
              sourceRoute: pathname || "/student-workspace/prepare",
            });
            router.push("/brobot/chat");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-950"
        >
          {action.actionKind === "ask" ? (
            <MessageSquare className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}
