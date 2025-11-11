import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface VideoPostCardProps {
  post: {
    id: string;
    author_id: string;
    body: string | null;
    video_url?: string | null;
    video_thumbnail_url?: string | null;
    video_duration?: number | null;
    video_status?: string | null;
    created_at: string;
    item_type?: string | null;
    item_id?: string | null;
    profiles?: {
      handle: string;
      avatar_url: string | null;
    };
  };
}

export function VideoPostCard({ post }: VideoPostCardProps) {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayClick = () => {
    if (post.video_status === 'ready') {
      setIsPlayerOpen(true);
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-xl shadow-lg border-border">
        {/* Video Poster */}
        <div className="relative aspect-video bg-muted">
          {post.video_thumbnail_url ? (
            <img 
              src={post.video_thumbnail_url} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-4xl">🎬</span>
            </div>
          )}

          {/* Status Badge */}
          {post.video_status === 'processing' && (
            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
              Processing…
            </Badge>
          )}
          {post.video_status === 'uploading' && (
            <Badge className="absolute top-2 right-2 bg-muted text-muted-foreground">
              Uploading…
            </Badge>
          )}
          {post.video_status === 'failed' && (
            <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
              Failed
            </Badge>
          )}

          {/* Play Button Overlay */}
          {post.video_status === 'ready' && (
            <button 
              className="absolute inset-0 flex items-center justify-center group transition-opacity hover:opacity-90"
              onClick={handlePlayClick}
            >
              <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-primary fill-primary ml-1" />
              </div>
            </button>
          )}

          {/* Duration Badge */}
          {post.video_duration && (
            <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
              {formatDuration(post.video_duration)}
            </Badge>
          )}
        </div>

        {/* Post Content */}
        <div className="p-4">
          {/* User Info */}
          <div className="flex items-center gap-2 mb-3">
            <Link to={`/profile/${post.profiles?.handle}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {post.profiles?.handle?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <Link to={`/profile/${post.profiles?.handle}`} className="font-semibold text-sm hover:underline">
                @{post.profiles?.handle}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Caption */}
          {post.body && (
            <p className="text-sm mb-3">{post.body}</p>
          )}

          {/* Content Tags */}
          {post.item_type && post.item_id && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {post.item_type === 'show' && '📺'}
                {post.item_type === 'season' && '📚'}
                {post.item_type === 'episode' && '📼'}
                {' '}
                {post.item_id}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Fullscreen Video Player */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-full h-full p-0 bg-black border-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsPlayerOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {post.video_url && (
              <video
                src={post.video_url}
                poster={post.video_thumbnail_url || undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
