-- Afflio - prevent anonymous enumeration of campaign image object names.
-- The bucket remains public, so exact public asset URLs continue to work
-- without a storage.objects SELECT policy.

drop policy if exists "campaign-images: public read" on storage.objects;
