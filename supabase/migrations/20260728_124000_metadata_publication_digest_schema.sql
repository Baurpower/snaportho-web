begin;

alter function public.guard_metadata_release_lifecycle()
  set search_path = public, extensions;

alter function public.guard_rendered_anki_manifest_lifecycle()
  set search_path = public, extensions;

commit;
