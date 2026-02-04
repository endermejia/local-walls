# Supabase Configuration Instructions

## 1. Storage Buckets

You need to create a new storage bucket named `ascents` if it doesn't exist.

```sql
-- Create the 'ascents' bucket (public)
insert into storage.buckets (id, name, public)
values ('ascents', 'ascents', true)
on conflict (id) do nothing;
```

## 2. Storage Policies (RLS)

Set up Row Level Security policies for the `ascents` bucket to allow public read access and authenticated upload/delete.

```sql
-- Allow public read access to all files in 'ascents'
create policy "Public Access Ascents"
  on storage.objects for select
  using ( bucket_id = 'ascents' );

-- Allow authenticated users to upload files to their own folder (userId/*)
create policy "Authenticated Insert Ascents"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'ascents' and (storage.foldername(name))[1] = auth.uid()::text );

-- Allow authenticated users to update/delete their own files
create policy "Authenticated Delete Ascents"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'ascents' and (storage.foldername(name))[1] = auth.uid()::text );
```

## 3. Database Triggers for Cleanup

To automatically delete the photo file from storage when the corresponding record is deleted from the database.

### 3.1 Cleanup Ascent Photos

When a row in `route_ascents` is deleted, the corresponding file in `ascents` bucket should be deleted.

```sql
-- Function to delete file from storage
create or replace function delete_ascent_photo()
returns trigger as $$
begin
  if old.photo_path is not null then
    -- perform the delete via internal API or just let it be orphaned if you don't have pg_net/http extension
    -- Note: Standard Supabase doesn't support deleting storage objects easily from PL/pgSQL without an extension.
    -- However, you can use the 'supabase_functions' schema if available, or just rely on client-side deletion (which we handle in the form for explicit removal).
    -- BUT, for cascade delete (e.g. user deleted), we want automatic cleanup.

    -- Option A: Use a dedicated Edge Function triggered by Database Webhook (Recommended for complex logic)

    -- Option B: Basic HTTP call if extensions are enabled (pg_net) to the Storage API.

    -- Since we can't easily write the exact deletion code without knowing installed extensions,
    -- we recommend using a Supabase Database Webhook that calls an Edge Function 'cleanup-storage'
    -- passing the bucket and path.
  end if;
  return old;
end;
$$ language plpgsql;

-- Trigger definition (Conceptual)
-- create trigger on_ascent_delete
-- after delete on route_ascents
-- for each row execute function delete_ascent_photo();
```

**Alternative (Simpler):** Run a scheduled script or use a cron job to clean up orphaned files in storage that are not referenced in `route_ascents`.

### 3.2 Cleanup Topo Photos

When a row in `topos` is deleted, its photo should be removed from the `topos` bucket.

```sql
-- Similar logic applies. The file path is stored in 'photo' column of 'topos' table.
-- Bucket: 'topos'
```

### 3.3 Cascade Deletion Logic

Supabase handles cascade deletion of database rows automatically if Foreign Keys are set with `ON DELETE CASCADE`.
- `route_ascents` has `user_id` -> `users.id` (likely cascades).
- `route_ascents` has `route_id` -> `routes.id` (likely cascades).
- `routes` has `crag_id` -> `crags.id` (likely cascades).
- `crags` has `area_id` -> `areas.id` (likely cascades).

So if a Route is deleted, all its Ascents are deleted.
If an Area is deleted, all Crags -> Routes -> Ascents are deleted.

To ensure the **files** are also deleted, you must implement the Storage Cleanup logic (via Webhooks or Cron) because Postgres Triggers cannot directly delete files from S3/Storage without specific extensions.

**Recommendation:**
Deploy a Supabase Edge Function `storage-cleanup` and set up a Database Webhook on `DELETE` events for `route_ascents` and `topos` tables.

## 4. Frontend Helper

A helper file `src/utils/upload-route-ascent-photo.ts` has been created to handle client-side uploads.
