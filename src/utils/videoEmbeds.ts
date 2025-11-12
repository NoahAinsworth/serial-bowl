export interface VideoEmbedInfo {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'vimeo' | 'twitter' | 'unsupported';
  embedUrl: string;
  originalUrl: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
}

export function parseVideoUrl(url: string): VideoEmbedInfo {
  // YouTube: youtube.com/watch?v=ID or youtu.be/ID
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      originalUrl: url,
      aspectRatio: '16:9'
    };
  }

  // TikTok: tiktok.com/@user/video/ID
  const tiktokMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  if (tiktokMatch) {
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      originalUrl: url,
      aspectRatio: '9:16'
    };
  }

  // Instagram: instagram.com/p/ID or instagram.com/reel/ID
  const instagramMatch = url.match(/instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/);
  if (instagramMatch) {
    return {
      platform: 'instagram',
      embedUrl: `https://www.instagram.com/p/${instagramMatch[1]}/embed`,
      originalUrl: url,
      aspectRatio: '1:1'
    };
  }

  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: url,
      aspectRatio: '16:9'
    };
  }

  // Twitter/X: twitter.com/.../status/ID or x.com/.../status/ID
  const twitterMatch = url.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
  if (twitterMatch) {
    return {
      platform: 'twitter',
      embedUrl: url,
      originalUrl: url,
      aspectRatio: '16:9'
    };
  }

  return {
    platform: 'unsupported',
    embedUrl: '',
    originalUrl: url,
    aspectRatio: '16:9'
  };
}
