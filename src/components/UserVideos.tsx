import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { VideoPostCard } from '@/components/VideoPostCard';
import { Loader2 } from 'lucide-react';

interface UserVideosProps {
  userId: string;
}

export function UserVideos({ userId }: UserVideosProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, [userId]);

  const loadVideos = async () => {
    try {
      setLoading(true);

      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (
            handle,
            avatar_url
          )
        `)
        .eq('author_id', userId)
        .or('video_bunny_id.not.is.null,video_embed_url.not.is.null')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVideos(posts || []);
    } catch (error) {
      console.error('Error loading user videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No videos yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      {videos.map((video) => (
        <VideoPostCard key={video.id} post={video} />
      ))}
    </div>
  );
}
