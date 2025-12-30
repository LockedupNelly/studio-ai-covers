-- Add cover_analysis column to store composition metadata
ALTER TABLE public.generations 
ADD COLUMN cover_analysis jsonb DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.generations.cover_analysis IS 'Stores cover composition analysis: dominantColors, subjectPosition, safeTextZones, avoidZones, mood';