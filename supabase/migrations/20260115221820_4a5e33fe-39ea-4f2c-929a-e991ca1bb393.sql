-- Create rate_limits table for per-user rate limiting
CREATE TABLE public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, action)
);

-- Add index for fast lookups
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action);

-- Enable RLS - only service role can access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role policies for edge functions
CREATE POLICY "Service role can select rate limits"
ON public.rate_limits
FOR SELECT
USING (true);

CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update rate limits"
ON public.rate_limits
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
USING (true);