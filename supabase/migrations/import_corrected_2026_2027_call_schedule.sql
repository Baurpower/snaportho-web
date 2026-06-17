-- Import corrected 2026-2027 Valley Hospital Orthopaedic Surgery call schedule.
--
-- Source files inspected:
-- - /Users/alexbaur/Downloads/program_roster_rows.csv
-- - /Users/alexbaur/Downloads/call_assignments_rows-2.csv
-- - /Users/alexbaur/Downloads/26-27 Call Schedule Revised_526de8943c00a3c55b23e99601a1d6808498e3493682709478c8628af5c48869@group.calendar.google.com.ics
--
-- Date range imported: 2026-07-01 through 2027-06-30, inclusive.
-- The revised ICS contains 256 all-day VEVENT blocks. DTSTART is inclusive and
-- DTEND is exclusive; multi-day events are expanded to one staged row per
-- calendar date, yielding 365 staged call_assignments rows. Assignment names
-- come from SUMMARY, not DESCRIPTION. Some revised SUMMARY values include
-- holiday annotations after a hyphen, such as "Baur - Christmas"; the staged
-- raw_summary keeps that original text, while assignee_name uses the resident
-- name prefix with roster-canonical casing for matching and summaries.
--
-- Overwrite behavior: this script only deletes public.call_assignments rows for
-- program_id 9ebe4ba1-4a2f-43ce-9d4d-0b7a603ea047 whose call_date is within the
-- imported date range, then inserts the staged replacement rows. It does not
-- modify public.program_roster, other programs, or call_assignments outside the
-- imported range.
--
-- Validation checks:
-- - every staged assignee must match exactly one public.program_roster row by
--   case-insensitive trimmed last_name or full_name for the target program;
-- - every staged date must have exactly one assignment;
-- - the staged date range must have no missing dates;
-- - the inserted row count must equal the staged row count.

begin;

create temp table corrected_2026_2027_call_schedule_stage (
  call_date date not null,
  assignee_name text not null,
  raw_summary text not null,
  source_is_multiday boolean not null,
  source_dtstart date not null,
  source_dtend_exclusive date not null,
  source_event_index integer not null
) on commit drop;

insert into corrected_2026_2027_call_schedule_stage (
  call_date,
  assignee_name,
  raw_summary,
  source_is_multiday,
  source_dtstart,
  source_dtend_exclusive,
  source_event_index
)
values
  ('2026-07-01'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-07-01'::date, '2026-07-02'::date, 168::integer),
  ('2026-07-02'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-07-02'::date, '2026-07-03'::date, 206::integer),
  ('2026-07-03'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-07-03'::date, '2026-07-06'::date, 143::integer),
  ('2026-07-04'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-07-03'::date, '2026-07-06'::date, 143::integer),
  ('2026-07-05'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-07-03'::date, '2026-07-06'::date, 143::integer),
  ('2026-07-06'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-07-06'::date, '2026-07-07'::date, 60::integer),
  ('2026-07-07'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-07-07'::date, '2026-07-08'::date, 208::integer),
  ('2026-07-08'::date, 'McNair'::text, 'Mcnair'::text, false::boolean, '2026-07-08'::date, '2026-07-09'::date, 238::integer),
  ('2026-07-09'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-07-09'::date, '2026-07-10'::date, 184::integer),
  ('2026-07-10'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-07-10'::date, '2026-07-13'::date, 228::integer),
  ('2026-07-11'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-07-10'::date, '2026-07-13'::date, 228::integer),
  ('2026-07-12'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-07-10'::date, '2026-07-13'::date, 228::integer),
  ('2026-07-13'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-07-13'::date, '2026-07-14'::date, 1::integer),
  ('2026-07-14'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-07-14'::date, '2026-07-15'::date, 146::integer),
  ('2026-07-15'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-07-15'::date, '2026-07-16'::date, 22::integer),
  ('2026-07-16'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-07-16'::date, '2026-07-17'::date, 155::integer),
  ('2026-07-17'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2026-07-17'::date, '2026-07-20'::date, 107::integer),
  ('2026-07-18'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2026-07-17'::date, '2026-07-20'::date, 107::integer),
  ('2026-07-19'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2026-07-17'::date, '2026-07-20'::date, 107::integer),
  ('2026-07-20'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-07-20'::date, '2026-07-21'::date, 221::integer),
  ('2026-07-21'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-07-21'::date, '2026-07-22'::date, 219::integer),
  ('2026-07-22'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-07-22'::date, '2026-07-23'::date, 106::integer),
  ('2026-07-23'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-07-23'::date, '2026-07-24'::date, 149::integer),
  ('2026-07-24'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-07-24'::date, '2026-07-27'::date, 130::integer),
  ('2026-07-25'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-07-24'::date, '2026-07-27'::date, 130::integer),
  ('2026-07-26'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-07-24'::date, '2026-07-27'::date, 130::integer),
  ('2026-07-27'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-07-27'::date, '2026-07-28'::date, 187::integer),
  ('2026-07-28'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-07-28'::date, '2026-07-29'::date, 24::integer),
  ('2026-07-29'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-07-29'::date, '2026-07-30'::date, 254::integer),
  ('2026-07-30'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-07-30'::date, '2026-07-31'::date, 227::integer),
  ('2026-07-31'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-07-31'::date, '2026-08-03'::date, 30::integer),
  ('2026-08-01'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-07-31'::date, '2026-08-03'::date, 30::integer),
  ('2026-08-02'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-07-31'::date, '2026-08-03'::date, 30::integer),
  ('2026-08-03'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-08-03'::date, '2026-08-04'::date, 255::integer),
  ('2026-08-04'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-08-04'::date, '2026-08-05'::date, 76::integer),
  ('2026-08-05'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-08-05'::date, '2026-08-06'::date, 127::integer),
  ('2026-08-06'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-08-06'::date, '2026-08-07'::date, 170::integer),
  ('2026-08-07'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2026-08-07'::date, '2026-08-10'::date, 28::integer),
  ('2026-08-08'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2026-08-07'::date, '2026-08-10'::date, 28::integer),
  ('2026-08-09'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2026-08-07'::date, '2026-08-10'::date, 28::integer),
  ('2026-08-10'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-08-10'::date, '2026-08-11'::date, 232::integer),
  ('2026-08-11'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-08-11'::date, '2026-08-12'::date, 132::integer),
  ('2026-08-12'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-08-12'::date, '2026-08-13'::date, 182::integer),
  ('2026-08-13'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-08-13'::date, '2026-08-14'::date, 177::integer),
  ('2026-08-14'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2026-08-14'::date, '2026-08-17'::date, 225::integer),
  ('2026-08-15'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2026-08-14'::date, '2026-08-17'::date, 225::integer),
  ('2026-08-16'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2026-08-14'::date, '2026-08-17'::date, 225::integer),
  ('2026-08-17'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-08-17'::date, '2026-08-18'::date, 231::integer),
  ('2026-08-18'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-08-18'::date, '2026-08-19'::date, 207::integer),
  ('2026-08-19'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-08-19'::date, '2026-08-20'::date, 64::integer),
  ('2026-08-20'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-08-20'::date, '2026-08-21'::date, 6::integer),
  ('2026-08-21'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-08-21'::date, '2026-08-24'::date, 36::integer),
  ('2026-08-22'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-08-21'::date, '2026-08-24'::date, 36::integer),
  ('2026-08-23'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-08-21'::date, '2026-08-24'::date, 36::integer),
  ('2026-08-24'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-08-24'::date, '2026-08-25'::date, 21::integer),
  ('2026-08-25'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-08-25'::date, '2026-08-26'::date, 131::integer),
  ('2026-08-26'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-08-26'::date, '2026-08-27'::date, 58::integer),
  ('2026-08-27'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-08-27'::date, '2026-08-28'::date, 248::integer),
  ('2026-08-28'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-08-28'::date, '2026-08-31'::date, 122::integer),
  ('2026-08-29'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-08-28'::date, '2026-08-31'::date, 122::integer),
  ('2026-08-30'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-08-28'::date, '2026-08-31'::date, 122::integer),
  ('2026-08-31'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-08-31'::date, '2026-09-01'::date, 244::integer),
  ('2026-09-01'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-09-01'::date, '2026-09-02'::date, 188::integer),
  ('2026-09-02'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-09-02'::date, '2026-09-03'::date, 35::integer),
  ('2026-09-03'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-09-03'::date, '2026-09-04'::date, 198::integer),
  ('2026-09-04'::date, 'Fang'::text, 'Fang - Labor Day'::text, true::boolean, '2026-09-04'::date, '2026-09-08'::date, 8::integer),
  ('2026-09-05'::date, 'Fang'::text, 'Fang - Labor Day'::text, true::boolean, '2026-09-04'::date, '2026-09-08'::date, 8::integer),
  ('2026-09-06'::date, 'Fang'::text, 'Fang - Labor Day'::text, true::boolean, '2026-09-04'::date, '2026-09-08'::date, 8::integer),
  ('2026-09-07'::date, 'Fang'::text, 'Fang - Labor Day'::text, true::boolean, '2026-09-04'::date, '2026-09-08'::date, 8::integer),
  ('2026-09-08'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-09-08'::date, '2026-09-09'::date, 166::integer),
  ('2026-09-09'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-09-09'::date, '2026-09-10'::date, 102::integer),
  ('2026-09-10'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-09-10'::date, '2026-09-11'::date, 39::integer),
  ('2026-09-11'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-09-11'::date, '2026-09-14'::date, 191::integer),
  ('2026-09-12'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-09-11'::date, '2026-09-14'::date, 191::integer),
  ('2026-09-13'::date, 'Mo'::text, 'Mo'::text, true::boolean, '2026-09-11'::date, '2026-09-14'::date, 191::integer),
  ('2026-09-14'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2026-09-14'::date, '2026-09-15'::date, 151::integer),
  ('2026-09-15'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-09-15'::date, '2026-09-16'::date, 234::integer),
  ('2026-09-16'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-09-16'::date, '2026-09-17'::date, 253::integer),
  ('2026-09-17'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-09-17'::date, '2026-09-18'::date, 133::integer),
  ('2026-09-18'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-09-18'::date, '2026-09-21'::date, 68::integer),
  ('2026-09-19'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-09-18'::date, '2026-09-21'::date, 68::integer),
  ('2026-09-20'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-09-18'::date, '2026-09-21'::date, 68::integer),
  ('2026-09-21'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-09-21'::date, '2026-09-22'::date, 220::integer),
  ('2026-09-22'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-09-22'::date, '2026-09-23'::date, 190::integer),
  ('2026-09-23'::date, 'Mo'::text, 'Mo'::text, false::boolean, '2026-09-23'::date, '2026-09-24'::date, 52::integer),
  ('2026-09-24'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-09-24'::date, '2026-09-25'::date, 229::integer),
  ('2026-09-25'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-09-25'::date, '2026-09-28'::date, 26::integer),
  ('2026-09-26'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-09-25'::date, '2026-09-28'::date, 26::integer),
  ('2026-09-27'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-09-25'::date, '2026-09-28'::date, 26::integer),
  ('2026-09-28'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-09-28'::date, '2026-09-29'::date, 171::integer),
  ('2026-09-29'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-09-29'::date, '2026-09-30'::date, 105::integer),
  ('2026-09-30'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-09-30'::date, '2026-10-01'::date, 27::integer),
  ('2026-10-01'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-10-01'::date, '2026-10-02'::date, 112::integer),
  ('2026-10-02'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2026-10-02'::date, '2026-10-05'::date, 118::integer),
  ('2026-10-03'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2026-10-02'::date, '2026-10-05'::date, 118::integer),
  ('2026-10-04'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2026-10-02'::date, '2026-10-05'::date, 118::integer),
  ('2026-10-05'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-10-05'::date, '2026-10-06'::date, 86::integer),
  ('2026-10-06'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-10-06'::date, '2026-10-07'::date, 50::integer),
  ('2026-10-07'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-10-07'::date, '2026-10-08'::date, 235::integer),
  ('2026-10-08'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-10-08'::date, '2026-10-09'::date, 77::integer),
  ('2026-10-09'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-10-09'::date, '2026-10-12'::date, 137::integer),
  ('2026-10-10'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-10-09'::date, '2026-10-12'::date, 137::integer),
  ('2026-10-11'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-10-09'::date, '2026-10-12'::date, 137::integer),
  ('2026-10-12'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-10-12'::date, '2026-10-13'::date, 230::integer),
  ('2026-10-13'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-10-13'::date, '2026-10-14'::date, 222::integer),
  ('2026-10-14'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-10-14'::date, '2026-10-15'::date, 237::integer),
  ('2026-10-15'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-10-15'::date, '2026-10-16'::date, 123::integer),
  ('2026-10-16'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-10-16'::date, '2026-10-19'::date, 202::integer),
  ('2026-10-17'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-10-16'::date, '2026-10-19'::date, 202::integer),
  ('2026-10-18'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-10-16'::date, '2026-10-19'::date, 202::integer),
  ('2026-10-19'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-10-19'::date, '2026-10-20'::date, 29::integer),
  ('2026-10-20'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-10-20'::date, '2026-10-21'::date, 135::integer),
  ('2026-10-21'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-10-21'::date, '2026-10-22'::date, 157::integer),
  ('2026-10-22'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-10-22'::date, '2026-10-23'::date, 97::integer),
  ('2026-10-23'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-10-23'::date, '2026-10-26'::date, 196::integer),
  ('2026-10-24'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-10-23'::date, '2026-10-26'::date, 196::integer),
  ('2026-10-25'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-10-23'::date, '2026-10-26'::date, 196::integer),
  ('2026-10-26'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-10-26'::date, '2026-10-27'::date, 126::integer),
  ('2026-10-27'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-10-27'::date, '2026-10-28'::date, 88::integer),
  ('2026-10-28'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-10-28'::date, '2026-10-29'::date, 125::integer),
  ('2026-10-29'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-10-29'::date, '2026-10-30'::date, 10::integer),
  ('2026-10-30'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-10-30'::date, '2026-11-02'::date, 185::integer),
  ('2026-10-31'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-10-30'::date, '2026-11-02'::date, 185::integer),
  ('2026-11-01'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2026-10-30'::date, '2026-11-02'::date, 185::integer),
  ('2026-11-02'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-11-02'::date, '2026-11-03'::date, 70::integer),
  ('2026-11-03'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-11-03'::date, '2026-11-04'::date, 173::integer),
  ('2026-11-04'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-11-04'::date, '2026-11-05'::date, 178::integer),
  ('2026-11-05'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-11-05'::date, '2026-11-06'::date, 245::integer),
  ('2026-11-06'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2026-11-06'::date, '2026-11-09'::date, 108::integer),
  ('2026-11-07'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2026-11-06'::date, '2026-11-09'::date, 108::integer),
  ('2026-11-08'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2026-11-06'::date, '2026-11-09'::date, 108::integer),
  ('2026-11-09'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-11-09'::date, '2026-11-10'::date, 47::integer),
  ('2026-11-10'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-11-10'::date, '2026-11-11'::date, 134::integer),
  ('2026-11-11'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-11-11'::date, '2026-11-12'::date, 163::integer),
  ('2026-11-12'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-11-12'::date, '2026-11-13'::date, 37::integer),
  ('2026-11-13'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2026-11-13'::date, '2026-11-16'::date, 164::integer),
  ('2026-11-14'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2026-11-13'::date, '2026-11-16'::date, 164::integer),
  ('2026-11-15'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2026-11-13'::date, '2026-11-16'::date, 164::integer),
  ('2026-11-16'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-11-16'::date, '2026-11-17'::date, 40::integer),
  ('2026-11-17'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-11-17'::date, '2026-11-18'::date, 2::integer),
  ('2026-11-18'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-11-18'::date, '2026-11-19'::date, 209::integer),
  ('2026-11-19'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-11-19'::date, '2026-11-20'::date, 156::integer),
  ('2026-11-20'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-11-20'::date, '2026-11-23'::date, 212::integer),
  ('2026-11-21'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-11-20'::date, '2026-11-23'::date, 212::integer),
  ('2026-11-22'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-11-20'::date, '2026-11-23'::date, 212::integer),
  ('2026-11-23'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-11-23'::date, '2026-11-24'::date, 111::integer),
  ('2026-11-24'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-11-24'::date, '2026-11-25'::date, 53::integer),
  ('2026-11-25'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-11-25'::date, '2026-11-26'::date, 144::integer),
  ('2026-11-26'::date, 'Dunn'::text, 'Dunn - Thanksgiving'::text, true::boolean, '2026-11-26'::date, '2026-11-30'::date, 142::integer),
  ('2026-11-27'::date, 'Dunn'::text, 'Dunn - Thanksgiving'::text, true::boolean, '2026-11-26'::date, '2026-11-30'::date, 142::integer),
  ('2026-11-28'::date, 'Dunn'::text, 'Dunn - Thanksgiving'::text, true::boolean, '2026-11-26'::date, '2026-11-30'::date, 142::integer),
  ('2026-11-29'::date, 'Dunn'::text, 'Dunn - Thanksgiving'::text, true::boolean, '2026-11-26'::date, '2026-11-30'::date, 142::integer),
  ('2026-11-30'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-11-30'::date, '2026-12-01'::date, 61::integer),
  ('2026-12-01'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-12-01'::date, '2026-12-02'::date, 242::integer),
  ('2026-12-02'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-12-02'::date, '2026-12-03'::date, 148::integer),
  ('2026-12-03'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-12-03'::date, '2026-12-04'::date, 161::integer),
  ('2026-12-04'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-12-04'::date, '2026-12-07'::date, 84::integer),
  ('2026-12-05'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-12-04'::date, '2026-12-07'::date, 84::integer),
  ('2026-12-06'::date, 'Anthony'::text, 'Anthony'::text, true::boolean, '2026-12-04'::date, '2026-12-07'::date, 84::integer),
  ('2026-12-07'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-12-07'::date, '2026-12-08'::date, 99::integer),
  ('2026-12-08'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-12-08'::date, '2026-12-09'::date, 140::integer),
  ('2026-12-09'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-12-09'::date, '2026-12-10'::date, 95::integer),
  ('2026-12-10'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-12-10'::date, '2026-12-11'::date, 104::integer),
  ('2026-12-11'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-12-11'::date, '2026-12-14'::date, 174::integer),
  ('2026-12-12'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-12-11'::date, '2026-12-14'::date, 174::integer),
  ('2026-12-13'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2026-12-11'::date, '2026-12-14'::date, 174::integer),
  ('2026-12-14'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-12-14'::date, '2026-12-15'::date, 17::integer),
  ('2026-12-15'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-12-15'::date, '2026-12-16'::date, 192::integer),
  ('2026-12-16'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-12-16'::date, '2026-12-17'::date, 226::integer),
  ('2026-12-17'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-12-17'::date, '2026-12-18'::date, 223::integer),
  ('2026-12-18'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-12-18'::date, '2026-12-21'::date, 72::integer),
  ('2026-12-19'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-12-18'::date, '2026-12-21'::date, 72::integer),
  ('2026-12-20'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2026-12-18'::date, '2026-12-21'::date, 72::integer),
  ('2026-12-21'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2026-12-21'::date, '2026-12-22'::date, 63::integer),
  ('2026-12-22'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2026-12-22'::date, '2026-12-23'::date, 96::integer),
  ('2026-12-23'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2026-12-23'::date, '2026-12-24'::date, 19::integer),
  ('2026-12-24'::date, 'Baur'::text, 'Baur - Christmas'::text, true::boolean, '2026-12-24'::date, '2026-12-28'::date, 129::integer),
  ('2026-12-25'::date, 'Baur'::text, 'Baur - Christmas'::text, true::boolean, '2026-12-24'::date, '2026-12-28'::date, 129::integer),
  ('2026-12-26'::date, 'Baur'::text, 'Baur - Christmas'::text, true::boolean, '2026-12-24'::date, '2026-12-28'::date, 129::integer),
  ('2026-12-27'::date, 'Baur'::text, 'Baur - Christmas'::text, true::boolean, '2026-12-24'::date, '2026-12-28'::date, 129::integer),
  ('2026-12-28'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2026-12-28'::date, '2026-12-29'::date, 179::integer),
  ('2026-12-29'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2026-12-29'::date, '2026-12-30'::date, 172::integer),
  ('2026-12-30'::date, 'Anthony'::text, 'Anthony'::text, false::boolean, '2026-12-30'::date, '2026-12-31'::date, 65::integer),
  ('2026-12-31'::date, 'Parry'::text, 'Parry -New Year''s'::text, true::boolean, '2026-12-31'::date, '2027-01-04'::date, 33::integer),
  ('2027-01-01'::date, 'Parry'::text, 'Parry -New Year''s'::text, true::boolean, '2026-12-31'::date, '2027-01-04'::date, 33::integer),
  ('2027-01-02'::date, 'Parry'::text, 'Parry -New Year''s'::text, true::boolean, '2026-12-31'::date, '2027-01-04'::date, 33::integer),
  ('2027-01-03'::date, 'Parry'::text, 'Parry -New Year''s'::text, true::boolean, '2026-12-31'::date, '2027-01-04'::date, 33::integer),
  ('2027-01-04'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-01-04'::date, '2027-01-05'::date, 215::integer),
  ('2027-01-05'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-01-05'::date, '2027-01-06'::date, 41::integer),
  ('2027-01-06'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-01-06'::date, '2027-01-07'::date, 59::integer),
  ('2027-01-07'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-01-07'::date, '2027-01-08'::date, 34::integer),
  ('2027-01-08'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-01-08'::date, '2027-01-11'::date, 94::integer),
  ('2027-01-09'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-01-08'::date, '2027-01-11'::date, 94::integer),
  ('2027-01-10'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-01-08'::date, '2027-01-11'::date, 94::integer),
  ('2027-01-11'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-01-11'::date, '2027-01-12'::date, 141::integer),
  ('2027-01-12'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-01-12'::date, '2027-01-13'::date, 247::integer),
  ('2027-01-13'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-01-13'::date, '2027-01-14'::date, 92::integer),
  ('2027-01-14'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-01-14'::date, '2027-01-15'::date, 175::integer),
  ('2027-01-15'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-01-15'::date, '2027-01-18'::date, 136::integer),
  ('2027-01-16'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-01-15'::date, '2027-01-18'::date, 136::integer),
  ('2027-01-17'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-01-15'::date, '2027-01-18'::date, 136::integer),
  ('2027-01-18'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-01-18'::date, '2027-01-19'::date, 158::integer),
  ('2027-01-19'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-01-19'::date, '2027-01-20'::date, 189::integer),
  ('2027-01-20'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-01-20'::date, '2027-01-21'::date, 101::integer),
  ('2027-01-21'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-01-21'::date, '2027-01-22'::date, 201::integer),
  ('2027-01-22'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-01-22'::date, '2027-01-25'::date, 73::integer),
  ('2027-01-23'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-01-22'::date, '2027-01-25'::date, 73::integer),
  ('2027-01-24'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-01-22'::date, '2027-01-25'::date, 73::integer),
  ('2027-01-25'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-01-25'::date, '2027-01-26'::date, 18::integer),
  ('2027-01-26'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-01-26'::date, '2027-01-27'::date, 103::integer),
  ('2027-01-27'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-01-27'::date, '2027-01-28'::date, 89::integer),
  ('2027-01-28'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-01-28'::date, '2027-01-29'::date, 165::integer),
  ('2027-01-29'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-01-29'::date, '2027-02-01'::date, 93::integer),
  ('2027-01-30'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-01-29'::date, '2027-02-01'::date, 93::integer),
  ('2027-01-31'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-01-29'::date, '2027-02-01'::date, 93::integer),
  ('2027-02-01'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-02-01'::date, '2027-02-02'::date, 91::integer),
  ('2027-02-02'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-02-02'::date, '2027-02-03'::date, 240::integer),
  ('2027-02-03'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-02-03'::date, '2027-02-04'::date, 213::integer),
  ('2027-02-04'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-02-04'::date, '2027-02-05'::date, 210::integer),
  ('2027-02-05'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-02-05'::date, '2027-02-08'::date, 49::integer),
  ('2027-02-06'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-02-05'::date, '2027-02-08'::date, 49::integer),
  ('2027-02-07'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-02-05'::date, '2027-02-08'::date, 49::integer),
  ('2027-02-08'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-02-08'::date, '2027-02-09'::date, 71::integer),
  ('2027-02-09'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-02-09'::date, '2027-02-10'::date, 217::integer),
  ('2027-02-10'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-02-10'::date, '2027-02-11'::date, 183::integer),
  ('2027-02-11'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-02-11'::date, '2027-02-12'::date, 15::integer),
  ('2027-02-12'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-02-12'::date, '2027-02-15'::date, 249::integer),
  ('2027-02-13'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-02-12'::date, '2027-02-15'::date, 249::integer),
  ('2027-02-14'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-02-12'::date, '2027-02-15'::date, 249::integer),
  ('2027-02-15'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-02-15'::date, '2027-02-16'::date, 66::integer),
  ('2027-02-16'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-02-16'::date, '2027-02-17'::date, 98::integer),
  ('2027-02-17'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-02-17'::date, '2027-02-18'::date, 12::integer),
  ('2027-02-18'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-02-18'::date, '2027-02-19'::date, 51::integer),
  ('2027-02-19'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-02-19'::date, '2027-02-22'::date, 251::integer),
  ('2027-02-20'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-02-19'::date, '2027-02-22'::date, 251::integer),
  ('2027-02-21'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-02-19'::date, '2027-02-22'::date, 251::integer),
  ('2027-02-22'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-02-22'::date, '2027-02-23'::date, 138::integer),
  ('2027-02-23'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-02-23'::date, '2027-02-24'::date, 186::integer),
  ('2027-02-24'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-02-24'::date, '2027-02-25'::date, 216::integer),
  ('2027-02-25'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-02-25'::date, '2027-02-26'::date, 121::integer),
  ('2027-02-26'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-02-26'::date, '2027-03-01'::date, 128::integer),
  ('2027-02-27'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-02-26'::date, '2027-03-01'::date, 128::integer),
  ('2027-02-28'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-02-26'::date, '2027-03-01'::date, 128::integer),
  ('2027-03-01'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-03-01'::date, '2027-03-02'::date, 23::integer),
  ('2027-03-02'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-03-02'::date, '2027-03-03'::date, 236::integer),
  ('2027-03-03'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-03-03'::date, '2027-03-04'::date, 204::integer),
  ('2027-03-04'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-03-04'::date, '2027-03-05'::date, 67::integer),
  ('2027-03-05'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-03-05'::date, '2027-03-08'::date, 124::integer),
  ('2027-03-06'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-03-05'::date, '2027-03-08'::date, 124::integer),
  ('2027-03-07'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-03-05'::date, '2027-03-08'::date, 124::integer),
  ('2027-03-08'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-03-08'::date, '2027-03-09'::date, 69::integer),
  ('2027-03-09'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-03-09'::date, '2027-03-10'::date, 38::integer),
  ('2027-03-10'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-03-10'::date, '2027-03-11'::date, 145::integer),
  ('2027-03-11'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-03-11'::date, '2027-03-12'::date, 159::integer),
  ('2027-03-12'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-03-12'::date, '2027-03-15'::date, 211::integer),
  ('2027-03-13'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-03-12'::date, '2027-03-15'::date, 211::integer),
  ('2027-03-14'::date, 'Fang'::text, 'Fang'::text, true::boolean, '2027-03-12'::date, '2027-03-15'::date, 211::integer),
  ('2027-03-15'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-03-15'::date, '2027-03-16'::date, 48::integer),
  ('2027-03-16'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-03-16'::date, '2027-03-17'::date, 203::integer),
  ('2027-03-17'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-03-17'::date, '2027-03-18'::date, 87::integer),
  ('2027-03-18'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-03-18'::date, '2027-03-19'::date, 214::integer),
  ('2027-03-19'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-03-19'::date, '2027-03-22'::date, 167::integer),
  ('2027-03-20'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-03-19'::date, '2027-03-22'::date, 167::integer),
  ('2027-03-21'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-03-19'::date, '2027-03-22'::date, 167::integer),
  ('2027-03-22'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-03-22'::date, '2027-03-23'::date, 83::integer),
  ('2027-03-23'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-03-23'::date, '2027-03-24'::date, 205::integer),
  ('2027-03-24'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-03-24'::date, '2027-03-25'::date, 147::integer),
  ('2027-03-25'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-03-25'::date, '2027-03-26'::date, 110::integer),
  ('2027-03-26'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-03-26'::date, '2027-03-29'::date, 25::integer),
  ('2027-03-27'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-03-26'::date, '2027-03-29'::date, 25::integer),
  ('2027-03-28'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-03-26'::date, '2027-03-29'::date, 25::integer),
  ('2027-03-29'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-03-29'::date, '2027-03-30'::date, 250::integer),
  ('2027-03-30'::date, 'Fang'::text, 'Fang'::text, false::boolean, '2027-03-30'::date, '2027-03-31'::date, 218::integer),
  ('2027-03-31'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-03-31'::date, '2027-04-01'::date, 153::integer),
  ('2027-04-01'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-04-01'::date, '2027-04-02'::date, 45::integer),
  ('2027-04-02'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-04-02'::date, '2027-04-05'::date, 32::integer),
  ('2027-04-03'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-04-02'::date, '2027-04-05'::date, 32::integer),
  ('2027-04-04'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-04-02'::date, '2027-04-05'::date, 32::integer),
  ('2027-04-05'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-04-05'::date, '2027-04-06'::date, 169::integer),
  ('2027-04-06'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-04-06'::date, '2027-04-07'::date, 200::integer),
  ('2027-04-07'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-04-07'::date, '2027-04-08'::date, 90::integer),
  ('2027-04-08'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-04-08'::date, '2027-04-09'::date, 115::integer),
  ('2027-04-09'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-04-09'::date, '2027-04-12'::date, 162::integer),
  ('2027-04-10'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-04-09'::date, '2027-04-12'::date, 162::integer),
  ('2027-04-11'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-04-09'::date, '2027-04-12'::date, 162::integer),
  ('2027-04-12'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-04-12'::date, '2027-04-13'::date, 85::integer),
  ('2027-04-13'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-04-13'::date, '2027-04-14'::date, 243::integer),
  ('2027-04-14'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-04-14'::date, '2027-04-15'::date, 246::integer),
  ('2027-04-15'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-04-15'::date, '2027-04-16'::date, 139::integer),
  ('2027-04-16'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-04-16'::date, '2027-04-19'::date, 56::integer),
  ('2027-04-17'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-04-16'::date, '2027-04-19'::date, 56::integer),
  ('2027-04-18'::date, 'Parry'::text, 'Parry'::text, true::boolean, '2027-04-16'::date, '2027-04-19'::date, 56::integer),
  ('2027-04-19'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-04-19'::date, '2027-04-20'::date, 44::integer),
  ('2027-04-20'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-04-20'::date, '2027-04-21'::date, 160::integer),
  ('2027-04-21'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-04-21'::date, '2027-04-22'::date, 57::integer),
  ('2027-04-22'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-04-22'::date, '2027-04-23'::date, 62::integer),
  ('2027-04-23'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-04-23'::date, '2027-04-26'::date, 233::integer),
  ('2027-04-24'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-04-23'::date, '2027-04-26'::date, 233::integer),
  ('2027-04-25'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-04-23'::date, '2027-04-26'::date, 233::integer),
  ('2027-04-26'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-04-26'::date, '2027-04-27'::date, 252::integer),
  ('2027-04-27'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-04-27'::date, '2027-04-28'::date, 82::integer),
  ('2027-04-28'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-04-28'::date, '2027-04-29'::date, 5::integer),
  ('2027-04-29'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-04-29'::date, '2027-04-30'::date, 4::integer),
  ('2027-04-30'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-04-30'::date, '2027-05-03'::date, 7::integer),
  ('2027-05-01'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-04-30'::date, '2027-05-03'::date, 7::integer),
  ('2027-05-02'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-04-30'::date, '2027-05-03'::date, 7::integer),
  ('2027-05-03'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-05-03'::date, '2027-05-04'::date, 14::integer),
  ('2027-05-04'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-05-04'::date, '2027-05-05'::date, 31::integer),
  ('2027-05-05'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-05-05'::date, '2027-05-06'::date, 42::integer),
  ('2027-05-06'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-05-06'::date, '2027-05-07'::date, 154::integer),
  ('2027-05-07'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-05-07'::date, '2027-05-10'::date, 114::integer),
  ('2027-05-08'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-05-07'::date, '2027-05-10'::date, 114::integer),
  ('2027-05-09'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-05-07'::date, '2027-05-10'::date, 114::integer),
  ('2027-05-10'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-05-10'::date, '2027-05-11'::date, 181::integer),
  ('2027-05-11'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-05-11'::date, '2027-05-12'::date, 113::integer),
  ('2027-05-12'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-05-12'::date, '2027-05-13'::date, 197::integer),
  ('2027-05-13'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-05-13'::date, '2027-05-14'::date, 75::integer),
  ('2027-05-14'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-05-14'::date, '2027-05-17'::date, 109::integer),
  ('2027-05-15'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-05-14'::date, '2027-05-17'::date, 109::integer),
  ('2027-05-16'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-05-14'::date, '2027-05-17'::date, 109::integer),
  ('2027-05-17'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-05-17'::date, '2027-05-18'::date, 46::integer),
  ('2027-05-18'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-05-18'::date, '2027-05-19'::date, 239::integer),
  ('2027-05-19'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-05-19'::date, '2027-05-20'::date, 78::integer),
  ('2027-05-20'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-05-20'::date, '2027-05-21'::date, 117::integer),
  ('2027-05-21'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-05-21'::date, '2027-05-24'::date, 55::integer),
  ('2027-05-22'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-05-21'::date, '2027-05-24'::date, 55::integer),
  ('2027-05-23'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-05-21'::date, '2027-05-24'::date, 55::integer),
  ('2027-05-24'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-05-24'::date, '2027-05-25'::date, 119::integer),
  ('2027-05-25'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-05-25'::date, '2027-05-26'::date, 256::integer),
  ('2027-05-26'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-05-26'::date, '2027-05-27'::date, 180::integer),
  ('2027-05-27'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-05-27'::date, '2027-05-28'::date, 199::integer),
  ('2027-05-28'::date, 'Tingey'::text, 'Tingey - Memorial Day'::text, true::boolean, '2027-05-28'::date, '2027-06-01'::date, 43::integer),
  ('2027-05-29'::date, 'Tingey'::text, 'Tingey - Memorial Day'::text, true::boolean, '2027-05-28'::date, '2027-06-01'::date, 43::integer),
  ('2027-05-30'::date, 'Tingey'::text, 'Tingey - Memorial Day'::text, true::boolean, '2027-05-28'::date, '2027-06-01'::date, 43::integer),
  ('2027-05-31'::date, 'Tingey'::text, 'Tingey - Memorial Day'::text, true::boolean, '2027-05-28'::date, '2027-06-01'::date, 43::integer),
  ('2027-06-01'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-06-01'::date, '2027-06-02'::date, 13::integer),
  ('2027-06-02'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-06-02'::date, '2027-06-03'::date, 79::integer),
  ('2027-06-03'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-06-03'::date, '2027-06-04'::date, 193::integer),
  ('2027-06-04'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-06-04'::date, '2027-06-07'::date, 241::integer),
  ('2027-06-05'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-06-04'::date, '2027-06-07'::date, 241::integer),
  ('2027-06-06'::date, 'Baur'::text, 'Baur'::text, true::boolean, '2027-06-04'::date, '2027-06-07'::date, 241::integer),
  ('2027-06-07'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-06-07'::date, '2027-06-08'::date, 100::integer),
  ('2027-06-08'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-06-08'::date, '2027-06-09'::date, 224::integer),
  ('2027-06-09'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-06-09'::date, '2027-06-10'::date, 81::integer),
  ('2027-06-10'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-06-10'::date, '2027-06-11'::date, 195::integer),
  ('2027-06-11'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-06-11'::date, '2027-06-14'::date, 176::integer),
  ('2027-06-12'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-06-11'::date, '2027-06-14'::date, 176::integer),
  ('2027-06-13'::date, 'McNair'::text, 'McNair'::text, true::boolean, '2027-06-11'::date, '2027-06-14'::date, 176::integer),
  ('2027-06-14'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-06-14'::date, '2027-06-15'::date, 74::integer),
  ('2027-06-15'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-06-15'::date, '2027-06-16'::date, 80::integer),
  ('2027-06-16'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-06-16'::date, '2027-06-17'::date, 54::integer),
  ('2027-06-17'::date, 'Dunn'::text, 'Dunn'::text, false::boolean, '2027-06-17'::date, '2027-06-18'::date, 11::integer),
  ('2027-06-18'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-06-18'::date, '2027-06-21'::date, 20::integer),
  ('2027-06-19'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-06-18'::date, '2027-06-21'::date, 20::integer),
  ('2027-06-20'::date, 'Dunn'::text, 'Dunn'::text, true::boolean, '2027-06-18'::date, '2027-06-21'::date, 20::integer),
  ('2027-06-21'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-06-21'::date, '2027-06-22'::date, 194::integer),
  ('2027-06-22'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-06-22'::date, '2027-06-23'::date, 116::integer),
  ('2027-06-23'::date, 'Tingey'::text, 'Tingey'::text, false::boolean, '2027-06-23'::date, '2027-06-24'::date, 3::integer),
  ('2027-06-24'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-06-24'::date, '2027-06-25'::date, 16::integer),
  ('2027-06-25'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-06-25'::date, '2027-06-28'::date, 150::integer),
  ('2027-06-26'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-06-25'::date, '2027-06-28'::date, 150::integer),
  ('2027-06-27'::date, 'Tingey'::text, 'Tingey'::text, true::boolean, '2027-06-25'::date, '2027-06-28'::date, 150::integer),
  ('2027-06-28'::date, 'McNair'::text, 'McNair'::text, false::boolean, '2027-06-28'::date, '2027-06-29'::date, 120::integer),
  ('2027-06-29'::date, 'Baur'::text, 'Baur'::text, false::boolean, '2027-06-29'::date, '2027-06-30'::date, 9::integer),
  ('2027-06-30'::date, 'Parry'::text, 'Parry'::text, false::boolean, '2027-06-30'::date, '2027-07-01'::date, 152::integer);

create temp table corrected_2026_2027_call_schedule_insert_counts (
  staged_count integer not null,
  inserted_count integer not null default 0
) on commit drop;

insert into corrected_2026_2027_call_schedule_insert_counts (staged_count)
select count(*)
from corrected_2026_2027_call_schedule_stage;

do $$
declare
  v_bad_assignees text;
  v_bad_dates text;
  v_missing_dates text;
  v_min_date date;
  v_max_date date;
  v_staged_count integer;
begin
  select min(call_date), max(call_date), count(*)
    into v_min_date, v_max_date, v_staged_count
  from corrected_2026_2027_call_schedule_stage;

  if v_staged_count = 0 then
    raise exception 'Corrected call schedule import staged zero rows';
  end if;

  with match_counts as (
    select
      s.assignee_name,
      string_agg(distinct s.raw_summary, ', ' order by s.raw_summary) as source_summaries,
      count(distinct r.id) as match_count
    from corrected_2026_2027_call_schedule_stage s
    left join public.program_roster r
      on r.program_id = '9ebe4ba1-4a2f-43ce-9d4d-0b7a603ea047'::uuid
     and (
       lower(trim(r.last_name)) = lower(trim(s.assignee_name))
       or lower(trim(r.full_name)) = lower(trim(s.assignee_name))
     )
    group by s.assignee_name
  )
  select string_agg(format('%s (%s matches; source SUMMARY: %s)', assignee_name, match_count, source_summaries), ', ' order by assignee_name)
    into v_bad_assignees
  from match_counts
  where match_count <> 1;

  if v_bad_assignees is not null then
    raise exception 'Corrected call schedule import aborted: staged assignees must match exactly one roster row: %', v_bad_assignees;
  end if;

  select string_agg(format('%s (%s assignments)', call_date, assignment_count), ', ' order by call_date)
    into v_bad_dates
  from (
    select call_date, count(*) as assignment_count
    from corrected_2026_2027_call_schedule_stage
    group by call_date
    having count(*) <> 1
  ) bad_date_counts;

  if v_bad_dates is not null then
    raise exception 'Corrected call schedule import aborted: staged dates must have exactly one assignment: %', v_bad_dates;
  end if;

  select string_agg(missing_date::text, ', ' order by missing_date)
    into v_missing_dates
  from generate_series(v_min_date, v_max_date, interval '1 day') as g(missing_date)
  where not exists (
    select 1
    from corrected_2026_2027_call_schedule_stage s
    where s.call_date = g.missing_date::date
  );

  if v_missing_dates is not null then
    raise exception 'Corrected call schedule import aborted: staged date range has missing dates: %', v_missing_dates;
  end if;
end $$;

delete from public.call_assignments ca
using (
  select min(call_date) as min_date, max(call_date) as max_date
  from corrected_2026_2027_call_schedule_stage
) staged_range
where ca.program_id = '9ebe4ba1-4a2f-43ce-9d4d-0b7a603ea047'::uuid
  and ca.call_date between staged_range.min_date and staged_range.max_date;

with matched_stage as (
  select
    s.call_date,
    s.assignee_name,
    s.raw_summary,
    s.source_is_multiday,
    r.id as roster_id,
    r.program_membership_id
  from corrected_2026_2027_call_schedule_stage s
  join public.program_roster r
    on r.program_id = '9ebe4ba1-4a2f-43ce-9d4d-0b7a603ea047'::uuid
   and (
     lower(trim(r.last_name)) = lower(trim(s.assignee_name))
     or lower(trim(r.full_name)) = lower(trim(s.assignee_name))
   )
), inserted as (
  insert into public.call_assignments (
    id,
    created_at,
    program_id,
    program_membership_id,
    call_type,
    call_date,
    start_datetime,
    end_datetime,
    site,
    is_home_call,
    notes,
    created_by,
    updated_at,
    roster_id,
    last_swap_request_id,
    last_modified_by_roster_id,
    last_modified_reason
  )
  select
    gen_random_uuid(),
    now(),
    '9ebe4ba1-4a2f-43ce-9d4d-0b7a603ea047'::uuid,
    ms.program_membership_id,
    case when extract(dow from ms.call_date) in (0, 5, 6) then 'weekend' else 'weekday' end,
    ms.call_date,
    ms.call_date::timestamp at time zone 'UTC',
    (ms.call_date + 1)::timestamp at time zone 'UTC',
    null,
    true,
    'Imported 2026-2027 corrected call schedule - Baur' ||
      case when ms.source_is_multiday then ' [Expanded from multi-day ICS event]' else '' end ||
      case when ms.raw_summary <> ms.assignee_name then ' [Source SUMMARY: ' || ms.raw_summary || ']' else '' end,
    null,
    now(),
    ms.roster_id,
    null,
    null,
    'Corrected 2026-2027 call schedule import from ICS'
  from matched_stage ms
  order by ms.call_date
  returning id
)
update corrected_2026_2027_call_schedule_insert_counts
set inserted_count = (select count(*) from inserted);

do $$
declare
  v_staged_count integer;
  v_inserted_count integer;
begin
  select staged_count, inserted_count
    into v_staged_count, v_inserted_count
  from corrected_2026_2027_call_schedule_insert_counts;

  if v_inserted_count <> v_staged_count then
    raise exception 'Corrected call schedule import aborted: inserted row count % does not equal staged row count %', v_inserted_count, v_staged_count;
  end if;
end $$;

select
  (select min(call_date) from corrected_2026_2027_call_schedule_stage) as min_date,
  (select max(call_date) from corrected_2026_2027_call_schedule_stage) as max_date,
  (select count(*) from corrected_2026_2027_call_schedule_stage) as staged_row_count,
  (select inserted_count from corrected_2026_2027_call_schedule_insert_counts) as inserted_row_count,
  (
    select jsonb_object_agg(assignee_name, assignment_count order by assignee_name)
    from (
      select assignee_name, count(*) as assignment_count
      from corrected_2026_2027_call_schedule_stage
      group by assignee_name
    ) resident_counts
  ) as count_by_resident;

commit;
