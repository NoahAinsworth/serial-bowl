import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, X, Sparkles, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BingeBotMessage } from "./BingeBotMessage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BingeBotLoadingIndicator } from "./BingeBotLoadingIndicator";

interface Entity {
  type: "show" | "season" | "episode";
  name: string;
  id?: string;
  externalId?: string;
  seasonNumber?: number;
  episodeId?: string;
}

interface RatingAction {
  itemType: "show" | "season" | "episode";
  name: string;
  rating: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  entities?: Entity[];
  followUps?: string[];
  ratingAction?: RatingAction;
}

interface BingeBotAIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
}

export function BingeBotAI({ open, onOpenChange, initialPrompt }: BingeBotAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("binge-bot-chat", {
        body: {
          sessionId,
          messages: [...messages, { role: "user", content: userMessage }],
        },
      });

      if (error) throw error;

      setSessionId(data.sessionId);
      
      const assistantMessage = {
        role: "assistant" as const,
        content: data.message,
        entities: data.entities || [],
        followUps: data.followUps || [],
        ratingAction: data.ratingAction
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Handle rating action if present
      if (data.ratingAction) {
        await handleRatingAction(data.ratingAction);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response from Binge Bot AI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRatingAction = async (action: RatingAction) => {
    try {
      // Find the content in database to get proper item_id
      const { data: contentData, error: searchError } = await supabase
        .from("content")
        .select("external_id, kind")
        .ilike("title", `%${action.name}%`)
        .eq("kind", action.itemType)
        .maybeSingle();

      if (searchError || !contentData) {
        toast({
          title: "Rating Error",
          description: `Could not find ${action.name} to rate`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.rpc("api_rate_and_review", {
        p_item_type: action.itemType,
        p_item_id: contentData.external_id,
        p_score_any: String(action.rating),
        p_review: null,
        p_is_spoiler: false,
      });

      if (error) throw error;

      toast({
        title: "Rating Applied! ⭐",
        description: `Rated ${action.name} as ${action.rating}%`,
      });
    } catch (error: any) {
      console.error("Rating error:", error);
      toast({
        title: "Rating Error",
        description: error.message || "Failed to apply rating",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleFollowUpClick = async (followUp: string) => {
    setInput(followUp);
    // Auto-send the follow-up
    setMessages((prev) => [...prev, { role: "user", content: followUp }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("binge-bot-chat", {
        body: {
          sessionId,
          messages: [...messages, { role: "user", content: followUp }],
        },
      });

      if (error) throw error;

      setSessionId(data.sessionId);
      
      const assistantMessage = {
        role: "assistant" as const,
        content: data.message,
        entities: data.entities || [],
        followUps: data.followUps || [],
        ratingAction: data.ratingAction
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setInput("");

      // Handle rating action if present
      if (data.ratingAction) {
        await handleRatingAction(data.ratingAction);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEntityClick = (entity: Entity) => {
    onOpenChange(false);
    
    if (entity.type === "show" && entity.externalId) {
      navigate(`/show/${entity.externalId}`);
    } else if (entity.type === "season" && entity.externalId && entity.seasonNumber) {
      navigate(`/show/${entity.externalId}/season/${entity.seasonNumber}`);
    } else if (entity.type === "episode" && entity.externalId && entity.seasonNumber && entity.episodeId) {
      navigate(`/show/${entity.externalId}/season/${entity.seasonNumber}/episode/${entity.episodeId}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Modern Header */}
      <div className="border-b px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden border-2 border-border shadow-md flex-shrink-0">
            <video
              src="/videos/bingebot-bounce.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-semibold text-sm sm:text-base">BingeBot AI</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              TV Genius
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full px-1 sm:px-4 py-2 sm:py-6 space-y-3 sm:space-y-6">

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="h-20 w-20 mb-4 rounded-full overflow-hidden border-3 border-border shadow-xl">
                <video
                  src="/videos/bingebot-bounce.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground mb-6">Ask me about shows, seasons, episodes, or cast</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {["Find me a show to watch", "Who plays Walter White?", "Rate Breaking Bad 95%", "Show me The Office"].map((q) => (
                  <Button 
                    key={q} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setInput(q)}
                    className="border-2 hover:scale-105 transition-transform"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end mb-3 sm:mb-4 w-full">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl px-2.5 sm:px-4 py-2 sm:py-2.5 max-w-[98%] sm:max-w-[85%] break-words text-xs sm:text-sm border-2 border-border shadow-md">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 sm:gap-3 mb-3 sm:mb-4 w-full">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-border flex-shrink-0 mt-0.5">
                        <video
                          src="/videos/bingebot-bounce.mp4"
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                        <BingeBotMessage
                          content={msg.content}
                          entities={msg.entities}
                          sessionId={sessionId || ''}
                          question={messages[idx - 1]?.content || ''}
                          onEntityClick={handleEntityClick}
                        />
                        {msg.followUps && msg.followUps.length > 0 && idx === messages.length - 1 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.followUps.map((followUp, i) => (
                              <Button
                                key={i}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleFollowUpClick(followUp)}
                                disabled={loading}
                                className="h-8 text-xs rounded-full"
                              >
                                {followUp}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-border">
                    <video
                      src="/videos/bingebot-bounce.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <BingeBotLoadingIndicator />
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t px-2 sm:px-4 py-2 sm:py-4 bg-background">
        <div className="w-full flex gap-1.5 sm:gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message BingeBot AI..."
            className="flex-1 rounded-full text-sm"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
