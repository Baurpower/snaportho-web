import { createClient } from '@/utils/supabase/server'

type ProgramRow = {
  id: string
  name: string | null
  slug: string | null
  institution_name: string | null
  timezone: string | null
}

export type ActiveMembership = {
  id: string
  program_id: string | null
  roster_id: string | null
  user_id: string | null
  role: string | null
  grad_year: number | null
  display_name: string | null
  is_active: boolean | null
  start_date: string | null
  end_date: string | null
  programs: ProgramRow | ProgramRow[] | null
}

export async function getActiveMembershipForUser(
  userId: string
): Promise<ActiveMembership | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('program_memberships')
    .select(`
      id,
      program_id,
      roster_id,
      user_id,
      role,
      grad_year,
      display_name,
      is_active,
      start_date,
      end_date,
      programs (
        id,
        name,
        slug,
        institution_name,
        timezone
      )
    `)
    .eq('user_id', userId)
    .order('start_date', { ascending: false, nullsFirst: false })

  if (error) {
    throw new Error(`Failed to fetch memberships: ${error.message}`)
  }

  const rows = (data ?? []) as ActiveMembership[]

  const activeMembership =
    rows.find((row) => {
      const activeOk = row.is_active === true
      const startsOk = !row.start_date || row.start_date <= today
      const endsOk = !row.end_date || row.end_date >= today
      return activeOk && startsOk && endsOk
    }) ?? null

  if (!activeMembership) return null

  const normalizedProgram = Array.isArray(activeMembership.programs)
    ? activeMembership.programs[0] ?? null
    : activeMembership.programs ?? null

  return {
    ...activeMembership,
    programs: normalizedProgram,
  }
}