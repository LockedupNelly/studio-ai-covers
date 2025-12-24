-- Function to give new users 1 free credit on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert 1 free credit for the new user
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 1)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log the welcome credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1, 'welcome', 'Welcome credit for signing up');
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();