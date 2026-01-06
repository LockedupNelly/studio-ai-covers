-- Create subscription_usage table to track monthly generation counts
CREATE TABLE public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL,
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
ON public.subscription_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage (for first record of month)
CREATE POLICY "Users can insert their own usage"
ON public.subscription_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update usage (for incrementing counts)
CREATE POLICY "Service role can update usage"
ON public.subscription_usage
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_usage_updated_at
BEFORE UPDATE ON public.subscription_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();