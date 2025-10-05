import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are **Binge Bot AI**, Serialcereal's TV expert.

Rules:
- TV-only. Answer questions about TV shows, seasons, episodes, cast, characters, networks, runtimes, and air dates.
- Always use the provided server tools (TVDB wrappers) for facts. Do not invent data.
- Format episodes like **S02E05** and include air dates when available.
- If a title is ambiguous (same-name shows across regions/years), ask a one-line clarification.
- Keep answers concise; use bullet points for lists and short paragraphs otherwise.
- If data is missing, say so plainly and suggest the next best lookup.
- Maintain the current show context for follow-ups unless the user changes the show.

Tone:
- Friendly, efficient, and clear.

Boundary:
- If asked non-TV topics, reply: "I'm TV-only. Ask me about shows, seasons, episodes, air dates, runtimes, networks, or cast."`;

const CACHE_TTL_HOURS = 24;

async function getTVDBToken(supabase: any): Promise<string> {
  const tvdbApiKey = Deno.env.get("TVDB_API_KEY");
  if (!tvdbApiKey) throw new Error("TVDB_API_KEY not configured");

  const response = await fetch("https://api4.thetvdb.com/v4/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: tvdbApiKey }),
  });

  if (!response.ok) throw new Error("Failed to authenticate with TVDB");
  const data = await response.json();
  return data.data.token;
}

async function searchShows(supabase: any, token: string, query: string, limit = 10) {
  const response = await fetch(
    `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(query)}&type=series&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) throw new Error("TVDB search failed");
  const data = await response.json();
  
  return (data.data || []).map((item: any) => ({
    tvdbId: item.tvdb_id,
    name: item.name,
    year: item.year || null,
  }));
}

async function getShowDetails(supabase: any, token: string, tvdbId: number) {
  // Check cache
  const { data: cached } = await supabase
    .from("tvdb_shows")
    .select("*")
    .eq("tvdb_id", tvdbId)
    .single();

  if (cached && new Date(cached.updated_at).getTime() > Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000) {
    await supabase.from("chat_events").insert({ type: "cache_hit", payload: { tvdbId, source: "show" } });
    return cached.json;
  }

  await supabase.from("chat_events").insert({ type: "cache_miss", payload: { tvdbId, source: "show" } });

  const response = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/extended`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch show details");
  const result = await response.json();
  const show = result.data;

  const details = {
    tvdbId: show.id,
    name: show.name,
    years: `${show.firstAired?.substring(0, 4) || ""}${show.lastAired ? `-${show.lastAired.substring(0, 4)}` : ""}`,
    seasonCount: show.seasons?.length || 0,
    network: show.originalNetwork || show.latestNetwork || "N/A",
    runtime: show.averageRuntime || "N/A",
  };

  await supabase.from("tvdb_shows").upsert({
    tvdb_id: tvdbId,
    name: show.name,
    year: show.firstAired ? parseInt(show.firstAired.substring(0, 4)) : null,
    json: details,
    updated_at: new Date().toISOString(),
  });

  return details;
}

async function getSeasonEpisodes(supabase: any, token: string, tvdbId: number, seasonNumber: number) {
  const response = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/episodes/default`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch episodes");
  const result = await response.json();
  
  const episodes = (result.data.episodes || [])
    .filter((ep: any) => ep.seasonNumber === seasonNumber)
    .map((ep: any) => ({
      s: ep.seasonNumber,
      e: ep.number,
      name: ep.name,
      airDate: ep.aired || null,
      episodeId: ep.id,
    }));

  return episodes;
}

async function getEpisodeDetails(supabase: any, token: string, tvdbId: number, seasonNumber: number, episodeNumber: number) {
  // Check cache
  const { data: cached } = await supabase
    .from("tvdb_episodes")
    .select("*")
    .eq("tvdb_id", tvdbId)
    .eq("season", seasonNumber)
    .eq("episode", episodeNumber)
    .single();

  if (cached && new Date(cached.updated_at).getTime() > Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000) {
    await supabase.from("chat_events").insert({ type: "cache_hit", payload: { tvdbId, seasonNumber, episodeNumber } });
    return cached.json;
  }

  await supabase.from("chat_events").insert({ type: "cache_miss", payload: { tvdbId, seasonNumber, episodeNumber } });

  const response = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/episodes/default`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch episode details");
  const result = await response.json();
  
  const episode = (result.data.episodes || []).find(
    (ep: any) => ep.seasonNumber === seasonNumber && ep.number === episodeNumber
  );

  if (!episode) throw new Error("Episode not found");

  const details = {
    code: `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")}`,
    airDate: episode.aired || null,
    name: episode.name,
    overview: episode.overview || "No overview available",
    runtime: episode.runtime || "N/A",
  };

  await supabase.from("tvdb_episodes").upsert({
    tvdb_id: tvdbId,
    season: seasonNumber,
    episode: episodeNumber,
    json: details,
    updated_at: new Date().toISOString(),
  });

  return details;
}

async function getCast(supabase: any, token: string, tvdbId: number) {
  const response = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/extended`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error("Failed to fetch cast");
  const result = await response.json();
  
  const cast = (result.data.characters || []).map((char: any) => ({
    personId: char.peopleId,
    personName: char.personName,
    characterName: char.name,
  }));

  return cast.slice(0, 15); // Limit to top 15
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, messages } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create session if needed
    let actualSessionId = sessionId;
    if (!actualSessionId) {
      const { data: newSession } = await supabase
        .from("chat_sessions")
        .insert({})
        .select()
        .single();
      actualSessionId = newSession.id;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      session_id: actualSessionId,
      role: "user",
      content: messages[messages.length - 1].content,
    });

    const token = await getTVDBToken(supabase);

    // Define tools
    const tools = [
      {
        type: "function",
        function: {
          name: "searchShows",
          description: "Search for TV shows by name",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              limit: { type: "number", description: "Max results (default 10)" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getShowDetails",
          description: "Get detailed information about a TV show",
          parameters: {
            type: "object",
            properties: {
              tvdbId: { type: "number", description: "TVDB show ID" },
            },
            required: ["tvdbId"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getSeasonEpisodes",
          description: "Get episodes for a specific season",
          parameters: {
            type: "object",
            properties: {
              tvdbId: { type: "number", description: "TVDB show ID" },
              seasonNumber: { type: "number", description: "Season number" },
            },
            required: ["tvdbId", "seasonNumber"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getEpisodeDetails",
          description: "Get detailed information about a specific episode",
          parameters: {
            type: "object",
            properties: {
              tvdbId: { type: "number", description: "TVDB show ID" },
              seasonNumber: { type: "number", description: "Season number" },
              episodeNumber: { type: "number", description: "Episode number" },
            },
            required: ["tvdbId", "seasonNumber", "episodeNumber"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getCast",
          description: "Get cast information for a TV show",
          parameters: {
            type: "object",
            properties: {
              tvdbId: { type: "number", description: "TVDB show ID" },
            },
            required: ["tvdbId"],
          },
        },
      },
    ];

    // Call Lovable AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    let assistantMessage = "";
    let toolCalls: any[] = [];
    let iterations = 0;
    const maxIterations = 5;

    const conversationMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    while (iterations < maxIterations) {
      iterations++;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error("AI request failed");
      }

      const result = await response.json();
      const choice = result.choices[0];
      
      if (choice.message.tool_calls) {
        toolCalls = choice.message.tool_calls;
        conversationMessages.push(choice.message);

        // Execute tool calls
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          await supabase.from("chat_events").insert({ 
            session_id: actualSessionId,
            type: `tool_call:${functionName}`, 
            payload: args 
          });

          let toolResult;
          try {
            switch (functionName) {
              case "searchShows":
                toolResult = await searchShows(supabase, token, args.query, args.limit);
                break;
              case "getShowDetails":
                toolResult = await getShowDetails(supabase, token, args.tvdbId);
                break;
              case "getSeasonEpisodes":
                toolResult = await getSeasonEpisodes(supabase, token, args.tvdbId, args.seasonNumber);
                break;
              case "getEpisodeDetails":
                toolResult = await getEpisodeDetails(supabase, token, args.tvdbId, args.seasonNumber, args.episodeNumber);
                break;
              case "getCast":
                toolResult = await getCast(supabase, token, args.tvdbId);
                break;
              default:
                toolResult = { error: "Unknown tool" };
            }
          } catch (error) {
            toolResult = { error: error instanceof Error ? error.message : "Unknown error" };
          }

          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      } else {
        assistantMessage = choice.message.content;
        break;
      }
    }

    // Save assistant message
    await supabase.from("chat_messages").insert({
      session_id: actualSessionId,
      role: "assistant",
      content: assistantMessage,
    });

    return new Response(
      JSON.stringify({ 
        sessionId: actualSessionId, 
        message: assistantMessage 
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
