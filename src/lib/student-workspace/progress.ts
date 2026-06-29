import {
  compareDateOnly,
  dateOnlyToDayNumber,
  getInclusiveDaySpan,
  todayDateKey,
} from "@/lib/student-workspace/date";
import type {
  FourthYearProgressState,
  StudentWorkspaceProfile,
  StudentWorkspaceRotation,
} from "@/lib/student-workspace/types";

export function sortRotations(rotations: StudentWorkspaceRotation[]) {
  return [...rotations].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    const byStartDate = compareDateOnly(left.start_date, right.start_date);
    if (byStartDate !== 0) {
      return byStartDate;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

export function getCurrentRotation(
  rotations: StudentWorkspaceRotation[],
  today = todayDateKey()
) {
  return sortRotations(rotations).find(
    (rotation) =>
      compareDateOnly(rotation.start_date, today) <= 0 &&
      compareDateOnly(rotation.end_date, today) >= 0
  ) ?? null;
}

export function getNextRotation(
  rotations: StudentWorkspaceRotation[],
  today = todayDateKey()
) {
  return (
    sortRotations(rotations).find(
      (rotation) => compareDateOnly(rotation.start_date, today) > 0
    ) ?? null
  );
}

export function getRotationIndex(
  rotations: StudentWorkspaceRotation[],
  currentRotation: StudentWorkspaceRotation | null
) {
  if (!currentRotation) return null;

  const index = sortRotations(rotations).findIndex(
    (rotation) => rotation.id === currentRotation.id
  );

  return index >= 0 ? index : null;
}

export function getDaysRemaining(
  rotation: StudentWorkspaceRotation | null,
  today = todayDateKey()
) {
  if (!rotation) return null;
  if (compareDateOnly(rotation.end_date, today) < 0) return 0;

  return Math.max(0, getInclusiveDaySpan(today, rotation.end_date));
}

function getRotationDescriptor(rotation: StudentWorkspaceRotation) {
  return [
    rotation.title,
    rotation.service,
    rotation.location,
    rotation.institution,
    rotation.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isLikelyBreakRotation(rotation: StudentWorkspaceRotation) {
  const title = rotation.title.trim().toLowerCase();
  const descriptor = getRotationDescriptor(rotation);

  return (
    title === "off" ||
    /\b(off block|break|vacation|holiday|time off|days off)\b/.test(descriptor)
  );
}

function isLikelyOtherRotation(rotation: StudentWorkspaceRotation) {
  const title = rotation.title.trim().toLowerCase();
  const descriptor = getRotationDescriptor(rotation);

  return (
    title === "other" ||
    /\b(other block|other rotation|other)\b/.test(descriptor)
  );
}

function isCountedAsOrthoRotation(rotation: StudentWorkspaceRotation) {
  return !isLikelyBreakRotation(rotation) && !isLikelyOtherRotation(rotation);
}

function getDaysUntilRotation(
  rotation: StudentWorkspaceRotation | null,
  today: string
) {
  if (!rotation) return null;
  if (compareDateOnly(rotation.start_date, today) <= 0) return 0;
  return compareDateOnly(rotation.start_date, today);
}

function getNextBreakRotation(
  rotations: StudentWorkspaceRotation[],
  today: string
) {
  return (
    rotations.find(
      (rotation) =>
        isLikelyBreakRotation(rotation) &&
        compareDateOnly(rotation.end_date, today) >= 0
    ) ?? null
  );
}

function getRemainingOrthoDays(
  rotations: StudentWorkspaceRotation[],
  today: string
) {
  const remainingDayNumbers = new Set<number>();

  for (const rotation of rotations) {
    if (!isCountedAsOrthoRotation(rotation)) continue;
    if (compareDateOnly(rotation.end_date, today) < 0) continue;

    const effectiveStart =
      compareDateOnly(rotation.start_date, today) < 0 ? today : rotation.start_date;
    const startDay = dateOnlyToDayNumber(effectiveStart);
    const endDay = dateOnlyToDayNumber(rotation.end_date);

    for (let day = startDay; day <= endDay; day += 1) {
      remainingDayNumbers.add(day);
    }
  }

  return remainingDayNumbers.size;
}

export function getFourthYearProgress(
  rotations: StudentWorkspaceRotation[],
  profile: StudentWorkspaceProfile,
  today = todayDateKey()
): FourthYearProgressState {
  const sortedRotations = sortRotations(rotations);
  const nextRotationFromAll = getNextRotation(sortedRotations, today);
  const nextBreakFromAll = getNextBreakRotation(sortedRotations, today);
  const orthoDaysRemainingFromAll = getRemainingOrthoDays(sortedRotations, today);

  if (!profile.fourth_year_start_date || !profile.fourth_year_end_date) {
    return {
      configured: false,
      status: "not_configured",
      percentComplete: 0,
      totalDays: null,
      elapsedDays: null,
      remainingDays: null,
      orthoDaysRemaining: orthoDaysRemainingFromAll,
      daysUntilNextRotation: getDaysUntilRotation(nextRotationFromAll, today),
      daysUntilNextBreak: getDaysUntilRotation(nextBreakFromAll, today),
      currentRotation: null,
      nextRotation: nextRotationFromAll,
      nextBreakRotation: nextBreakFromAll,
      currentRotationIndex: null,
      rotationCount: sortedRotations.length,
      hasOverlapConflict: false,
    };
  }

  const fourthYearRotations = sortedRotations.filter(
    (rotation) =>
      compareDateOnly(rotation.end_date, profile.fourth_year_start_date!) >= 0 &&
      compareDateOnly(rotation.start_date, profile.fourth_year_end_date!) <= 0
  );
  const rotationCount = fourthYearRotations.length;
  const totalDays = getInclusiveDaySpan(
    profile.fourth_year_start_date,
    profile.fourth_year_end_date
  );
  const activeRotations = fourthYearRotations.filter(
    (rotation) =>
      compareDateOnly(rotation.start_date, today) <= 0 &&
      compareDateOnly(rotation.end_date, today) >= 0
  );
  const currentRotation = activeRotations[0] ?? null;
  const currentRotationIndex = getRotationIndex(fourthYearRotations, currentRotation);
  const nextRotation = getNextRotation(fourthYearRotations, today);
  const nextBreakRotation = getNextBreakRotation(fourthYearRotations, today);
  const hasOverlapConflict = activeRotations.length > 1;
  const orthoDaysRemaining = getRemainingOrthoDays(fourthYearRotations, today);

  if (compareDateOnly(today, profile.fourth_year_start_date) < 0) {
    return {
      configured: true,
      status: "not_started",
      percentComplete: 0,
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      orthoDaysRemaining,
      daysUntilNextRotation: getDaysUntilRotation(nextRotation, today),
      daysUntilNextBreak: getDaysUntilRotation(nextBreakRotation, today),
      currentRotation: null,
      nextRotation,
      nextBreakRotation,
      currentRotationIndex: null,
      rotationCount,
      hasOverlapConflict: false,
    };
  }

  if (compareDateOnly(today, profile.fourth_year_end_date) > 0) {
    return {
      configured: true,
      status: "completed",
      percentComplete: 100,
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      orthoDaysRemaining: 0,
      daysUntilNextRotation: null,
      daysUntilNextBreak: null,
      currentRotation: null,
      nextRotation: null,
      nextBreakRotation: null,
      currentRotationIndex: null,
      rotationCount,
      hasOverlapConflict: false,
    };
  }

  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, getInclusiveDaySpan(profile.fourth_year_start_date, today))
  );
  const remainingDays = Math.max(
    0,
    getInclusiveDaySpan(today, profile.fourth_year_end_date)
  );

  return {
    configured: true,
    status: "in_progress",
    percentComplete: Math.max(
      0,
      Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    ),
    totalDays,
    elapsedDays,
    remainingDays,
    orthoDaysRemaining,
    daysUntilNextRotation: getDaysUntilRotation(nextRotation, today),
    daysUntilNextBreak: getDaysUntilRotation(nextBreakRotation, today),
    currentRotation,
    nextRotation,
    nextBreakRotation,
    currentRotationIndex,
    rotationCount,
    hasOverlapConflict,
  };
}
