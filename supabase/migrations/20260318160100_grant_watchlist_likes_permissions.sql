-- Grant authenticated users permission to use watchlist and likes tables.
-- RLS policies still restrict access to each user's own rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
