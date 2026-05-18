export type AcademicVisibility = "program" | "private" | "public";

export type AcademicResourceType =
  | "pdf"
  | "slides"
  | "article"
  | "video"
  | "website"
  | "handout"
  | "reading_assignment"
  | "image"
  | "other";

export type AcademicAttendanceStatus =
  | "required"
  | "attending"
  | "present"
  | "absent"
  | "excused"
  | "late";

export type AcademicAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "excused"
  | "cancelled";

export type AcademicPersonRole =
  | "presenter"
  | "moderator"
  | "discussant"
  | "faculty_lead"
  | "visiting_professor"
  | "journal_presenter"
  | "m_and_m_presenter"
  | "case_presenter"
  | string;

export type AcademicEventType = {
  id: string;
  program_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  default_duration_minutes: number | null;
  default_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AcademicLocation = {
  id: string;
  program_id: string;
  name: string;
  address: string | null;
  building: string | null;
  room: string | null;
  google_maps_url: string | null;
  is_virtual: boolean;
  virtual_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExternalPerson = {
  id: string;
  program_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  credentials: string | null;
  title: string | null;
  institution: string | null;
  email: string | null;
  bio: string | null;
  headshot_url: string | null;
  created_at: string;
  updated_at: string;
};

export type RosterPerson = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  role: string | null;
  grad_year: number | null;
};

export type AcademicEvent = {
  id: string;
  program_id: string;
  event_type_id: string | null;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  location_id: string | null;
  is_required: boolean;
  visibility: AcademicVisibility;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademicEventListItem = AcademicEvent & {
  event_type: Pick<
    AcademicEventType,
    "id" | "name" | "color" | "icon"
  > | null;

  location: Pick<
    AcademicLocation,
    | "id"
    | "name"
    | "address"
    | "building"
    | "room"
    | "is_virtual"
    | "virtual_url"
  > | null;
};

export type AcademicEventSession = {
  id: string;
  academic_event_id: string;
  title: string;
  session_type: string | null;
  description: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  location_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;

  location?: Pick<
    AcademicLocation,
    | "id"
    | "name"
    | "address"
    | "building"
    | "room"
    | "is_virtual"
    | "virtual_url"
  > | null;
};

export type AcademicEventPerson = {
  id: string;
  academic_event_id: string;
  academic_event_session_id: string | null;
  roster_id: string | null;
  external_person_id: string | null;
  role: AcademicPersonRole;
  display_order: number;
  created_at: string;

  roster?: RosterPerson | null;

  external_person?: Pick<
    ExternalPerson,
    | "id"
    | "first_name"
    | "last_name"
    | "full_name"
    | "credentials"
    | "institution"
  > | null;
};

export type AcademicArticlePresenter = {
  id: string;
  article_id: string;
  roster_id: string | null;
  external_person_id: string | null;
  role: string;
  display_order: number;
  created_at: string;

  roster?: RosterPerson | null;

  external_person?: Pick<
    ExternalPerson,
    | "id"
    | "first_name"
    | "last_name"
    | "full_name"
    | "credentials"
    | "institution"
  > | null;
};

export type AcademicJournalArticle = {
  id: string;
  academic_event_id: string;
  academic_event_session_id: string | null;
  title: string;
  journal: string | null;
  authors: string | null;
  publication_year: number | null;
  doi: string | null;
  pubmed_url: string | null;
  article_url: string | null;
  pdf_url: string | null;
  citation_text: string | null;
  summary: string | null;
  key_points: string | null;
  discussion_questions: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;

  presenters?: AcademicArticlePresenter[];
};

export type AcademicEventResource = {
  id: string;
  academic_event_id: string;
  academic_event_session_id: string | null;
  resource_type: AcademicResourceType;
  title: string;
  url: string | null;
  file_path: string | null;
  description: string | null;
  uploaded_by_user_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type AcademicEventAttendance = {
  id: string;
  academic_event_id: string;
  roster_id: string;
  status: AcademicAttendanceStatus;
  checked_in_at: string | null;
  check_in_method: string | null;
  excuse_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  roster?: RosterPerson | null;
};

export type AcademicEventAssignment = {
  id: string;
  academic_event_id: string;
  academic_event_session_id: string | null;
  roster_id: string;
  assignment_type: string;
  title: string | null;
  due_date: string | null;
  status: AcademicAssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;

  roster?: RosterPerson | null;
};

export type AcademicEventRecurrenceRule = {
  id: string;
  academic_event_id: string;
  recurrence_rule: string;
  recurrence_timezone: string;
  recurrence_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademicEventDetail = AcademicEventListItem & {
  sessions: AcademicEventSession[];
  people: AcademicEventPerson[];
  journal_articles: AcademicJournalArticle[];
  resources: AcademicEventResource[];
  attendance: AcademicEventAttendance[];
  assignments: AcademicEventAssignment[];
  recurrence_rule: AcademicEventRecurrenceRule | null;
};

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};