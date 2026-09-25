-- Review proposals are machine-created but must never be submitted by a
-- browser role. Canonical promotion remains a separate, reviewer-gated path.
revoke all on table public.kg_automation_proposals from anon, authenticated;
alter table public.kg_automation_proposals enable row level security;
alter table public.kg_automation_proposals force row level security;
