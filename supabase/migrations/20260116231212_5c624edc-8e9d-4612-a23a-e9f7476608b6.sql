-- Create a public view for referrals that excludes sensitive email data
CREATE VIEW public.referrals_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    referrer_id,
    referred_user_id,
    credits_awarded,
    created_at,
    converted_at,
    referral_code,
    status
  FROM public.referrals;
-- Excludes: referred_email (sensitive PII)

-- Grant access to the view for authenticated users
GRANT SELECT ON public.referrals_public TO authenticated;

-- Drop the existing permissive SELECT policy on the base table
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

-- Create a new policy that denies direct SELECT access to the base table
-- This forces all reads to go through the view or service role
CREATE POLICY "No direct SELECT access to referrals"
  ON public.referrals
  FOR SELECT
  USING (false);

-- Create a policy on the view to allow users to see only their own referrals
-- Note: Since the view uses security_invoker, RLS on the base table applies
-- But we blocked base table access, so we need a security definer function

-- Create a function to check if user can view referral
CREATE OR REPLACE FUNCTION public.get_user_referrals(p_user_id uuid)
RETURNS SETOF public.referrals_public
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    referrer_id,
    referred_user_id,
    credits_awarded,
    created_at,
    converted_at,
    referral_code,
    status
  FROM public.referrals
  WHERE referrer_id = p_user_id;
$$;