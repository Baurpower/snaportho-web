import { getActiveMembershipForUser } from '@/lib/db/memberships'
import {
  getCurrentRotationForMember,
  getNextRotationForMember,
} from '@/lib/db/rotations'
import { getNextCallForMembership } from '@/lib/db/calls'

function getCurrentChiefGradYear(date = new Date()): number {
  const year = date.getFullYear()
  const julyFirst = new Date(year, 6, 1)
  return date >= julyFirst ? year + 1 : year
}

function getPgyFromGradYear(
  gradYear: number | null,
  date = new Date()
): number | null {
  if (!gradYear) return null

  const currentChiefGradYear = getCurrentChiefGradYear(date)
  const pgy = 5 - (gradYear - currentChiefGradYear)

  if (pgy < 1 || pgy > 5) return null
  return pgy
}

export type MySummaryResponse = {
  membership: {
    id: string
    programId: string | null
    rosterId: string | null
    role: string | null
    gradYear: number | null
    pgyYear: number | null
    trainingLevel: string | null
    displayName: string | null
    program: {
      id: string
      name: string | null
      slug: string | null
      institutionName: string | null
      timezone: string | null
    } | null
  } | null
  currentRotation: {
    id: string
    name: string | null
    shortName: string | null
    category: string | null
    color: string | null
    startDate: string | null
    endDate: string | null
    siteLabel: string | null
    teamLabel: string | null
    notes: string | null
  } | null
  nextRotation: {
    id: string
    name: string | null
    shortName: string | null
    category: string | null
    color: string | null
    startDate: string | null
    endDate: string | null
    siteLabel: string | null
    teamLabel: string | null
    notes: string | null
  } | null
  nextCall: {
    id: string
    callType: string | null
    callDate: string | null
    startDatetime: string | null
    endDatetime: string | null
    site: string | null
    isHomeCall: boolean | null
    notes: string | null
  } | null
}

export async function getMySummary(userId: string): Promise<MySummaryResponse> {
  const membership = await getActiveMembershipForUser(userId)

  if (!membership) {
    return {
      membership: null,
      currentRotation: null,
      nextRotation: null,
      nextCall: null,
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const nowIso = new Date().toISOString()

  const rotationIdentity = {
    membershipId: membership.id,
    rosterId: membership.roster_id ?? null,
  }

  const [currentRotation, nextRotation, nextCall] = await Promise.all([
    getCurrentRotationForMember(rotationIdentity, today),
    getNextRotationForMember(rotationIdentity, today),
    getNextCallForMembership(membership.id, nowIso),
  ])

  const program = Array.isArray(membership.programs)
  ? membership.programs[0] ?? null
  : membership.programs ?? null
  const gradYear = membership.grad_year ?? null
  const pgyYear = getPgyFromGradYear(gradYear)
  const trainingLevel = pgyYear ? `PGY-${pgyYear}` : null

  return {
    membership: {
      id: membership.id,
      programId: membership.program_id,
      rosterId: membership.roster_id ?? null,
      role: membership.role,
      gradYear,
      pgyYear,
      trainingLevel,
      displayName: membership.display_name,
      program: program
        ? {
            id: program.id,
            name: program.name,
            slug: program.slug,
            institutionName: program.institution_name,
            timezone: program.timezone,
          }
        : null,
    },
    currentRotation: currentRotation
      ? {
          id: currentRotation.id,
          name: currentRotation.rotations?.name ?? null,
          shortName: currentRotation.rotations?.short_name ?? null,
          category: currentRotation.rotations?.category ?? null,
          color: currentRotation.rotations?.color ?? null,
          startDate: currentRotation.start_date,
          endDate: currentRotation.end_date,
          siteLabel: currentRotation.site_label,
          teamLabel: currentRotation.team_label,
          notes: currentRotation.notes,
        }
      : null,
    nextRotation: nextRotation
      ? {
          id: nextRotation.id,
          name: nextRotation.rotations?.name ?? null,
          shortName: nextRotation.rotations?.short_name ?? null,
          category: nextRotation.rotations?.category ?? null,
          color: nextRotation.rotations?.color ?? null,
          startDate: nextRotation.start_date,
          endDate: nextRotation.end_date,
          siteLabel: nextRotation.site_label,
          teamLabel: nextRotation.team_label,
          notes: nextRotation.notes,
        }
      : null,
    nextCall: nextCall
      ? {
          id: nextCall.id,
          callType: nextCall.call_type,
          callDate: nextCall.call_date,
          startDatetime: nextCall.start_datetime,
          endDatetime: nextCall.end_datetime,
          site: nextCall.site,
          isHomeCall: nextCall.is_home_call,
          notes: nextCall.notes,
        }
      : null,
  }
}