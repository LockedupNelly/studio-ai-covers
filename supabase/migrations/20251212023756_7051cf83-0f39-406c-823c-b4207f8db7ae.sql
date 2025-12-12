-- Add explicit DELETE policy that denies all deletions to protect transaction history
CREATE POLICY "No one can delete transactions"
ON public.credit_transactions
FOR DELETE
USING (false);