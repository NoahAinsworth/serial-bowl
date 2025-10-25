import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized - Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    console.error('Authentication error:', authError);
    return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Authenticated request from user: ${user.id}`);

  try {
    const { page = 0 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TVDB_API_KEY = Deno.env.get("TVDB_API_KEY");

    console.log(`Fetching trending shows for page ${page}`);

    // Step 1: Use Gemini to get trending shows
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a TV show expert. Return ONLY a JSON array of trending TV show titles. No explanations, just the array. Focus on shows that are currently airing, recently released in 2024-2025, or have high social media buzz right now."
          },
          {
            role: "user",
            content: `List 60 trending TV shows in January 2025. Consider currently airing shows, recently released shows, and shows with high social media buzz. Include a mix of new releases and popular returning shows. Return ONLY a valid JSON array like: ["Show Title 1", "Show Title 2", ...]`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    console.log("AI response received:", content.substring(0, 200));
    
    // Parse the JSON array from AI response
    let showTitles: string[] = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      showTitles = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw new Error("Failed to parse trending shows from AI");
    }

    console.log(`Found ${showTitles.length} trending shows from AI`);
    
    // Step 2: Get TVDB token
    const loginResponse = await fetch("https://api4.thetvdb.com/v4/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ apikey: TVDB_API_KEY })
    });

    if (!loginResponse.ok) {
      throw new Error("TVDB login failed");
    }

    const loginData = await loginResponse.json();
    const tvdbToken = loginData.data.token;
    
    // Step 3: Search TVDB for each show (paginated)
    const startIdx = page * 20;
    const endIdx = (page + 1) * 20;
    const pageShowTitles = showTitles.slice(startIdx, endIdx);
    
    console.log(`Fetching TVDB data for shows ${startIdx}-${endIdx}`);
    
    const tvdbShows = [];
    for (const title of pageShowTitles) {
      try {
        const searchResponse = await fetch(
          `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(title)}&type=series&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${tvdbToken}`,
              Accept: "application/json",
            },
          }
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            const searchResult = searchData.data[0];
            
            // Extract the correct ID field (could be tvdb_id, objectID, or id)
            const showId = searchResult.tvdb_id || searchResult.objectID || searchResult.id;
            
            if (showId) {
              // Fetch full show data using extended endpoint for consistent format
              const showResponse = await fetch(
                `https://api4.thetvdb.com/v4/series/${showId}/extended`,
                {
                  headers: {
                    Authorization: `Bearer ${tvdbToken}`,
                    Accept: "application/json",
                  },
                }
              );
              
              if (showResponse.ok) {
                const showData = await showResponse.json();
                if (showData.data) {
                  tvdbShows.push(showData.data);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${title}:`, error);
      }
    }

    console.log(`Successfully fetched ${tvdbShows.length} shows from TVDB`);

    return new Response(JSON.stringify(tvdbShows), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error in get-trending-shows:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
