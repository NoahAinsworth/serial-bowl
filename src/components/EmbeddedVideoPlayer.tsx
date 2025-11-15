import { Card } from '@/components/ui/card';
import { parseVideoUrl } from '@/utils/videoEmbeds';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmbeddedVideoPlayerProps {
  url: string;
}

export function EmbeddedVideoPlayer({ url }: EmbeddedVideoPlayerProps) {
  const videoInfo = parseVideoUrl(url);

  if (videoInfo.platform === 'unsupported') {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Unsupported video platform</p>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Video
          </a>
        </Button>
      </Card>
    );
  }

  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '1:1': 'aspect-square'
  }[videoInfo.aspectRatio];

  const containerStyle = videoInfo.recommendedHeight 
    ? { height: `${videoInfo.recommendedHeight}px` }
    : undefined;

  const containerClass = videoInfo.recommendedHeight
    ? 'relative w-full bg-black rounded-xl overflow-hidden'
    : `relative w-full ${aspectRatioClass} bg-black rounded-xl overflow-hidden`;

  return (
    <div className={containerClass} style={containerStyle}>
      <iframe
        src={videoInfo.embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded video"
      />
    </div>
  );
}
