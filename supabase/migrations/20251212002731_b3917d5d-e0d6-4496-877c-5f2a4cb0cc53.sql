-- Allow service role to update credits (for webhook)
CREATE POLICY "Service role can update credits"
ON public.user_credits
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow service role to insert transactions
CREATE POLICY "Service role can insert transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (true);