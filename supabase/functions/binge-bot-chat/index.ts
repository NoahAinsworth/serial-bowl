import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TVDB v4 API with token caching
const TVDB_BASE = "https://api4.thetvdb.com/v4";
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTvdbToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const apiKey = Deno.env.get("TVDB_API_KEY");
  if (!apiKey) throw new Error("TVDB_API_KEY not configured");

  const res = await fetch(`${TVDB_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey }),
  });

  if (!res.ok) throw new Error(`TVDB login failed: ${res.status}`);

  const { data } = await res.json();
  cachedToken = {
    token: data.token,
    expiresAt: Date.now() + 27 * 24 * 60 * 60 * 1000,
  };
  
  return data.token;
}

async function tvdbFetch(path: string) {
  let token = await getTvdbToken();
  let res = await fetch(`${TVDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (res.status === 401) {
    cachedToken = null;
    token = await getTvdbToken();
    res = await fetch(`${TVDB_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TVDB error: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.data || json;
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

// Gemini Tools for TVDB + Web Search
const TOOLS = [
  {
    type: "function",
    function: {
      name: "searchShow",
      description: "Search TV shows by title via TVDB v4. Returns array of shows with id, name, year, image. If TVDB returns empty results or errors, you should try webSearch instead.",
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
      description: "Get series details by TVDB id - includes air dates, status, genres, network. If this fails or TVDB is down, you should try webSearch for the show name.",
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
      description: "Get all episodes for a specific season with air dates. If TVDB has no data or errors, try webSearch with '<show name> season <number> episodes release dates'.",
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
      description: "Get a specific episode by season/episode numbers. If TVDB has no data, try webSearch.",
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
      description: "Get cast/crew for a series. If TVDB has no data, try webSearch for '<show name> cast'.",
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
      name: "webSearch",
      description: "Search the web using Google search with Gemini. Use this ONLY when TVDB fails, returns empty results, or doesn't have recent data (last 60-90 days). Useful for: recent releases, episode air dates, cast updates, streaming availability. Include show name and be specific.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - be specific, e.g. 'Peacemaker season 2 release schedule' or 'One Tree Hill cast members'"
          }
        },
        required: ["query"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Binge Bot, a helpful TV show assistant.

Keep answers concise and conversational. Always wrap show names in [brackets] like [Peacemaker] so they're clickable.

When searching for shows, use the searchShow tool. If it fails or returns nothing, try searching the web instead.

Provide 3-5 follow-up suggestions after each response.`;

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
    const tvdbPin = Deno.env.get("TVDB_PIN"); // Optional
    
    console.log("Environment check:", {
      hasLovableKey: !!lovableApiKey,
      hasTvdbKey: !!tvdbApiKey,
      hasTvdbPin: !!tvdbPin,
    });
    
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
    console.log("Initial AI response:", JSON.stringify(result).substring(0, 500));
    
    let toolCalls = result.choices?.[0]?.message?.tool_calls;

    // Handle tool calls if Gemini made any
    if (toolCalls && toolCalls.length > 0) {
      const toolMessages = [...geminiMessages, result.choices[0].message];
      
      for (const toolCall of toolCalls) {
        const fname = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult: any;

        try {
          console.log(`Tool: ${fname}`, args);
          
          if (fname === "searchShow") {
            toolResult = await tvdbFetch(`/search?query=${encodeURIComponent(args.query)}&type=series`);
          } else if (fname === "getShowDetails") {
            toolResult = await tvdbFetch(`/series/${args.tvdb_id}`);
          } else if (fname === "getSeasonEpisodes") {
            const data = await tvdbFetch(`/series/${args.tvdb_id}/episodes/default/eng`);
            toolResult = (data.episodes || []).filter((e: any) => e.seasonNumber === args.season_number);
          } else if (fname === "getEpisode") {
            const data = await tvdbFetch(`/series/${args.tvdb_id}/episodes/default/eng`);
            toolResult = (data.episodes || []).find((e: any) => 
              e.seasonNumber === args.season_number && e.number === args.episode_number
            );
          } else if (fname === "getSeriesPeople") {
            toolResult = await tvdbFetch(`/series/${args.tvdb_id}/people`);
          } else if (fname === "webSearch") {
            toolResult = { 
              note: "Search query received",
              query: args.query
            };
          }

          console.log(`Tool ${fname} completed`);
          
          // Proper tool response format for Gemini
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: fname,
            content: JSON.stringify(toolResult)
          });
        } catch (err) {
          console.error(`Tool ${fname} error:`, err);
          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: fname,
            content: JSON.stringify({ error: String(err) })
          });
        }
      }

      // Second call with tool results
      console.log("Making follow-up call with tool results...");
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: toolMessages
        }),
      });

      if (followUpResponse.ok) {
        result = await followUpResponse.json();
        console.log("Follow-up response:", JSON.stringify(result).substring(0, 500));
      } else {
        const errorText = await followUpResponse.text();
        console.error("Follow-up call failed:", followUpResponse.status, errorText);
      }
    }

    // Extract assistant message - handle both content and potential null values
    const assistantMessage = result.choices?.[0]?.message?.content || 
                            result.choices?.[0]?.text || 
                            "I found some information but had trouble formatting the response. Please try asking again.";
    
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
