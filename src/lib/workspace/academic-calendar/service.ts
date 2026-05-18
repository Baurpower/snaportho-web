import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createAcademicEvent,
  deleteAcademicEvent,
  getAcademicEventById,
  getAcademicEvents,
  updateAcademicEvent,
} from "./queries";

import type {
  AcademicVisibility,
} from "./types";

export function jsonError(message: string, status = 400) {
  return Response.json(
    {
      data: null,
      error: message,
    },
    { status }
  );
}

export function validateDateRange(
  startDatetime?: string | null,
  endDatetime?: string | null,
  label = "Event"
) {
  if (!startDatetime || !endDatetime) return null;

  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${label} contains an invalid date`;
  }

  if (end <= start) {
    return `${label} end time must be after start time`;
  }

  return null;
}

export async function listAcademicEventsService(
  supabase: SupabaseClient,
  filters: {
    programId: string;
    startDate?: string | null;
    endDate?: string | null;
    eventTypeId?: string | null;
    requiredOnly?: boolean;
  }
) {
  return getAcademicEvents(supabase, filters);
}

export async function getAcademicEventDetailService(
  supabase: SupabaseClient,
  eventId: string
) {
  return getAcademicEventById(supabase, eventId);
}

export async function createAcademicEventService(
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
    visibility?: AcademicVisibility;
    created_by_user_id: string;
  }
) {
  const dateError = validateDateRange(
    values.start_datetime,
    values.end_datetime,
    "Event"
  );

  if (dateError) {
    return {
      data: null,
      error: {
        message: dateError,
      },
    };
  }

  return createAcademicEvent(supabase, values);
}

export async function updateAcademicEventService(
  supabase: SupabaseClient,
  eventId: string,
  values: {
    title?: string;
    event_type_id?: string | null;
    description?: string | null;
    start_datetime?: string;
    end_datetime?: string;
    location_id?: string | null;
    is_required?: boolean;
    visibility?: AcademicVisibility;
  }
) {
  if (values.start_datetime && values.end_datetime) {
    const dateError = validateDateRange(
      values.start_datetime,
      values.end_datetime,
      "Event"
    );

    if (dateError) {
      return {
        data: null,
        error: {
          message: dateError,
        },
      };
    }
  }

  return updateAcademicEvent(supabase, eventId, values);
}

export async function deleteAcademicEventService(
  supabase: SupabaseClient,
  eventId: string
) {
  return deleteAcademicEvent(supabase, eventId);
}

export async function requireAuthenticatedUser(
  supabase: SupabaseClient
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: "Unauthorized",
    };
  }

  return {
    user,
    error: null,
  };
}

export function parseRequiredOnly(value: string | null) {
  return value === "true";
}

export function parseSearchParamsForEvents(searchParams: URLSearchParams) {
  return {
    programId: searchParams.get("programId"),
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    eventTypeId: searchParams.get("eventTypeId"),
    requiredOnly: parseRequiredOnly(searchParams.get("requiredOnly")),
  };
}