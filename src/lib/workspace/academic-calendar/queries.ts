import type { SupabaseClient } from "@supabase/supabase-js";

export const ACADEMIC_EVENT_LIST_SELECT = `
  id,
  program_id,
  event_type_id,
  title,
  description,
  start_datetime,
  end_datetime,
  location_id,
  is_required,
  visibility,
  created_by_user_id,
  created_at,
  updated_at,
  event_type:academic_event_types (
    id,
    name,
    color,
    icon
  ),
  location:academic_locations (
    id,
    name,
    address,
    building,
    room,
    is_virtual,
    virtual_url
  )
`;

export const ACADEMIC_EVENT_DETAIL_SELECT = `
  id,
  program_id,
  event_type_id,
  title,
  description,
  start_datetime,
  end_datetime,
  location_id,
  is_required,
  visibility,
  created_by_user_id,
  created_at,
  updated_at,

  event_type:academic_event_types (
    id,
    name,
    color,
    icon
  ),

  location:academic_locations (
    id,
    name,
    address,
    building,
    room,
    is_virtual,
    virtual_url
  ),

  sessions:academic_event_sessions (
    id,
    academic_event_id,
    title,
    session_type,
    description,
    start_datetime,
    end_datetime,
    location_id,
    display_order,
    created_at,
    updated_at,
    location:academic_locations (
      id,
      name,
      address,
      building,
      room,
      is_virtual,
      virtual_url
    )
  ),

  people:academic_event_people (
    id,
    academic_event_id,
    academic_event_session_id,
    roster_id,
    external_person_id,
    role,
    display_order,
    created_at,
    roster:program_roster (
      id,
      first_name,
      last_name,
      full_name,
      role,
      grad_year
    ),
    external_person:external_people (
      id,
      first_name,
      last_name,
      full_name,
      credentials,
      institution
    )
  ),

  journal_articles:academic_journal_articles (
    id,
    academic_event_id,
    academic_event_session_id,
    title,
    journal,
    authors,
    publication_year,
    doi,
    pubmed_url,
    article_url,
    pdf_url,
    citation_text,
    summary,
    key_points,
    discussion_questions,
    display_order,
    created_at,
    updated_at,
    presenters:academic_article_presenters (
      id,
      article_id,
      roster_id,
      external_person_id,
      role,
      display_order,
      created_at,
      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      ),
      external_person:external_people (
        id,
        first_name,
        last_name,
        full_name,
        credentials,
        institution
      )
    )
  ),

  resources:academic_event_resources (
    id,
    academic_event_id,
    academic_event_session_id,
    resource_type,
    title,
    url,
    file_path,
    description,
    uploaded_by_user_id,
    display_order,
    created_at,
    updated_at
  ),

  attendance:academic_event_attendance (
    id,
    academic_event_id,
    roster_id,
    status,
    checked_in_at,
    check_in_method,
    excuse_reason,
    notes,
    created_at,
    updated_at,
    roster:program_roster (
      id,
      first_name,
      last_name,
      full_name,
      role,
      grad_year
    )
  ),

  assignments:academic_event_assignments (
    id,
    academic_event_id,
    academic_event_session_id,
    roster_id,
    assignment_type,
    title,
    due_date,
    status,
    notes,
    created_at,
    updated_at,
    roster:program_roster (
      id,
      first_name,
      last_name,
      full_name,
      role,
      grad_year
    )
  ),

  recurrence_rule:academic_event_recurrence_rules (
    id,
    academic_event_id,
    recurrence_rule,
    recurrence_timezone,
    recurrence_end_date,
    created_at,
    updated_at
  )
`;

export type GetAcademicEventsFilters = {
  programId: string;
  startDate?: string | null;
  endDate?: string | null;
  eventTypeId?: string | null;
  requiredOnly?: boolean;
};

export async function getAcademicEvents(
  supabase: SupabaseClient,
  filters: GetAcademicEventsFilters
) {
  let query = supabase
    .from("academic_events")
    .select(ACADEMIC_EVENT_LIST_SELECT)
    .eq("program_id", filters.programId)
    .order("start_datetime", { ascending: true });

  if (filters.startDate) {
    query = query.gte("start_datetime", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("start_datetime", filters.endDate);
  }

  if (filters.eventTypeId) {
    query = query.eq("event_type_id", filters.eventTypeId);
  }

  if (filters.requiredOnly) {
    query = query.eq("is_required", true);
  }

  return query;
}

export async function getAcademicEventById(
  supabase: SupabaseClient,
  eventId: string
) {
  return supabase
    .from("academic_events")
    .select(ACADEMIC_EVENT_DETAIL_SELECT)
    .eq("id", eventId)
    .single();
}

export async function createAcademicEvent(
  supabase: SupabaseClient,
  values: {
    program_id: string;
    title: string;
    event_type_id?: string | null;
    description?: string | null;
    start_datetime: string;
    end_datetime: string;
    location_id?: string | null;
    is_required?: boolean;
    visibility?: "program" | "private" | "public";
    created_by_user_id: string;
  }
) {
  return supabase
    .from("academic_events")
    .insert({
      program_id: values.program_id,
      title: values.title,
      event_type_id: values.event_type_id ?? null,
      description: values.description ?? null,
      start_datetime: values.start_datetime,
      end_datetime: values.end_datetime,
      location_id: values.location_id ?? null,
      is_required: values.is_required ?? false,
      visibility: values.visibility ?? "program",
      created_by_user_id: values.created_by_user_id,
    })
    .select(ACADEMIC_EVENT_LIST_SELECT)
    .single();
}

export async function updateAcademicEvent(
  supabase: SupabaseClient,
  eventId: string,
  values: Record<string, unknown>
) {
  return supabase
    .from("academic_events")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select(ACADEMIC_EVENT_LIST_SELECT)
    .single();
}

export async function deleteAcademicEvent(
  supabase: SupabaseClient,
  eventId: string
) {
  return supabase.from("academic_events").delete().eq("id", eventId);
}

export async function getAcademicEventTypes(
  supabase: SupabaseClient,
  programId: string
) {
  return supabase
    .from("academic_event_types")
    .select("*")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function getAcademicLocations(
  supabase: SupabaseClient,
  programId: string
) {
  return supabase
    .from("academic_locations")
    .select("*")
    .eq("program_id", programId)
    .order("name", { ascending: true });
}

export async function getExternalPeople(
  supabase: SupabaseClient,
  programId: string,
  search?: string | null
) {
  let query = supabase
    .from("external_people")
    .select("*")
    .eq("program_id", programId)
    .order("full_name", { ascending: true });

  if (search?.trim()) {
    const cleanSearch = search.trim();
    query = query.or(
      `full_name.ilike.%${cleanSearch}%,institution.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
    );
  }

  return query;
}

export async function getAcademicEventSessions(
  supabase: SupabaseClient,
  eventId: string
) {
  return supabase
    .from("academic_event_sessions")
    .select(`
      id,
      academic_event_id,
      title,
      session_type,
      description,
      start_datetime,
      end_datetime,
      location_id,
      display_order,
      created_at,
      updated_at,
      location:academic_locations (
        id,
        name,
        address,
        building,
        room,
        is_virtual,
        virtual_url
      )
    `)
    .eq("academic_event_id", eventId)
    .order("display_order", { ascending: true })
    .order("start_datetime", { ascending: true });
}

export async function getAcademicEventResources(
  supabase: SupabaseClient,
  eventId: string,
  sessionId?: string | null
) {
  let query = supabase
    .from("academic_event_resources")
    .select("*")
    .eq("academic_event_id", eventId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sessionId) {
    query = query.eq("academic_event_session_id", sessionId);
  }

  return query;
}

export async function getAcademicEventAttendance(
  supabase: SupabaseClient,
  eventId: string
) {
  return supabase
    .from("academic_event_attendance")
    .select(`
      id,
      academic_event_id,
      roster_id,
      status,
      checked_in_at,
      check_in_method,
      excuse_reason,
      notes,
      created_at,
      updated_at,
      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      )
    `)
    .eq("academic_event_id", eventId)
    .order("created_at", { ascending: true });
}

export async function getAcademicAssignments(
  supabase: SupabaseClient,
  filters: {
    programId?: string | null;
    eventId?: string | null;
    sessionId?: string | null;
    rosterId?: string | null;
    status?: string | null;
  }
) {
  let query = supabase
    .from("academic_event_assignments")
    .select(`
      id,
      academic_event_id,
      academic_event_session_id,
      roster_id,
      assignment_type,
      title,
      due_date,
      status,
      notes,
      created_at,
      updated_at,
      event:academic_events (
        id,
        program_id,
        title,
        start_datetime,
        end_datetime
      ),
      session:academic_event_sessions (
        id,
        title,
        session_type,
        start_datetime,
        end_datetime
      ),
      roster:program_roster (
        id,
        first_name,
        last_name,
        full_name,
        role,
        grad_year
      )
    `)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (filters.programId) {
    query = query.eq("event.program_id", filters.programId);
  }

  if (filters.eventId) {
    query = query.eq("academic_event_id", filters.eventId);
  }

  if (filters.sessionId) {
    query = query.eq("academic_event_session_id", filters.sessionId);
  }

  if (filters.rosterId) {
    query = query.eq("roster_id", filters.rosterId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  return query;
}

export async function getAcademicJournalArticles(
  supabase: SupabaseClient,
  filters: {
    eventId?: string | null;
    sessionId?: string | null;
  }
) {
  let query = supabase
    .from("academic_journal_articles")
    .select(`
      id,
      academic_event_id,
      academic_event_session_id,
      title,
      journal,
      authors,
      publication_year,
      doi,
      pubmed_url,
      article_url,
      pdf_url,
      citation_text,
      summary,
      key_points,
      discussion_questions,
      display_order,
      created_at,
      updated_at,
      presenters:academic_article_presenters (
        id,
        article_id,
        roster_id,
        external_person_id,
        role,
        display_order,
        created_at,
        roster:program_roster (
          id,
          first_name,
          last_name,
          full_name,
          role,
          grad_year
        ),
        external_person:external_people (
          id,
          first_name,
          last_name,
          full_name,
          credentials,
          institution
        )
      )
    `)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (filters.eventId) {
    query = query.eq("academic_event_id", filters.eventId);
  }

  if (filters.sessionId) {
    query = query.eq("academic_event_session_id", filters.sessionId);
  }

  return query;
}