const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRAKT_BASE_URL = 'https://api.trakt.tv';

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

    // Validate path to prevent abuse
    const allowedPatterns = [
      /^\/shows\/trending/,
      /^\/shows\/popular/,
      /^\/shows\/anticipated/,
      /^\/shows\/[^\/]+\/people/,
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(path));
    if (!isAllowed) {
      console.warn(`Blocked Trakt path: ${path}`);
      return new Response(
        JSON.stringify({ error: 'Invalid API path' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('TRAKT_API_KEY');
    if (!apiKey) {
      throw new Error('TRAKT_API_KEY not configured');
    }

    console.log(`Trakt proxy request: ${path}`);

    const response = await fetch(`${TRAKT_BASE_URL}${path}`, {
      headers: {
        'trakt-api-version': '2',
        'trakt-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error(`Trakt API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Trakt API error: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Trakt proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
