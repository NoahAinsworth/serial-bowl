# Serial Bowl - Full Stack TV Tracking App

A complete social platform for tracking TV shows, rating episodes, writing reviews, and sharing thoughts with a community.

## Tech Stack

- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **APIs**: TVDB for show metadata
- **Auth**: Supabase Auth (email/password)

## Node Version

- **Required**: Node.js 18.x or higher
- **Recommended**: Node.js 20.x

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
- `VITE_TVDB_API_KEY` - TVDB API key (get from thetvdb.com)

### 3. Database Setup

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

#### Option B: Manual SQL Import

Run the migration file in your Supabase SQL Editor:

```sql
-- Copy contents of supabase/migrations/000_full_schema_dump.sql
-- and run in Supabase Dashboard → SQL Editor
```

### 4. Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:8080`

## Edge Functions

Edge functions are serverless backend functions that handle:
- Feed generation and scoring
- AI chatbot (BingeBot)
- Trending shows updates

### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy feed-api
supabase functions deploy compute-feed-scores
supabase functions deploy binge-bot-chat
supabase functions deploy update-trending-shows
```

### Required Secrets for Edge Functions

```bash
# Set secrets
supabase secrets set TVDB_API_KEY=your_key
supabase secrets set OPENAI_API_KEY=your_key  # For BingeBot
supabase secrets set LOVABLE_API_KEY=your_key # For AI features
```

## Project Structure

```
serial-bowl/
├── src/                      # Frontend React application
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React context providers
│   ├── lib/                # Utilities and API clients
│   └── integrations/       # Supabase client & types
├── api/                     # API client modules
│   ├── supabase.ts         # Supabase utilities
│   ├── posts.ts            # Posts API
│   ├── ratings.ts          # Ratings API
│   ├── feeds.ts            # Feed API
│   └── tvdb.ts             # TVDB integration
├── supabase/
│   ├── migrations/         # Database schema migrations
│   ├── functions/          # Edge functions
│   └── config.toml         # Supabase configuration
├── public/                  # Static assets
└── docs/                   # Documentation

```

## Key Features

### Social Features
- Follow/unfollow users
- Create thoughts (short posts)
- Write reviews with ratings
- Like, dislike, comment on posts
- Direct messaging
- Activity notifications

### Content Tracking
- Rate shows, seasons, episodes (0-100%)
- Mark episodes as watched
- Create custom lists
- Watchlist management
- Automatic rollup ratings (episodes → season → show)

### Discovery
- Multiple feed tabs (For You, Trending, Hot Takes, Following)
- Personalized feed scoring algorithm
- Trending shows (new & popular)
- Search shows and users
- BingeBot AI assistant for recommendations

### Profile & Privacy
- Public/private profiles
- Follow requests for private accounts
- Customizable bio and avatar
- User statistics dashboard

## Database Schema Overview

### Core Tables
- `profiles` - User profiles and settings
- `posts` - All posts (thoughts, reviews, ratings)
- `user_ratings` - Rating ledger (show/season/episode)
- `user_reviews` - Review text storage
- `follows` - Follow relationships
- `post_reactions` - Likes/dislikes on posts
- `comments` - Comments on posts
- `dms` - Direct messages

### Cache Tables
- `tvdb_shows` - TVDB show metadata cache
- `tvdb_episodes` - TVDB episode data cache
- `tvdb_trending` - Cached trending shows
- `tmdb_cache` - TMDB API response cache

### Feed Tables
- `feed_scores` - Personalized feed scores per user
- `feed_impressions` - Track what users have seen
- `feed_trending` - Materialized trending view
- `feed_for_you` - Materialized personalized view

### Supporting Tables
- `user_roles` - Role-based access control
- `custom_lists` - User-created lists
- `list_items` - Items in custom lists
- `reshares` - Post reshares
- `chat_sessions` - BingeBot chat sessions
- `chat_messages` - Chat message history

## API Endpoints

### Feed API
`POST /functions/v1/feed-api`
```json
{
  "tab": "trending|for-you|hot-takes|following",
  "contentType": "show|season|episode",
  "limit": 20
}
```

### Compute Feed Scores
`POST /functions/v1/compute-feed-scores`
```json
{
  "userId": "uuid"
}
```

### BingeBot Chat
`POST /functions/v1/binge-bot-chat`
```json
{
  "sessionId": "uuid",
  "messages": [
    { "role": "user", "content": "What should I watch?" }
  ]
}
```

## Development Tips

### Enable Auto-confirm for Email Signups

In Supabase Dashboard → Authentication → Settings:
- Enable "Confirm email" = OFF (for dev)
- Enable "Secure email change" = ON

### Debugging

```bash
# View edge function logs
supabase functions logs feed-api --tail

# Check database
supabase db diff

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Common Issues

**Issue**: "new row violates row-level security policy"
- **Fix**: Make sure user is authenticated and user_id columns are being set correctly

**Issue**: Feed returns empty
- **Fix**: Run `compute-feed-scores` edge function for the user first

**Issue**: Show images not loading
- **Fix**: Check TVDB API key is valid and set in environment

## Testing Checklist

- [ ] User can sign up and log in
- [ ] User can search for shows
- [ ] User can rate a show/season/episode
- [ ] Rating appears in user profile
- [ ] User can write a review
- [ ] Review appears in feed
- [ ] User can follow another user
- [ ] Following tab shows followed users' posts
- [ ] Trending tab shows popular posts
- [ ] BingeBot responds to queries

## Production Deployment

### Build

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Connect repository
2. Set environment variables
3. Build command: `npm run build`
4. Output directory: `dist`

### Deploy Edge Functions

```bash
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

## License

Private - All Rights Reserved

## Support

For issues or questions, contact the development team.
