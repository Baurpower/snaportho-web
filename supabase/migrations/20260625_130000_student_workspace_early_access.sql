alter table public.student_workspace_profiles
  add column if not exists expected_graduation_year integer null;

alter table public.student_workspace_profiles
  drop constraint if exists student_workspace_profiles_expected_graduation_year_check;

alter table public.student_workspace_profiles
  add constraint student_workspace_profiles_expected_graduation_year_check
  check (
    expected_graduation_year is null
    or expected_graduation_year between 2025 and 2100
  );
