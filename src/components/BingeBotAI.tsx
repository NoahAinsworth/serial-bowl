import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BingeBotAIProps {
  initialPrompt?: string;
}

export function BingeBotAI({ initialPrompt }: BingeBotAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
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

  const quickChips = [
    "Main cast",
    "Season list",
    "Top episodes",
    "Air date of pilot",
    "How many episodes in season 1?",
  ];

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20 mb-6">
      <div className="flex items-start gap-4 mb-4">
        {/* Robot Avatar with Hourglass */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* Robot body */}
            <rect x="8" y="12" width="24" height="20" rx="4" fill="hsl(var(--primary))" />
            {/* Robot head */}
            <rect x="12" y="6" width="16" height="10" rx="2" fill="hsl(var(--primary))" />
            {/* Eyes */}
            <circle cx="17" cy="10" r="1.5" fill="black" />
            <circle cx="23" cy="10" r="1.5" fill="black" />
            {/* Hourglass */}
            <g className={loading ? "animate-spin origin-center" : ""} transform="translate(32, 24)">
              <path d="M-2,-4 L2,-4 L0,-1 L2,2 L-2,2 L0,-1 Z" fill="hsl(var(--accent))" stroke="black" strokeWidth="0.5" />
            </g>
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-1">Binge Bot AI</h3>
          <p className="text-sm text-muted-foreground">
            Ask me anything about shows, seasons, episodes, or actors.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="bg-background rounded-md p-4 mb-4 max-h-[300px] overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Start a conversation by asking about a TV show!
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
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
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Chips */}
      {(messages.length === 0 || messages[messages.length - 1]?.role === "assistant") && (
        <div className="flex flex-wrap gap-2 mb-4">
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className="px-3 py-1 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Binge Bot AI about a show…"
          className="flex-1 resize-none"
          rows={2}
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          size="icon"
          className="h-auto"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
              <path d="M-2,-4 L2,-4 L0,-1 L2,2 L-2,2 L0,-1 Z" strokeWidth="2" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}
