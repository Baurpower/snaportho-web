import { createClient } from '@/utils/supabase/server'

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
  programs: Array<{
    id: string
    name: string | null
    slug: string | null
    institution_name: string | null
    timezone: string | null
  }> | null
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

  console.log('getActiveMembershipForUser userId:', userId)
  console.log('program_memberships rows for user:', rows)

  const activeMembership =
    rows.find((row) => {
      const activeOk = row.is_active === true
      const startsOk = !row.start_date || row.start_date <= today
      const endsOk = !row.end_date || row.end_date >= today
      return activeOk && startsOk && endsOk
    }) ?? null

  console.log('resolved active membership:', activeMembership)

  return activeMembership
}