-- Create storage policy to allow authenticated users to upload to their own folder in covers bucket
CREATE POLICY "Users can upload their own covers" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own covers
CREATE POLICY "Users can update their own covers" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own covers
CREATE POLICY "Users can delete their own covers" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);