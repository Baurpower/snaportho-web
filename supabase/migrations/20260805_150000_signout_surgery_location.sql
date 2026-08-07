-- Sign-out cards: surgery + location facets, and POD-from-date.
--
-- POD is now derived from surgery_date (today − surgery_date) instead of a manual
-- counter, so it never drifts and handles planned (future) surgery as pre-op. The old
-- pod_number column is dropped in 20260806_120000_signout_drop_pod_number.sql.
-- Location is a new non-identifying facet (room/floor/unit). All plaintext facets.

begin;

alter table public.signout_cards
  add column if not exists location text,
  add column if not exists surgery text,
  add column if not exists surgery_date date;

commit;
