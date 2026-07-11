/*
  # Prefix mathipulatifs-plai table names

  ## Why
  This app's tables (`sessions`, `exercises`, `teachers`, `gallery`) were
  created unprefixed in a Supabase project shared with several other PLAI
  apps. This already caused a real incident: another app's migration
  tried to create its own `sessions` table, silently no-op'd because the
  name was taken, and never persisted data correctly for months.

  This app owns these tables outright (no competing table exists under
  the prefixed names), so a plain RENAME is safe: it preserves all rows,
  indexes, RLS policies and foreign keys automatically (Postgres ties
  policies/FKs to the table's OID, not its name).

  ## Changes
  Rename sessions -> mathip_sessions, exercises -> mathip_exercises,
  teachers -> mathip_teachers, gallery -> mathip_gallery.
*/

ALTER TABLE IF EXISTS public.sessions RENAME TO mathip_sessions;
ALTER TABLE IF EXISTS public.exercises RENAME TO mathip_exercises;
ALTER TABLE IF EXISTS public.teachers RENAME TO mathip_teachers;
ALTER TABLE IF EXISTS public.gallery RENAME TO mathip_gallery;
