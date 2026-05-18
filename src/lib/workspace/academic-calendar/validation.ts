import { z } from "zod";

//
// Shared Enums
//

export const AcademicVisibilitySchema = z.enum([
  "program",
  "private",
  "public",
]);

export const AcademicResourceTypeSchema = z.enum([
  "pdf",
  "slides",
  "article",
  "video",
  "website",
  "handout",
  "reading_assignment",
  "image",
  "other",
]);

export const AcademicAttendanceStatusSchema = z.enum([
  "required",
  "attending",
  "present",
  "absent",
  "excused",
  "late",
]);

export const AcademicAssignmentStatusSchema = z.enum([
  "assigned",
  "in_progress",
  "completed",
  "excused",
  "cancelled",
]);

//
// Event Types
//

export const CreateAcademicEventTypeSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1, "Event type name is required"),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  default_duration_minutes: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  default_required: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

//
// Locations
//

export const CreateAcademicLocationSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1, "Location name is required"),
  address: z.string().nullable().optional(),
  building: z.string().nullable().optional(),
  room: z.string().nullable().optional(),
  google_maps_url: z.string().url().nullable().optional(),
  is_virtual: z.boolean().optional(),
  virtual_url: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});

//
// External People
//

export const CreateExternalPersonSchema = z.object({
  program_id: z.string().uuid(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  full_name: z.string().min(1, "Full name is required"),
  credentials: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  bio: z.string().nullable().optional(),
  headshot_url: z.string().url().nullable().optional(),
});

//
// Academic Events
//

export const CreateAcademicEventSchema = z.object({
  program_id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  event_type_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().datetime(),
  end_datetime: z.string().datetime(),
  location_id: z.string().uuid().nullable().optional(),
  is_required: z.boolean().optional(),
  visibility: AcademicVisibilitySchema.optional(),
});

export const UpdateAcademicEventSchema = z.object({
  title: z.string().min(1).optional(),
  event_type_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().datetime().optional(),
  end_datetime: z.string().datetime().optional(),
  location_id: z.string().uuid().nullable().optional(),
  is_required: z.boolean().optional(),
  visibility: AcademicVisibilitySchema.optional(),
});

//
// Sessions
//

export const CreateAcademicSessionSchema = z.object({
  title: z.string().min(1, "Session title is required"),
  session_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  start_datetime: z.string().datetime().nullable().optional(),
  end_datetime: z.string().datetime().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  display_order: z.number().int().optional(),
});

//
// Event People
//

export const CreateAcademicEventPersonSchema = z
  .object({
    academic_event_session_id: z
      .string()
      .uuid()
      .nullable()
      .optional(),

    roster_id: z.string().uuid().nullable().optional(),

    external_person_id: z
      .string()
      .uuid()
      .nullable()
      .optional(),

    role: z.string().min(1),
    display_order: z.number().int().optional(),
  })
  .refine(
    (data) => !!data.roster_id || !!data.external_person_id,
    {
      message:
        "Either roster_id or external_person_id is required",
      path: ["roster_id"],
    }
  );

//
// Resources
//

export const CreateAcademicResourceSchema = z.object({
  academic_event_session_id: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  resource_type: AcademicResourceTypeSchema,

  title: z.string().min(1, "Resource title is required"),

  url: z.string().url().nullable().optional(),

  file_path: z.string().nullable().optional(),

  description: z.string().nullable().optional(),

  display_order: z.number().int().optional(),
});

//
// Attendance
//

export const UpsertAttendanceSchema = z.object({
  roster_id: z.string().uuid(),

  status: AcademicAttendanceStatusSchema,

  checked_in_at: z
    .string()
    .datetime()
    .nullable()
    .optional(),

  check_in_method: z.string().nullable().optional(),

  excuse_reason: z.string().nullable().optional(),

  notes: z.string().nullable().optional(),
});

export const BulkUpsertAttendanceSchema = z.object({
  attendance: z.array(UpsertAttendanceSchema).min(1),
});

//
// Assignments
//

export const CreateAcademicAssignmentSchema = z.object({
  academic_event_id: z.string().uuid(),

  academic_event_session_id: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  roster_id: z.string().uuid(),

  assignment_type: z
    .string()
    .min(1, "Assignment type is required"),

  title: z.string().nullable().optional(),

  due_date: z.string().nullable().optional(),

  status: AcademicAssignmentStatusSchema.optional(),

  notes: z.string().nullable().optional(),
});

//
// Journal Articles
//

export const CreateArticlePresenterSchema = z
  .object({
    roster_id: z.string().uuid().nullable().optional(),

    external_person_id: z
      .string()
      .uuid()
      .nullable()
      .optional(),

    role: z.string().optional(),

    display_order: z.number().int().optional(),
  })
  .refine(
    (data) => !!data.roster_id || !!data.external_person_id,
    {
      message:
        "Each presenter must include either roster_id or external_person_id",
      path: ["roster_id"],
    }
  );

export const CreateAcademicJournalArticleSchema = z.object({
  academic_event_id: z.string().uuid(),

  academic_event_session_id: z
    .string()
    .uuid()
    .nullable()
    .optional(),

  title: z.string().min(1, "Article title is required"),

  journal: z.string().nullable().optional(),

  authors: z.string().nullable().optional(),

  publication_year: z
    .number()
    .int()
    .nullable()
    .optional(),

  doi: z.string().nullable().optional(),

  pubmed_url: z.string().url().nullable().optional(),

  article_url: z.string().url().nullable().optional(),

  pdf_url: z.string().url().nullable().optional(),

  citation_text: z.string().nullable().optional(),

  summary: z.string().nullable().optional(),

  key_points: z.string().nullable().optional(),

  discussion_questions: z.string().nullable().optional(),

  display_order: z.number().int().optional(),

  presenters: z
    .array(CreateArticlePresenterSchema)
    .optional(),
});

//
// Recurrence Rules
//

export const CreateAcademicRecurrenceRuleSchema = z.object({
  academic_event_id: z.string().uuid(),

  recurrence_rule: z
    .string()
    .min(1, "Recurrence rule is required"),

  recurrence_timezone: z.string().optional(),

  recurrence_end_date: z
    .string()
    .nullable()
    .optional(),
});