-- Fix search_path for get_badge_tier function
ALTER FUNCTION public.get_badge_tier(integer) SET search_path = 'public';