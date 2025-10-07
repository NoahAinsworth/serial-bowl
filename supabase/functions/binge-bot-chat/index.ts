import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Binge Bot AI, a TV and celebrity expert for Serial Bowl.

Scope:
- Discuss television shows, episodes, seasons, actors, celebrities, characters, networks, runtimes, air dates, filmography, roles, awards, and career highlights.
- Keep celebrity info age-appropriate and focused on their professional work (no gossip or private life details).
- Politely refuse non-TV/celebrity topics (sports, politics, news unrelated to entertainment).

Behavior:
- Keep answers concise and TV-savvy; use bullet points when listing episodes or cast.
- Format episodes as S02E05 — "Episode Title" (Aired May 3 2015) when you have that information.
- When mentioning shows, seasons, or episodes, be specific about titles.
- If a show title could mean multiple things, ask a short clarifying question.
- Maintain context for follow-ups.

Tone:
Friendly, factual, concise, and confident.

Boundary:
If asked a non-TV/celebrity question, reply with:
"I focus on TV shows and entertainment. Ask me about shows, actors, seasons, episodes, or careers!"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, messages } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");
    
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

    // Call Lovable AI with parallel tool calling for entity extraction
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_entities_and_followups",
              description: "Extract show/season/episode entities mentioned in the response and generate 3 contextual follow-up questions",
              parameters: {
                type: "object",
                properties: {
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["show", "season", "episode"] },
                        name: { type: "string" }
                      },
                      required: ["type", "name"]
                    }
                  },
                  followUps: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 contextual follow-up questions (max 80 chars each)"
                  }
                },
                required: ["entities", "followUps"]
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable AI workspace.");
      }
      throw new Error("AI request failed");
    }

    const result = await response.json();
    const assistantMessage = result.choices[0].message.content || "";
    const toolCalls = result.choices[0].message.tool_calls;

    let entities = [];
    let followUps = [];

    // Extract entities and follow-ups from tool call if present
    if (toolCalls && toolCalls.length > 0) {
      try {
        const toolCall = toolCalls[0];
        const args = JSON.parse(toolCall.function.arguments);
        entities = args.entities || [];
        followUps = args.followUps || [];
      } catch (e) {
        console.error("Error parsing tool call:", e);
      }
    }

    // Resolve entities to database IDs
    const resolvedEntities = [];
    for (const entity of entities) {
      if (entity.type === "show") {
        // Search for show in content table
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
