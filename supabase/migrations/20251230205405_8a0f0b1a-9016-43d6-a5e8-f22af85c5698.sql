-- Add song_title and artist_name columns to generations table
ALTER TABLE public.generations 
ADD COLUMN song_title text,
ADD COLUMN artist_name text;