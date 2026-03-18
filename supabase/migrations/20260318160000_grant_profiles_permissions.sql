-- Grant authenticated users permission to use the profiles table.
-- RLS policies still restrict access to each user's own row.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
