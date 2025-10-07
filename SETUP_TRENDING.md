# Setup Trending Shows

The Browse and New tabs pull data from the `tvdb_trending` table. This table needs to be populated by running the edge function.

## How to populate trending shows:

1. Open your backend (View Backend button in chat)
2. Navigate to Edge Functions
3. Find `update-trending-shows` function
4. Click "Invoke" to run it manually

This will fetch and store trending shows from TVDB into your database.

## Future: Automate with Cron

You can set up a cron job to run this function daily to keep trending shows updated.
