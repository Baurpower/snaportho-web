export type Program = {
  id: string
  name: string | null
  slug: string | null
  institution_name: string | null
  timezone: string | null
  is_active: boolean | null
}

export type ProgramMembership = {
  id: string
  program_id: string | null
  user_id: string | null
  role: string | null
  training_level: string | null
  class_year: number | null
  display_name: string | null
  is_active: boolean | null
  start_date: string | null
  end_date: string | null
}

export type Rotation = {
  id: string
  program_id: string | null
  name: string | null
  short_name: string | null
  description: string | null
  category: string | null
  color: string | null
  sort_order: number | null
  is_active: boolean | null
}

export type RotationAssignment = {
  id: string
  program_id: string | null
  program_membership_id: string | null
  rotation_id: string | null
  start_date: string | null
  end_date: string | null
  site_label: string | null
  team_label: string | null
  notes: string | null
}

export type CallAssignment = {
  id: string
  program_id: string | null
  program_membership_id: string | null
  call_type: string | null
  call_date: string | null
  start_datetime: string | null
  end_datetime: string | null
  site: string | null
  is_home_call: boolean | null
  notes: string | null
}

export type ProgramAttending = {
  id: string
  programId: string
  fullName: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
  isActive: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type ProgramAttendingInput = {
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  isActive?: boolean
}

export type ProgramAttendingCoverageSlot = {
  id: string
  programId: string
  name: string
  abbreviation: string
  color: string | null
  isActive: boolean
  sortOrder: number
  description: string | null
}

export type ProgramCallAttendingAssignment = {
  id: string
  programId: string
  attendingId: string
  attendingName: string
  attendingFirstName?: string | null
  attendingLastName?: string | null
  attendingDisplayName: string | null
  coverageDate: string
  coverageScope: string
  isDefault: boolean
  isActive: boolean
  slotId?: string | null
  slotName?: string | null
  slotAbbreviation?: string | null
  slotColor?: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type ProgramAttendingMonthPayload = {
  month: string
  monthStart: string
  monthEnd: string
  attendings: ProgramAttending[]
  slots: ProgramAttendingCoverageSlot[]
  assignments: ProgramCallAttendingAssignment[]
}

export type ScheduleEvent = {
  id: string
  event_type: string | null
  title: string | null
  start_datetime: string | null
  end_datetime: string | null
  location: string | null
  description: string | null
  is_all_day: boolean | null
}
