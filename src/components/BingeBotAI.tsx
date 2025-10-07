import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Bot, Send, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Entity {
  type: "show" | "season" | "episode";
  name: string;
  id?: string;
  externalId?: string;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
    if (entity.type === "show" && entity.externalId) {
      onOpenChange(false);
      navigate(`/show/${entity.externalId}`);
    }
  };

  const quickChips = [
    "Main cast",
    "Season list",
    "Top episodes",
    "Air date of pilot",
    "How many episodes in season 1?",
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with Bot Logo */}
      <div className="flex items-center justify-center py-6 border-b relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="h-12 w-12 text-primary" />
            {loading && (
              <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary animate-spin" />
            )}
          </div>
          <span className="text-2xl font-bold">Binge Bot AI</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-4"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-0 space-y-4 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-4">Ask me anything about shows, seasons, episodes, or actors.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickChips.map((chip) => (
                  <Button
                    key={chip}
                    variant="outline"
                    size="sm"
                    onClick={() => handleChipClick(chip)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                  
                  {/* Entity chips */}
                  {msg.role === "assistant" && msg.entities && msg.entities.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-2">
                      {msg.entities.map((entity, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleEntityClick(entity)}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {entity.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Follow-up chips */}
                  {msg.role === "assistant" && msg.followUps && msg.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-2">
                      {msg.followUps.map((followUp, i) => (
                        <Button
                          key={i}
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFollowUpClick(followUp)}
                          disabled={loading}
                          className="h-7 text-xs"
                        >
                          {followUp}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
              {!loading && (
                <div className="flex flex-wrap gap-2">
                  {quickChips.map((chip) => (
                    <Button
                      key={chip}
                      variant="outline"
                      size="sm"
                      onClick={() => handleChipClick(chip)}
                    >
                      {chip}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      {/* Input Area */}
      <div className="px-6 pt-4 border-t max-w-4xl mx-auto w-full pb-safe" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex gap-2 mb-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a show, season, or actor…"
            className="min-h-[60px] resize-none"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
