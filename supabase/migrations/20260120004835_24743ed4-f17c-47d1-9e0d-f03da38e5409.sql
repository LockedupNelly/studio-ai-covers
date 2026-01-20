-- Add version tracking columns to generations table
ALTER TABLE public.generations ADD COLUMN parent_id UUID REFERENCES public.generations(id) ON DELETE SET NULL;
ALTER TABLE public.generations ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.generations ADD COLUMN edit_instructions TEXT;

-- Create index for faster parent lookups
CREATE INDEX idx_generations_parent_id ON public.generations(parent_id);

-- Update RLS policies to allow users to view their own generations (including versions)
-- The existing policy already covers this since it checks auth.uid() = user_id