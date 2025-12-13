-- Add a restrictive UPDATE policy that denies all updates to credit_transactions
-- Financial transaction records should be immutable for audit purposes
-- If corrections are needed, a new compensating transaction should be added instead

CREATE POLICY "No one can update transactions"
ON public.credit_transactions
FOR UPDATE
USING (false)
WITH CHECK (false);