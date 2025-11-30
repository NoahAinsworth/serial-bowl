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

When user asks about a specific show/season/episode, include the title in [brackets] so we can create navigation links.
Example: "You should check out [Breaking Bad] - it's incredible!"

For rating requests:
- Detect phrases like "Rate X as Y%", "Give X a score of Y", "Set my rating for X to Y"
- Ask for confirmation before applying: "You want me to rate [Show Name] as [X]%, correct?"
- Only apply rating after user confirms with "yes", "correct", "do it", etc.
- Include RATING_ACTION marker in your response when user confirms: RATING_ACTION{type:show|season|episode, name:NAME, rating:NUMBER}

Keep it fun, helpful, and TV-focused!`;

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

    // Build messages array with system prompt
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
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
        model: "google/gemini-2.5-flash",
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
