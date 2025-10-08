import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TVDB v4 API client with token
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

// Scope check for TV-only topics
const NON_TV_HINTS = [
  "stocks", "politics", "weather", "sports", "recipe", "medical", "math",
  "programming", "crypto", "finance", "cars", "travel", "news", "history",
  "science", "school", "homework"
];

function isOutOfScope(text: string): boolean {
  const lower = text.toLowerCase();
  return NON_TV_HINTS.some(word => lower.includes(word));
}

// OpenAI Tools for TVDB
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
      description: "Get series details by TVDB id",
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
      description: "Get episodes for a season",
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

const SYSTEM_PROMPT = `You are BingeBot: a friendly, helpful TV expert for Serial Bowl.

SCOPE:
- Only discuss television: shows, seasons, episodes, air dates, plots (no spoilers unless asked), and celebrity info as it relates to TV.
- If asked anything non-TV, reply: "I'm here for TV topics only."
- Use your knowledge as the primary source. Use TVDB tools only when you need to verify specific details like episode numbers or air dates.
- When mentioning shows, seasons, or episodes, use their exact names clearly for clickable linking.
- Keep answers concise, upbeat, and conversational.
- Format episodes as S02E05 when you have that information.

TONE: Friendly, casual, fun, and knowledgeable — like chatting with a friend who loves TV.

IMPORTANT: Do not cite sources or mention where information comes from. Just provide helpful, accurate answers naturally.`;

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
    
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
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

    // Create session if needed
    let actualSessionId = sessionId;
    if (!actualSessionId) {
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

    // Save user message
    await supabase.from("chat_messages").insert({
      session_id: actualSessionId,
      role: "user",
      content: userQuery,
    });

    // Call Lovable AI (Gemini) with tools
    const geminiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
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

    // Generate follow-up suggestions based on user question
    const followUps = generateFollowUps(userQuery);

    // Extract entities from the response
    const entities: any[] = [];

    // Save assistant message (no source attribution)
    await supabase.from("chat_messages").insert({
      session_id: actualSessionId,
      role: "assistant",
      content: assistantMessage,
    });

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

// Helper to generate contextual follow-ups
function generateFollowUps(lastQ: string): string[] {
  const lower = lastQ.toLowerCase();
  
  if (/who played|actor|actress|cast/i.test(lower)) {
    return [
      "Who else was in that show?",
      "When did they first appear?",
      "What other shows were they in?"
    ];
  }
  if (/(what|which) episode|episode where/i.test(lower)) {
    return [
      "List all season episodes",
      "Give a spoiler-free summary",
      "Who guest-starred in that episode?"
    ];
  }
  if (/season/i.test(lower)) {
    return [
      "How many episodes in that season?",
      "When did that season air?",
      "Who joined the cast in that season?"
    ];
  }
  
  return [
    "Search for a TV show",
    "Tell me about <show name>",
    "Who played <character>?"
  ];
}
