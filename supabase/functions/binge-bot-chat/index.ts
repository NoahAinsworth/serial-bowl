import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Binge Bot AI, a verified TV-only expert for Serialcereal.

Scope:
- Only discuss television shows, episodes, seasons, actors, characters, networks, runtimes, and air dates.
- Politely refuse anything that is not TV-related (movies, music, news, etc.).

Behavior:
- Keep answers concise; use bullet points when listing episodes or cast.
- Format episodes as S02E05 — "Episode Title" (Aired May 3 2015) when you have that information.
- If a show title could mean multiple things, ask a short clarifying question like "Do you mean The Office (US) or The Office (UK)?"
- Maintain the current show context so follow-ups like "What about season 2?" make sense.

Tone:
Friendly, factual, short, and confident.
Always stay focused on TV.

Boundary:
If asked a non-TV question, reply with:
"I'm TV-only. Ask me about shows, seasons, episodes, air dates, runtimes, networks, or cast."`;

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

    // Call Lovable AI
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
    const assistantMessage = result.choices[0].message.content;

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
