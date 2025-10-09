import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BingeBotMessage } from "./BingeBotMessage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Entity {
  type: "show" | "season" | "episode";
  name: string;
  id?: string;
  externalId?: string;
  seasonNumber?: number;
  episodeId?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  entities?: Entity[];
  followUps?: string[];
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          entities: data.entities || [],
          followUps: data.followUps || []
        }
      ]);
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          entities: data.entities || [],
          followUps: data.followUps || []
        }
      ]);
      setInput("");
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
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500">
            <AvatarFallback className="bg-transparent text-white font-bold">BB</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-base">Binge Bot</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Assistant
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <Avatar className="h-20 w-20 mb-4 bg-gradient-to-br from-purple-500 to-pink-500">
                <AvatarFallback className="bg-transparent text-white font-bold text-2xl">BB</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
              <p className="text-muted-foreground mb-6">Ask me about shows, seasons, episodes, or cast</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {["Tell me about Peacemaker", "Who's in the cast?", "Latest episodes"].map((q) => (
                  <Button key={q} variant="outline" size="sm" onClick={() => setInput(q)}>
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
                    <div className="flex justify-end mb-4">
                      <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 max-w-[85%]">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 mb-4">
                      <Avatar className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                        <AvatarFallback className="bg-transparent text-white text-sm font-bold">BB</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
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
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500">
                    <AvatarFallback className="bg-transparent text-white text-sm font-bold">BB</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t px-4 py-4 bg-background">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Binge Bot..."
            className="flex-1 rounded-full"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="rounded-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
