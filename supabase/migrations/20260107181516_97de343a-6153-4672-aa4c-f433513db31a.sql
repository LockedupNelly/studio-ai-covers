-- Drop the old constraint and add a new one that includes 'welcome'
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT credit_transactions_type_check;

ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_type_check 
CHECK (type = ANY (ARRAY['purchase'::text, 'generation'::text, 'subscription'::text, 'refund'::text, 'welcome'::text, 'bonus'::text]));