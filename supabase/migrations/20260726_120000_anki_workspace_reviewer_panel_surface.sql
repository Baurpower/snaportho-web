-- Allow side-panel enrichment proposals as a distinct source surface.
alter table public.anki_editor_workspace_proposals
  drop constraint if exists anki_editor_workspace_surface;

alter table public.anki_editor_workspace_proposals
  add constraint anki_editor_workspace_surface
  check (source_surface in ('browser', 'reviewer', 'reviewer_panel', 'dashboard'));
