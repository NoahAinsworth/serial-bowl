-- Fix critical cache exposure issues - these should definitely not be public

-- Fix 1: Secure TMDB cache (API cache should not be public)
DROP POLICY IF EXISTS "TMDB cache is viewable by everyone" ON public.tmdb_cache;
CREATE POLICY "Authenticated users can view TMDB cache"
ON public.tmdb_cache
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Secure TVDB shows cache (API cache should not be public)
DROP POLICY IF EXISTS "TVDB shows cache is viewable by everyone" ON public.tvdb_shows;
CREATE POLICY "Authenticated users can view TVDB shows cache"
ON public.tvdb_shows
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 3: Secure TVDB episodes cache (API cache should not be public)
DROP POLICY IF EXISTS "TVDB episodes cache is viewable by everyone" ON public.tvdb_episodes;
CREATE POLICY "Authenticated users can view TVDB episodes cache"
ON public.tvdb_episodes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 4: Secure content table (show/episode metadata)
DROP POLICY IF EXISTS "Content is viewable by everyone" ON public.content;
CREATE POLICY "Authenticated users can view content"
ON public.content
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 5: Secure trending data
DROP POLICY IF EXISTS "Trending shows are viewable by everyone" ON public.tvdb_trending;
CREATE POLICY "Authenticated users can view trending shows"
ON public.tvdb_trending
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 6: Secure aggregates (rating statistics)
DROP POLICY IF EXISTS "Aggregates are viewable by everyone" ON public.aggregates;
CREATE POLICY "Authenticated users can view aggregates"
ON public.aggregates
FOR SELECT
USING (auth.uid() IS NOT NULL);