begin;set transaction read only;
select table_name from information_schema.tables where table_schema='public'and table_name in('anki_editor_incorporation_batches','anki_editor_incorporation_items','anki_kg_expansion_review_packets','anki_kg_expansion_review_actions','anki_deck_release_artifacts','anki_deck_media_assets','anki_deck_sync_acknowledgements')order by table_name;
select relname,relrowsecurity,relforcerowsecurity from pg_class where relname in('anki_editor_incorporation_batches','anki_editor_incorporation_items','anki_kg_expansion_review_packets','anki_kg_expansion_review_actions','anki_deck_release_artifacts','anki_deck_media_assets','anki_deck_sync_acknowledgements')order by relname;
rollback;
