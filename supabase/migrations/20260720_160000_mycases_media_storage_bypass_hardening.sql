-- Close the authenticated-client Storage bypass left by the first educational
-- media migration. This intentionally defines no replacement client policies:
-- the service-role-backed Next.js API is the sole object access boundary.
--
-- Keep this as a later migration even though 150000 is also corrected. Fresh
-- databases get the secure definition from 150000; databases that previously
-- recorded 150000 still converge when this migration runs.
begin;

drop policy if exists mycases_educational_media_select_own on storage.objects;
drop policy if exists mycases_educational_media_insert_own on storage.objects;
drop policy if exists mycases_educational_media_update_own on storage.objects;
drop policy if exists mycases_educational_media_delete_own on storage.objects;

commit;
