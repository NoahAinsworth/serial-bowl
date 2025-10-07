import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Entity {
  type: "show" | "season" | "episode";
  name: string;
  id?: string;
  externalId?: string;
  seasonNumber?: number;
  episodeId?: string;
}

interface BingeBotMessageProps {
  content: string;
  entities?: Entity[];
  sessionId: string;
  question: string;
  onEntityClick: (entity: Entity) => void;
}

export function BingeBotMessage({ content, entities, sessionId, question, onEntityClick }: BingeBotMessageProps) {
  const [feedback, setFeedback] = useState<number | null>(null);
  const { toast } = useToast();

  const handleFeedback = async (rating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("bot_feedback").insert({
        user_id: user.id,
        session_id: sessionId,
        question,
        response: content,
        rating,
      });

      if (error) throw error;

      setFeedback(rating);
      toast({
        title: rating === 1 ? "Thanks for the feedback!" : "Thanks, I'll learn from this",
        description: "Your feedback helps me improve.",
      });
    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  const renderContentWithLinks = () => {
    if (!entities || entities.length === 0) {
      return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    }

    let processedContent = content;
    const links: { text: string; entity: Entity; index: number }[] = [];

    // Find all entity mentions in the content
    entities.forEach((entity) => {
      const regex = new RegExp(`\\b${entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(processedContent)) !== null) {
        links.push({
          text: match[0],
          entity,
          index: match.index,
        });
      }
    });

    // Sort by index (reverse) to replace from end to start
    links.sort((a, b) => b.index - a.index);

    // Split content into parts with clickable links
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = processedContent.length;

    links.forEach((link, i) => {
      // Add text after this link
      parts.unshift(processedContent.substring(link.index + link.text.length, lastIndex));
      
      // Add clickable link
      parts.unshift(
        <button
          key={`link-${i}`}
          onClick={() => onEntityClick(link.entity)}
          className="text-primary underline hover:text-primary/80 font-medium"
        >
          {link.text}
        </button>
      );
      
      lastIndex = link.index;
    });

    // Add remaining text before first link
    parts.unshift(processedContent.substring(0, lastIndex));

    return <p className="text-sm whitespace-pre-wrap">{parts}</p>;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted text-foreground">
          {renderContentWithLinks()}
        </div>
      </div>
      
      {/* Feedback buttons */}
      <div className="flex gap-2 ml-2">
        <Button
          variant={feedback === 1 ? "default" : "ghost"}
          size="sm"
          onClick={() => handleFeedback(1)}
          disabled={feedback !== null}
          className="h-7 w-7 p-0"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={feedback === -1 ? "default" : "ghost"}
          size="sm"
          onClick={() => handleFeedback(-1)}
          disabled={feedback !== null}
          className="h-7 w-7 p-0"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}