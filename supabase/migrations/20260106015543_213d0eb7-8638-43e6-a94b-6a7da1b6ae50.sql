-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to give 3 credits instead of 1
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert 3 free credits for the new user
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 3)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log the welcome credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 3, 'welcome', 'Welcome credits - try your first covers free!');
  
  RETURN NEW;
END;
$$;

-- Create trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();