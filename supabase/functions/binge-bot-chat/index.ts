import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TVDB v4 API client
const TVDB_BASE = "https://api4.thetvdb.com/v4";

async function tvdbFetch(path: string, token: string) {
  const res = await fetch(`${TVDB_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TVDB ${path} ${res.status}: ${text}`);
  }
  
  return res.json();
}

async function searchSeries(query: string, token: string) {
  const data = await tvdbFetch(`/search?query=${encodeURIComponent(query)}&type=series`, token);
  return data.data || [];
}

async function getSeriesById(tvdbId: number, token: string) {
  const data = await tvdbFetch(`/series/${tvdbId}`, token);
  return data.data || {};
}

async function getEpisodesForSeason(tvdbId: number, seasonNumber: number, token: string) {
  const data = await tvdbFetch(`/series/${tvdbId}/episodes/default/eng`, token);
  const episodes = data.data?.episodes || [];
  return episodes.filter((ep: any) => ep.seasonNumber === seasonNumber);
}

async function getEpisodeBySE(tvdbId: number, season: number, episode: number, token: string) {
  const data = await tvdbFetch(`/series/${tvdbId}/episodes/default/eng`, token);
  const episodes = data.data?.episodes || [];
  return episodes.find((ep: any) => ep.seasonNumber === season && ep.number === episode);
}

async function getSeriesPeople(tvdbId: number, token: string) {
  const data = await tvdbFetch(`/series/${tvdbId}/people`, token);
  return data.data || {};
}

// Scope check
const NON_TV_HINTS = [
  "stocks", "politics", "weather", "sports", "recipe", "medical", "math",
  "programming", "crypto", "finance", "cars", "travel", "news", "history",
  "science", "school", "homework"
];

function isOutOfScope(text: string): boolean {
  const lower = text.toLowerCase();
  return NON_TV_HINTS.some(word => lower.includes(word));
}

// OpenAI Tools for TVDB + Web Search
const TOOLS = [
  {
    type: "function",
    function: {
      name: "searchShow",
      description: "Search TV shows by title via TVDB v4",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getShowDetails",
      description: "Get series details by TVDB id - includes air dates, status, genres, network",
      parameters: {
        type: "object",
        properties: { tvdb_id: { type: "integer" } },
        required: ["tvdb_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSeasonEpisodes",
      description: "Get all episodes for a specific season with air dates",
      parameters: {
        type: "object",
        properties: {
          tvdb_id: { type: "integer" },
          season_number: { type: "integer" },
        },
        required: ["tvdb_id", "season_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEpisode",
      description: "Get a specific episode by season/episode numbers",
      parameters: {
        type: "object",
        properties: {
          tvdb_id: { type: "integer" },
          season_number: { type: "integer" },
          episode_number: { type: "integer" },
        },
        required: ["tvdb_id", "season_number", "episode_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSeriesPeople",
      description: "Get cast/crew for a series",
      parameters: {
        type: "object",
        properties: { tvdb_id: { type: "integer" } },
        required: ["tvdb_id"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are BingeBotAI, a smart TV show assistant for SerialBowl.

CORE GOALS:
- Help users discover shows, seasons, episodes, and people
- Detect entities (show, season, episode, person) and resolve them with TVDB
- Always wrap entity names in [brackets] for clickable deep-links
- Provide 3-6 contextual follow-up suggestions as tappable chips

SOURCES & PRIORITY:
1. Primary: Your knowledge + TVDB for canonical data (IDs, air dates, episode lists)
2. Cross-check facts; if sources disagree, trust TVDB but mention the discrepancy

SPOILER POLICY (CRITICAL):
- ALWAYS check user's hide_spoilers setting before answering
- If hide_spoilers=true:
  • Redact plot-critical details beyond user's tracked progress
  • Wrap spoiler content in [SPOILER: content] tags
  • Never reveal events after user's last_seen_episode
- If user explicitly asks for spoilers, show them but wrap in [SPOILER: ] tags

SEASON STATUS DETECTION:
When asked if a season is "out" or "released":
1. Use getShowDetails + getSeasonEpisodes to check air dates
2. Determine status based on episode air dates:
   - "airing" = first episode aired BUT finale hasn't aired yet
   - "released" = all episodes have aired
   - "upcoming" = first episode hasn't aired yet
3. Always include: premiere date, finale date (if known), total episodes, network

TONE & FORMAT:
- Friendly, concise, helpful (max 5 sentences before follow-ups)
- Use short sections with bolded micro-headings when needed
- Wrap every show/season/episode/person name in [brackets] for clickable links
- Example: "**[Peacemaker]** Season 2 is airing now. Premiered Aug 21, 2025 on Max; finale Oct 9, 2025."

ENTITY LINKING (CRITICAL):
- Always wrap entity names in brackets: [ShowName], [Season 2], [Episode Title]
- The UI will convert these to deep links automatically
- Link format examples:
  • Show → [One Tree Hill]
  • Season → [One Tree Hill - Season 2]
  • Episode → [One Tree Hill - S01E01]
  • Person → [Chad Michael Murray]

FOLLOW-UP CHIPS:
- Generate 3-6 contextual next questions after each answer
- Always include at least one navigational chip ("Open [Show]")
- Examples:
  • "Who played Brooke Davis?"
  • "What season did Lucas leave?"
  • "Open [One Tree Hill]"
  • "Best Lucas episodes"

PERSONALIZATION:
- Use user's favorites, watchlist, and genre preferences when recommending
- If user has tracked progress, acknowledge it: "Based on your watchlist..."
- Prioritize shows matching their taste profile

GUARDRAILS:
- If no TVDB results, ask clarification + show disambiguation chips
- If TVDB is down, answer from knowledge but mark entities as "unverified"
- If sources conflict, be transparent: "Based on TVDB and recent coverage..."
- Never make up air dates or episode counts

SCOPE:
✓ TV shows, seasons, episodes, actors, streaming platforms
✓ "What to watch", recommendations, episode guides
✓ Release dates, cast info, episode summaries
✓ User's watchlist, favorites, progress tracking
✗ Movies (redirect to TV equivalent if possible)
✗ Non-TV topics (politely decline and redirect to TV)

Always extract entities from your response so the UI can make them clickable.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, messages } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const tvdbApiKey = Deno.env.get("TVDB_API_KEY")!;
    
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");
    if (!tvdbApiKey) throw new Error("TVDB_API_KEY not configured");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header & fetch profile
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    let user = null;
    let userProfile: any = null;
    
    if (token) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
        
        // Fetch user profile with settings and preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();
        
        const { data: prefs } = await supabase
          .from('user_prefs')
          .select('genres, shows')
          .eq('user_id', user.id)
          .single();
        
        const { data: progress } = await supabase
          .from('watched')
          .select('content_id, watched_at')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false })
          .limit(10);
        
        userProfile = {
          hide_spoilers: profile?.settings?.hide_spoilers ?? true,
          favorite_genres: prefs?.genres ?? [],
          favorite_shows: prefs?.shows ?? [],
          recent_progress: progress ?? []
        };
      }
    }

    // Check for out-of-scope topics
    const userQuery = messages[messages.length - 1].content;
    if (isOutOfScope(userQuery)) {
      return new Response(
        JSON.stringify({ 
          sessionId, 
          message: "I'm here for TV topics only—shows, seasons, episodes, and TV-related celebrity info.",
          entities: [],
          followUps: [
            "Who played <character>?",
            "List episodes for Season 1",
            "What season did they first appear?"
          ]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add user context to system prompt if available
    let contextualPrompt = SYSTEM_PROMPT;
    if (userProfile) {
      contextualPrompt += `\n\nUSER CONTEXT:
- Spoiler protection: ${userProfile.hide_spoilers ? 'ENABLED - Be very careful about spoilers!' : 'DISABLED - User is okay with spoilers'}
- Favorite genres: ${userProfile.favorite_genres.join(', ') || 'None set'}
- Favorite shows: ${userProfile.favorite_shows.join(', ') || 'None set'}
- Recent activity: User has tracked ${userProfile.recent_progress.length} items recently

Use this context to personalize recommendations and respect spoiler preferences.`;
    }

    // Create session if needed (only if user is authenticated)
    let actualSessionId = sessionId;
    if (!actualSessionId && user) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (sessionError) {
        console.error("Session creation error:", sessionError);
        throw new Error("Failed to create chat session");
      }
      
      actualSessionId = newSession.id;
    }

    // Save user message (only if we have a session)
    if (actualSessionId) {
      await supabase.from("chat_messages").insert({
        session_id: actualSessionId,
        role: "user",
        content: userQuery,
      });
    }

    // Call Lovable AI (Gemini) with tools
    const geminiMessages = [
      { role: "system", content: contextualPrompt },
      ...messages
    ];

    let aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: geminiMessages,
        tools: TOOLS,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI (Gemini) error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable AI workspace.");
      }
      throw new Error("AI request failed");
    }

    let result = await aiResponse.json();
    let toolCalls = result.choices[0].message.tool_calls;

    // Handle tool calls if Gemini made any
    if (toolCalls && toolCalls.length > 0) {
      const toolMessages = [...geminiMessages, result.choices[0].message];
      
      for (const toolCall of toolCalls) {
        const fname = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult: any;

        try {
          if (fname === "searchShow") {
            toolResult = await searchSeries(args.query, tvdbApiKey);
          } else if (fname === "getShowDetails") {
            toolResult = await getSeriesById(args.tvdb_id, tvdbApiKey);
          } else if (fname === "getSeasonEpisodes") {
            toolResult = await getEpisodesForSeason(args.tvdb_id, args.season_number, tvdbApiKey);
          } else if (fname === "getEpisode") {
            toolResult = await getEpisodeBySE(args.tvdb_id, args.season_number, args.episode_number, tvdbApiKey);
          } else if (fname === "getSeriesPeople") {
            toolResult = await getSeriesPeople(args.tvdb_id, tvdbApiKey);
          }

          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ ok: true, data: toolResult }),
          });
        } catch (err) {
          console.error(`Tool ${fname} error:`, err);
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ ok: false, error: String(err) }),
          });
        }
      }

      // Second call with tool results to Gemini
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: toolMessages,
        }),
      });

      if (followUpResponse.ok) {
        result = await followUpResponse.json();
      }
    }

    const assistantMessage = result.choices[0].message.content;
    console.log("Assistant message:", assistantMessage);

    // Generate follow-up suggestions based on user question and context
    const followUps = generateFollowUps(userQuery, assistantMessage);

    // Extract entities from the response (parse [brackets])
    const entities = extractEntities(assistantMessage);

    // Save assistant message (only if we have a session)
    if (actualSessionId) {
      await supabase.from("chat_messages").insert({
        session_id: actualSessionId,
        role: "assistant",
        content: assistantMessage,
      });
    }

    return new Response(
      JSON.stringify({ 
        sessionId: actualSessionId, 
        message: assistantMessage,
        entities,
        followUps
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to extract entities from [bracketed] text
function extractEntities(message: string): any[] {
  const entities: any[] = [];
  const bracketRegex = /\[([^\]]+)\]/g;
  const matches = [...message.matchAll(bracketRegex)];
  
  matches.forEach(match => {
    const entityName = match[1];
    
    // Determine type based on patterns
    let type: "show" | "season" | "episode" | "person" = "show";
    
    if (/S\d{2}E\d{2}/i.test(entityName)) {
      type = "episode";
    } else if (/Season \d+/i.test(entityName)) {
      type = "season";
    } else if (/\s-\s/.test(entityName) && entityName.split(' - ').length === 2) {
      // Could be "ShowName - Season X" or "ShowName - S01E01"
      if (/Season \d+/i.test(entityName.split(' - ')[1])) {
        type = "season";
      } else if (/S\d{2}E\d{2}/i.test(entityName.split(' - ')[1])) {
        type = "episode";
      }
    }
    
    entities.push({
      type,
      name: entityName,
      // In a full implementation, we'd look these up from TVDB
      // For now, we'll rely on the frontend handling navigation
    });
  });
  
  return entities;
}

// Helper to generate contextual follow-ups
function generateFollowUps(lastQ: string, assistantMsg: string): string[] {
  const lower = lastQ.toLowerCase();
  const msgLower = assistantMsg.toLowerCase();
  
  // Extract show names from brackets in the response
  const showMatches = [...assistantMsg.matchAll(/\[([^\]]+)\]/g)];
  const firstShow = showMatches.length > 0 ? showMatches[0][1] : null;
  
  if (/who played|actor|actress|cast/i.test(lower)) {
    return [
      "Who else was in that show?",
      firstShow ? `Open [${firstShow}]` : "Tell me more about the show",
      "What other shows were they in?",
      "Best episodes featuring this character"
    ];
  }
  
  if (/(what|which) episode|episode where/i.test(lower)) {
    return [
      "List all season episodes",
      "Give a spoiler-free summary",
      "Who guest-starred in that episode?",
      firstShow ? `Open [${firstShow}]` : "Tell me about the show"
    ];
  }
  
  if (/season/i.test(lower)) {
    return [
      "How many episodes in that season?",
      "When did that season air?",
      "Who joined the cast in that season?",
      firstShow ? `Open [${firstShow}]` : "List all seasons"
    ];
  }
  
  if (/is.*out|release|premiere|airing/i.test(lower)) {
    return [
      "List all episodes",
      "When does the finale air?",
      firstShow ? `Open [${firstShow}]` : "Tell me more",
      "Set a reminder for new episodes"
    ];
  }
  
  if (firstShow) {
    return [
      `Open [${firstShow}]`,
      `Who's in [${firstShow}]?`,
      `Best episodes of [${firstShow}]`,
      `When did [${firstShow}] premiere?`
    ];
  }
  
  return [
    "Search for a TV show",
    "What's trending right now?",
    "Recommend a thriller series",
    "Who played <character>?"
  ];
}
