import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TVDB_BASE_URL = 'https://api4.thetvdb.com/v4';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTvdbToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const apiKey = Deno.env.get('TVDB_API_KEY');
  if (!apiKey) {
    throw new Error('TVDB_API_KEY not configured');
  }

  const response = await fetch(`${TVDB_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey }),
  });

  if (!response.ok) {
    throw new Error('TVDB authentication failed');
  }

  const data = await response.json();
  const token = data.data.token;

  cachedToken = {
    token,
    expiresAt: Date.now() + 27 * 24 * 60 * 60 * 1000, // 27 days
  };

  return token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { path } = await req.json();
    
    if (!path || typeof path !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid path parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate path to prevent abuse (only allow expected TVDB endpoints)
    const allowedPatterns = [
      /^\/search\?/,
      /^\/series\/\d+/,
      /^\/episodes\/\d+/,
      /^\/series\/filter\?/,
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(path));
    if (!isAllowed) {
      console.warn(`Blocked TVDB path: ${path}`);
      return new Response(
        JSON.stringify({ error: 'Invalid API path' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`TVDB proxy request: ${path}`);

    const token = await getTvdbToken();
    
    const response = await fetch(`${TVDB_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`TVDB API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `TVDB API error: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const json = await response.json();
    
    return new Response(
      JSON.stringify({ data: json.data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('TVDB proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
