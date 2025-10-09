-- Fix 1: Require authentication for comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Require authentication for interactions
DROP POLICY IF EXISTS "Interactions viewable by everyone" ON public.interactions;
CREATE POLICY "Authenticated users can view interactions"
ON public.interactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 3: Require authentication for review_likes
DROP POLICY IF EXISTS "Review likes are viewable by everyone" ON public.review_likes;
CREATE POLICY "Authenticated users can view review likes"
ON public.review_likes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 4: Require authentication for review_dislikes
DROP POLICY IF EXISTS "Anyone can view review dislikes" ON public.review_dislikes;
CREATE POLICY "Authenticated users can view review dislikes"
ON public.review_dislikes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 5: Require authentication for comment_likes
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON public.comment_likes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 6: Require authentication for comment_dislikes
DROP POLICY IF EXISTS "Anyone can view comment dislikes" ON public.comment_dislikes;
CREATE POLICY "Authenticated users can view comment dislikes"
ON public.comment_dislikes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 7: Require authentication for reshares
DROP POLICY IF EXISTS "Anyone can view reshares" ON public.reshares;
CREATE POLICY "Authenticated users can view reshares"
ON public.reshares
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 8: Require authentication for reviews (they expose user_id)
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Authenticated users can view reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 9: Require authentication for reactions
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.reactions;
CREATE POLICY "Authenticated users can view reactions"
ON public.reactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 10: Require authentication for ratings (they expose user preferences)
DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
CREATE POLICY "Authenticated users can view ratings"
ON public.ratings
FOR SELECT
USING (auth.uid() IS NOT NULL);