-- Add an Attending facet to sign-out cards.
--
-- Matches the real-world handoff layout (Attending is the primary grouping column).
-- Non-identifying operational data, so it lives as a plaintext facet like severity/POD.

begin;

alter table public.signout_cards
  add column if not exists attending text;

commit;
