-- ============================================================================
-- Anki import service-role grants
-- Ensure dev/admin import scripts can read and write the new Anki foundation.
-- ============================================================================

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.anki_import_batches to service_role;
grant select, insert, update, delete on table public.anki_decks to service_role;
grant select, insert, update, delete on table public.anki_note_models to service_role;
grant select, insert, update, delete on table public.anki_notes to service_role;
grant select, insert, update, delete on table public.anki_cards to service_role;
grant select, insert, update, delete on table public.anki_tags to service_role;
grant select, insert, update, delete on table public.anki_note_tags to service_role;
grant select, insert, update, delete on table public.anki_media_refs to service_role;
grant select, insert, update, delete on table public.canonical_cards to service_role;
grant select, insert, update, delete on table public.canonical_card_versions to service_role;
grant select, insert, update, delete on table public.card_quality_reviews to service_role;
grant select, insert, update, delete on table public.card_training_level_links to service_role;
grant select, insert, update, delete on table public.card_knowledge_links to service_role;
