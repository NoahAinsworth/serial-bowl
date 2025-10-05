# Database Setup Instructions

Since you're using an existing Supabase project, you'll need to run the following SQL in your Supabase SQL Editor:

## Step 1: Run the Schema Migration

Copy and paste the contents of `docs/schema.sql` into your Supabase SQL Editor and execute it.

This will create all the necessary tables, functions, and RLS policies for Serialcereal.

## Step 2: Storage Buckets

Create two storage buckets in your Supabase project:

1. **serialcereal** (public read enabled)
2. **avatars** (public read enabled)

For the `avatars` bucket, add this RLS policy:
```sql
-- Allow users to upload their own avatar
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 3: Verify

After running the migration, verify these tables exist:
- profiles
- user_roles
- follows
- content
- ratings
- watches
- thoughts
- reactions
- comments
- dms
- aggregates

You're all set! The app will now be able to store and retrieve data.
