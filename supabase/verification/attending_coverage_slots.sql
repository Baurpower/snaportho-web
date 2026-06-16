-- Verification SQL for Attending Coverage Slots backend/schema fix.
-- Run in Supabase SQL editor or against the DB to audit state.
-- Expected: all checks pass after migration applied and NOTIFY or restart.

-- 1. Does the slots table exist?
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'program_attending_coverage_slots'
ORDER BY ordinal_position;

-- 2. Does the assignments table have slot_id column?
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'program_call_attending_assignments' AND column_name = 'slot_id';

-- 3. Does slot_id have FK to slots table?
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public'
  AND cls.relname = 'program_call_attending_assignments'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) ILIKE '%slot_id%program_attending_coverage_slots%';

-- 4. Default ORTHO slots for programs with data?
SELECT p.id AS program_id, p.name AS program_name, s.id AS slot_id, s.name, s.abbreviation, s.is_active
FROM public.programs p
LEFT JOIN public.program_attending_coverage_slots s ON s.program_id = p.id AND lower(s.name) = 'ortho'
WHERE EXISTS (SELECT 1 FROM public.program_attendings pa WHERE pa.program_id = p.id)
   OR EXISTS (SELECT 1 FROM public.program_call_attending_assignments pca WHERE pca.program_id = p.id)
ORDER BY p.name;

-- 5. Any active assignments with null slot_id? (should be 0 post-migration)
SELECT COUNT(*) AS null_slot_assignments
FROM public.program_call_attending_assignments
WHERE is_active = true AND slot_id IS NULL;

-- 6. Duplicate program/date/slot? (should be 0)
SELECT program_id, coverage_date, slot_id, COUNT(*) AS dup_count
FROM public.program_call_attending_assignments
WHERE is_active = true
GROUP BY program_id, coverage_date, slot_id
HAVING COUNT(*) > 1;

-- 7. RLS enabled on relevant tables?
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('program_attendings', 'program_call_attending_assignments', 'program_attending_coverage_slots');

-- 8. Policies on slots table?
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'program_attending_coverage_slots';

-- 9. Policies on assignments table (should have the member/editor ones)?
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'program_call_attending_assignments'
ORDER BY policyname;

-- 10. Check indexes on slots and slot-related on assignments.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename = 'program_attending_coverage_slots' OR indexdef ILIKE '%slot_id%')
ORDER BY tablename, indexname;

-- 11. Atomic month replacement RPC should exist with the 3-argument signature.
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_arguments(p.oid) AS named_arguments,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'replace_program_call_attending_assignments_month';

-- Expected named_arguments:
-- target_program_id uuid, target_month_start date, replacement_assignments jsonb
-- Expected security_definer: false (SECURITY INVOKER preserves assignment RLS).

-- 12. The obsolete program/date/scope-only active index should be absent.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'program_call_attending_assignments'
  AND indexname = 'program_call_attending_assignments_active_identity_idx';

-- If any check fails (e.g. no slot_id column, no FK, null slots on assignments,
-- missing RLS/RPC, or the obsolete identity index remains), apply the migration
-- 20260610_... and run:
-- NOTIFY pgrst, 'reload schema';
-- Or restart the Supabase/PostgREST service.
