import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TVDB_API_KEY = Deno.env.get("TVDB_API_KEY");

const SYSTEM_PROMPT = `You are "BingeBot," a friendly TV information assistant inside Serial Bowl, a TV show rating and tracking app.

STRICT RULES:
1. You ONLY answer questions about TV shows, seasons, episodes, characters, actors, filmography, streaming info, release dates, trivia, summaries, and recommendations.
2. REJECT all non-TV topics with: "I can only help with TV shows, actors, and episode info! Ask me anything from what to watch next, to who plays your favorite character."
3. You can help users navigate to any show, season, or episode - extract entity information when relevant.
4. You can help users apply ratings (0-100%) on behalf of users AFTER confirmation.
5. ALWAYS confirm before making rating changes with: "You want me to rate [Content Name] as [X]%, correct?"
6. Never send user-generated content (posts, messages, ratings) to external APIs.
7. Never reveal personal data or claim to be human.
8. Keep responses concise unless asked for detail (max 3-4 sentences typically).
9. Add "[Spoiler Warning]" before potentially spoiler content.
10. Be friendly, energetic, and TV-nerd coded.

**CRITICAL: When REAL-TIME TV DATABASE INFO is provided, ALWAYS use it for facts about:**
- Season/episode counts (e.g., "How many seasons does X have?")
- Air dates and schedules (e.g., "When does season 2 come out?")
- Show status (continuing/ended)
- Network information
- Latest episodes and seasons
Prefer this real-time data over your training knowledge for recent/current information.

When user asks about a specific show/season/episode, include the title in [brackets] so we can create navigation links.
Example: "You should check out [Breaking Bad] - it's incredible!"

For rating requests:
- Detect phrases like "Rate X as Y%", "Give X a score of Y", "Set my rating for X to Y"
- Ask for confirmation before applying: "You want me to rate [Show Name] as [X]%, correct?"
- Only apply rating after user confirms with "yes", "correct", "do it", etc.
- Include RATING_ACTION marker in your response when user confirms: RATING_ACTION{type:show|season|episode, name:NAME, rating:NUMBER}

Keep it fun, helpful, and TV-focused!`;

// TVDB Authentication
async function getTVDBToken(): Promise<string> {
  const response = await fetch("https://api4.thetvdb.com/v4/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      apikey: TVDB_API_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(`TVDB login failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data.token;
}

// Search TVDB for show information
async function searchTVDB(query: string, token: string) {
  try {
    const response = await fetch(
      `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(query)}&type=series&limit=3`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`TVDB search failed for "${query}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`TVDB search error for "${query}":`, error);
    return [];
  }
}

// Fetch extended series information with seasons and episodes
async function getSeriesExtended(seriesId: number, token: string) {
  try {
    const response = await fetch(
      `https://api4.thetvdb.com/v4/series/${seriesId}/extended?meta=episodes&short=true`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`TVDB extended fetch failed for series ${seriesId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`TVDB extended fetch error for series ${seriesId}:`, error);
    return null;
  }
}

// Extract potential show names from user message
function extractShowNames(message: string): string[] {
  const names: string[] = [];
  
  // Extract quoted strings (e.g., "Breaking Bad")
  const quotedRegex = /["']([^"']+)["']/g;
  let match;
  while ((match = quotedRegex.exec(message)) !== null) {
    names.push(match[1]);
  }
  
  // Extract capitalized phrases (e.g., Breaking Bad, The Office)
  const capitalizedRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  while ((match = capitalizedRegex.exec(message)) !== null) {
    if (match[1].length > 3) { // Avoid short words like "The"
      names.push(match[1]);
    }
  }
  
  // Extract potential show names from lowercase text
  const cleanedMessage = message
    .toLowerCase()
    .replace(/\b(tell|me|about|what|is|the|season|episode|watch|rate|give|score|set|my|rating|for|to|as|a|an|it|do|you|know|when|does|come|out|release|date)\b/gi, '')
    .replace(/\d+%?/g, '') // Remove numbers/percentages
    .trim();
  
  // If there's remaining text of 2+ characters, use it as a search term
  if (cleanedMessage.length >= 2) {
    const chunks = cleanedMessage.split(/[,;]/).map(c => c.trim()).filter(c => c.length >= 2);
    names.push(...chunks);
  }
  
  // Also try the raw message as a search (TVDB is smart)
  if (message.length <= 50 && !message.includes('?')) {
    names.push(message);
  }
  
  return [...new Set(names)].filter(n => n.length >= 2);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { sessionId, messages, hideSpoilers } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get the last user message to search for show names
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // Extract and search for shows in TVDB with extended data
    let showContext = "";
    if (TVDB_API_KEY && lastUserMessage) {
      try {
        const showNames = extractShowNames(lastUserMessage);
        if (showNames.length > 0) {
          console.log("Searching TVDB for shows:", showNames);
          const tvdbToken = await getTVDBToken();
          
          const searchResults = [];
          for (const name of showNames.slice(0, 2)) { // Limit to 2 searches
            const results = await searchTVDB(name, tvdbToken);
            searchResults.push(...results);
          }
          
          if (searchResults.length > 0) {
            // Fetch extended data for each show
            const enrichedShows = [];
            for (const show of searchResults.slice(0, 2)) { // Limit extended fetches
              const extendedData = await getSeriesExtended(show.tvdb_id, tvdbToken);
              
              if (extendedData) {
                // Find aired seasons (not specials)
                const airedSeasons = extendedData.seasons?.filter((s: any) => 
                  s.type?.name === "Aired Order" && s.number > 0
                ) || [];
                
                // Get latest season info
                const latestSeason = airedSeasons.sort((a: any, b: any) => b.number - a.number)[0];
                
                const enrichedShow = {
                  name: show.name || show.title,
                  year: show.year || show.first_aired?.substring(0, 4),
                  status: extendedData.status?.name || show.status,
                  totalSeasons: airedSeasons.length,
                  totalEpisodes: extendedData.episodes?.length || 0,
                  lastAired: extendedData.lastAired,
                  nextAired: extendedData.nextAired,
                  airsDay: extendedData.airsDays?.[0],
                  airsTime: extendedData.airsTime,
                  network: extendedData.originalNetwork?.name || show.network,
                  latestSeason: latestSeason ? {
                    number: latestSeason.number,
                    episodeCount: latestSeason.episodes?.length || 0,
                    year: latestSeason.year,
                  } : null,
                  overview: (show.overview || extendedData.overview)?.substring(0, 300),
                };
                
                enrichedShows.push(enrichedShow);
                console.log(`Enriched data for ${enrichedShow.name}: ${enrichedShow.totalSeasons} seasons, ${enrichedShow.totalEpisodes} episodes`);
              } else {
                // Fallback to basic data if extended fetch fails
                enrichedShows.push({
                  name: show.name || show.title,
                  year: show.year || show.first_aired?.substring(0, 4),
                  status: show.status,
                  overview: show.overview?.substring(0, 200),
                  network: show.network,
                });
              }
            }
            
            if (enrichedShows.length > 0) {
              showContext = `\n\nREAL-TIME TV DATABASE INFO (AUTHORITATIVE - Use this for all facts about seasons, episodes, air dates, and status):\n${JSON.stringify(enrichedShows, null, 2)}`;
              console.log("Added enriched TVDB context for:", enrichedShows.map(s => s.name).join(", "));
            }
          }
        }
      } catch (error) {
        console.error("TVDB search error:", error);
        // Continue without TVDB context
      }
    }

    // Build messages array with enhanced system prompt
    const enhancedSystemPrompt = SYSTEM_PROMPT + showContext;
    const aiMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
    ];

    console.log("Calling Lovable AI with messages:", aiMessages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    console.log("AI Response:", aiMessage);

    // Extract entities (shows/seasons/episodes mentioned in brackets)
    const entities = [];
    const bracketRegex = /\[([^\]]+)\]/g;
    let match;
    while ((match = bracketRegex.exec(aiMessage)) !== null) {
      const entityName = match[1];
      
      // Try to find in database
      const { data: contentData } = await supabase
        .from("content")
        .select("id, external_id, kind, title")
        .ilike("title", `%${entityName}%`)
        .limit(1)
        .maybeSingle();

      if (contentData) {
        const entity: any = {
          type: contentData.kind,
          name: contentData.title,
          externalId: contentData.external_id.split(":")[0],
        };

        if (contentData.kind === "season") {
          entity.seasonNumber = parseInt(contentData.external_id.split(":")[1]);
        } else if (contentData.kind === "episode") {
          const parts = contentData.external_id.split(":");
          entity.seasonNumber = parseInt(parts[1]);
          entity.episodeId = parts[2];
        }

        entities.push(entity);
      }
    }

    // Parse rating action
    let ratingAction = null;
    const ratingRegex = /RATING_ACTION\{type:(\w+),\s*name:([^,]+),\s*rating:(\d+)\}/;
    const ratingMatch = aiMessage.match(ratingRegex);
    
    if (ratingMatch) {
      const [, type, name, rating] = ratingMatch;
      ratingAction = {
        itemType: type,
        name: name.trim(),
        rating: parseInt(rating),
      };
      console.log("Detected rating action:", ratingAction);
    }

    // Generate follow-ups
    const followUps = [];
    if (entities.length > 0 && !ratingAction) {
      followUps.push("Tell me more");
      if (entities[0].type === "show") {
        followUps.push("What are the best episodes?");
      }
    }

    // Clean up the message (remove RATING_ACTION marker)
    const cleanMessage = aiMessage.replace(ratingRegex, "").trim();

    return new Response(
      JSON.stringify({
        sessionId: sessionId || crypto.randomUUID(),
        message: cleanMessage,
        entities,
        followUps,
        ratingAction,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("BingeBot error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
