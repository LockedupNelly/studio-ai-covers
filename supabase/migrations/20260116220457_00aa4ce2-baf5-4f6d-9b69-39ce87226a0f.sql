-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Service role can select rate limits" ON public.rate_limits;

-- Create a new restrictive SELECT policy that only allows users to see their own rate limit data
CREATE POLICY "Users can only view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);