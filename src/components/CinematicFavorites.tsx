import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Edit, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Show {
  id: string;
  external_id: string;
  title: string;
  poster_url: string;
}

interface CinematicFavoritesProps {
  shows: (Show | null)[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  badgeColor: string;
  isOwner?: boolean;
}

export function CinematicFavorites({ 
  shows, 
  onEdit, 
  onRemove, 
  badgeColor,
  isOwner = true 
}: CinematicFavoritesProps) {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center">Your Top Shows 🍿</h2>
      
      <div className="relative overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-4 min-w-min">
          {[0, 1, 2].map((index) => {
            const show = shows[index];
            const isHovered = hoveredIndex === index;

            return (
              <div 
                key={index}
                className="flex-shrink-0 w-40 group relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div 
                  className={cn(
                    "relative rounded-lg overflow-hidden transition-all duration-300",
                    "aspect-[2/3] bg-muted/30 backdrop-blur-sm border border-border/20",
                    isHovered && "transform scale-105 shadow-2xl",
                    show && "cursor-pointer"
                  )}
                  style={{
                    boxShadow: isHovered && show 
                      ? `0 20px 40px -10px ${badgeColor}40` 
                      : undefined,
                  }}
                  onClick={() => show && navigate(`/show/${show.external_id}`)}
                >
                  {/* Poster Image */}
                  {show?.poster_url ? (
                    <>
                      <img 
                        src={show.poster_url} 
                        alt={show.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient overlay on hover */}
                      <div 
                        className={cn(
                          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent",
                          "opacity-0 transition-opacity duration-300",
                          isHovered && "opacity-100"
                        )}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-xs">#{index + 1}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons (Only for owner) */}
                  {isOwner && (
                    <div 
                      className={cn(
                        "absolute top-2 right-2 flex gap-1 transition-opacity duration-200",
                        isHovered ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/90 hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(index);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {show && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 bg-background/90 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(index);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Title on hover */}
                  {show && (
                    <div 
                      className={cn(
                        "absolute bottom-0 inset-x-0 p-3 transition-transform duration-300",
                        isHovered ? "translate-y-0" : "translate-y-full"
                      )}
                    >
                      <p className="text-white text-sm font-semibold line-clamp-2 drop-shadow-lg">
                        {show.title}
                      </p>
                    </div>
                  )}

                  {/* Reflection effect */}
                  {show && isHovered && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  )}
                </div>

                {/* Title below card */}
                <p className="text-sm font-medium text-center mt-2 text-foreground/80 line-clamp-1">
                  {show?.title || `Slot #${index + 1}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
