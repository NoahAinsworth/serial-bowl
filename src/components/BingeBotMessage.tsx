import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Entity {
  type: "show" | "season" | "episode" | "person";
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
    // Parse content with [brackets] for entity links and [SPOILER: text] for spoilers
    let processedContent = content;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let keyCounter = 0;
    
    // Combined regex for both brackets and spoilers
    const combinedRegex = /(\[SPOILER:\s*([^\]]+)\])|(\[([^\]]+)\])/g;
    let match;
    
    while ((match = combinedRegex.exec(content)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      if (match[1]) {
        // Spoiler match
        const spoilerText = match[2];
        const SpoilerReveal = () => {
          const [revealed, setRevealed] = useState(false);
          
          return (
            <span className="inline-flex items-center">
              {!revealed ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2 mx-1"
                  onClick={() => setRevealed(true)}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Spoiler
                </Button>
              ) : (
                <span className="text-foreground bg-muted px-2 py-0.5 rounded mx-1">
                  {spoilerText}
                </span>
              )}
            </span>
          );
        };
        
        parts.push(<SpoilerReveal key={`spoiler-${keyCounter++}`} />);
      } else if (match[3]) {
        // Entity link match - only show if it's a show/season/episode
        const entityName = match[4];
        
        // Try to find matching entity
        const matchingEntity = entities?.find(e => 
          e.name === entityName
        );
        
        // Only create links for actual shows/seasons/episodes, not questions
        if (matchingEntity && ['show', 'season', 'episode'].includes(matchingEntity.type)) {
          parts.push(
            <Button
              key={`entity-${keyCounter++}`}
              variant="link"
              className="inline-flex items-center gap-1 p-0 h-auto font-semibold text-primary hover:underline"
              onClick={() => onEntityClick(matchingEntity)}
            >
              {entityName}
              <ExternalLink className="h-3 w-3" />
            </Button>
          );
        } else {
          // Not an entity link, just show the text
          parts.push(entityName);
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return <p className="text-sm whitespace-pre-wrap break-words">{parts}</p>;
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-start w-full">
        <div className="max-w-[95%] sm:max-w-[85%] rounded-lg px-3 sm:px-4 py-2.5 bg-muted text-foreground overflow-hidden break-words">
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
