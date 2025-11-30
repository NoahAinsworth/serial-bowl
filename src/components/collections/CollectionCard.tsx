import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lock, Globe } from 'lucide-react';

interface CollectionCardProps {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  itemCount: number;
  isCurated: boolean;
  isAiGenerated: boolean;
  isPublic: boolean;
  creatorHandle?: string;
}

export function CollectionCard({
  id,
  name,
  description,
  coverUrl,
  itemCount,
  isCurated,
  isAiGenerated,
  isPublic,
  creatorHandle,
}: CollectionCardProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:scale-105 transition-all duration-300 overflow-hidden group"
      onClick={() => navigate(`/collection/${id}`)}
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-20">📺</div>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {isCurated && (
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
              Serial Bowl
            </Badge>
          )}
          {isAiGenerated && (
            <Badge variant="secondary" className="bg-purple-500/90 text-white">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>

        {/* Privacy indicator */}
        <div className="absolute top-2 right-2">
          {isPublic ? (
            <Globe className="h-4 w-4 text-white/70" />
          ) : (
            <Lock className="h-4 w-4 text-white/70" />
          )}
        </div>
        
        {/* Title and info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {name}
          </h3>
          {description && (
            <p className="text-sm text-white/80 line-clamp-2 mb-2">
              {description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-white/60">
            <span>{itemCount} show{itemCount !== 1 ? 's' : ''}</span>
            {creatorHandle && !isCurated && (
              <span>by @{creatorHandle}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
