-- Rename editable deck names and operational labels; preserve immutable release payloads.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.anki_decks, public.anki_kg_mapping_runs, public.metadata_pipeline_batches IN SHARE ROW EXCLUSIVE MODE;
DO $rename$
DECLARE legacy_root text := $name$Marty McFlyin's Ortho Deck$name$; actual_count bigint; actual_hash text;
BEGIN
  SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY t.id),'')) INTO actual_count,actual_hash FROM public.anki_decks t WHERE to_jsonb(t)::text ~* 'marty|mcfly';
  IF actual_count<>817 OR actual_hash<>'f55efbd083b2ba465e3408faee7ebe2c' THEN RAISE EXCEPTION 'Before-state changed: anki_decks'; END IF;
  UPDATE public.anki_decks t SET full_name=replace(full_name,legacy_root,'SnapOrtho'), deck_name=replace(deck_name,legacy_root,'SnapOrtho'), deck_path=array_replace(deck_path,legacy_root,'SnapOrtho') WHERE to_jsonb(t)::text ~* 'marty|mcfly';
  GET DIAGNOSTICS actual_count = ROW_COUNT;
  IF actual_count<>817 THEN RAISE EXCEPTION 'Unexpected rename count: anki_decks'; END IF;
  IF EXISTS(SELECT 1 FROM public.anki_decks t WHERE to_jsonb(t)::text ~* 'marty|mcfly') THEN RAISE EXCEPTION 'Old name remains: anki_decks'; END IF;
  SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY t.id),'')) INTO actual_count,actual_hash FROM public.anki_kg_mapping_runs t WHERE to_jsonb(t)::text ~* 'marty|mcfly';
  IF actual_count<>4 OR actual_hash<>'c77a69fde5036838876501d3b83b09b5' THEN RAISE EXCEPTION 'Before-state changed: anki_kg_mapping_runs'; END IF;
  UPDATE public.anki_kg_mapping_runs t SET deck_prefix=replace(deck_prefix,legacy_root,'SnapOrtho'), metadata=replace(metadata::text,legacy_root,'SnapOrtho')::jsonb WHERE to_jsonb(t)::text ~* 'marty|mcfly';
  GET DIAGNOSTICS actual_count = ROW_COUNT;
  IF actual_count<>4 THEN RAISE EXCEPTION 'Unexpected rename count: anki_kg_mapping_runs'; END IF;
  IF EXISTS(SELECT 1 FROM public.anki_kg_mapping_runs t WHERE to_jsonb(t)::text ~* 'marty|mcfly') THEN RAISE EXCEPTION 'Old name remains: anki_kg_mapping_runs'; END IF;
  SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY t.id),'')) INTO actual_count,actual_hash FROM public.metadata_pipeline_batches t WHERE to_jsonb(t)::text ~* 'marty|mcfly';
  IF actual_count<>2312 OR actual_hash<>'0f4ea40358fa4fdfc3e344123632a934' THEN RAISE EXCEPTION 'Before-state changed: metadata_pipeline_batches'; END IF;
  UPDATE public.metadata_pipeline_batches t SET cohort_key=replace(cohort_key,legacy_root,'SnapOrtho') WHERE to_jsonb(t)::text ~* 'marty|mcfly';
  GET DIAGNOSTICS actual_count = ROW_COUNT;
  IF actual_count<>2312 THEN RAISE EXCEPTION 'Unexpected rename count: metadata_pipeline_batches'; END IF;
  IF EXISTS(SELECT 1 FROM public.metadata_pipeline_batches t WHERE to_jsonb(t)::text ~* 'marty|mcfly') THEN RAISE EXCEPTION 'Old name remains: metadata_pipeline_batches'; END IF;
END $rename$;
COMMIT;
SELECT count(*) FILTER (WHERE full_name='SnapOrtho' OR full_name LIKE 'SnapOrtho::%') snaportho_decks,count(*) FILTER (WHERE to_jsonb(t)::text ~* 'marty|mcfly') old_name_decks FROM public.anki_decks t;
