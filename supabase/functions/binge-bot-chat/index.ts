import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TVDB API helper
async function searchTVDB(query: string, apiKey: string) {
  try {
    const loginRes = await fetch("https://api4.thetvdb.com/v4/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey }),
    });
    const { data: { token } } = await loginRes.json();

    const searchRes = await fetch(`https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(query)}&type=series`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    return searchData.data || [];
  } catch (error) {
    console.error("TVDB search error:", error);
    return [];
  }
}

async function getTVDBEpisodes(seriesId: number, apiKey: string) {
  try {
    const loginRes = await fetch("https://api4.thetvdb.com/v4/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey }),
    });
    const { data: { token } } = await loginRes.json();

    const episodesRes = await fetch(`https://api4.thetvdb.com/v4/series/${seriesId}/episodes/default`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const episodesData = await episodesRes.json();
    return episodesData.data?.episodes || [];
  } catch (error) {
    console.error("TVDB episodes error:", error);
    return [];
  }
}

const SYSTEM_PROMPT = `You are Binge Bot AI, a friendly TV and celebrity expert for Serial Bowl.

Scope:
- Discuss television shows, episodes, seasons, actors, celebrities, characters, networks, runtimes, air dates, filmography, roles, awards, and career highlights.
- Keep celebrity info age-appropriate and focused on their professional work (no gossip or private life details).
- Politely refuse non-TV/celebrity topics (sports, politics, news unrelated to entertainment).

Behavior:
- Keep answers conversational, friendly, and helpful — like chatting with a friend who loves TV.
- Format episodes as S02E05 — "Episode Title" (Aired May 3, 2015) when you have that information.
- When mentioning shows, seasons, or episodes, use their exact names for linking.
- If a show title could mean multiple things, ask a short clarifying question.
- Maintain context for follow-ups.

Tone:
Friendly, casual, fun, and knowledgeable — NOT robotic.

Boundary:
If asked a non-TV/celebrity question, gently redirect:
"I'm all about TV shows and entertainment! Ask me about shows, actors, seasons, episodes, or careers."`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, messages } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const tvdbApiKey = Deno.env.get("VITE_TVDB_API_KEY")!;
    
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract entities from user's last message
    const userQuery = messages[messages.length - 1].content;
    let tvdbContext = "";

    // Search TVDB for show mentions
    const tvdbResults = await searchTVDB(userQuery, tvdbApiKey);
    if (tvdbResults.length > 0) {
      const topShow = tvdbResults[0];
      const episodes = await getTVDBEpisodes(topShow.tvdb_id, tvdbApiKey);
      
      tvdbContext = `\n\nVerified TVDB data for "${topShow.name}":\n` +
        `- TVDB ID: ${topShow.tvdb_id}\n` +
        `- First aired: ${topShow.first_air_time || 'N/A'}\n` +
        `- Total episodes: ${episodes.length}\n`;
      
      if (episodes.length > 0) {
        tvdbContext += `- Recent episodes:\n`;
        episodes.slice(0, 3).forEach((ep: any) => {
          tvdbContext += `  * S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.number).padStart(2, '0')} — "${ep.name}" (${ep.aired || 'N/A'})\n`;
        });
      }
    }

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

    // First call: Get the main response with TVDB context
    const enrichedMessages = [...messages];
    if (tvdbContext) {
      enrichedMessages[enrichedMessages.length - 1] = {
        ...enrichedMessages[enrichedMessages.length - 1],
        content: `${userQuery}${tvdbContext}`
      };
    }

    const mainResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...enrichedMessages,
        ],
      }),
    });

    if (!mainResponse.ok) {
      const errorText = await mainResponse.text();
      console.error("Lovable AI error:", mainResponse.status, errorText);
      
      if (mainResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (mainResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable AI workspace.");
      }
      throw new Error("AI request failed");
    }

    const mainResult = await mainResponse.json();
    const assistantMessage = mainResult.choices[0].message.content;

    console.log("Assistant message:", assistantMessage);

    // Second call: Extract entities and generate follow-ups
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract TV show entities (shows, seasons, episodes) and generate 3 contextual follow-up questions. For episodes, extract the season number and episode number separately."
          },
          {
            role: "user",
            content: `Question: ${messages[messages.length - 1].content}\nAnswer: ${assistantMessage}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_entities_and_followups",
              description: "Extract show/season/episode entities and generate follow-ups",
              parameters: {
                type: "object",
                properties: {
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["show", "season", "episode"] },
                        name: { type: "string" },
                        seasonNumber: { type: "number" },
                        episodeNumber: { type: "number" }
                      },
                      required: ["type", "name"]
                    }
                  },
                  followUps: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 short follow-up questions under 80 chars each"
                  }
                },
                required: ["entities", "followUps"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_entities_and_followups" } }
      }),
    });

    let entities = [];
    let followUps = [];

    if (extractResponse.ok) {
      try {
        const extractResult = await extractResponse.json();
        const toolCalls = extractResult.choices[0].message.tool_calls;
        
        if (toolCalls && toolCalls.length > 0) {
          const args = JSON.parse(toolCalls[0].function.arguments);
          entities = args.entities || [];
          followUps = args.followUps || [];
          console.log("Extracted entities:", entities);
          console.log("Generated follow-ups:", followUps);
        }
      } catch (e) {
        console.error("Error extracting entities:", e);
      }
    }

    // Resolve entities to database IDs
    const resolvedEntities = [];
    for (const entity of entities) {
      if (entity.type === "show") {
        const { data: shows } = await supabase
          .from("content")
          .select("id, external_id, title")
          .eq("kind", "show")
          .ilike("title", `%${entity.name}%`)
          .limit(1);
        
        if (shows && shows.length > 0) {
          resolvedEntities.push({
            type: "show",
            name: entity.name,
            id: shows[0].id,
            externalId: shows[0].external_id
          });
        }
      } else if (entity.type === "episode" && entity.seasonNumber && entity.episodeNumber) {
        // For episodes, we need to find the show first, then construct the episode info
        const { data: shows } = await supabase
          .from("content")
          .select("id, external_id, title")
          .eq("kind", "show")
          .limit(1);
        
        if (shows && shows.length > 0) {
          resolvedEntities.push({
            type: "episode",
            name: entity.name,
            externalId: shows[0].external_id,
            seasonNumber: entity.seasonNumber,
            episodeId: `${entity.seasonNumber}-${entity.episodeNumber}`
          });
        }
      }
    }

    // Save assistant message with entities
    await supabase.from("chat_messages").insert({
      session_id: actualSessionId,
      role: "assistant",
      content: assistantMessage,
    });

    return new Response(
      JSON.stringify({ 
        sessionId: actualSessionId, 
        message: assistantMessage,
        entities: resolvedEntities,
        followUps: followUps.slice(0, 3)
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
