"use client";

import {
  Clock3,
  GraduationCap,
  Hospital,
  UserRound,
} from "lucide-react";
import type {
  MonthMeta,
  OverviewMember,
  RotationBlock,
} from "@/app/work/settings/settingsclient";

type VisibleSegment = {
  id: string;
  startIndex: number;
  endIndex: number;
  block: RotationBlock;
};

const MONTHS_PER_PAGE = 6;
const ROW_HEIGHT_PX = 168;
const CARD_INSET_PX = 12;
const CARD_HEIGHT_PX = ROW_HEIGHT_PX - CARD_INSET_PX * 2;

function formatDateLabel(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && endA >= startB;
}

function bgForRotation(color?: string | null) {
  if (!color) return "bg-white/[0.04] border-white/10 text-white";

  const normalized = color.toLowerCase();

  if (normalized.includes("sky") || normalized.includes("blue")) {
    return "bg-sky-400/10 border-sky-300/20 text-sky-100";
  }
  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "bg-violet-400/10 border-violet-300/20 text-violet-100";
  }
  if (normalized.includes("emerald") || normalized.includes("green")) {
    return "bg-emerald-400/10 border-emerald-300/20 text-emerald-100";
  }
  if (normalized.includes("amber") || normalized.includes("yellow")) {
    return "bg-amber-400/10 border-amber-300/20 text-amber-100";
  }
  if (normalized.includes("rose") || normalized.includes("red")) {
    return "bg-rose-400/10 border-rose-300/20 text-rose-100";
  }

  return "bg-white/[0.04] border-white/10 text-white";
}

function roleTone(role: string | null) {
  if (role === "resident") {
    return "bg-sky-400/10 text-sky-200 ring-sky-300/15";
  }
  if (role === "faculty") {
    return "bg-violet-400/10 text-violet-200 ring-violet-300/15";
  }
  if (role === "coordinator") {
    return "bg-emerald-400/10 text-emerald-200 ring-emerald-300/15";
  }
  if (role === "admin") {
    return "bg-amber-400/10 text-amber-200 ring-amber-300/15";
  }
  return "bg-white/[0.06] text-slate-200 ring-white/10";
}

function formatRoleLabel(role: string | null) {
  return role ?? "member";
}

function getVisibleSegments(
  blocks: RotationBlock[],
  visibleMonths: MonthMeta[]
): VisibleSegment[] {
  return blocks
    .map((block) => {
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < visibleMonths.length; i += 1) {
        const month = visibleMonths[i];
        if (overlaps(block.startDate, block.endDate, month.start, month.end)) {
          if (startIndex === -1) startIndex = i;
          endIndex = i;
        }
      }

      if (startIndex === -1 || endIndex === -1) return null;

      return {
        id: block.id,
        startIndex,
        endIndex,
        block,
      };
    })
    .filter((segment): segment is VisibleSegment => !!segment)
    .sort((a, b) => {
      if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
      if (a.endIndex !== b.endIndex) return a.endIndex - b.endIndex;
      return a.block.startDate.localeCompare(b.block.startDate);
    });
}

function getEmptyMonthIndexes(
  segments: VisibleSegment[],
  monthCount: number
): number[] {
  const filled = new Set<number>();

  for (const segment of segments) {
    for (let i = segment.startIndex; i <= segment.endIndex; i += 1) {
      filled.add(i);
    }
  }

  const empty: number[] = [];
  for (let i = 0; i < monthCount; i += 1) {
    if (!filled.has(i)) empty.push(i);
  }
  return empty;
}

export default function ProgramRotations({
  members,
  months,
  assignments,
}: {
  members: OverviewMember[];
  months: MonthMeta[];
  assignments: RotationBlock[];
}) {
  const rotationMap = new Map<string, RotationBlock[]>();

  for (const rotation of assignments) {
    const existing = rotationMap.get(rotation.memberId) ?? [];
    existing.push(rotation);
    rotationMap.set(rotation.memberId, existing);
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
      <div className="overflow-x-auto">
        <div className="min-w-[1120px]">
          <div
            className={`grid border-b border-white/10 bg-white/[0.03]`}
            style={{
              gridTemplateColumns: `300px repeat(${MONTHS_PER_PAGE}, minmax(0, 1fr))`,
            }}
          >
            <div className="border-r border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              People
            </div>

            {months.map((month) => (
              <div
                key={month.key}
                className="border-r border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 last:border-r-0"
              >
                {month.label}
              </div>
            ))}
          </div>

          {members.map((member) => {
            const blocks = rotationMap.get(member.membershipId) ?? [];
            const segments = getVisibleSegments(blocks, months);
            const emptyIndexes = getEmptyMonthIndexes(segments, months.length);

            return (
              <div
                key={member.membershipId}
                className="grid border-b border-white/10 last:border-b-0"
                style={{
                  gridTemplateColumns: `300px repeat(${MONTHS_PER_PAGE}, minmax(0, 1fr))`,
                }}
              >
                <div
                  className="border-r border-white/10 px-5 py-4"
                  style={{ minHeight: `${ROW_HEIGHT_PX}px` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-300">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">
                          {member.displayName}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${roleTone(
                            member.role
                          )}`}
                        >
                          {formatRoleLabel(member.role)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                        {member.trainingLevel ? (
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            {member.trainingLevel}
                          </span>
                        ) : null}

                        {member.gradYear ? <span>Grad {member.gradYear}</span> : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="relative col-span-6"
                  style={{ height: `${ROW_HEIGHT_PX}px` }}
                >
                  <div className="absolute inset-0 grid grid-cols-6">
                    {months.map((month, idx) => (
                      <div
                        key={`${member.membershipId}-grid-${month.key}`}
                        className={[
                          "border-r border-white/10",
                          idx === months.length - 1 ? "border-r-0" : "",
                        ].join(" ")}
                      />
                    ))}
                  </div>

                  {emptyIndexes.map((index) => (
                    <div
                      key={`${member.membershipId}-empty-${index}`}
                      className="absolute"
                      style={{
                        top: `${CARD_INSET_PX}px`,
                        bottom: `${CARD_INSET_PX}px`,
                        left: `${(index / months.length) * 100}%`,
                        width: `${100 / months.length}%`,
                      }}
                    >
                      <div
                        className="mx-3 flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 text-center text-xs text-slate-500"
                        style={{ height: `${CARD_HEIGHT_PX}px` }}
                      >
                        No schedule data
                      </div>
                    </div>
                  ))}

                  {segments.map((segment) => (
                    <div
                      key={`${member.membershipId}-${segment.id}`}
                      className="absolute"
                      style={{
                        top: `${CARD_INSET_PX}px`,
                        bottom: `${CARD_INSET_PX}px`,
                        left: `${(segment.startIndex / months.length) * 100}%`,
                        width: `${
                          ((segment.endIndex - segment.startIndex + 1) / months.length) * 100
                        }%`,
                      }}
                    >
                      <div
                        className={`mx-3 rounded-2xl border px-3 py-3 ${bgForRotation(
                          segment.block.color
                        )}`}
                        style={{ height: `${CARD_HEIGHT_PX}px` }}
                      >
                        <div className="flex h-full flex-col overflow-hidden">
                          <p className="truncate text-sm font-bold">
                            {segment.block.shortName ?? segment.block.rotationName}
                          </p>

                          <div className="mt-2 flex-1 overflow-hidden">
                            {segment.block.siteLabel ? (
                              <div className="truncate text-[11px] opacity-80">
                                <span className="inline-flex items-center gap-1.5">
                                  <Hospital className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {segment.block.siteLabel}
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <div className="h-[16px]" />
                            )}

                            <div className="mt-2 truncate text-[11px] opacity-80">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {formatDateLabel(segment.block.startDate)} –{" "}
                                  {formatDateLabel(segment.block.endDate)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}