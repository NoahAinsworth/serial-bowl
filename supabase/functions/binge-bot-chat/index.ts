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

const SYSTEM_PROMPT = `You are Binge Bot, a helpful TV show assistant. Current date: October 9, 2025.

Use your knowledge and web search to answer questions about TV shows accurately.

IMPORTANT - When mentioning shows, seasons, or episodes, ALWAYS wrap them in [brackets]:
- Shows: [Peacemaker]
- Seasons: [Peacemaker Season 2]
- Episodes: [Peacemaker S02E01] or [Peacemaker S02E05 - Monkey Dory]

This makes them clickable so users can navigate to those pages in the app.

Keep responses concise (2-4 sentences) and provide 3-5 relevant follow-up suggestions.

Example:
"Yes! [Peacemaker] Season 2 premiered on August 21, 2025 on Max. Episode 1 [Peacemaker S02E01] sets up a great arc. The season has 8 episodes total."

Follow-ups: ["Who's in the cast?", "Episode guide", "When's the finale?", "Open [Peacemaker]"]`;

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

    // Call Gemini with web search grounding - no tools, just natural conversation
    const geminiMessages = [
      { role: "system", content: contextualPrompt },
      ...messages
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: geminiMessages,
        // Enable Google Search grounding for current info
        tools: [{ type: "google_search_retrieval" }]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your workspace.");
      }
      throw new Error("AI request failed");
    }

    const result = await aiResponse.json();
    console.log("AI response:", JSON.stringify(result).substring(0, 300));

    const assistantMessage = result.choices?.[0]?.message?.content || 
                            "I had trouble generating a response. Please try again.";
    
    console.log("Assistant message:", assistantMessage);

    // Now look up any shows mentioned to get TVDB IDs for deep linking
    const entities = await resolveEntitiesWithTVDB(assistantMessage);
    
    // Generate follow-up suggestions
    const followUps = generateFollowUps(userQuery, assistantMessage);

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

// Extract [bracketed] show names and look them up in TVDB for deep linking
async function resolveEntitiesWithTVDB(message: string): Promise<any[]> {
  const entities: any[] = [];
  const bracketRegex = /\[([^\]]+)\]/g;
  const matches = [...message.matchAll(bracketRegex)];
  
  for (const match of matches) {
    const entityName = match[1];
    
    // Extract show name (remove season/episode info)
    let showName = entityName;
    let seasonNum: number | undefined;
    let episodeNum: number | undefined;
    
    // Check for patterns like "Show S02E01", "Show S02E01 - Title", or "Show Season 2"
    const seasonEpisodeWithTitleMatch = entityName.match(/^(.+?)\s+S(\d+)E(\d+)\s*(?:-\s*.+)?$/i);
    const seasonEpisodeMatch = entityName.match(/^(.+?)\s+S(\d+)E(\d+)$/i);
    const seasonMatch = entityName.match(/^(.+?)\s+Season\s+(\d+)$/i);
    
    if (seasonEpisodeWithTitleMatch || seasonEpisodeMatch) {
      const match = (seasonEpisodeWithTitleMatch || seasonEpisodeMatch)!;
      showName = match[1];
      seasonNum = parseInt(match[2]);
      episodeNum = parseInt(match[3]);
    } else if (seasonMatch) {
      showName = seasonMatch[1];
      seasonNum = parseInt(seasonMatch[2]);
    }
    
    try {
      // Look up show in TVDB
      const searchResults = await tvdbFetch(`/search?query=${encodeURIComponent(showName)}&type=series`);
      if (searchResults && searchResults.length > 0) {
        const show = searchResults[0];
        
        entities.push({
          type: episodeNum ? "episode" : seasonNum ? "season" : "show",
          name: entityName,
          externalId: show.tvdb_id || show.id,
          seasonNumber: seasonNum,
          episodeId: episodeNum
        });
      }
    } catch (err) {
      console.error(`Failed to look up ${showName} in TVDB:`, err);
      // Still add entity but without TVDB ID
      entities.push({
        type: "show",
        name: entityName
      });
    }
  }
  
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
