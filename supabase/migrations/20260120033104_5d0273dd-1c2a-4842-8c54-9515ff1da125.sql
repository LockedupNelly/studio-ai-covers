-- Remove the duplicate trigger that's causing double credit logging
-- Keep on_auth_user_created_credits, drop on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;