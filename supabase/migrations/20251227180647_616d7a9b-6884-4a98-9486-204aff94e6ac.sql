-- Add index on generations table for faster user_id + created_at queries
CREATE INDEX IF NOT EXISTS idx_generations_user_created 
ON public.generations (user_id, created_at DESC);