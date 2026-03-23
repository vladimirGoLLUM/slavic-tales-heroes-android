
-- Create public storage bucket for 3D hero models
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('hero-models', 'hero-models', true, 104857600);

-- Allow public read access
CREATE POLICY "Public read access for hero models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hero-models');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload for hero models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hero-models');
