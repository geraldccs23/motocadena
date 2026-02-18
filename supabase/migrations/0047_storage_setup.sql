-- Migration 0047_storage_setup.sql
-- Setup Supabase Storage for MOTOCADENA (Unified Bucket)

-- 1. Create the unified bucket
-- Public bucket with 5MB limit and only images allowed
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'motocadena', 
    'motocadena', 
    true, 
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Clean up old bucket (optional, but good for migration)
-- DELETE FROM storage.buckets WHERE id = 'products';

-- 3. Policies for motocadena bucket
-- Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'motocadena' );

-- Allow authenticated users to upload/manage images
CREATE POLICY "Admin Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'motocadena' );

CREATE POLICY "Admin Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'motocadena' );

CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'motocadena' );
