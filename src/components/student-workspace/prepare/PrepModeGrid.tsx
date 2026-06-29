"use client";

import { PREP_MODE_DEFINITIONS } from "@/components/student-workspace/prepare/prepare-content";
import { PrepModeCard } from "@/components/student-workspace/prepare/PrepModeCard";
import type { PrepareModeId } from "@/components/student-workspace/prepare/types";

export function PrepModeGrid({
  selectedMode,
  onSelectMode,
}: {
  selectedMode: PrepareModeId;
  onSelectMode: (modeId: PrepareModeId) => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {PREP_MODE_DEFINITIONS.map((mode) => (
        <PrepModeCard
          key={mode.id}
          mode={mode}
          selected={mode.id === selectedMode}
          onSelect={onSelectMode}
        />
      ))}
    </section>
  );
}
