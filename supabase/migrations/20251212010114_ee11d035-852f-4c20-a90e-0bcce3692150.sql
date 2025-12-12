-- Add restrictive policy to prevent regular users from updating credits
-- Only service role (edge functions) can update credits
CREATE POLICY "Users cannot update their own credits" 
ON public.user_credits 
FOR UPDATE 
TO authenticated
USING (false);