"use client";

type RotationSettingsTab = "tracks" | "assignments";

export default function RotationSettingsSegmentedControl({
  activeTab,
  onChange,
}: {
  activeTab: RotationSettingsTab;
  onChange: (tab: RotationSettingsTab) => void;
}) {
  const tabs: Array<{ id: RotationSettingsTab; label: string }> = [
    { id: "assignments", label: "Assignments" },
    { id: "tracks", label: "Tracks" },
  ];

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
