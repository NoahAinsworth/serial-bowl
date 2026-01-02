# Serial Bowl - Project Documentation for Claude Code

## Project Overview

Serial Bowl is a social TV tracking platform that combines content discovery, ratings, reviews, and social networking for TV show enthusiasts. Think Letterboxd for TV series.

**Current Status**: Production-ready mobile and web application with 55+ database tables, real-time features, and AI-powered recommendations.

## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3.x with custom design system
- **UI Components**: Radix UI primitives + custom shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router DOM v6
- **Mobile**: Capacitor 7.x for iOS/Android native apps
- **PWA**: Service Worker with Workbox

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth (email, social)
- **Storage**: Supabase Storage for avatars and media
- **Edge Functions**: Deno-based serverless functions
- **Realtime**: Postgres real-time subscriptions

### External APIs
- **TVDB API**: Primary TV show metadata source
- **Trakt API**: Trending shows and additional metadata
- **Bunny.net**: Video streaming and CDN
- **Lovable AI**: AI-powered recommendations (no API key needed)
- **OpenAI**: Advanced AI features (GPT models)

## Project Structure

```
serial-bowl/
├── src/
│   ├── api/                    # API client modules
│   │   ├── catalog.ts         # TV show catalog API
│   │   ├── feeds.ts           # Social feed API
│   │   ├── messages.ts        # DM/messaging API
│   │   ├── posts.ts           # Posts/reviews API
│   │   ├── ratings.ts         # User ratings API
│   │   ├── trakt.ts           # Trakt API client
│   │   └── tvdb.ts            # TVDB API client
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components (shadcn/ui)
│   │   ├── layouts/          # Layout components
│   │   └── [feature].tsx     # Feature-specific components
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── ThemeContext.tsx  # Theme management
│   ├── hooks/                # Custom React hooks
│   │   ├── useFeed.ts       # Feed data management
│   │   ├── useTVDB.ts       # TVDB data fetching
│   │   ├── useOnline.ts     # Online status detection
│   │   └── useIsNative.ts   # Native platform detection
│   ├── lib/                  # Utility libraries
│   │   ├── api.ts           # Base API utilities
│   │   ├── supabase.ts      # Supabase client
│   │   ├── env.ts           # Environment config
│   │   ├── shows.ts         # Show data utilities
│   │   ├── showsCache.ts    # Client-side caching
│   │   ├── tvdb.ts          # TVDB utilities
│   │   ├── utils.ts         # General utilities
│   │   └── validation.ts    # Form validation schemas
│   ├── pages/               # Route pages
│   │   ├── Home.tsx         # Landing/feed page
│   │   ├── ShowDetailPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SearchPage.tsx
│   │   └── [feature]Page.tsx
│   ├── utils/               # Utility functions
│   │   ├── profanityFilter.ts
│   │   ├── ratingOverrides.ts
│   │   └── videoEmbeds.ts
│   ├── integrations/        # Third-party integrations
│   │   └── supabase/
│   │       ├── client.ts    # ⚠️ AUTO-GENERATED - DO NOT EDIT
│   │       └── types.ts     # ⚠️ AUTO-GENERATED - DO NOT EDIT
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles + design system
├── supabase/
│   ├── functions/           # Edge functions (Deno)
│   │   ├── get-trending-shows/
│   │   └── populate-content-counts/
│   ├── migrations/          # Database migrations
│   └── config.toml          # ⚠️ AUTO-GENERATED - DO NOT EDIT
├── public/
│   ├── manifest.webmanifest # PWA manifest
│   ├── icons/              # App icons
│   └── robots.txt
├── docs/
│   ├── schema.sql          # Complete database schema
│   ├── mobile.md           # Mobile development guide
│   └── code-quality-audit.md
├── capacitor.config.ts     # Mobile app config
├── tailwind.config.ts      # Tailwind configuration
├── vite.config.ts          # Vite configuration
└── package.json

```

## Environment Variables

Required environment variables (stored in `.env` - **DO NOT COMMIT**):

```env
# Supabase (Lovable Cloud)
VITE_SUPABASE_URL=https://yqslvnsdqpsosqghpenq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=yqslvnsdqpsosqghpenq

# Note: TVDB API key is stored in Supabase Edge Function secrets only
# All TVDB calls go through the tvdb-proxy edge function
```

## Database Architecture

### Core Tables (55+ total)

#### User & Profile System
- **`profiles`**: User profiles (handle, bio, avatar, settings, binge_points, badge_tier)
- **`user_roles`**: Role-based access control (admin, moderator, user)
- **`follows`**: Follow relationships with privacy (pending, accepted, blocked)
- **`user_prefs`**: User preferences (genres, favorite shows)

#### Content System
- **`shows`**: TV show metadata (TVDB ID, title, poster, metadata)
- **`seasons`**: Season metadata linked to shows
- **`episodes`**: Episode metadata linked to seasons
- **`tvdb_shows`**: TVDB API cache
- **`tvdb_episodes`**: TVDB episode cache
- **`tmdb_cache`**: TMDB API cache
- **`show_season_counts`**: Aggregated season counts per show
- **`season_episode_counts`**: Episode counts per season
- **`episode_runtimes`**: Episode runtime data for binge points

#### User Activity
- **`watched`**: Watched content (shows, seasons, episodes)
- **`watched_episodes`**: Individual episode watch tracking
- **`watchlist`**: User watchlists
- **`user_ratings`**: Ratings (0-100) with rollup support
- **`user_reviews`**: Written reviews

#### Social Features
- **`posts`**: Universal post table (reviews, thoughts, ratings, reshares)
- **`post_reactions`**: Likes/dislikes on posts
- **`comments`**: Threaded comments on posts
- **`comment_likes`** / **`comment_dislikes`**: Comment reactions
- **`reshares`**: Post reshares/retweets
- **`thoughts`**: Quick thoughts on content (legacy, merged with posts)
- **`thought_dislikes`**: Thought reactions
- **`reactions`**: Emoji reactions

#### Messaging
- **`conversations`**: DM conversations (1-1 or group)
- **`conversation_participants`**: Conversation membership
- **`messages`**: Messages within conversations
- **`message_reads`**: Read receipts
- **`dms`**: Direct messages (legacy system)
- **`dm_reactions`**: Emoji reactions on DMs
- **`dm_edit_history`**: DM edit tracking
- **`message_requests`**: Message requests for private profiles

#### Discovery & Feed
- **`feed_scores`**: Personalized feed scoring
- **`feed_impressions`**: Feed analytics
- **`interactions`**: User interaction tracking
- **`tvdb_trending`**: Cached trending shows

#### Gamification
- **`notifications`**: In-app notifications
- **Binge Points System**: Points awarded for watching episodes/seasons/shows
- **Badge Tiers**: Pilot Watcher → Ultimate Binger (based on points)

#### AI Features
- **`chat_sessions`**: AI chat sessions
- **`chat_messages`**: AI conversation history
- **`chat_events`**: AI event tracking
- **`bot_feedback`**: User feedback on AI responses

#### Lists & Collections
- **`custom_lists`**: User-created lists
- **`list_items`**: Items in custom lists

#### Content Aggregation
- **`aggregates`**: Aggregated ratings/scores per content

### Key Database Functions

```sql
-- Rating System
api_rate_and_review(p_item_type, p_item_id, p_score_any, p_review, p_is_spoiler)
  -- Handles rating + review creation with automatic rollups

compute_season_rollup(p_user, p_season_id)
  -- Calculates season rating from episode ratings

compute_show_rollup(p_user, p_show_id)
  -- Calculates show rating from season/episode ratings

upsert_rollups(p_user, p_item_type, p_item_id)
  -- Updates all relevant rating rollups

-- Feed Algorithms
feed_trending_rt(limit_count, cursor_score)
  -- Trending feed with time decay

feed_hot_takes(limit_count, cursor_score)
  -- Controversial posts (high engagement, split reactions)

feed_new(limit_count, cursor_ts)
  -- Chronological feed

feed_following(uid, limit_count, cursor_ts)
  -- Following-only feed

feed_recent_popular(limit_count)
  -- Recent popular posts (72 hour window)

-- Scoring Algorithms
attention_score(likes, dislikes, replies, reshares, impressions, created, half_life_hours)
  -- Engagement-based scoring with time decay

wilson_lower_bound(likes, dislikes)
  -- Statistical confidence for controversial content

exp_decay(created, half_life_hours)
  -- Time decay function

-- User Management
calculate_binge_points(p_user_id)
  -- Calculates all binge points and bonuses

update_user_binge_points(p_user_id)
  -- Updates user's total binge points

get_badge_tier(p_points)
  -- Determines badge tier from points

update_user_watch_stats(p_user_id)
  -- Updates watch time and badge tier

-- Content Management
update_show_counts(p_show_external_id, p_season_count, p_total_episode_count)
update_season_episode_count(p_season_external_id, p_episode_count)

-- Post Management
api_create_post(p_kind, p_body, p_item_type, p_item_id, p_rating_percent, p_is_spoiler)
soft_delete_post(p_post_id)

-- Security
has_role(_user_id, _role)
  -- SECURITY DEFINER function for role checking (prevents RLS recursion)

is_conversation_participant(_conversation_id, _user_id)
  -- Checks conversation membership

-- Content Moderation
detect_mature_content(text_body)
  -- Detects profanity and sexual content
```

### Row-Level Security (RLS) Patterns

All tables have RLS enabled. Common patterns:

```sql
-- User owns resource
USING (auth.uid() = user_id)

-- Public or followed user
USING (
  is_private = false 
  OR auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM follows 
    WHERE follower_id = auth.uid() 
    AND following_id = user_id 
    AND status = 'accepted'
  )
)

-- Role-based access
USING (has_role(auth.uid(), 'admin'))

-- Conversation participant
USING (is_conversation_participant(conversation_id, auth.uid()))
```

### Item ID Format

Content is referenced using composite IDs:

- **Show**: `"tvdb:{tvdb_id}"` (e.g., `"tvdb:12345"`)
- **Season**: `"tvdb:{tvdb_id}:{season_num}"` (e.g., `"tvdb:12345:2"`)
- **Episode**: `"tvdb:{tvdb_id}:{season_num}:{episode_num}"` (e.g., `"tvdb:12345:2:5"`)

## Design System

### Color System (HSL Only!)

Located in `src/index.css` and `tailwind.config.ts`. **NEVER use hard-coded colors directly in components.**

```css
/* Core Semantic Tokens */
--background: 0 0% 100%;        /* Page background */
--foreground: 222.2 84% 4.9%;   /* Primary text color */
--primary: 222.2 47.4% 11.2%;   /* Primary brand color */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;     /* Secondary surfaces */
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;         /* Muted backgrounds */
--muted-foreground: 215.4 16.3% 46.9%;
--accent: 210 40% 96.1%;        /* Accent color */
--accent-foreground: 222.2 47.4% 11.2%;
--destructive: 0 84.2% 60.2%;   /* Error/danger */
--border: 214.3 31.8% 91.4%;    /* Borders */
--input: 214.3 31.8% 91.4%;     /* Input borders */
--ring: 222.2 84% 4.9%;         /* Focus rings */
--chart-1 through --chart-5;    /* Chart colors */

/* Neobrutalist Accents */
--neo-pink: 338 100% 82%;       /* Bright pink */
--neo-purple: 271 91% 79%;      /* Vibrant purple */
--neo-baby-blue: 201 53% 88%;   /* Soft blue */
--neo-lime: 88 83% 74%;         /* Bright lime */
--neo-coral: 14 100% 71%;       /* Coral */
--yellow: 51 100% 50%;          /* Vibrant yellow */

/* Effects */
--shadow-brutal: 6px 6px 0px rgba(0, 0, 0, 1);
--shadow-brutal-lg: 10px 10px 0px rgba(0, 0, 0, 1);
```

### Usage Examples

```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-background text-foreground border-border">
<Button variant="default">Primary Action</Button>
<div className="bg-neo-pink">Accent element</div>

// ❌ WRONG - Hard-coded colors
<div className="bg-white text-black border-gray-200">
<div style={{ backgroundColor: '#FF69B4' }}>
```

### Tailwind Configuration

Key customizations in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      // ... all semantic tokens mapped
      'neo-pink': 'hsl(var(--neo-pink))',
      // ... etc
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['Space Grotesk', 'system-ui', 'sans-serif'],
    },
    keyframes: {
      // Custom animations defined here
    }
  }
}
```

## Coding Conventions

### TypeScript

```typescript
// ✅ Use proper typing
interface UserProfile {
  id: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
}

// ✅ Use optional chaining and nullish coalescing
const displayName = profile?.handle ?? 'Anonymous';

// ✅ Async/await over promises
async function fetchShow(tvdbId: number) {
  try {
    const data = await tvdbFetch(`/series/${tvdbId}/extended`);
    return data;
  } catch (error) {
    console.error('Failed to fetch show:', error);
    throw error;
  }
}

// ❌ Avoid 'any' type
// const data: any = await fetch(...);

// ✅ Use type imports
import type { Database } from '@/integrations/supabase/types';
```

### React Patterns

```typescript
// ✅ Use functional components with hooks
export function ShowCard({ show }: { show: Show }) {
  const [isWatched, setIsWatched] = useState(false);
  
  return (
    <div className="bg-card border-border rounded-lg">
      {/* ... */}
    </div>
  );
}

// ✅ Use TanStack Query for server state
import { useQuery } from '@tanstack/react-query';

export function useTrendingShows() {
  return useQuery({
    queryKey: ['trending-shows'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('get-trending-shows');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ✅ Extract complex logic to custom hooks
export function useWatchStatus(itemId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['watch-status', user?.id, itemId],
    queryFn: async () => {
      // ... fetch logic
    },
    enabled: !!user,
  });
}
```

### Supabase Patterns

```typescript
// ✅ Import from centralized client
import { supabase } from '@/integrations/supabase/client';

// ✅ Use proper error handling
async function updateProfile(updates: Partial<UserProfile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
    
  if (error) throw error;
}

// ✅ Use RPC for complex operations
const { data, error } = await supabase.rpc('api_rate_and_review', {
  p_item_type: 'show',
  p_item_id: 'tvdb:12345',
  p_score_any: '85',
  p_review: 'Great show!',
});

// ✅ Use real-time subscriptions
const channel = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // Handle new message
  })
  .subscribe();

// Cleanup
return () => { channel.unsubscribe(); };
```

### File Organization

```typescript
// ✅ Collocate related code
src/features/ratings/
  ├── components/
  │   ├── RatingDialog.tsx
  │   └── RatingCard.tsx
  ├── hooks/
  │   └── useRating.ts
  ├── api/
  │   └── ratingsApi.ts
  └── types.ts

// ✅ Use barrel exports
// src/features/ratings/index.ts
export * from './components/RatingDialog';
export * from './hooks/useRating';
export * from './types';
```

### Component Patterns

```typescript
// ✅ Props interface above component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function Button({ 
  variant = 'default', 
  size = 'default',
  isLoading = false,
  children,
  className,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
}

// ✅ Use React.memo for expensive components
export const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return <div>{items.map(item => <ExpensiveItem key={item.id} item={item} />)}</div>;
});
```

## Key Features & Implementation

### Authentication

```typescript
// Context-based auth state
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, session, loading } = useAuth();
  
  if (loading) return <Spinner />;
  if (!user) return <LoginPrompt />;
  
  return <div>Welcome, {user.email}</div>;
}
```

### Rating System

- Users rate content 0-100 (stored as integers)
- Ratings support **rollup logic**: 
  - Episode ratings → Season rating (if 80%+ episodes rated)
  - Season ratings → Show rating (if 80%+ seasons rated)
- Use `api_rate_and_review()` function for all rating operations
- Ratings automatically create posts in feed

### Feed Algorithms

Five feed types:
1. **Trending**: Time-decayed engagement score
2. **Hot Takes**: Controversial (high engagement, split votes)
3. **New**: Chronological
4. **Following**: Chronological from followed users
5. **Recent Popular**: 72-hour popular posts

### Binge Points System

Points calculation:
- 1 point per episode watched
- Bonus points for completing seasons (5-15 pts based on season length)
- 100 bonus points for completing shows
- Badge tiers: Pilot Watcher (0-149) → Ultimate Binger (10,000+)

### Mobile (Capacitor)

```typescript
// Platform detection
import { useIsNative } from '@/hooks/useIsNative';

function MyComponent() {
  const isNative = useIsNative();
  
  if (isNative) {
    // Native-specific behavior
  }
}

// Deep linking
serialbowl://show/{tvdb_id}
serialbowl://episode/{tvdb_id}/{season}/{episode}
```

### PWA Features

- Offline support via service worker
- Install prompt
- Update notifications
- Background sync

## Important Files

### DO NOT EDIT (Auto-generated)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env` (managed by Lovable Cloud)

### Key Configuration
- `vite.config.ts`: Build config, PWA setup, path aliases
- `tailwind.config.ts`: Design system tokens
- `capacitor.config.ts`: Mobile app config
- `src/index.css`: Global styles + CSS variables

## Common Tasks

### Adding a New Feature

1. **Database changes** (if needed):
   - Update `docs/schema.sql` with new tables/columns
   - Create migration via Lovable Cloud UI
   - Add RLS policies

2. **Create API functions**:
   ```typescript
   // src/api/myFeature.ts
   import { supabase } from '@/integrations/supabase/client';
   
   export async function createThing(data: ThingData) {
     const { data: thing, error } = await supabase
       .from('things')
       .insert(data)
       .select()
       .single();
       
     if (error) throw error;
     return thing;
   }
   ```

3. **Create custom hook**:
   ```typescript
   // src/hooks/useThing.ts
   import { useQuery, useMutation } from '@tanstack/react-query';
   import { createThing } from '@/api/myFeature';
   
   export function useThing(id: string) {
     return useQuery({
       queryKey: ['thing', id],
       queryFn: () => fetchThing(id),
     });
   }
   
   export function useCreateThing() {
     return useMutation({
       mutationFn: createThing,
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['things'] });
       },
     });
   }
   ```

4. **Create component**:
   ```typescript
   // src/components/ThingCard.tsx
   export function ThingCard({ thing }: { thing: Thing }) {
     return (
       <div className="bg-card border-border rounded-lg p-4">
         <h3 className="text-foreground font-semibold">{thing.name}</h3>
       </div>
     );
   }
   ```

### Working with TVDB API

```typescript
import { tvdbFetch } from '@/lib/tvdb';

// Fetch show details
const show = await tvdbFetch(`/series/${tvdbId}/extended`);

// Search shows
const results = await tvdbFetch('/search', {
  params: { query: 'Breaking Bad', type: 'series' }
});

// Cache is automatic via tvdb_shows and tvdb_episodes tables
```

### Creating Edge Functions

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  try {
    // Your logic here
    const data = await someOperation();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

## Testing & Development

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Mobile Development

```bash
# Sync with mobile platforms
npx cap sync

# Open iOS in Xcode
npx cap open ios

# Open Android in Android Studio
npx cap open android
```

## Architecture Patterns

### State Management Strategy

- **Server State**: TanStack Query for all API data
- **UI State**: React useState/useReducer for local component state
- **Global State**: Context API for auth, theme
- **Form State**: React Hook Form with Zod validation

### Data Flow

```
User Action
  ↓
Component Handler
  ↓
TanStack Mutation
  ↓
API Function (src/api/)
  ↓
Supabase Client
  ↓
Database (via RLS)
  ↓
Real-time Update (if subscribed)
  ↓
Query Invalidation
  ↓
UI Re-render
```

### Error Handling

```typescript
// API level
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Operation failed:', error);
  throw error; // Let React Query handle it
}

// Component level
const { data, error, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

## Performance Optimization

### Implemented Optimizations

1. **Code Splitting**: Automatic via Vite dynamic imports
2. **Image Optimization**: Lazy loading with `loading="lazy"`
3. **API Caching**: 
   - TVDB responses cached in `tvdb_shows`/`tvdb_episodes`
   - React Query stale-time configuration
4. **Database Indexes**: All foreign keys indexed
5. **Query Optimization**: 
   - Use `select('*')` sparingly
   - Fetch only needed columns
   - Use pagination for lists

### Best Practices

```typescript
// ✅ Lazy load routes
const ShowDetailPage = lazy(() => import('@/pages/ShowDetailPage'));

// ✅ Memoize expensive computations
const sortedShows = useMemo(() => 
  shows.sort((a, b) => b.rating - a.rating),
  [shows]
);

// ✅ Debounce search inputs
const debouncedSearch = useDebouncedValue(searchTerm, 300);

// ✅ Paginate large lists
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

## Security Considerations

### RLS Policies
- All tables have RLS enabled
- User can only modify their own data (unless admin)
- Private profiles hidden from non-followers
- Message access restricted to participants

### Role-Based Access
```typescript
// Check roles server-side only
const { data } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'admin'
});

// ❌ NEVER check roles client-side via localStorage
```

### Input Validation
- All forms use Zod schemas
- Backend validates via database constraints
- Profanity filter on user-generated content

## Deployment

### Via Lovable (Current Setup)
1. Push changes to GitHub (auto-synced)
2. Lovable auto-deploys to production
3. Edge functions auto-deploy on commit

### Frontend Hosting
- Hosted on Lovable Cloud
- Custom domain support available
- PWA automatically served with service worker

### Database
- Managed by Lovable Cloud (Supabase)
- Automatic backups
- Point-in-time recovery available

## Troubleshooting

### Common Issues

**RLS Policy Errors**
```
Error: new row violates row-level security policy
```
Solution: Check user is authenticated and policy conditions are met

**Type Errors with Supabase**
```
Type 'unknown' is not assignable to...
```
Solution: Types auto-generate; rebuild or check `src/integrations/supabase/types.ts`

**TVDB API Rate Limits**
```
429 Too Many Requests
```
Solution: Implement caching via `tvdb_shows`/`tvdb_episodes` tables

**Edge Function Timeout**
```
Function execution timed out
```
Solution: Optimize queries, add pagination, or increase timeout in `config.toml`

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **TanStack Query**: https://tanstack.com/query/latest
- **Radix UI**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TVDB API**: https://thetvdb.com/api-information
- **Capacitor**: https://capacitorjs.com/docs

## Project Status & Next Steps

### ✅ Completed Features
- User authentication & profiles
- TV show discovery (TVDB integration)
- Ratings & reviews
- Social feed (5 algorithms)
- Direct messaging
- Binge points & badges
- Mobile apps (iOS/Android)
- PWA support
- Real-time notifications

### 🚧 In Progress
- Video posts (Bunny.net integration)
- AI recommendations (Lovable AI)
- Advanced search filters

### 📋 Roadmap
- Lists & collections
- User achievements
- Content recommendations engine
- Moderation tools
- Analytics dashboard

---

**Last Updated**: 2025-01-29
**Project Version**: 1.0.0
**Database Version**: 55+ tables, 30+ functions